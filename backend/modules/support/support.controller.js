const {
    createSupportTicketSchema,
    updateTicketStatusSchema,
    getSupportTicketsSchema
} = require("./support.schema");

const supportService = require("./support.service");
const userService = require("../user/user.service");
const response = require("../../utils/response");
const logger = require("../../utils/logger");
const { validateRequest, validateQuery } = require("../../middlewares/validation.middleware");

// POST /api/support  (user creates ticket)
async function createSupportTicket(req, res) {
    try {
        const { error, value } = createSupportTicketSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            console.log("Validation error:", error.details);
            return response.error(res, error.details.map(d => d.message).join(", "), 400);
        }

        // Assuming you use auth middleware that sets req.user
        const user = req.user;
        const userId = user?.userId;

        if (!userId) {
            return response.error(res, "Unauthorized", 401);
        }

        // Fetch full user profile to get email
        const userProfile = await userService.getMyProfile(userId);
        const userEmail = userProfile ? userProfile.email : (user.email || null);

        const ticketId = await supportService.createTicket({
            user_id: userId,
            email: userEmail,
            subject: value.subject,
            message: value.message,
            priority: value.priority || "MEDIUM",
            role: user.role === 'SELLER' ? 'SELLER' : 'USER'
        });

        const ticket = await supportService.getTicketById(ticketId);

        return response.success(res, ticket, "Support ticket created successfully");
    } catch (err) {
        logger.error("Create support ticket failed", {
            userId: req.user?.userId,
            error: err.message
        });
        return response.error(res, err.message || "Failed to create support ticket", 500);
    }
}

// GET /api/support/my
async function getMyTickets(req, res) {
    try {
        const user = req.user;
        const userId = user?.userId;

        if (!userId) {
            return response.error(res, "Unauthorized", 401);
        }

        const { error, value } = getSupportTicketsSchema.validate(req.query);
        if (error) return response.error(res, error.message, 400);

        const tickets = await supportService.listTicketsForUser(userId, value);

        return response.success(res, tickets, "Tickets fetched successfully");
    } catch (err) {
        logger.error("Get my tickets failed", {
            userId: req.user?.userId,
            error: err.message
        });
        return response.error(res, err.message || "Failed to fetch tickets", 500);
    }
}

// GET /api/support/:id
async function getTicketById(req, res) {
    try {
        const user = req.user;
        const userId = user?.userId;

        if (!userId) {
            return response.error(res, "Unauthorized", 401);
        }

        const ticketId = Number(req.params.id);
        const ticket = await supportService.getTicketById(ticketId);

        if (!ticket) {
            return response.error(res, "Ticket not found", 404);
        }

        // Check if user owns the ticket or is admin
        if (ticket.user_id !== userId && user.role !== 'ADMIN') {
            return response.error(res, "Access denied", 403);
        }

        return response.success(res, ticket, "Ticket fetched successfully");
    } catch (err) {
        logger.error("Get ticket by ID failed", {
            ticketId: req.params.id,
            userId: req.user?.userId,
            error: err.message
        });
        return response.error(res, err.message || "Failed to fetch ticket", 500);
    }
}

// PATCH /api/support/:id
async function updateTicket(req, res) {
    try {
        const user = req.user;
        const userId = user?.userId;

        if (!userId) {
            return response.error(res, "Unauthorized", 401);
        }

        const { error, value } = updateTicketStatusSchema.validate(req.body);
        if (error) return response.error(res, error.message, 400);

        const ticketId = Number(req.params.id);

        // Check if user owns the ticket or is admin
        const existingTicket = await supportService.getTicketById(ticketId);
        if (!existingTicket) {
            return response.error(res, "Ticket not found", 404);
        }

        if (existingTicket.user_id !== userId && user.role !== 'ADMIN') {
            return response.error(res, "Access denied", 403);
        }

        const updated = await supportService.updateTicket(ticketId, value);

        if (!updated) {
            return response.error(res, "Ticket not found", 404);
        }

        return response.success(res, updated, "Ticket updated successfully");
    } catch (err) {
        logger.error("Update ticket failed", {
            ticketId: req.params.id,
            userId: req.user?.userId,
            error: err.message
        });
        return response.error(res, err.message || "Failed to update ticket", 500);
    }
}

// ======================= ADMIN =======================

// GET /api/admin/support
async function adminListTickets(req, res) {
    try {
        const { error, value } = getSupportTicketsSchema.validate(req.query);
        if (error) return response.error(res, error.message, 400);

        const tickets = await supportService.listTickets(value);

        return response.success(res, tickets, "Tickets fetched successfully");
    } catch (err) {
        logger.error("Admin list tickets failed", {
            query: req.query,
            error: err.message
        });
        return response.error(res, err.message || "Failed to fetch tickets", 500);
    }
}

// GET /api/admin/support/:id
async function adminGetTicket(req, res) {
    try {
        const ticketId = Number(req.params.id);
        const ticket = await supportService.getTicketById(ticketId);

        if (!ticket) {
            return response.error(res, "Ticket not found", 404);
        }

        return response.success(res, ticket, "Ticket fetched successfully");
    } catch (err) {
        logger.error("Admin get ticket failed", {
            ticketId: req.params.id,
            error: err.message
        });
        return response.error(res, err.message || "Failed to fetch ticket", 500);
    }
}

// PATCH /api/admin/support/:id
async function adminUpdateTicket(req, res) {
    try {
        const ticketId = Number(req.params.id);

        const { error, value } = updateTicketStatusSchema.validate(req.body);
        if (error) return response.error(res, error.message, 400);

        const updated = await supportService.updateTicket(ticketId, value);

        if (!updated) {
            return response.error(res, "Ticket not found", 404);
        }

        // Log audit
        // Log audit (safe)
        try {
            const auditService = require("../audit/audit.service");
            await auditService.logAction({
                req,
                action: "UPDATE_TICKET",
                module: "SUPPORT",
                entityType: "TICKET",
                entityId: ticketId,
                newValues: value
            });
        } catch (auditErr) {
            console.error("Audit log failed:", auditErr.message);
        }
        return response.success(res, updated, "Ticket updated successfully");
    } catch (err) {
        logger.error("Admin update ticket failed", {
            ticketId: req.params.id,
            adminId: req.user?.userId,
            error: err.message
        });
        return response.error(res, err.message || "Failed to update ticket", 500);
    }
}

// GET /api/admin/support/analytics
async function getSupportAnalytics(req, res) {
    try {
        const { error, value } = getSupportTicketsSchema.validate(req.query);
        if (error) return response.error(res, error.message, 400);

        const analytics = await supportService.getSupportAnalytics(value);
        return response.success(res, analytics, "Support analytics fetched successfully");
    } catch (err) {
        logger.error("Get support analytics failed", {
            query: req.query,
            error: err.message
        });
        return response.error(res, err.message || "Failed to fetch support analytics", 500);
    }
}

module.exports = {
    createSupportTicket,
    getMyTickets,
    getTicketById,
    updateTicket,
    adminListTickets,
    adminGetTicket,
    adminUpdateTicket,
    getSupportAnalytics
};