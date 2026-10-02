import { inputSchema } from "../nodes/inputs/f1099int/index.ts";

const reportedAmountKeys = [
  "box1",
  "box2",
  "box3",
  "box4",
  "box5",
  "box6",
  "box8",
  "box9",
  "box10",
  "box11",
  "box12",
  "box13",
  "box17",
  "foreign_source_interest_usd",
] as const;

/** Check the owner printed on an identified 1099-INT against the filed return. */
export function assertIdentified1099IntOwner(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (pending?.f1099int === undefined) return;
  const rows = inputSchema.parse(pending.f1099int).f1099ints;
  const primary = fields.taxpayer_ssn;
  const spouse = fields.filing_status === "mfj" ? fields.spouse_ssn : undefined;
  for (const row of rows) {
    if (!reportedAmountKeys.some((key) => (row[key] ?? 0) > 0)) continue;
    if (row.recipient_tin === undefined) {
      throw new Error("Positive Form 1099-INT needs a recipient TIN at export");
    }
    if (row.recipient_tin !== primary && row.recipient_tin !== spouse) {
      throw new Error(
        "Form 1099-INT recipient TIN must match the taxpayer or joint spouse",
      );
    }
  }
}
