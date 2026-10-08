import { reviewCurrentLossOriginalForms } from "../../mef/forms/execution/current-loss-original-form-review.ts";

/** Reconcile the current-only loss inventory before any registered projection.
 * This validates entered source facts; it does not authenticate issuer bytes
 * or establish that a return was accepted by the IRS. */
export function currentLossFilingProjection(
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  const general = pending?.general as Record<string, unknown> | undefined;
  const filed = pending?.f1040 as Record<string, unknown> | undefined;
  if (
    !pending || general?.filing_status !== "single" ||
    filed?.filing_status !== "single"
  ) {
    throw new Error(
      "Current original-form loss filing needs a finalized single-filer source return",
    );
  }
  return reviewCurrentLossOriginalForms(pending);
}
