import {
  calculateForm8826,
  type F8826Input,
} from "../../../../../nodes/inputs/credits/business/f8826/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";

function cents(amount: number): number {
  const result = Math.round(amount * 100);
  if (
    !Number.isSafeInteger(result) ||
    Math.abs(amount * 100 - result) > 0.000001
  ) {
    throw new Error("Form 8826 source needs cent precision");
  }
  return result;
}

/** A direct current-year interpreter expense tied to its filed deduction. */
export function reconcileForm8826SelfSource(
  input: F8826Input,
  pending: Readonly<Record<string, unknown>>,
): void {
  const evidence = input.self_source_evidence;
  if (!evidence) {
    throw new Error(
      "Form 8826 self credit needs expenditure and deduction source evidence",
    );
  }
  const lines = calculateForm8826(input);
  if (
    lines.line6 <= 0 || input.subject_to_passive_activity_limit
  ) {
    throw new Error(
      "Form 8826 sourced self route needs a nonpassive self claim",
    );
  }
  if (
    cents(evidence.prior_year_gross_receipts) !==
      cents(input.prior_year_gross_receipts ?? NaN) ||
    evidence.prior_year_full_time_employee_count !==
      input.prior_year_full_time_employee_count
  ) {
    throw new Error(
      "Form 8826 prior-year eligibility differs from source evidence",
    );
  }
  const expenseCents = evidence.interpreter_expenditures.reduce(
    (sum, expense) => sum + cents(expense.amount),
    0,
  );
  const deduction = evidence.schedule_c_line27b;
  if (
    expenseCents !== cents(input.eligible_expenditures) ||
    expenseCents !== cents(deduction.amount_before_credit_reduction) ||
    cents(deduction.credit_reduction_amount) !== cents(lines.line6) ||
    cents(deduction.amount_before_credit_reduction) -
          cents(deduction.credit_reduction_amount) !==
      cents(deduction.amount_after_credit_reduction)
  ) {
    throw new Error(
      "Form 8826 interpreter expenses and credit reduction do not reconcile",
    );
  }
  const filed = scheduleCInputSchema.parse(pending.schedule_c);
  const matching = filed.schedule_cs.filter((item) =>
    item.business_reference === evidence.business_reference
  );
  if (
    matching.length !== 1 ||
    cents(matching[0].line_27b_other_expenses ?? 0) !==
      cents(deduction.amount_after_credit_reduction) ||
    (matching[0].part_v_other_expenses?.length ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8826 credit reduction differs from filed Schedule C line 27b",
    );
  }
}
