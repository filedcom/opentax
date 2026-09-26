import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { buildMefXml } from "../builder.ts";
import { buildPending } from "../pending.ts";
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
  // The IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
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

Deno.test({
  name: "XSD: Form 8862 EITC, CTC and AOTC document validates in TY2025 return",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f8862: {
      claim_eitc: true,
      claim_ctc: true,
      claim_aotc: true,
      eitc_income_reporting_only: false,
      eitc_qualifying_child_of_other: false,
      eitc_children: [{
        first_name: "Child",
        last_name: "Test",
        days_in_us: 365,
        birth_month_day: "--07-04",
      }],
      ctc_children: [{
        first_name: "Child",
        last_name: "Test",
        lived_with_over_half_year: true,
        qualifying_child: true,
        dependent: true,
        us_citizen_national_or_resident: true,
      }],
      aotc_students: [{
        first_name: "Student",
        last_name: "Test",
        eligible: true,
        credit_claimed_four_prior_years: false,
      }],
    },
  }, filer);
  await validateXsd(xml);
});

Deno.test({
  name:
    "XSD: Form 8862 childless EITC survives input, execution and return XML",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    f8862: {
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
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics.length, 0);
  const xml = buildMefXml(buildPending(result.pending), filer);
  assertEquals(xml.includes("<PrimaryNoQualifyingChildGrp>"), true);
  await validateXsd(xml);
});

Deno.test({
  name: "XSD: Form 8862 income-only EITC omits the rest of Part II",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f8862: { claim_eitc: true, eitc_income_reporting_only: true },
  }, filer);
  assertEquals(xml.includes("EICEligClmQlfyChldOfOtherInd"), false);
  await validateXsd(xml);
});
