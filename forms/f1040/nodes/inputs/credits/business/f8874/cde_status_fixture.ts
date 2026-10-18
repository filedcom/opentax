import type { z } from "zod";
import type { form8874AIssuanceSchema } from "./issuance_schema.ts";

type ReviewedInvestment = {
  designation_notice_reference: string;
  reviewed_form8874a: z.infer<typeof form8874AIssuanceSchema>;
};

const utf8 = new TextEncoder();

async function sha256(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(
    new Uint8Array(hash),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Synthetic sample facts: a signed CDE year-end statement with no Form 8874-B
 * history for each QEI, and the retained bytes of that statement and of the
 * Form 8874-A notice. Not CDE authentication.
 */
export async function withSyntheticCdeYearEndStatus<
  T extends ReviewedInvestment,
>(investments: readonly T[]) {
  const retainedSourceDocuments: {
    document_reference: string;
    bytes: Uint8Array;
  }[] = [];
  const statused = [];
  for (const investment of investments) {
    const issuance = investment.reviewed_form8874a;
    const statusReference =
      `${investment.designation_notice_reference} CDE year-end status`;
    const issuanceBytes = utf8.encode(
      `SYNTHETIC SAMPLE Form 8874-A issued by ${issuance.cde_name}\n${
        JSON.stringify(issuance)
      }\n`,
    );
    const statusBytes = utf8.encode(
      `SYNTHETIC SAMPLE CDE year-end status statement from ${issuance.cde_name} (EIN ${issuance.cde_ein}): QEI of ${issuance.investor_name} made ${issuance.initial_investment_date} for ${issuance.qualified_equity_investment_amount} remained qualified with no recapture event and no Form 8874-B issued through December 31.\n`,
    );
    retainedSourceDocuments.push(
      {
        document_reference: issuance.notice_document_reference,
        bytes: issuanceBytes,
      },
      { document_reference: statusReference, bytes: statusBytes },
    );
    statused.push({
      ...investment,
      cde_year_end_status: {
        status_statement_document_reference: statusReference,
        status_statement_sha256: await sha256(statusBytes),
        issuance_notice_document_reference: issuance.notice_document_reference,
        issuance_notice_sha256: await sha256(issuanceBytes),
        cde_name: issuance.cde_name,
        cde_ein: issuance.cde_ein,
        investor_name: issuance.investor_name,
        investor_tin: issuance.investor_tin,
        initial_investment_date: issuance.initial_investment_date,
        qualified_equity_investment_amount:
          issuance.qualified_equity_investment_amount,
        coverage_start_date: issuance.initial_investment_date,
        coverage_end_date: "2025-12-31" as const,
        cde_internal_status_records_reference:
          `${investment.designation_notice_reference} CDE compliance ledger`,
        complete_notice_history_reviewed: true as const,
        reviewed_form8874b_notice_references: [],
        no_recapture_event_through_2025_confirmed: true as const,
        cde_certification_active_through_2025_confirmed: true as const,
        substantially_all_requirement_maintained_through_2025_confirmed:
          true as const,
        investment_not_redeemed_through_2025_confirmed: true as const,
        signed_by_authorized_cde_official_confirmed: true as const,
        cde_official_name: "Synthetic CDE Officer",
        cde_signature_date: "2026-01-15",
      },
      reviewed_form8874b_history: [],
    });
  }
  return { investments: statused, retainedSourceDocuments };
}
