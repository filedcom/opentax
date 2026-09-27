const LINE_1E_CAP_CENTS = 500_000;

/** Allocate the single Form 3800 line 1e cap across identified source credits. */
export function allocateDisabledAccessLine1eCredits(
  amounts: readonly number[],
): number[] {
  const cents = amounts.map((amount) => {
    const value = Math.round(amount * 100);
    if (
      !Number.isFinite(amount) || amount < 0 ||
      !Number.isSafeInteger(value) ||
      Math.abs(amount * 100 - value) > 0.000001
    ) {
      throw new Error("Form 3800 line 1e source needs nonnegative cents");
    }
    return value;
  });
  const total = cents.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error("Form 3800 line 1e source total exceeds safe cents");
  }
  if (total <= LINE_1E_CAP_CENTS) return [...amounts];

  const totalBigInt = BigInt(total);
  const shares = cents.map((amount, index) => {
    const numerator = BigInt(amount) * BigInt(LINE_1E_CAP_CENTS);
    return {
      index,
      cents: Number(numerator / totalBigInt),
      remainder: numerator % totalBigInt,
    };
  });
  const remaining = LINE_1E_CAP_CENTS -
    shares.reduce((sum, share) => sum + share.cents, 0);
  for (
    const share of [...shares].sort((left, right) =>
      left.remainder === right.remainder
        ? left.index - right.index
        : left.remainder > right.remainder
        ? -1
        : 1
    ).slice(0, remaining)
  ) {
    share.cents += 1;
  }
  return shares.map((share) => share.cents / 100);
}
