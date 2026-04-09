const cron = require("node-cron");
const pool = require("../config/db");
const { createPickupIfNeeded } = require("../modules/logistics/logistics.service");

/**
 * Weekly/Daily Pickup Logic
 * Runs at 11:00 AM and 4:00 PM every day
 */
cron.schedule("0 11,16 * * *", async () => {
    console.log("🚛 Running Scheduled Pickup Aggregation...");

    try {
        // Get all active warehouses
        const [warehouses] = await pool.query(
            "SELECT DISTINCT pickup_location_name FROM seller_warehouses WHERE warehouse_created = TRUE"
        );

        for (const wh of warehouses) {
            console.log(`📦 Processing pickup for warehouse: ${wh.pickup_location_name}`);
            try {
                const result = await createPickupIfNeeded(wh.pickup_location_name);
                if (result) {
                    console.log(`✅ Pickup requested for ${wh.pickup_location_name}: ${result.pickup_id || result.id}`);
                } else {
                    console.log(`ℹ️ No pending orders for ${wh.pickup_location_name}`);
                }
            } catch (whErr) {
                console.error(`❌ Failed to process pickup for ${wh.pickup_location_name}:`, whErr.message);
            }
        }
    } catch (err) {
        console.error("❌ Pickup Job Failed:", err.message);
    }
});
