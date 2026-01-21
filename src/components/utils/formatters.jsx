/**
 * Format a number as currency with no decimal places (rounded to nearest dollar)
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0';
  }
  return '$' + Math.round(amount).toLocaleString('en-US');
}

/**
 * Format a number as currency with cents for input fields
 */
export function formatCurrencyWithCents(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return '$' + parseFloat(amount).toFixed(2);
}

/**
 * Parse currency input string to number
 */
export function parseCurrencyInput(value) {
  if (!value) return 0;
  const cleaned = value.toString().replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Get month name from number (1-12)
 */
export function getMonthName(monthNumber) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || '';
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}