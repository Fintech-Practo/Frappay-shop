const axios = require("axios");
const db = require("../config/db");
const logger = require("../utils/logger");
const templateStrings = require("../config/smsTemplateStrings");


/**
 * Core SMS sender with logging and retry support.
 * @param {Object} params
 * @param {string} params.phone - Phone number in format 91XXXXXXXXXX
 * @param {string} params.templateId - DLT approved template ID
 * @param {Object} params.variables - Template variables e.g. { NAME: "John", ORDER_ID: "123" }
 * @param {number} [params.orderId] - Optional order ID for tracking
 * @param {string} [params.eventType] - Optional event type for tracking (e.g., 'ORDER_SHIPPED')
 */
const sendSMS = async ({ phone, templateId, variables, orderId = null, eventType = null }) => {
  // 1. Normalize Phone Number
  let numericPhone = String(phone).replace(/\D/g, ""); // strip all non-numeric
  
  if (numericPhone.length === 10) {
    numericPhone = "91" + numericPhone;
  } else if (numericPhone.length === 11 && numericPhone.startsWith("0")) {
    numericPhone = "91" + numericPhone.substring(1);
  }
  
  // Standard Indian format with + prefix: +91XXXXXXXXXX
  const normalizedPhone = "+" + numericPhone;

  const baseUrl = process.env.SMARTPING_BASE_URL;
  const apiKey = process.env.SMARTPING_API_KEY;
  const senderId = process.env.SMARTPING_SENDER_ID;

  if (!baseUrl || !apiKey || apiKey === "your_api_key") {
    logger.error("Smart Ping SMS Configuration Missing", { baseUrl, senderId });
    return { success: false, error: "SMS configuration incomplete" };
  }

  // 2. Resolve and Fill Template
  let finalMessage = "";

  // Normalize eventType/Type for mapping
  const resolvedType = eventType || (templateId === process.env.SMS_TEMPLATE_OTP ? "OTP" : null);

  if (resolvedType && templateStrings[resolvedType]) {
    finalMessage = templateStrings[resolvedType];
    for (const [key, value] of Object.entries(variables || {})) {
      // Support both specific keys like {#OTP#} and generic {#var#} placeholders
      // Note: Sequential replacement of {#var#} depends on the order of keys in the variables object
      const specificPlaceholder = `{#${key}#}`;
      if (finalMessage.includes(specificPlaceholder)) {
        finalMessage = finalMessage.replace(specificPlaceholder, value);
      } else {
        finalMessage = finalMessage.replace('{#var#}', value);
      }
    }
  } else if (variables && variables.OTP) {
    // Direct OTP fallback if resolution failed but OTP variable is present
    finalMessage = `Your OTP for login is ${variables.OTP}. Do not share this with anyone. Valid for 5 minutes. - Books & Copies. PRACTOMIND`;
  } else if (templateId === process.env.SMS_TEMPLATE_OTP) {
    // absolute fallback for OTP if variables was somehow missing something
    finalMessage = "Your OTP from Books & Copies is being processed. Please check your account.";
  }

  // Final validation to prevent "message field is required" error
  if (!finalMessage) {
    finalMessage = "Notification from Books & Copies";
  }

  finalMessage = finalMessage.trim();

  try {
    const payload = {
      api_key: apiKey,
      phone_number: normalizedPhone,
      sender_name: senderId,
      message: finalMessage,
      template_id: templateId,
    };

    const response = await axios.post(baseUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 8000,
    });

    // Log success to DB
    await db.query(
      "INSERT INTO sms_logs (phone, template_id, status, response, order_id, event_type) VALUES (?, ?, ?, ?, ?, ?)",
      [normalizedPhone, templateId, "SENT", JSON.stringify(response.data), orderId, eventType]
    ).catch((err) => logger.warn("SMS log insert failed (SENT)", { error: err.message }));

    // Security-safe logging: show phone and first 5 chars of message
    logger.info("SMS request sent to provider", { 
      phone: normalizedPhone, 
      templateId, 
      msgPrefix: finalMessage.substring(0, 5) + "...",
      apiResponse: response.data 
    });

    return { success: true, data: response.data };
  } catch (error) {
    const errPayload = error.response?.data || error.message;

    // Log failure to DB
    await db.query(
      "INSERT INTO sms_logs (phone, template_id, status, response, order_id, event_type) VALUES (?, ?, ?, ?, ?, ?)",
      [normalizedPhone, templateId, "FAILED", JSON.stringify(errPayload), orderId, eventType]
    ).catch((err) => logger.warn("SMS log insert failed (FAILED)", { error: err.message }));

    logger.error("SMS send failed", { phone: normalizedPhone, templateId, orderId, eventType, error: errPayload });

    return { success: false, error: errPayload };
  }
};

/**
 * Send SMS with automatic retry logic.
 * @param {Object} data - Same params as sendSMS
 * @param {number} retries - Number of retry attempts (default: 3)
 */
const sendWithRetry = async (data, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    const result = await sendSMS(data);
    if (result.success) return result;
    logger.warn(`SMS retry attempt ${i + 1} of ${retries} failed`, { phone: data.phone });
  }
  logger.error("SMS failed after all retries", { phone: data.phone, templateId: data.templateId });
  return { success: false, error: "Exhausted all retries" };
};

module.exports = { sendSMS, sendWithRetry };