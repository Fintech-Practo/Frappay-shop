const cron = require("node-cron");
const { fetchWaybills, storeWaybills } = require("../modules/logistics/delhivery.service");

// Run every day at 2 AM
cron.schedule("0 2 * * *", async () => {
    console.log("Fetching Delhivery waybills...");

    try {
        const data = await fetchWaybills(50);

        if (data && data.waybill) {
            await storeWaybills(data.waybill);
            console.log("Waybills stored successfully");
        } else {
            // Check if format is non-standard or direct string
            await storeWaybills(data);
            console.log("Waybills stored successfully");
        }
    } catch (err) {
        console.error("Waybill fetch failed:", err.message);
    }
});