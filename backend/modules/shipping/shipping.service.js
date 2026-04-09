/**
 * shipping.service.js
 * Expanded Delhivery webhook handler — handles ALL courier event types,
 * delegates business logic to logistics.service state machine.
 */

const logisticsProvider = require('../logistics/logistics.provider');
const { getDynamicMargin } = require('./shipping.util');

// COD charges configuration
const COD_CHARGES = {
    upto_300: 30,
    upto_500: 40,
    above_500: 50,
};
const MARGIN = 20;

function getCODCharges(orderAmount) {
    if (orderAmount > 1500) return 0;
    if (orderAmount <= 300) return COD_CHARGES.upto_300;
    if (orderAmount <= 500) return COD_CHARGES.upto_500;
    return COD_CHARGES.above_500;
}

async function calculateShippingCharges(params) {
    return await logisticsProvider.calculateShippingCharges({
        ...params,
        cod: params.cod === 1 ? 1 : 0,
    });
}

async function checkPincodeServiceability(pincode) {
    try {
        const response = await logisticsProvider.calculateShippingCharges({
            pickup_pincode: '110001',
            delivery_pincode: pincode,
            weight: 0.5,
            cod: 0,
        });
        return { serviceable: !response.data?.is_fallback, pincode };
    } catch (error) {
        return { serviceable: true, pincode, error: error.message };
    }
}

/* ============================================================
   DELHIVERY WEBHOOK
   Handles the full range of Delhivery status events —
   including DELIVERED, RTO, CANCELLED, and transit updates.
   All business logic is delegated to the logistics state machine.
   ============================================================ */
async function handleDelhiveryWebhook(req, res) {
    const logger = require('../../utils/logger');
    const logisticsService = require('../logistics/logistics.service');

    try {
        // Delhivery sends either a flat object or a wrapped payload
        // Support both `waybill` (legacy) and `packages[0].awb` structures
        const body = req.body;

        // Extract AWB (waybill) and status from the Delhivery payload
        // Delhivery webhook schema ref: https://developer.delhivery.com/docs/status-webhook
        const awb_code = body.waybill
            || body.awb
            || body?.packages?.[0]?.waybill
            || null;

        const current_status = body.status
            || body.current_status
            || body?.packages?.[0]?.status
            || null;

        const current_location = body.city
            || body.current_location
            || body?.packages?.[0]?.city
            || '';

        const edd = body.edd || body?.packages?.[0]?.edd || null;

        logger.info('[Webhook/Delhivery] Received event', {
            awb_code, current_status, current_location,
        });

        if (!awb_code || !current_status) {
            logger.warn('[Webhook/Delhivery] Missing AWB or status — ignoring', { body });
            return res.status(200).json({ message: 'Ignored: missing required fields' });
        }

        // Delegate ALL business logic to the unified state machine.
        // updateShipmentStatus handles: stock restoration, refunds, timestamps, notifications.
        await logisticsService.updateShipmentStatus(awb_code, current_status, {
            location: current_location,
            edd: edd,
            remarks: body.remarks || `Webhook update: ${current_status}`
        });

        logger.info('[Webhook/Delhivery] Event processed successfully', { awb_code, current_status });
        return res.status(200).json({ message: 'Event processed', awb_code, status: current_status });

    } catch (err) {
        const logger = require('../../utils/logger');
        logger.error('[Webhook/Delhivery] Webhook handler critical error', {
            error: err.message, stack: err.stack,
        });
        // Always return 200 to prevent Delhivery from endlessly retrying on server errors.
        // Genuine processing errors are logged for alerting.
        return res.status(200).json({ message: 'Acknowledged (internal error logged)' });
    }
}

module.exports = {
    calculateShippingCharges,
    checkPincodeServiceability,
    getCODCharges,
    getDynamicMargin,
    handleDelhiveryWebhook,
    MARGIN,
    COD_CHARGES,
};