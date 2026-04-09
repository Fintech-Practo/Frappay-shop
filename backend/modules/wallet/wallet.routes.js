const router = require("express").Router();
const walletController = require("./wallet.controller");
const auth = require("../../middlewares/auth.middleware");


router.get("/", auth, walletController.getWallet);
router.get("/transactions", auth, walletController.getTransactions);
router.post("/redeem", auth, walletController.redeemCoins);


module.exports = router;