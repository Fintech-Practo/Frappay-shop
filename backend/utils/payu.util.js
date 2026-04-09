const crypto = require('crypto');
const env = require('../config/env');

/**
 * PayU Hash Calculation Utility
 * Sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
 */
function generateHash(data) {
    const {
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1 = '',
        udf2 = '',
        udf3 = '',
        udf4 = '',
        udf5 = ''
    } = data;

    const key = env.payu.merchantKey;
    const salt = env.payu.merchantSalt;

    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;

    return crypto.createHash('sha512').update(hashString).digest('hex');
}

/**
 * Verify PayU Response Hash (Reverse Hash)
 * Sequence: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 */
function verifyHash(payload) {
    // SECURITY: Validate required fields and hash presence
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const {
        status,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1 = '',
        udf2 = '',
        udf3 = '',
        udf4 = '',
        udf5 = '',
        hash: receivedHash,
        additional_charges = ''
    } = payload;

    // SECURITY: Ensure hash is present and non-empty
    if (!receivedHash || typeof receivedHash !== 'string' || receivedHash.length === 0) {
        return false;
    }

    // SECURITY: Validate required fields
    if (!status || !txnid || !amount || !email) {
        return false;
    }

    const key = env.payu.merchantKey;
    const salt = env.payu.merchantSalt;

    // SECURITY: Ensure credentials are configured
    if (!key || !salt) {
        console.error('PayU credentials not configured');
        return false;
    }

    let hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;

    // If additional charges are sent by PayU
    if (additional_charges) {
        hashString = `${additional_charges}|${hashString}`;
    }

    const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
    console.log(`DEBUG: PayU Verification - Calculated: ${calculatedHash}, Received: ${receivedHash}`);
    if (calculatedHash !== receivedHash) {
        console.log(`DEBUG: Verification Mismatch! String used: ${hashString}`);
    }

    // SECURITY: Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(calculatedHash, 'hex'),
        Buffer.from(receivedHash, 'hex')
    );
}

module.exports = {
    generateHash,
    verifyHash
};