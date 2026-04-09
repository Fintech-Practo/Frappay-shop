const walletService = require("./wallet.service");
const walletRewardService = require("./walletReward.service");
const { redeemCoinsSchema } = require("./wallet.validation");

exports.getWallet = async (req, res) => {
    const wallet = await walletService.getWallet(req.user.userId);
    const redeemableBalance = await walletRewardService.getRedeemableBalance(req.user.userId);
    const redeemableValue = await walletRewardService.coinsToRupees(redeemableBalance);

    // coin_balance is the authoritative balance — set and maintained atomically in DB
    // Never compute from total_earned - total_redeemed (can be negative due to legacy data)
    const totalCoins = Math.max(0, parseFloat(wallet.coin_balance) || 0);
    const totalValue = await walletRewardService.coinsToRupees(totalCoins);

    res.json({
        success: true,
        data: {
            ...wallet,
            coins: totalCoins,
            value: totalValue,
            redeemable_coins: redeemableBalance,
            redeemable_value: redeemableValue,
            total_value: totalValue,
            locked_coins: Math.max(0, totalCoins - redeemableBalance)
        }
    });
};

exports.redeemCoins = async (req, res) => {

    const { error } = redeemCoinsSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { coins } = req.body;

    const result = await walletService.redeemCoins(
        req.user.userId,
        coins
    );

    res.json({
        success: true,
        data: result
    });
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await walletService.getTransactions(req.user.userId);
        res.json({
            success: true,
            data: transactions
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};