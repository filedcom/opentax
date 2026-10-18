import { inputSchema } from "../../../../../nodes/inputs/credits/business/f8874/index.ts";
import { reconcileForm8874NoEventStatus } from "../../../../../nodes/inputs/credits/business/f8874/no_event_status_evidence.ts";

/** A retained source document the preparer keeps; it is not transmitted. */
export interface Form8874RetainedDocument {
  readonly document_reference: string;
  readonly bytes: Uint8Array;
}

/** Form 8874 investments that carry no CDE year-end status. */
export function hasUnstatusedForm8874Investment(fields: unknown): boolean {
  const investments = (fields as { investments?: unknown } | undefined)
    ?.investments;
  return Array.isArray(investments) && investments.some((row) =>
    row === null || typeof row !== "object" ||
    (row as Record<string, unknown>).cde_year_end_status === undefined
  );
}

/** The statement must cover the QEI through the end of the return's tax year. */
export function assertCdeStatusCoversTaxYear(
  coverageEndDate: string,
  taxYear: number,
): void {
  if (coverageEndDate !== `${taxYear}-12-31`) {
    throw new Error(
      `Form 8874 CDE year-end status must cover the QEI through December 31, ${taxYear}`,
    );
  }
}

/**
 * Each direct QEI needs its CDE's signed year-end statement, covering the
 * whole credit period through the tax year, and every Form 8874-B the CDE
 * issued, each matched to retained bytes. The Form 8874 instructions require
 * an allocation-holding CDE and a QEI still held on the allowance date; a
 * missing Form 8874-B alone does not show that no recapture event occurred.
 */
export async function assertForm8874CdeStatusEvidence(
  pending: Readonly<Record<string, unknown>>,
  documents: readonly Form8874RetainedDocument[],
  taxYear: number,
): Promise<void> {
  if (pending.f8874 === undefined) return;
  const source = inputSchema.parse(pending.f8874);
  const bytes = (reference: string): Uint8Array => {
    const matches = documents.filter((document) =>
      document.document_reference === reference
    );
    if (matches.length !== 1) {
      throw new Error(
        "Form 8874 CDE status needs exactly one retained copy of each statement and notice",
      );
    }
    return matches[0].bytes;
  };
  for (const investment of source.investments) {
    const status = investment.cde_year_end_status;
    if (!status) {
      throw new Error(
        "Form 8874 direct QEI needs authenticated CDE status and recapture history",
      );
    }
    assertCdeStatusCoversTaxYear(status.coverage_end_date, taxYear);
    await reconcileForm8874NoEventStatus(
      status,
      investment.reviewed_form8874a,
      (investment.reviewed_form8874b_history ?? []).map((entry) => ({
        notice: entry.notice,
        noticeSha256: entry.notice_sha256,
        noticeBytes: bytes(entry.notice.notice_document_reference),
      })),
      {
        statusStatement: bytes(status.status_statement_document_reference),
        issuanceNotice: bytes(status.issuance_notice_document_reference),
      },
    );
  }
}
