const express = require('express');
const router = express.Router();
const shippingService = require('./shipping.service');
const { AuthMiddleware } = require('../../middlewares/auth.middleware');

/**
 * Calculate shipping charges
 * POST /api/shipping/calculate
 */
router.post('/calculate', async (req, res) => {
    try {
        const {
            pickup_pincode,
            delivery_pincode,
            weight,
            cod,
            order_amount,
            seller_id  // 🔥 NEW: Accept seller_id to look up real warehouse pincode
        } = req.body;

        if (!delivery_pincode) {
            return res.status(400).json({
                success: false,
                message: 'Delivery pincode is required'
            });
        }

        // 🔥 Resolve actual pickup pincode from seller's warehouse
        let resolvedPickupPincode = pickup_pincode || null;

        if (!resolvedPickupPincode && seller_id) {
            const pool = require('../../config/db');
            // Try seller_warehouses first (has verified Delhivery warehouse)
            const [warehouses] = await pool.query(
                `SELECT pincode FROM seller_warehouses WHERE seller_id = ? ORDER BY warehouse_created DESC LIMIT 1`,
                [seller_id]
            );
            if (warehouses.length > 0 && warehouses[0].pincode) {
                resolvedPickupPincode = warehouses[0].pincode;
            } else {
                // Fallback to seller_info.pickup_pincode
                const [rows] = await pool.query(
                    `SELECT pickup_pincode FROM seller_info WHERE user_id = ?`,
                    [seller_id]
                );
                if (rows.length > 0 && rows[0].pickup_pincode) {
                    resolvedPickupPincode = rows[0].pickup_pincode;
                } else {
                    console.warn(`⚠️ [Shipping] Seller ${seller_id} not found in seller_info or pincode missing.`);
                }
            }
        }

        // Final fallback to env or hardcoded default
        resolvedPickupPincode = resolvedPickupPincode || process.env.DEFAULT_PICKUP_PINCODE || '751010';
        console.log(`🔥 [Shipping] Resolved pickup_pincode: ${resolvedPickupPincode} (seller_id: ${seller_id || 'N/A'})`);

        const result = await shippingService.calculateShippingCharges({
            pickup_pincode: resolvedPickupPincode,
            delivery_pincode,
            weight: weight || 0.5,
            cod: cod ? 1 : 0,
            order_amount: order_amount || 0
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error('Shipping calculation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to calculate shipping charges',
            error: error.message
        });
    }
});

/**
 * Check pincode serviceability
 * GET /api/shipping/check-pincode/:pincode
 */
router.get('/check-pincode/:pincode', async (req, res) => {
    try {
        const { pincode } = req.params;

        if (!pincode || pincode.length !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Valid 6-digit pincode is required'
            });
        }

        const result = await shippingService.checkPincodeServiceability(pincode);

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Pincode check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check pincode',
            error: error.message
        });
    }
});

/**
 * Get COD charges for amount
 * GET /api/shipping/cod-charges/:amount
 */
router.get('/cod-charges/:amount', (req, res) => {
    try {
        const amount = parseFloat(req.params.amount) || 0;
        const codCharges = shippingService.getCODCharges(amount);

        return res.status(200).json({
            success: true,
            data: {
                order_amount: amount,
                cod_charges: codCharges,
                margin: shippingService.MARGIN,
                cod_structure: shippingService.COD_CHARGES
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to get COD charges',
            error: error.message
        });
    }
});

module.exports = router;