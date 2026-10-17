/** Monetary PDF text rounds numbers; preserve the filed QBI percentage precision. */
export function qbiPercentageForPdf(ratio: number): number | string {
  // The native ratio has five decimals, corresponding to three percent decimals.
  const percent = Number((ratio * 100).toFixed(3));
  return Number.isInteger(percent) ? percent : percent.toString();
}
