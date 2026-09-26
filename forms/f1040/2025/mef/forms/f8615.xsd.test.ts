import { assertEquals, assertStringIncludes } from "@std/assert";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { calculateForm8615 } from "../../../nodes/intermediate/forms/form8615/calculation.ts";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity } from "../types.ts";

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
  fullName: "Alex Child",
  nameLine1: "CHILD ALEX",
  nameControl: "CHIL",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name: "XSD: Form 8615 line 18 replaces dependent Form 1040 line 16",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const calculation = calculateForm8615({
    eligibility_confirmed: true,
    parent_name: "Jane Parent",
    parent_name_control: "PARE",
    parent_ssn: "987-65-4321",
    parent_filing_status: FilingStatus.MFJ,
    parent_taxable_income: 80_000,
    parent_income_tax: 9_123,
    parent_tax_method: "ordinary",
    child_unearned_income: 5_000,
    other_children_line5: [],
  }, {
    childTaxableIncome: 3_650,
    childFilingStatus: FilingStatus.Single,
    childRegularTax: 365,
    takingStandardDeduction: true,
    childHasPreferentialIncome: false,
    childForeignEarnedIncomeExclusion: 0,
    brackets: CONFIG_BY_YEAR[2025]!,
  });
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      taxpayer_can_be_claimed_as_dependent: true,
      line2b_taxable_interest: 5_000,
      line9_total_income: 5_000,
      line11_agi: 5_000,
      line12c_deduction_total: 1_350,
      line15_taxable_income: 3_650,
      line16_income_tax: 411,
      line18_total_tax_before_credits: 411,
      line24_total_tax: 411,
    },
    form8615: calculation.fields,
  }, filer);
  assertStringIncludes(
    xml,
    "<PrimaryClaimAsDependentInd>X</PrimaryClaimAsDependentInd>",
  );
  assertStringIncludes(xml, "<IRS8615 documentId=");
  assertStringIncludes(xml, "<ParentNm>Jane Parent</ParentNm>");
  assertStringIncludes(xml, "<KiddieTaxAmt>411</KiddieTaxAmt>");
  assertEquals(xml.includes("ChildNetUnearnedIncomeAmt"), false);
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
