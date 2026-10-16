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
  return fromIntegers(BigInt(numerator), BigInt(denominator));
}
function fromIntegers(numerator: bigint, denominator: bigint): HsaExactAmount {
  let a = numerator, b = denominator;
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  const n = numerator / a, d = denominator / a;
  if (
    n > BigInt(Number.MAX_SAFE_INTEGER) || d > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw Error("HSA exact amount exceeds JSON-safe integer precision");
  }
  return { numerator: Number(n), denominator: Number(d) };
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

/** Rational operations preserve source cents and monthly fractions together.
 * Intermediate cross-products use BigInt; only reduced JSON components convert. */
export const hsaExactArithmetic = {
  add(a: HsaExactAmount, b: HsaExactAmount): HsaExactAmount {
    return fromIntegers(
      BigInt(a.numerator) * BigInt(b.denominator) +
        BigInt(b.numerator) * BigInt(a.denominator),
      BigInt(a.denominator) * BigInt(b.denominator),
    );
  },
  subtractFloorZero(a: HsaExactAmount, b: HsaExactAmount): HsaExactAmount {
    const numerator = BigInt(a.numerator) * BigInt(b.denominator) -
      BigInt(b.numerator) * BigInt(a.denominator);
    return numerator <= 0n
      ? hsaExactAmount(0, 1)
      : fromIntegers(numerator, BigInt(a.denominator) * BigInt(b.denominator));
  },
  min(a: HsaExactAmount, b: HsaExactAmount): HsaExactAmount {
    return compareHsaAmounts(a, b) <= 0 ? a : b;
  },
};
