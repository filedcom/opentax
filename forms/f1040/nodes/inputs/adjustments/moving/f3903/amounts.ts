/** Shared arithmetic; eligibility and the source of reimbursement are year-owned. */
export function movingExpenseBalance(expenses: number, reimbursements: number) {
  return {
    deduction: Math.max(0, expenses - reimbursements),
    taxableExcess: Math.max(0, reimbursements - expenses),
  };
}
