import { inputSchema } from "../nodes/inputs/f1099div/index.ts";

const positiveAmountKeys = [
  "box1a",
  "box1b",
  "box2a",
  "box2b",
  "box2c",
  "box2d",
  "box2e",
  "box2f",
  "box3",
  "box4",
  "box5",
  "box6",
  "box7",
  "box9",
  "box10",
  "box12",
  "box13",
  "box16",
  "foreign_source_dividends_usd",
  "foreign_source_qualified_dividends_usd",
] as const;

/** Require a filed owner for each positive 1099-DIV payer copy. */
export function assertPositive1099DivOwner(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (pending?.f1099div === undefined) return;
  const rows = inputSchema.parse(pending.f1099div).f1099divs;
  const primary = typeof fields.taxpayer_ssn === "string"
    ? fields.taxpayer_ssn.replace(/\D/g, "")
    : undefined;
  const spouse = fields.filing_status === "mfj" &&
      typeof fields.spouse_ssn === "string"
    ? fields.spouse_ssn.replace(/\D/g, "")
    : undefined;
  for (const row of rows) {
    if (!positiveAmountKeys.some((key) => (row[key] ?? 0) > 0)) continue;
    if (row.recipient_tin === undefined) {
      throw new Error("Positive Form 1099-DIV needs a recipient TIN at export");
    }
    if (!row.payerTin && !row.payerName?.trim()) {
      throw new Error("Positive Form 1099-DIV needs an identified payer");
    }
    if (row.recipient_tin !== primary && row.recipient_tin !== spouse) {
      throw new Error(
        "Form 1099-DIV recipient TIN must match the taxpayer or joint spouse",
      );
    }
  }
}
