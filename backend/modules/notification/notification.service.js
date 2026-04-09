const notificationModel = require("./notification.model");
const orderModel = require("../order/order.model");

/**
 * Get product names from order for notification messages
 */
async function getOrderProductNames(orderId) {
    try {
        const order = await orderModel.findById(orderId);
        
        if (!order || !order.items || order.items.length === 0) {
            return `Order #${orderId}`;
        }
        
        const productTitles = order.items.map(item => item.product_title).filter(Boolean);
        
        if (productTitles.length === 0) {
            return `Order #${orderId}`;
        } else if (productTitles.length === 1) {
            return productTitles[0];
        } else if (productTitles.length === 2) {
            return `${productTitles[0]} and ${productTitles[1]}`;
        } else {
            return `${productTitles[0]} and ${productTitles.length - 1} more items`;
        }
    } catch (error) {
        console.error('Error getting order product names:', error);
        return `Order #${orderId}`;
    }
}

/**
 * Generate enhanced notification message with redirect URL
 */
async function generateNotificationMessage(type, relatedEntityType, relatedEntityId, orderData = null) {
    let message = '';
    let redirectUrl = '';
    let actionText = '';
    
    if (relatedEntityType === 'ORDER' && relatedEntityId) {
        const productNames = await getOrderProductNames(relatedEntityId);
        
        switch (type) {
            case 'ORDER':
            case 'ORDER_CONFIRMED':
                message = `🎉 Great news! Your order "${productNames}" has been successfully confirmed and is being prepared for shipment. We'll notify you once it's packed and ready for delivery.`;
                actionText = 'View Order Details';
                redirectUrl = `/orders/${relatedEntityId}`;
                break;
                
            case 'ORDER_PACKED':
                message = `📦 Exciting update! Your order "${productNames}" has been carefully packed and is ready to be handed over to our delivery partner. Get ready to receive your items soon!`;
                actionText = 'Track Order';
                redirectUrl = `/orders/${relatedEntityId}`;
                break;
                
            case 'ORDER_SHIPPED':
                message = `🚚 Your order "${productNames}" is on its way! Our delivery partner has picked up your package and it's heading to your address. Track your delivery for real-time updates.`;
                actionText = 'Track Order';
                redirectUrl = `/orders/${relatedEntityId}`;
                break;
                
            case 'ORDER_OUT_FOR_DELIVERY':
                message = `🏃 Fantastic news! Your order "${productNames}" is out for delivery today and will reach your doorstep soon. Please keep your phone handy for delivery calls.`;
                actionText = 'Track Order';
                redirectUrl = `/orders/${relatedEntityId}`;
                break;
                
            case 'ORDER_DELIVERED':
                message = `✅ Hooray! Your order "${productNames}" has been successfully delivered. We hope you enjoy your purchase! Thank you for choosing us. Don't forget to leave a review!`;
                actionText = 'View Order & Review';
                redirectUrl = `/orders/${relatedEntityId}`;
                break;
                
            case 'ORDER_CANCELLED':
                message = `❌ Your order "${productNames}" has been cancelled. If you didn't request this cancellation, please contact our support team immediately. Refunds will be processed according to our policy.`;
                actionText = 'View Order Details';
                redirectUrl = `/orders/${relatedEntityId}`;
                break;
                
            default:
                message = `📦 Your order "${productNames}" has been updated. Check your order details for the latest information.`;
                actionText = 'View Order';
                redirectUrl = `/orders/${relatedEntityId}`;
                break;
        }
    } else if (relatedEntityType === 'PRODUCT' && relatedEntityId) {
        switch (type) {
            case 'PRODUCT_AVAILABLE':
                message = `🎉 Good news! A product you were interested in is now back in stock. Don't miss out on this opportunity!`;
                actionText = 'View Product';
                redirectUrl = `/products/${relatedEntityId}`;
                break;
                
            case 'PRODUCT_PRICE_DROP':
                message = `💰 Price drop alert! The price of a product in your wishlist has been reduced. This is the perfect time to buy!`;
                actionText = 'View Product';
                redirectUrl = `/products/${relatedEntityId}`;
                break;
                
            default:
                message = `📢 There's an update about a product you're interested in.`;
                actionText = 'View Product';
                redirectUrl = `/products/${relatedEntityId}`;
                break;
        }
    } else if (relatedEntityType === 'SYSTEM') {
        switch (type) {
            case 'PROFILE_UPDATE':
                message = `👤 Your profile has been successfully updated. Your changes are now live across the platform.`;
                actionText = 'View Profile';
                redirectUrl = `/profile`;
                break;
                
            case 'COMMISSION_UPDATE':
                message = `💼 Your commission request has been processed. Check your seller dashboard for more details.`;
                actionText = 'View Dashboard';
                redirectUrl = `/dashboard`;
                break;
                
            default:
                message = `🔔 You have a new system notification. Please check your account for important updates.`;
                actionText = 'View Dashboard';
                redirectUrl = `/dashboard`;
                break;
        }
    }
    
    return {
        message,
        redirectUrl,
        actionText
    };
}

/**
 * Send a notification to a single user with structured data
 */
async function sendNotification(userId, type, title, message, relatedEntityType = null, relatedEntityId = null, metadata = {}) {
    // Generate enhanced message and redirect URL
    const enhanced = await generateNotificationMessage(type, relatedEntityType, relatedEntityId, metadata);
    
    const finalMessage = message || enhanced.message;
    const finalTitle = title || (finalMessage ? finalMessage.split('.')[0] + '.' : 'Notification');

    return await notificationModel.create({
        userId,
        type,
        title: finalTitle,
        message: finalMessage,
        metadata: {
            ...metadata,
            redirectUrl: enhanced.redirectUrl,
            actionText: enhanced.actionText
        },
        relatedEntityType,
        relatedEntityId
    });
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, options = {}) {
    // Run cleanup silently in background
    notificationModel.deleteOldNotifications().catch(e => console.error(e));

    const limit = parseInt(options.limit) || 20;
    const page = parseInt(options.page) || 1;
    let offset = parseInt(options.offset) || 0;
    
    // Auto-calculate offset if page is provided
    if (options.page && !options.offset) {
        offset = (page - 1) * limit;
    }

    const notifications = await notificationModel.getByUserId(userId, limit, offset);
    const unreadCount = await notificationModel.getUnreadCount(userId);
    const totalCount = await notificationModel.getTotalCount(userId);

    return { 
        notifications, 
        unreadCount,
        pagination: {
            page,
            limit,
            totalItems: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasMore: offset + notifications.length < totalCount
        }
    };
}

/**
 * Mark as read
 */
async function markAsRead(id, userId) {
    return await notificationModel.markAsRead(id, userId);
}

/**
 * Mark all as read
 */
async function markAllAsRead(userId) {
    return await notificationModel.markAllAsRead(userId);
}

module.exports = {
    sendNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    getOrderProductNames,
    generateNotificationMessage
};
