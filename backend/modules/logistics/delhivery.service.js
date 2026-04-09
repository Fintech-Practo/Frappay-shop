const axios = require("axios");
const api = require("../../utils/api");
const env = require("../../config/env");
const pool = require("../../config/db");

async function getUnusedWaybill(connection = pool) {
    // 🔥 FIX: Remove FOR UPDATE when using pool (no transaction context)
    // FOR UPDATE requires a transaction connection, using it with pool creates lock storms
    const useForUpdate = connection !== pool;
    const query = useForUpdate
        ? "SELECT waybill FROM delhivery_waybills WHERE is_used = 0 LIMIT 1 FOR UPDATE"
        : "SELECT waybill FROM delhivery_waybills WHERE is_used = 0 LIMIT 1";

    const [rows] = await connection.query(query);
    if (!rows || rows.length === 0) return null;
    return rows[0].waybill;
}

async function markWaybillUsed(waybill, orderId, connection = pool) {
    try {
        // Try with order_id first (if column exists)
        await connection.query(
            "UPDATE delhivery_waybills SET is_used = 1, order_id = ?, used_at = CURRENT_TIMESTAMP WHERE waybill = ?",
            [orderId, waybill]
        );
    } catch (err) {
        if (err.message.includes("Unknown column") || err.message.includes("order_id")) {
            // 🔥 FIX: Fallback if order_id column doesn't exist yet
            console.warn("[Waybill] order_id column missing, updating without it");
            await connection.query(
                "UPDATE delhivery_waybills SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE waybill = ?",
                [waybill]
            );
        } else {
            throw err;
        }
    }
}

/**
 * Clean warehouse name for Delhivery stability
 */
function _cleanWarehouseName(name) {
    if (!name) return ""; // 🔥 MUST be empty so validation catches it
    return name.toString().trim();
}

/**
 * Get Delhivery Token
 */
function getToken() {
    // Delhivery uses a static API token across its endpoints
    const token = env.delhivery.token;
    if (!token) throw new Error("Delhivery token correctly configured in environment.");
    return token;
}

// Ensure authenticate exists for backwards compatibility 
async function authenticate() {
    return getToken();
}

/**
 * Robustly parse shipping address from order object
 * Handles: JSON string, already parsed object, or plain text string
 */
function validateShippingAddress(addr) {
    if ((!addr.address_line1 || addr.address_line1 === "Address") && !addr.address) return "Address line 1 is missing";
    if (!addr.city || addr.city === "City") return "City is missing";
    if (!addr.state || addr.state === "State") return "State is missing";
    if (!addr.postal_code || addr.postal_code === "110001") {
        return "Pincode is missing";
    }

    const phone = String(addr.phone || "");
    if (!phone || phone === "9999999999" || phone.length < 10) {
        return "A valid 10-digit phone number is required";
    }
    return null;
}


/**
 * 1.5 Create Warehouse
 * Register your warehouse or pickup location using the Warehouse Creation API
 */
async function createClientWarehouse(warehouse) {
    const token = getToken();
    try {
        const cleanedName = _cleanWarehouseName(warehouse.pickup_location_name);
        const payload = {
            phone: warehouse.phone,
            city: warehouse.city,
            name: cleanedName,
            pin: warehouse.pincode,
            address: warehouse.address,
            country: "India",
            email: warehouse.email,
            registered_name: cleanedName,
            return_address: warehouse.return_address || warehouse.address,
            return_pin: warehouse.return_pincode || warehouse.return_pin || warehouse.pincode,
            return_city: warehouse.return_city || warehouse.city,
            return_state: warehouse.return_state || warehouse.state || warehouse.city, // fallback if state is missing
            return_country: "India"
        };

        const response = await axios.post(
            `${env.delhivery.baseUrl}/api/backend/clientwarehouse/create/`,
            payload,
            {
                headers: {
                    Authorization: `Token ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error("Delhivery createWarehouse Error:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * 2. Fetch Bulk Waybills
 * Fetches waybill numbers in advance
 */
async function fetchWaybills(count = 5) {
    const token = getToken();
    try {
        const url = `${env.delhivery.baseUrl}/waybill/api/bulk/json/?token=${token}&count=${count}`;
        return await api.get(url, { baseURL: env.delhivery.baseUrl });
    } catch (error) {
        console.error("Delhivery fetchWaybills Error:", error.message);
        throw error;
    }
}

/**
 * Store Waybills in DB
 */
async function storeWaybills(waybills) {
    if (!waybills) return;

    // Normalizing to an array
    let wbList = typeof waybills === "string" ? waybills.split(",") : Array.from(waybills);

    for (let wb of wbList) {
        if (!wb) continue;
        try {
            await pool.query(
                "INSERT IGNORE INTO delhivery_waybills (waybill) VALUES (?)",
                [wb.trim()]
            );
        } catch (e) {
            console.error("Failed to store waybill:", wb, e.message);
        }
    }
}

/**
 * 3. Serviceability
 * Check serviceability of the pincode
 */
async function checkPincodeServiceability(pincode, isSurface = false) {
    const token = getToken();
    const productType = isSurface ? "Heavy" : "Express";
    try {
        const url = `/api/dc/fetch/serviceability/pincode?product_type=${productType}&pincode=${pincode}`;
        return await api.get(url, { baseURL: env.delhivery.baseUrl });
    } catch (error) {
        console.error("Delhivery checkPincodeServiceability Error:", error.message);
        throw error;
    }
}

/**
 * 3. Expected TAT
 * Get the estimated TAT between origin and destination
 */
async function getExpectedTAT(originPin, destPin, expectedPickupDate) {
    const token = getToken();
    // ✅ FIX 5: Correct date format for Delhivery TAT API ('%Y-%m-%d %H:%M')
    const now = new Date();
    const dateStr = expectedPickupDate || now.toISOString().slice(0, 16).replace('T', ' ');

    // 🔥 Pincode Hardening
    const sanitizePin = (p) => {
        if (!p) return "";
        let val = p;
        if (typeof val === 'string' && val.trim().startsWith('{')) {
            try { val = JSON.parse(val); } catch (e) { }
        }
        if (typeof val === 'object' && val !== null) {
            return val.postal_code || val.pincode || val.pin || "";
        }
        return String(val).trim();
    };

    const oPin = sanitizePin(originPin);
    const dPin = sanitizePin(destPin);

    if (!oPin || !dPin || oPin.length !== 6 || dPin.length !== 6) {
        console.warn("⚠️ Invalid pincodes for TAT calculation:", { origin: oPin, dest: dPin });
        return { success: false, message: "Invalid pincodes" };
    }

    try {
        const url = `/api/dc/expected_tat?origin_pin=${oPin}&destination_pin=${dPin}&mot=S&pdt=B2C&expected_pickup_date=${dateStr}`;
        return await api.get(url, {
            baseURL: env.delhivery.baseUrl,
            headers: {
                Authorization: `Token ${token}`
            }
        });
    } catch (error) {
        console.error("Delhivery getExpectedTAT Error:", { origin: oPin, dest: dPin, error: error.message });
        throw error;
    }
}

/**
 * 5. Shipping Cost Calculation
 * Get estimated shipping charges using Invoice Charges API
 */
async function calculateShippingCharges(params) {
    const token = getToken();

    let {
        pickup_pincode,
        delivery_pincode,
        weight = 0.5,
        cod = 20,
        order_amount = 0
    } = params;

    // 🔥 PINCODE SANITIZER
    const sanitizePin = (p) => {
        if (!p) return "";

        let val = p;

        if (typeof val === "string" && val.trim().startsWith("{")) {
            try {
                val = JSON.parse(val);
            } catch (e) { }
        }

        if (typeof val === "object" && val !== null) {
            return val.postal_code || val.pincode || val.pin || "";
        }

        return String(val).trim();
    };

    pickup_pincode = sanitizePin(pickup_pincode);
    delivery_pincode = sanitizePin(delivery_pincode);

    // 🔥 VALIDATION
    if (!pickup_pincode || pickup_pincode.length !== 6) {
        console.error("❌ Invalid pickup pincode:", pickup_pincode);
        return fallbackShipping(order_amount, cod);
    }

    if (!delivery_pincode || delivery_pincode.length !== 6) {
        console.error("❌ Invalid delivery pincode:", delivery_pincode);
        return fallbackShipping(order_amount, cod);
    }

    // 🔥 FULL DEBUG LOG (CRITICAL)
    console.log("🔑 DELHIVERY TOKEN:", token);
    console.log("🌐 DELHIVERY BASE URL:", env.delhivery.baseUrl);

    const weightGm = Math.ceil(weight * 1000);
    const paymentType = cod ? "COD" : "Pre-paid";

    // 📦 REFINED LOGGING
    console.log("📦 FINAL SHIPPING INPUT:", {
        pickup_pincode,
        delivery_pincode,
        weight,
        weightGm,
        cod,
        paymentType,
        order_amount
    });

    const { getDynamicMargin } = require("../shipping/shipping.util");
    const marginAmount = await getDynamicMargin(order_amount);

    try {
        // 🔥 CORRECT URL (NO EXTRA SLASH BEFORE .json)
        const url = `/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=${delivery_pincode}&o_pin=${pickup_pincode}&cgm=${weightGm}&pt=${paymentType}`;

        // NOTE: The 'api' utility (utils/api.js) returns response.data DIRECTLY via an interceptor!
        const rawData = await api.get(url, {
            baseURL: env.delhivery.baseUrl,
            headers: {
                Authorization: `Token ${token}`
            },
            timeout: 10000
        });

        // 🔥 FULL RESPONSE LOGGING
        console.log("🚀 RAW DELHIVERY RESPONSE:", JSON.stringify(rawData, null, 2));

        if (!rawData) {
            console.error("❌ Empty response from Delhivery API utility.");
            throw new Error("No response from Delhivery");
        }

        // Handle nested or array response
        let data = rawData.data || rawData;

        if (Array.isArray(data)) {
            if (!data.length) throw new Error("Empty Delhivery response array");
            data = data[0];
        }

        // Validate final object
        if (!data || typeof data !== "object") {
            console.error("❌ Invalid response structure:", data);
            throw new Error("Invalid response from Delhivery");
        }

        console.log("✅ Parsed Delhivery Result:", data);

        // 🔥 FREE SHIPPING FOR ORDERS ABOVE 1500
        const isFreeShipping = Number(order_amount) > 1500;
        const baseRate = isFreeShipping ? 0 : Number(data.total_amount || 0);

        // 🔥 COD CHARGES (0 if FREE SHIPPING)
        const codCharges = (cod && !isFreeShipping)
            ? Number(data.charge_COD || data.charge_CCOD || 0)
            : 0;

        if (!baseRate && !isFreeShipping) {
            throw new Error("Rate not returned from Delhivery (0 or missing)");
        }

        const margin = isFreeShipping ? 0 : Math.round(marginAmount);
        const totalCharge = baseRate + margin + codCharges;

        return {
            success: true,
            data: {
                courier_name: "Delhivery",
                courier_company_id: 99,
                base_rate: baseRate,
                margin,
                cod_charges: codCharges,
                total_charge: totalCharge,
                estimated_delivery_days: "3-5",
                weight
            }
        };

    } catch (error) {
        console.error(
            "❌ Delhivery Rate Error:",
            error.response?.data || error.message
        );

        return fallbackShipping(order_amount, cod);
    }
}

// 🔥 FALLBACK FUNCTION
function fallbackShipping(orderAmount, cod) {
    const isFree = Number(orderAmount) > 1500;
    const base = isFree ? 0 : (Number(orderAmount) > 500 ? 40 : 60);
    const codCharge = (cod && !isFree) ? 40 : 0;

    return {
        success: true,
        data: {
            courier_name: "Fallback",
            courier_company_id: 0,
            base_rate: base,
            margin: 0,
            cod_charges: codCharge,
            total_charge: base + codCharge,
            estimated_delivery_days: "5-7",
            weight: 0.5
        }
    };
}

/**
 * 6. Shipment Creation
 * Triggers actual shipment creation in Delhivery
 */
async function createShipment(order, retries = 2) {
    const token = getToken();
    let lastError = null;
    // 🔥 Single responsibility: createShipment ONLY calls the Delhivery API
    // AWB management is handled by the caller (createSellersShipment via waybill.util.js)
    const currentAwb = order.awb_number;

    if (!currentAwb) {
        throw new Error("AWB number is required for createShipment");
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[Delhivery] Attempt ${attempt}/${retries} for Order ${order.id}, AWB: ${currentAwb}`);

            // 🔥 FIX 2: Use snapshot fields and CLEAN them properly
            let shipping = {
                full_name: order.shipping_full_name || order.user_name || "Customer",
                address_line1: order.shipping_address_line1 || "",
                address_line2: order.shipping_address_line2 || "",
                city: order.shipping_city || "",
                state: order.shipping_state || "",
                postal_code: order.shipping_postal_code || "",
                phone: order.shipping_phone || order.user_phone || order.phone || ""
            };

            // 🔥 FIX 3: Clean phone number (strip +91, 0, spaces, dashes)
            let cleanPhone = String(shipping.phone).replace(/[\s\-\(\)]/g, '');
            // Strip country code prefixes
            if (cleanPhone.startsWith('+91')) cleanPhone = cleanPhone.substring(3);
            if (cleanPhone.startsWith('91') && cleanPhone.length === 12) cleanPhone = cleanPhone.substring(2);
            if (cleanPhone.startsWith('0') && cleanPhone.length === 11) cleanPhone = cleanPhone.substring(1);

            // Final validation: must be 10 digits starting with 6-9
            if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
                console.warn(`[Delhivery] Invalid phone "${shipping.phone}" → cleaned to "${cleanPhone}". Using fallback.`);
                cleanPhone = "9348021930"; // Use a real valid number as fallback
            }

            // VALIDATION: Ensure structured fields
            if (!shipping.city || !shipping.postal_code) {
                throw new Error(`Structured address (City/Pincode) is missing for order ${order.id}.`);
            }

            // Capitalize City
            shipping.city = shipping.city.charAt(0).toUpperCase() + shipping.city.slice(1).toLowerCase();

            // Strict validation
            const validationError = validateShippingAddress(shipping);
            if (validationError) {
                throw new Error(`Incomplete shipping snapshot for order ${order.id}: ${validationError}.`);
            }

            // Fetch warehouse
            const [warehouseRows] = await pool.query(
                "SELECT * FROM seller_warehouses WHERE id = ?",
                [order.warehouse_id]
            );
            const warehouse = warehouseRows[0];

            if (!warehouse || !warehouse.warehouse_created) {
                throw new Error(`Pickup location (warehouse) is missing or not synced for order ${order.id}.`);
            }

            const cleanedPickupLocation = _cleanWarehouseName(warehouse.pickup_location_name);
            console.log(`[Delhivery] Warehouse ID: ${order.warehouse_id}, Pickup: "${cleanedPickupLocation}"`);

            // 🔥 FIX 4: Build CLEAN payload with properly split fields
            const shipmentPayload = {
                name: shipping.full_name,
                add: shipping.address_line1,
                add2: shipping.address_line2 || "",
                pin: shipping.postal_code,
                city: shipping.city,
                state: shipping.state,
                country: "India",
                phone: cleanPhone,
                order: `ORDER-${order.id}`,
                payment_mode: (order.payment_method || "").toUpperCase() === "COD" ? "COD" : "Prepaid",
                // Return address from warehouse
                return_pin: warehouse.pincode || "",
                return_city: warehouse.city || "",
                return_phone: warehouse.phone || "",
                return_add: warehouse.address || "",
                return_state: warehouse.state || "",
                return_country: "India",
                products_desc: order.items ? order.items.map(i => i.product_title || "Book").join(", ") : "Books",
                hsn_code: "4901",
                cod_amount: (order.payment_method || "").toUpperCase() === "COD" ? (order.total_payable_amount || 0) : 0,
                order_date: new Date().toISOString(),
                total_amount: order.total_payable_amount || 0,
                seller_add: warehouse.address || "",
                seller_name: warehouse.pickup_location_name || "",
                seller_inv: `INV-${order.id}`,
                quantity: order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 1,
                waybill: currentAwb,
                shipment_width: "10",
                shipment_height: "10",
                weight: Number(order.total_weight) || 0.5,
                shipping_mode: "Surface",
                address_type: "home",
                pickup_location: cleanedPickupLocation
            };

            const payload = {
                format: "json",
                data: {
                    shipments: [shipmentPayload],
                    pickup_location: {
                        name: cleanedPickupLocation
                    }
                }
            };

            // 🔥 FIX 5: Log the FULL payload for debugging
            console.log("TRACK BASE URL:", env.delhivery.trackingUrl);
            console.log("📦 FINAL DELHIVERY PAYLOAD:", JSON.stringify(payload, null, 2));

            const formData = new URLSearchParams();
            formData.append("format", "json");
            formData.append("data", JSON.stringify(payload.data));

            const response = await api.post(
                `/api/cmu/create.json`,
                formData.toString(),
                {
                    baseURL: env.delhivery.baseUrl,
                    headers: {
                        Authorization: `Token ${token}`,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            );

            const data = response;
            console.log("FINAL DELHIVERY RESPONSE:", JSON.stringify(data, null, 2));

            if (!data) {
                throw new Error("Empty response received from Delhivery API.");
            }

            const pkg = data?.packages?.[0];

            if (
                data.success === true &&
                pkg &&
                pkg.status !== "Error" &&
                pkg.status !== "Fail"
            ) {
                // AWB already marked as used by waybill.util.js — no need to mark again
                return {
                    success: true,
                    shipment_id: pkg.client_fl_id || `DEL-${Date.now()}`,
                    awb_code: pkg.waybill,
                    tracking_url: `${env.delhivery.trackingUrl}${pkg.waybill}`,
                    courier_name: "Delhivery",
                    status: pkg.status,
                    response: data
                };
            }

            // Check if "partially saved" — DO NOT retry with same AWB
            const errMsg = pkg?.remarks?.join(", ") || data.message || "Shipment creation failed";

            if (errMsg.toLowerCase().includes("duplicate waybill")) {
                console.log("🔁 Idempotent recovery triggered for AWB:", currentAwb);
                return {
                    success: true,
                    already_created: true,
                    shipment_id: pkg?.client_fl_id || `DEL-${Date.now()}`,
                    awb_code: currentAwb,
                    tracking_url: `${env.delhivery.trackingUrl}${currentAwb}`,
                    courier_name: "Delhivery",
                    status: pkg?.status || "Success",
                    response: data
                };
            }

            if (errMsg.includes("partially saved")) {
                console.warn(`[Delhivery] Package partially saved with AWB ${currentAwb}. Will use new AWB on retry.`);
            }

            throw new Error(errMsg);

        } catch (error) {
            lastError = error;
            console.warn(`[Delhivery] attempt ${attempt} failed: ${error.message}`);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, attempt * 1500));
            }
        }
    }

    console.error(`[Delhivery] All ${retries} attempts to create shipment failed.`, lastError.message);
    throw lastError;
}

/**
 * 6.5 Reverse Pickup Creation (Delhivery)
 */
async function createReversePickup(order) {
    console.log("TRACE: Entering delhivery.service.js createReversePickup");
    const token = getToken();

    // Use snapshot fields
    const addr = {
        full_name: order.shipping_full_name || order.user_name || "Customer",
        address_line1: order.shipping_address_line1 || "Address",
        postal_code: order.shipping_postal_code || "110001",
        city: order.shipping_city || "City",
        state: order.shipping_state || "State",
        phone: order.shipping_phone || "9999999999"
    };

    // DEBUG LOG
    console.log("DEBUG: createReversePickup - Using Snapshot:", addr);

    try {
        const payload = {
            format: "json",
            data: {
                shipments: [
                    {
                        name: addr.full_name,
                        add: addr.address_line1,
                        pin: addr.postal_code,
                        city: addr.city,
                        state: addr.state,
                        phone: addr.phone,
                        order: `RVP-${order.id}-${Date.now()}`,
                        payment_mode: "Pickup",
                        return_name: "Books & Copies",
                        return_address: "Warehouse Address",
                        return_pin: "110001",
                        return_city: "Delhi",
                        return_state: "Delhi",
                        return_country: "India",
                        weight: (order.total_weight || 0.5) * 1000
                    }
                ],
                pickup_location: {
                    name: env.delhivery.pickupLocation || "Primary"
                }
            }
        };

        const response = await axios.post(
            `${env.delhivery.baseUrl}/api/cmu/create.json`,
            require("querystring").stringify({
                format: "json",
                data: JSON.stringify(payload.data)
            }),
            {
                headers: {
                    Authorization: `Token ${token}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error("Delhivery createReversePickup Error:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * 7. Shipment Update
 */
async function updateShipment(waybill, updateData) {
    const token = getToken();
    const qs = require("querystring");
    try {
        const body = qs.stringify({
            waybill: waybill,
            ...updateData
        });

        return await api.post(
            `/api/p/edit`,
            body,
            {
                baseURL: env.delhivery.baseUrl,
                headers: {
                    Authorization: `Token ${token}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );
    } catch (error) {
        console.error("Delhivery updateShipment Error:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * 7. Cancel Shipment
 */
async function cancelShipment(waybill) {
    const token = getToken();
    const qs = require("querystring");
    try {
        const body = qs.stringify({
            waybill: waybill,
            cancellation: "true"
        });

        const url = `${env.delhivery.baseUrl}/api/p/edit`;
        const headers = {
            Authorization: `Token ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json"
        };

        console.log(`[Delhivery] Cancelling AWB: ${waybill}`);

        const response = await axios.post(url, body, { headers: headers });
        const data = response.data;

        console.log("[Delhivery] Cancel response:", data);

        if (data.status === true || data.success === true) {
            return {
                success: true,
                message: data.message || "Shipment marked for cancellation"
            };
        } else {
            throw new Error(data.message || "Failed to cancel shipment with Delhivery");
        }
    } catch (error) {
        console.error("[Delhivery] Shipment Cancellation Error:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * 8. Pickup Request Creation
 */
async function createPickupRequest(params) {
    const token = getToken();
    try {
        const response = await axios.post(
            `${env.delhivery.baseUrl}/fm/request/new/`,
            {
                pickup_time: params.pickup_time || '11:00:00',
                // ✅ FIX 8: Timezone-safe date
                pickup_date: params.pickup_date || new Date().toISOString().split('T')[0],
                pickup_location: params.pickup_location || 'Primary',
                expected_package_count: params.expected_package_count || 1
            },
            {
                headers: {
                    Authorization: `Token ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Delhivery createPickupRequest Error:", error.response?.data || error.message);
        throw error;
    }
}

async function generateShippingLabel(waybill) {
    const token = getToken();

    try {
        console.log("--------------------------------------------------");
        console.log("BASE URL:", env.delhivery.baseUrl);
        console.log(`🔍 [Delhivery] Fetching label for AWB: ${waybill}`);
        console.log("--------------------------------------------------");

        const response = await axios.get(
            `${env.delhivery.baseUrl}/api/p/packing_slip`,
            {
                params: {
                    wbns: waybill,
                    pdf: true,
                    pdf_size: "A4"
                },
                headers: {
                    Authorization: `Token ${token}`
                },
                timeout: 60000
            }
        );

        const data = response.data;

        // 🔥 Log a limited preview to avoid flooding logs with base64
        const preview = JSON.stringify(data)?.substring(0, 500);
        console.log(`📦 RAW LABEL RESPONSE (preview): ${preview}...`);

        const packages =
            data?.packages ||
            data?.data?.packages ||
            [];

        console.log(`📦 packages_found: ${packages.length}`);

        if (!packages.length) {
            console.warn(`⏳ [Delhivery] No packages in response for AWB ${waybill}.`);
            return { success: false, retry: true, error: "No packages in response" };
        }

        const pkg = packages[0];

        // ─────────────────────────────────────────────────────────
        // CASE A: pkg is a raw base64 string (some account configs)
        // ─────────────────────────────────────────────────────────
        if (typeof pkg === "string" && pkg.length > 100) {
            console.log(`✅ [Delhivery] Detected BASE64 string package for AWB ${waybill}. Decoding...`);
            const buffer = Buffer.from(pkg, "base64");
            return { success: true, pdfBuffer: buffer };
        }

        // ─────────────────────────────────────────────────────────
        // CASE B: pkg is an object — use correct field names
        // Delhivery actual fields: pdf_download_link, pdf_encoding
        // ─────────────────────────────────────────────────────────
        console.log(`📋 [Delhivery] Package keys: ${Object.keys(pkg).join(', ')}`);

        // 🔥 pdf_encoding = base64 PDF data (prefer this for reliability)
        if (pkg.pdf_encoding && typeof pkg.pdf_encoding === "string" && pkg.pdf_encoding.length > 100) {
            console.log(`✅ [Delhivery] Found pdf_encoding (base64) for AWB ${waybill}. Decoding...`);
            const buffer = Buffer.from(pkg.pdf_encoding, "base64");
            return { success: true, pdfBuffer: buffer };
        }

        // 🔥 pdf_download_link = direct download URL
        const labelUrl =
            pkg.pdf_download_link ||   // ✅ ACTUAL Delhivery field
            pkg.pdf ||                 // legacy fallback
            pkg.label ||
            pkg.label_url ||
            pkg?.documents?.label ||
            data?.pdf ||
            data?.label ||
            data?.data?.pdf;

        if (labelUrl && typeof labelUrl === "string") {
            // Detect nested base64 string in a URL field
            if (!labelUrl.startsWith("http") && labelUrl.length > 100) {
                console.log(`✅ [Delhivery] Detected BASE64 in URL field for AWB ${waybill}. Decoding...`);
                const buffer = Buffer.from(labelUrl, "base64");
                return { success: true, pdfBuffer: buffer };
            }

            console.log(`✅ [Delhivery] Label URL found for AWB ${waybill}:`, labelUrl);
            return { success: true, label_url: labelUrl };
        }

        console.warn(`⏳ [Delhivery] Label not extractable from response for AWB ${waybill}. Keys: ${Object.keys(pkg).join(', ')}`);
        return { success: false, retry: true, error: "Label not found in response" };

    } catch (error) {
        const errMsg = error.response?.data?.message || error.message;
        const status = error.response?.status;

        console.error(`❌ [Delhivery] Label API Error for ${waybill}:`, { status, errMsg });

        if (status === 404) {
            return { success: false, error: "Not found", retry: true };
        }

        return { success: false, error: errMsg, retry: false };
    }
}

/**
 * 11. E-Way Bill Update
 */
async function updateEwaybill(waybill, invoiceNumber, ewbNumber) {
    const token = getToken();
    try {
        const response = await api.put(
            `/api/rest/ewaybill/${waybill}/`,
            {
                data: [
                    {
                        dcn: invoiceNumber,
                        ewbn: ewbNumber
                    }
                ]
            },
            {
                baseURL: env.delhivery.baseUrl,
                headers: {
                    Authorization: `Token ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Delhivery updateEwaybill Error:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * 12. Sync Pickup Location (Warehouse)
 */
async function syncPickupLocation(warehouse) {
    const token = getToken();
    try {
        const payload = {
            phone: warehouse.phone,
            city: warehouse.city,
            name: warehouse.pickup_location_name,
            pin: warehouse.pincode,
            address: warehouse.address,
            country: "India",
            email: warehouse.email,
            registered_name: warehouse.pickup_location_name,
            return_address: warehouse.return_address || warehouse.address,
            return_pin: warehouse.return_pincode || warehouse.pincode,
            return_city: warehouse.return_city || warehouse.city,
            return_state: warehouse.return_state || warehouse.state,
            return_country: "India"
        };

        const response = await api.post(
            `/api/backend/clientwarehouse/create/`,
            payload,
            {
                baseURL: env.delhivery.baseUrl,
                headers: {
                    Authorization: `Token ${token}`
                }
            }
        );

        return response;
    } catch (error) {
        console.error("[Delhivery] Warehouse sync failed:", error.message);
        throw error;
    }
}

/**
 * 1.6 Edit Warehouse
 */
async function editClientWarehouse(warehouse) {
    const token = getToken();
    try {
        const payload = {
            phone: warehouse.phone,
            city: warehouse.city,
            name: warehouse.pickup_location_name,
            pin: warehouse.pincode,
            address: warehouse.address,
            country: "India",
            email: warehouse.email,
            registered_name: warehouse.pickup_location_name,
            return_address: warehouse.address,
            return_pin: warehouse.pincode,
            return_city: warehouse.city,
            return_state: warehouse.state || warehouse.city,
            return_country: "India"
        };

        return await api.post(
            `/api/backend/clientwarehouse/edit/`,
            payload,
            {
                baseURL: env.delhivery.baseUrl,
                headers: {
                    Authorization: `Token ${token}`
                }
            }
        );
    } catch (error) {
        console.error("Delhivery editWarehouse Error:", error.message);
        throw error;
    }
}

/**
 * 13. Track Shipment
 */
async function trackShipment(waybill) {
    const token = getToken();
    try {
        const response = await api.get(
            `/api/v1/packages/json/`,
            {
                baseURL: env.delhivery.base_url,
                params: {
                    waybill: waybill,
                    ref_ids: ""
                },
                headers: {
                    Authorization: `Token ${token}`
                }
            }
        );
        return response;
    } catch (error) {
        console.error("Delhivery trackShipment Error:", error.message);
        throw error;
    }
}

module.exports = {
    authenticate,
    getUnusedWaybill,
    markWaybillUsed,
    fetchWaybills,
    storeWaybills,
    checkPincodeServiceability,
    getExpectedTAT,
    calculateShippingCharges,
    createShipment,
    createReversePickup,
    updateShipment,
    cancelShipment,
    createPickupRequest,
    generateShippingLabel,
    updateEwaybill,
    syncPickupLocation,
    trackShipment,
    createClientWarehouse,
    editClientWarehouse,
};
