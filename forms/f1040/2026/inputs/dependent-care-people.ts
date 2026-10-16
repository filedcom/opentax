import { z } from "zod";
import {
  careDependentSourceEligible,
  DependentRelationship,
  passesRelationshipTest,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { type Dependent2026, dependentRules2026 } from "./dependents.ts";
import {
  residency2026Schema,
  reviewedResidence2026,
  validDate2026,
} from "./dependent-residency.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const period = z.object({ from: z.string().date(), through: z.string().date() })
  .strict();
const incapacity = z.object({
  record_reference: ref,
  physically_or_mentally_unable_to_care_for_self: z.literal(true),
  periods: z.array(period).min(1).max(24),
  outside_home_care: z.enum(["none", "regularly_at_least_eight_hours_at_home"]),
}).strict();
const common = { tin, review_reference: ref };
const exceptions = z.object({
  gross_income: z.boolean(),
  joint_return: z.boolean(),
  filer_claimable_as_dependent: z.boolean(),
}).strict();
export const carePerson2026Schema = z.discriminatedUnion("kind", [
  z.object({
    ...common,
    kind: z.literal("dependent_child"),
    care_only_while_under_13: z.literal(true),
    custodial_parent_and_dependency_requirements_met: z.literal(true),
  }).strict(),
  z.object({
    ...common,
    kind: z.literal("disabled_person"),
    incapacity,
    dependency_exceptions: exceptions,
  }).strict(),
  z.object({
    ...common,
    kind: z.literal("disabled_spouse"),
    incapacity,
    residence: z.object({
      months_in_home: z.number().int().min(0).max(12),
      months_lived_with_you_in_us: z.number().int().min(0).max(12),
      residency_2026_review: residency2026Schema,
    }).strict(),
  }).strict(),
  z.object({
    ...common,
    kind: z.literal("custodial_child"),
    qualifying_basis: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("under_13") }).strict(),
      z.object({ kind: z.literal("incapacity"), incapacity }).strict(),
    ]),
    custody: z.object({
      record_reference: ref,
      parents_status: z.enum([
        "divorced_or_legally_separated",
        "written_separation",
        "lived_apart_last_six_months",
      ]),
      parents_provided_over_half_support: z.literal(true),
      nights_with_taxpayer: z.number().int().min(0).max(365),
      nights_with_other_parent: z.number().int().min(0).max(365),
      // Only needed for equal nights; final calculated AGI must be greater.
      other_parent_agi: z.number().int().optional(),
    }).strict(),
  }).strict(),
]);
export type CarePerson2026 = z.input<typeof carePerson2026Schema>;
export interface CarePeopleContext2026 {
  filing_status: FilingStatus;
  taxpayer_ssn: string;
  taxpayer_dob: string;
  taxpayer_can_be_claimed_as_dependent: boolean;
  spouse_ssn?: string;
  spouse_first_name?: string;
  spouse_last_name?: string;
  spouse_dob?: string;
  spouse_can_be_claimed_as_dependent?: boolean;
  dependents: Dependent2026[];
}
const normalized = (value: string) => value.replaceAll("-", "");
const day = 86400000,
  firstDay = Date.UTC(2026, 0, 1),
  lastDay = Date.UTC(2026, 11, 31);
const monthsInPeriods = (periods: { start: number; end: number }[]) =>
  Array.from(
    { length: 12 },
    (_, month) =>
      periods.some((p) =>
        p.start <= Date.UTC(2026, month + 1, 0) &&
        p.end >= Date.UTC(2026, month, 1)
      ),
  );
function life(dob: string, death?: string) {
  const birth = validDate2026(dob, "Care person's birth date");
  const start = Math.max(firstDay, birth);
  const end = death
    ? validDate2026(death, "Care person's death date")
    : lastDay;
  if (start > end) {
    throw new Error("Care person must have been alive during 2026");
  }
  // A qualifying child ceases to be under 13 on their thirteenth birthday.
  const b = new Date(birth);
  const age13 = Date.UTC(
    b.getUTCFullYear() + 13,
    b.getUTCMonth(),
    b.getUTCDate(),
  );
  return { start, end, age13 };
}
function home(d: Dependent2026) {
  const reviewed = reviewedResidence2026(d);
  if ((d.dob.startsWith("2026-") || d.death_date) && !reviewed) {
    throw new Error(
      "Care birth/death eligibility needs dated lifetime residence",
    );
  }
  return reviewed?.overHalfWithFiler ?? d.months_in_home > 6;
}
function disabledPeriods(
  source: z.infer<typeof incapacity>,
  bounds: ReturnType<typeof life>,
) {
  const result = source.periods.map((p) => ({
    start: validDate2026(p.from, "Incapacity start"),
    end: validDate2026(p.through, "Incapacity end"),
  })).sort((a, b) => a.start - b.start);
  let last = bounds.start - day;
  for (const p of result) {
    if (
      p.start < bounds.start || p.end > bounds.end || p.start > p.end ||
      p.start <= last
    ) {
      throw new Error(
        "Care incapacity periods must be nonoverlapping and inside the 2026 lifetime",
      );
    }
    last = p.end;
  }
  return result;
}

/** Reuse the common dependency/residence tests, then apply section 21's
 * distinct incapacity and divorced-parent rules without changing 1040 dependents. */
export function resolveCarePeople2026(
  raw: CarePerson2026[],
  ctx: CarePeopleContext2026,
) {
  const inputs = z.array(carePerson2026Schema).max(25).parse(raw);
  const rules = dependentRules2026(ctx.taxpayer_dob, ctx.spouse_dob);
  const filerClaimable = ctx.taxpayer_can_be_claimed_as_dependent ||
    ctx.spouse_can_be_claimed_as_dependent === true;
  const seen = new Set<string>();
  const people = inputs.map((c) => {
    const id = normalized(c.tin);
    if (seen.has(id)) throw new Error("Duplicate care qualifying person");
    seen.add(id);
    let firstName: string, lastName: string, bounds: ReturnType<typeof life>;
    let periods: { start: number; end: number }[];
    let disabled = false;
    let otherParentAgi: number | undefined;
    let spouseIncapacityMonths: boolean[] | undefined;
    if (c.kind === "disabled_spouse") {
      if (
        ![FilingStatus.MFJ, FilingStatus.MFS].includes(ctx.filing_status) ||
        !ctx.spouse_ssn ||
        id !== normalized(ctx.spouse_ssn) || !ctx.spouse_first_name ||
        !ctx.spouse_last_name || !ctx.spouse_dob
      ) {
        throw new Error(
          "Disabled care spouse must match the identified married spouse",
        );
      }
      firstName = ctx.spouse_first_name;
      lastName = ctx.spouse_last_name;
      bounds = life(ctx.spouse_dob);
      const residence = reviewedResidence2026({
        ...c.residence,
        dob: ctx.spouse_dob,
      });
      if (!residence?.overHalfWithFiler) {
        throw new Error(
          "Disabled care spouse must share the home over half the year",
        );
      }
      periods = disabledPeriods(c.incapacity, bounds);
      disabled = true;
      spouseIncapacityMonths = monthsInPeriods(periods);
    } else {
      const matches = ctx.dependents.filter((d) =>
        normalized(d.ssn ?? d.itin ?? d.atin ?? "") === id
      );
      if (matches.length !== 1) {
        throw new Error(
          "Care person needs exactly one matching general person record",
        );
      }
      const d = matches[0];
      firstName = d.first_name;
      lastName = d.last_name;
      bounds = life(d.dob, d.death_date);
      if (c.kind === "dependent_child") {
        if (
          filerClaimable || !passesRelationshipTest(d) || !home(d) ||
          !careDependentSourceEligible(d, rules) ||
          d.provided_over_half_own_support !== false
        ) {
          throw new Error(
            "Care child needs matching dependency, relationship, support and residence facts",
          );
        }
        periods = [{
          start: bounds.start,
          end: Math.min(bounds.end, bounds.age13 - day),
        }];
      } else if (c.kind === "disabled_person") {
        const e = c.dependency_exceptions;
        if (
          e.filer_claimable_as_dependent !== filerClaimable ||
          (e.gross_income &&
            (d.gross_income ?? -1) <
              rules.qualifyingRelativeGrossIncomeLimit) ||
          (e.joint_return &&
            d.filed_joint_return_except_refund_only !== true) ||
          (!e.joint_return &&
            d.filed_joint_return_except_refund_only !== false) ||
          !home(d) ||
          !careDependentSourceEligible(d, rules, {
            disregardGrossIncome: e.gross_income,
            disregardJointReturn: e.joint_return,
          })
        ) {
          throw new Error(
            "Disabled care person's dependency exceptions must reconcile to general source facts",
          );
        }
        periods = disabledPeriods(c.incapacity, bounds);
        disabled = true;
      } else {
        if (
          ![
            DependentRelationship.Son,
            DependentRelationship.Daughter,
            DependentRelationship.StepChild,
            DependentRelationship.FosterChild,
          ].includes(d.relationship)
        ) {
          throw new Error("Custodial care exception needs the filer's child");
        }
        const custody = c.custody;
        const residence = reviewedResidence2026(d);
        if (
          filerClaimable || d.provided_over_half_own_support === true ||
          d.us_citizen_national_or_resident !== true ||
          d.filed_joint_return_except_refund_only !== false ||
          !residence || residence.days !== custody.nights_with_taxpayer
        ) {
          throw new Error(
            "Custodial care needs consistent dated home/custody records and dependency support facts",
          );
        }
        const total = custody.nights_with_taxpayer +
          custody.nights_with_other_parent;
        const lifeDays = (bounds.end - bounds.start) / day + 1;
        if (
          total > lifeDays || total * 2 <= lifeDays ||
          custody.nights_with_taxpayer < custody.nights_with_other_parent
        ) {
          throw new Error(
            "Care requires the custodial parent and over-half-year combined parental custody",
          );
        }
        if (custody.nights_with_taxpayer === custody.nights_with_other_parent) {
          if (custody.other_parent_agi === undefined) {
            throw new Error(
              "Equal-night care custody needs the other parent's AGI",
            );
          }
          otherParentAgi = custody.other_parent_agi;
        } else if (custody.other_parent_agi !== undefined) {
          throw new Error(
            "Custody AGI tie-breaker applies only to equal nights",
          );
        }
        if (c.qualifying_basis.kind === "under_13") {
          periods = [{
            start: bounds.start,
            end: Math.min(bounds.end, bounds.age13 - day),
          }];
        } else {
          periods = disabledPeriods(c.qualifying_basis.incapacity, bounds);
          disabled = true;
        }
      }
    }
    if (periods.some((p) => p.end < p.start)) {
      throw new Error("Care child has no under-13 qualifying days in 2026");
    }
    return {
      first_name: firstName,
      last_name: lastName,
      name_control: lastName.replace(/[^A-Za-z]/g, "").slice(0, 4)
        .toUpperCase(),
      ssn: id,
      over_12_and_disabled: disabled &&
        periods.some((p) => p.end >= bounds.age13),
      credit_expenses_paid: 0,
      eligible_periods: periods,
      qualifying_months: monthsInPeriods(periods),
      custody_other_parent_agi: otherParentAgi,
      spouse_incapacity_months: spouseIncapacityMonths,
    };
  });
  return {
    people,
    qualifying_people_by_month: Array.from(
      { length: 12 },
      (_, i) => people.filter((p) => p.qualifying_months[i]).length,
    ),
  };
}

export function assertCareServiceDates2026(
  person: { eligible_periods: { start: number; end: number }[] },
  from: string,
  through: string,
  paid: string,
) {
  const start = validDate2026(from, "Care service start"),
    end = validDate2026(through, "Care service end");
  validDate2026(paid, "Care payment date");
  if (
    ![from, through, paid].every((d) => d.startsWith("2026-")) || start > end
  ) {
    throw new Error(
      "Current care receipts need ordered 2026 service dates and 2026 payment",
    );
  }
  let next = start;
  for (const p of person.eligible_periods) {
    if (p.end < next) continue;
    if (p.start > next) break;
    next = p.end + day;
    if (next > end) return;
  }
  throw new Error(
    "Care services fall outside the person's qualifying age, lifetime or incapacity dates",
  );
}
