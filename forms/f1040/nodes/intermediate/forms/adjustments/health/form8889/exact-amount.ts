/** Exact dollars for monthly HSA limits and agreed spouse shares. JSON-safe
 * integer components retain fractions of a cent until the actual form line. */
export interface HsaExactAmount {
  numerator: number;
  denominator: number;
}
export function hsaExactAmount(
  numerator: number,
  denominator: number,
): HsaExactAmount {
  if (
    !Number.isSafeInteger(numerator) || numerator < 0 ||
    !Number.isSafeInteger(denominator) || denominator <= 0
  ) {
    throw Error(
      "HSA exact amount needs nonnegative safe integer units and a positive denominator",
    );
  }
  let a = BigInt(numerator), b = BigInt(denominator);
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return {
    numerator: Number(BigInt(numerator) / a),
    denominator: Number(BigInt(denominator) / a),
  };
}
export function compareHsaAmounts(
  a: HsaExactAmount,
  b: HsaExactAmount,
): -1 | 0 | 1 {
  const left = BigInt(a.numerator) * BigInt(b.denominator);
  const right = BigInt(b.numerator) * BigInt(a.denominator);
  return left < right ? -1 : left > right ? 1 : 0;
}
export function roundHsaAmount(a: HsaExactAmount): number {
  return Number(
    (2n * BigInt(a.numerator) + BigInt(a.denominator)) /
      (2n * BigInt(a.denominator)),
  );
}
