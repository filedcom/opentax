/** Preserve the legacy one-payment field while requiring one complete inventory. */
export function principalRepayments<T>(
  note: {
    principal_repayment?: T;
    principal_repayments?: readonly T[];
  } | undefined,
): readonly T[] {
  if (note?.principal_repayment && note.principal_repayments) {
    throw Error("Form7203 note must use one principal repayment inventory");
  }
  return note?.principal_repayments ??
    (note?.principal_repayment ? [note.principal_repayment] : []);
}

export function notePrincipalRepaid(
  note: {
    principal_repayment?: { amount: number };
    principal_repayments?: readonly { amount: number }[];
  } | undefined,
): number {
  return principalRepayments(note).reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
}
