import base from "./parent-remarriage-base.fixture.json" with { type: "json" };
import { inputSchema } from "../../../../../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";

// Reviewed synthetic source facts, not issuer-authenticated records. Expected
// FICA wages follow Pub. 926 and the service-time rule in 31.3121(c)-1.
export const parentRemarriageCases = [
  {
    id: "divorced-majority",
    prior: "divorced",
    period: "within_31_days",
    beforeHours: 60,
    afterHours: 40,
    wages: 4000,
    tax: 1340,
  },
  {
    id: "widowed-tie",
    prior: "widowed",
    period: "within_31_days",
    beforeHours: 50,
    afterHours: 50,
    wages: 4000,
    tax: 1340,
  },
  {
    id: "divorced-minority",
    prior: "divorced",
    period: "within_31_days",
    beforeHours: 40,
    afterHours: 60,
    wages: 0,
    tax: 728,
  },
  {
    id: "divorced-long",
    prior: "divorced",
    period: "over_31_days",
    beforeHours: 40,
    afterHours: 60,
    wages: 2900,
    tax: 1172,
  },
  {
    id: "divorced-irregular",
    prior: "divorced",
    period: "no_ordinary_period",
    beforeHours: 40,
    afterHours: 60,
    wages: 2900,
    tax: 1172,
  },
] as const;

export function parentRemarriageInput(c: typeof parentRemarriageCases[number]) {
  const h = inputSchema.parse(base.schedule_h);
  const payroll = h.fica_only_payroll!;
  const parent = payroll.employee_wages.find((worker) =>
    worker.relationship === "parent"
  );
  if (
    !parent || parent.relationship !== "parent" || !parent.w2 ||
    parent.parent_fica_review.classification === "excluded"
  ) throw new Error("Expected parent source");
  const event = {
    kind: "remarried_capable_spouse" as const,
    prior_status: c.prior,
    prior_marriage_end_date: "2020-06-15",
    prior_marriage_end_source_reference: `issued-prior-${c.prior}-record`,
    no_remarriage_before_event_source_reference:
      "2025-pre-may15-marital-continuity",
    remarriage_date: "2025-05-15",
    marriage_source_reference: "2025-may15-issued-marriage-record",
    spouse_ssn: "400001070",
    spouse_residence_source_reference: "2025-may15-june30-spouse-residence",
    spouse_care_capacity_source_reference:
      "2025-may15-june30-spouse-care-capacity",
    living_with_capable_spouse_from_marriage_through_quarter_verified:
      true as const,
  };
  const quarterly_circumstances = parent.parent_fica_review
    .quarterly_circumstances.map((q) => ({
      ...q,
      employer_circumstances: q.quarter === 2 ? event : q.quarter > 2
        ? {
          kind: "married_capable_spouse" as const,
          spouse_ssn: event.spouse_ssn,
          spouse_relationship_source_reference: event.marriage_source_reference,
          spouse_residence_source_reference:
            `2025-q${q.quarter}-new-spouse-residence`,
          spouse_care_capacity_source_reference:
            `2025-q${q.quarter}-new-spouse-care-capacity`,
          living_with_capable_spouse_throughout_quarter_verified: true as const,
        }
        : c.prior === "divorced"
        ? {
          kind: "divorced_not_remarried" as const,
          divorce_date: event.prior_marriage_end_date,
          divorce_source_reference: event.prior_marriage_end_source_reference,
          no_remarriage_throughout_quarter_verified: true as const,
          continuity_source_reference: "2025-q1-no-remarriage-review",
        }
        : {
          kind: "widowed_not_remarried" as const,
          spouse_death_date: event.prior_marriage_end_date,
          death_source_reference: event.prior_marriage_end_source_reference,
          no_remarriage_throughout_quarter_verified: true as const,
          continuity_source_reference: "2025-q1-no-remarriage-review",
        },
    }));
  const payment = (
    id: string,
    from: string,
    to: string,
    paid: string,
    hours: number,
    cash: number,
  ) => ({
    payment_reference: `${id}-bank-payment`,
    service_allocation_reference: `${id}-service-allocation`,
    paid_date: paid,
    service_from: from,
    service_to: to,
    service_hours: hours,
    cash_wages: cash,
    ordinary_pay_period: {
      kind: c.period,
      period_from: c.period === "no_ordinary_period"
        ? from
        : c.period === "over_31_days"
        ? ({
          march: "2025-01-01",
          september: "2025-07-01",
          december: "2025-10-01",
        }[id] ?? "2025-04-01")
        : `${from.slice(0, 7)}-01`,
      period_to: c.period === "no_ordinary_period" ? to : ({
        march: "2025-03-31",
        september: "2025-09-30",
        december: "2025-12-31",
      }[id] ?? "2025-06-30"),
      period_source_reference: `${id}-pay-period`,
      service_time_source_reference: `${id}-timesheet`,
    },
  });
  const wages = [
    payment("march", "2025-03-10", "2025-03-20", "2025-03-31", 80, 2000),
    payment(
      "may-before",
      "2025-05-01",
      "2025-05-14",
      "2025-06-30",
      c.beforeHours,
      900,
    ),
    payment(
      "may-after",
      "2025-05-15",
      "2025-05-31",
      "2025-06-30",
      c.afterHours,
      1100,
    ),
    payment("september", "2025-09-01", "2025-09-20", "2025-09-30", 80, 2000),
    payment("december", "2025-12-01", "2025-12-10", "2025-12-31", 80, 2000),
  ].map((p) =>
    !p.payment_reference.startsWith("may-") ? p : ({
      ...p,
      ordinary_pay_period: {
        kind: c.period,
        period_from: c.period === "over_31_days" ? "2025-04-01" : "2025-05-01",
        period_to: c.period === "over_31_days" ? "2025-06-30" : "2025-05-31",
        period_source_reference: "may-actual-pay-period",
        service_time_source_reference: "may-complete-timesheet",
      },
    })
  );
  const reviewed = inputSchema.parse({
    ...h,
    ss_wages: 2800 + c.wages,
    medicare_wages: 2800 + c.wages,
    fica_only_payroll: {
      ...payroll,
      employee_wages: payroll.employee_wages.map((worker) =>
        worker.relationship !== "parent" ? worker : ({
          ...worker,
          annual_cash_wages: 8000,
          quarterly_cash_wages: [2000, 2000, 2000, 2000],
          w2: {
            ...parent.w2,
            box1_wages: 8000,
            box3_social_security_wages: c.wages,
            box5_medicare_wages: c.wages,
          },
          parent_fica_review: {
            classification: "dated_service_periods",
            quarterly_circumstances,
            complete_service_payment_ledger_source_reference:
              "2025-complete-parent-service-cash-ledger",
            ...(c.period === "no_ordinary_period"
              ? {
                no_ordinary_frequency_review: {
                  employer_pay_practice_source_reference:
                    "2025-irregular-employer-practice",
                  complete_payment_period_ledger_source_reference:
                    "2025-irregular-all-payment-periods",
                  no_ordinary_payment_period_verified: true,
                },
              }
              : {}),
            wage_payments: wages,
          },
        })
      ),
    },
  });
  return { ...structuredClone(base), schedule_h: reviewed };
}
