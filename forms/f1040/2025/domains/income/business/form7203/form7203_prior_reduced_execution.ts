import {
  type DocumentBoundExecuteResult,
  executeWithSourceDocuments,
} from "../../../../../../../core/runtime/executor.ts";
import type {
  SourceDocumentBytes,
  SourceDocumentClaim,
} from "../../../../../../../core/runtime/source-documents.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../registry.ts";
import { inputSchema as k1InputSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { calculatePriorReducedNoteGainCandidate } from "../../../../../nodes/intermediate/forms/income/business/form7203/prior-reduced-note.ts";
import { inspectPrior7203MeFXml } from "../../../../../nodes/intermediate/forms/income/business/form7203/prior-filing-xml.ts";

/**
 * Bind every claimed source to bytes in the same execution. The graph's prior
 * reduced-basis branch remains closed while accepted-return content and the
 * gain's Form 8949/Schedule D/Form 1040 treatment are unimplemented.
 */
export async function executePriorReduced7203WithSourceDocuments(
  inputs: Record<string, unknown>,
  documents: readonly SourceDocumentBytes[],
): Promise<
  DocumentBoundExecuteResult & {
    readonly stagedPriorReducedNoteGain: ReturnType<
      typeof calculatePriorReducedNoteGainCandidate
    >;
    readonly inspectedPriorFiling: ReturnType<typeof inspectPrior7203MeFXml>;
  }
> {
  const rawK1s = inputs.k1_s_corp;
  const parsed = k1InputSchema.parse({ k1_s_corps: rawK1s });
  if (parsed.k1_s_corps.length !== 1) {
    throw new Error("Form 7203 prior reduced note needs one identified K-1");
  }
  const k1 = parsed.k1_s_corps[0];
  const source = k1.form7203_debt_evidence;
  if (!source || source.kind !== "prior_reduced_formal_note_repayment") {
    throw new Error("Form 7203 prior reduced note needs its tagged source");
  }
  const stagedPriorReducedNoteGain = calculatePriorReducedNoteGainCandidate(
    source,
    k1,
  );
  const stock = k1.form7203_stock_loss_ledger;
  const general = inputs.general as Record<string, unknown> | undefined;
  if (
    !stock || stock.shareholder_ssn !== source.shareholder_ssn ||
    stock.corporation_ein !== source.corporation_ein ||
    stock.beginning_stock_basis !== source.beginning_stock_basis ||
    stock.beginning_basis_workpaper_reference !==
      source.beginning_stock_basis_workpaper_reference ||
    stock.no_shareholder_debt_or_repayments !== false ||
    typeof general?.taxpayer_ssn !== "string" ||
    general.taxpayer_ssn.replace(/\D/g, "") !== source.shareholder_ssn
  ) {
    throw new Error(
      "Form 7203 prior reduced note needs the same filer and stock ledger",
    );
  }
  const claims: SourceDocumentClaim[] = [
    {
      reference: source.k1_source_document_reference,
      sha256: source.k1_source_document_sha256,
    },
    {
      reference: source.beginning_stock_basis_workpaper_reference,
      sha256: source.beginning_stock_basis_workpaper_sha256,
    },
    {
      reference: source.signed_note_document_reference,
      sha256: source.signed_note_sha256,
    },
    {
      reference: source.original_advance_bank_reference,
      sha256: source.original_advance_bank_sha256,
    },
    {
      reference: source.prior_filed_return_reference,
      sha256: source.prior_filed_return_sha256,
    },
    {
      reference: source.prior_submission_manifest_reference,
      sha256: source.prior_submission_manifest_sha256,
    },
    {
      reference: source.prior_accepted_acknowledgement_reference,
      sha256: source.prior_accepted_acknowledgement_sha256,
    },
    {
      reference: source.prior_filed_form7203_reference,
      sha256: source.prior_filed_form7203_sha256,
    },
    {
      reference: source.principal_repayment.corporate_loan_ledger_reference,
      sha256: source.principal_repayment.corporate_loan_ledger_sha256,
    },
    {
      reference: source.principal_repayment.shareholder_bank_deposit_reference,
      sha256: source.principal_repayment.shareholder_bank_deposit_sha256,
    },
  ];
  const execution = await executeWithSourceDocuments(
    buildExecutionPlan(registry),
    registry,
    inputs,
    { taxYear: 2025, formType: "f1040" },
    claims,
    documents,
  );
  const inspectedPriorFiling = inspectPrior7203MeFXml(
    source,
    execution.verifiedSourceDocuments,
  );
  return { ...execution, stagedPriorReducedNoteGain, inspectedPriorFiling };
}
