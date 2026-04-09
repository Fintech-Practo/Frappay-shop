const cron = require("node-cron");
const pool = require("../config/db");
const delhiveryService = require("../modules/logistics/delhivery.service");
const logisticsService = require("../modules/logistics/logistics.service");
const logger = require("../utils/logger");

/**
 * Delhivery Status Backup Sync Job
 * Runs every 15 minutes to catch any status updates missed by webhooks.
 * Targets orders that are in intermediate logistics states.
 */
cron.schedule("*/15 * * * *", async () => {
    logger.info("🚚 Starting Delhivery Shipment Sync Job...");

    try {
        // 1. Fetch active shipments that are not in terminal states
        // Terminal states: DELIVERED, CANCELLED, RETURNED, RTO_DELIVERED
        const [shipments] = await pool.query(`
            SELECT awb_code, id, order_id, admin_status 
            FROM logistics_shipments 
            WHERE admin_status NOT IN ('DELIVERED', 'CANCELLED', 'RETURNED', 'RTO_DELIVERED')
            AND awb_code IS NOT NULL
            AND created_at > NOW() - INTERVAL 30 DAY
            ORDER BY updated_at ASC
            LIMIT 50
        `);

        if (shipments.length === 0) {
            logger.info("ℹ️ No active shipments found for sync.");
            return;
        }

        logger.info(`🔍 Syncing ${shipments.length} shipments with Delhivery...`);

        for (const shipment of shipments) {
            try {
                // 2. Track shipment from Delhivery
                const response = await delhiveryService.trackShipment(shipment.awb_code);
                
                // Delhivery response structure can be complex, extract status safely
                // Based on delhivery.service.js trackShipment uses /api/v1/packages/json/
                const data = response.data;
                const pkg = data?.ShipmentData?.[0]?.Shipment || data?.packages?.[0];
                
                if (!pkg) {
                    logger.warn(`⚠️ No package data found for AWB ${shipment.awb_code}`);
                    continue;
                }

                const currentStatus = pkg.Status?.Status || pkg.status || pkg.current_status;
                const currentLocation = pkg.Status?.StatusLocation || pkg.city || pkg.current_location;
                const remarks = pkg.Status?.Instructions || pkg.remarks;

                if (!currentStatus) {
                    logger.warn(`⚠️ Could not determine status for AWB ${shipment.awb_code}`);
                    continue;
                }

                // 3. Update internal status (this handles dashboard sync and SMS triggers)
                await logisticsService.updateShipmentStatus(shipment.awb_code, currentStatus, {
                    location: currentLocation,
                    remarks: remarks || `Sync Job Update: ${currentStatus}`
                });

            } catch (err) {
                logger.error(`❌ Failed to sync AWB ${shipment.awb_code}:`, { error: err.message });
            }
            
            // Subtle delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        logger.info("✅ Delhivery Shipment Sync Job completed.");

    } catch (err) {
        logger.error("❌ Critical error in Delhivery Sync Job:", { error: err.message });
    }
});

logger.info("⏰ Delhivery Shipment Sync Job scheduled (Every 15 min)");
