import { z } from "zod";
import type { SourceDocumentBytes } from "../../../core/runtime/source-documents.ts";
import { stageForm172ProjectedReturn } from "./form172_projected_return.ts";
import { stageForm172AmtReviewSource } from "./form172_amt_review_source.ts";

const claim = z.object({ reference: z.string(), sha256: z.string() });
const regularEnvelope = z.object({ origin: claim }).passthrough();
const amtEnvelope = z.object({ regular_origin: claim, annual: claim })
  .passthrough();
function scalar(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("NOL AMT replay needs scalar calculated amounts");
  }
  return value;
}
function dollars(value: unknown): number {
  const n = scalar(value);
  return Math.sign(n) * Math.round(Math.abs(n));
}

/** Retained independent AMT workpaper matched to the actual regular NOL replay.
 * This establishes tentative lines before ATNOLD, not AMT carry availability,
 * absorption, final tax/credit limits, source authenticity or filing admission.
 */
export async function stageForm172AmtProjectedReturn(
  rawInputs: Readonly<Record<string, unknown>>,
  rawRegularBinding: unknown,
  rawRegularDocuments: readonly SourceDocumentBytes[],
  rawAmtBinding: unknown,
  rawAmtDocuments: readonly SourceDocumentBytes[],
) {
  // Own every input and source before either nested staging function can await.
  const inputs = structuredClone(rawInputs);
  const regularBinding = structuredClone(rawRegularBinding);
  const amtBinding = structuredClone(rawAmtBinding);
  const own = (docs: readonly SourceDocumentBytes[]) =>
    docs.map((d) => ({
      reference: d.reference,
      bytes: new Uint8Array(d.bytes),
    }));
  const regularDocuments = own(rawRegularDocuments);
  const amtDocuments = own(rawAmtDocuments);
  const reg = regularEnvelope.parse(regularBinding);
  const alt = amtEnvelope.parse(amtBinding);
  if (
    reg.origin.reference !== alt.regular_origin.reference ||
    reg.origin.sha256 !== alt.regular_origin.sha256
  ) {
    throw new Error(
      "Regular and AMT replay must bind the identical loss-year source",
    );
  }
  const projected = await stageForm172ProjectedReturn(
    inputs,
    regularBinding,
    regularDocuments,
  );
  const amt = await stageForm172AmtReviewSource(amtBinding, amtDocuments);
  if (amt.applicationYear !== 2025 || amt.originYear !== projected.originYear) {
    throw new Error("Current AMT review differs from the projected NOL years");
  }
  const annual = JSON.parse(
    new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
      .decode(
        amtDocuments.find((d) => d.reference === alt.annual.reference)!.bytes,
      ),
  );
  const f = projected.projected_form1040;
  const a = projected.projected_pending.form6251;
  if (!a) {
    throw new Error(
      "Current AMT review needs actual tentative Form6251 output",
    );
  }
  for (
    const [name, reviewed, actual] of [
      ["AGI", annual.reviewed_form1040.line11b_agi, f.line11_agi],
      [
        "deductions",
        annual.reviewed_form1040.line14_deductions,
        f.line14_deductions_qbi_total,
      ],
      [
        "senior",
        annual.reviewed_form1040.schedule1a_line37_senior_deduction,
        f.schedule1a_line37_senior_deduction,
      ],
    ]
  ) {
    if (reviewed !== dollars(actual)) {
      throw new Error(`AMT review ${name} differs from the projected Form1040`);
    }
  }
  const rawComponents: Record<string, number> = {
    "1b": scalar(a.regular_tax_income),
    "2a": scalar(a.line2a_taxes_paid),
    "2b": -scalar(a.line2b_tax_refund),
    "2c": scalar(a.line2c_investment_interest),
    "2d": scalar(a.line2d_depletion),
    "2e": scalar(a.line2e_regular_nol),
    "2g": scalar(a.private_activity_bond_interest),
    "2h": scalar(a.qsbs_adjustment),
    "2i": scalar(a.iso_adjustment),
    "2j": scalar(a.line2j_estates_and_trusts),
    "2k": scalar(a.line2k_disposition),
    "2l": scalar(a.depreciation_adjustment),
    // These positive adjustment paths have no complete registered calculation;
    // a nonzero reviewed component cannot stand in for that missing graph join.
    "2m": 0,
    "2n": 0,
    "2r": 0,
    "2s": 0,
    "2t": 0,
    "2o": scalar(a.line2o_circulation_costs),
    "2p": scalar(a.line2p_long_term_contracts),
    "2q": scalar(a.line2q_mining_costs),
    "3": scalar(
      scalar(a.line3_charitable_contribution_adjustment) +
        scalar(a.line3_form8864_income_exclusion) +
        scalar(a.line3_houseboat_interest_addback),
    ),
  };
  const rawTotal = Object.values(rawComponents).reduce((sum, v) => sum + v, 0);
  const components: Record<string, number> = Object.fromEntries(
    Object.entries(rawComponents).map((
      [line, amount],
    ) => [line, dollars(amount)]),
  );
  for (const c of annual.components as { line: string; amount: number }[]) {
    if (components[c.line] !== c.amount) {
      throw new Error(
        `AMT review line${c.line} differs from the actual tentative graph`,
      );
    }
  }
  const total = Object.values(components).reduce((sum, v) => sum + v, 0);
  if (
    a.amti_before_mfs_addition === undefined ||
    scalar(a.nol_adjustment) !== 0 ||
    total !== scalar(a.amti_before_mfs_addition)
  ) {
    throw new Error(
      "AMT filed component total differs from the actual graph before MFS addition",
    );
  }
  if (total !== amt.tentativeAmtiBeforeAtnold) {
    throw new Error(
      "AMT reviewed total differs from calculated tentative components",
    );
  }
  return {
    ...projected,
    independent_amt_review: amt,
    calculated_tentative_amt_components: components,
    calculated_tentative_amt_unrounded: rawTotal,
    currentAmtTentativeTotalReconciled: true as const,
    currentAmtTentativeGraphReconciled: true as const,
    amtNolReconciled: false as const,
    currentAgiDependentRefiguresVerified: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}
