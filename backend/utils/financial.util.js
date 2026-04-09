/**
* financial.util.js
* Enterprise-grade financial utilities for Frap Pay Shop
* - GST calculation (CGST/SGST/IGST)
* - Number to Words (Indian English)
* - Safe number formatter
*/

/* ============================================================
   Safe Formatter — always returns a clean 2-decimal string
   Prevents NaN and floating-point errors throughout invoicing
   ============================================================ */
function fmt(n) {
    return Number(n || 0).toFixed(2);
}

/* ============================================================
   GST Calculation
   GST rules for India:
     - Intra-state: CGST (half) + SGST (half)
     - Inter-state:  IGST (full)
   For books (HSN 4901), standard rate is 0% (exempt), but
   stationery items may attract 5–12%. We default to 5%.
   ============================================================ */

/**
 * @param {number} sellingPrice  — Gross price per unit (tax-inclusive or exclusive)
 * @param {number} gstRate       — GST % (e.g. 5, 12, 18)
 * @param {boolean} isInterstate — true → IGST; false → CGST+SGST
 * @param {boolean} taxInclusive — true if sellingPrice already includes GST
 * @returns {{ netPrice, gstRate, taxAmount, cgst, sgst, igst, grossTotal }}
 */
function calculateGST(sellingPrice, gstRate = 5, isInterstate = false, taxInclusive = false) {
    const price = Number(sellingPrice || 0);
    const rate = Number(gstRate || 0);

    let netPrice, taxAmount;

    if (taxInclusive) {
        // Back-calculate: netPrice = price / (1 + rate/100)
        netPrice = price / (1 + rate / 100);
        taxAmount = price - netPrice;
    } else {
        netPrice = price;
        taxAmount = price * (rate / 100);
    }

    const grossTotal = netPrice + taxAmount;
    const halfTax = taxAmount / 2;

    return {
        netPrice: Number(netPrice.toFixed(2)),
        gstRate: rate,
        taxAmount: Number(taxAmount.toFixed(2)),
        cgst: isInterstate ? 0 : Number(halfTax.toFixed(2)),
        sgst: isInterstate ? 0 : Number(halfTax.toFixed(2)),
        igst: isInterstate ? Number(taxAmount.toFixed(2)) : 0,
        grossTotal: Number(grossTotal.toFixed(2)),
    };
}

/* ============================================================
   Number to Words — Indian English
   e.g. 1500.75 → "Rupees One Thousand Five Hundred and Seventy-Five Paise Only"
   ============================================================ */

const ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function _belowHundred(n) {
    if (n === 0) return '';
    if (n < 20) return ONES[n];
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return TENS[ten] + (one ? '-' + ONES[one] : '');
}

function _belowThousand(n) {
    if (n === 0) return '';
    if (n < 100) return _belowHundred(n);
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return ONES[hundred] + ' Hundred' + (rest ? ' ' + _belowHundred(rest) : '');
}

/**
 * Convert an integer to its Indian-English word representation.
 * Supports up to crores range.
 */
function _toWords(n) {
    if (n === 0) return 'Zero';

    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thou = Math.floor(n / 1000);
    n %= 1000;
    const rest = n;

    let parts = [];
    if (crore) parts.push(_belowThousand(crore) + ' Crore');
    if (lakh) parts.push(_belowThousand(lakh) + ' Lakh');
    if (thou) parts.push(_belowThousand(thou) + ' Thousand');
    if (rest) parts.push(_belowThousand(rest));

    return parts.join(' ');
}

/**
 * Full converter: handles rupees + paise
 * @param {number} amount — e.g. 1500.75
 * @returns {string} — e.g. "Rupees One Thousand Five Hundred and Seventy-Five Paise Only"
 */
function numberToWords(amount) {
    const num = Math.abs(Number(amount || 0));
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = 'Rupees ' + _toWords(rupees);
    if (paise > 0) {
        result += ' and ' + _toWords(paise) + ' Paise';
    }
    result += ' Only';
    return result;
}

/**
 * Format date to DD/MM/YYYY
 * @param {Date|string} date 
 * @returns {string}
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

module.exports = { fmt, calculateGST, numberToWords, formatDate };

