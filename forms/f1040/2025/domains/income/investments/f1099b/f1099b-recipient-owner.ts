import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { inputSchema } from "../../../../../nodes/inputs/income/investments/f1099b/index.ts";

function validIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

/** A broker-reported sale must belong to a filer on this return. */
export function assert1099BRecipientOwner(
  source: unknown,
  filer: FilerIdentity | undefined,
): void {
  if (source === undefined) return;
  const parsed = inputSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("1099-B needs valid issued transaction rows");
  }
  if (!filer) throw new Error("1099-B needs Form 1040 filer identity");
  const recipients = new Set([filer.primarySSN.replace(/\D/g, "")]);
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) {
    recipients.add(filer.spouse.ssn.replace(/\D/g, ""));
  }
  for (const row of parsed.data.f1099bs) {
    if (!row.recipient_ssn) {
      throw new Error("1099-B filing needs an issued recipient SSN");
    }
    if (!recipients.has(row.recipient_ssn)) {
      throw new Error(
        "1099-B recipient must match the taxpayer or joint-filing spouse",
      );
    }
    if (!row.payer_tin && !row.source_document_reference) {
      throw new Error(
        "1099-B filing needs broker TIN or issued-copy reference",
      );
    }
    if (!row.description.trim()) {
      throw new Error("1099-B sale needs a property description");
    }
    if (
      !row.date_sold.startsWith("2025-") ||
      !validIsoCalendarDate(row.date_sold)
    ) {
      throw new Error("TY2025 1099-B sale date must be a real 2025 date");
    }
    if (
      row.date_acquired === "INHERITED" &&
      !["D", "E"].includes(row.part)
    ) {
      throw new Error("1099-B inherited sale needs a long-term Form 8949 box");
    }
    if (
      row.date_acquired !== "VARIOUS" &&
      row.date_acquired !== "INHERITED" &&
      !validIsoCalendarDate(row.date_acquired)
    ) {
      throw new Error("1099-B acquired date must be a real ISO calendar date");
    }
  }
}
