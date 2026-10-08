import { z } from "zod";
import type {
  Form8815Input,
  Form8815Lines,
} from "../../../../nodes/intermediate/forms/form8815/index.ts";
import { inputSchema as form1099intSchema } from "../../../../nodes/inputs/f1099int/index.ts";

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
    taxpayer_ssn: z.string().optional(),
    spouse_ssn: z.string().optional(),
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
  const interestRows = interestSource.f1099ints;
  const declared = source.bond_interest_source_references;
  const references = declared ??
    (interestRows.length === 1
      ? [interestRows[0].source_document_reference ?? ""]
      : []);
  if (
    references.length === 0 || new Set(references).size !== references.length
  ) {
    throw new Error(
      "Form 8815 needs distinct redeemed-bond source references for multiple interest copies",
    );
  }
  const bondCopies = references.map((reference) => {
    const matches = interestRows.filter((row) =>
      row.source_document_reference === reference
    );
    if (!reference.trim() || matches.length !== 1) {
      throw new Error(
        "Form 8815 redeemed-bond reference must identify exactly one current 1099-INT",
      );
    }
    return matches[0];
  });
  // Premiums, nominees and other interest adjustments require their own reviewed
  // current-interest worksheet; do not infer eligible bond interest from them.
  const ownerSsns = new Set(
    [
      form1040.taxpayer_ssn,
      form1040.spouse_ssn,
    ]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.replace(/-/g, "")),
  );
  const simpleSources = interestRows.every((row) =>
    (!declared || (!!row.source_document_reference?.trim() &&
      !!row.recipient_tin && ownerSsns.has(row.recipient_tin))) &&
    (row.box10 ?? 0) === 0 && (row.box11 ?? 0) === 0 &&
    (row.box12 ?? 0) === 0 && (row.nominee_interest ?? 0) === 0 &&
    (row.accrued_interest_paid ?? 0) === 0 &&
    (row.non_taxable_oid_adjustment ?? 0) === 0
  );
  const eligibleBondInterest = bondCopies.reduce(
    (sum, row) => sum + (row.box3 ?? 0),
    0,
  );
  const allTaxableInterest = interestRows.reduce(
    (sum, row) => sum + (row.box1 ?? 0) + (row.box3 ?? 0),
    0,
  );
  const grossInterest = source.line9_worksheet.schedule_b_line2_interest;
  const taxableInterest = form1040.line2b_taxable_interest ?? 0;
  const adjustments = form1040.line10_adjustments ?? 0;
  const studentLoanAdjustment = schedule1?.line21_student_loan_interest ?? 0;
  if (
    scheduleB.ee_bond_exclusion !== lines.line14 ||
    !simpleSources ||
    bondCopies.some((row) => (row.box1 ?? 0) !== 0 || (row.box3 ?? 0) <= 0) ||
    eligibleBondInterest !== lines.line6 ||
    Math.round(allTaxableInterest) !== grossInterest ||
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
