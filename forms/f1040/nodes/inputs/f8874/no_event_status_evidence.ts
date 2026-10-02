import { z } from "zod";
import { form8874AIssuanceSchema } from "./issuance_schema.ts";
import { form8874BNoticeSchema } from "./recapture_notice_schema.ts";

const reference = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});

/** Reviewed CDE statement affirmatively covering one QEI through TY2025. */
export const form8874NoEventStatusSchema = z.object({
  status_statement_document_reference: reference,
  status_statement_sha256: sha256,
  issuance_notice_document_reference: reference,
  issuance_notice_sha256: sha256,
  cde_name: reference,
  cde_ein: z.string().regex(/^\d{9}$/),
  investor_name: reference,
  investor_tin: z.string().regex(/^\d{9}$/),
  initial_investment_date: date,
  qualified_equity_investment_amount: z.number().finite().positive(),
  coverage_start_date: date,
  coverage_end_date: z.literal("2025-12-31"),
  cde_internal_status_records_reference: reference,
  complete_notice_history_reviewed: z.literal(true),
  reviewed_form8874b_notice_references: z.array(reference),
  no_recapture_event_through_2025_confirmed: z.literal(true),
  cde_certification_active_through_2025_confirmed: z.literal(true),
  substantially_all_requirement_maintained_through_2025_confirmed: z.literal(
    true,
  ),
  investment_not_redeemed_through_2025_confirmed: z.literal(true),
  signed_by_authorized_cde_official_confirmed: z.literal(true),
  cde_official_name: reference,
  cde_signature_date: date,
}).strict().superRefine((status, ctx) => {
  if (
    status.status_statement_document_reference ===
      status.issuance_notice_document_reference ||
    status.status_statement_sha256 === status.issuance_notice_sha256 ||
    status.cde_internal_status_records_reference ===
      status.status_statement_document_reference ||
    status.coverage_start_date !== status.initial_investment_date ||
    status.cde_signature_date <= status.coverage_end_date
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["status_statement_document_reference"],
      message:
        "CDE year-end statement needs distinct source bytes and signed coverage through 2025",
    });
  }
  if (
    new Set(status.reviewed_form8874b_notice_references).size !==
      status.reviewed_form8874b_notice_references.length
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["reviewed_form8874b_notice_references"],
      message: "CDE notice history contains a duplicate Form 8874-B",
    });
  }
});

async function digest(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength === 0) {
    throw new Error("Form 8874 evidence bytes are empty");
  }
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(
    new Uint8Array(hash),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** A status statement, not silence, is the asserted no-event source. */
export async function reconcileForm8874NoEventStatus(
  rawStatus: unknown,
  rawIssuance: unknown,
  rawForm8874BHistory: readonly {
    readonly notice: unknown;
    readonly noticeSha256: string;
    readonly noticeBytes: Uint8Array;
  }[],
  bytes: {
    readonly statusStatement: Uint8Array;
    readonly issuanceNotice: Uint8Array;
  },
) {
  const status = form8874NoEventStatusSchema.parse(rawStatus);
  const issuance = form8874AIssuanceSchema.parse(rawIssuance);
  const notices = rawForm8874BHistory.map((entry) =>
    form8874BNoticeSchema.parse(entry.notice)
  );
  if (
    status.issuance_notice_document_reference !==
      issuance.notice_document_reference ||
    status.cde_name !== issuance.cde_name ||
    status.cde_ein !== issuance.cde_ein ||
    status.investor_name !== issuance.investor_name ||
    status.investor_tin !== issuance.investor_tin ||
    status.initial_investment_date !== issuance.initial_investment_date ||
    status.qualified_equity_investment_amount !==
      issuance.qualified_equity_investment_amount
  ) {
    throw new Error(
      "Form 8874 CDE status statement differs from Form 8874-A issuance",
    );
  }
  if (
    status.status_statement_sha256 !== await digest(bytes.statusStatement) ||
    status.issuance_notice_sha256 !== await digest(bytes.issuanceNotice)
  ) {
    throw new Error(
      "Form 8874 CDE status or issuance bytes differ from reviewed digests",
    );
  }
  for (const entry of rawForm8874BHistory) {
    if (
      !sha256.safeParse(entry.noticeSha256).success ||
      entry.noticeSha256 === status.status_statement_sha256 ||
      entry.noticeSha256 === status.issuance_notice_sha256 ||
      entry.noticeSha256 !== await digest(entry.noticeBytes)
    ) {
      throw new Error(
        "Form 8874-B history bytes differ from distinct reviewed digest",
      );
    }
  }
  const noticeReferences = notices.map((notice) =>
    notice.notice_document_reference
  ).sort();
  const statusReferences = [...status.reviewed_form8874b_notice_references]
    .sort();
  if (
    JSON.stringify(noticeReferences) !== JSON.stringify(statusReferences) ||
    notices.some((notice) =>
      notice.notice_document_reference ===
        status.status_statement_document_reference ||
      notice.notice_document_reference === issuance.notice_document_reference ||
      notice.cde_ein !== issuance.cde_ein ||
      notice.investor_tin !== issuance.investor_tin ||
      notice.initial_investment_date !== issuance.initial_investment_date ||
      notice.qualified_equity_investment_amount !==
        issuance.qualified_equity_investment_amount ||
      notice.recapture_event_date <= "2025-12-31"
    )
  ) {
    throw new Error(
      "Form 8874-B history conflicts with the CDE no-event statement",
    );
  }
  return { status, issuance, reviewedForm8874BHistory: notices };
}
