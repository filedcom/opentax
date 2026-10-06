import { z } from "zod";

/** Retain cent amounts in the source; round only completed filed totals. */
export const premiumMoney = z.number().finite().nonnegative().refine(
  (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
  "Premium amount needs at most two decimal places",
);
const reference = z.string().trim().min(1);
const percentage = z.object({
  method: z.literal("uniform_percentage"),
  employer_basis_points: z.number().int().min(5000).max(10000),
}).strict();
const employeeContribution = z.object({
  method: z.literal("uniform_employee_contribution"),
  employee_monthly_contribution: premiumMoney,
}).strict();
const quoteSchema = z.object({
  employee_reference: reference,
  employee_ssn: z.string().regex(/^\d{9}$/),
  quote_source_reference: reference,
  employee_only_premium: premiumMoney.refine((n) => n > 0),
  family_premium: premiumMoney.refine((n) => n > 0).optional(),
}).strict();
export const monthlyArrangementSchema = z.object({
  month: z.number().int().min(1).max(12),
  employer_policy_reference: reference,
  payer_employment_ein: z.string().regex(/^\d{9}$/),
  shop_plan_reference: reference,
  coverage_start_date: z.string(),
  coverage_end_date: z.string(),
  billing_method: z.enum(["composite", "list"]),
  employee_only_rule: z.union([percentage, employeeContribution]),
  family_rule: z.union([
    percentage,
    employeeContribution,
    z.object({
      method: z.literal("uniform_employer_amount"),
      employer_monthly_contribution: premiumMoney,
    }).strict(),
    z.object({ method: z.literal("employee_only_floor") }).strict(),
  ]).optional(),
  // Both premiums are quoted for every eligible employee, even when the
  // employee enrolls in another tier or does not enroll in this month.
  eligible_employee_quotes: z.array(quoteSchema).min(1).max(24),
}).strict();
export type MonthlyArrangement = z.infer<typeof monthlyArrangementSchema>;
interface ArrangementSource {
  readonly employment_ein: string;
  readonly shop_plan_reference: string;
  readonly monthly_arrangements: readonly MonthlyArrangement[];
  readonly employees: readonly {
    readonly employee_reference: string;
    readonly employee_ssn: string;
    readonly coverage_tier: "employee_only" | "family";
    readonly irs_2025_rating_area_average_premium: number;
  }[];
  readonly shop_review: {
    readonly employee_premium_reviews: readonly {
      readonly employee_reference: string;
      readonly monthly_premiums: readonly {
        readonly month: number;
        readonly billed_premium: number;
        readonly employer_payment: number;
        readonly employer_policy_reference?: string;
        readonly insured_quote_reference?: string;
        readonly shop_invoice_reference: string;
        readonly employer_payment_reference: string;
      }[];
      readonly enrollment_and_payroll_record_reference: string;
      readonly covered_dependents?: readonly {
        readonly enrollment_source_reference: string;
      }[];
    }[];
  };
}
export const cents = (n: number): number => Math.round(n * 100);
const dollars = (n: number): number => cents(n) / 100;
function fail(message: string): never {
  throw new Error(`Form 8941 arrangement ${message}`);
}

/** 26 CFR 1.45R-4(b)(2)-(4), with every invoice bound to its month policy/quote. */
export function arrangementWorksheet(source: ArrangementSource) {
  const employees = new Map(
    source.employees.map((e) => [e.employee_reference, e]),
  );
  if (employees.size !== source.employees.length) {
    fail("employee roster is duplicated");
  }
  const policies = new Map<number, MonthlyArrangement>();
  const documents = new Set<string>();
  const addDocument = (ref: string) => {
    if (documents.has(ref)) fail("source reference is reused");
    documents.add(ref);
  };
  for (const review of source.shop_review.employee_premium_reviews) {
    addDocument(review.enrollment_and_payroll_record_reference);
    for (const dependent of review.covered_dependents ?? []) {
      addDocument(dependent.enrollment_source_reference);
    }
    for (const invoice of review.monthly_premiums) {
      addDocument(invoice.shop_invoice_reference);
      addDocument(invoice.employer_payment_reference);
    }
  }
  for (const policy of source.monthly_arrangements) {
    const start = `2025-${String(policy.month).padStart(2, "0")}-01`;
    const end = new Date(Date.UTC(2025, policy.month, 0)).toISOString().slice(
      0,
      10,
    );
    if (policies.has(policy.month)) fail("policy month is duplicated");
    if (
      policy.payer_employment_ein !== source.employment_ein ||
      policy.shop_plan_reference !== source.shop_plan_reference ||
      policy.coverage_start_date !== start || policy.coverage_end_date !== end
    ) {
      fail("policy ownership or coverage dates differ");
    }
    addDocument(policy.employer_policy_reference);
    const quoted = new Set<string>();
    for (const quote of policy.eligible_employee_quotes) {
      const employee = employees.get(quote.employee_reference);
      if (
        !employee || employee.employee_ssn !== quote.employee_ssn ||
        quoted.has(quote.employee_reference)
      ) fail("eligible quote identity differs");
      quoted.add(quote.employee_reference);
      addDocument(quote.quote_source_reference);
      if (
        Boolean(policy.family_rule) !== (quote.family_premium !== undefined)
      ) {
        fail(
          "offered family tier needs every eligible employee's reference premium",
        );
      }
      if (
        quote.family_premium !== undefined &&
        quote.family_premium < quote.employee_only_premium
      ) {
        fail("family reference premium is below employee-only coverage");
      }
    }
    if (quoted.size !== employees.size) {
      fail("eligible reference quote roster is incomplete");
    }
    if (policy.billing_method === "composite") {
      if (
        policy.employee_only_rule.method !== "uniform_percentage" ||
        (policy.family_rule &&
          !["uniform_percentage", "uniform_employer_amount"].includes(
            policy.family_rule.method,
          ))
      ) {
        fail(
          "composite billing needs percentage or uniform higher-tier employer amount",
        );
      }
      const first = policy.eligible_employee_quotes[0];
      if (
        policy.eligible_employee_quotes.some((q) =>
          q.employee_only_premium !== first.employee_only_premium ||
          q.family_premium !== first.family_premium
        )
      ) {
        fail("composite reference premiums differ by employee");
      }
    } else if (policy.family_rule?.method === "uniform_employer_amount") {
      fail(
        "list higher-tier dollar payments need employee-specific employee-only floors",
      );
    }
    for (
      const [tier, rule] of [
        ["employee_only", policy.employee_only_rule],
        ["family", policy.family_rule],
      ] as const
    ) {
      if (rule?.method === "uniform_employee_contribution") {
        if (
          policy.eligible_employee_quotes.some((q) =>
            rule.employee_monthly_contribution >
              (tier === "employee_only"
                ? q.employee_only_premium
                : q.family_premium!)
          )
        ) {
          fail(
            "uniform employee contribution exceeds an eligible reference premium",
          );
        }
        const average = policy.eligible_employee_quotes.reduce((sum, q) =>
          sum + (tier === "employee_only"
            ? q.employee_only_premium
            : q.family_premium!), 0) /
          policy.eligible_employee_quotes.length;
        // (b)(3)(ii): the employee contribution, rather than the employer's
        // dollar payment, is uniform and cannot exceed half the computed rate.
        if (rule.employee_monthly_contribution > average / 2 + 0.000001) {
          fail(
            "uniform employee contribution exceeds half the computed composite rate",
          );
        }
      }
    }
    policies.set(policy.month, policy);
  }
  const usedMonths = new Set<number>();
  const rows = [];
  for (const review of source.shop_review.employee_premium_reviews) {
    const employee = employees.get(review.employee_reference);
    if (!employee) fail("invoice employee is unknown");
    for (const invoice of review.monthly_premiums) {
      const policy = policies.get(invoice.month);
      if (!policy) fail("invoice has no policy for its coverage month");
      usedMonths.add(invoice.month);
      const quote = policy.eligible_employee_quotes.find((q) =>
        q.employee_reference === employee.employee_reference
      )!;
      if (
        invoice.employer_policy_reference !==
          policy.employer_policy_reference ||
        invoice.insured_quote_reference !== quote.quote_source_reference
      ) {
        fail("invoice policy or insured quote join differs");
      }
      const selfRule = policy.employee_only_rule;
      const selfPaid = selfRule.method === "uniform_percentage"
        ? dollars(
          quote.employee_only_premium * selfRule.employer_basis_points / 10000,
        )
        : dollars(
          quote.employee_only_premium - selfRule.employee_monthly_contribution,
        );
      if (selfPaid < 0) {
        fail(
          "uniform employee contribution exceeds employee-only reference premium",
        );
      }
      const billed = employee.coverage_tier === "family"
        ? quote.family_premium
        : quote.employee_only_premium;
      const rule = employee.coverage_tier === "family"
        ? policy.family_rule
        : selfRule;
      if (
        !rule || billed === undefined ||
        cents(billed) !== cents(invoice.billed_premium)
      ) {
        fail("invoice tier premium differs from eligible quote");
      }
      let expected: number;
      switch (rule.method) {
        case "uniform_percentage":
          expected = dollars(billed * rule.employer_basis_points / 10000);
          break;
        case "uniform_employee_contribution":
          expected = dollars(billed - rule.employee_monthly_contribution);
          break;
        case "uniform_employer_amount":
          expected = rule.employer_monthly_contribution;
          if (expected + 0.000001 < selfPaid) {
            fail(
              "higher-tier amount is below hypothetical employee-only contribution",
            );
          }
          break;
        case "employee_only_floor":
          expected = invoice.employer_payment;
          if (expected + 0.000001 < selfPaid) {
            fail(
              "list higher-tier payment is below hypothetical employee-only contribution",
            );
          }
          break;
      }
      if (
        expected < 0 || expected > billed ||
        cents(expected) !== cents(invoice.employer_payment)
      ) {
        fail("employer payment differs from the qualifying monthly rule");
      }
      // Instructions Worksheet4(c), Example4: use the actual contribution
      // percentage for each enrolled period, including dollar-payment exceptions.
      const adjustmentPercentage = rule.method === "uniform_percentage"
        ? rule.employer_basis_points / 10000
        : invoice.employer_payment / billed;
      rows.push({
        employee_reference: employee.employee_reference,
        month: invoice.month,
        coverage_tier: employee.coverage_tier,
        employer_policy_reference: policy.employer_policy_reference,
        insured_quote_reference: quote.quote_source_reference,
        billed_premium: billed,
        employer_payment: invoice.employer_payment,
        hypothetical_employee_only_payment: selfPaid,
        effective_employer_percentage: invoice.employer_payment / billed,
        adjusted_average_percentage: adjustmentPercentage,
        adjusted_average_premium:
          employee.irs_2025_rating_area_average_premium / 12 *
          adjustmentPercentage,
      });
    }
  }
  if (usedMonths.size !== policies.size) {
    fail("policy month has no enrolled invoices");
  }
  return rows;
}
