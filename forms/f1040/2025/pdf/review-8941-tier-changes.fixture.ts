import {
  calculateForm8941,
  inputSchema,
} from "../../nodes/inputs/f8941/index.ts";
import { monthCoverageDates } from "../../nodes/inputs/f8941/shop_evidence.ts";
import { arrangementQuoteContribution } from "../../nodes/inputs/f8941/arrangements.ts";
import {
  form8941MultiplePlanInputs,
  form8941MultiplePlanSource,
} from "./review-8941-multiple-plans.fixture.ts";

const money = (n: number) => Math.round(n * 100) / 100;
const period = (ref: string, first: number, last: number) => ({
  first_month: first,
  last_month: last,
  coverage_start_date: monthCoverageDates(first).start,
  coverage_end_date: monthCoverageDates(last).end,
  enrollment_source_reference: ref,
});

/** Actual dated marriage, birth and divorce facts across two owned QHPs. */
export function form8941TierChangeSource(
  kind: "reference-list" | "independent-mixed" = "reference-list",
) {
  const source: any = structuredClone(
    form8941MultiplePlanSource(kind),
  );
  const template = source.employees[0].covered_dependents;
  const changes = [
    {
      index: 1,
      spouse: "Synthetic changed spouse-one",
      spouseSsn: "777554401",
      child: "Synthetic newborn-one",
      childSsn: "777554402",
      birth: true,
    },
    {
      index: 3,
      spouse: "Synthetic changed spouse-two",
      spouseSsn: "777554403",
      birth: false,
    },
  ];
  for (const change of changes) {
    const e = source.employees[change.index];
    const spouse = {
      ...structuredClone(template[0]),
      dependent_reference: change.spouse,
      dependent_ssn: change.spouseSsn,
      enrollment_source_reference:
        `Synthetic dependent enrollment-${change.index}-spouse`,
      plan_eligibility_records: source.offered_qhps.map((plan: any) => ({
        shop_plan_reference: plan.shop_plan_reference,
        plan_dependent_eligibility_source_reference:
          `Synthetic dependent eligibility-${change.index}-spouse-${plan.shop_plan_reference}`,
        eligible_plan_dependent_confirmed: true,
        eligibility_period: period(
          `Synthetic dependent eligible period-${change.index}-spouse-${plan.shop_plan_reference}`,
          4,
          9,
        ),
      })),
    };
    const child = change.birth
      ? {
        ...structuredClone(template[1]),
        dependent_reference: change.child,
        dependent_ssn: change.childSsn,
        enrollment_source_reference:
          `Synthetic dependent enrollment-${change.index}-child`,
        plan_eligibility_records: source.offered_qhps.map((plan: any) => ({
          shop_plan_reference: plan.shop_plan_reference,
          plan_dependent_eligibility_source_reference:
            `Synthetic dependent eligibility-${change.index}-child-${plan.shop_plan_reference}`,
          eligible_plan_dependent_confirmed: true,
          eligibility_period: period(
            `Synthetic dependent eligible period-${change.index}-child-${plan.shop_plan_reference}`,
            7,
            12,
          ),
        })),
      }
      : undefined;
    e.covered_dependents = child ? [spouse, child] : [spouse];
    e.coverage_periods = [
      {
        ...period(`Synthetic tier enrollment-${change.index}-self-first`, 1, 3),
        coverage_tier: "employee_only",
        covered_dependent_references: [],
      },
      {
        ...period(`Synthetic tier enrollment-${change.index}-married`, 4, 6),
        coverage_tier: "family",
        covered_dependent_references: [spouse.dependent_reference],
        change_event: {
          event_type: "marriage",
          dependent_reference: spouse.dependent_reference,
          effective_date: "2025-03-20",
          relationship_source_reference:
            `Synthetic marriage certificate-${change.index}`,
        },
      },
      ...(child
        ? [{
          ...period(`Synthetic tier enrollment-${change.index}-newborn`, 7, 9),
          coverage_tier: "family",
          covered_dependent_references: [
            spouse.dependent_reference,
            child.dependent_reference,
          ],
          change_event: {
            event_type: "birth",
            dependent_reference: child.dependent_reference,
            effective_date: "2025-06-25",
            relationship_source_reference:
              `Synthetic birth certificate-${change.index}`,
          },
        }]
        : []),
      {
        ...period(`Synthetic tier enrollment-${change.index}-divorced`, 10, 12),
        coverage_tier: child ? "family" : "employee_only",
        covered_dependent_references: child ? [child.dependent_reference] : [],
        change_event: {
          event_type: "divorce",
          dependent_reference: spouse.dependent_reference,
          effective_date: "2025-09-18",
          relationship_source_reference:
            `Synthetic divorce decree-${change.index}`,
        },
      },
    ];
    if (!child) {
      e.coverage_periods[1] = {
        ...e.coverage_periods[1],
        last_month: 9,
        coverage_end_date: monthCoverageDates(9).end,
      };
    }
    const review = source.shop_review.employee_premium_reviews[change.index];
    review.covered_dependents = structuredClone(e.covered_dependents);
    review.coverage_periods = structuredClone(e.coverage_periods);
  }
  // Worker three is employed only through September in the existing packet;
  // extend actual employment, eligibility and enrollment to retain divorce's
  // October self-only premium in this bounded source.
  const e3 = source.employees[3],
    r3 = source.shop_review.employee_premium_reviews[3];
  for (const field of ["employment_period"] as const) {
    e3[field].last_month = 12;
    e3[field].coverage_end_date = monthCoverageDates(12).end;
    r3[field] = structuredClone(e3[field]);
  }
  for (
    const field of [
      "plan_eligibility_periods",
      "enrollment_selections",
    ] as const
  ) {
    for (const p of e3[field]) {
      p.last_month = 12;
      p.coverage_end_date = monthCoverageDates(12).end;
    }
    r3[field] = structuredClone(e3[field]);
  }
  for (const p of e3.coverage_periods) {
    if (p.first_month === 10) {
      p.last_month = 12;
      p.coverage_end_date = monthCoverageDates(12).end;
    }
  }
  r3.coverage_periods = structuredClone(e3.coverage_periods);
  // Rebuild quoted rosters after the employment extension, then invoices from
  // each selected monthly insurer quote and reference-plan entitlement.
  for (const policy of source.monthly_plan_arrangements) {
    if (policy.month < 10) continue;
    const prior = source.monthly_plan_arrangements.find((p: any) =>
      p.month === 9 && p.shop_plan_reference === policy.shop_plan_reference
    );
    const q = structuredClone(
      prior.eligible_employee_quotes.find((q: any) =>
        q.employee_reference === e3.employee_reference
      ),
    );
    q.quote_source_reference =
      `Synthetic quote-extended-${policy.shop_plan_reference}-${policy.month}`;
    policy.eligible_employee_quotes.push(q);
    if (policy.reference_contributions) {
      const c = structuredClone(
        prior.reference_contributions.find((c: any) =>
          c.employee_reference === e3.employee_reference
        ),
      );
      c.contribution_source_reference =
        `Synthetic entitlement-extended-${policy.month}`;
      policy.reference_contributions.push(c);
    }
  }
  for (const change of changes) {
    const e = source.employees[change.index],
      review = source.shop_review.employee_premium_reviews[change.index];
    const months = new Map<number, any>();
    for (const p of e.coverage_periods) {
      for (let m = p.first_month; m <= p.last_month; m++) {
        months.set(m, p);
      }
    }
    const invoices = review.monthly_premiums;
    if (change.index === 3) {
      for (let m = 10; m <= 12; m++) {
        const invoice = structuredClone(invoices[8]);
        invoice.month = m;
        invoice.coverage_start_date = monthCoverageDates(m).start;
        invoice.coverage_end_date = monthCoverageDates(m).end;
        invoice.invoice_date = `2025-${String(m).padStart(2, "0")}-05`;
        invoice.payment_date = `2025-${String(m).padStart(2, "0")}-15`;
        invoice.shop_invoice_reference =
          `Synthetic invoice-extended-${change.index}-${m}`;
        invoice.employer_payment_reference =
          `Synthetic payment-extended-${change.index}-${m}`;
        invoices.push(invoice);
      }
    }
    for (const invoice of invoices) {
      const p = months.get(invoice.month);
      const policy = source.monthly_plan_arrangements.find((p: any) =>
        p.shop_plan_reference === invoice.shop_plan_reference &&
        p.month === invoice.month
      );
      const quote = policy.eligible_employee_quotes.find((q: any) =>
        q.employee_reference === e.employee_reference
      );
      const reference = kind === "reference-list"
        ? source.monthly_plan_arrangements.find((p: any) =>
          p.shop_plan_reference === source.reference_shop_plan_reference &&
          p.month === invoice.month
        )
        : undefined;
      const contribution = reference?.reference_contributions.find((c: any) =>
        c.employee_reference === e.employee_reference
      );
      invoice.coverage_tier = p.coverage_tier;
      invoice.covered_dependent_references = [
        ...p.covered_dependent_references,
      ];
      invoice.billed_premium = p.coverage_tier === "family"
        ? quote.family_premium
        : quote.employee_only_premium;
      invoice.employer_payment = kind === "reference-list"
        ? money(
          Math.min(
            invoice.billed_premium,
            p.coverage_tier === "family"
              ? contribution.family_contribution
              : contribution.employee_only_contribution,
          ),
        )
        : arrangementQuoteContribution(policy, quote, p.coverage_tier)
          .employerPayment;
      invoice.insured_quote_reference = quote.quote_source_reference;
      invoice.employer_policy_reference = policy.employer_policy_reference;
      if (reference) {
        invoice.reference_policy_reference =
          reference.employer_policy_reference;
        invoice.reference_contribution_source_reference =
          contribution.contribution_source_reference;
      } else {
        delete invoice.reference_policy_reference;
        delete invoice.reference_contribution_source_reference;
      }
    }
    e.tax_year_shop_premium = money(
      invoices.reduce((n: number, x: any) => n + x.billed_premium, 0),
    );
    e.employer_premium_paid = money(
      invoices.reduce((n: number, x: any) => n + x.employer_payment, 0),
    );
  }
  return inputSchema.parse(source);
}

export function form8941TierChangeInputs(receipts = 350000) {
  const input = form8941MultiplePlanInputs("reference-list", receipts);
  const source = form8941TierChangeSource();
  if (!("employees" in source)) throw new Error("Expected multiple-QHP source");
  const lines = calculateForm8941(source);
  return {
    ...input,
    f8941: source,
    schedule_c: input.schedule_c.map((b) => ({
      ...b,
      line_26_wages: source.employees.reduce(
        (n, e) => n + e.social_security_medicare_wages,
        0,
      ),
      line_14_employee_benefits: source.other_schedule_c_employee_benefits +
        lines.line4,
    })),
  };
}
