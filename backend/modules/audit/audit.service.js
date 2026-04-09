const auditModel = require("./audit.model");

async function logAction({
    req,
    action,
    module,
    entityType,
    entityId,
    performedBy,
    performedRole,
    oldValues,
    newValues,
    message,
    severity
}) {
    const ipAddress = req?.ipAddress || req?.ip || null;
    const userAgent = req?.userAgent || req?.get?.('User-Agent') || null;
    const requestId = req?.requestId || null;
    const sessionId = req?.session?.id || null;
    const finalPerformedBy = performedBy || req?.user?.userId || null;
    const finalPerformedRole = performedRole || req?.user?.role || null;

    return await auditModel.createLog({
        action,
        module,
        entityType,
        entityId,
        performedBy: finalPerformedBy,
        performedRole: finalPerformedRole,
        oldValues,
        newValues,
        message,
        ipAddress,
        userAgent,
        requestId,
        sessionId,
        severity
    });
}

async function getLogs(filters = {}) {
    return await auditModel.listLogs(filters);
}

module.exports = {
    logAction,
    getLogs
};
