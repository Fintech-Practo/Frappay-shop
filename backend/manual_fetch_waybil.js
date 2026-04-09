require("dotenv").config({ path: "./.env" });
const { fetchWaybills, storeWaybills } = require("./modules/logistics/delhivery.service");
const db = require("./config/db");

async function manualFetch() {
    try {
        console.log("🚀 Manually fetching 20 waybills from Delhivery...");
        const data = await fetchWaybills(20);
        
        console.log("Received data from Delhivery:", data);

        if (data && data.waybill) {
            await storeWaybills(data.waybill);
            console.log("✅ 20 Waybills stored successfully!");
        } else {
            // Check if format is non-standard or direct string
            await storeWaybills(data);
            console.log("✅ Waybills stored successfully (fallback format)!");
        }

        // Verify storage
        const [rows] = await db.query("SELECT COUNT(*) as count FROM delhivery_waybills WHERE is_used = FALSE");
        console.log(`📊 Current unused waybills in database: ${rows[0].count}`);

    } catch (err) {
        console.error("❌ Waybill manual fetch failed:", err.message);
    } finally {
        process.exit(0);
    }
}

manualFetch();