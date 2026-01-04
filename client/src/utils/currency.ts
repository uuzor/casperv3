/**
 * Currency conversion utilities for Casper blockchain
 */

/**
 * Convert CSPR to motes (smallest unit)
 * 1 CSPR = 1,000,000,000 motes (10^9)
 */
export const CSPRToMotes = (cspr: number | string):  number => {
  const amount = typeof cspr === 'string' ? parseFloat(cspr) : cspr;
  return (amount * 1_000_000_000);
};

/**
 * Convert motes to CSPR
 */
export const motesToCSPR = (motes: string | number): number => {
  const amount = typeof motes === 'string' ? parseInt(motes, 10) : motes;
  return amount / 1_000_000_000;
};

/**
 * Format CSPR amount for display
 */
export const formatCSPR = (motes: string | number): string => {
  const cspr = motesToCSPR(motes);
  return cspr.toFixed(2);
};

/**
 * Format CSPR amount with currency symbol
 */
export const formatCSPRWithSymbol = (motes: string | number): string => {
  return `${formatCSPR(motes)} CSPR`;
};
