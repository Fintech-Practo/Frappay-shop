const pool = require("../../config/db");
const orderModel = require("../order/order.model");
const logisticsProvider = require("./logistics.provider");
const logger = require("../../utils/logger");
const env = require("../../config/env");
const notificationService = require("../notification/notification.service");
const smsNotificationService = require("../../services/notificationService");
const { getUnusedWaybill } = require("../../utils/waybill.util");
const delhiveryService = require("./delhivery.service");
const { markWaybillUsed } = require("./delhivery.service");
const { mapDelhiveryStatus } = require("../../utils/statusMapper");
const { isValidTransition } = require("../../utils/statusTransition");
// Removed mapCourierStatus in favor of standardized statusMapper utility

async function createShipmentRecord(orderId, shipmentData, sellerId, shippingCost = 0, conn = null) {
    if (!orderId) {
        logger.error("CRITICAL: orderId is missing in createShipmentRecord!", { shipmentData, sellerId });
        throw new Error("orderId is required to create a shipment record");
    }
    const dbConn = conn || pool;
    const status = shipmentData.awb_code ? 'AWB_ASSIGNED' : 'SHIPMENT_CREATED';
    const {
        shipment_id,
        awb_code,
        courier_name,
        courier_company_id,
        tracking_url
    } = shipmentData;

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    // Fetch order info
    const [orderRows] = await dbConn.query(
        `SELECT shipping_cost, payment_method, total_payable_amount, shipping_postal_code 
         FROM orders WHERE id = ?`,
        [orderId]
    );

    const order = orderRows[0];

    // Fetch estimated delivery date safely
    let estimatedDeliveryDate = null;
    try {
        if (order && order.shipping_postal_code) {
            let pickupPincode = process.env.DEFAULT_PICKUP_PINCODE || "110001"; // Fallback to environment default
            if (sellerId) {
                const [whRows] = await dbConn.query(`SELECT pincode FROM seller_warehouses WHERE seller_id = ? AND warehouse_created = 1 LIMIT 1`, [sellerId]);
                if (whRows.length > 0 && whRows[0].pincode) {
                    pickupPincode = whRows[0].pincode;
                }
            }

            const tatResponse = await delhiveryService.getExpectedTAT(pickupPincode, order.shipping_postal_code);
            if (tatResponse) {
                let pkgData = tatResponse.data || tatResponse;
                if (Array.isArray(pkgData)) pkgData = pkgData[0];
                if (pkgData && pkgData.expected_delivery_date) {
                    // Extract Date part only (YYYY-MM-DD)
                    estimatedDeliveryDate = pkgData.expected_delivery_date.split('T')[0];
                }
            }
        }
    } catch (tatErr) {
        logger.warn(`Failed to fetch exact TAT for order ${orderId}`, { error: tatErr.message });
    }

    // shipping cost
    let actualShippingCost = parseFloat(shippingCost) || parseFloat(order?.shipping_cost) || 0;

    // STEP 5: COD amount = full payable amount only for COD orders; 0 for prepaid/online
    const isCod = order && (order.payment_method === 'COD' || order.payment_method === 'cod');
    const codAmount = isCod
        ? parseFloat(order.total_payable_amount || 0)
        : 0;

    const shipmentStatus = 'awb_assigned';

    await dbConn.query(
        `INSERT INTO logistics_shipments 
        (id, order_id, shipment_id, awb_code, courier_name, courier_company_id,
         admin_status, shipment_status, tracking_url, seller_id, actual_shipping_cost, cod_amount, estimated_delivery_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            orderId,
            shipment_id,
            awb_code || null,
            courier_name || null,
            courier_company_id || null,
            status,
            shipmentStatus,
            tracking_url || '',
            sellerId,
            actualShippingCost,
            codAmount,
            estimatedDeliveryDate
        ]
    );
}

/**
 * Standard Status Flow Implementation (Brain Function)
 * pending → confirmed → shipped → in_transit → ofd → delivered
 */
async function updateShipmentStatus(awb, delhiveryStatus, extra = {}) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Map Raw Status -> System Standard
        const newStatus = mapDelhiveryStatus(delhiveryStatus);
        if (!newStatus) {
            logger.warn(`No mapping found for Delhivery status: ${delhiveryStatus}`);
            await connection.commit();
            return;
        }

        // 2. Fetch associated order & shipment to check current state
        const [shipmentRows] = await connection.query(
            "SELECT id, order_id, admin_status FROM logistics_shipments WHERE awb_code = ? FOR UPDATE",
            [awb]
        );

        if (shipmentRows.length === 0) {
            logger.warn(`No shipment record found for AWB: ${awb}`);
            await connection.commit();
            return;
        }

        const shipment = shipmentRows[0];
        const [orderRows] = await connection.query(
            "SELECT id, user_id, status, payment_method FROM orders WHERE id = ? FOR UPDATE",
            [shipment.order_id]
        );

        if (orderRows.length === 0) {
            logger.warn(`No order record found for AWB: ${awb}, Order ID: ${shipment.order_id}`);
            await connection.commit();
            return;
        }

        const order = orderRows[0];
        const oldStatus = order.status.toLowerCase();

        // 3. Skip if same status
        if (oldStatus === newStatus) {
            logger.info(`Status unchanged for AWB ${awb}: ${newStatus}`);
            await connection.commit();
            return;
        }

        // 4. Validate Transition Rules
        if (!isValidTransition(oldStatus, newStatus)) {
            logger.warn(`Invalid transition attempted for Order ${order.id}: ${oldStatus} → ${newStatus} (Raw: ${delhiveryStatus})`);
        } else {
            // ✅ VALID TRANSITION: Update order & shipment status
            const dbStatus = newStatus.toUpperCase();
            
            if (dbStatus === 'DELIVERED') {
                await connection.query(
                    "UPDATE orders SET status = 'COMPLETED', delivered_at = NOW(), updated_at = NOW() WHERE id = ?",
                    [order.id]
                );
                await orderModel.addStatusLog(order.id, 'COMPLETED', "Order delivered and completed automatically", connection);

                if (order.payment_method?.toUpperCase() === 'COD') {
                    await connection.query(
                        "UPDATE orders SET payment_status = 'PAID' WHERE id = ? AND payment_status != 'PAID'",
                        [order.id]
                    );
                }

                try {
                    const walletRewardService = require("../wallet/walletReward.service");
                    await walletRewardService.creditOrderRewards(order.id, order.user_id);
                } catch (rewardErr) {
                    logger.error("Reward points credit failed", { orderId: order.id, error: rewardErr.message });
                }

                try {
                    const payoutService = require("../finance/payout.service");
                    await payoutService.setDueDate(order.id, new Date());
                } catch (payoutErr) {
                    logger.error("Failed to set payout due date", { orderId: order.id, error: payoutErr.message });
                }
            } else {
                let orderUpdateSql = "UPDATE orders SET status = ?, updated_at = NOW()";
                let orderUpdateParams = [dbStatus];
                
                if (dbStatus === 'PACKED') {
                    orderUpdateSql += ", packed_at = NOW()";
                } else if (dbStatus === 'SHIPPED') {
                    orderUpdateSql += ", shipped_at = NOW()";
                }
                
                orderUpdateSql += " WHERE id = ?";
                orderUpdateParams.push(order.id);
                
                await connection.query(orderUpdateSql, orderUpdateParams);
                await orderModel.addStatusLog(order.id, dbStatus, `Logistics update: ${delhiveryStatus} (${extra.location || 'Hub'})`, connection);
            }

            let shipmentUpdateQuery = `
                UPDATE logistics_shipments 
                SET admin_status = ?, last_location = ?, updated_at = NOW()
            `;
            let shipmentParams = [dbStatus, extra.location || null];
            
            if (dbStatus === 'DELIVERED') {
                shipmentUpdateQuery += `, delivered_date = NOW()`;
            } else if (dbStatus === 'IN_TRANSIT' && delhiveryStatus.toUpperCase() === 'PICKED UP') {
                shipmentUpdateQuery += `, pickup_date = NOW()`;
            }

            shipmentUpdateQuery += ` WHERE awb_code = ?`;
            shipmentParams.push(awb);
            await connection.query(shipmentUpdateQuery, shipmentParams);

            // 📲 5. Idempotent SMS Triggers
            const SMS_ALLOWED = ["shipped", "ofd", "delivered"];
            if (SMS_ALLOWED.includes(newStatus)) {
                const eventTypeMap = {
                    'shipped': 'ORDER_SHIPPED',
                    'ofd': 'OUT_FOR_DELIVERY',
                    'delivered': 'DELIVERED'
                };
                const eventType = eventTypeMap[newStatus];

                const [smsSent] = await connection.query(
                    "SELECT id FROM sms_logs WHERE order_id = ? AND event_type = ? AND status = 'SENT' LIMIT 1",
                    [order.id, eventType]
                );

                if (smsSent.length === 0) {
                    setImmediate(async () => {
                        try {
                            if (newStatus === 'shipped') await smsNotificationService.sendOrderShippedSMS(order.user_id, order.id);
                            else if (newStatus === 'ofd') await smsNotificationService.sendOutForDeliverySMS(order.user_id, order.id);
                            else if (newStatus === 'delivered') await smsNotificationService.sendDeliveredSMS(order.user_id, order.id);
                        } catch (err) {
                            logger.error(`SMS notification failed for order ${order.id}:`, err.message);
                        }
                    });
                }
            }
        }

        // 6. Record Detailed Tracking History (Always log)
        await connection.query(
            `INSERT INTO shipment_tracking_history (shipment_id, status, location, description, activity_date)
             SELECT id, ?, ?, ?, NOW() FROM logistics_shipments WHERE awb_code = ?`,
            [delhiveryStatus, extra.location || '', extra.remarks || `Status update: ${delhiveryStatus}`, awb]
        );

        await connection.commit();
        return true;

    } catch (e) {
        await connection.rollback();
        logger.error("Update Shipment Status Error:", { awb, error: e.message });
        throw e;
    } finally {
        connection.release();
    }
}

/**
 * Handle Webhook from Delhivery
 */
async function handleDelhiveryWebhook(payload) {
    try {
        // Delhivery webhook format: { awb: '...', status: '...', location: '...', ... }
        // Or sometimes an array or nested object depending on their API version.
        // We expect individual updates here.

        const { awb, status, location, remarks, dateTime } = payload;

        if (!awb || !status) {
            logger.warn("Incomplete Delhivery webhook payload received", { payload });
            return false;
        }

        logger.info(`🚚 Delhivery Webhook: AWB ${awb} -> ${status} (${location || 'N/A'})`);

        await updateShipmentStatus(awb, status, {
            location: location,
            remarks: remarks,
            timestamp: dateTime
        });

        return true;
    } catch (err) {
        logger.error("Error handling Delhivery webhook", { error: err.message, payload });
        throw err;
    }
}

// Helper to get Seller Pickup Details
async function getSellerPickupDetails(sellerId, conn = null) {
    const dbConn = conn || pool;

    // MOCK MODE: Always use test warehouse
    if (env.logistics.mode === "mock") {
        // Still need warehouse_id for Delhivery createShipment
        const [mockWh] = await dbConn.query(
            `SELECT id, pincode FROM seller_warehouses WHERE seller_id = ? LIMIT 1`,
            [sellerId]
        );
        return {
            warehouse_id: mockWh?.[0]?.id || null,
            pickup_location: "FRAP PAY SHOPSOLUTIONSL-do-B2C",
            pickup_pincode: mockWh?.[0]?.pincode || "751010"
        };
    }

    // Production Mode
    if (!sellerId) {
        return { warehouse_id: null, pickup_location: "Primary", pickup_pincode: null };
    }

    const [warehouses] = await dbConn.query(
        `SELECT * FROM seller_warehouses
         WHERE seller_id = ? AND warehouse_created = TRUE LIMIT 1`,
        [sellerId]
    );

    if (!warehouses || warehouses.length === 0) {
        throw new Error("Seller warehouse not active or not synced with Delhivery.");
    }

    return {
        warehouse_id: warehouses[0].id,
        pickup_location: warehouses[0].pickup_location_name,
        pickup_pincode: warehouses[0].pincode
    };
}

async function createSellersShipment(order, sellerId, items, conn = null) {
    try {
        let totalWeight = 0;
        items.forEach(item => {
            const w = parseFloat(item.weight || 0.4);
            totalWeight += w * item.quantity;
        });

        totalWeight += 0.1;
        totalWeight = Math.ceil(totalWeight * 2) / 2;

        const sellerInfo = await getSellerPickupDetails(sellerId, conn);



        // 🔥 REUSE EXISTING AWB IF POSSIBLE (SAFE)
        let waybill = order.awb_number;

        if (!waybill) {
            waybill = await getUnusedWaybill(conn);

            if (!waybill) {
                throw new Error("No available waybills");
            }
        }

        const subOrder = {
            ...order,
            items,
            total_weight: totalWeight,
            warehouse_id: sellerInfo.warehouse_id,
            pickup_location_name: sellerInfo.pickup_location,
            awb_number: waybill,
            waybill
        };


        const shipmentResponse = await logisticsProvider.createShipment(subOrder);

        if (!shipmentResponse || !shipmentResponse.success) {
            throw new Error("Shipment creation failed");
        }

        // ✅ HANDLE duplicate case
        if (shipmentResponse.already_created) {
            console.log("♻️ Shipment already exists, continuing safely");
        }

        // mark only after success
        await markWaybillUsed(waybill, order.id, conn);

        // Update Status to shipment_created
        await pool.query(
            "UPDATE logistics_shipments SET shipment_status = 'shipment_created' WHERE order_id = ?",
            [order.id]
        );

        const shippingCost = parseFloat(order.shipping_amount || order.shipping_cost || 0);

        await createShipmentRecord(order.id, shipmentResponse, sellerId, shippingCost, conn);

        return shipmentResponse;

    } catch (e) {
        // Update Status to shipment_failed
        await pool.query(
            "UPDATE logistics_shipments SET shipment_status = 'shipment_failed' WHERE order_id = ?",
            [order.id]
        );
        throw e;
    }
}

// Helper for retry logic
async function withRetry(fn, retries = 3, delay = 200) {
    try {
        return await fn();
    } catch (err) {
        if (err.message.includes('Lock wait timeout') && retries > 0) {
            logger.warn(`Lock timeout. Retrying... (${retries} left)`);
            await new Promise(res => setTimeout(res, delay));
            return withRetry(fn, retries - 1, delay);
        }
        throw err;
    }
}

async function markAsPacked(orderId, sellerId) {
    if (!orderId) {
        throw new Error("orderId is missing in markAsPacked service");
    }

    const order = await orderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    if (order.status === 'CANCELLED') {
        throw new Error("Cannot pack a cancelled order");
    }

    // Guard: must have AWB before packing
    if (!order.awb_number) {
        throw new Error("AWB not yet assigned. Please complete Ready to Ship first.");
    }

    // Update order status to PACKED
    await orderModel.updateStatus(orderId, 'PACKED', "Marked as packed by seller");

    // ✅ FULLY ASYNC: Do not wait for pickup or label
    setImmediate(() => {
        processPickupThenLabel(orderId, order.awb_number, sellerId);
    });

    return true;
}

/**
 * ✅ Orchestrator: Request pickup first, then generate label on success.
 * Uses logistics_shipments.pickup_status and label_status for state — does NOT block order.status.
 */
async function processPickupThenLabel(orderId, awb, sellerId) {
    try {
        console.log(`🚚 [processPickupThenLabel] Start for Order ${orderId}`);

        // 1. Get warehouse for this order
        const sellerInfo = await getSellerPickupDetails(sellerId);
        if (!sellerInfo || !sellerInfo.pickup_location) {
            throw new Error('No warehouse found for seller');
        }

        // 2. Request pickup (aggregated, idempotent)
        const pickupResult = await createPickupIfNeeded(sellerInfo.pickup_location);

        // ✅ FIX 3: Allow label even if wallet fails
        if (pickupResult?.type === 'WALLET_ERROR') {
            console.log(`⚠️ [processPickupThenLabel] Wallet issue → generating label anyway for Order ${orderId}`);
            return processLabel(orderId, awb);
        }

        // ✅ STEP 1: Always try label, don't block
        if (pickupResult && pickupResult.success) {
            console.log(`✅ [processPickupThenLabel] Pickup confirmed → generating label in 30s for Order ${orderId}`);
            setTimeout(() => processLabel(orderId, awb), 30000); 
        } else {
            console.warn(`⚠️ [processPickupThenLabel] Pickup not confirmed (or skipped), still trying label in 30s for Order ${orderId}`);
            setTimeout(() => processLabel(orderId, awb), 30000);
        }

    } catch (err) {
        console.error(`❌ [processPickupThenLabel] Failed for Order ${orderId}:`, err.message);
        // pickup_status and label_status are updated inside their respective functions
    }
}

/**
 * Handle Label Generation and auto-transition to READY_TO_SHIP (utility, callable directly)
 */
async function handleGenerateLabel(orderId) {
    const [orders] = await pool.query("SELECT awb_number FROM orders WHERE id = ?", [orderId]);
    const waybill = orders[0]?.awb_number;

    if (!waybill) throw new Error("Waybill not found");

    const labelResponse = await delhiveryService.generateShippingLabel(waybill);
    const labelUrl = labelResponse.label_url;

    await pool.query(`
        UPDATE logistics_shipments 
        SET label_url = ?, label_generated_at = NOW(), label_status = 'ready'
        WHERE order_id = ?
    `, [labelUrl, orderId]);

    await orderModel.updateStatus(orderId, 'LABEL_GENERATED', "Shipping label generated", pool);

    // Auto-move to READY_TO_SHIP after label
    await orderModel.updateStatus(orderId, 'READY_TO_SHIP', "Automatically moved to Ready to Ship after label generation", pool);

    return labelUrl;
}

async function readyToShip(orderId, sellerId) {
    if (!orderId) {
        throw new Error("orderId is missing in readyToShip service");
    }

    const order = await orderModel.findById(orderId);
    if (!order) throw new Error("Order not found");

    if (order.status === 'CANCELLED') {
        throw new Error("Cannot ship a cancelled order");
    }

    const sellerItems = order.items.filter(item => {
        if (item.format === 'EBOOK') return false;
        if (sellerId === null) return item.seller_id == null;
        return Number(item.seller_id) === Number(sellerId);
    });

    if (sellerItems.length === 0) {
        const connection = await pool.getConnection();
        try {
            await orderModel.updateStatus(orderId, 'READY_TO_SHIP', "Digital Order", connection);
            return { awb_code: 'DIGITAL_ORDER' };
        } finally {
            connection.release();
        }
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 🔥 LOCK ROW (CRITICAL FIX)
        const [existing] = await connection.query(
            `SELECT id, awb_code 
             FROM logistics_shipments 
             WHERE order_id = ? 
             AND (seller_id = ? OR (seller_id IS NULL AND ? IS NULL))
             FOR UPDATE`,
            [orderId, sellerId, sellerId]
        );

        let awbCodeToReturn = null;

        // ✅ Idempotency: If shipment already exists, check if we need to run pickup+label
        if (existing.length > 0) {
            const shipment = existing[0];

            if (shipment.awb_code) {
                console.log("♻️ Reusing existing shipment:", shipment.awb_code);
                await connection.commit();

                // If label was not generated yet, re-trigger in background
                if (shipment.label_status !== 'ready') {
                    setImmediate(() => processPickupThenLabel(orderId, shipment.awb_code, sellerId));
                }

                return { awb_code: shipment.awb_code };
            }
        }

        // 🔥 CREATE SHIPMENT (SAFE)
        const shipmentRes = await createSellersShipment(order, sellerId, sellerItems, connection);
        awbCodeToReturn = shipmentRes?.awb_code;

        if (!awbCodeToReturn) {
            throw new Error("AWB not generated");
        }

        // 🔥 SAVE AWB IN ORDERS TABLE (CRITICAL FIX)
        await connection.query(
            "UPDATE orders SET awb_number = ? WHERE id = ?",
            [awbCodeToReturn, orderId]
        );

        await orderModel.updateStatus(orderId, 'AWB_ASSIGNED', "Shipment created and AWB assigned", connection);

        await connection.commit();

        // 🔥 Labels & Pickups are now separate in the flow
        // processLabel will be triggered by markAsPacked

        return { awb_code: awbCodeToReturn };

    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

/**
 * Generate Shipping Label with Retry
 * Delhivery needs time (5-10s) to process shipment before packing slip is available.
 */
async function generateLabelWithRetry(awb, retries = 6) {
    const delhiveryService = require("./delhivery.service");

    for (let i = 1; i <= retries; i++) {
        try {
            console.log(`📄 Attempt ${i}: Fetching label for ${awb}`);

            const res = await delhiveryService.generateShippingLabel(awb);

            if (res?.label_url) {
                console.log(`✅ Label ready for ${awb}`);
                return res;
            }

            console.warn(`⏳ Label not ready yet for ${awb}`);

        } catch (e) {
            console.warn(`❌ Attempt ${i} failed: ${e.message}`);
        }

        // ⏳ Progressive delay
        await new Promise(r => setTimeout(r, i * 5000));
    }

    console.error(`❌ Label not available after retries for ${awb}`);
    return null;
}

async function cancelOrderShipment(orderId) {
    try {
        const [shipments] = await pool.query(
            "SELECT awb_code FROM logistics_shipments WHERE order_id = ? AND admin_status NOT IN ('CANCELLED', 'DELIVERED')",
            [orderId]
        );

        if (shipments.length === 0) {
            logger.info(`No active shipments to cancel for order ${orderId}`);
            return true;
        }

        const delhiveryService = require("./delhivery.service");
        for (const s of shipments) {
            if (s.awb_code) {
                try {
                    await delhiveryService.cancelShipment(s.awb_code);
                    await pool.query(
                        "UPDATE logistics_shipments SET admin_status = 'CANCELLED', cancelled_at = NOW() WHERE awb_code = ?",
                        [s.awb_code]
                    );
                    logger.info(`Cancelled Delhivery shipment ${s.awb_code} for order ${orderId}`);
                } catch (apiErr) {
                    logger.error(`Failed to cancel Delhivery shipment ${s.awb_code}`, { error: apiErr.message });
                    // We continue for other AWBs if any
                }
            }
        }
        return true;
    } catch (err) {
        logger.error(`Error in cancelOrderShipment for order ${orderId}`, { error: err.message });
        throw err;
    }
}

async function syncWarehouse(sellerId, warehouseData, type = 'create') {
    try {
        const provider = require("./logistics.provider");
        const payload = {
            pickup_location_name: warehouseData.pickup_location_name || warehouseData.warehouse_name || `seller_${sellerId}`,
            phone: warehouseData.phone || warehouseData.warehouse_phone,
            address: warehouseData.address || warehouseData.warehouse_address,
            city: warehouseData.city || warehouseData.warehouse_city,
            state: warehouseData.state || warehouseData.warehouse_state,
            pincode: warehouseData.pincode || warehouseData.warehouse_pin,
            email: warehouseData.email || warehouseData.warehouse_email
        };

        if (env.LOGISTICS_MODE === "mock") {
            // Update local DB to mark as synced in mock mode
            await pool.query(
                "UPDATE seller_warehouses SET warehouse_created = TRUE WHERE seller_id = ?",
                [sellerId]
            );
            return { success: true, message: "Mock warehouse sync successful" };
        }

        let response;
        if (type === 'create') {
            response = await provider.createClientWarehouse(payload);
        } else {
            response = await provider.editClientWarehouse(payload);
        }

        // Update DB status if successful
        if (response && !response.error) {
            if (warehouseData.id) {
                await pool.query(
                    "UPDATE seller_warehouses SET warehouse_created = TRUE WHERE id = ?",
                    [warehouseData.id]
                );
            } else {
                await pool.query(
                    "UPDATE seller_warehouses SET warehouse_created = TRUE WHERE seller_id = ? AND pickup_location_name = ?",
                    [sellerId, payload.pickup_location_name]
                );
            }
        }

        return response;
    } catch (err) {
        logger.error(`Warehouse sync error (${type})`, { sellerId, error: err.message });
        throw err;
    }
}

/**
 * Process Label (Download from provider -> Upload to S3 -> Update DB)
 * FIX 4: Limited retries (max 5). FIX 7: Safety check on pickup_status.
 */
async function processLabel(orderId, awb, attempt = 1) {
    try {
        console.log(`📄 [processLabel] Attempt ${attempt}/6 for Order ${orderId}, AWB ${awb}`);

        // 1. Initial status update
        if (attempt === 1) {
            await pool.query(
                "UPDATE logistics_shipments SET label_status = 'processing' WHERE order_id = ?",
                [orderId]
            );
        }

        // 2. Call Delhivery Service (Improved)
        const result = await delhiveryService.generateShippingLabel(awb);

        if (!result.success) {
            // Case A: Temporary failure (retry)
            if (result.retry && attempt <= 6) {
                // 🔥 STAGGERED RETRY DELAY: 5s, 10s, 20s, 30s, 60s...
                const delays = [5000, 10000, 20000, 30000, 60000, 60000];
                const delay = delays[attempt - 1] || 60000;

                console.warn(`⏳ [processLabel] Label not ready for AWB ${awb}. Retrying (Attempt ${attempt}/6) in ${delay/1000}s...`);
                setTimeout(() => processLabel(orderId, awb, attempt + 1), delay);
                return;
            }

            // Case B: Fatal failure or max retries
            console.error(`❌ [processLabel] Final failure for AWB ${awb} after ${attempt} attempts: ${result.error}`);
            await pool.query(
                "UPDATE logistics_shipments SET label_status = 'failed' WHERE order_id = ?",
                [orderId]
            );
            return;
        }

        // 3. Get the PDF — either already a Buffer (base64) or a URL to download
        const axios = require("axios");
        const { uploadToS3 } = require("../../utils/s3.util");

        let buffer;

        if (result.pdfBuffer) {
            // 🔥 CASE A: Delhivery returned base64 data — already decoded to Buffer
            console.log(`📄 [processLabel] Using base64 PDF buffer for Order ${orderId}`);
            buffer = result.pdfBuffer;
        } else if (result.label_url) {
            // CASE B: Delhivery returned a URL — download it
            console.log(`📄 [processLabel] Downloading PDF from URL for Order ${orderId}`);
            const pdfRes = await axios.get(result.label_url, { responseType: 'arraybuffer' });
            buffer = Buffer.from(pdfRes.data);
        } else {
            throw new Error("No PDF buffer or URL in label result");
        }

        // 4. Upload to S3
        const fileName = `labels/order-${orderId}-${awb}.pdf`;
        const s3Url = await uploadToS3(buffer, fileName);

        // 5. Finalize DB
        await pool.query(
            `UPDATE logistics_shipments 
             SET label_status = 'ready', 
                 label_s3_url = ?, 
                 label_url = ?,
                 label_generated_at = NOW() 
             WHERE order_id = ?`,
            [s3Url, result.label_url, orderId]
        );

        // Update Order level link for user
        await pool.query(
            "UPDATE orders SET shipping_label_url = ? WHERE id = ?",
            [s3Url, orderId]
        );

        // Notify and update status logs
        await orderModel.addStatusLog(orderId, 'LABEL_GENERATED', "Shipping label ready for download", pool);

        console.log(`✅ [processLabel] Successfully generated label for Order ${orderId}`);

    } catch (error) {
        console.error(`❌ [processLabel] Error in automation for Order ${orderId}:`, error.message);

        if (attempt <= 6) {
            const delays = [5000, 10000, 20000, 30000, 60000, 60000];
            const delay = delays[attempt - 1] || 60000;

            console.log(`⏳ [processLabel] System error, retrying (Attempt ${attempt}/6) in ${delay/1000}s...`);
            setTimeout(() => processLabel(orderId, awb, attempt + 1), delay);
        } else {
            console.error(`❌ [processLabel] All attempts exhausted due to system error for Order ${orderId}`);
            await pool.query(
                "UPDATE logistics_shipments SET label_status = 'failed' WHERE order_id = ?",
                [orderId]
            );
        }
    }
}

// scheduleRetry is now inlined in processLabel with attempt counter (FIX 4)

/**
 * Cron Job logic to recover failed labels
 */
async function retryFailedLabels() {
    try {
        const [failed] = await pool.query(`
            SELECT order_id, awb_code as awb 
            FROM logistics_shipments 
            WHERE label_status = 'failed'
        `);

        if (failed.length === 0) return;

        console.log(`🔄 [retryFailedLabels] Found ${failed.length} failed labels, retrying...`);

        for (let row of failed) {
            // Use non-blocking call
            processLabel(row.order_id, row.awb);
        }
    } catch (err) {
        console.error("❌ [retryFailedLabels] Error:", err.message);
    }
}

/**
 * Aggregated Pickup Logic (Daily per warehouse)
 * Idempotent: safe to call multiple times per day.
 */
async function createPickupIfNeeded(warehouseName) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // ✅ Dynamic pickup time: always at least 1 hour from now, capped at 18:00
    const futureHour = Math.min(now.getHours() + 1, 18);
    const pickupTime = `${String(futureHour).padStart(2, '0')}:00:00`;

    // 1. Count READY_TO_SHIP + PACKED orders for this warehouse (not yet in a pickup)
    const [orderCountRows] = await pool.query(`
        SELECT o.id
        FROM orders o
        JOIN logistics_shipments ls ON o.id = ls.order_id
        JOIN seller_warehouses sw ON ls.seller_id = sw.seller_id
        WHERE sw.pickup_location_name = ?
        AND o.status IN ('PACKED', 'READY_TO_SHIP')
        AND o.pickup_requested = FALSE
    `, [warehouseName]);

    const packageCount = orderCountRows.length;
    if (packageCount === 0) return null;

    // 2. Check existing OPEN pickup for today (idempotency)
    const [existing] = await pool.query(`
        SELECT * FROM pickup_requests
        WHERE warehouse_name = ? AND pickup_date = ? AND status = 'OPEN'
        LIMIT 1
    `, [warehouseName, today]);

    if (existing.length > 0) {
        // Just update the count — no new API call
        await pool.query(
            "UPDATE pickup_requests SET expected_package_count = ? WHERE id = ?",
            [packageCount, existing[0].id]
        );
        console.log(`♻️ [createPickupIfNeeded] Updated existing pickup for ${warehouseName}: ${packageCount} packages`);
        return existing[0];
    }

    // 3. Create new pickup in Delhivery
    let response;
    try {
        response = await delhiveryService.createPickupRequest({
            pickup_location: warehouseName,
            pickup_date: today,
            pickup_time: pickupTime,
            expected_package_count: packageCount
        });
    } catch (apiErr) {
        const errData = apiErr.response?.data;

        // ✅ FIX 2: Handle wallet error separately — do NOT throw
        if (errData?.prepaid) {
            console.error(`💰 [createPickupIfNeeded] Wallet low for ${warehouseName}:`, errData.prepaid);
            const orderIds = orderCountRows.map(r => r.id);
            if (orderIds.length > 0) {
                await pool.query(
                    `UPDATE logistics_shipments SET pickup_status = 'wallet_failed' WHERE order_id IN (?)`,
                    [orderIds]
                );
            }
            return { success: false, type: 'WALLET_ERROR' };
        }

        // Normal failure — do NOT throw (let orchestrator decide)
        console.error(`❌ [createPickupIfNeeded] Delhivery API error for ${warehouseName}:`, apiErr.message);
        const orderIds = orderCountRows.map(r => r.id);
        if (orderIds.length > 0) {
            await pool.query(
                `UPDATE logistics_shipments SET pickup_status = 'failed' WHERE order_id IN (?)`,
                [orderIds]
            );
        }
        return { success: false };
    }

    if (response && (response.pickup_id || response.success)) {
        const [result] = await pool.query(`
            INSERT INTO pickup_requests 
            (warehouse_name, pickup_date, pickup_time, expected_package_count, status)
            VALUES (?, ?, ?, ?, 'OPEN')
        `, [warehouseName, today, pickupTime, packageCount]);

        const orderIds = orderCountRows.map(r => r.id);

        // ✅ FIX: Mark pickup_status as 'requested' on logistics_shipments
        if (orderIds.length > 0) {
            await pool.query(
                `UPDATE logistics_shipments SET pickup_status = 'requested' WHERE order_id IN (?)`,
                [orderIds]
            );
        }

        // Mark orders as pickup_requested so they aren't included in next pickup
        if (orderIds.length > 0) {
            await pool.query(
                `UPDATE orders SET pickup_requested = TRUE WHERE id IN (?)`,
                [orderIds]
            );
        }

        console.log(`✅ [createPickupIfNeeded] Pickup created for ${warehouseName}: ${packageCount} packages`);
        return { id: result.insertId, pickup_id: response.pickup_id, success: true };
    }

    // Delhivery rejected
    const rejectMsg = response?.message || 'Pickup request rejected by Delhivery';
    console.error(`❌ [createPickupIfNeeded] Rejected for ${warehouseName}: ${rejectMsg}`);
    const orderIds = orderCountRows.map(r => r.id);
    if (orderIds.length > 0) {
        await pool.query(
            `UPDATE logistics_shipments SET pickup_status = 'failed' WHERE order_id IN (?)`,
            [orderIds]
        );
    }
    return null;
}

module.exports = {
    createShipmentRecord,
    updateShipmentStatus,
    markAsPacked,
    readyToShip,
    generateLabelWithRetry,
    processLabel,
    processPickupThenLabel,
    retryFailedLabels,
    syncWarehouse,
    handleDelhiveryWebhook,
    cancelOrderShipment,
    createPickupIfNeeded
};
