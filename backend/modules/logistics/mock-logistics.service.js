/**
 * Mock Logistics Service for development and testing
 * Simulates Logistics/Delhivery API responses without making actual network requests.
 */
module.exports = {

    async authenticate() {
        return "MOCK_TOKEN_" + Date.now();
    },

    async createShipment(order) {
        console.log("[MOCK] Creating shipment for order:", order.id);
        const shipmentId = 1000000 + Math.floor(Math.random() * 900000);
        const awbCode = "MOCKAWB" + Math.floor(Math.random() * 100000000);

        return {
            shipment_id: shipmentId,
            order_id: order.id,
            awb_code: awbCode,
            courier_name: "Mock Express",
            courier_company_id: 1,
            tracking_url: `https://www.delhivery.com/track/package/${awbCode}`,
            status: "NEW",
            onboarding_completed_now: 0
        };
    },

    async trackShipment(awb) {
        console.log("[MOCK] Tracking AWB:", awb);
        return {
            tracking_data: {
                track_status: 1,
                shipment_status: "IN TRANSIT",
                shipment_track: [{
                    status: "IN TRANSIT",
                    location: "Mock Hub",
                    activity_date: new Date().toISOString()
                }]
            }
        };
    },

    async trackByAWB(awb) {
        return this.trackShipment(awb);
    },

    async getCourierServiceability(params) {
        console.log("[MOCK] Checking serviceability:", params);

        const today = new Date();
        const minDays = 3;
        const maxDays = 5;

        const minDate = new Date(today);
        minDate.setDate(today.getDate() + minDays);

        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + maxDays);

        const formatDate = (date) => {
            const d = date;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        };

        return {
            status: 200,
            data: {
                available_courier_companies: [
                    {
                        courier_company_id: 1,
                        courier_name: "Mock Express",
                        rate: 45.00,
                        etd: `${formatDate(minDate)} - ${formatDate(maxDate)}`
                    }
                ]
            }
        };
    },

    async cancelShipment(shipmentId) {
        console.log("[MOCK] Cancelling shipment:", shipmentId);
        return { success: true, message: "Shipment cancelled in mock" };
    },

    async calculateShippingCharges(params) {
        console.log("[MOCK] Calculating shipping charges:", params);
        const { weight = 0.5, cod = 0, order_amount = 0 } = params;
        const { getDynamicMargin } = require("../shipping/shipping.util");

        const baseRate = 50;
        const margin = await getDynamicMargin(order_amount);
        let codCharges = 0;

        if (cod) {
            if (order_amount <= 300) codCharges = 30;
            else if (order_amount <= 500) codCharges = 40;
            else codCharges = 50;
        }

        const total = baseRate + margin + codCharges;

        return {
            success: true,
            data: {
                courier_name: "Mock Express",
                courier_company_id: 1,
                base_rate: baseRate,
                margin: Math.round(margin),
                cod_charges: codCharges,
                total_charge: total,
                estimated_delivery_days: "3-5",
                is_surface: true,
                weight: weight
            }
        };
    },

    async createReversePickup(order) {
        console.log("[MOCK] Creating reverse pickup for order:", order.id);
        return {
            success: true,
            awb_code: "MOCKRVP" + Math.floor(Math.random() * 100000000),
            message: "Reverse pickup scheduled in mock"
        };
    },

    async generateShippingLabel(waybill) {
        console.log("[MOCK] Generating shipping label for AWB:", waybill);
        return {
            success: true,
            label_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            packages: [{ pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }]
        };
    },

    async updateEwaybill(waybill, invoiceNumber, ewbNumber) {
        console.log("[MOCK] Updating E-Way Bill for AWB:", waybill, ewbNumber);
        return { success: true };
    }

};