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
    "<OtherEarnedIncomeAmt referenceDocumentId=\"WagesNotShownSchedule",
  );
  assertStringIncludes(xml, "<FECRecord documentId=");
  assertStringIncludes(xml, "<WagesLiteralCd>FEC</WagesLiteralCd>");
  assertStringIncludes(xml, "<TotalIncomeExclusionAmt referenceDocumentId=\"IRS2555");
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
