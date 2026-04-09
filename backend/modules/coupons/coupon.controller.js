const couponService = require("./coupon.service");
const { createCouponSchema } = require("./coupon.validation");

exports.createCoupon = async (req, res) => {

    const { error } = createCouponSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            error: error.details[0].message
        });
    }

    try {

        const coupon = await couponService.createCoupon(
            req.body,
            req.user.userId
        );

        res.json({
            success: true,
            message: "Coupon created successfully",
            data: coupon
        });

    } catch (err) {

        res.status(400).json({
            error: err.message
        });

    }
};

exports.getCoupons = async (req, res) => {

    const coupons = await couponService.getAllCoupons();

    res.json({
        success: true,
        data: coupons
    });

};

exports.toggleCouponStatus = async (req, res) => {

    try {

        const result = await couponService.toggleCouponStatus(
            req.params.id
        );

        res.json({
            success: true,
            message: result.message
        });

    } catch (err) {

        res.status(400).json({
            error: err.message
        });

    }
};

exports.validateCoupon = async (req, res) => {
    try {
        const { code, amount } = req.body;
        if (!code || !amount) {
            return res.status(400).json({ error: "Code and amount are required" });
        }

        const data = await couponService.validateCoupon(code, amount, req.user.userId);

        res.json({
            success: true,
            data: {
                id: data.id,
                code: data.code,
                value: data.discountAmount,
                type: data.discount_type,
                discount_percentage: data.discount_value
            }
        });

    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message
        });
    }
};