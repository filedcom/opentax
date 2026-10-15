/** Source-independent Schedule 1-A arithmetic shared by year adapters. */
export function steppedDeductionPhaseout(
  magi: number,
  threshold: number,
  stepReduction: number,
  rounding: "down" | "up",
) {
  const excess = Math.max(0, magi - threshold);
  const steps = rounding === "down"
    ? Math.floor(excess / 1_000)
    : Math.ceil(excess / 1_000);
  return { excess, steps, reduction: steps * stepReduction };
}

export function seniorDeductionPerPerson(
  magi: number,
  threshold: number,
  maximum: number,
  rate: number,
) {
  const excess = Math.max(0, magi - threshold);
  const reduction = Math.round(excess * rate);
  return { excess, reduction, amount: Math.max(0, maximum - reduction) };
}
