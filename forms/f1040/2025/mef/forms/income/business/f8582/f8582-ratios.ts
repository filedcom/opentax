export function worksheetRatios(amounts: readonly number[]): string[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0) return [];
  let allocatedUnits = 0;
  return amounts.map((amount, index) => {
    const units = index === amounts.length - 1
      ? 100_000 - allocatedUnits
      : Math.round((amount / total) * 100_000);
    if (units <= 0 || units > 100_000) {
      throw new Error(
        "Form 8582 activity loss ratios cannot be represented at five decimals",
      );
    }
    allocatedUnits += units;
    return (units / 100_000).toFixed(5);
  });
}
