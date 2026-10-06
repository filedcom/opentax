import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { z } from "zod";
import { employerCode2RetainedSourceSchema } from "../nodes/intermediate/forms/form8889/employer-code2-evidence-schema.ts";
import {
  Box12Code,
  inputSchema as w2InputSchema,
} from "../nodes/inputs/w2/index.ts";

const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const w2Facts = z.object({
  source_document_reference: reference,
  employer_ein: ssn,
  employee_ssn: ssn,
  box1_wages: z.number().nonnegative(),
  box12_code_w: z.number().positive(),
}).strict();
const trusteeFacts = z.object({
  source_document_reference: reference,
  trustee_ein: ssn,
  owner_ssn: ssn,
  hsa_account_reference: reference,
  paid_on: z.string().date(),
  box1_gross_distribution: z.number().positive(),
  box2_earnings_on_excess: z.number().nonnegative(),
  box3_distribution_code: z.literal("2"),
}).strict();
const paymentFacts = z.object({
  source_document_reference: reference,
  owner_ssn: ssn,
  hsa_account_reference: reference,
  trustee_1099sa_reference: reference,
  paid_on: z.string().date(),
  principal: z.number().positive(),
  earnings: z.number().nonnegative(),
  paid_to: z.literal("hsa_owner"),
  return_due_on: z.literal("2026-04-15"),
}).strict();
function facts<T>(
  record: z.infer<typeof employerCode2RetainedSourceSchema.shape.w2>,
  schema: z.ZodType<T>,
): T {
  const bytes = Buffer.from(record.bytes_base64, "base64");
  if (
    bytes.toString("base64") !== record.bytes_base64 ||
    createHash("sha256").update(bytes).digest("hex") !== record.sha256
  ) {
    throw new Error(
      "Form 8889 employer code-2 retained source bytes/hash differ",
    );
  }
  const value = schema.parse(JSON.parse(bytes.toString("utf8")));
  if (
    (value as { source_document_reference: string })
      .source_document_reference !==
      record.source_document_reference
  ) {
    throw new Error(
      "Form 8889 employer code-2 retained source reference differs",
    );
  }
  return value;
}
/** Reviewed retained transcriptions, never a claim of issuer authentication. */
export function assertEmployerCode2RetainedSources(
  source: Record<string, unknown>,
  allPending: Readonly<Record<string, unknown>> | undefined,
  ownerFields: Readonly<Record<string, unknown>>,
  timely: {
    principal: number;
    earnings: number;
    form1099_sa_source_reference?: string;
  },
  code2: {
    source_reference: string;
    recipient_ssn: string;
    box1_gross_distribution: number;
    box2_earnings_on_excess?: number;
    hsa_account_reference?: string;
  },
): void {
  const owner = z.object({
    beneficiary_ssn: ssn,
    print_line8: z.number().optional(),
    print_line9_employer: z.number().optional(),
  }).passthrough().parse(ownerFields);
  const evidence = employerCode2RetainedSourceSchema.parse(
    source.retained_employer_code2_evidence,
  );
  const refs = Object.values(evidence).map((row) =>
    row.source_document_reference
  );
  if (new Set(refs).size !== 3) {
    throw new Error(
      "Form 8889 employer code-2 source references must be distinct",
    );
  }
  const w = facts(evidence.w2, w2Facts),
    t = facts(evidence.trustee_1099sa, trusteeFacts),
    p = facts(evidence.paid_owner_return, paymentFacts);
  const w2 = w2InputSchema.parse(allPending?.w2).w2s;
  const matching = w2.filter((row) =>
    row.source_document_reference === w.source_document_reference
  );
  const filed = matching[0];
  const codeW =
    filed?.box12_entries?.filter((entry) => entry.code === Box12Code.W) ?? [];
  if (
    matching.length !== 1 || !filed || codeW.length !== 1 ||
    filed.employee_ssn?.replace(/\D/g, "") !== owner.beneficiary_ssn ||
    filed.employer_ein?.replace(/\D/g, "") !== w.employer_ein ||
    w.employee_ssn !== owner.beneficiary_ssn ||
    w.box1_wages !== filed.box1_wages ||
    w.box12_code_w !== codeW[0].amount ||
    w.box12_code_w !== owner.print_line9_employer ||
    t.source_document_reference !== code2.source_reference ||
    t.owner_ssn !== owner.beneficiary_ssn ||
    t.owner_ssn !== code2.recipient_ssn.replace(/\D/g, "") ||
    t.hsa_account_reference !== code2.hsa_account_reference ||
    t.box1_gross_distribution !== code2.box1_gross_distribution ||
    t.box2_earnings_on_excess !== code2.box2_earnings_on_excess ||
    t.box3_distribution_code !== "2" ||
    p.owner_ssn !== t.owner_ssn ||
    p.hsa_account_reference !== t.hsa_account_reference ||
    p.trustee_1099sa_reference !== t.source_document_reference ||
    p.paid_on !== t.paid_on || p.paid_on < "2025-01-01" ||
    p.paid_on > "2025-12-31" || p.paid_on > p.return_due_on ||
    p.principal !== timely.principal || p.earnings !== timely.earnings ||
    p.principal + p.earnings !== t.box1_gross_distribution ||
    timely.form1099_sa_source_reference !== t.source_document_reference ||
    p.principal !== w.box12_code_w - (owner.print_line8 ?? 0)
  ) {
    throw new Error(
      "Form 8889 employer code-2 retained W-2/trustee/owner-payment facts differ",
    );
  }
}
