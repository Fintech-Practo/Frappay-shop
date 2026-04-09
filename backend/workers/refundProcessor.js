const cron = require("node-cron");
const pool = require("../config/db");
const logger = require("../utils/logger");

/**
 * 🔧 STEP 6: Add Refund Processor (CRON)
 * Runs every day at midnight to process pending refunds.
 * Flow: PENDING -> PROCESSING -> SETTLED (after 15 days)
 */
function startRefundProcessor() {
  // schedule(minute hour day month dayOfWeek)
  cron.schedule("0 0 * * *", async () => {
    logger.info("Running scheduled refund processor...");
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Fetch refunds that are not yet settled
      const [refunds] = await connection.query(
        `SELECT * FROM refunds WHERE status != 'SETTLED'`
      );

      const now = new Date();

      for (let refund of refunds) {
        const rtoCompletedAt = new Date(refund.rto_completed_at);
        const diffDays = (now - rtoCompletedAt) / (1000 * 60 * 60 * 24);

        if (diffDays >= 15 && refund.status !== "SETTLED") {
          // STEP: Mark as SETTLED after 15 days of RTO completion
          await connection.query(
            `UPDATE refunds SET status = 'SETTLED', refund_settled_at = NOW() WHERE id = ?`,
            [refund.id]
          );
          
          await connection.query(
            `UPDATE returns SET status = 'REFUND_SETTLED' WHERE id = (SELECT return_id FROM refunds WHERE id = ?)`,
            [refund.id]
          );

          logger.info(`Refund ${refund.id} marked as SETTLED after 15 days.`);
        } else if (refund.status === "PENDING") {
          // STEP: Move from PENDING to PROCESSING
          await connection.query(
            `UPDATE refunds SET status = 'PROCESSING', refund_initiated_at = NOW() WHERE id = ?`,
            [refund.id]
          );
          
          await connection.query(
            `UPDATE returns SET status = 'REFUND_PROCESSING' WHERE id = (SELECT return_id FROM refunds WHERE id = ?)`,
            [refund.id]
          );

          logger.info(`Refund ${refund.id} moved to PROCESSING.`);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      logger.error("Refund processor cron failed", { error: error.message });
    } finally {
      connection.release();
    }
  });

  logger.info("Refund processor cron job scheduled (0 0 * * *)");
}

module.exports = { startRefundProcessor };
