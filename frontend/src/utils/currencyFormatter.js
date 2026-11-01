/**
 * Currency Formatter Utility for KCT AI Smart Library (Feature 3)
 * Formats all financial amounts into Indian Rupees (₹) using en-IN locale
 * e.g. ₹50.00, ₹100.00, ₹1,500.00, ₹10,000.00, ₹1,00,000.00
 */

export function formatINR(amount, options = {}) {
  const num = Number(amount) || 0;
  const { decimals = 2, showSymbol = true } = options;

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);

  return showSymbol ? `₹${formatted}` : formatted;
}

export default formatINR;

