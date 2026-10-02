import { z } from "zod";
import type {
  Form8815Input,
  Form8815Lines,
} from "../nodes/intermediate/forms/form8815/index.ts";
import { inputSchema as form1099intSchema } from "../nodes/inputs/f1099int/index.ts";

const wholeDollars = z.number().int();

/** Replays the Form 8815 line 9 worksheet against the filed return. */
export function assertForm8815FinalReturn(
  source: Form8815Input,
  lines: Form8815Lines,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (!pending) {
    throw new Error("Form 8815 needs the finalized return for MAGI review");
  }
  const scheduleB = z.object({
    ee_bond_exclusion: wholeDollars,
    print_line2_total: wholeDollars,
    print_line4_total: wholeDollars,
  }).passthrough().parse(pending.schedule_b);
  const form1040 = z.object({
    line2b_taxable_interest: wholeDollars.optional(),
    line9_total_income: wholeDollars,
    line10_adjustments: wholeDollars.optional(),
    line11_agi: wholeDollars,
  }).passthrough().parse(pending.f1040);
  const schedule1 = z.object({
    line21_student_loan_interest: wholeDollars.optional(),
    line26_total_adjustments: wholeDollars,
  }).passthrough().optional().parse(pending.schedule1);
  const interestSource = form1099intSchema.parse(pending.f1099int);
  const bondInterest = interestSource.f1099ints[0];
  const grossInterest = source.line9_worksheet.schedule_b_line2_interest;
  const taxableInterest = form1040.line2b_taxable_interest ?? 0;
  const adjustments = form1040.line10_adjustments ?? 0;
  const studentLoanAdjustment = schedule1?.line21_student_loan_interest ?? 0;
  if (
    scheduleB.ee_bond_exclusion !== lines.line14 ||
    interestSource.f1099ints.length !== 1 ||
    !bondInterest.source_document_reference?.trim() ||
    (bondInterest.box3 ?? 0) !== lines.line6 ||
    (bondInterest.box1 ?? 0) !== 0 ||
    (bondInterest.box10 ?? 0) !== 0 ||
    (bondInterest.box11 ?? 0) !== 0 ||
    (bondInterest.box12 ?? 0) !== 0 ||
    (bondInterest.nominee_interest ?? 0) !== 0 ||
    (bondInterest.accrued_interest_paid ?? 0) !== 0 ||
    (bondInterest.non_taxable_oid_adjustment ?? 0) !== 0 ||
    scheduleB.print_line2_total !== grossInterest ||
    scheduleB.print_line4_total !== taxableInterest ||
    grossInterest - lines.line14 !== taxableInterest ||
    form1040.line9_total_income - taxableInterest !==
      source.line9_worksheet.other_1040_and_schedule1_income ||
    (schedule1?.line26_total_adjustments ?? 0) !== adjustments ||
    adjustments - studentLoanAdjustment !==
      source.line9_worksheet.schedule1_adjustments ||
    form1040.line11_agi !== form1040.line9_total_income - adjustments ||
    source.line9_worksheet.foreign_adoption_and_puerto_rico_addbacks !== 0 ||
    Object.keys(pending.form2555 ?? {}).length > 0 ||
    Object.keys(pending.form4563 ?? {}).length > 0 ||
    Object.keys(pending.form8839 ?? {}).length > 0
  ) {
    throw new Error(
      "Form 8815 line 9 worksheet or exclusion differs from the finalized Schedule B, Schedule 1, and Form 1040",
    );
  }
}
