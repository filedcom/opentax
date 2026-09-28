import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { DistributionCode } from "../../../nodes/inputs/f1099r/index.ts";
import { calculateOwnerForms } from "../../../nodes/intermediate/forms/form5329/index.ts";
import { TS } from "../../../nodes/types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // IRS schema bundle is optional in CI.
}

const filer: FilerIdentity = {
  fullName: "Test Taxpayer",
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name: "XSD: Form 5329 Parts I-VIII validate against TY2025 return schema",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const owner_entries = [{
    owner: TS.T,
    early_distribution: 10_000,
    early_distribution_exception: 3_000,
    early_distribution_exception_code: "01" as const,
    esa_able_distribution: 5_000,
    esa_able_exception: 2_000,
    excess_traditional_ira: 2_000,
    traditional_ira_value: 1_000,
    excess_roth_ira: 500,
    roth_ira_value: 2_000,
    excess_coverdell_esa: 400,
    coverdell_esa_value: 1_000,
    excess_archer_msa: 300,
    archer_msa_value: 1_000,
    hsa_part_vii: {
      line42_prior_excess: 0,
      line43_unused_contribution_room: 0,
      line44_taxable_distributions: 0,
      line47_current_year_excess: 600,
      december_31_value: 1_000,
    },
    excess_able: 200,
    able_value: 1_000,
  }];
  const xml = buildMefXml({
    form5329: { owner_entries, owner_forms: calculateOwnerForms({ owner_entries }).forms },
    form8889: { forms: [{
      owner: "primary",
      beneficiary_name: "Test Taxpayer",
      beneficiary_ssn: "123456789",
      print_line2_taxpayer_contributions: 600,
      print_line12: 0,
      print_line16_taxable: 0,
    }] },
    schedule2: { line8_form5329_tax: 1180 },
  }, filer);
  assertStringIncludes(xml, "<IRS5329 ");
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});

Deno.test({
  name:
    "XSD: two 1099-R early distributions aggregate through Form 5329 and Schedule 2",
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
    f1099r: [
      {
        payer_name: "Payer A",
        payer_ein: "12-3456789",
        box1_gross_distribution: 4_000,
        box2a_taxable_amount: 4_000,
        box7_distribution_code: DistributionCode.Code1,
        box7_ira_simple_indicator: true,
        ts: TS.T,
      },
      {
        payer_name: "Payer B",
        payer_ein: "98-7654321",
        box1_gross_distribution: 6_000,
        box2a_taxable_amount: 6_000,
        box7_distribution_code: DistributionCode.Code1,
        box7_ira_simple_indicator: true,
        ts: TS.T,
      },
    ],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = result.pending as Record<string, Record<string, unknown>>;
  assertEquals(
    (pending.form5329.owner_forms as Array<Record<string, unknown>>)[0]
      ?.early_distribution,
    10_000,
  );
  assertEquals(pending.schedule2.line8_form5329_tax, 1_000);
  const xml = buildMefXml({
    form5329: pending.form5329,
    schedule2: pending.schedule2,
  }, filer);
  assertStringIncludes(
    xml,
    "<EarlyDistributionsAmt>10000</EarlyDistributionsAmt>",
  );
  assertStringIncludes(xml, "<TaxOnIRAsAmt>1000</TaxOnIRAsAmt>");
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
});
