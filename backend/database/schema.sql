-- =====================================================
-- Frap Pay Shop - Complete Database Schema
-- Clean version with all columns in CREATE TABLE statements
-- No ALTER statements required
-- =====================================================

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE DEFAULT NULL,
  phone VARCHAR(20) UNIQUE DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  password_hash VARCHAR(255),
  role ENUM('USER', 'SELLER', 'ADMIN') DEFAULT 'USER',
  is_active BOOLEAN DEFAULT TRUE,
  is_welcome BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_phone_verified BOOLEAN DEFAULT FALSE,
  profile_image_url VARCHAR(500) DEFAULT NULL,
  address_id INT DEFAULT NULL,
  location VARCHAR(255) DEFAULT NULL,
  preferences JSON DEFAULT NULL,
  total_orders INT DEFAULT 0,
  rto_count INT DEFAULT 0,
  cod_allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_role (role)
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  otp VARCHAR(255) NOT NULL,
  purpose ENUM('REGISTRATION', 'EMAIL_VERIFICATION', 'PASSWORD_RESET', 'ADD_PASSWORD', 'CHANGE_PASSWORD') DEFAULT 'REGISTRATION',
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_identifier (identifier),
  INDEX idx_otp (otp)
);

CREATE TABLE IF NOT EXISTS oauth_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider ENUM('GOOGLE', 'META', 'FACEBOOK') NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_provider_user (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  label VARCHAR(50) DEFAULT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Product Catalog
CREATE TABLE IF NOT EXISTS product_types (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial seed for product types
INSERT IGNORE INTO product_types (code, label) VALUES 
('BOOK', 'Books'),
('NOTEBOOK', 'Notebooks'),
('STATIONERY', 'Stationery');

CREATE TABLE IF NOT EXISTS categories_v2 (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  parent_id INT DEFAULT NULL,
  product_type_code VARCHAR(50) DEFAULT NULL,
  level INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(500) DEFAULT NULL,
  is_leaf BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories_v2(id) ON DELETE SET NULL,
  FOREIGN KEY (product_type_code) REFERENCES product_types(code) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_parent (parent_id),
  INDEX idx_type_slug (product_type_code, slug),
  UNIQUE KEY unique_type_slug (product_type_code, slug)
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  product_type_code VARCHAR(50) NOT NULL,
  category_leaf_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  description TEXT,
  mrp DECIMAL(10, 2) DEFAULT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT NULL,
  commission_percentage DECIMAL(5, 2) NULL DEFAULT NULL,
  stock INT DEFAULT 0,
  is_unlimited_stock BOOLEAN DEFAULT FALSE,
  weight DECIMAL(10, 3) DEFAULT 0.5,
  format ENUM('PHYSICAL', 'EBOOK') DEFAULT 'PHYSICAL',
  ebook_url VARCHAR(500) DEFAULT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  additional_images JSON DEFAULT NULL,
  attributes JSON DEFAULT NULL,
  meta_title VARCHAR(255) DEFAULT NULL,
  meta_description TEXT DEFAULT NULL,
  tags VARCHAR(500) DEFAULT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 0,
  is_gst_inclusive BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3, 1) DEFAULT 0.0,
  review_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_type_code) REFERENCES product_types(code),
  FOREIGN KEY (category_leaf_id) REFERENCES categories_v2(id),
  INDEX idx_seller (seller_id),
  INDEX idx_type (product_type_code),
  INDEX idx_category (category_leaf_id),
  INDEX idx_image_url (image_url),
  INDEX idx_meta_title (meta_title),
  FULLTEXT INDEX idx_product_content_search (title, description, meta_title, meta_description)
);

CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id)
);

-- 3. Shopping Cart
CREATE TABLE IF NOT EXISTS carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_cart (user_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  type ENUM('CART', 'FAVORITE', 'WISHLIST') DEFAULT 'CART',
  purchase_format ENUM('PHYSICAL', 'EBOOK', 'DIGITAL') DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_cart_product (cart_id, product_id, type, purchase_format),
  INDEX idx_cart (cart_id),
  INDEX idx_product (product_id),
  INDEX idx_cart_items_abandoned (type, created_at)
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NULL,
  invoice_url VARCHAR(500) DEFAULT NULL,
  user_id INT NOT NULL,
  subtotal_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cod_charges DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  coupon_id INT DEFAULT NULL,
  coupon_discount DECIMAL(10, 2) DEFAULT 0,
  items_discount DECIMAL(10, 2) DEFAULT 0,
  coin_discount DECIMAL(10, 2) DEFAULT 0,
  total_payable_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status ENUM('PENDING', 'CONFIRMED', 'PAID', 'AWB_ASSIGNED', 'PACKED', 'LABEL_GENERATED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RTO_COMPLETED', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUND_SETTLED', 'REJECTED') DEFAULT 'PENDING',
  order_type ENUM('PHYSICAL', 'DIGITAL') NOT NULL DEFAULT 'PHYSICAL',
  payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  payment_method ENUM('ONLINE', 'COD') DEFAULT 'ONLINE',
  digital_access_granted BOOLEAN DEFAULT FALSE,
  first_download_at DATETIME NULL,
  admin_commission_total DECIMAL(10, 2) DEFAULT 0.00,
  admin_net_profit DECIMAL(10, 2) DEFAULT 0.00,
  seller_payout_total DECIMAL(10, 2) DEFAULT 0.00,
  shipping_margin DECIMAL(10, 2) DEFAULT 0.00,
  shipping_base_rate DECIMAL(10, 2) DEFAULT 0.00,
  gateway_fee DECIMAL(10, 2) DEFAULT 0.00,
  shipping_full_name VARCHAR(255),
  shipping_phone VARCHAR(20),
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100),
  warehouse_id INT,
  estimated_delivery_days VARCHAR(50) DEFAULT '3-5',
  awb_number VARCHAR(100) DEFAULT NULL,
  tracking_id VARCHAR(100) DEFAULT NULL,
  tracking_url VARCHAR(500) DEFAULT NULL,
  shipment_status VARCHAR(100) DEFAULT NULL,
  shipment_created BOOLEAN DEFAULT FALSE,
  cancellation_deadline TIMESTAMP NULL DEFAULT NULL,
  is_cod_confirmed BOOLEAN DEFAULT FALSE,
  is_rto BOOLEAN DEFAULT FALSE,
  packed_at DATETIME NULL DEFAULT NULL,
  shipped_at DATETIME NULL DEFAULT NULL,
  delivered_at DATETIME NULL DEFAULT NULL,
  return_status VARCHAR(50),
  refund_status VARCHAR(50),
  refund_id VARCHAR(100),
  pickup_requested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_order_type (order_type),
  INDEX idx_payment_status (payment_status)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_title VARCHAR(255) NOT NULL,
  seller_id INT DEFAULT NULL,
  product_type_code VARCHAR(50),
  format ENUM('PHYSICAL', 'EBOOK') DEFAULT 'PHYSICAL',
  commission_percentage DECIMAL(5,2) DEFAULT 0,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  seller_payout DECIMAL(10,2) DEFAULT 0,
  admin_net_profit DECIMAL(10,2) DEFAULT 0,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  reward_coins INT DEFAULT 0,
  reward_rule_id INT DEFAULT NULL,
  reward_commission_snapshot DECIMAL(5, 2) DEFAULT NULL,
  reward_unlock_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (product_type_code) REFERENCES product_types(code) ON DELETE SET NULL,
  INDEX idx_order (order_id),
  INDEX idx_product (product_id),
  INDEX idx_seller (seller_id)
);

CREATE TABLE IF NOT EXISTS cancellations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED') DEFAULT 'PENDING',
  reason TEXT,
  requested_by INT NOT NULL,
  processed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Consolidating returns table definition (moved to section 11 for logistics sync)
-- Removed legacy definition from here

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  session_data JSON NOT NULL,
  status ENUM('ACTIVE', 'PENDING', 'COMPLETED', 'EXPIRED') DEFAULT 'ACTIVE',
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Payment & Finance
CREATE TABLE IF NOT EXISTS ledger_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT DEFAULT NULL,
  user_id INT DEFAULT NULL,
  seller_id INT DEFAULT NULL,
  type ENUM ('order_payment','seller_payout','refund','commission') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  direction ENUM ('credit','debit') NOT NULL,
    status ENUM ('pending','processing','settled', 'failed') DEFAULT 'pending',

  reference_id VARCHAR(100) DEFAULT NULL COMMENT 'payout_id / refund_id / mihpayid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_order (order_id),
  INDEX idx_user (user_id),
  INDEX idx_seller (seller_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS payouts (
  id VARCHAR(100) PRIMARY KEY,
  seller_id INT NOT NULL,
  order_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255) DEFAULT NULL,
  due_date DATETIME DEFAULT NULL,
  settled_at DATETIME DEFAULT NULL,
  status ENUM ('pending','processing','settled', 'failed') DEFAULT 'pending',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_seller (seller_id),
  INDEX idx_order (order_id),
  INDEX idx_status (status)
);
CREATE TABLE IF NOT EXISTS payment_sessions (
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique payment session identifier (txid_...)',
  user_id INT NOT NULL,
  checkout_session_id VARCHAR(255) NOT NULL COMMENT 'Reference to checkout session',
  order_id INT DEFAULT NULL COMMENT 'Linked order ID after successful payment',
  amount DECIMAL(10, 2) NOT NULL,
  gateway VARCHAR(50) DEFAULT 'PAYU' COMMENT 'Payment gateway used (PAYU, RAZORPAY, etc.)',
  status ENUM('INITIATED', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'PENDING') DEFAULT 'INITIATED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_checkout_session (checkout_session_id),
  INDEX idx_order (order_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS payment_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_session_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL COMMENT 'Type of event (webhook, callback, etc.)',
  gateway_event_id VARCHAR(255) DEFAULT NULL COMMENT 'Unique event ID from gateway',
  raw_payload JSON DEFAULT NULL COMMENT 'Complete event payload from gateway',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_session_id) REFERENCES payment_sessions(id) ON DELETE CASCADE,
  INDEX idx_payment_session (payment_session_id),
  INDEX idx_event_type (event_type)
);

-- 5. Payment & Finance: Refunds (Return Lifecycle)
CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT DEFAULT NULL,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','approved','processing','failed','settled','retrying') DEFAULT 'pending',
  reason TEXT,
  retry_count INT DEFAULT 0,
  rto_completed_at DATETIME,
  expected_settlement DATE,
  refund_initiated_at DATETIME,
  refund_settled_at DATETIME,
  gateway_refund_id VARCHAR(100) DEFAULT NULL,
  payment_session_id VARCHAR(255) DEFAULT NULL,
  initiated_by INT DEFAULT NULL,
  admin_remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE KEY unique_return (return_id),
  INDEX idx_order (order_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_session_id VARCHAR(255) NOT NULL,
  order_id INT NOT NULL,
  gateway VARCHAR(50) DEFAULT 'PAYU',
  gateway_transaction_id VARCHAR(255) NOT NULL COMMENT 'PayU mihpayid',
  gateway_payment_id VARCHAR(255) DEFAULT NULL COMMENT 'Future proofing for other IDs',
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('SUCCESS', 'FAILED', 'REFUNDED') NOT NULL,
  raw_response JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_payment_session (payment_session_id),
  INDEX idx_gateway_txn (gateway_transaction_id)
);

-- 12. Metadata System (Product Attributes)
CREATE TABLE IF NOT EXISTS metadata_definitions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  data_type ENUM('STRING','NUMBER','ENUM','BOOLEAN') DEFAULT 'STRING',
  is_multi_select BOOLEAN DEFAULT FALSE,
  is_filterable BOOLEAN DEFAULT TRUE,
  is_searchable BOOLEAN DEFAULT TRUE,
  product_type_code VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS metadata_values (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  metadata_id BIGINT NOT NULL,
  value VARCHAR(255) NOT NULL,
  UNIQUE KEY unique_meta_value (metadata_id,value),
  FOREIGN KEY (metadata_id) REFERENCES metadata_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_metadata_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  metadata_id BIGINT NOT NULL,
  metadata_value_id BIGINT NULL,
  value_text VARCHAR(255) NULL,
  UNIQUE KEY uq_meta (product_id, metadata_id, metadata_value_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (metadata_id) REFERENCES metadata_definitions(id) ON DELETE CASCADE,
  FOREIGN KEY (metadata_value_id) REFERENCES metadata_values(id) ON DELETE SET NULL,
  INDEX idx_meta_product (product_id),
  INDEX idx_meta_filter (metadata_id, metadata_value_id),
  INDEX idx_meta_text (metadata_id, value_text)
) ENGINE=InnoDB;

-- 6. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  order_item_id INT DEFAULT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  moderated_by INT DEFAULT NULL,
  moderated_at TIMESTAMP NULL DEFAULT NULL,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_product_review (user_id, product_id),
  INDEX idx_product (product_id)
);

CREATE TABLE IF NOT EXISTS review_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  moderated_by INT DEFAULT NULL,
  moderated_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Seller Information
CREATE TABLE IF NOT EXISTS seller_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  business_name VARCHAR(255) DEFAULT NULL,
  business_location VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  pin VARCHAR(10) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  bank_account_number VARCHAR(50) DEFAULT NULL,
  bank_ifsc VARCHAR(20) DEFAULT NULL,
  bank_name VARCHAR(255) DEFAULT NULL,
  pan_number VARCHAR(20) DEFAULT NULL,
  aadhaar_number VARCHAR(20) DEFAULT NULL,
  -- KYC Fields
  gst_number VARCHAR(20) DEFAULT NULL,
  pan_url TEXT DEFAULT NULL,
  aadhaar_url TEXT DEFAULT NULL,
  is_books_only BOOLEAN DEFAULT FALSE,
  govt_id_type ENUM('aadhaar','pan') DEFAULT NULL,
  govt_id_number VARCHAR(20) DEFAULT NULL,
  govt_id_url TEXT DEFAULT NULL,
  kyc_status ENUM('pending','approved','rejected') DEFAULT 'pending',
  is_kyc_verified BOOLEAN DEFAULT FALSE,
  kyc_reviewed_by INT DEFAULT NULL,
  kyc_reviewed_at TIMESTAMP NULL DEFAULT NULL,
  kyc_rejection_reason TEXT DEFAULT NULL,
   -- Logistics Sync
  pickup_location_name VARCHAR(255) DEFAULT 'Primary',
  pickup_pincode VARCHAR(10) DEFAULT NULL,
  -- Onboarding approval
  requested_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  approved_by INT DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_seller_info (user_id)
);

CREATE TABLE IF NOT EXISTS seller_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  total_products_added INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_items_sold INT DEFAULT 0,
  gross_revenue DECIMAL(12, 2) DEFAULT 0.00,
  total_cost DECIMAL(12, 2) DEFAULT 0.00,
  net_profit DECIMAL(12, 2) DEFAULT 0.00,
  cancelled_orders INT DEFAULT 0,
  returned_items INT DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0.00,
  top_selling_product_id INT NULL,
  low_stock_threshold INT DEFAULT 10,
  pending_shipments INT DEFAULT 0,
  admin_commission_percentage DECIMAL(5, 2) DEFAULT NULL,
  total_admin_commission DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (top_selling_product_id) REFERENCES products(id) ON DELETE SET NULL,
  UNIQUE KEY unique_seller_analytics (seller_id)
);

-- 8. Commission Management
CREATE TABLE IF NOT EXISTS commission_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL DEFAULT 'GLOBAL', 
  percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO commission_settings (type, percentage) VALUES ('GLOBAL', 10.00);

CREATE TABLE IF NOT EXISTS seller_commission_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  requested_percentage DECIMAL(5,2) NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  admin_remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seller_profile_update_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  data_json JSON NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  admin_remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_revenue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  order_id INT NOT NULL,
  order_item_id INT NOT NULL,
  commission_amount DECIMAL(10, 2) NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

-- 9. Support System
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  assigned_to INT DEFAULT NULL,
  resolution TEXT DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(100) NULL,
  session_id VARCHAR(100) NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(50),
  performed_by INT,
  performed_role VARCHAR(20),
  severity ENUM('INFO','WARNING','CRITICAL') DEFAULT 'INFO',
  ip_address VARCHAR(45),
  user_agent TEXT,
  old_values JSON NULL,
  new_values JSON NULL,
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_action (action),
  INDEX idx_module (module),
  INDEX idx_performed_by (performed_by),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'ORDER, SYSTEM, ALERT',
  title VARCHAR(255) DEFAULT NULL,
  message TEXT NOT NULL,
  metadata JSON DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_entity_type VARCHAR(50) DEFAULT NULL,
  related_entity_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, is_read),
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(15),
  template_id VARCHAR(50),
  status ENUM('PENDING','SENT','FAILED'),
  response TEXT,
  order_id INT DEFAULT NULL,
  event_type VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: To run this event, the MySQL server must have the event_scheduler enabled (SET GLOBAL event_scheduler = ON;)
CREATE EVENT IF NOT EXISTS clean_old_notifications
ON SCHEDULE EVERY 1 DAY
DO
  DELETE FROM notifications WHERE created_at < NOW() - INTERVAL 30 DAY;

-- 10. Site Settings & Analytics
CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'text',
  group_name VARCHAR(50) DEFAULT 'general',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_daily_stats (
  date DATE PRIMARY KEY,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  active_users INT DEFAULT 0,
  new_users INT DEFAULT 0,
  gross_profit DECIMAL(12, 2) DEFAULT 0,
  cart_abandonment_rate DECIMAL(5, 2) DEFAULT 0,
  average_support_time INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  preferences JSON DEFAULT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_completed (is_completed)
);

-- 11. Logistics & Shipment Tracking
CREATE TABLE IF NOT EXISTS logistics_shipments (
  id VARCHAR(36) PRIMARY KEY,
  order_id INT NOT NULL,
  seller_id INT NULL,
  shipment_id VARCHAR(255),
  awb_code VARCHAR(255),
  courier_name VARCHAR(255),
  courier_company_id INT NULL,
  admin_status ENUM('CREATED', 'PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPMENT_CREATED', 'AWB_ASSIGNED', 'PICKED_UP', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO_INITIATED', 'RTO_DELIVERED', 'CANCELLED', 'RETURNED') DEFAULT 'PROCESSING',
  shipment_status VARCHAR(50) DEFAULT NULL,
  tracking_url VARCHAR(500),
  estimated_delivery_date DATE NULL,
  last_location VARCHAR(255) NULL,
  pickup_date TIMESTAMP NULL,
  delivered_date TIMESTAMP NULL,
  packed_at TIMESTAMP NULL,
  packed_by INT NULL,
  cod_amount DECIMAL(10,2) DEFAULT 0,
  actual_shipping_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_delivery_days VARCHAR(50) DEFAULT '3-5',
  label_s3_url VARCHAR(500),
  label_status ENUM('pending', 'processing', 'ready', 'failed') DEFAULT 'pending',
  pickup_status ENUM('pending', 'requested', 'failed', 'wallet_failed') DEFAULT 'pending',
  pickup_token VARCHAR(255) NULL,
  raw_payload JSON,
  label_url TEXT,
  label_generated_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_order (order_id),
  INDEX idx_seller (seller_id),
  INDEX idx_status (admin_status),
  INDEX idx_awb (awb_code)
);

CREATE TABLE IF NOT EXISTS shipment_tracking_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shipment_id VARCHAR(36) NOT NULL,
  status VARCHAR(100) NOT NULL,
  location VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  activity_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE,
  INDEX idx_shipment (shipment_id),
  INDEX idx_activity_date (activity_date)
);

CREATE TABLE IF NOT EXISTS status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  admin_status VARCHAR(50),
  info VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id)
);

CREATE TABLE IF NOT EXISTS returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  admin_id INT DEFAULT NULL,
  reason TEXT NOT NULL,
  refund_type ENUM('refund', 'replacement') DEFAULT 'refund',
  status ENUM('RETURN_REQUESTED', 'RETURN_APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RTO_COMPLETED', 'pending', 'processing', 'settled', 'failed', 'REJECTED') DEFAULT 'RETURN_REQUESTED',
  images JSON DEFAULT NULL,
  awb_number VARCHAR(255) DEFAULT NULL,
  reverse_pickup_id VARCHAR(255) DEFAULT NULL,
  tracking_url VARCHAR(500) DEFAULT NULL,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS user_bank_details (
  user_id INT PRIMARY KEY,
  account_number VARCHAR(255) NOT NULL COMMENT 'Encrypted AES-256',
  ifsc_code VARCHAR(20) NOT NULL,
  account_holder_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pincode_risk (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  pincode VARCHAR(10) UNIQUE,
  total_orders INT DEFAULT 0,
  rto_orders INT DEFAULT 0,
  rto_rate DECIMAL(5,2) DEFAULT 0,
  INDEX idx_pincode (pincode)
);

CREATE TABLE IF NOT EXISTS shipping_margin_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  min_order_amount DECIMAL(10,2) NOT NULL,
  max_order_amount DECIMAL(10,2) NOT NULL,
  margin_amount DECIMAL(10,2) NOT NULL,
  margin_type ENUM('flat', 'percentage') DEFAULT 'flat',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pickup_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_name VARCHAR(255),
  pickup_date DATE,
  pickup_time TIME,
  expected_package_count INT,
  status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  warehouse_name VARCHAR(255) NOT NULL UNIQUE,
  pickup_location_name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  country VARCHAR(100) DEFAULT 'India',
  phone VARCHAR(20),
  email VARCHAR(255),
  return_address TEXT,
  return_city VARCHAR(100),
  return_state VARCHAR(100),
  return_pincode VARCHAR(10),
  warehouse_created BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,

  discount_type ENUM('percentage','flat') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,

  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2) DEFAULT NULL,

  usage_limit INT DEFAULT 0,
  used_count INT DEFAULT 0,

  per_user_limit INT DEFAULT 1,

  start_date DATETIME NOT NULL,
  expiry_date DATETIME DEFAULT NULL,

  created_by_type ENUM('admin','seller') NOT NULL,
  created_by_id INT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  is_welcome BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupon_usages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_id INT NOT NULL,
  user_id INT NOT NULL,
  order_id INT NOT NULL,
  discount_amount DECIMAL(10,2),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE user_wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  coin_balance INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  total_redeemed INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,

  user_id INT NOT NULL,
  order_id INT NULL,

  coins INT NOT NULL,

  type ENUM('earn','redeem','refund','adjustment') NOT NULL,
  status ENUM('locked', 'unlocked', 'completed', 'cancelled') DEFAULT 'completed',

  description VARCHAR(255),
  unlock_at DATETIME NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reward_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  min_commission_percent DECIMAL(5, 2) DEFAULT 15,
  coins_per_100 INT DEFAULT 5,
  coin_value DECIMAL(10, 4) DEFAULT 0.05,
  max_coins_per_order_percent INT DEFAULT 20,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO reward_rules (min_commission_percent, coins_per_100, coin_value) VALUES (15, 5, 0.05);

CREATE TABLE IF NOT EXISTS reward_coin_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  min_commission DECIMAL(5, 2) NOT NULL,
  max_commission DECIMAL(5, 2) NOT NULL,
  coins_per_100 INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO reward_coin_rules (min_commission, max_commission, coins_per_100) VALUES 
(10, 14, 2),
(15, 19, 5),
(20, 24, 8),
(25, 100, 10);

CREATE TABLE coupon_products (
    coupon_id INT NOT NULL,
    product_id INT NOT NULL,
    PRIMARY KEY (coupon_id, product_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS delhivery_waybills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    waybill VARCHAR(50) NOT NULL UNIQUE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    order_id INT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_waybill_available (is_used, id),
    INDEX idx_order_id (order_id)
);

CREATE TABLE IF NOT EXISTS order_status_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);




ALTER TABLE logistics_shipments
ADD UNIQUE KEY unique_order_seller (order_id, seller_id);
