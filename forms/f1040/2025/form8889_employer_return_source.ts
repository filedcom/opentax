import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { z } from "zod";
import { employerReturnEvidenceSchema } from "../nodes/intermediate/forms/form8889/employer-return-evidence-schema.ts";
import {
  Box12Code,
  inputSchema as w2InputSchema,
} from "../nodes/inputs/w2/index.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const employer = z.object({
  source_document_reference: ref,
  employer_ein: tin,
  employee_ssn: tin,
  hsa_account_reference: ref,
  original_2025_contribution: z.number().positive(),
  annual_223b_limit: z.number().positive(),
  excess_error_principal: z.number().positive(),
  error_kind: z.literal("contribution_above_annual_223b_limit"),
  recoup_requested_on: z.string().date(),
}).strict();
const remittance = z.object({
  source_document_reference: ref,
  employer_correction_reference: ref,
  trustee_ein: tin,
  employer_ein: tin,
  employee_ssn: tin,
  hsa_account_reference: ref,
  paid_to: z.literal("employer"),
  paid_on: z.string().date(),
  returned_principal: z.number().positive(),
  returned_earnings: z.number().nonnegative(),
}).strict();
const filedW2 = z.object({
  source_document_reference: ref,
  employer_ein: tin,
  employee_ssn: tin,
  box1_wages: z.number().nonnegative(),
  box12_code_w: z.number().positive(),
}).strict();
const trustee5498 = z.object({
  source_document_reference: ref,
  trustee_ein: tin,
  owner_ssn: tin,
  hsa_account_reference: ref,
  contribution_year: z.literal(2025),
  box2_total_2025_contributions: z.number().positive(),
  employer_return_excluded: z.literal(true),
}).strict();
type Document = z.infer<typeof employerReturnEvidenceSchema.shape.filed_w2>;
function retained<T>(record: Document, schema: z.ZodType<T>): T {
  const bytes = Buffer.from(record.bytes_base64, "base64");
  if (
    bytes.toString("base64") !== record.bytes_base64 ||
    createHash("sha256").update(bytes).digest("hex") !== record.sha256
  ) throw new Error("Form 8889 employer-returned source bytes/hash differ");
  const value = schema.parse(JSON.parse(bytes.toString("utf8")));
  if (
    (value as { source_document_reference: string })
      .source_document_reference !==
      record.source_document_reference
  ) throw new Error("Form 8889 employer-returned source reference differs");
  return value;
}

/** Notice 2008-59 Q&A-24 error correction; no owner distribution or code-2 claim. */
export function assertEmployerReturnedExcessSources(
  source: Readonly<Record<string, unknown>>,
  allPending: Readonly<Record<string, unknown>> | undefined,
  ownerForm: Readonly<Record<string, unknown>>,
): number {
  const evidence = employerReturnEvidenceSchema.parse(
    source.retained_employer_return_evidence,
  );
  const refs = Object.values(evidence).map((row) =>
    row.source_document_reference
  );
  if (new Set(refs).size !== 4) {
    throw new Error(
      "Form 8889 employer-returned source references must be distinct",
    );
  }
  const e = retained(evidence.employer_correction, employer);
  const r = retained(evidence.trustee_remittance, remittance);
  const w = retained(evidence.filed_w2, filedW2);
  const f = retained(evidence.trustee_5498sa, trustee5498);
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
    e.employee_ssn !== ownerSsn || r.employee_ssn !== ownerSsn ||
    w.employee_ssn !== ownerSsn || f.owner_ssn !== ownerSsn ||
    filed[0]!.employee_ssn?.replace(/\D/g, "") !== ownerSsn ||
    filed[0]!.employer_ein?.replace(/\D/g, "") !== e.employer_ein ||
    e.employer_ein !== r.employer_ein || e.employer_ein !== w.employer_ein ||
    r.trustee_ein !== f.trustee_ein ||
    filed[0]!.box1_wages !== w.box1_wages ||
    codeW[0]!.amount !== w.box12_code_w ||
    sourceW[0]!.employee_ssn.replace(/\D/g, "") !== ownerSsn ||
    sourceW[0]!.amount !== w.box12_code_w ||
    ownerForm.print_line9_employer !== w.box12_code_w ||
    ownerForm.print_line8 !== e.annual_223b_limit ||
    e.original_2025_contribution - e.annual_223b_limit !==
      e.excess_error_principal ||
    e.original_2025_contribution - r.returned_principal !==
      w.box12_code_w ||
    e.excess_error_principal !== r.returned_principal ||
    e.hsa_account_reference !== r.hsa_account_reference ||
    e.hsa_account_reference !== f.hsa_account_reference ||
    r.employer_correction_reference !== e.source_document_reference ||
    f.box2_total_2025_contributions !== w.box12_code_w ||
    e.recoup_requested_on < "2025-01-01" ||
    r.paid_on < e.recoup_requested_on || r.paid_on > "2025-12-31"
  ) {
    throw new Error(
      "Form 8889 employer-returned correction/W-2/5498-SA facts differ",
    );
  }
  return w.box1_wages;
}
