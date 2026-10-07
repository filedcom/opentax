import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { z } from "zod";
import { employerPostyearEvidenceSchema } from "../nodes/intermediate/forms/form8889/employer-postyear-evidence-schema.ts";
import {
  Box12Code,
  inputSchema as w2InputSchema,
} from "../nodes/inputs/w2/index.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const w2Facts = z.object({
  source_document_reference: ref,
  employer_ein: tin,
  employee_ssn: tin,
  box1_wages: z.number().nonnegative(),
  box12_code_w: z.number().positive(),
}).strict();
const trusteeFacts = z.object({
  source_document_reference: ref,
  trustee_ein: tin,
  owner_ssn: tin,
  hsa_account_reference: ref,
  transaction_date: z.string().date(),
  contribution_year_corrected: z.literal(2025),
  transaction_type: z.literal("returned_excess_to_hsa_owner"),
  principal: z.number().positive(),
  earnings: z.number().nonnegative(),
  paid_to: z.literal("hsa_owner"),
}).strict();
const receiptFacts = z.object({
  source_document_reference: ref,
  trustee_transaction_reference: ref,
  owner_ssn: tin,
  hsa_account_reference: ref,
  received_on: z.string().date(),
  total_received: z.number().positive(),
}).strict();
type Document = z.infer<
  typeof employerPostyearEvidenceSchema.shape.filed_2025_w2
>;
function retained<T>(record: Document, schema: z.ZodType<T>): T {
  const bytes = Buffer.from(record.bytes_base64, "base64");
  if (
    bytes.toString("base64") !== record.bytes_base64 ||
    createHash("sha256").update(bytes).digest("hex") !== record.sha256
  ) throw new Error("Form 8889 post-year employer source bytes/hash differ");
  const value = schema.parse(JSON.parse(bytes.toString("utf8")));
  if (
    (value as { source_document_reference: string })
      .source_document_reference !==
      record.source_document_reference
  ) throw new Error("Form 8889 post-year employer source reference differs");
  return value;
}

/** Validates a 2026 transaction; it does not represent a 2025 1099-SA. */
export function assertEmployerPostyearOwnerSources(
  source: Readonly<Record<string, unknown>>,
  allPending: Readonly<Record<string, unknown>> | undefined,
  ownerForm: Readonly<Record<string, unknown>>,
  withdrawal: {
    principal: number;
    earnings: number;
    withdrawal_tax_year: 2025 | 2026;
    form1099_sa_source_reference?: string;
  },
): number {
  const evidence = employerPostyearEvidenceSchema.parse(
    source.retained_employer_postyear_evidence,
  );
  const refs = Object.values(evidence).map((row) =>
    row.source_document_reference
  );
  if (new Set(refs).size !== 3) {
    throw new Error("Form 8889 post-year source references must be distinct");
  }
  const w = retained(evidence.filed_2025_w2, w2Facts);
  const t = retained(evidence.trustee_2026_payment, trusteeFacts);
  const r = retained(evidence.owner_2026_receipt, receiptFacts);
  const ownerSsn = z.string().regex(/^\d{9}$/).parse(ownerForm.beneficiary_ssn);
  const filed = w2InputSchema.parse(allPending?.w2).w2s.filter((row) =>
    row.source_document_reference === w.source_document_reference
  );
  const codeW =
    filed[0]?.box12_entries?.filter((row) => row.code === Box12Code.W) ?? [];
  const sourceW = z.array(
    z.object({ employee_ssn: z.string(), amount: z.number() }),
  )
    .parse(source.w2_code_w_entries);
  if (
    filed.length !== 1 || codeW.length !== 1 || sourceW.length !== 1 ||
    withdrawal.withdrawal_tax_year !== 2026 ||
    withdrawal.form1099_sa_source_reference !== undefined ||
    w.employee_ssn !== ownerSsn || t.owner_ssn !== ownerSsn ||
    r.owner_ssn !== ownerSsn ||
    filed[0]!.employee_ssn?.replace(/\D/g, "") !== ownerSsn ||
    filed[0]!.employer_ein?.replace(/\D/g, "") !== w.employer_ein ||
    filed[0]!.box1_wages !== w.box1_wages ||
    codeW[0]!.amount !== w.box12_code_w ||
    sourceW[0]!.employee_ssn.replace(/\D/g, "") !== ownerSsn ||
    sourceW[0]!.amount !== w.box12_code_w ||
    ownerForm.print_line9_employer !== w.box12_code_w ||
    t.hsa_account_reference !== r.hsa_account_reference ||
    r.trustee_transaction_reference !== t.source_document_reference ||
    t.transaction_date !== r.received_on ||
    t.transaction_date < "2026-01-01" || t.transaction_date > "2026-04-15" ||
    t.principal !== withdrawal.principal ||
    t.earnings !== withdrawal.earnings ||
    r.total_received !== t.principal + t.earnings ||
    w.box12_code_w - Number(ownerForm.print_line8 ?? 0) !== t.principal
  ) {
    throw new Error(
      "Form 8889 2026 owner-paid employer excess source facts differ",
    );
  }
  return w.box1_wages;
}
