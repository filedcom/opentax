import { createHash } from "node:crypto";
import { z } from "zod";

const monthSchema = z.object({
  month: z.string().regex(/^2025-(0[1-9]|1[0-2])$/),
  payroll_journal_reference: z.string().min(1),
  fixed_asset_register_reference: z.string().min(1),
  employee_payments: z.array(
    z.object({
      employee_ssn: z.string().regex(/^\d{9}$/),
      amount: z.number().int().positive(),
    }).strict(),
  ),
  qualifying_property: z.array(
    z.object({
      asset_reference: z.string().min(1),
      unadjusted_basis: z.number().int().positive(),
    }).strict(),
  ),
}).strict();

const bookSchema = z.object({
  tax_year: z.literal(2025),
  owner_ssn: z.string().regex(/^\d{9}$/),
  business_reference: z.string().min(1),
  employer_ein: z.string().regex(/^\d{9}$/),
  period_start: z.literal("2025-01-01"),
  period_end: z.literal("2025-12-31"),
  months: z.array(monthSchema).length(12),
}).strict();

export const zeroLimitInventorySchema = z.object({
  document_id: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes_base64: z.string().min(1),
}).strict();

/** Retained full-year payroll journals and fixed-asset registers, not a zero scalar. */
export function assertZeroLimitInventory(
  raw: z.infer<typeof zeroLimitInventorySchema> | undefined,
  expected: {
    owner_ssn: string;
    business_reference: string;
    employer_ein: string;
  },
): void {
  if (!raw) {
    throw new Error(
      "Zero QBI wage/property limit needs retained business books",
    );
  }
  const bytes = Uint8Array.from(atob(raw.bytes_base64), (c) => c.charCodeAt(0));
  if (
    btoa(String.fromCharCode(...bytes)) !== raw.bytes_base64 ||
    createHash("sha256").update(bytes).digest("hex") !== raw.sha256
  ) throw new Error("QBI payroll/property books differ from retained bytes");
  const book = bookSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  if (
    raw.document_id !==
      `${expected.business_reference}-2025-payroll-property` ||
    book.owner_ssn !== expected.owner_ssn ||
    book.business_reference !== expected.business_reference ||
    book.employer_ein !== expected.employer_ein ||
    book.months.some((row, index) =>
      row.month !== `2025-${String(index + 1).padStart(2, "0")}` ||
      row.employee_payments.length !== 0 || row.qualifying_property.length !== 0
    ) ||
    new Set(book.months.flatMap((row) => [
        row.payroll_journal_reference,
        row.fixed_asset_register_reference,
      ]
      )).size !== 24
  ) {
    throw new Error(
      "QBI zero-limit books do not establish full-year owner-specific zero wages and property",
    );
  }
}
