/** Add source money in cents, then round the amount entered on one 8962 line. */
export function roundForm8962Amounts(amounts: readonly number[]): number {
  let totalCents = 0;
  for (const amount of amounts) {
    const cents = Math.round(amount * 100);
    if (
      !Number.isFinite(amount) || amount < 0 ||
      !Number.isSafeInteger(cents) ||
      Math.abs(amount - cents / 100) > 1e-7 ||
      !Number.isSafeInteger(totalCents + cents)
    ) {
      throw new Error("Form 8962 source amount needs safe cent precision");
    }
    totalCents += cents;
  }
  return Math.floor(totalCents / 100) + (totalCents % 100 >= 50 ? 1 : 0);
}
