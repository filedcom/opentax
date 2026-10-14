import { z } from "zod";

const sourceReference = z.string().trim().min(1);
const whole = z.number().int();
const nonnegative = z.number().int().nonnegative();

// This narrow loss-year review establishes only regular-tax 2024 NOL.
// It does not establish a 2025 deduction or an independently refigured ATNOL.
export const reviewed2024BusinessLossSchema = z.object({
  owner_ssn: z.string().regex(/^\d{9}$/),
  filed_form1040: z.object({
    tax_year: z.literal(2024),
    source_document_reference: sourceReference,
    owner_ssn: z.string().regex(/^\d{9}$/),
    single_filing_status_confirmed: z.literal(true),
    no_other_income_sources_confirmed: z.literal(true),
    line8_additional_income: whole.negative(),
    line9_total_income: whole.negative(),
    line10_adjustments: z.literal(0),
    line11_agi: whole.negative(),
    line12_standard_deduction: nonnegative.positive(),
    no_itemized_deductions_confirmed: z.literal(true),
  }).strict(),
  filed_schedule_c: z.object({
    tax_year: z.literal(2024),
    source_document_reference: sourceReference,
    owner_ssn: z.string().regex(/^\d{9}$/),
    line31_net_loss: whole.negative(),
    nonfarming_business_confirmed: z.literal(true),
  }).strict(),
  filed_schedule1: z.object({
    tax_year: z.literal(2024),
    source_document_reference: sourceReference,
    owner_ssn: z.string().regex(/^\d{9}$/),
    line3_business_income_or_loss: whole.negative(),
    line10_additional_income: whole.negative(),
    no_other_additional_income_confirmed: z.literal(true),
  }).strict(),
  filed_form172: z.object({
    tax_year: z.literal(2024),
    source_document_reference: sourceReference,
    owner_ssn: z.string().regex(/^\d{9}$/),
    part_i_line1: whole.negative(),
    part_i_line6_nonbusiness_deductions: nonnegative.positive(),
    part_i_line9_excess_nonbusiness_deductions: nonnegative.positive(),
    part_i_line24_nol: whole.negative(),
    other_part_i_lines: z.object({
      line2: z.literal(0),
      line3: z.literal(0),
      line4: z.literal(0),
      line5: z.literal(0),
      line7: z.literal(0),
      line8: z.literal(0),
      line10: z.literal(0),
      line11: z.literal(0),
      line12: z.literal(0),
      line13: z.literal(0),
      line14: z.literal(0),
      line15: z.literal(0),
      line16: z.literal(0),
      line17: z.literal(0),
      line18: z.literal(0),
      line19: z.literal(0),
      line20: z.literal(0),
      line21: z.literal(0),
      line22: z.literal(0),
      line23: z.literal(0),
    }).strict(),
  }).strict(),
}).strict();

export type Reviewed2024BusinessLoss = z.infer<
  typeof reviewed2024BusinessLossSchema
>;

/** Replays one simple nonfarm loss-year Form 172 Part I into a regular NOL. */
export function review2024BusinessLoss(
  raw: unknown,
): { lossYear: 2024; ownerSsn: string; regularNolTo2025: number } {
  const source = reviewed2024BusinessLossSchema.parse(raw);
  const f1040 = source.filed_form1040;
  const scheduleC = source.filed_schedule_c;
  const schedule1 = source.filed_schedule1;
  const f172 = source.filed_form172;
  const references = [
    f1040.source_document_reference,
    scheduleC.source_document_reference,
    schedule1.source_document_reference,
    f172.source_document_reference,
  ];
  if (
    new Set(references).size !== references.length ||
    f1040.owner_ssn !== source.owner_ssn ||
    scheduleC.owner_ssn !== source.owner_ssn ||
    schedule1.owner_ssn !== source.owner_ssn ||
    f172.owner_ssn !== source.owner_ssn ||
    schedule1.line3_business_income_or_loss !== scheduleC.line31_net_loss ||
    schedule1.line10_additional_income !==
      schedule1.line3_business_income_or_loss ||
    f1040.line8_additional_income !== schedule1.line10_additional_income ||
    f1040.line9_total_income !== f1040.line8_additional_income ||
    f1040.line11_agi !== f1040.line9_total_income ||
    f172.part_i_line1 !==
      f1040.line11_agi - f1040.line12_standard_deduction ||
    f172.part_i_line6_nonbusiness_deductions !==
      f1040.line12_standard_deduction ||
    f172.part_i_line9_excess_nonbusiness_deductions !==
      f172.part_i_line6_nonbusiness_deductions ||
    f172.part_i_line24_nol !==
      f172.part_i_line1 + f172.part_i_line9_excess_nonbusiness_deductions ||
    f172.part_i_line24_nol !== scheduleC.line31_net_loss
  ) {
    throw new Error(
      "2024 business NOL needs matching filed Form 1040, Schedule C, and Form 172 Part I amounts and owner",
    );
  }
  return {
    lossYear: 2024,
    ownerSsn: source.owner_ssn,
    regularNolTo2025: -f172.part_i_line24_nol,
  };
}
