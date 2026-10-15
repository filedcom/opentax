/** Whole-dollar proportional allocation. The caller owns the reviewed tax method;
 * this helper only conserves dollars and makes rounding independent of row order. */
export function allocateSourceDollars2026(
  amount: number,
  rows: readonly { reference: string; weight: number }[],
) {
  if (
    !Number.isSafeInteger(amount) || amount < 0 ||
    rows.some((r) => !Number.isSafeInteger(r.weight) || r.weight < 0) ||
    new Set(rows.map((r) => r.reference)).size !== rows.length
  ) {
    throw new Error(
      "Source allocation needs safe nonnegative dollars and unique references",
    );
  }
  const total = rows.reduce((n, r) => n + BigInt(r.weight), 0n);
  if (BigInt(amount) > total) {
    throw new Error("Allocation exceeds source weights");
  }
  const shares = rows.map((r) => ({
    ...r,
    amount: total ? Number(BigInt(amount) * BigInt(r.weight) / total) : 0,
    remainder: total ? BigInt(amount) * BigInt(r.weight) % total : 0n,
  }));
  let residual = amount - shares.reduce((n, r) => n + r.amount, 0);
  for (
    const r of [...shares].sort((a, b) =>
      a.remainder === b.remainder
        ? a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0
        : a.remainder > b.remainder
        ? -1
        : 1
    )
  ) if (residual-- > 0) r.amount++;
  return shares.map(({ remainder: _remainder, ...r }) => r);
}
