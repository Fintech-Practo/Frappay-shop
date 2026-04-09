import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateInvoice = (order) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Books & Copies', 20, 20);

  doc.setFontSize(11);
  doc.text(`Invoice #: ${order.invoice_number}`, 20, 30);
  doc.text(`Order ID: #${order.id}`, 20, 38);
  doc.text(`Order Status: ${order.status.toUpperCase()}`, 20, 46);

  doc.text('Bill To:', 20, 60);
  doc.text(order.user_name, 20, 68);
  doc.text(order.shipping_address, 20, 76);
  doc.text('Sold By: Books & Copies Seller', 20, 90);
doc.text('GSTIN: XXXXXXXX', 20, 98);

  doc.autoTable({
    startY: 110,
    head: [['Item', 'Qty', 'Price', 'GST%', 'Total']],
  body: order.items.map(i => {
  const gstRate = i.gst_rate || 5;
  const base = i.price * i.quantity;
  const gstAmount = (base * gstRate) / 100;
  const total = base + gstAmount;

  return [
    i.product_title,
    i.quantity,
    i.price.toFixed(2),
    gstRate,
    total.toFixed(2)
  ];
}),
  });

  const y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
doc.text(`Grand Total: ₹${order.total_amount.toFixed(2)}`, 140, y);

  doc.save(`invoice-${order.id}.pdf`);
};