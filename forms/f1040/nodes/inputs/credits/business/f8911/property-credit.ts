import { z } from "zod";

// Schedule A (Form 8911), December 2025, lines 8–21.
// The caller must establish property eligibility and the increased-rate basis.
// This arithmetic does not establish PWA compliance, source ownership or filing.
export const propertyCreditInputSchema = z.object({
  cost: z.number().finite().nonnegative(),
  business_use_pct: z.number().finite().min(0).max(1).default(0),
  section179_deduction: z.number().finite().nonnegative().default(0),
  business_credit_rate: z.enum(["base", "increased"]).default("base"),
}).superRefine((input, ctx) => {
  if (input.section179_deduction > input.cost * input.business_use_pct) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["section179_deduction"],
      message: "Form 8911 section 179 deduction exceeds the business-use cost",
    });
  }
});

type PropertyCreditInput = z.input<typeof propertyCreditInputSchema>;

export function calculatePropertyCredit(raw: PropertyCreditInput) {
  const input = propertyCreditInputSchema.parse(raw);
  const businessCost = input.cost * input.business_use_pct;
  const netBusinessCost = businessCost - input.section179_deduction;
  const businessRate = input.business_credit_rate === "increased" ? 0.30 : 0.06;
  const businessCreditBeforeCap = netBusinessCost * businessRate;
  // Section 179 reduces only the business portion, not the personal portion.
  const personalCost = input.cost - businessCost;
  const personalCreditBeforeCap = personalCost * 0.30;
  return {
    cost: input.cost,
    businessUseFraction: input.business_use_pct,
    businessCost,
    section179Deduction: input.section179_deduction,
    netBusinessCost,
    businessRate,
    businessCreditBeforeCap,
    businessCredit: Math.min(businessCreditBeforeCap, 100_000),
    personalCost,
    personalCreditBeforeCap,
    personalCredit: Math.min(personalCreditBeforeCap, 1_000),
  };
}
