import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { inputSchema } from "../nodes/inputs/f1098e/index.ts";

type StudentLoanPending = {
  f1098e?: unknown;
  agi_aggregator?: unknown;
  schedule1?: unknown;
};

function amount(source: unknown, key: string): number {
  if (!source || typeof source !== "object") return 0;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

/** Reconcile positive 1098-E borrower copies with the claimed deduction. */
export function assert1098EInterestSource(
  pending: StudentLoanPending,
  filer: FilerIdentity,
): void {
  const printed = amount(pending.schedule1, "line21_student_loan_interest");
  if (pending.f1098e === undefined) {
    if (printed > 0) {
      throw new Error(
        "Schedule 1 student loan interest needs a retained source",
      );
    }
    return;
  }
  const rows = inputSchema.parse(pending.f1098e).f1098es;
  const owners = [filer.primarySSN.replace(/\D/g, "")];
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) owners.push(filer.spouse.ssn.replace(/\D/g, ""));
  let total = 0;
  for (const row of rows) {
    if (row.box1_student_loan_interest <= 0) continue;
    total += row.box1_student_loan_interest;
    if (
      !row.lender_name || !row.lender_tin || !row.borrower_tin ||
      !row.source_document_reference
    ) {
      throw new Error(
        "Positive Form 1098-E needs identified lender, borrower, and issued-copy reference",
      );
    }
    if (!owners.includes(row.borrower_tin.replace(/\D/g, ""))) {
      throw new Error(
        "Form 1098-E borrower must match the taxpayer or joint spouse",
      );
    }
  }
  const capped = Math.min(total, 2_500);
  const retained = amount(
    pending.agi_aggregator,
    "line21_student_loan_interest",
  );
  if (retained !== capped) {
    throw new Error(
      "Retained student loan interest differs from issued Form 1098-E box 1",
    );
  }
  if (printed > capped) {
    throw new Error(
      "Schedule 1 student loan interest exceeds issued Form 1098-E interest",
    );
  }
}
