import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { sumSourceMoney } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import {
  calculateScheduleRAmounts,
  type ScheduleRBox,
} from "../../nodes/inputs/credits/elderly-disabled/schedule_r/calculation.ts";
import {
  calculateRetirementSources2026,
  retirementSource2026Schema,
} from "./retirement-source.ts";
import {
  calculateSocialSecuritySources2026,
  socialSecuritySource2026Schema,
} from "./social-security-source.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).transform((s) =>
  s.replaceAll("-", "")
);
const money = z.number().finite().nonnegative();
const whole = money.int().safe();
const date = z.string().date();
const physician = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("current_statement"),
    record_reference: ref,
    signed_on: date,
    certifies_disability_at_retirement_verified: z.literal(true),
    expected_duration: z.enum([
      "at_least_one_year",
      "death",
      "no_reasonable_probability_of_improvement",
    ]),
  }).strict(),
  z.object({
    kind: z.literal("prior_statement"),
    record_reference: ref,
    signed_on: date,
    filed_for_1983_or_earlier_or_physician_signed_line_b_verified: z.literal(
      true,
    ),
    continued_disability_and_no_substantial_gainful_activity_during_2026_verified:
      z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("va_21_0172"),
    record_reference: ref,
    signed_on: date,
    signed_by_authorized_va_official_verified: z.literal(true),
    permanent_total_disability_at_retirement_verified: z.literal(true),
  }).strict(),
]);
const mandatory = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("date"),
    record_reference: ref,
    reached_on: date,
    employer_required_retirement_date_verified: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("none"),
    record_reference: ref,
    employer_plan_has_no_mandatory_retirement_age_verified: z.literal(true),
  }).strict(),
]);
export const scheduleRClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: date,
    all_taxable_disability_and_nontaxable_benefit_sources_included: z.literal(
      true,
    ),
    no_foreign_tax_or_form8978_credit: z.literal(true),
    // Wage statements need a separate dated disability ledger before this review can be removed.
    all_taxable_disability_payments_reported_in_retirement_inventory: z.literal(
      true,
    ),
    retirement_inventory_reference: ref.optional(),
    ssa_inventory_reference: ref.optional(),
    mfs_lived_apart_all_year_record_reference: ref.optional(),
    disability: z.array(
      z.object({
        owner_tin: tin,
        record_reference: ref,
        permanent_total_disability_due_to_physical_or_mental_condition_verified:
          z.literal(true),
        no_substantial_gainful_activity_after_disability_retirement_verified: z
          .literal(true),
        permanent_total_disability_at_retirement_verified: z.literal(true),
        disability_onset_date: date,
        physician_statement: physician,
        plans: z.array(
          z.object({
            source_document_reference: ref,
            mandatory_retirement: mandatory,
          }).strict(),
        ).min(1),
      }).strict(),
    ).max(2),
    other_benefits: z.array(
      z.object({
        tax_year: z.literal(2026),
        statement_reference: ref,
        owner_tin: tin,
        payer: ref,
        treatment_record_reference: ref,
        amount: money,
        kind: z.enum([
          "veterans_pension",
          "other_federal_law_excluded",
          "military_service_disability",
          "foreign_service_section808",
          "return_of_cost",
          "internal_revenue_code_excluded",
        ]),
        exclusion_authority: ref,
      }).strict(),
    ).max(200),
  }).strict(),
}).strict();
export const scheduleRSource2026Schema = scheduleRClaim2026Schema.partial()
  .extend({
    filing_status: z.nativeEnum(FilingStatus),
    taxpayer_ssn: tin,
    taxpayer_dob: date,
    taxpayer_first_name: ref,
    spouse_ssn: tin.optional(),
    spouse_dob: date.optional(),
    spouse_first_name: ref.optional(),
    tax_residency: z.string().optional(),
    mfs_spouse_lived_with_taxpayer: z.boolean().optional(),
    retirement_sources_2026: retirementSource2026Schema.optional(),
    social_security_sources_2026: socialSecuritySource2026Schema.optional(),
    agi: z.number().int().safe(),
    gross_ssa: whole.default(0),
    taxable_ssa: whole.default(0),
    regular_tax: whole,
    schedule2_part1_tax: whole,
    finalized_dependent_care_credit: whole,
  }).strict();
export type ScheduleRSource2026 = z.input<typeof scheduleRSource2026Schema>;

export function calculateScheduleR2026(raw: ScheduleRSource2026) {
  const input = scheduleRSource2026Schema.parse(raw), c = input.claim;
  const empty = {
    source_input: input,
    box: null,
    lines: null,
    prior_statement_names: [] as string[],
    disability_workpaper: [] as {
      owner_tin: string;
      taxable_income: number;
      qualified: boolean;
    }[],
    file_schedule_r: false,
  };
  if (!c) return empty;
  if (
    c.reviewed_on < "2026-12-31" ||
    input.tax_residency !== "full_year_citizen_or_resident"
  ) {
    throw new Error(
      "Schedule R needs completed-year review and citizen/resident treatment",
    );
  }
  const joint = input.filing_status === FilingStatus.MFJ;
  if (
    joint &&
    (!input.spouse_ssn || !input.spouse_dob || !input.spouse_first_name ||
      input.spouse_ssn === input.taxpayer_ssn)
  ) {
    throw new Error(
      "Schedule R joint owners need distinct identities and birth dates",
    );
  }
  if (!joint && (input.spouse_dob || input.spouse_first_name)) {
    throw new Error("Schedule R spouse income requires a joint return");
  }
  if (input.filing_status === FilingStatus.MFS) {
    if (
      input.mfs_spouse_lived_with_taxpayer !== false ||
      !c.mfs_lived_apart_all_year_record_reference
    ) {
      throw new Error(
        "Schedule R MFS needs evidence that spouses lived apart all year",
      );
    }
  } else if (c.mfs_lived_apart_all_year_record_reference) {
    throw new Error("Schedule R MFS evidence needs MFS status");
  }
  const owners = [
    {
      tin: input.taxpayer_ssn,
      dob: input.taxpayer_dob,
      name: input.taxpayer_first_name,
    },
    ...(joint
      ? [{
        tin: input.spouse_ssn!,
        dob: input.spouse_dob!,
        name: input.spouse_first_name!,
      }]
      : []),
  ];
  if (owners.some((o) => o.dob > "2026-12-31")) {
    throw new Error("Schedule R birth dates must precede year end");
  }
  const retirement = input.retirement_sources_2026
    ? calculateRetirementSources2026(input.retirement_sources_2026)
    : undefined;
  const ssa = input.social_security_sources_2026
    ? calculateSocialSecuritySources2026(input.social_security_sources_2026)
    : undefined;
  for (const s of [retirement?.source_input, ssa?.source_input]) {
    if (
      s &&
      (s.filing_status !== input.filing_status ||
        s.taxpayer_ssn !== input.taxpayer_ssn ||
        s.spouse_ssn !== input.spouse_ssn)
    ) {
      throw new Error("Schedule R income sources must match return owners");
    }
  }
  if (
    retirement &&
    (retirement.source_input.taxpayer_dob !== input.taxpayer_dob ||
      retirement.source_input.spouse_dob !== input.spouse_dob)
  ) {
    throw new Error("Schedule R retirement birth dates disagree");
  }
  if (
    c.retirement_inventory_reference !==
      retirement?.source_input.claim.record_reference ||
    c.ssa_inventory_reference !== ssa?.source_input.inventory_record_reference
  ) {
    throw new Error(
      "Schedule R needs matching actual retirement and Social Security inventories",
    );
  }
  if (
    input.gross_ssa !== roundWholeDollars(ssa?.net_benefits ?? 0) ||
    input.taxable_ssa > input.gross_ssa
  ) {
    throw new Error(
      "Schedule R Social Security must reconcile the retained source and AGI worksheet",
    );
  }
  const refs = new Set<string>();
  const disability_workpaper = c.disability.map((d) => {
    const o = owners.find((o) => o.tin === d.owner_tin);
    if (!o || refs.has(d.owner_tin) || o.dob <= "1962-01-01") {
      throw new Error(
        "Schedule R disability review needs each under-65 owner once",
      );
    }
    refs.add(d.owner_tin);
    const p = d.physician_statement;
    if (
      d.disability_onset_date < o.dob ||
      d.disability_onset_date > "2026-12-31" ||
      p.signed_on < o.dob || p.signed_on > c.reviewed_on ||
      (p.kind === "prior_statement" && p.signed_on >= "2026-01-01")
    ) {
      throw new Error(
        "Schedule R physician and onset dates need chronological evidence",
      );
    }
    const distributions = retirement?.rows.filter((r) =>
      r.owner_tin === o.tin &&
      r.review.disability_income?.kind === "employer_disability_pension"
    ) ?? [];
    if (
      !distributions.length || d.plans.length !== distributions.length ||
      new Set(d.plans.map((p) =>
          p.source_document_reference
        )).size !== d.plans.length
    ) {
      throw new Error(
        "Schedule R disability plans must cover the owner's actual retirement payment inventory",
      );
    }
    const mandatoryPlans = new Map<string, string>();
    const amounts = distributions.flatMap((r) => {
      const source = r.review.disability_income!;
      if (source.kind !== "employer_disability_pension") {
        throw Error("Schedule R disability classification missing");
      }
      const plan = d.plans.find((p) =>
        p.source_document_reference === r.copy.source_document_reference
      );
      if (
        !plan || d.disability_onset_date > source.disability_retirement_date
      ) {
        throw new Error(
          "Schedule R needs disability at retirement and a matched employer plan",
        );
      }
      const cutoff = plan.mandatory_retirement.kind === "date"
        ? plan.mandatory_retirement.reached_on
        : undefined;
      if (
        cutoff &&
        (cutoff < o.dob || cutoff < source.minimum_retirement_age_date)
      ) {
        throw new Error(
          "Mandatory retirement cannot precede birth or minimum retirement age",
        );
      }
      const planKey = JSON.stringify([r.copy.payer_tin, r.copy.account_number]);
      const priorCutoff = mandatoryPlans.get(planKey),
        cutoffKey = cutoff ?? "none";
      if (priorCutoff !== undefined && priorCutoff !== cutoffKey) {
        throw Error(
          "Schedule R statements for one employer account need consistent mandatory retirement evidence",
        );
      }
      mandatoryPlans.set(planKey, cutoffKey);
      if (cutoff && cutoff <= "2026-01-01") return [];
      // The employer's reached-on date is the first day at mandatory retirement age.
      return source.payments.filter((p) => !cutoff || p.payment_date < cutoff)
        .map((p) => p.taxable);
    });
    const taxable_income = sumSourceMoney(amounts);
    return { owner_tin: o.tin, taxable_income, qualified: taxable_income > 0 };
  });
  refs.clear();
  for (const r of retirement?.rows ?? []) {
    refs.add(r.copy.source_document_reference);
  }
  for (const r of ssa?.source_input.statements ?? []) {
    refs.add(r.source_document_reference);
  }
  const other = c.other_benefits.map((b) => {
    if (
      !owners.some((o) => o.tin === b.owner_tin) ||
      refs.has(b.statement_reference)
    ) {
      throw new Error(
        "Schedule R other benefits need unique statements and matching owners",
      );
    }
    refs.add(b.statement_reference);
    return ["veterans_pension", "other_federal_law_excluded"].includes(b.kind)
      ? b.amount
      : 0;
  });
  const old = owners.map((o) => o.dob <= "1962-01-01");
  const disabled = owners.map((o) =>
    disability_workpaper.some((d) => d.owner_tin === o.tin && d.qualified)
  );
  let box: ScheduleRBox | null = null;
  if (joint) {
    box = old[0] && old[1]
      ? 3
      : (old[0] && disabled[1]) || (old[1] && disabled[0])
      ? 6
      : old.some(Boolean)
      ? 7
      : disabled.every(Boolean)
      ? 5
      : disabled.some(Boolean)
      ? 4
      : null;
  } else {box = old[0]
      ? (input.filing_status === FilingStatus.MFS ? 8 : 1)
      : disabled[0]
      ? (input.filing_status === FilingStatus.MFS ? 9 : 2)
      : null;}
  if (!box) return { ...empty, disability_workpaper };
  const lines = calculateScheduleRAmounts({
    box,
    agi: input.agi,
    disability_income: roundWholeDollars(
      sumSourceMoney(disability_workpaper.map((d) => d.taxable_income)),
    ),
    nontaxable_ssa: input.gross_ssa - input.taxable_ssa,
    nontaxable_other: roundWholeDollars(sumSourceMoney(other)),
    tax_before_credits: input.regular_tax + input.schedule2_part1_tax,
    prior_credits: input.finalized_dependent_care_credit,
  });
  const prior_statement_names = c.disability.filter((d) =>
    d.physician_statement.kind === "prior_statement" &&
    disability_workpaper.some((w) => w.owner_tin === d.owner_tin && w.qualified)
  ).map((d) => owners.find((o) => o.tin === d.owner_tin)!.name);
  return {
    source_input: input,
    box,
    lines,
    prior_statement_names,
    disability_workpaper,
    file_schedule_r: lines.line22 > 0,
  };
}
