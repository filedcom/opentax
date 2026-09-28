import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { SCENARIO_1040_05_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import type { F8862Input } from "../../../nodes/inputs/f8862/index.ts";
import { form8862 as nativeForm8862 } from "./f8862.ts";

const source = SCENARIO_1040_05_FACTS;

const scenarioInput = {
  claim_eitc: true,
  claim_ctc: true,
  claim_aotc: true,
  eitc_income_reporting_only:
    source.form8862.eicDisallowedForIncomeReportingOnly,
  eitc_qualifying_child_of_other:
    source.form8862.taxpayerQualifyingChildOfAnotherTaxpayer,
  eitc_qualifying_children_count: 2,
  eitc_children: [
    {
      first_name: source.dependents[0].firstName,
      last_name: source.dependents[0].lastName,
      days_in_us: source.form8862.child1DaysInUnitedStates,
    },
    {
      first_name: source.dependents[1].firstName,
      last_name: source.dependents[1].lastName,
      days_in_us: source.form8862.child2DaysInUnitedStates,
    },
  ],
  ctc_qualifying_children_count: 2,
  // Citizenship and dependency answers are explicit fixture inputs, not
  // independently verified source facts from Scenario 5.
  ctc_children: [
    {
      first_name: source.dependents[0].firstName,
      last_name: source.dependents[0].lastName,
      lived_with_over_half_year: true,
      qualifying_child: source.form8862.child1QualifiesForChildTaxCredit,
      dependent: true,
      us_citizen_national_or_resident: true,
    },
    {
      first_name: source.dependents[1].firstName,
      last_name: source.dependents[1].lastName,
      lived_with_over_half_year: true,
      qualifying_child: source.form8862.child2QualifiesForChildTaxCredit,
      dependent: true,
      us_citizen_national_or_resident: true,
    },
  ],
  aotc_student_count: 1,
  aotc_students: [{
    first_name: source.taxpayer.firstName,
    last_name: source.taxpayer.lastName,
    eligible: source.form8862.studentEligibleForAotc,
    credit_claimed_four_prior_years:
      source.form8862.studentClaimedAotcForFourYears,
  }],
};

const finalizedContext = {
  pending: {
    f1040: {
      line27_eitc: 500,
      line19_child_tax_credit: 2_200,
      line29_refundable_aoc: 1_000,
    },
    f8863: {
      f8863s: [{
        credit_type: "aoc",
        student_name:
          `${source.taxpayer.firstName} ${source.taxpayer.lastName}`,
      }],
    },
  },
};
const form8862 = {
  build(fields: F8862Input) {
    return nativeForm8862.build(fields, finalizedContext);
  },
};

Deno.test("Form 8862 native filing rejects claims absent from the finalized return", () => {
  assertThrows(
    () =>
      nativeForm8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: true,
      }),
    Error,
    "finalized Form 1040",
  );
  assertThrows(
    () =>
      nativeForm8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: true,
      }, { pending: { f1040: { line27_eitc: 0 } } }),
    Error,
    "line 27",
  );
  assertThrows(
    () =>
      nativeForm8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: true,
      }, { pending: { f1040: { line27_eitc: "500" } } }),
    Error,
    "line 27",
  );
  assertThrows(
    () =>
      nativeForm8862.build(scenarioInput, {
        pending: { ...finalizedContext.pending, f8863: { f8863s: [] } },
      }),
    Error,
    "reconcile to Form 8863",
  );
  assertThrows(
    () =>
      nativeForm8862.build(scenarioInput, {
        pending: {
          ...finalizedContext.pending,
          f1040: {
            ...finalizedContext.pending.f1040,
            line19_child_tax_credit: 0,
          },
        },
      }),
    Error,
    "line 19 or 28",
  );
  assertThrows(
    () =>
      nativeForm8862.build(scenarioInput, {
        pending: {
          ...finalizedContext.pending,
          f1040: {
            ...finalizedContext.pending.f1040,
            line29_refundable_aoc: 0,
          },
        },
      }),
    Error,
    "reconcile to Form 8863",
  );
});

Deno.test("Form 8862 serializes three credit sections with sourced names and answers", () => {
  const xml = form8862.build(scenarioInput);
  assertStringIncludes(xml, "<TaxYr>2025</TaxYr>");
  assertStringIncludes(xml, "<EICClaimedInd>X</EICClaimedInd>");
  assertStringIncludes(xml, "<CTCACTCODCClaimedInd>X</CTCACTCODCClaimedInd>");
  assertStringIncludes(xml, "<AOTCClaimedInd>X</AOTCClaimedInd>");
  assertEquals((xml.match(/<FilerWithQualifyingChildGrp>/g) ?? []).length, 2);
  assertEquals((xml.match(/<CTCACTCChildInformationGrp>/g) ?? []).length, 2);
  assertEquals((xml.match(/<AOTCStudentInformationGrp>/g) ?? []).length, 1);
  assertStringIncludes(xml, "<LiveInUSDayCnt>365</LiveInUSDayCnt>");
  assertStringIncludes(xml, "<EligibleStudentInd>true</EligibleStudentInd>");
});

Deno.test("Form 8862 supports EITC without qualifying children", () => {
  const xml = form8862.build({
    claim_eitc: true,
    eitc_income_reporting_only: false,
    eitc_qualifying_child_of_other: false,
    eitc_without_child: {
      primary: {
        main_home_us_days: 365,
        age: 35,
        claimed_as_dependent: false,
      },
    },
  });
  assertStringIncludes(xml, "<QualifyingChildInd>false</QualifyingChildInd>");
  assertStringIncludes(xml, "<PrimaryNoQualifyingChildGrp>");
  assertStringIncludes(xml, "<AgeNum>35</AgeNum>");
});

Deno.test("Form 8862 rejects childless EITC with fewer than 183 US-home days", () => {
  const childless = {
    claim_eitc: true,
    eitc_income_reporting_only: false,
    eitc_qualifying_child_of_other: false,
    eitc_without_child: {
      primary: {
        main_home_us_days: 183,
        age: 35,
        claimed_as_dependent: false,
      },
      spouse: {
        main_home_us_days: 183,
        age: 35,
        claimed_as_dependent: false,
      },
    },
  };
  assertStringIncludes(
    form8862.build(childless),
    "<PrimaryNoQualifyingChildGrp>",
  );
  assertThrows(
    () =>
      form8862.build({
        ...childless,
        eitc_without_child: {
          ...childless.eitc_without_child,
          primary: {
            ...childless.eitc_without_child.primary,
            main_home_us_days: 182,
          },
        },
      }),
    Error,
    "at least 183 US-home days",
  );
  assertThrows(
    () =>
      form8862.build({
        ...childless,
        eitc_without_child: {
          ...childless.eitc_without_child,
          spouse: {
            ...childless.eitc_without_child.spouse,
            main_home_us_days: 182,
          },
        },
      }),
    Error,
    "at least 183 US-home days",
  );
});

Deno.test("Form 8862 stops Part II after an income-reporting-only EITC disallowance", () => {
  const xml = form8862.build({
    claim_eitc: true,
    eitc_income_reporting_only: true,
  });
  assertStringIncludes(
    xml,
    "<EICEligClmIncmIncorrectRptInd>true</EICEligClmIncmIncorrectRptInd>",
  );
  assertEquals(xml.includes("EICEligClmQlfyChldOfOtherInd"), false);
  assertEquals(xml.includes("FilerWithQualifyingChildGrp"), false);
  assertThrows(
    () =>
      form8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: true,
        eitc_qualifying_child_of_other: false,
      }),
    Error,
    "must not include the rest of Part II",
  );
});

Deno.test("Form 8862 rejects missing detail rather than filing an incomplete form", () => {
  assertEquals(form8862.build({}), "");
  assertEquals(form8862.build({ claim_eitc: false }), "");
  assertThrows(
    () => form8862.build({ claim_eitc: true }),
    Error,
    "income-reporting answer",
  );
  assertThrows(
    () =>
      form8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: false,
        eitc_qualifying_child_of_other: false,
      }),
    Error,
    "either qualifying-child or no-child detail",
  );
  assertThrows(
    () =>
      form8862.build({ ...scenarioInput, ctc_qualifying_children_count: 1 }),
    Error,
    "CTC child count does not match",
  );
  assertThrows(
    () => form8862.build({ claim_aotc: true }),
    Error,
    "AOTC needs student detail",
  );
  assertThrows(
    () =>
      form8862.build({
        claim_aotc: true,
        aotc_students: [{
          first_name: "Student",
          last_name: "Test",
          eligible: true,
          credit_claimed_four_prior_years: true,
        }],
      }),
    Error,
    "AOTC student is not credit-eligible",
  );
  assertThrows(
    () =>
      form8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: false,
        eitc_qualifying_child_of_other: false,
        eitc_children: [{
          first_name: "Child",
          last_name: "Test",
          days_in_us: 182,
        }],
      }),
    Error,
    "at least 183 US days",
  );
  assertThrows(
    () =>
      form8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: false,
        eitc_qualifying_child_of_other: false,
        eitc_children: [{
          first_name: "Child",
          last_name: "Test",
          days_in_us: 200,
          birth_month_day: "--07-04",
        }],
      }),
    Error,
    "requires 365 on line 7",
  );
  assertThrows(
    () =>
      form8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: false,
        eitc_qualifying_child_of_other: false,
        eitc_without_child: {
          primary: {
            main_home_us_days: 365,
            age: 35,
            claimed_as_dependent: true,
          },
        },
      }),
    Error,
    "cannot be another taxpayer's dependent",
  );
  assertThrows(
    () =>
      form8862.build({
        claim_eitc: false,
        eitc_children: [{ first_name: "Child", last_name: "Test" }],
      }),
    Error,
    "EITC detail requires an EITC claim",
  );
  assertThrows(
    () =>
      form8862.build({
        claim_eitc: true,
        eitc_income_reporting_only: false,
        eitc_qualifying_child_of_other: false,
        eitc_children: [{
          first_name: "Child",
          last_name: "Test",
          birth_month_day: "--02-31",
        }],
      }),
    Error,
  );
});
