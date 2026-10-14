import { z } from "zod";
import {
  calculatePhysicalPresence2555,
  physicalPresenceFilingSchema,
} from "../../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";

const foreignSourceSchema = z.object({
  filing_details: physicalPresenceFilingSchema,
  foreign_wages: z.never().optional(),
  foreign_self_employment_income: z.never().optional(),
  days_in_foreign_country: z.never().optional(),
  foreign_housing_expenses: z.never().optional(),
  employer_housing_exclusion: z.never().optional(),
});

/** Recompute the supported employee exclusion, never trust a supplied addback. */
export function form8815ForeignAddback(
  pending: Readonly<Record<string, unknown>>,
): number {
  if (Object.keys(pending.form2555 ?? {}).length === 0) return 0;
  const source = foreignSourceSchema.parse(pending.form2555);
  const lines = calculatePhysicalPresence2555(source.filing_details, 2025);
  const wages = z.object({ line1h_other_earned: z.number().int() }).parse(
    pending.f1040,
  );
  const schedule1 = z.object({
    line8d_foreign_earned_income_exclusion: z.number().int(),
  }).parse(pending.schedule1);
  if (
    wages.line1h_other_earned !== lines.line19 ||
    schedule1.line8d_foreign_earned_income_exclusion !== lines.line45
  ) {
    throw new Error(
      "Form 8815 foreign addback differs from filed Form 2555 wages or exclusion",
    );
  }
  return lines.line45 + lines.line50;
}
