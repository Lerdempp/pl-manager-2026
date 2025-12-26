export const getTransferWindows = (seasonStartWeek: number, totalWeeks: number) => {
  return {
    summerWindow: { start: 1, end: 4 }, // First 4 weeks of season
    winterWindow: { start: Math.floor(totalWeeks / 2) - 1, end: Math.floor(totalWeeks / 2) } // 2 weeks mid-season
  };
};

export const isTransferWindowOpen = (week: number, totalWeeks: number): boolean => {
  const windows = getTransferWindows(1, totalWeeks);
  const inSummerWindow = week >= windows.summerWindow.start && week <= windows.summerWindow.end;
  const inWinterWindow = week >= windows.winterWindow.start && week <= windows.winterWindow.end;
  return inSummerWindow || inWinterWindow;
};

export const canPlayMatches = (week: number, totalWeeks: number): boolean => {
  return !isTransferWindowOpen(week, totalWeeks);
};

