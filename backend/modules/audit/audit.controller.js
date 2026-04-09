const auditService = require("./audit.service");
const response = require("../../utils/response");

async function getAuditLogs(req, res) {
    try {
        const logs = await auditService.getLogs(req.query);
        return response.success(res, logs, "Audit logs fetched successfully");
    } catch (err) {
        return response.error(res, "Unable to fetch audit logs", 500);
    }
}

module.exports = {
    getAuditLogs
};
