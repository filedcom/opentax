import { z } from "zod";
import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/index.ts";
import { isSourceMoney } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
  "Retirement money needs exact cents",
);
const date = z.string().date();
const address = z.object({
  street: ref,
  suite: z.string().optional(),
  city: ref,
  state_or_province: z.string(),
  country: ref,
  postal_code: ref,
}).strict();

/** Issued 2026 box facts. Advanced codes/boxes remain visible for explicit diagnostics. */
export const retirementCopy2026Schema = z.object({
  tax_year: z.literal(2026),
  source_document_reference: ref,
  issued_copy_pdf_base64: ref.optional(),
  issued_copy_pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  issued_copy_attachment_file_name: z.string().regex(
    /^[A-Za-z0-9][A-Za-z0-9_.-]*\.pdf$/,
  ).optional(),
  statement_identifier: ref,
  current_copy_review_reference: ref,
  corrected: z.boolean(),
  supersedes_document_reference: ref.optional(),
  payer_name: ref,
  payer_tin: tin,
  payer_address: address.optional(),
  recipient: z.enum(["taxpayer", "spouse"]),
  recipient_name: ref,
  recipient_tin: z.string().regex(/^(\d{9}|\d{3}-\d{2}-\d{4}|XXX-XX-\d{4})$/),
  recipient_identity_review_reference: ref,
  recipient_address: address.optional(),
  account_number: ref,
  box1_gross_distribution: money,
  box2a_taxable_amount: money.optional(),
  box2b_taxable_amount_not_determined: z.boolean(),
  box2b_total_distribution: z.boolean(),
  box3_capital_gain: money.default(0),
  box4_federal_withheld: money.default(0),
  box5_employee_contributions: money.default(0),
  box6_nua: money.default(0),
  box7a_distribution_codes: z.array(z.nativeEnum(DistributionCode)).min(1).max(
    2,
  ),
  box7b_ira_sep_simple: z.boolean(),
  box7c_trump_account: z.boolean(),
  box7d_excess_contribution_earnings: money.default(0),
  box8a_other_amount: money.default(0),
  box8b_annuity_percentage: z.number().min(0).max(100).optional(),
  box9a_percentage_of_total: z.number().min(0).max(100).optional(),
  box9b_employee_contributions: money.default(0),
  box10_irr_within_five_years: money.default(0),
  box11_first_roth_year: z.number().int().min(1998).max(2026).optional(),
  box12_fatca: z.boolean().default(false),
  box13_payment_date: date.optional(),
  state_information: z.array(
    z.object({
      state: ref,
      payer_state_id: ref,
      box14_state_withheld: money,
      box16_state_distribution: money,
    }).strict(),
  ).max(2).default([]),
  local_information: z.array(
    z.object({
      locality: ref,
      box17_local_withheld: money,
      box19_local_distribution: money,
    }).strict(),
  ).max(2).default([]),
}).strict();
/** Calendar anniversaries clamp a leap/month-end day instead of rolling into another month. */
export function addCalendarMonths(value: string, months: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}
