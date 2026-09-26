import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { registry } from "../../registry.ts";
import { buildMefXml } from "../builder.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is optional in CI.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TEST TAXPAYER",
  nameControl: "TAXP",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: MefFilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const details = {
  filing_status: FilingStatus.Single,
  care_providers: [{
    kind: "business" as const,
    name: "Care Center",
    name_control: "CARE",
    ein: "123456789",
    us_address: {
      line1: "100 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    household_employee: false,
    amount_paid: 3000,
  }],
  qualifying_people: [{
    first_name: "Child",
    last_name: "Taxpayer",
    name_control: "TAXP",
    ssn: "123456789",
    credit_expenses_paid: 3000,
  }],
  taxpayer_earned_income: 50_000,
  tax_liability_limit: 500,
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

Deno.test("Form 2441 aggregate-only credit cannot be e-filed", () => {
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
    f2441: [{
      qualifying_person_count: 1,
      qualifying_expenses_paid: 3000,
      earned_income_taxpayer: 50_000,
      agi: 50_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertThrows(
    () => buildMefXml(result.pending, filer),
    Error,
    "aggregate inputs cannot be e-filed",
  );
});

Deno.test({
  name: "XSD: Form 2441 credit-only filing validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form2441: { agi: 50_000, filing_details: details },
  }, filer);
  await validateXsd(xml);
});

Deno.test({
  name: "XSD: Form 2441 employer-benefit filing validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form2441: {
      agi: 50_000,
      dep_care_benefits: 5000,
      filing_details: {
        ...details,
        care_providers: [{ ...details.care_providers[0], amount_paid: 5000 }],
        qualifying_people: [{
          ...details.qualifying_people[0],
          credit_expenses_paid: 0,
        }],
        total_qualified_expenses_incurred: 5000,
        dependent_care_plan_limit: 5000,
      },
    },
  }, filer);
  await validateXsd(xml);
});

Deno.test({
  name: "XSD: Form 2441 filing details survive graph and match Schedule 3",
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
    w2: [{
      employer_ein: "123456789",
      employer_name: "Employer",
      employer_address_line1: "1 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 50_000,
      box2_fed_withheld: 5000,
    }],
    form2441: { filing_details: details },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<CreditForChildAndDepdCareAmt>500</CreditForChildAndDepdCareAmt>",
  );
  await validateXsd(xml);
});

Deno.test({
  name: "XSD: W-2 Box 10 benefits and filing details reconcile through graph",
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
    w2: [{
      employer_ein: "123456789",
      employer_name: "Employer",
      employer_address_line1: "1 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 50_000,
      box2_fed_withheld: 5000,
      box10_dep_care: 6000,
    }],
    form2441: {
      filing_details: {
        ...details,
        care_providers: [{ ...details.care_providers[0], amount_paid: 5000 }],
        qualifying_people: [{
          ...details.qualifying_people[0],
          credit_expenses_paid: 0,
        }],
        total_qualified_expenses_incurred: 5000,
        dependent_care_plan_limit: 5000,
      },
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(
    xml,
    "<DependentCareBenefitsAmt>6000</DependentCareBenefitsAmt>",
  );
  assertStringIncludes(xml, "<TaxableBenefitsAmt>1000</TaxableBenefitsAmt>");
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>51000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml);
});
