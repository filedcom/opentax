/** Reconcile the retained Form 1040 line 27c election with the final return. */
export function retainedEicOptOut(
  fields: Record<string, unknown>,
  pending?: Readonly<Record<string, unknown>>,
): boolean {
  const source = (pending?.general as Record<string, unknown> | undefined)
    ?.do_not_claim_eic;
  const finalized = fields.do_not_claim_eic;
  const line27a = fields.line27_eitc;
  const calculatedCredit =
    (pending?.eitc as Record<string, unknown> | undefined)
      ?.credit_amount;
  if (
    (source !== undefined && typeof source !== "boolean") ||
    (finalized !== undefined && typeof finalized !== "boolean")
  ) {
    throw new Error("Form 1040 EIC opt-out needs a Yes or No answer");
  }
  if (finalized === true && source !== true) {
    throw new Error(
      "Form 1040 EIC opt-out needs the retained general election",
    );
  }
  if (source === true && finalized !== true) {
    throw new Error(
      "Form 1040 EIC opt-out differs from the retained general election",
    );
  }
  if (
    source === true &&
    ((line27a !== undefined && line27a !== null && line27a !== 0) ||
      (calculatedCredit !== undefined && calculatedCredit !== 0))
  ) {
    throw new Error("Form 1040 EIC opt-out requires zero line 27a credit");
  }
  return source === true;
}
