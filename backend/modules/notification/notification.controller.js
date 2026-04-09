const notificationService = require("./notification.service");
const { createNotificationSchema, getNotificationsSchema } = require("./notification.schema");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");

async function getMyNotifications(req, res) {
    try {
        const { error, value } = getNotificationsSchema.validate(req.query);
        if (error) return response.error(res, error.message, 400);

        const userId = req.user.userId;
        const data = await notificationService.getUserNotifications(userId, value || {});
        return response.success(res, data, "Notifications fetched successfully");
    } catch (err) {
        const errorMessage = err.message || String(err);
        logger.error("Get notifications failed", { 
            userId: req.user.userId, 
            error: errorMessage
        });
        return response.error(res, errorMessage, 500);
    }
}

async function markRead(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        await notificationService.markAsRead(id, userId);
        return response.success(res, null, "Notification marked as read");
    } catch (err) {
        logger.error("Mark notification as read failed", { 
            notificationId: req.params.id,
            userId: req.user.userId,
            error: err.message 
        });
        return response.error(res, err.message || "Failed to update notification", 500);
    }
}

async function markAllRead(req, res) {
    try {
        const userId = req.user.userId;
        await notificationService.markAllAsRead(userId);
        return response.success(res, null, "All notifications marked as read");
    } catch (err) {
        logger.error("Mark all notifications as read failed", { 
            userId: req.user.userId,
            error: err.message 
        });
        return response.error(res, err.message || "Failed to update notifications", 500);
    }
}

// CREATE NOTIFICATION (ADMIN/INTERNAL USE)
async function createNotification(req, res) {
    try {
        const { error } = createNotificationSchema.validate(req.body);
        if (error) return response.error(res, error.message, 400);

        const notification = await notificationService.createNotification(req.body);
        return response.success(res, notification, "Notification created successfully");
    } catch (err) {
        logger.error("Create notification failed", { error: err.message });
        return response.error(res, err.message || "Failed to create notification", 500);
    }
}

module.exports = {
    getMyNotifications,
    markRead,
    markAllRead,
    createNotification
};
