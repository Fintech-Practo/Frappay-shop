const pool = require("../../config/db");

/**
 * Fetches abandoned cart items for admin monitoring.
 *
 * An "abandoned" cart item satisfies:
 *   - type = 'CART'
 *   - created_at <= NOW() - INTERVAL ? DAY  (default 30 days)
 *   - item still exists in cart_items (not removed)
 *
 * Single JOIN query avoids N+1. Uses parameterized inputs for
 * injection safety. Sorted oldest-first (longest in cart).
 *
 * @param {object} filters
 * @param {number} [filters.days=30]   - Minimum days in cart
 * @param {number} [filters.limit=20]  - Page size
 * @param {number} [filters.page=1]    - Page number (1-indexed)
 * @returns {Promise<{ items: Array, total: number, page: number, limit: number, total_pages: number }>}
 */
async function getAbandonedCartItems(filters = {}) {
  const days = Math.max(1, parseInt(filters.days, 10) || 30);
  const limit = Math.max(1, parseInt(filters.limit, 10) || 20);
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const offset = (page - 1) * limit;

  // ── COUNT query (no LIMIT/OFFSET, no ORDER BY for speed) ──────────────────
  const countSql = `
    SELECT COUNT(*) AS total
    FROM cart_items  ci
    JOIN carts       c  ON c.id  = ci.cart_id
    JOIN users       u  ON u.id  = c.user_id
    JOIN products    p  ON p.id  = ci.product_id
    WHERE ci.type        = 'CART'
      AND ci.created_at <= NOW() - INTERVAL ? DAY
  `;

  // ── DATA query ─────────────────────────────────────────────────────────────
  // TIMESTAMPDIFF is computed once per row, not per-sort step.
  // Uses ci.created_at index (recommended: see INDEX section in docs).
  const dataSql = `
    SELECT
      ci.id                                                      AS cart_item_id,
      TIMESTAMPDIFF(DAY, ci.created_at, NOW())                   AS days_in_cart,
      ci.created_at                                              AS date_added,
      ci.quantity,
      ci.purchase_format,

      u.id                                                       AS user_id,
      u.name                                                     AS user_name,
      u.email,
      u.phone,
      COALESCE(u.total_orders, 0)                                AS total_orders,
      COALESCE(u.rto_count,    0)                                AS rto_count,

      p.id                                                       AS product_id,
      p.title                                                    AS product_title,
      CAST(p.selling_price AS DECIMAL(10,2))                     AS selling_price,
      p.stock,
      p.product_type_code                                        AS product_type

    FROM cart_items  ci
    JOIN carts       c  ON c.id  = ci.cart_id
    JOIN users       u  ON u.id  = c.user_id
    JOIN products    p  ON p.id  = ci.product_id

    WHERE ci.type        = 'CART'
      AND ci.created_at <= NOW() - INTERVAL ? DAY

    ORDER BY ci.created_at ASC
    LIMIT ? OFFSET ?
  `;

  // Execute both queries in parallel for performance
  const [[countRows], [dataRows]] = await Promise.all([
    pool.query(countSql, [days]),
    pool.query(dataSql, [days, limit, offset]),
  ]);

  const total = countRows[0].total;
  const total_pages = Math.ceil(total / limit);

  return {
    items: dataRows,
    total,
    page,
    limit,
    total_pages,
  };
}

/**
 * Optional: abandonment risk scoring (ML-ready formula).
 *
 * Score components (all 0-100, weighted average):
 *   - Age weight     : min(days_in_cart / 90, 1) * 40      (40% weight)
 *   - Cart value     : min(selling_price / 2000, 1) * 30   (30% weight)
 *   - RTO risk       : min(rto_count / 5, 1) * 20          (20% weight)
 *   - Low engagement : (total_orders === 0) ? 10 : 0       (10% weight)
 *
 * Higher score = higher risk of permanent abandonment.
 * Scale: 0-100 → Low (<30) | Medium (30-60) | High (>60)
 *
 * @param {object} item - A row from getAbandonedCartItems().items
 * @returns {{ score: number, risk_level: string }}
 */
function computeAbandonmentScore(item) {
  const ageScore = Math.min(item.days_in_cart / 90, 1) * 40;
  const valueScore = Math.min(item.selling_price / 2000, 1) * 30;
  const rtoScore = Math.min(item.rto_count / 5, 1) * 20;
  const engagementScore = item.total_orders === 0 ? 10 : 0;

  const score = Math.round(ageScore + valueScore + rtoScore + engagementScore);

  let risk_level;
  if (score >= 60) risk_level = "HIGH";
  else if (score >= 30) risk_level = "MEDIUM";
  else risk_level = "LOW";

  return { score, risk_level };
}

module.exports = {
  getAbandonedCartItems,
  computeAbandonmentScore,
};
