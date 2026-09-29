import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateSeniorOnlySchedule1A,
  type SeniorOnlyLines,
  seniorZeroExclusionsReviewSchema,
} from "../../../nodes/intermediate/forms/schedule1a/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { buildMefXml } from "../builder.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../types.ts";
import { schedule1a } from "./schedule1a.ts";

Deno.test("Schedule 1-A omits context-only input before validating fractional return AGI", () => {
  assertEquals(
    schedule1a.build(
      { filing_status: FilingStatus.Single, magi: 74_348.18 },
      { pending: { f1040: { line11_agi: 74_348.18 } } },
    ),
    "",
  );
});

const review = {
  no_section933_puerto_rico_excluded_income: true as const,
  section933_review_source_reference: "2025 residency and income review",
  no_form2555_filed: true as const,
  form2555_review_source_reference: "2025 foreign-income return review",
  no_form4563_filed: true as const,
  form4563_review_source_reference: "2025 Samoa-source income review",
};

const joint = {
  filing_status: FilingStatus.MFJ,
  magi: 160_000,
  taxpayer_age_65_or_older: true,
  taxpayer_has_valid_ssn: true,
  taxpayer_ssn: "111223333",
  spouse_age_65_or_older: true,
  spouse_has_valid_ssn: true,
  spouse_ssn: "222334444",
  senior_zero_exclusions_review: review,
};

const joint1040 = {
  filing_status: FilingStatus.MFJ,
  line11_agi: 160_000,
  line13b_additional_deductions: 10_800,
  schedule1a_line37_senior_deduction: 10_800,
  taxpayer_ssn: "111223333",
  taxpayer_age_65_or_older: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  spouse_ssn: "222334444",
  spouse_age_65_or_older: true,
  spouse_ssn_valid_for_employment: true,
  spouse_ssn_issued_before_due_date: true,
  spouse_tin_issued_by_due_date: true,
};

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "SENIOR TAXPAYER",
  nameControl: "SENI",
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: MefFilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "222334444",
    firstName: "Spouse",
    lastName: "Senior",
    nameControl: "SENI",
  },
};

Deno.test("Schedule 1-A senior-only source calculates each spouse and line 38", () => {
  const lines: SeniorOnlyLines = calculateSeniorOnlySchedule1A(
    { taxYear: 2025, formType: "f1040" },
    joint,
  );
  assertEquals(lines, {
    line1_agi: 160_000,
    line3_magi: 160_000,
    line32_threshold: 150_000,
    line33_excess_magi: 10_000,
    line34_reduction: 600,
    line35_per_person: 5_400,
    line36a_taxpayer: 5_400,
    line36b_spouse: 5_400,
    line37_senior: 10_800,
    line38_total: 10_800,
  });
  const xml = schedule1a.build(joint, { pending: { f1040: joint1040 } });
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>160000</AdjustedGrossIncomeAmt>",
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>160000</ModifiedAGIAmt>");
  assertStringIncludes(
    xml,
    "<PrimaryEnhancedSeniorDedAmt>5400</PrimaryEnhancedSeniorDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<SpouseEnhancedSeniorDedAmt>5400</SpouseEnhancedSeniorDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<EnhancedSeniorDeductionAmt>10800</EnhancedSeniorDeductionAmt><TotalAdditionalDeductionsAmt>10800</TotalAdditionalDeductionsAmt>",
  );
  assertEquals(xml.includes("QualifiedTipsDeductionAmt"), false);
});

Deno.test("Schedule 1-A senior-only source supports one qualifying joint spouse", () => {
  const lines = calculateSeniorOnlySchedule1A(
    { taxYear: 2025, formType: "f1040" },
    { ...joint, spouse_age_65_or_older: false },
  );
  assertEquals(lines.line36a_taxpayer, 5_400);
  assertEquals(lines.line36b_spouse, 0);
  assertEquals(lines.line38_total, 5_400);
});

Deno.test("Schedule 1-A senior-only document accompanies reconciled Form 1040 line 13b", () => {
  const xml = buildMefXml({ f1040: joint1040, schedule1a: joint }, filer);
  assertStringIncludes(xml, '<IRS1040Schedule1A documentId="');
  assertStringIncludes(
    xml,
    "<TotalAdditionalDeductionsAmt>10800</TotalAdditionalDeductionsAmt>",
  );
  assertStringIncludes(xml, 'documentCnt="2"');
  assertEquals(
    xml.indexOf("<IRS1040 ") < xml.indexOf("<IRS1040Schedule1A "),
    true,
  );
});

Deno.test("Schedule 1-A integration rejects incomplete and unsupported line 13b", () => {
  assertThrows(
    () => buildMefXml({ f1040: joint1040 }, filer),
    Error,
    "attached senior-only Schedule 1-A",
  );
  assertThrows(
    () =>
      buildMefXml({
        f1040: joint1040,
        schedule1a: { ...joint, taxpayer_qualified_overtime_compensation: 100 },
      }, filer),
    Error,
    "cannot include tips, overtime, or vehicle interest",
  );
  assertThrows(
    () =>
      buildMefXml({
        f1040: { ...joint1040, line13b_additional_deductions: 11_000 },
        schedule1a: joint,
      }, filer),
    Error,
    "do not reconcile",
  );
});

Deno.test("Schedule 1-A senior-only MeF rejects missing review, other claims, and mismatched return", () => {
  assertEquals(
    seniorZeroExclusionsReviewSchema.safeParse({
      ...review,
      no_form2555_filed: false,
    }).success,
    false,
  );
  assertEquals(
    seniorZeroExclusionsReviewSchema.safeParse({
      ...review,
      section933_review_source_reference: "   ",
    }).success,
    false,
  );
  assertThrows(
    () =>
      schedule1a.build({ ...joint, senior_zero_exclusions_review: undefined }, {
        pending: { f1040: joint1040 },
      }),
    Error,
    "sourced senior-only Part I review",
  );
  assertThrows(
    () =>
      schedule1a.build({
        ...joint,
        taxpayer_qualified_overtime_compensation: 100,
      }, {
        pending: { f1040: joint1040 },
      }),
    Error,
    "cannot include tips, overtime, or vehicle interest",
  );
  assertThrows(
    () =>
      schedule1a.build(joint, {
        pending: {
          f1040: { ...joint1040, line13b_additional_deductions: 11_000 },
        },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      schedule1a.build(joint, {
        pending: { f1040: { ...joint1040, spouse_ssn: "999887777" } },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      schedule1a.build(joint, {
        pending: { f1040: joint1040, form2555: { line45: 1_000 } },
      }),
    Error,
    "conflicts with a Form 2555",
  );
  assertThrows(
    () =>
      schedule1a.build(joint, {
        pending: { f1040: joint1040, form4563: { line15: 500 } },
      }),
    Error,
    "conflicts with a Form 2555 or Form 4563",
  );
});
