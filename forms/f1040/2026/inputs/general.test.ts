import { assertEquals, assertThrows } from "@std/assert";
import { general_2026 } from "./general.ts";
import {
  DependentRelationship,
  filedDependentsFromGeneral,
  general,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { reviewedResidence2026 } from "./dependent-residency.ts";

const filer2026 = {
  tax_year: 2026 as const,
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Rivera",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1980-06-01",
  taxpayer_blind: false,
  taxpayer_can_be_claimed_as_dependent: false,
  taxpayer_citizen_national_or_work_authorized: true,
  digital_assets: false,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
};
const context = { taxYear: 2026, formType: "f1040" };
const child = {
  first_name: "Sam",
  last_name: "Rivera",
  ssn: "222334444",
  dob: "2010-06-01",
  relationship: DependentRelationship.Son,
  months_in_home: 12,
  lived_in_us_over_half_year: true,
  months_lived_with_you_in_us: 12,
  ssn_valid_for_employment: true,
  ssn_issued_before_due_date: true,
  tin_issued_by_due_date: true,
  us_citizen_national_or_resident: true,
  provided_over_half_own_support: false,
  filed_joint_return_except_refund_only: false,
};
function fields(
  input: Parameters<typeof general_2026.compute>[1],
  node = "f1040",
) {
  return general_2026.compute(context, input).outputs.find((row) =>
    row.nodeType === node
  )!.fields;
}
Deno.test("2026 general derives age and supplies one W-2/AGI owner context", () => {
  const input = { ...filer2026, taxpayer_dob: "1962-01-01" };
  assertEquals(fields(input).taxpayer_age_65_or_older, true);
  assertEquals(
    fields({ ...input, taxpayer_dob: "1962-01-02" }).taxpayer_age_65_or_older,
    false,
  );
  assertEquals(fields(input, "w2"), {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
  });
  assertEquals(fields(input, "agi_aggregator"), {
    filing_status: FilingStatus.Single,
  });
  assertThrows(
    () => fields({ ...input, taxpayer_age_65_or_older: false }),
    Error,
    "conflicts",
  );
  assertThrows(() => fields({ ...input, taxpayer_dob: "2026-02-30" }), Error);
  assertThrows(
    () =>
      fields({
        ...input,
        taxpayer_deceased: true,
        taxpayer_death_date: "2026-02-01",
      }),
    Error,
    "Deceased filer",
  );
  assertThrows(
    () =>
      fields({ ...input, spouse_citizen_national_or_work_authorized: false }),
    Error,
    "joint return",
  );
});
Deno.test("2026 dependent classification reuses tests with the new age year and $5,300 relative limit", () => {
  const turning17 = { ...child, dob: "2009-06-01" };
  const input = { ...filer2026, dependents: [turning17] };
  assertEquals(fields(input).qualifying_child_tax_credit_count, 0);
  assertEquals(fields(input).other_dependent_count, 1);
  assertEquals(filedDependentsFromGeneral(input)[0].credit_category, "ctc");
  const parent = {
    ...child,
    dob: "1950-01-01",
    relationship: DependentRelationship.Parent,
    months_in_home: 0,
    lived_in_us_over_half_year: false,
    months_lived_with_you_in_us: 0,
    taxpayer_provided_over_half_support: true,
    gross_income: 5_299,
  };
  assertEquals(
    fields({ ...filer2026, dependents: [parent] }).other_dependent_count,
    1,
  );
  assertEquals(
    filedDependentsFromGeneral({ ...filer2026, dependents: [parent] })[0]
      .credit_category,
    "none",
  );
  assertThrows(
    () =>
      fields({
        ...filer2026,
        dependents: [{ ...parent, gross_income: 5_300 }],
      }),
    Error,
    "qualifying-child/relative",
  );
});
Deno.test("2026 child credit and EIC use distinct SSN/support eligibility", () => {
  const input = { ...filer2026, dependents: [child] };
  assertEquals(fields(input).qualifying_child_tax_credit_count, 1);
  assertEquals(fields(input, "eitc").qualifying_children, 1);
  const unsupported = {
    ...child,
    provided_over_half_own_support: true,
    dependent_on_another_return: true,
  };
  assertEquals(
    fields({ ...filer2026, dependents: [unsupported] }).dependent_count,
    0,
  );
  assertEquals(
    fields({
      ...filer2026,
      taxpayer_ssn_issued_before_due_date: false,
      dependents: [child],
    }).qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(
    fields({
      ...filer2026,
      taxpayer_ssn_issued_before_due_date: false,
      dependents: [child],
    }, "eitc").filer_has_valid_ssns,
    true,
  );
});
Deno.test("2026 birth residency uses actual days but emits twelve Schedule EIC months", () => {
  const newborn = {
    ...child,
    dob: "2026-09-01",
    months_in_home: 4,
    months_lived_with_you_in_us: 4,
    residency_2026_review: {
      tax_year: 2026 as const,
      source_reference: "residence-review",
      all_home_periods_reviewed: true as const,
      birth_record_reference: "birth-certificate",
      periods: [{
        from: "2026-09-01",
        through: "2026-12-31",
        in_us: true,
        record_reference: "home-record",
      }],
    },
  };
  assertEquals(
    fields({ ...filer2026, dependents: [newborn] })
      .qualifying_child_tax_credit_count,
    1,
  );
  const eic = fields({ ...filer2026, dependents: [newborn] }, "eitc");
  assertEquals(eic.qualifying_children, 1);
  assertEquals(
    (eic.qualifying_child_details as Record<string, unknown>[])[0]
      .eic_printed_months,
    12,
  );
  assertThrows(
    () =>
      fields({
        ...filer2026,
        dependents: [{ ...newborn, residency_2026_review: undefined }],
      }),
    Error,
    "qualifying-child/relative",
  );
  assertThrows(
    () =>
      fields(
        {
          ...filer2026,
          dependents: [{
            ...newborn,
            residency_2026_review: {
              ...newborn.residency_2026_review,
              tax_year: 2025,
            },
          }],
        } as never,
      ),
    Error,
  );
});
Deno.test("2026 reviewed partial-year residence handles half-year boundary and rejects overlap", () => {
  const base = {
    ...child,
    months_in_home: 6,
    months_lived_with_you_in_us: 6,
    residency_2026_review: {
      tax_year: 2026 as const,
      source_reference: "dated-home",
      all_home_periods_reviewed: true as const,
      periods: [{
        from: "2026-07-02",
        through: "2026-12-31",
        in_us: true,
        record_reference: "home-period",
      }],
    },
  };
  assertEquals(reviewedResidence2026(base)?.days, 183);
  assertEquals(reviewedResidence2026(base)?.eicPrintedMonths, 7);
  assertEquals(
    fields({ ...filer2026, dependents: [base] }, "eitc").qualifying_children,
    1,
  );
  assertThrows(
    () =>
      reviewedResidence2026({
        ...base,
        residency_2026_review: {
          ...base.residency_2026_review,
          periods: [
            ...base.residency_2026_review.periods,
            ...base.residency_2026_review.periods,
          ],
        },
      }),
    Error,
    "nonoverlapping",
  );
  assertThrows(
    () =>
      reviewedResidence2026({
        ...base,
        residency_2026_review: {
          ...base.residency_2026_review,
          periods: [{
            ...base.residency_2026_review.periods[0],
            from: "2026-07-03",
          }],
        },
      }),
    Error,
    "disagree",
  );
});
Deno.test("2026 general rejects duplicate dependent TINs and unreviewed claims", () => {
  assertThrows(
    () =>
      fields({
        ...filer2026,
        dependents: [child, { ...child, first_name: "Other" }],
      }),
    Error,
    "distinct",
  );
  assertThrows(
    () =>
      fields({
        ...filer2026,
        dependents: [{ ...child, ssn: filer2026.taxpayer_ssn }],
      }),
    Error,
    "distinct",
  );
  assertThrows(
    () =>
      fields({ ...filer2026, dependents: [{ ...child, itin: "999887777" }] }),
    Error,
    "exactly one",
  );
  assertThrows(
    () =>
      fields({
        ...filer2026,
        dependents: [{ ...child, provided_over_half_own_support: undefined }],
      }),
    Error,
    "explicit",
  );
  assertThrows(
    () =>
      fields({
        ...filer2026,
        taxpayer_can_be_claimed_as_dependent: true,
        dependents: [child],
      }),
    Error,
    "cannot claim dependents",
  );
  assertThrows(
    () => fields({ ...filer2026, dependent_count: 2 } as never),
    Error,
    "Unrecognized key",
  );
});
Deno.test("2026 HOH and QSS need the qualifying person and year-specific status evidence", () => {
  const review = {
    tax_year: 2026 as const,
    record_reference: "status-review",
    unmarried_or_considered_unmarried: true as const,
    qualifying_person_tin: child.ssn,
    home_cost_record_reference: "home-costs",
  };
  const hoh = {
    ...filer2026,
    filing_status: FilingStatus.HOH,
    hoh_paid_more_than_half_home_costs: true,
    filing_status_2026_review: review,
    dependents: [child],
  };
  assertEquals(fields(hoh).filing_status, FilingStatus.HOH);
  assertThrows(
    () => fields({ ...hoh, hoh_paid_more_than_half_home_costs: false }),
    Error,
    "home costs",
  );
  const qss = {
    ...hoh,
    filing_status: FilingStatus.QSS,
    qss_spouse_death_year: 2025,
    filing_status_2026_review: {
      ...review,
      entitled_to_joint_return_in_death_year: true as const,
      child_home_all_year_verified: true as const,
    },
  };
  assertEquals(fields(qss).filing_status, FilingStatus.QSS);
  assertThrows(
    () => fields({ ...qss, qss_spouse_death_year: 2023 }),
    Error,
    "2024/2025",
  );
});
Deno.test("2026 MFJ validates spouse answers and routes dependent spouse and 2027 refund allocation", () => {
  const joint = {
    ...filer2026,
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Bea",
    spouse_last_name: "Rivera",
    spouse_ssn: "333445555",
    spouse_dob: "1960-05-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
    apply_overpayment_to_2027_estimated_tax_amount: 100,
  };
  assertEquals(fields(joint).spouse_age_65_or_older, true);
  assertEquals(fields(joint).line36_apply_to_2027, 100);
  assertThrows(
    () => fields({ ...joint, spouse_dob: undefined }),
    Error,
    "spouse date of birth",
  );
  assertThrows(
    () => fields({ ...joint, spouse_can_be_claimed_as_dependent: true }),
    Error,
    "refund-only",
  );
  const reviewed = {
    ...joint,
    spouse_can_be_claimed_as_dependent: true,
    mfj_dependent_refund_only_review: {
      review_reference: "joint-refund",
      joint_return_only_for_withholding_or_estimated_refund_verified:
        true as const,
    },
  };
  assertEquals(fields(reviewed).spouse_can_be_claimed_as_dependent, true);
  assertEquals(
    fields(reviewed, "standard_deduction").taxpayer_can_be_claimed_as_dependent,
    true,
  );
  // Existing 2025 entry point still works without the new 2026 source fields.
  assertEquals(
    general.compute({ formType: "f1040", taxYear: 2025 }, {
      filing_status: FilingStatus.Single,
    }).outputs.length > 0,
    true,
  );
});

Deno.test("2026 EIC source child can qualify without being claimed as a dependent", () => {
  const selfSupporting = {
    ...child,
    claim_as_dependent: false,
    provided_over_half_own_support: true,
  };
  const input = { ...filer2026, dependents: [selfSupporting] };
  assertEquals(fields(input).dependent_count, 0);
  assertEquals(fields(input).dependent_details, []);
  assertEquals(fields(input, "eitc").qualifying_children, 1);
  assertThrows(
    () =>
      fields({
        ...input,
        dependents: [{ ...selfSupporting, claim_as_dependent: true }],
      }),
    Error,
    "qualifying-child/relative",
  );
});
Deno.test("2026 student age and younger-than-filer tests use reviewed source facts", () => {
  const student = {
    ...child,
    dob: "2003-01-01",
    full_time_student: true,
    student_full_time_months: 5,
  };
  assertEquals(
    fields({ ...filer2026, dependents: [student] }, "eitc").qualifying_children,
    1,
  );
  assertThrows(
    () =>
      fields({
        ...filer2026,
        dependents: [{ ...student, student_full_time_months: 4 }],
      }),
    Error,
    "five months",
  );
  assertEquals(
    fields({
      ...filer2026,
      dependents: [{
        ...student,
        dob: "2002-12-31",
        claim_as_dependent: false,
      }],
    }, "eitc").qualifying_children,
    0,
  );
  assertEquals(
    fields({
      ...filer2026,
      taxpayer_dob: "2004-01-01",
      dependents: [{ ...student, claim_as_dependent: false }],
    }, "eitc").qualifying_children,
    0,
  );
  assertEquals(
    fields({
      ...filer2026,
      taxpayer_dob: "2004-01-01",
      dependents: [{ ...student, disabled: true, claim_as_dependent: false }],
    }, "eitc").qualifying_children,
    1,
  );
});

Deno.test("2026 death residency uses inclusive lifetime days and requires the death record", () => {
  const deceased = {
    ...child,
    dob: "2026-12-01",
    death_date: "2026-12-10",
    months_in_home: 1,
    months_lived_with_you_in_us: 1,
    residency_2026_review: {
      tax_year: 2026 as const,
      source_reference: "lifetime-review",
      all_home_periods_reviewed: true as const,
      birth_record_reference: "birth-record",
      death_record_reference: "death-record",
      periods: [{
        from: "2026-12-01",
        through: "2026-12-06",
        in_us: true,
        record_reference: "home-record",
      }],
    },
  };
  assertEquals(reviewedResidence2026(deceased)?.lifeDays, 10);
  const input = { ...filer2026, dependents: [deceased] };
  assertEquals(fields(input).qualifying_child_tax_credit_count, 1);
  assertEquals(fields(input, "eitc").qualifying_children, 1);
  assertEquals(
    (fields(input, "eitc").qualifying_child_details as Record<
      string,
      unknown
    >[])[0].eic_printed_months,
    12,
  );
  assertThrows(
    () =>
      fields({
        ...input,
        dependents: [{
          ...deceased,
          residency_2026_review: {
            ...deceased.residency_2026_review,
            death_record_reference: undefined,
          },
        }],
      }),
    Error,
    "death record",
  );
  assertThrows(
    () =>
      reviewedResidence2026({
        ...deceased,
        residency_2026_review: {
          ...deceased.residency_2026_review,
          periods: [{
            ...deceased.residency_2026_review.periods[0],
            through: "2026-12-05",
          }],
        },
      }),
    Error,
    "disagree",
  );
});
