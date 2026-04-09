const logisticsService = require("./logistics.service");
const logger = require("../../utils/logger");
const db = require("../../config/db");

async function handleWebhook(req, res) {
    try {
        const payload = req.body;
        // Basic Delhivery Key Validation (Optional but recommended)
        const apiKey = req.headers['x-api-key'];
        if (process.env.DELHIVERY_WEBHOOK_KEY && apiKey !== process.env.DELHIVERY_WEBHOOK_KEY) {
            logger.warn("Unauthorized Delhivery Webhook Attempt", { ip: req.ip });
            return res.status(401).send("Unauthorized");
        }

        await logisticsService.handleDelhiveryWebhook(payload);
        res.status(200).send("OK");
    } catch (err) {
        logger.error("Delhivery Webhook Error", { error: err.message });
        res.status(500).send("Error");
    }
}

async function createShipmentManual(req, res) {
    // Keep this for admin fallback, but simplified
    try {
        const { orderId } = req.body;
        const orderService = require("../order/order.service");
        const order = await orderService.getOrderById(orderId, req.user.userId, req.user.role);

        if (!order) return res.status(404).json({ message: "Order not found" });

        await logisticsService.processShipment(order);

        return res.status(200).json({ message: "Shipment creation initiated" });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

async function markPacked(req, res) {
    try {
        const orderId = req.body.orderId || req.body.order_id;
        console.log("🔥 [markPacked] Request:", { orderId, userId: req.user.userId, role: req.user.role });

        if (!orderId) {
            return res.status(400).json({ message: "orderId is required in request body" });
        }

        const sellerId = req.user.role === 'ADMIN' ? null : req.user.userId;

        const success = await logisticsService.markAsPacked(orderId, sellerId);

        if (success) {
            return res.status(200).json({ 
                success: true,
                message: "Order marked as packed"
            });
        } else {
            return res.status(404).json({ message: "Order not found or no items for this seller" });
        }
    } catch (err) {
        console.error("❌ [markPacked] Error:", err.message);
        return res.status(500).json({ message: err.message });
    }
}

async function readyToShip(req, res) {
    try {
        const orderId = req.body.orderId || req.body.order_id;
        console.log("🔥 [readyToShip] Request:", { orderId, userId: req.user.userId, role: req.user.role });

        if (!orderId) {
            return res.status(400).json({ message: "orderId is required in request body" });
        }

        const sellerId = req.user.role === 'ADMIN' ? null : req.user.userId;

        const result = await logisticsService.readyToShip(orderId, sellerId);

        if (result && result.awb_code) {
            return res.status(200).json({ 
                success: true,
                message: "Shipment created and ready to ship",
                data: {
                    awb_code: result.awb_code
                }
            });
        } else {
            return res.status(404).json({ message: "Failed to create shipment or order not found" });
        }
    } catch (err) {
        console.error("❌ [readyToShip] Error:", err.message);
        return res.status(500).json({ message: err.message });
    }
}

async function downloadShippingLabel(req, res) {
    try {
        const { orderId } = req.params;
        const [rows] = await db.query(
            "SELECT label_status, label_s3_url FROM logistics_shipments WHERE order_id = ? LIMIT 1",
            [orderId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Shipment record not found" });
        }

        const shipment = rows[0];

        if (shipment.label_status === 'ready') {
            if (!shipment.label_s3_url) {
                return res.status(500).json({ message: "Label marked as ready but URL missing" });
            }
            // ✅ Return the URL as JSON — do NOT redirect.
            // Redirect causes CORS failure when frontend uses axios (XHR follows the redirect to S3).
            return res.status(200).json({
                success: true,
                status: 'ready',
                url: shipment.label_s3_url
            });
        }

        if (shipment.label_status === 'processing' || shipment.label_status === 'pending') {
            return res.status(202).json({
                success: false,
                status: shipment.label_status,
                message: "Label is still being generated. Please check back in a moment."
            });
        }

        if (shipment.label_status === 'failed') {
            return res.status(404).json({
                success: false,
                status: 'failed',
                message: "Label generation failed. Please try re-triggering it."
            });
        }

        return res.status(404).json({ message: "Shipping label not available yet" });

    } catch (err) {
        logger.error("Download Label Error", { error: err.message });
        return res.status(500).json({ message: "Failed to retrieve label" });
    }
}

async function getShipments(req, res) {
    try {
        const { status, limit = 10, page = 1, orderId } = req.query;
        const offset = (page - 1) * limit;
        const role = req.user.role;
        const userId = req.user.userId;

        let baseQuery = `
            FROM logistics_shipments ls
            JOIN orders o ON ls.order_id = o.id
            JOIN users u ON o.user_id = u.id
            LEFT JOIN users seller_user ON ls.seller_id = seller_user.id
        `;

        const params = [];
        const conditions = [];

        // Role-based filtering
        if (role === 'SELLER') {
            conditions.push("ls.seller_id = ?");
            params.push(userId);
        }

        // Status filter
        if (status) {
            conditions.push("ls.admin_status = ?");
            params.push(status);
        }

        if (orderId) {
            conditions.push("ls.order_id = ?");
            params.push(orderId);
        }

        let whereClause = "";
        if (conditions.length > 0) {
            whereClause = " WHERE " + conditions.join(" AND ");
        }

        // Count query
        const countQuery = `SELECT COUNT(DISTINCT ls.id) as total ${baseQuery} ${whereClause}`;
        const [countResult] = await db.query(countQuery, params);
        const totalItems = countResult[0].total;

        // Data query
        let dataQuery = `
            SELECT 
                ls.*,
                ls.cod_amount,
                u.email as buyer_email,
                seller_user.name as seller_name,
                seller_user.email as seller_email,
                o.total_payable_amount as total_amount,
                o.payment_method,
                o.status as order_status,
                (SELECT count(*) FROM order_items WHERE order_id = ls.order_id) as item_count
            ${baseQuery}
            ${whereClause}
            GROUP BY ls.id 
            ORDER BY ls.created_at DESC 
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, parseInt(limit), parseInt(offset)];
        const [rows] = await db.query(dataQuery, dataParams);

        if (req.query.includeHistory === 'true' && rows.length > 0) {
            const shipmentIds = rows.map(r => r.id);
            const [historyRows] = await db.query(
                "SELECT shipment_id, status, location, description, activity_date FROM shipment_tracking_history WHERE shipment_id IN (?) ORDER BY activity_date DESC",
                [shipmentIds]
            );

            // Group history by shipment_id
            const historyMap = historyRows.reduce((acc, h) => {
                const sid = h.shipment_id;
                if (!acc[sid]) acc[sid] = [];
                acc[sid].push(h);
                return acc;
            }, {});

            rows.forEach(row => {
                row.tracking_history = historyMap[row.id] || [];
            });
        }

        return res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems,
                totalPages: Math.ceil(totalItems / limit)
            }
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

async function calculateShipping(req, res) {
    try {
        let { deliveryPincode, weight, cod, orderAmount, sellerId } = req.body;

        const sanitizePin = (p) => (p ? String(p).trim() : "");

        deliveryPincode = sanitizePin(deliveryPincode);

        if (!deliveryPincode || deliveryPincode.length !== 6) {
            return res.status(400).json({
                message: "Valid delivery pincode is required"
            });
        }

        weight = Number(weight) || 0.5;
        orderAmount = Number(orderAmount) || 0;
        cod = cod ? 1 : 0;

        let pickupPincode = null;

        console.log(`[Logistics] Seller: ${sellerId}`);

        if (sellerId) {
            const [rows] = await db.query(
                `SELECT pincode 
                 FROM seller_warehouses 
                 WHERE seller_id = ? 
                 AND warehouse_created = 1 
                 ORDER BY is_default DESC 
                 LIMIT 1`,
                [sellerId]
            );

            if (rows.length > 0 && rows[0].pincode) {
                pickupPincode = sanitizePin(rows[0].pincode);
            }
        }

        // 🔥 SAFE FALLBACK
        if (!pickupPincode || pickupPincode.length !== 6) {
            pickupPincode =
                process.env.DEFAULT_PICKUP_PINCODE || "110001";
        }

        console.log("📦 CONTROLLER INPUT:", {
            pickupPincode,
            deliveryPincode,
            weight,
            cod,
            orderAmount
        });

        const delhiveryService = require("./delhivery.service");

        const result = await delhiveryService.calculateShippingCharges({
            pickup_pincode: pickupPincode,
            delivery_pincode: deliveryPincode,
            weight,
            cod,
            order_amount: orderAmount
        });

        return res.status(200).json(result);
    } catch (err) {
        console.error("❌ Controller Error:", err.message);

        return res.status(500).json({
            message: "Failed to calculate shipping",
            error: err.message
        });
    }
}


async function simulateStatus(req, res) {
    try {
        const { status, awb, location } = req.body;

        if (!awb || !status) {
            return res.status(400).json({ message: "AWB and status are required" });
        }

        await logisticsService.updateShipmentStatus(awb, status, {
            location: location || 'Simulated Location',
            remarks: 'Admin Manual Simulation'
        });

        return res.status(200).json({ success: true, message: "Status simulated" });
    } catch (error) {
        logger.error("Simulation Error", { error: error.message });
        return res.status(500).json({ message: error.message });
    }
}

async function createWarehouse(req, res) {
    try {
        const result = await logisticsService.syncWarehouse(req.user.userId, req.body, 'create');
        return res.status(200).json(result);
    } catch (err) {
        logger.error("Create Warehouse Error", { error: err.message });
        return res.status(500).json({ message: err.message });
    }
}

async function updateWarehouse(req, res) {
    try {
        const result = await logisticsService.syncWarehouse(req.user.userId, req.body, 'update');
        return res.status(200).json(result);
    } catch (err) {
        logger.error("Update Warehouse Error", { error: err.message });
        return res.status(500).json({ message: err.message });
    }
}

async function retryLabel(req, res) {
    try {
        const { orderId } = req.params;
        
        // 1. Fetch AWB
        const [shipment] = await db.query(
            "SELECT awb_code FROM logistics_shipments WHERE order_id = ? LIMIT 1",
            [orderId]
        );

        if (!shipment || !shipment[0].awb_code) {
            return res.status(404).json({ message: "No AWB found for this order" });
        }

        // 2. Trigger non-blocking process
        logisticsService.processLabel(orderId, shipment[0].awb_code);

        return res.status(200).json({ 
            success: true, 
            message: "Label retry initiated. It will be ready in a moment." 
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

async function retryPickup(req, res) {
    try {
        const { orderId } = req.params;

        const [shipmentRows] = await db.query(
            "SELECT ls.seller_id, sw.pickup_location_name FROM logistics_shipments ls JOIN seller_warehouses sw ON ls.seller_id = sw.seller_id WHERE ls.order_id = ? LIMIT 1",
            [orderId]
        );

        if (!shipmentRows || shipmentRows.length === 0) {
            return res.status(404).json({ message: "No shipment found for this order" });
        }

        const warehouseName = shipmentRows[0].pickup_location_name;

        if (!warehouseName) {
            return res.status(400).json({ message: "No warehouse found for this shipment" });
        }

        // Non-blocking — aggregated pickup for the whole warehouse
        setImmediate(() => logisticsService.createPickupIfNeeded(warehouseName));

        return res.status(200).json({
            success: true,
            message: "Pickup retry initiated for warehouse."
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

async function retryShipment(req, res) {
    try {
        const { orderId } = req.params;
        const [shipmentRows] = await db.query(
            "SELECT seller_id, shipment_status FROM logistics_shipments WHERE order_id = ? LIMIT 1",
            [orderId]
        );

        if (shipmentRows.length === 0) {
            return res.status(404).json({ message: "No shipment found for this order" });
        }

        const shipment = shipmentRows[0];
        const sellerId = shipment.seller_id;

        if (shipment.shipment_status === 'pickup_failed') {
            // Get warehouse and retry pickup
            const [whRows] = await db.query(
                "SELECT pickup_location_name FROM seller_warehouses WHERE seller_id = ? LIMIT 1",
                [sellerId]
            );
            if (whRows.length > 0) {
                setImmediate(() => logisticsService.createPickupIfNeeded(whRows[0].pickup_location_name));
            }
            return res.status(200).json({ success: true, message: "Pickup retry initiated" });
        }

        if (shipment.shipment_status === 'shipment_failed' || !shipment.shipment_status) {
            await logisticsService.readyToShip(orderId, sellerId);
            return res.status(200).json({ success: true, message: "Shipment retry initiated" });
        }

        return res.status(200).json({
            success: true,
            message: "Shipment status is current",
            status: shipment.shipment_status
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports = {
    handleWebhook,
    createShipmentManual,
    markPacked,
    readyToShip,
    retryLabel,
    retryPickup,
    retryShipment,
    getShipments,
    calculateShipping,
    simulateStatus,
    createWarehouse,
    updateWarehouse,
    downloadShippingLabel
};