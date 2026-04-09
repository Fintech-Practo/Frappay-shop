const pool = require("../../config/db");

async function getInventoryDetails(productId) {
  if (!productId || isNaN(productId)) {
    throw new Error("Valid product ID is required");
  }

  // Get product core details
  const [productRows] = await pool.query(
    `SELECT p.*, 
            leaf.name as subcategory_name, 
            parent.name as category_name,
            pt.label as product_type_label
     FROM products p
     LEFT JOIN categories_v2 leaf ON p.category_leaf_id = leaf.id
     LEFT JOIN categories_v2 parent ON leaf.parent_id = parent.id
     LEFT JOIN product_types pt ON p.product_type_code = pt.code
     WHERE p.id = ?`,
    [productId]
  );

  if (productRows.length === 0) {
    throw new Error("Product not found");
  }

  const product = productRows[0];

  // Get seller info
  const [sellerRows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.created_at as seller_since,
            si.business_name, si.business_location, si.approval_status
     FROM users u
     LEFT JOIN seller_info si ON u.id = si.user_id
     WHERE u.id = ? AND u.role = 'SELLER'`,
    [product.seller_id]
  );

  const seller = sellerRows[0] || null;

  // Get sales summary from order_items (using snapshot values)
  const [salesRows] = await pool.query(
    `SELECT 
        COUNT(DISTINCT oi.order_id) as total_orders,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.price * oi.quantity) as total_revenue,
        SUM(oi.commission_amount) as admin_commission_total,
        SUM(oi.seller_payout) as seller_payout_total,
        AVG(oi.price) as avg_selling_price,
        MIN(oi.created_at) as first_sale_date,
        MAX(oi.created_at) as last_sale_date
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = ? AND o.status != 'CANCELLED'`,
    [productId]
  );

  const salesData = salesRows[0];
  const sales_summary = {
    total_orders: salesData.total_orders || 0,
    total_quantity_sold: salesData.total_quantity_sold || 0,
    total_revenue: parseFloat(salesData.total_revenue || 0),
    admin_commission_total: parseFloat(salesData.admin_commission_total || 0),
    seller_payout_total: parseFloat(salesData.seller_payout_total || 0),
    avg_selling_price: parseFloat(salesData.avg_selling_price || 0),
    first_sale_date: salesData.first_sale_date,
    last_sale_date: salesData.last_sale_date
  };

  // Get last 5 buyers with order info
  const [buyersRows] = await pool.query(
    `SELECT DISTINCT
        u.id as buyer_id,
        u.name as buyer_name,
        o.id as order_id,
        o.created_at as order_date,
        oi.quantity,
        oi.price as unit_price,
        (oi.quantity * oi.price) as order_value
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN users u ON o.user_id = u.id
     WHERE oi.product_id = ? AND o.status != 'CANCELLED'
     ORDER BY o.created_at DESC
     LIMIT 5`,
    [productId]
  );

  const recent_buyers = buyersRows.map(buyer => ({
    buyer_id: buyer.buyer_id,
    buyer_name: buyer.buyer_name,
    order_id: buyer.order_id,
    order_date: buyer.order_date,
    quantity: buyer.quantity,
    unit_price: parseFloat(buyer.unit_price),
    order_value: parseFloat(buyer.order_value)
  }));

  // Calculate risk flags
  const risk_flags = {
    zero_sales: sales_summary.total_orders === 0,
    low_stock: product.stock <= 10,
    overpriced: product.selling_price > (product.mrp * 0.95),
    underperforming: false,
    old_inventory: false,
    seller_unapproved: seller?.approval_status !== 'APPROVED'
  };

  // Additional risk calculations
  if (sales_summary.total_orders > 0) {
    // Mark as underperforming if less than 5 orders in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentSalesRows] = await pool.query(
      `SELECT COUNT(DISTINCT oi.order_id) as recent_orders
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.product_id = ? AND o.status != 'CANCELLED' 
       AND o.created_at >= ?`,
      [productId, thirtyDaysAgo]
    );

    risk_flags.underperforming = recentSalesRows[0].recent_orders < 5;
  }

  // Check if inventory is old (created more than 90 days ago with no sales)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  risk_flags.old_inventory = risk_flags.zero_sales && new Date(product.created_at) < ninetyDaysAgo;

  // Calculate additional metrics
  const days_since_first_sale = sales_summary.first_sale_date
    ? Math.floor((new Date() - new Date(sales_summary.first_sale_date)) / (1000 * 60 * 60 * 24))
    : 0;

  const days_since_last_sale = sales_summary.last_sale_date
    ? Math.floor((new Date() - new Date(sales_summary.last_sale_date)) / (1000 * 60 * 60 * 24))
    : 0;

  // Get gallery images
  const [imageRows] = await pool.query(
    'SELECT image_url, is_primary FROM product_images WHERE product_id = ?',
    [productId]
  );

  // Get metadata
  const [metaRows] = await pool.query(`
    SELECT md.slug, md.name as label, pm.value_text, mv.value as enum_value, md.data_type
    FROM product_metadata_map pm
    JOIN metadata_definitions md ON md.id = pm.metadata_id
    LEFT JOIN metadata_values mv ON mv.id = pm.metadata_value_id
    WHERE pm.product_id = ?
  `, [productId]);

  const metadata = {};
  metaRows.forEach(row => {
    const value = row.data_type === 'ENUM' ? row.enum_value : row.value_text;
    if (metadata[row.slug]) {
      if (Array.isArray(metadata[row.slug])) {
        metadata[row.slug].push(value);
      } else {
        metadata[row.slug] = [metadata[row.slug], value];
      }
    } else {
      metadata[row.slug] = value;
    }
  });

  return {
    product: {
      id: product.id,
      title: product.title,
      sku: product.sku,
      description: product.description,
      mrp: parseFloat(product.mrp),
      selling_price: parseFloat(product.selling_price),
      discount_percent: parseFloat(product.discount_percent || 0),
      stock: product.stock,
      is_unlimited_stock: !!product.is_unlimited_stock,
      commission_percentage: parseFloat(product.commission_percentage || 0),
      weight: parseFloat(product.weight || 0),
      gst_rate: parseFloat(product.gst_rate || 0),
      is_gst_inclusive: !!product.is_gst_inclusive,
      format: product.format,
      image_url: product.image_url,
      images: imageRows.map(img => img.image_url),
      category_name: product.category_name,
      subcategory_name: product.subcategory_name,
      product_type_label: product.product_type_label,
      attributes: typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes,
      metadata: metadata,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      tags: product.tags,
      is_active: product.is_active,
      rating: parseFloat(product.rating || 0),
      review_count: product.review_count || 0,
      created_at: product.created_at,
      updated_at: product.updated_at
    },
    seller: seller ? {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      business_name: seller.business_name,
      business_location: seller.business_location,
      approval_status: seller.approval_status,
      seller_since: seller.seller_since
    } : null,
    sales_summary: {
      ...sales_summary,
      profit_margin: product.selling_price > 0
        ? ((product.selling_price - (product.selling_price * 0.1)) / product.selling_price * 100).toFixed(1)
        : 0, // Approximate after commission
      days_since_first_sale,
      days_since_last_sale,
      avg_orders_per_month: days_since_first_sale > 0
        ? (sales_summary.total_orders / (days_since_first_sale / 30)).toFixed(1)
        : 0
    },
    recent_buyers,
    risk_flags
  };
}

module.exports = {
  getInventoryDetails
};