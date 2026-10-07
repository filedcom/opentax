import { extractFilerIdentity } from "../../../mef/filer.ts";
import {
  eitc,
  inputSchema as eicSchema,
} from "../../../nodes/intermediate/forms/eitc/index.ts";
import { reviewCurrentLossOriginalForms } from "../../mef/forms/current-loss-original-form-review.ts";
import {
  assertReturnScheduleJoins,
  assertReturnWideArithmetic,
} from "../../return-wide-arithmetic.ts";
import { fillFormPdf } from "../builder.ts";
import { irs1040Pdf } from "./f1040.ts";
import { schedule1Pdf } from "./schedule1.ts";

/** Source-bound review only. Full current-loss filing routes remain guarded. */
export async function buildCurrentLossReturnReviewPdfs(
  pending: Record<string, Record<string, any>>,
  cacheDir: string,
) {
  const review = reviewCurrentLossOriginalForms(pending);
  assertReturnWideArithmetic(pending.f1040);
  assertReturnScheduleJoins(pending.f1040, pending);
  const credit = eitc.compute(
    { taxYear: 2025, formType: "f1040" },
    eicSchema.parse(pending.eitc),
  ).outputs.find((r) => r.nodeType === "eitc")!.fields.credit_amount;
  if ((pending.f1040.line27_eitc ?? 0) !== credit) {
    throw new Error("Current loss return review differs from finalized EIC");
  }
  const filer = extractFilerIdentity(pending.f1040);
  if (!filer) {
    throw new Error("Current loss return review needs finalized filer");
  }
  // These are review amounts, not a substitute prepared filing projection.
  // The normal Form 1040 projector retains its positive-EIC source guard.
  const returnFields = { ...pending.f1040 };
  const scheduleFields = schedule1Pdf.instances!(
    pending.schedule1,
    filer,
    pending,
  )[0];
  const returnBytes = await fillFormPdf(
    irs1040Pdf,
    returnFields,
    filer,
    cacheDir,
  );
  const scheduleBytes = await fillFormPdf(
    schedule1Pdf,
    scheduleFields,
    filer,
    cacheDir,
  );
  if (!returnBytes) {
    throw new Error("Current loss return review has no filled return page");
  }
  return {
    review,
    f1040: { fields: returnFields, bytes: returnBytes },
    schedule1: { fields: scheduleFields, bytes: scheduleBytes },
    filingReady: false as const,
    issuerVerified: false as const,
  };
}
