const db = require("../config/db");

async function migrate() {
  try {
    console.log("🚀 Starting migration: Adding columns to sms_logs if missing...");

    const [columns] = await db.query("SHOW COLUMNS FROM sms_logs");
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes("order_id")) {
      await db.query("ALTER TABLE sms_logs ADD COLUMN order_id INT DEFAULT NULL AFTER response");
      console.log("✅ Added order_id column to sms_logs");
    } else {
      console.log("ℹ️ order_id column already exists in sms_logs");
    }

    if (!columnNames.includes("event_type")) {
      await db.query("ALTER TABLE sms_logs ADD COLUMN event_type VARCHAR(50) DEFAULT NULL AFTER order_id");
      console.log("✅ Added event_type column to sms_logs");
    } else {
      console.log("ℹ️ event_type column already exists in sms_logs");
    }

    console.log("✨ Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
