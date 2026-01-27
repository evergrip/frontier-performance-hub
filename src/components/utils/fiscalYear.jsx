export const getFiscalYearLabel = (fiscalYear, fiscalStartMonth = 10, isCurrent = false) => {
  const startYear = fiscalYear;
  const endYear = fiscalYear + 1;
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonthName = monthNames[fiscalStartMonth - 1];
  const endMonthName = monthNames[(fiscalStartMonth - 2 + 12) % 12];
  
  const startDay = 1;
  const endMonth = (fiscalStartMonth - 2 + 12) % 12;
  const endDay = new Date(endYear, endMonth + 1, 0).getDate();
  
  const label = `FY ${fiscalYear}${isCurrent ? ' (Current)' : ''} (${startMonthName} ${startDay}, ${startYear} - ${endMonthName} ${endDay}, ${endYear})`;
  return label;
};