const Order = require("./order.model");
const orderService = require("./order.service");
 const couponService = require("../coupons/coupon.service");
const { createOrderSchema, updateOrderStatusSchema, getOrdersSchema } = require("./order.schema");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const { sendOrderPlacedSMS, sendOrderShippedSMS } = require("../../services/notificationService");
const { auth, allowRole } = require("../../middlewares/auth.middleware"); // add this



// CREATE ORDER
async function createOrder(req, res) {
  try {
    const { error } = createOrderSchema.validate(req.body);

    if (error) return response.error(res, error.message, 400);

    // Hardening: Block online orders from being created directly
    if (req.body.payment_method && req.body.payment_method !== 'cod' && req.body.payment_method !== 'COD') {
      return response.error(res, "Online orders must be processed through the payment gateway", 403);
    }

    // CREATE ORDER FOR CURRENT USER
    const order = await orderService.createOrder(req.user.userId, req.body);
    // 🔥 RECORD COUPON USAGE
if (req.body.couponId) {
  await couponService.recordUsage(
    req.body.couponId,
    req.user.userId,
    order.id
  );
}

    return response.success(res, order, "Order created successfully");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// -------------------------------------------------------
// STEP 4: POST /orders/cod
// COD orders bypass the payment gateway entirely.
// Flow: checkout session → createOrder (payment_method='COD') → shipment
// -------------------------------------------------------
async function createCodOrder(req, res) {
  try {
    const { session_id, shipping_address, shipping_address_id, address_id } = req.body;

    if (!session_id) {
      return response.error(res, "session_id is required for COD orders", 400);
    }

    const order = await orderService.createOrder(req.user.userId, {
      session_id,
      shipping_address,
      shipping_address_id,
      address_id,
      payment_method: 'COD'
    });
    if (req.body.couponId) {
  await couponService.recordUsage(
    req.body.couponId,
    req.user.userId,
    order.id
  );
}

    // Fire-and-forget: Send Order Placed SMS
    sendOrderPlacedSMS(req.user.userId, order.id, order.total_payable_amount).catch(() => {});

    return response.success(res, order, "COD order created successfully");
  } catch (err) {
    logger.error("COD order creation failed", { userId: req.user?.userId, error: err.message });
    return response.error(res, err.message, 400);
  }
}



// GET LOGGED IN USER ORDERS
async function getMyOrders(req, res) {
  try {
    const { error, value } = getOrdersSchema.validate(req.query, { convert: true, abortEarly: false });

    if (error) {
      const errorMessage = error.details.map(d => d.message).join(", ");
      return response.error(res, errorMessage, 400);
    }

    // FETCH USER ORDERS WITH FILTERS
    const orders = await orderService.getMyOrders(req.user.userId, value || {});

    return response.success(res, orders, "Orders fetched successfully");

  } catch (err) {
    logger.error("Get orders failed", {
      userId: req.user.userId,
      error: err.message,
      stack: err.stack
    });
    return response.error(res, err.message || "Failed to fetch orders", 500);
  }
}

// GET ORDER BY ID
async function getOrderById(req, res) {
  try {
    // ROLE + OWNERSHIP CHECK INSIDE SERVICE
    const order = await orderService.getOrderById(
      req.params.id,
      req.user.userId,
      req.user.role
    );
    return response.success(res, order, "Order fetched successfully");

  } catch (err) {
    const statusCode = err.message === "Order not found" ? 404 : 403;
    return response.error(res, err.message, statusCode);
  }
}

// ADMIN : GET ALL ORDERS
async function getAllOrders(req, res) {
  try {
    const { error } = getOrdersSchema.validate(req.query);

    if (error) return response.error(res, error.message, 400);


    // FETCH ALL ORDERS
    const orders = await orderService.getAllOrders(req.query, req.user.role);

    return response.success(res, orders, "All orders fetched successfully");

  } catch (err) {
    if (err.message.includes("Access denied")) {
      return response.error(res, err.message, 403);
    }
    return response.error(res, err.message, 500);
  }
}

// ADMIN / SELLER : UPDATE STATUS
async function updateOrderStatus(req, res) {
  try {
    const { error } = updateOrderStatusSchema.validate(req.body);
    if (error) return response.error(res, error.message, 400);

    // Pass role AND userId to the service for validation
    // This allows the service to check if a SELLER actually owns the items they are updating
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
      req.user.role,   // "SELLER" or "ADMIN"
      req.user.userId  // Required for seller ownership verification
    );

    return response.success(res, order, "Order status updated successfully");
  } catch (err) {
    // 403 Forbidden is appropriate if the seller doesn't own the order
    return response.error(res, err.message, 403);
  }
}


// CANCEL ORDER
async function cancelOrder(req, res) {
  try {
    // CANCEL WITH ROLE CHECK
    const order = await orderService.cancelOrder(
      req.params.id,
      req.user.userId,
      req.user.role
    );
    return response.success(res, order, "Order cancelled successfully");

  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

// ADMIN : ORDER STATS
async function getOrderStats(req, res) {
  try {
    // DASHBOARD DATA
    const stats = await orderService.getOrderStats(req.user.role);

    return response.success(res, stats, "Order statistics fetched successfully");

  } catch (err) {
    if (err.message.includes("Access denied")) {
      return response.error(res, err.message, 403);
    }
    return response.error(res, err.message, 500);
  }
}


async function getMyEbooks(req, res) {
  try {
    const ebooks = await orderService.getMyEbooks(req.user.userId);
    return response.success(res, ebooks, "E-books fetched successfully");
  } catch (err) {
    logger.error("Get ebooks failed", {
      userId: req.user.userId,
      error: err.message
    });
    return response.error(res, err.message || "Failed to fetch e-books", 500);
  }
}

async function downloadProduct(req, res) {
  try {
    // -------------------------------------------------
    // 🔐 AUTH FALLBACK (DO NOT REMOVE)
    // -------------------------------------------------
    if (!req.user) {
      const token =
        req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.split(" ")[1]
          : null;

      if (!token) {
        return response.error(res, "Unauthorized", 401);
      }

      try {
        const decoded = jwt.verify(token, env.jwt.secret);
        req.user = {
          userId: decoded.userId,
          role: decoded.role
        };
      } catch (err) {
        return response.error(res, "Invalid or expired token", 401);
      }
    }

    // -------------------------------------------------
    // 🔽 ORIGINAL LOGIC (UNCHANGED)
    // -------------------------------------------------
    const { id: orderId, productId } = req.params;

    const order = await orderService.getOrderById(
      orderId,
      req.user.userId,
      req.user.role
    );

    // Check if product exists in order
    const item = order.items.find(i => i.product_id == productId);
    if (!item) {
      return response.error(res, "Product not found in this order", 403);
    }

    // Validate order status
    if (order.status !== "CONFIRMED" && order.payment_status !== "PAID") {
      return response.error(res, "Order must be confirmed before download", 403);
    }

    // Validate item format
    if (item.format !== "EBOOK") {
      return response.error(
        res,
        "This product is not available for digital download",
        403
      );
    }

    // Fetch Product to get URL
    const productModel = require("../product/product.model");
    const product = await productModel.findById(productId);

    if (!product || !product.ebook_url) {
      return response.error(res, "Product PDF not available", 404);
    }

    // -------------------------------------------------
    // 📦 SERVE FILE (REMOTE OR LOCAL)
    // -------------------------------------------------
    if (product.ebook_url.startsWith("http")) {
      // Remote URL (Cloudinary, S3, etc)
      return res.redirect(product.ebook_url);
    } else {
      // Local file path
      const filePath = path.join(__dirname, "../../", product.ebook_url);

      if (!fs.existsSync(filePath)) {
        return response.error(res, "File not found on server", 404);
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${product.title}.pdf"`
      );
      res.setHeader("Content-Type", "application/pdf");
      return res.download(filePath);
    }

  } catch (err) {
    console.error("Download Product Error:", err);
    return response.error(res, err.message || "Download failed", 500);
  }
}


const productModel = require("../product/product.model");

async function streamEbook(req, res) {
  try {
    const { id: orderId, productId } = req.params;
    const order = await orderService.getOrderById(orderId, req.user.userId, req.user.role);

    // Check if product exists in order
    const item = order.items.find(i => i.product_id == productId);
    if (!item) {
      return response.error(res, "Product not found in this order", 403);
    }

    // Validate order status
    if (order.status !== 'CONFIRMED' && order.payment_status !== 'PAID') {
      return response.error(res, "Order must be confirmed before reading", 403);
    }

    // Validate item format
    const itemFormat = item.format;
    if (itemFormat !== 'EBOOK') {
      return response.error(res, "This product is not available for digital reading", 403);
    }

    // Fetch Product to get URL
    const product = await productModel.findById(productId);

    if (!product || !product.ebook_url) {
      return response.error(res, "Product PDF not available", 404);
    }

    if (product.ebook_url.startsWith('http')) {
      // SECURITY: SSRF Protection - Validate remote host against allowlist
      try {
        const ebookUrl = new URL(product.ebook_url);
        const allowedHosts = [
          'cloudinary.com',
          'res.cloudinary.com',
          'aws.amazon.com',
          's3.amazonaws.com',
          'frappay-shop-assets.s3.amazonaws.com',
          'amazonaws.com',
          'frappay-shop-assets.s3.ap-south-2.amazonaws.com'
        ];

        const isAllowed = allowedHosts.some(host => ebookUrl.hostname.endsWith(host));

        if (!isAllowed) {
          logger.warn(`Blocked SSRF attempt to unauthorized host: ${ebookUrl.hostname}`);
          return response.error(res, "Unauthorized ebook source", 403);
        }

        const responseStream = await axios({
          method: 'get',
          url: product.ebook_url,
          responseType: 'stream',
          timeout: 10000 // SECURITY: Prevent slow-reading DoS
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline'); // Force inline display
        responseStream.data.pipe(res);
      } catch (axiosErr) {
        console.error("Axios Stream Error:", axiosErr.message);
        // Extract status if available
        const status = axiosErr.response?.status || 500;
        const msg = axiosErr.response?.statusText || "Failed to fetch remote PDF";
        return response.error(res, `Remote Stream Failed: ${msg}`, status);
      }
    } else {
      // Local file path
      const filePath = path.join(__dirname, '../../', product.ebook_url);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline'); // Force inline display
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      } else {
        return response.error(res, "File not found on server", 404);
      }
    }

  } catch (err) {
    console.error("Stream Ebook Error:", err);
    // Don't use response.error here if headers are already sent
    if (!res.headersSent) {
      return response.error(res, "Stream Error: " + err.message, 500);
    }
    res.end();
  }
}

async function scanBarcode(req, res) {
  try {
    const { code } = req.params;
    console.log("Scanner Code:", code); // 🔥 debug

    // Decode Base64
    const decoded = Buffer.from(code, "base64").toString("utf-8");
    const parts = decoded.split("|"); // INV|orderId|invoiceNo|txnId|type

    if (parts.length < 3 || parts[0] !== "INV") {
      return response.error(res, "Invalid barcode format", 400);
    }

    const [prefix, orderId, invoiceNo, txnId, type] = parts;

    // Fetch order
    const order = await orderService.getOrderById(
      orderId,
      req.user.userId,
      req.user.role
    );

    // Validate invoice
    if (!order.invoice_number || order.invoice_number !== invoiceNo) {
      return response.error(res, "Invoice mismatch", 400);
    }

    const data = {
      orderId: order.id,
      invoiceNumber: invoiceNo,
      transactionId: txnId || null,
      type,
      invoiceUrl: `/orders/${order.id}/invoice`,
      isDigital: type === "DIGITAL"
    };

    if (type === "DIGITAL") {
      const digitalItem = order.items.find(item => item.format === "EBOOK");
      if (digitalItem) {
        data.downloadUrl = `/orders/${orderId}/download/${digitalItem.product_id}`;
      }
    }

    return response.success(res, data, "Scan successful");
  } catch (err) {
    console.error("Scan Barcode Error:", err);
    return response.error(res, err.message || "Scan failed", 400);
  }
}

async function getLabel(req, res) {
  try {
    const { id: orderId } = req.params;
    const pool = require("../../config/db");

    const [rows] = await pool.query(
        "SELECT label_s3_url FROM logistics_shipments WHERE order_id = ?",
        [orderId]
    );

    if (!rows.length || !rows[0].label_s3_url) {
        return res.status(404).json({ message: "Label not ready" });
    }

    return res.json({
        success: true,
        label_url: rows[0].label_s3_url
    });
  } catch (err) {
    logger.error("Get label failed", { orderId: req.params.id, error: err.message });
    return res.status(500).json({ message: "Failed to fetch label" });
  }
}

module.exports = {
  createOrder,
  createCodOrder,
  getMyOrders,
  getMyEbooks,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  downloadProduct,
  streamEbook,
   scanBarcode, 
  getInvoice,
  requestReturn,
  getReturnRequests,
  updateReturnStatusForReturn,
  confirmOrder,
  shipOrder,
  scanBarcode,
  getLabel,
};

async function requestReturn(req, res) {
  try {
    const { id } = req.params;
    const { reason, bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id } = req.body;

    if (!reason) return response.error(res, "Return reason is required", 400);

    const bankDetails = { bank_account_name, bank_account_number, bank_ifsc, bank_name, upi_id };
    await orderService.requestReturn(id, req.user.userId, reason, bankDetails);
    return response.success(res, null, "Return requested successfully");
  } catch (err) {
    return response.error(res, err.message, 400);
  }
}

async function getReturnRequests(req, res) {
  try {
    // Admin check is done via middleware/router usually, but good to have
    if (req.user.role !== 'ADMIN') return response.error(res, "Access denied", 403);

    const requests = await orderService.getReturnRequests(req.query);
    return response.success(res, requests, "Return requests fetched");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

// Named differently to avoid conflict with existing updateOrderStatus
async function updateReturnStatusForReturn(req, res) {
  try {
    // This is for specifically updating return status + adding remarks
    // Route: PATCH /orders/returns/:id/status
    // Here :id is likely the ORDER ID based on my finding in AdminReturns.jsx

    const { id } = req.params; // Order ID
    const { status, adminRemarks } = req.body;

    const result = await orderService.updateReturnStatus(id, status, adminRemarks);
    return response.success(res, result, "Return status updated");
  } catch (err) {
    return response.error(res, err.message, 500);
  }
}

async function confirmOrder(req, res) {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    const updatedOrder = await orderService.updateOrderStatus(id, 'CONFIRMED', role, userId);
    return res.status(200).json({
       success: true,
       message: "Order confirmed",
       order: updatedOrder
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function shipOrder(req, res) {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    const updatedOrder = await orderService.updateOrderStatus(id, 'SHIPPED', role, userId);

    // Fire-and-forget: Send Order Shipped SMS
    sendOrderShippedSMS(updatedOrder.user_id || userId, id).catch(() => {});

    return res.status(200).json({
       success: true,
       message: "Shipment initiated and status moved to SHIPPED",
       order: updatedOrder
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}


async function getInvoice(req, res) {
  try {
    const { id } = req.params;
    const invoiceService = require("./invoice.service");
    const orderService = require("./order.service"); // Ensure this is available scope-wise or use top-level require

    // 1. Fetch Order (Validates ownership)
    const order = await orderService.getOrderById(id, req.user.userId, req.user.role);

    // 2. Check if invoice URL exists (if stored in DB, implied by schema but not explicitly in model create)
    if (order.invoice_url) {
      return response.success(res, { url: order.invoice_url }, "Invoice fetched successfully");
    }

    // 3. Generate Invoice
    console.log('Invoice start');

    // Check availability of invoiceService
    if (!invoiceService || !invoiceService.generateAndUploadInvoice) {
      throw new Error("Invoice service not available");
    }

    console.log('Before S3 upload');
    const s3Url = await invoiceService.generateAndUploadInvoice(order);
    console.log('After S3 upload');

    // 4. Update Order with URL
    if (s3Url) {
      await orderService.updateInvoiceUrl(order.id, s3Url);
    }

    console.log('After S3 upload:', s3Url);

    // Generate Signed URL for secure access
    let finalUrl = s3Url;
    if (s3Url && s3Url.includes('amazonaws.com')) {
      try {
        const urlObj = new URL(s3Url);
        const key = urlObj.pathname.substring(1); // Remove leading /
        const s3Utils = require("../../utils/s3"); // Require here or top
        finalUrl = await s3Utils.getSignedFileUrl(key);
        console.log('Generated Signed URL');
      } catch (signErr) {
        console.error("Failed to sign URL:", signErr);
        // Fallback to public URL but unlikely to work if bucket is private
      }
    }

    console.log('Before response send');
    return response.success(res, { url: finalUrl }, "Invoice generated successfully");

  } catch (err) {
    logger.error("Get invoice failed", {
      orderId: req.params.id,
      error: err.message
    });
    return response.error(res, err.message || "Failed to generate invoice", 500);
  }
}
exports.getCouponUsageDetails = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({ error: "Coupon code is required" });
        }

        const data = await couponService.getCouponUsageDetails(code);

        res.json({
            success: true,
            data
        });

    } catch (err) {
        res.status(400).json({
            error: err.message
        });
    }
};
