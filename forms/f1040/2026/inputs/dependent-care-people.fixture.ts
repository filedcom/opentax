import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { monthlyCareFixture2026 } from "./dependent-care-earned.fixture.ts";
import type { CarePerson2026 } from "./dependent-care-people.ts";
import type { CareEarnedIncomeReview2026 } from "./dependent-care-earned.ts";
import { DependentRelationship } from "../../nodes/inputs/general/filing/general/index.ts";
import type { Dependent2026 } from "./dependents.ts";

export const incapacityFixture2026 = () => ({
  record_reference: "medical-incapacity-record",
  physically_or_mentally_unable_to_care_for_self: true as const,
  periods: [{ from: "2026-01-01", through: "2026-12-31" }],
  outside_home_care: "regularly_at_least_eight_hours_at_home" as const,
});

export function disabledCarePersonFixture2026() {
  const base = dependentCareFixture2026();
  const child = base.general.dependents[0];
  const person: Dependent2026 = {
    ...child,
    first_name: "CareParent",
    dob: "1950-06-01",
    relationship: DependentRelationship.Parent,
    claim_as_dependent: false,
    taxpayer_provided_over_half_support: true,
    gross_income: 8000,
    // Section 21 incapacity is distinct from permanent-total-disability QC status.
    disabled: false,
  };
  const review: CarePerson2026 = {
    kind: "disabled_person",
    tin: child.ssn,
    review_reference: "adult-care-dependency-review",
    incapacity: incapacityFixture2026(),
    dependency_exceptions: {
      gross_income: true,
      joint_return: false,
      filer_claimable_as_dependent: false,
    },
  };
  base.form2441.claim.qualifying_people = [review];
  return { ...base, general: { ...base.general, dependents: [person] } };
}

export function disabledCareSpouseFixture2026() {
  const base = monthlyCareFixture2026();
  base.form2441.claim.benefits = undefined;
  base.w2s = base.w2s.map((w) => ({ ...w, box10_dep_care: 0 }));
  const monthly = base.form2441.claim.earned_income as Extract<
    CareEarnedIncomeReview2026,
    { method: "monthly" }
  >;
  monthly.taxpayer.months.forEach((m) => {
    m.taxable_care_benefits = 0;
  });
  monthly.spouse!.incapacity_record_reference = "spouse-incapacity-record";
  monthly.spouse!.months.forEach((m) => {
    m.incapable_of_self_care = true;
    m.full_time_student = false;
  });
  const review: CarePerson2026 = {
    kind: "disabled_spouse",
    tin: base.general.spouse_ssn,
    review_reference: "spouse-care-review",
    incapacity: incapacityFixture2026(),
    residence: {
      months_in_home: 12,
      months_lived_with_you_in_us: 12,
      residency_2026_review: {
        tax_year: 2026,
        source_reference: "spouse-home-record",
        all_home_periods_reviewed: true,
        periods: [{
          from: "2026-01-01",
          through: "2026-12-31",
          in_us: true,
          record_reference: "spouse-home-calendar",
        }],
      },
    },
  };
  base.form2441.claim.qualifying_people = [review];
  base.form2441.claim.expenses[0].person_tin = base.general.spouse_ssn;
  base.general.dependents = [];
  return base;
}

export function custodialCareFixture2026(equalNights = false) {
  const base = dependentCareFixture2026();
  const child: Dependent2026 = {
    ...base.general.dependents[0],
    claim_as_dependent: false,
    dependent_on_another_return: true,
    // Jan 1 through July 19 = 200 nights; through June 29 = 180 nights.
    months_in_home: equalNights ? 6 : 7,
    months_lived_with_you_in_us: equalNights ? 6 : 7,
    lived_in_us_over_half_year: !equalNights,
    residency_2026_review: {
      tax_year: 2026,
      source_reference: "custody-calendar",
      all_home_periods_reviewed: true,
      periods: [{
        from: "2026-01-01",
        through: equalNights ? "2026-06-29" : "2026-07-19",
        in_us: true,
        record_reference: "reviewed-overnight-home-record",
      }],
    },
  };
  const review: CarePerson2026 = {
    kind: "custodial_child",
    tin: child.ssn!,
    review_reference: "custodial-care-review",
    qualifying_basis: { kind: "under_13" },
    custody: {
      record_reference: "parental-custody-and-support-review",
      parents_status: "divorced_or_legally_separated",
      parents_provided_over_half_support: true,
      nights_with_taxpayer: equalNights ? 180 : 200,
      nights_with_other_parent: equalNights ? 180 : 165,
      ...(equalNights ? { other_parent_agi: 49999 } : {}),
    },
  };
  base.form2441.claim.qualifying_people = [review];
  base.form2441.claim.expenses[0].incurred_end_date = equalNights
    ? "2026-06-29"
    : "2026-07-19";
  return { ...base, general: { ...base.general, dependents: [child] } };
}

export function newbornCareFixture2026() {
  const base = dependentCareFixture2026();
  const child: Dependent2026 = {
    ...base.general.dependents[0],
    claim_as_dependent: true,
    dob: "2026-10-01",
    months_in_home: 3,
    months_lived_with_you_in_us: 3,
    lived_in_us_over_half_year: true,
    residency_2026_review: {
      tax_year: 2026,
      source_reference: "newborn-home-review",
      birth_record_reference: "birth-record",
      all_home_periods_reviewed: true,
      periods: [{
        from: "2026-10-01",
        through: "2026-12-31",
        in_us: true,
        record_reference: "newborn-home-record",
      }],
    },
  };
  base.form2441.claim.expenses[0].incurred_start_date = "2026-10-01";
  return { ...base, general: { ...base.general, dependents: [child] } };
}

export function disabledCareOverflowFixture2026() {
  const f = disabledCarePersonFixture2026(), person = f.general.dependents[0];
  const review = f.form2441.claim.qualifying_people[0];
  f.general.dependents = Array.from({ length: 4 }, (_, i) => ({
    ...person,
    first_name: `CareParent${i + 1}`,
    ssn: String(222334444 + i),
  }));
  f.form2441.claim.qualifying_people = f.general.dependents.map((p) => ({
    ...review,
    tin: p.ssn!,
  }));
  return f;
}
