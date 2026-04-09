/**
 * Maps Delhivery raw status strings to standardized internal statuses.
 * Standard Sequence: pending → confirmed → shipped → in_transit → ofd → delivered
 */
const mapDelhiveryStatus = (status) => {
  if (!status) return null;
  const s = status.toLowerCase();

  if (s.includes("delivered")) return "delivered";
  if (s.includes("out for delivery") || s.includes("ofd")) return "ofd";
  if (s.includes("in transit") || s.includes("transit") || s.includes("picked up")) return "in_transit";
  if (s.includes("dispatched") || s.includes("shipped")) return "shipped";
  if (s.includes("awb_assigned") || s.includes("awb assigned")) return "awb_assigned";
  if (s.includes("packed")) return "packed";
  if (s.includes("cancelled")) return "cancelled";
  if (s.includes("rto") || s.includes("return")) return "returned";

  return null;
};

module.exports = { mapDelhiveryStatus };
