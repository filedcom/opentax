import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { inputSchema } from "../nodes/inputs/f1098e/index.ts";
import { expectedTy2025StudentLoanDeduction } from "../nodes/intermediate/aggregation/agi_aggregator/index.ts";

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

function normalizedName(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, "");
}

function borrowerOwner(
  tin: string,
  name: string | undefined,
  reviewReference: string | undefined,
  owners: Array<{ tin: string; names: string[] }>,
): string {
  const digits = tin.replace(/\D/g, "");
  if (digits.length === 9) {
    const owner = owners.find((candidate) => candidate.tin === digits);
    if (owner) return owner.tin;
  } else if (digits.length === 4 && name && reviewReference) {
    const candidateName = normalizedName(name);
    const matches = owners.filter((owner) =>
      owner.tin.endsWith(digits) && owner.names.includes(candidateName)
    );
    if (matches.length === 1) return matches[0].tin;
  }
  throw new Error(
    "Form 1098-E borrower must match the taxpayer or joint spouse with reviewed masked-TIN ownership",
  );
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
  const owners = [{
    tin: filer.primarySSN.replace(/\D/g, ""),
    names: [
      `${filer.firstName ?? filer.firstNameWithInitial ?? ""}${
        filer.lastName ?? ""
      }`,
      `${filer.firstName ?? filer.firstNameWithInitial ?? ""}${
        filer.middleInitial ?? ""
      }${filer.lastName ?? ""}`,
    ].map(normalizedName),
  }];
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) {
    owners.push({
      tin: filer.spouse.ssn.replace(/\D/g, ""),
      names: [
        `${filer.spouse.firstName}${filer.spouse.lastName}`,
        `${filer.spouse.firstName}${
          filer.spouse.middleInitial ?? ""
        }${filer.spouse.lastName}`,
      ].map(normalizedName),
    });
  }
  let total = 0;
  const issuedCopies = new Set<string>();
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
    const ownerTin = borrowerOwner(
      row.borrower_tin,
      row.borrower_name,
      row.borrower_owner_review_reference,
      owners,
    );
    const copyIdentity = `${
      row.lender_tin.replace(/\D/g, "")
    }|${ownerTin}|${row.source_document_reference}`;
    if (issuedCopies.has(copyIdentity)) {
      throw new Error("Form 1098-E repeats the same issued lender statement");
    }
    issuedCopies.add(copyIdentity);
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
  if (printed !== expectedTy2025StudentLoanDeduction(pending.agi_aggregator)) {
    throw new Error(
      "Schedule 1 student loan interest differs from its retained phaseout calculation",
    );
  }
}
