/** Retained issued/administrator monetary facts have cents; filed lines have dollars.
 * IRS 2025 i1040gi: add amounts including cents and round only the total.
 * IRS 2025 Form 4972: NUA worksheet C and line 20 use >= three decimal places.
 */
export function isSourceMoney(value: number): boolean {
  return Number.isFinite(value) && value >= 0 &&
    Number.isSafeInteger(Math.round(value * 100)) &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
}
export function sourceCents(value: number): number {
  return Math.round(value * 100);
}
export function sameSourceMoney(actual: number, expected: number): boolean {
  return isSourceMoney(actual) && sourceCents(actual) === sourceCents(expected);
}
export function worksheetRatio(numerator: number, denominator: number): number {
  const [a, aScale] = decimalUnits(numerator);
  const [b, bScale] = decimalUnits(denominator);
  return roundedQuotient(a * bScale * 100_000n, b * aScale) / 100_000;
}
export function partialNuaWorksheet(
  taxable: number,
  gain: number,
  nua: number,
) {
  const ratio = gain > 0 ? worksheetRatio(gain, taxable) : 0;
  const capital = nua * ratio;
  return { ratio, capital, ordinary: nua - capital };
}

// These worksheets use source money (two decimal places), source percentages,
// and five-place worksheet ratios. Preserve decimal half-dollar/half-cent ties
// instead of letting the binary representation choose the wrong filed dollar.
function decimalUnits(value: number, places = 7): [bigint, bigint] {
  const [whole, fraction = ""] = value.toFixed(places).split(".");
  return [BigInt(whole + fraction), 10n ** BigInt(places)];
}
function percentageUnits(value: number): [bigint, bigint] {
  const [mantissa, exponentText] = String(value).toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const exponent = Number(exponentText ?? 0) - fraction.length;
  const digits = BigInt(whole + fraction);
  return exponent >= 0
    ? [digits * 10n ** BigInt(exponent), 1n]
    : [digits, 10n ** BigInt(-exponent)];
}
function roundedQuotient(numerator: bigint, denominator: bigint): number {
  return Number((numerator * 2n + denominator) / (denominator * 2n));
}
export function allocatedSourceCents(
  amount: number,
  percentage: number,
): number {
  const [pct, scale] = percentageUnits(percentage);
  return roundedQuotient(BigInt(sourceCents(amount)) * pct, scale * 100n);
}
export function grossedSourceCents(amount: number, percentage: number): number {
  const [pct, scale] = percentageUnits(percentage);
  return roundedQuotient(BigInt(sourceCents(amount)) * 100n * scale, pct);
}
export function roundRecipientTax(fullTax: number, percentage: number): number {
  const [pct, scale] = percentageUnits(percentage);
  return roundedQuotient(BigInt(fullTax) * pct, scale * 100n);
}
export function filedDollars(amount: number): number {
  const [units, scale] = decimalUnits(amount);
  return roundedQuotient(units, scale);
}
export function grossedSourceDollars(
  amount: number,
  percentage: number,
): number {
  const [units, amountScale] = decimalUnits(amount);
  const [pct, pctScale] = percentageUnits(percentage);
  return roundedQuotient(units * 100n * pctScale, amountScale * pct);
}
/** Shift the issued percentage two decimal places without a binary tail or
 * silently rounding a more precise issued percentage to fit native MeF.
 */
export function sourceDistributionFraction(percentage: number): string {
  const [mantissa, exponentText] = String(percentage).toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const digits = whole + fraction;
  const places = fraction.length - Number(exponentText ?? 0) + 2;
  if (places <= 0) return digits + "0".repeat(-places);
  const padded = digits.padStart(places + 1, "0");
  return `${padded.slice(0, -places)}.${padded.slice(-places)}`
    .replace(/0+$/, "").replace(/\.$/, "");
}
