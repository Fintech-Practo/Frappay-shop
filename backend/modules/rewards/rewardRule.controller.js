const rewardRuleService = require("./rewardRule.service");
const response = require("../../utils/response");

async function createRule(req, res) {
    try {
        const rule = await rewardRuleService.createRule(req.body);
        return response.success(res, rule, "Reward rule created successfully");
    } catch (err) {
        return response.error(res, err.message, 400);
    }
}

async function listRules(req, res) {
    try {
        const rules = await rewardRuleService.listRules();
        return response.success(res, rules, "Reward rules fetched successfully");
    } catch (err) {
        return response.error(res, err.message, 500);
    }
}

async function updateRule(req, res) {
    try {
        const { id } = req.params;
        const rule = await rewardRuleService.updateRule(id, req.body);
        return response.success(res, rule, "Reward rule updated successfully");
    } catch (err) {
        return response.error(res, err.message, 400);
    }
}

async function toggleStatus(req, res) {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const result = await rewardRuleService.toggleStatus(id, active);
        return response.success(res, result, `Reward rule ${active ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
        return response.error(res, err.message, 400);
    }
}

module.exports = {
    createRule,
    listRules,
    updateRule,
    toggleStatus
};
