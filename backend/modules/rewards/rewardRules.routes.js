const router = require("express").Router();
const rewardRuleController = require("./rewardRule.controller");
const auth = require("../../middlewares/auth.middleware");
const { allowRole } = require("../../middlewares/role.middleware");

// Admin routes for reward rules
router.post(
    "/",
    auth,
    allowRole("ADMIN"),
    rewardRuleController.createRule
);

router.get(
    "/",
    auth,
    allowRole("ADMIN"),
    rewardRuleController.listRules
);

router.put(
    "/:id",
    auth,
    allowRole("ADMIN"),
    rewardRuleController.updateRule
);

router.patch(
    "/:id/status",
    auth,
    allowRole("ADMIN"),
    rewardRuleController.toggleStatus
);

module.exports = router;
