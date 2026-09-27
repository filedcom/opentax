import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import {
  calculatePhysicalPresence2555,
  type PhysicalPresenceFiling,
} from "../../../nodes/intermediate/forms/form2555/calculation.ts";
import { registry } from "../../registry.ts";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The local IRS schema bundle is optional in CI.
}

const address = {
  line1: "1 Main Street",
  city: "Toronto",
  province_or_state: "Ontario",
  country_code: "CA",
  postal_code: "M5V 2T6",
};

const filingDetails: PhysicalPresenceFiling = {
  foreign_address: address,
  occupation: "Engineer",
  employer_name: "Maple Systems Ltd",
  employer_foreign_address: { ...address, line1: "10 King Street" },
  employer_has_us_ein: false,
  employer_issued_w2: false,
  citizenship_country: "United States",
  tax_home_description: "Toronto, Canada",
  tax_home_established_date: "2024-12-01",
  tax_home_foreign_entire_period: true,
  physical_presence_begin: "2025-01-01",
  physical_presence_end: "2025-12-31",
  principal_employment_country: "Canada",
  no_travel_during_period: true,
  employment_contract_terms: "Indefinite full-time employment",
  visa_type: "Work permit",
  visa_limits_stay: false,
  maintained_us_home: false,
  no_prior_exclusion_claim: true,
  exclusion_previously_revoked: false,
  separate_foreign_residence: false,
  foreign_wages: 100_000,
  no_other_foreign_earned_income: true,
  claiming_housing_exclusion_or_deduction: false,
  deductions_allocable_to_excluded_income: 0,
};

const employeeHousingDetails: PhysicalPresenceFiling = {
  ...filingDetails,
  foreign_address: {
    ...address,
    city: "Gothenburg",
    country_code: "SE",
    postal_code: "411 03",
  },
  employer_foreign_address: {
    ...address,
    city: "Gothenburg",
    country_code: "SE",
    postal_code: "411 03",
    line1: "10 King Street",
  },
  tax_home_description: "Gothenburg, Sweden",
  principal_employment_country: "Sweden",
  foreign_wages: 200_000,
  claiming_housing_exclusion_or_deduction: true,
  employee_housing: {
    city: "Gothenburg",
    country_code: "SE",
    standard_limit_not_high_cost_location_verified: true,
    no_second_household: true,
    no_other_housing_claimant: true,
    no_section119_lodging_excluded: true,
    no_nontaxable_us_government_housing_allowance: true,
    expenses: [{
      kind: "rent",
      amount: 30_000,
      incurred_date: "2025-06-01",
      housing_period_begin: "2025-01-01",
      housing_period_end: "2025-12-31",
      source_document_reference: "2025 Gothenburg lease and rent ledger",
      paid_by_taxpayer_from_reported_wages: true,
      reasonable_expense_verified: true,
    }],
  },
};

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

async function validateXsd(xml: string): Promise<void> {
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const output = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
}

Deno.test("Form 2555 derives qualifying days from the 12-month period", () => {
  const fullYear = calculatePhysicalPresence2555(filingDetails, 2025);
  assertEquals(fullYear.qualifyingDays, 365);
  assertEquals(fullYear.line42, 100_000);
  const partYear = calculatePhysicalPresence2555({
    ...filingDetails,
    tax_home_established_date: "2024-06-01",
    physical_presence_begin: "2024-07-01",
    physical_presence_end: "2025-06-30",
  }, 2025);
  assertEquals(partYear.qualifyingDays, 181);
  assertEquals(partYear.line42, partYear.line40);
  assertThrows(
    () =>
      calculatePhysicalPresence2555({
        ...filingDetails,
        physical_presence_end: "2025-12-30",
      }, 2025),
    Error,
    "must be 12 months",
  );
});

Deno.test("Form 2555 employee housing follows Parts VI, VII, and VIII in order", () => {
  const lines = calculatePhysicalPresence2555(employeeHousingDetails, 2025);
  assertEquals(lines.line28, 30_000);
  assertEquals(lines.line29b, 39_000);
  assertEquals(lines.line30, 30_000);
  assertEquals(lines.line31, 365);
  assertEquals(lines.line32, 20_800);
  assertEquals(lines.line33, 9_200);
  assertEquals(lines.line34, 200_000);
  assertEquals(lines.line35, 1);
  assertEquals(lines.line36, 9_200);
  assertEquals(lines.line41, 190_800);
  assertEquals(lines.line42, 130_000);
  assertEquals(lines.line43, 139_200);
  assertEquals(lines.line45, 139_200);
});

Deno.test("Form 2555 housing refuses an expense outside qualifying days", () => {
  assertThrows(
    () =>
      calculatePhysicalPresence2555({
        ...employeeHousingDetails,
        employee_housing: {
          ...employeeHousingDetails.employee_housing!,
          expenses: [{
            ...employeeHousingDetails.employee_housing!.expenses[0],
            incurred_date: "2024-12-01",
          }],
        },
      }, 2025),
    Error,
    "entirely within qualifying days",
  );
});

Deno.test("Form 2555 housing requires its structured expense source", () => {
  assertThrows(
    () =>
      calculatePhysicalPresence2555({
        ...filingDetails,
        claiming_housing_exclusion_or_deduction: true,
      }, 2025),
    Error,
    "structured employee housing facts",
  );
});

Deno.test("Form 2555 rejects Toronto's high-cost location under the standard-limit route", () => {
  assertThrows(
    () =>
      calculatePhysicalPresence2555({
        ...employeeHousingDetails,
        foreign_address: { ...address, city: "Toronto" },
        employee_housing: {
          ...employeeHousingDetails.employee_housing!,
          city: "Toronto",
          country_code: "CA",
        },
      }, 2025),
    Error,
    "only Sweden standard-limit locations",
  );
});

Deno.test("Form 2555 aggregate facts cannot create invalid MeF XML", () => {
  assertThrows(
    () => buildMefXml({ form2555: { foreign_wages: 50_000 } }, filer),
    Error,
    "cannot be e-filed",
  );
});

Deno.test("Form 2555 rejects wage and exclusion mismatches across documents", () => {
  assertThrows(
    () => buildMefXml({ form2555: { filing_details: filingDetails } }, filer),
    Error,
    "exclusion differs",
  );
  assertThrows(
    () =>
      buildMefXml({
        f1040: { line1h_other_earned: 90_000 },
        schedule1: { line8d_foreign_earned_income_exclusion: 100_000 },
        form2555: { filing_details: filingDetails },
      }, filer),
    Error,
    "wages differ",
  );
  assertThrows(
    () =>
      buildMefXml({
        f1040: { line1h_other_earned: 100_000 },
        schedule1: { line8d_foreign_earned_income_exclusion: 90_000 },
        form2555: { filing_details: filingDetails },
      }, filer),
    Error,
    "exclusion differs",
  );
});

Deno.test({
  name: "XSD: Form 2555 physical presence and FEIE reconcile through graph",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    form2555: { filing_details: filingDetails },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    '<OtherEarnedIncomeAmt referenceDocumentId="WagesNotShownSchedule',
  );
  assertStringIncludes(xml, "<FECRecord documentId=");
  assertStringIncludes(xml, "<WagesLiteralCd>FEC</WagesLiteralCd>");
  assertStringIncludes(
    xml,
    '<TotalIncomeExclusionAmt referenceDocumentId="IRS2555',
  );
  assertStringIncludes(
    xml,
    "<ForeignEarnedIncExclusionAmt>100000</ForeignEarnedIncExclusionAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>0</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml);
});

Deno.test({
  name: "XSD: Form 2555 part-year FEIE uses only 2025 qualifying days",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const partYear = {
    ...filingDetails,
    tax_home_established_date: "2024-06-01",
    physical_presence_begin: "2024-07-01",
    physical_presence_end: "2025-06-30",
  };
  const lines = calculatePhysicalPresence2555(partYear, 2025);
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    form2555: { filing_details: partYear },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    `<ForeignEarnIncmExclQlfyDaysCnt>181</ForeignEarnIncmExclQlfyDaysCnt>`,
  );
  assertStringIncludes(
    xml,
    `<ForeignEarnedIncExclusionAmt>${lines.line42}</ForeignEarnedIncExclusionAmt>`,
  );
  await validateXsd(xml);
});

Deno.test({
  name:
    "XSD: Form 2555 employee housing excludes the housing amount before FEIE and reconciles to Schedule 1",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    form2555: { filing_details: employeeHousingDetails },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.schedule1?.line8d_foreign_earned_income_exclusion,
    139_200,
  );
  assertEquals(result.pending.f1040?.line11_agi, 60_800);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<ClaimingHousingExclOrDedInd>true</ClaimingHousingExclOrDedInd>",
  );
  assertStringIncludes(
    xml,
    "<HousingQualifiedExpenseAmt>30000</HousingQualifiedExpenseAmt>",
  );
  assertStringIncludes(
    xml,
    "<HousingExpenseLimitAmt>39000</HousingExpenseLimitAmt>",
  );
  assertStringIncludes(
    xml,
    "<HousingExpensesOverMaxAmt>9200</HousingExpensesOverMaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<EmployerProvidedHousingAmt>200000</EmployerProvidedHousingAmt>",
  );
  assertStringIncludes(xml, "<HousingExclusionAmt>9200</HousingExclusionAmt>");
  assertStringIncludes(
    xml,
    "<ForeignIncLessHousingExclAmt>190800</ForeignIncLessHousingExclAmt>",
  );
  assertStringIncludes(
    xml,
    "<ForeignEarnedIncExclusionAmt>130000</ForeignEarnedIncExclusionAmt>",
  );
  assertStringIncludes(
    xml,
    '<TotalIncomeExclusionAmt referenceDocumentId="IRS2555',
  );
  await validateXsd(xml);
});
