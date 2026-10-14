import { z } from "zod";

/** Retained education compensation is money, not a pre-rounded filing line. */
export const educationMoney = z.number().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7,
  "Education compensation must have no fractional cents",
);
export function educationCents(amount: number): number {
  return Math.round(educationMoney.parse(amount) * 100);
}
export function sumEducationMoney(amounts: readonly number[]): number {
  const cents = amounts.reduce(
    (sum, amount) => sum + educationCents(amount),
    0,
  );
  if (!Number.isSafeInteger(cents)) {
    throw new Error("Education compensation total exceeds safe cent precision");
  }
  return cents / 100;
}
