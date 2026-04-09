const db = require("../config/db");
const { fetchWaybills } = require("../modules/logistics/delhivery.service");

async function storeWaybills(waybills) {
    if (!waybills) return;

    // Normalizing to an array
    let wbList = typeof waybills === "string" ? waybills.split(",") : Array.from(waybills);

    for (const wb of wbList) {
        if (!wb) continue;
        try {
            await db.query(
                "INSERT IGNORE INTO delhivery_waybills (waybill) VALUES (?)",
                [wb.trim()]
            );
        } catch (e) {
            console.error("Failed to store waybill:", wb, e.message);
        }
    }
}

async function getUnusedWaybill(conn = null) {
    const dbConn = conn || db;
    const [rows] = await dbConn.query(
        "SELECT waybill FROM delhivery_waybills WHERE is_used = FALSE LIMIT 1"
    );

    if (!rows.length) {
        console.log("AWB empty → fetching new...");

        const data = await fetchWaybills(20);

        if (data && data.waybill) {
            await storeWaybills(data.waybill);
        } else {
            await storeWaybills(data);
        }

        return getUnusedWaybill(conn);
    }

    const waybill = rows[0].waybill;

    await dbConn.query(
        "UPDATE delhivery_waybills SET is_used = TRUE WHERE waybill = ?",
        [waybill]
    );

    return waybill;
}

module.exports = { getUnusedWaybill };