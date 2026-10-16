import {
  hsaContribution2025HistorySchema,
  hsaLastMonth2025HistorySchema,
  reconcileHsaContribution2025History,
} from "./hsa-testing-history.ts";
import { sourceCents } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import { hsaTestingPeriodIncome } from "../../nodes/intermediate/forms/adjustments/health/form8889/testing-income.ts";
import { z } from "zod";
import {
  calculateHsaAnnualExcess2026,
  hsaAnnualExcess2026Schema,
} from "./hsa-annual-excess.ts";
import { hsaEligibility2026Schema } from "./hsa-eligibility.ts";
import { classifyHsaCoverage2026 } from "./hsa-plan-eligibility.ts";
import {
  hsaExactAmount,
  hsaExactArithmetic as math,
  roundHsaAmount,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

const ref = z.string().trim().min(1), date = z.string().date();
const month = hsaEligibility2026Schema.shape.months.element;
const cause = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ordinary"),
    review_reference: ref,
    no_death_or_disability_caused_eligibility_failure_verified: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("disability"),
    review_reference: ref,
    eligibility_lost_on: date,
    physician_record_reference: ref,
    disability_caused_loss_of_eligibility_verified: z.literal(true),
  }).strict(),
]);
/** Annual testing workpaper with dated current and prior contribution-year sources. */
export const hsaTestingPeriod2026Schema = hsaAnnualExcess2026Schema.extend({
  testing_review: z.object({
    record_reference: ref,
    reviewed_on: date,
    prior_contribution_histories: z.array(hsaContribution2025HistorySchema).max(
      2,
    ).default([]),
    prior_last_month_histories: z.array(hsaLastMonth2025HistorySchema).max(2)
      .default([]),
    owners: z.array(
      z.object({
        owner_tin: z.string().regex(/^\d{9}$/),
        history_reference: ref,
        no_2025_or_earlier_last_month_or_qualified_funding_testing_obligations_verified:
          z.literal(true).optional(),
        last_month_2025_history_reference: ref.optional(),
        funding_2025_history_reference: ref.optional(),
        no_prior_last_month_testing_obligations_verified: z.literal(true)
          .optional(),
        no_prior_qualified_funding_testing_obligations_verified: z.literal(true)
          .optional(),
        complete_dated_coverage_changes_including_midmonth_and_retroactive_changes_verified:
          z.literal(true),
        failure_cause: cause,
        periods: z.array(
          z.object({
            record_reference: ref,
            effective_from: date,
            effective_through: date,
            medicare: month.shape.medicare,
            other_coverage: month.shape.other_coverage,
          }).strict(),
        ).min(1).max(366),
      }).strict(),
    ).min(1).max(2),
  }).strict(),
}).strict();
export type HsaTestingPeriod2026 = z.input<typeof hsaTestingPeriod2026Schema>;

const days2026 = Array.from(
  { length: 365 },
  (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
);

export function calculateHsaTestingPeriod2026(raw: HsaTestingPeriod2026) {
  const input = hsaTestingPeriod2026Schema.parse(raw);
  const { testing_review: review, ...annualInput } = input;
  const annual = calculateHsaAnnualExcess2026(annualInput);
  const medical = annual.medical_sources,
    excess = medical.excess_return_sources!;
  const funding = excess.contribution_sources;
  if (
    review.reviewed_on < input.history_review.reviewed_on ||
    review.owners.length !== annual.owners.length ||
    new Set(review.owners.map((o) => o.owner_tin)).size !==
      review.owners.length ||
    review.owners.some((o) =>
      !annual.owners.some((a) => a.owner_tin === o.owner_tin)
    )
  ) {
    throw Error(
      "HSA testing review must follow annual settlement and identify every actual return owner once",
    );
  }
  const historySources = [
    ...review.prior_last_month_histories,
    ...review.prior_contribution_histories,
  ];
  const histories = new Map(
    historySources.map((
      h,
    ) => [h.record_reference, reconcileHsaContribution2025History(h)]),
  );
  if (
    histories.size !== historySources.length ||
    [...histories.values()].some((h) =>
      h.source_input.reviewed_on > review.reviewed_on ||
      !review.owners.some((o) =>
        o.last_month_2025_history_reference ===
          h.source_input.record_reference ||
        o.funding_2025_history_reference === h.source_input.record_reference
      )
    )
  ) {
    throw Error(
      "HSA prior testing histories must be distinct completed sources referenced by this return",
    );
  }
  const historicalOwners = [...histories.values()].flatMap((h) =>
    h.owners.map((o) => o.owner_tin)
  );
  if (new Set(historicalOwners).size !== historicalOwners.length) {
    throw Error(
      "HSA prior testing histories duplicate an owner across filed households",
    );
  }
  const owners = annual.owners.map((a) => {
    const owner = review.owners.find((o) => o.owner_tin === a.owner_tin)!;
    const eligibility = funding.source_input.household_eligibility.owners.find((
      o,
    ) => o.owner_tin === a.owner_tin)!;
    const lastHistory = owner.last_month_2025_history_reference
      ? histories.get(owner.last_month_2025_history_reference)
      : undefined;
    const fundingHistory = owner.funding_2025_history_reference
      ? histories.get(owner.funding_2025_history_reference)
      : undefined;
    const historical = lastHistory ?? fundingHistory;
    const prior = historical?.owners.find((o) => o.owner_tin === a.owner_tin);
    const allAbsent = owner
      .no_2025_or_earlier_last_month_or_qualified_funding_testing_obligations_verified;
    if (
      allAbsent
        ? owner.last_month_2025_history_reference !== undefined ||
          owner.funding_2025_history_reference !== undefined ||
          owner.no_prior_last_month_testing_obligations_verified !==
            undefined ||
          owner.no_prior_qualified_funding_testing_obligations_verified !==
            undefined
        : !prior ||
          (!!owner.last_month_2025_history_reference ===
            !!owner.no_prior_last_month_testing_obligations_verified) ||
          (!!owner.funding_2025_history_reference ===
            !!owner.no_prior_qualified_funding_testing_obligations_verified) ||
          (!!owner.last_month_2025_history_reference !==
            prior.last_month_rule_elected) ||
          (!!owner.funding_2025_history_reference !==
            (prior.qualified_funding_transfers.length > 0)) ||
          (owner.last_month_2025_history_reference !== undefined &&
            !lastHistory) ||
          (owner.funding_2025_history_reference !== undefined &&
            !fundingHistory) ||
          (lastHistory && fundingHistory && lastHistory !== fundingHistory)
    ) {
      throw Error(
        "HSA testing needs reviewed absence or one actual filed history for each owner's last-month and funding obligations",
      );
    }
    // A current owner present in a supplied household history cannot disclaim
    // the obligations recorded by that history.
    if (
      allAbsent &&
      [...histories.values()].some((h) =>
        h.owners.some((o) =>
          o.owner_tin === a.owner_tin &&
          (o.last_month_rule_elected ||
            o.qualified_funding_transfers.length > 0)
        )
      )
    ) {
      throw Error(
        "HSA testing absence contradicts supplied historical owner evidence",
      );
    }
    if (prior) {
      if (
        prior.owner_dob !== eligibility.owner_dob ||
        (a.prior_excess_source.kind === "filed_2025" &&
          a.prior_excess_source.filed_return_reference !==
            prior.filed_return_reference)
      ) {
        throw Error(
          "HSA prior testing identity and latest filed return must agree with annual source history",
        );
      }
      const currentReceipts = funding.source_input.claim.accounts.filter((a) =>
        a.owner_tin === owner.owner_tin
      ).flatMap((a) =>
        a.receipts.flatMap((r) =>
          (r.kind === "personal_cash" || r.kind === "employer_cash") &&
            r.contribution_tax_year === 2025 &&
            r.received_on.startsWith("2026-")
            ? [{
              ...r,
              trustee_tin: a.trustee_tin,
              account_number: a.account_number,
            }]
            : []
        )
      );
      const previousReceipts = prior.contributions.filter((r) =>
        r.received_on.startsWith("2026-")
      );
      if (
        currentReceipts.length !== previousReceipts.length ||
        currentReceipts.some((r) =>
          !previousReceipts.some((p) =>
            p.trustee_tin === r.trustee_tin &&
            p.account_number === r.account_number &&
            p.custodian_transaction_identifier ===
              r.custodian_transaction_identifier &&
            p.received_on === r.received_on && p.kind === r.kind &&
            sourceCents(p.amount) === sourceCents(r.amount)
          )
        )
      ) {
        throw Error(
          "HSA 2025 history must reconcile every actual 2026 receipt designated for 2025",
        );
      }
    }
    const contributions = funding.owners.find((o) =>
      o.owner_tin === a.owner_tin
    )!;
    const settlement = excess.owners.find((o) => o.owner_tin === a.owner_tin)!;
    const treatment = medical.source_input.treatment_review.owners.find((o) =>
      o.owner_tin === a.owner_tin
    )!;
    if (
      prior?.qualified_funding_transfers.length &&
      contributions.current_contributions.qualified_funding_transfers.length
    ) {
      throw Error(
        "HSA qualified funding election was already used in the filed prior year",
      );
    }
    const periods = [...owner.periods].sort((a, b) =>
      a.effective_from.localeCompare(b.effective_from)
    );
    if (
      new Set(periods.map((p) => p.record_reference)).size !== periods.length ||
      periods.some((p) =>
        p.effective_from > p.effective_through ||
        p.effective_from < "2026-01-01" || p.effective_through > "2026-12-31" ||
        (p.other_coverage.disposition === "permitted_only") !==
          !!p.other_coverage.permitted_coverage_statutory_basis_reference
      )
    ) {
      throw Error(
        "HSA testing periods need distinct ordered 2026 coverage sources and permitted-coverage evidence",
      );
    }
    const daily = days2026.map((day) => {
      const active = periods.filter((p) =>
        p.effective_from <= day && p.effective_through >= day
      );
      if (active.length !== 1) {
        throw Error(
          "HSA testing coverage must cover every day exactly once without gaps or overlaps",
        );
      }
      const p = active[0];
      if (day.endsWith("-01")) {
        const m = eligibility.months.find((m) =>
          m.month === Number(day.slice(5, 7))
        )!;
        if (
          JSON.stringify(m.medicare) !== JSON.stringify(p.medicare) ||
          JSON.stringify(m.other_coverage) !== JSON.stringify(p.other_coverage)
        ) {
          throw Error(
            "HSA testing continuity contradicts the source monthly Medicare or other coverage review",
          );
        }
      }
      const plans = eligibility.plans.filter((p) =>
        p.effective_from <= day && p.effective_through >= day
      );
      const dpcs = eligibility.direct_primary_care_arrangements.filter((p) =>
        p.effective_from <= day && p.effective_through >= day
      );
      if (
        new Set(plans.map((p) => p.policy_identifier)).size !== plans.length ||
        new Set(dpcs.map((p) => p.arrangement_identifier)).size !== dpcs.length
      ) {
        throw Error(
          "HSA testing-period policy or arrangement enrollment overlaps",
        );
      }
      return {
        day,
        coverage_review_reference: p.record_reference,
        ...classifyHsaCoverage2026(
          plans,
          dpcs,
          eligibility.can_be_claimed_as_dependent,
          p.medicare.enrolled,
          p.other_coverage.disposition,
          day,
        ),
      };
    });
    const disability = treatment.disability, causal = owner.failure_cause;
    if (
      causal.kind === "disability" &&
      (disability.kind !== "permanent_total" ||
        causal.physician_record_reference !==
          disability.physician_record_reference ||
        causal.eligibility_lost_on < disability.disability_onset_date ||
        causal.eligibility_lost_on > "2026-12-31" ||
        !daily.some((d) =>
          d.day === causal.eligibility_lost_on && d.eligible_coverage === null
        ) ||
        review.reviewed_on < disability.physician_determination_signed_on)
    ) {
      throw Error(
        "HSA testing disability exception needs the same physician evidence and an actual caused eligibility loss",
      );
    }
    // Section 223(c)(1) defines eligibility with respect to a month. Dated
    // changes are evidence; a lapse between eligible first days is not itself
    // an ineligible month. Never turn a December lapse into invented 2026 tax.
    const evaluate = (startsOn: string, endsOn: string) => {
      const first = daily.find((d) =>
        d.day >= startsOn && d.day <= endsOn && d.day.endsWith("-01") &&
        d.eligible_coverage === null
      );
      const excepted = first !== undefined && causal.kind === "disability" &&
        causal.eligibility_lost_on <= first.day &&
        daily.filter((d) =>
          d.day >= causal.eligibility_lost_on && d.day <= first.day
        )
          .every((d) => d.eligible_coverage === null) &&
        (daily.findIndex((d) => d.day === causal.eligibility_lost_on) === 0 ||
          daily[
              daily.findIndex((d) => d.day === causal.eligibility_lost_on) - 1
            ].eligible_coverage !== null);
      return {
        starts_on: startsOn,
        ends_on: endsOn,
        reviewed_through: "2026-12-31" as const,
        status: first
          ? excepted ? "excepted_disability" as const : "failed" as const
          : endsOn <= "2026-12-31"
          ? "completed" as const
          : "pending_2027" as const,
        first_ineligible_on: first?.day,
        disqualification_reasons: first?.disqualification_reasons ?? [],
        failure_source_reference: first?.coverage_review_reference,
        disability_cause_reference: excepted
          ? causal.review_reference
          : undefined,
      };
    };
    const zero = hsaExactAmount(0, 1), c = contributions.current_contributions;
    const retainedCash = math.subtractFloorZero(
      math.add(c.exact_personal, c.exact_employer),
      math.add(
        settlement.exact_personal_principal_returned,
        settlement.exact_employer_principal_returned,
      ),
    );
    // Retained excess is already subject to Part VII, not last-month recapture.
    // Notice 2008-51 separately caps recapture at allowed nonfunding cash.
    const allowedCash = math.min(
      retainedCash,
      math.subtractFloorZero(
        contributions.exact_limits.line8,
        c.exact_qualified_funding,
      ),
    );
    const lastMonthExposure = math.min(
      allowedCash,
      math.subtractFloorZero(
        math.add(allowedCash, c.exact_qualified_funding),
        contributions.exact_monthly_baseline_limits.line8,
      ),
    );
    const lastMonth = contributions.testing_obligation
      ? {
        ...evaluate(
          contributions.testing_obligation.starts_on,
          contributions.testing_obligation.ends_on,
        ),
        contribution_year: 2026,
        exact_exposure: lastMonthExposure,
        election_source_reference:
          funding.source_input.limit_review.record_reference,
      }
      : undefined;
    const transfers = c.qualified_funding_transfers.map((t) => ({
      ...t,
      testing: evaluate(t.testing_period.starts_on, t.testing_period.ends_on),
    }));
    const previousLastMonth = prior?.last_month_rule_elected
      ? {
        ...evaluate(
          prior.testing_period.starts_on,
          prior.testing_period.ends_on,
        ),
        contribution_year: 2025,
        exact_exposure: prior.exact_last_month_exposure,
        history_source_reference: historical!.source_input.record_reference,
        filed_form8889_source_reference: prior.form8889_source_reference,
      }
      : undefined;
    const priorTransfers = (prior?.qualified_funding_transfers ?? []).map((
      t,
    ) => ({
      ...t,
      history_source_reference: historical!.source_input.record_reference,
      filed_form8889_source_reference: prior!.form8889_source_reference,
      testing: t.first_ineligible_in_2025
        ? {
          starts_on: t.testing_period.starts_on,
          ends_on: t.testing_period.ends_on,
          reviewed_through: "2026-12-31" as const,
          status: "failed_2025" as const,
          first_ineligible_on: t.first_ineligible_in_2025,
        }
        : evaluate(t.testing_period.starts_on, t.testing_period.ends_on),
    }));
    const exact18 = math.add(
      lastMonth?.status === "failed" ? lastMonthExposure : zero,
      previousLastMonth?.status === "failed"
        ? prior!.exact_last_month_exposure
        : zero,
    );
    const exact19 = [...transfers, ...priorTransfers].filter((t) =>
      t.testing.status === "failed"
    )
      .reduce(
        (n, t) => math.add(n, hsaExactAmount(sourceCents(t.amount), 100)),
        zero,
      );
    const line18 = roundHsaAmount(exact18), line19 = roundHsaAmount(exact19);
    const filed = hsaTestingPeriodIncome(line18, line19);
    const line20 = filed.income;
    return {
      ...a,
      daily_coverage_review: daily,
      testing_months: daily.filter((d) => d.day.endsWith("-01")),
      last_month_testing: lastMonth,
      prior_last_month_testing: previousLastMonth,
      qualified_funding_testing: transfers,
      prior_qualified_funding_testing: priorTransfers,
      exact_part_iii_income: math.add(exact18, exact19),
      filed_part_iii: {
        line18,
        line19,
        line20,
        line21: roundWholeDollars(filed.additionalTax),
      },
      future_testing_obligations: [
        ...(lastMonth?.status === "pending_2027" &&
            lastMonthExposure.numerator > 0
          ? [{ kind: "last_month" as const, ...lastMonth }]
          : []),
        ...transfers.filter((t) => t.testing.status === "pending_2027").map((
          t,
        ) => ({ kind: "qualified_funding" as const, ...t })),
      ],
    };
  });
  return {
    source_input: input,
    annual_sources: annual,
    owners,
    schedule1_line8f_hsa_income: owners.reduce(
      (n, o) =>
        n + o.filed_part_iii.line20 +
        medical.owners.find((m) => m.owner_tin === o.owner_tin)!.filed_part_ii
          .line16,
      0,
    ),
    schedule2_line13d_hsa_testing_tax: owners.reduce(
      (n, o) => n + o.filed_part_iii.line21,
      0,
    ),
  };
}
