/**
 * Standard Status Transition Sequence: 
 * pending → confirmed → shipped → in_transit → ofd → delivered
 */
const ALLOWED_TRANSITIONS = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['packed', 'awb_assigned', 'shipped', 'cancelled'],
  'packed': ['awb_assigned', 'shipped', 'cancelled'],
  'awb_assigned': ['shipped', 'cancelled'],
  'shipped': ['in_transit', 'ofd', 'delivered'],
  'in_transit': ['ofd', 'delivered'],
  'ofd': ['delivered'],
  'delivered': [],
  'cancelled': [],
  'returned': []
};

/**
 * Validates if the transition from oldStatus to newStatus is allowed.
 * Handles case-insensitivity.
 */
const isValidTransition = (oldStatus, newStatus) => {
  if (!oldStatus || !newStatus) return false;
  
  const o = oldStatus.toLowerCase();
  const n = newStatus.toLowerCase();

  // Same status is handled by skip logic, but here we return false for transition
  if (o === n) return false;

  // Always allow transition to delivered from any active state to handle logistics edge cases
  if (n === 'delivered' && !['cancelled', 'returned'].includes(o)) return true;

  // Always allow transition to returned/cancelled from active states
  if (n === 'returned' || n === 'cancelled') return true;

  return ALLOWED_TRANSITIONS[o]?.includes(n) || false;
};

module.exports = { isValidTransition };
