/**
 * Gets fiscal year date range and label.
 * 
 * FISCAL YEAR NAMING CONVENTION:
 * The fiscalYear parameter represents the calendar year in which the fiscal period ENDS.
 * 
 * Example: For a fiscal year starting October 1, 2025 and ending September 30, 2026:
 * - fiscalYear = 2026
 * - Returns: Oct 1, 2025 - Sep 30, 2026
 * 
 * @param {number} fiscalYear - The calendar year in which the fiscal year ends (e.g., 2026)
 * @param {number} fiscalStartMonth - Month the fiscal year starts (1-12, where 1=Jan, 10=Oct)
 * @param {boolean} isCurrent - Whether to append "(Current)" to the label
 * @returns {object} { startDate: Date, endDate: Date, label: string }
 */
export const getFiscalYearDates = (fiscalYear, fiscalStartMonth = 10, isCurrent = false) => {
  // The fiscal year ends in the specified year, so it starts in the previous calendar year
  const startYear = fiscalYear - 1;
  const endYear = fiscalYear;
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonthName = monthNames[fiscalStartMonth - 1];
  const endMonthName = monthNames[(fiscalStartMonth - 2 + 12) % 12];
  
  // Start date: First day of the fiscal start month in the start year
  const startDate = new Date(startYear, fiscalStartMonth - 1, 1);
  
  // End date: Last day of the month before fiscal start month in the end year
  const endMonth = (fiscalStartMonth - 2 + 12) % 12;
  const endDate = new Date(endYear, endMonth + 1, 0); // Day 0 gives last day of previous month
  
  const label = `FY ${fiscalYear}${isCurrent ? ' (Current)' : ''} (${startMonthName} 1, ${startYear} - ${endMonthName} ${endDate.getDate()}, ${endYear})`;
  
  return {
    startDate,
    endDate,
    label
  };
};

/**
 * Legacy function for backward compatibility.
 * Returns only the label string.
 */
export const getFiscalYearLabel = (fiscalYear, fiscalStartMonth = 10, isCurrent = false) => {
  return getFiscalYearDates(fiscalYear, fiscalStartMonth, isCurrent).label;
};