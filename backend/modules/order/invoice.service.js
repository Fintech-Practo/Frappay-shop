/**
 * invoice.service.js  —  Professional Enterprise Invoice Generator
 * Flipkart-style: Dual-column header, GST table, amount-in-words,
 * tri-status watermarks (DELIVERED/CANCELLED/RETURNED), barcode + QR.
 */

const PDFDocument = require('pdfkit');
const axios = require('axios');
const bwipjs = require('bwip-js');
const QRCode = require('qrcode');

const { uploadFile } = require('../../utils/upload');
const userModel = require('../user/user.model');
const pool = require('../../config/db');
const logger = require('../../utils/logger');
const { fmt, calculateGST, numberToWords, formatDate: fmtDate } = require('../../utils/financial.util');

const DEFAULT_LOGO_URL =
  'https://frappay-shop-assets.s3.ap-south-2.amazonaws.com/assets/736dc86d-fb28-41a1-b8b9-85d407252b3a.png';

const DEFAULT_GST_RATE = 5; // 5% GST for books (HSN 4901); stationery may differ

/* ========================= UTILITIES ========================= */
function extractState(cityStatePin) {
  if (!cityStatePin) return '';

  // Try to match Indian states safely
  const states = [
    'ANDHRA PRADESH','ARUNACHAL PRADESH','ASSAM','BIHAR','CHHATTISGARH',
    'GOA','GUJARAT','HARYANA','HIMACHAL PRADESH','JHARKHAND',
    'KARNATAKA','KERALA','MADHYA PRADESH','MAHARASHTRA','MANIPUR',
    'MEGHALAYA','MIZORAM','NAGALAND','ODISHA','PUNJAB',
    'RAJASTHAN','SIKKIM','TAMIL NADU','TELANGANA','TRIPURA',
    'UTTAR PRADESH','UTTARAKHAND','WEST BENGAL','DELHI'
  ];

  const upper = cityStatePin.toUpperCase();

  const found = states.find(state => upper.includes(state));
  return found || '';
}

function generateInvoiceNumber(orderId) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${date}-${orderId}`;
}

async function fetchLogoBuffer(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  } catch (e) {
    logger.warn('Could not fetch logo for invoice', { url, error: e.message });
    return null;
  }
}

async function generateCodeBuffers(invoiceNo, order) {
  const txnId = order.payment?.gateway_transaction_id || 'NA';
  const orderType = order.order_type || 'PHYSICAL';

  const rawText = `INV|${order.id}|${invoiceNo}|${txnId}|${orderType}`;
const barcodeText = Buffer.from(rawText).toString('base64');

  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text: barcodeText,
    scale: 4,
    height: 18,
    includetext: true,
    textxalign: 'center',
  });
const invoiceDownloadUrl = `http://localhost:5000/api/orders/scan/${Buffer.from(`INV|${order.id}|${invoiceNo}`).toString('base64')}`;


  const qrBuffer = await QRCode.toBuffer(invoiceDownloadUrl, {
    width: 200, // Large for visibility
    margin: 0,
    errorCorrectionLevel: 'M',
  });

  return { barcodeBuffer, qrBuffer };
}

/* ========================= PDF HELPERS ========================= */

function drawHRule(doc, x1, x2, y, color = '#e2e8f0') {
  doc.lineWidth(0.5).moveTo(x1, y).lineTo(x2, y).strokeColor(color).stroke();
  doc.strokeColor('black');
}

function drawRect(doc, x, y, w, h, fillColor) {
  doc.rect(x, y, w, h).fill(fillColor);
}

function ensurePageSpace(doc, neededHeight = 100) {
  if (doc.y + neededHeight > doc.page.height - 50) {
    doc.addPage();
    doc.y = 30;
  }
}

/* ========================= WATERMARK ========================= */

function drawWatermark(doc, status) {
  const map = {
    DELIVERED: { text: 'DELIVERED', color: '#16a34a' },
    CANCELLED: { text: 'CANCELLED', color: '#dc2626' },
    RETURNED: { text: 'RETURNED', color: '#7c3aed' },
  };
  const cfg = map[status];
  if (!cfg) return;

  // Draw at page center, rotated −45°
  const cx = doc.page.width / 2 - 120;
  const cy = doc.page.height / 2 - 40;

  doc.save();
  doc.opacity(0.10)
    .fontSize(70)
    .font('Helvetica-Bold')
    .fillColor(cfg.color)
    .text(cfg.text, cx, cy, { lineBreak: false });
  doc.restore();
  doc.opacity(1).fillColor('black');
}

/* ========================= MAIN GENERATOR ========================= */

async function generateAndUploadInvoice(order) {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info('Invoice generation started', { orderId: order.id });

      /* ----------- SAFETY NORMALISATION ----------- */
      order.items = Array.isArray(order.items) ? order.items : [];
      order.items = order.items.map(item => ({
        ...item,
        product_title: item.product_title || 'Untitled Product',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        gst_rate: item.gst_rate !== undefined && item.gst_rate !== null
          ? Number(item.gst_rate)
          : DEFAULT_GST_RATE,
        list_price: Number(item.list_price || item.price || 0),
        hsn_code: item.hsn_code || '4901',
        format: item.format || 'PHYSICAL',
      }));

      order.total_amount = Number(order.total_amount || order.total_payable_amount || 0);
      order.shipping_amount = Number(order.shipping_amount || 0);
      order.subtotal_amount = Number(order.subtotal_amount || (order.total_amount - order.shipping_amount));
      order.status = (order.status || 'CONFIRMED').toUpperCase();

      /* ----------- PARTICIPANTS ----------- */
      const buyer = order.user_id ? await userModel.findById(order.user_id) : null;
      const buyerName = buyer?.name || order.user_name || 'Customer';
      const buyerEmail = buyer?.email || order.user_email || '';
      const buyerPhone = buyer?.phone || '';

      // Structured address formatter
      function formatAddressStructured(order, buyer) {
        let addr = order.shipping_address || buyer?.address;

        let parsed = {};

        if (typeof addr === 'string') {
          try {
            parsed = JSON.parse(addr);
          } catch {
            const parts = addr.split(",").map(p => p.trim());

            parsed = {
              address_line1: parts[0],
              address_line2: parts[1],
              city: parts[2],
              state: parts[3],
              postal_code: parts.find(p => /\d{6}/.test(p)) || ""
            };
          }
        } else {
          parsed = addr || {};
        }

        const phone =
          order.shipping_phone ||
          buyer?.phone ||
          (typeof addr === 'string' && (addr.match(/\b\d{10}\b/) || [])[0]);

        return {
          name: buyer?.name || 'Customer',
          line1: parsed.address_line1 || "",
          line2: parsed.address_line2 || "",
          cityStatePin: `${parsed.city || ""}, ${parsed.state || ""} - ${parsed.postal_code || ""}`,
          country: "India",
          phone,
          email: buyer?.email || ""
        };
      }

      const address = formatAddressStructured(order, buyer);

      const sellerIds = [...new Set(order.items.map(i => i.seller_id).filter(Boolean))];
      const sellers = (await Promise.all(sellerIds.map(id => userModel.findById(id)))).filter(Boolean);
      const primarySeller = sellers[0];

      // Fetch seller info for GST number
      let primarySellerInfo = null;
      if (primarySeller) {
        const [infoRows] = await pool.query("SELECT * FROM seller_info WHERE user_id = ?", [primarySeller.id]);
        if (infoRows.length > 0) {
          primarySellerInfo = infoRows[0];
        }
      }
      const sellerState = (primarySellerInfo?.astate || '').trim().toUpperCase();
const buyerState = extractState(address.cityStatePin);
console.log("Seller State:", sellerState);
console.log("Buyer State:", buyerState);
console.log("Is Interstate:", sellerState !== buyerState);
const isInterstate = sellerState !== buyerState;


  console.log("Seller State:", sellerState);
console.log("Buyer State:", buyerState);
console.log("Is Interstate:", isInterstate);


      /* ----------- LOGO + CODES ----------- */
      const logoBuffer = await fetchLogoBuffer(DEFAULT_LOGO_URL);
      const invoiceNo = order.invoice_number || generateInvoiceNumber(order.id);
      const { barcodeBuffer, qrBuffer } = await generateCodeBuffers(invoiceNo, order);

      /* ----------- COMPUTED FINANCIALS (per item) ----------- */
      let totalNetAmount = 0;
      let totalTaxAmount = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;

      const lineItems = order.items.map((item, idx) => {
        const gst = calculateGST(item.price, item.gst_rate, isInterstate, false);
        const qty = item.quantity;
        const lineNet = Number((gst.netPrice * qty).toFixed(2));
        const lineTax = Number((gst.taxAmount * qty).toFixed(2));
        const lineGross = Number((gst.grossTotal * qty).toFixed(2));

        totalNetAmount += lineNet;
        totalTaxAmount += lineTax;
        totalCGST += isInterstate ? 0 : Number((gst.cgst * qty).toFixed(2));
        totalSGST += isInterstate ? 0 : Number((gst.sgst * qty).toFixed(2));
        totalIGST += isInterstate ? Number((gst.igst * qty).toFixed(2)) : 0;

        return {
          sno: idx + 1,
          title: item.product_title,
          hsn: item.hsn_code,
          format: item.format,
          qty,
          netPrice: gst.netPrice,
          gstRate: item.gst_rate,
          taxAmt: lineTax,
          total: lineGross,
        };
      });

      const couponDiscount = Number(order.coupon_discount || 0);
      const coinDiscount = Number(order.coin_discount || 0);
      const totalSavings = couponDiscount + coinDiscount;

      // Use totalNetAmount + tax + shipping as the pre-discount subtotal
      const subtotalGross = Number((totalNetAmount + totalTaxAmount).toFixed(2));
      // The actual paid amount is authoritative from the order record
      const grandTotal = Number(order.total_payable_amount || order.total_amount ||
        Math.max(0, subtotalGross + order.shipping_amount - couponDiscount - coinDiscount));
      const amtInWords = numberToWords(grandTotal);

      /* ----------- PDF SETUP ----------- */
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.page.margins.bottom = 0;
      doc.y = 0;
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', async () => {
        try {
          const pdf = Buffer.concat(buffers);
          const s3Url = await uploadFile(pdf, 'application/pdf', 'invoices', `invoice-${invoiceNo}.pdf`);
          logger.info('Invoice uploaded to S3', { invoiceNo, orderId: order.id, url: s3Url });
          resolve(s3Url);
        } catch (err) {
          logger.error('Invoice S3 upload failed', { invoiceNo, error: err.message });
          reject(err);
        }
      });

      const PW = doc.page.width;   // 595
      const LM = 35;               // left margin
      const RM = PW - 35;          // right margin
      const CW = PW - 70;          // content width
      const PRIMARY_RED = '#dc2626';

      /* =====================================================
         HEADER — Image Style
         Left: Logo + Platform Info + Status
         Right: TAX INVOICE + Meta + Barcode
         ===================================================== */
      let headerY = 32;

      // Logo + Platform Info (No redundant text)
      if (logoBuffer) {
        doc.image(logoBuffer, LM, headerY, { height: 40 });
      }

      // Platform Info
      let platY = headerY + 48;
      doc.font('Helvetica').fontSize(8.5).fillColor('#000000');
      doc.text('E-Commerce Platform', LM, platY); platY += 14;
      // doc.text('GSTIN: 21ABCDE1234F1Z5', LM, platY); platY += 14;
      doc.text('E-mail: support@frappay.shop', LM, platY); platY += 14;
      doc.text('Website: frappay.shop', LM, platY); platY += 16;

      // Status Badge
      // doc.rect(LM, platY, 100, 16).fill(PRIMARY_RED);
      // doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
      //   .text(`Status: ${order.status}`, LM + 5, platY + 4, { width: 90, align: 'center' });

      // TAX INVOICE (Right Side)
      doc.font('Helvetica-Bold').fontSize(18).fillColor(PRIMARY_RED)
        .text('TAX INVOICE', 300, headerY, { width: RM - 300, align: 'right' });

      // ===== FIXED META BLOCK (REPLACEMENT) =====
      const labelWidth = 100;
      const valueWidth = 120;
      const metaX = RM - (labelWidth + valueWidth);
      let metaY = headerY + 40;
      const metaGap = 14;

      const drawMetaRow = (label, value, y) => {
        doc.font('Helvetica').fontSize(9).fillColor('#000000')
          .text(`${label} ${value}`, metaX, y, {
            width: labelWidth + valueWidth,
            align: 'right'
          });
      };

      drawMetaRow('Invoice No:', invoiceNo, metaY);
      metaY += metaGap;
      drawMetaRow('Order ID:', `#${order.id}`, metaY);
      metaY += metaGap;
      drawMetaRow('Order Date:', fmtDate(order.created_at || Date.now()), metaY);

      const afterMetaY = metaY + 10;

      // Barcode + Label below it
      if (barcodeBuffer) {
        const barcodeY = afterMetaY + 10;
        doc.image(barcodeBuffer, RM - 160, barcodeY, { width: 160, height: 40 });
        doc.font('Helvetica').fontSize(9).text(
          `${invoiceNo} | Order: ${order.id}`,
          RM - 160,
          barcodeY + 45,
          { width: 160, align: 'center' }
        );
      }

      /* ================= ADDRESS BLOCK ================= */
      ensurePageSpace(doc, 150);
      let addrY = Math.max(afterMetaY + 80, platY + 40);

      const colW = PW - 70; // Full width mapping

      // "BILL TO" Header (Left)
      doc.rect(LM, addrY, 120, 15).fill(PRIMARY_RED);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff').text('BILL TO', LM + 5, addrY + 4);

      addrY += 22;

      // Buyer Details
      let buyerY = addrY;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(address.name.toUpperCase(), LM, buyerY);
      buyerY += 13;
      doc.font('Helvetica').fontSize(9).fillColor('#374151');
      doc.text(address.line1, LM, buyerY);
      buyerY += 11;
      if (address.line2) {
        doc.text(address.line2, LM, buyerY);
        buyerY += 11;
      }
      doc.text(address.cityStatePin, LM, buyerY);
      buyerY += 11;
      doc.text(address.country, LM, buyerY);
      buyerY += 11;
      if (address.phone) doc.text(`Phone: ${address.phone}`, LM, buyerY);
      if (address.email) doc.text(`E-mail: ${address.email}`, LM, buyerY + 11);
      buyerY += 25; // Add some Padding

      // SELLER INFO (Right Side)
      const col2X = RM - 160;
      let sellerIdxY = addrY;

      doc.rect(col2X, sellerIdxY, 120, 15).fill(PRIMARY_RED);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff').text('SOLD BY', col2X + 5, sellerIdxY + 4);

      sellerIdxY += 22;
      if (primarySeller) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(primarySeller.name || 'Frap Pay Shop Seller', col2X, sellerIdxY);
        sellerIdxY += 14;
        doc.font('Helvetica').fontSize(9).fillColor('#374151').text(primarySeller.email || 'seller@frappay.shop', col2X, sellerIdxY);
        sellerIdxY += 12;
        doc.text(`Phone: ${primarySeller.phone || '09348021930'}`, col2X, sellerIdxY);
        sellerIdxY += 12;

if (primarySellerInfo && primarySellerInfo.business_name) {
  doc.text(`Business: ${primarySellerInfo.business_name}`, col2X, sellerIdxY);
  sellerIdxY += 12;
}

if (primarySellerInfo && primarySellerInfo.gst_number) {
  doc.text(`GSTIN: ${primarySellerInfo.gst_number}`, col2X, sellerIdxY);
}
      } else {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Frap Pay Shop Platform', col2X, sellerIdxY);
        sellerIdxY += 14;
        doc.font('Helvetica').fontSize(9).fillColor('#374151').text('seller@frappay.shop', col2X, sellerIdxY);
        sellerIdxY += 12;
        doc.text('Phone: 09348021930', col2X, sellerIdxY);
      }

      // Final Y position for Table Start
      let tableStartY = Math.max(buyerY + 20, sellerIdxY + 20);

      const COL = {
        sno: { x: LM, w: 40 },
        desc: { x: LM + 40, w: 200 },
        qty: { x: LM + 240, w: 30 },
        net: { x: LM + 270, w: 80 },
        gst: { x: LM + 350, w: 50 },
        tot: { x: LM + 400, w: 95 },
      };

      // Table Header Row
      doc.rect(LM, tableStartY, CW, 18).fill(PRIMARY_RED);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      doc.text('SI.NO.', COL.sno.x + 2, tableStartY + 4);
      doc.text('Description', COL.desc.x + 2, tableStartY + 4, { align: 'center', width: COL.desc.w });
      doc.text('Qty', COL.qty.x, tableStartY + 4, { align: 'center', width: COL.qty.w });
      doc.text('Net Price', COL.net.x, tableStartY + 4, { align: 'center', width: COL.net.w });
      doc.text('GST%', COL.gst.x, tableStartY + 4, { align: 'center', width: COL.gst.w });
      doc.text('Total', COL.tot.x, tableStartY + 4, { align: 'center', width: COL.tot.w });

      let rowY = tableStartY + 18;
      doc.fillColor('#000000').lineWidth(0.5);

      lineItems.forEach((li, idx) => {
        const rowBg = '#f9fafb';
        const descText = `${li.title}\nHSN: ${li.hsn} | ${li.format}`;
        const rowH = Math.max(30, doc.heightOfString(descText, { width: COL.desc.w - 4, fontSize: 9 }) + 10);

        // Row background
        doc.rect(LM, rowY, CW, rowH).fill(rowBg);

        // Horizontal line separator
        doc.lineWidth(0.3).moveTo(LM, rowY + rowH).lineTo(RM, rowY + rowH).strokeColor('#e5e7eb').stroke();

        // Calculate product price (net price - tax amount per unit)
        const productPrice = li.netPrice;
        // Calculate total as product price + GST amount
        const totalAmount = li.total;

        doc.font('Helvetica').fontSize(8).fillColor('#000000');
        doc.text(String(li.sno), COL.sno.x, rowY + (rowH / 2) - 6, { align: 'center', width: COL.sno.w });
        doc.text(descText, COL.desc.x + 5, rowY + 6, {
          width: COL.desc.w - 10,
          lineGap: 3
        });
        doc.text(String(li.qty), COL.qty.x, rowY + (rowH / 2) - 4, { align: 'center', width: COL.qty.w });
        doc.text(`Rs. ${fmt(productPrice)}`, COL.net.x, rowY + (rowH / 2) - 4, { align: 'center', width: COL.net.w });
        doc.text(`${fmt(li.gstRate)}%`, COL.gst.x, rowY + (rowH / 2) - 4, { align: 'center', width: COL.gst.w });
        doc.font('Helvetica-Bold').text(`Rs. ${fmt(totalAmount)}`, COL.tot.x, rowY + (rowH / 2) - 4, { align: 'center', width: COL.tot.w });

        rowY += rowH;
      });

      /* =====================================================
         SUMMARY SECTION
         ===================================================== */
      ensurePageSpace(doc, 200);
      const sumX = RM - 230;
      let sumY = rowY + 20;
      const sumW = 230;

      // Calculate Product Price (Subtotal - Total GST)
    const productPrice = totalNetAmount;
    const summaryRows = [
  { label: 'Product Price', value: `Rs. ${fmt(productPrice)}` },

  ...(isInterstate
    ? [{ label: 'IGST', value: `Rs. ${fmt(totalIGST)}` }]
    : [
        { label: 'CGST', value: `Rs. ${fmt(totalCGST)}` },
        { label: 'SGST', value: `Rs. ${fmt(totalSGST)}` }
      ]),

  { label: 'Total GST', value: `Rs. ${fmt(totalTaxAmount)}` },
  { label: 'Shipping', value: `Rs. ${fmt(order.shipping_amount)}` },
  { label: 'Payment Method', value: (order.payment_method || 'COD'), color: PRIMARY_RED },
  { 
  label: order.payment_method === 'COD' ? 'COD Amount' : 'Paid Amount', 
  value: `Rs. ${fmt(grandTotal)}` 
},
];

      // Insert QR Code BESIDE the summary
      const qrSize = 100;
      if (qrBuffer) {
        doc.image(qrBuffer, LM + 40, sumY, { width: qrSize, height: qrSize });
        doc.font('Helvetica').fontSize(9).fillColor('#9ca3af')
          .text('Scan for Invoice', LM + 40, sumY + qrSize + 2, { width: qrSize, align: 'center' });

        // Status Badge aligned with 'Total Paid' section
        // const statusY = sumY + 115;
        // doc.rect(LM + 15, statusY, 150, 20).fill(PRIMARY_RED);
        // doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
        //    .text(`Status: ${order.status.toUpperCase()}`, LM + 15, statusY + 5, { width: 150, align: 'center' });
      }

      summaryRows.forEach(row => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text(row.label, sumX, sumY, { width: 140, align: 'left' });
        doc.font('Helvetica-Bold').fillColor(row.color || '#000000').text(row.value, RM - 90, sumY, { width: 90, align: 'right' });
        sumY += 14;
      });

      // Total Paid Row
      doc.rect(sumX, sumY, sumW, 20).fill(PRIMARY_RED);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
      doc.text('TOTAL PAID', sumX + 5, sumY + 5, { width: 140 });
      doc.text(`Rs. ${fmt(grandTotal)}`, RM - 90, sumY + 5, { width: 90, align: 'right' });
      sumY += 28;

      /* =====================================================
         FOOTER
         ===================================================== */
      ensurePageSpace(doc, 100);
      // Pinned at the very bottom
      const bottomY = doc.page.height - 70;
      doc.font('Helvetica-Bold').fontSize(12).fillColor(PRIMARY_RED)
        .text('Thank You for Shopping with Us!', 0, bottomY, { align: 'center', width: PW });

      doc.font('Helvetica').fontSize(9).fillColor('#f87171')
        .text(`For any queries contact at support@frappay.shop or Call +91 8062180677`, 0, bottomY + 20, { align: 'center', width: PW });
      doc.moveDown(0.2);
      doc.rect(PW / 2 - 30, bottomY + 30, 60, 0.5).fill('#f87171'); // small underline effect if needed

      /* =====================================================
         WATERMARK
         ===================================================== */
      if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status)) {
        drawWatermark(doc, order.status);
      }

      doc.end();

    } catch (error) {
      logger.error('Invoice generation failed', { orderId: order?.id, error: error.message, stack: error.stack });
      reject(error);
    }
  });
}

module.exports = {
  generateAndUploadInvoice,
  generateInvoiceNumber,
};
