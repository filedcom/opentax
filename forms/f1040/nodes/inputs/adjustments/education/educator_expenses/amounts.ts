/** Apply a separately verified educator's annual adjustment cap. */
export function educatorExpenseDeduction(
  expenses: number,
  eligible: boolean,
  cap: number,
): number {
  return eligible ? Math.min(expenses, cap) : 0;
}
