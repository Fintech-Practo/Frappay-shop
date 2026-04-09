const env = require("../../config/env");
const mock = require("./mock-logistics.service");
const delhivery = require("./delhivery.service");

/**
 * Logistics Provider Switcher
 * Decides whether to use Delhivery API or Mock responses
 */
function getProvider() {
    const mode = process.env.LOGISTICS_PROVIDER;

    if (mode === "mock") {
        console.log("LOGISTICS: Using MOCK Provider");
        return mock;
    }

    console.log("LOGISTICS: Using DELHIVERY Provider");
    return delhivery;
}

module.exports = getProvider();