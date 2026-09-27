/**
 * Business standard mileage rates from Notice 2025-5, Notice 2026-10, and
 * Announcement 2026-11 (IRB 2026-29). The 2026 change applies July 1.
 */
export function businessMileageDeduction(
  taxYear: number,
  totalBusinessMiles: number,
  milesJanJun2026?: number,
  milesJulDec2026?: number,
): number {
  if (taxYear === 2025) {
    if (milesJanJun2026 !== undefined || milesJulDec2026 !== undefined) {
      throw new Error("TY2026 mileage periods cannot be used on a TY2025 return");
    }
    return totalBusinessMiles * 0.70;
  }
  if (taxYear === 2026) {
    if (milesJanJun2026 === undefined || milesJulDec2026 === undefined) {
      throw new Error("TY2026 standard mileage requires miles in both half-year periods");
    }
    if (milesJanJun2026 + milesJulDec2026 !== totalBusinessMiles) {
      throw new Error("TY2026 half-year business miles must sum to total business miles");
    }
    return milesJanJun2026 * 0.725 + milesJulDec2026 * 0.76;
  }
  throw new Error(`No business mileage rate for TY${taxYear}`);
}
