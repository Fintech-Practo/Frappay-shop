const router = require("express").Router();
const rewardService = require("./reward.service");
const auth = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");
const ROLES = require("../../config/roles");

router.get(
    "/rules/active",
    auth,
    async (req, res) => {
        try {
            const rules = await rewardService.getActiveRules();
            res.json({ success: true, data: rules });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
);

module.exports = router;
