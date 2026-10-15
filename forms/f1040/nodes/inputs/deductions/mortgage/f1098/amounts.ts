/** Pub. 936 Table 1; callers establish qualified residences and debt categories. */
export function mortgageDebtLimit(averages: {
  grandfathered: number;
  pre2017: number;
  post2017: number;
  total: number;
}, caps: { pre2017: number; post2017: number }) {
  const line6 = Math.min(
    Math.max(averages.grandfathered, caps.pre2017),
    averages.grandfathered + averages.pre2017,
  );
  const line9 = Math.max(line6, caps.post2017);
  const line11 = Math.min(line9, line6 + averages.post2017);
  return {
    line6,
    line9,
    line11,
    line12: averages.total,
    ratio: averages.total === 0
      ? 0
      : Math.min(1, Math.round(line11 / averages.total * 1000) / 1000),
  };
}

/** Same rounding used by the existing refinance-points calculation. */
export function ratableMortgagePoints(
  interestPoints: number,
  immediatePoints: number,
  paymentMonths: number,
  termMonths: number,
  ratio = 1,
  wholeDollars = true,
) {
  const amount = (immediatePoints +
    (interestPoints - immediatePoints) * paymentMonths / termMonths) * ratio;
  return wholeDollars ? Math.round(amount) : amount;
}
