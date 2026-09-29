import { assertEquals, assertStringIncludes } from "@std/assert";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { calculateForm8615 } from "../../../nodes/intermediate/forms/form8615/calculation.ts";
import { buildMefXml } from "../builder.ts";
import { form8615 } from "./f8615.ts";
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
  // The IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Child",
  nameLine1: "CHILD ALEX",
  nameControl: "CHIL",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: MefFilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test("Form 8615 MeF keeps preferential worksheet indicators before their tax amounts", () => {
  const xml = form8615.build({
    parent_name: "Jane Parent",
    parent_name_control: "PARE",
    parent_ssn: "987654321",
    parent_filing_status: FilingStatus.MFJ,
    line9_preferential_tax_used: true,
    line9_family_tax: 184,
    line10_preferential_tax_used: true,
    line10_parent_tax: 0,
    line15_preferential_tax_used: true,
    line15_child_net_income_tax: 81,
    line17_preferential_tax_used: true,
    line17_child_regular_tax: 265,
  });
  for (
    const [indicator, amount] of [
      ["FamilyCapitalGainsTaxInd", "FamilyTentativeTaxAmt"],
      ["ParentCapitalGainsTaxInd", "ParentTentativeTaxAmt"],
      ["ChildUnearnedIncomeInd", "ChildNetIncomeTaxAmt"],
      ["ChildCapitalGainInd", "TaxOnChildTaxableIncomeAmt"],
    ]
  ) {
    assertStringIncludes(xml, `<${indicator}>X</${indicator}>`);
    assertEquals(xml.indexOf(indicator) < xml.indexOf(amount), true);
  }
});

Deno.test({
  name: "XSD: Form 8615 line 18 replaces dependent Form 1040 line 16",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  // Exact TY2025 Tax Table amounts for the low-income serialization case.
  const calculation = {
    fields: {
      parent_name: "Jane Parent",
      parent_name_control: "PARE",
      parent_ssn: "987654321",
      parent_filing_status: FilingStatus.MFJ,
      line1_child_unearned_income: 5_000,
      line2_kiddie_deduction: 2_700,
      line3_adjusted_unearned_income: 2_300,
      line4_child_taxable_income: 3_650,
      line5_child_net_unearned_income: 2_300,
      line6_parent_taxable_income: 80_000,
      line8_family_income: 82_300,
      line9_family_tax: 9_402,
      line10_parent_tax: 9_126,
      line11_children_tax: 276,
      line13_allocable_tax: 276,
      line14_child_net_income: 1_350,
      line15_child_net_income_tax: 136,
      line16_combined_child_tax: 412,
      line17_child_regular_tax: 368,
      line18_child_tax: 412,
    },
  };
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      taxpayer_can_be_claimed_as_dependent: true,
      line2b_taxable_interest: 5_000,
      line9_total_income: 5_000,
      line11_agi: 5_000,
      line12c_deduction_total: 1_350,
      line15_taxable_income: 3_650,
      line16_income_tax: 412,
      line18_total_tax_before_credits: 412,
      line24_total_tax: 412,
    },
    form8615: calculation.fields,
  }, filer);
  assertStringIncludes(
    xml,
    "<PrimaryClaimAsDependentInd>X</PrimaryClaimAsDependentInd>",
  );
  assertStringIncludes(xml, "<IRS8615 documentId=");
  assertStringIncludes(xml, "<ParentNm>Jane Parent</ParentNm>");
  assertStringIncludes(xml, "<KiddieTaxAmt>412</KiddieTaxAmt>");
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

Deno.test({
  name: "XSD: Form 8615 stops at line 3 and leaves later fields blank",
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
    parent_tax_method: "schedule_d",
    child_unearned_income: 2_000,
    other_children_line5: [],
    other_children_qualified_dividends_line5: [],
    other_children_net_capital_gain_line5: [],
    other_children_schedule_d_tax_worksheet_used: [],
    other_children_form2555_used: [],
    parent_qualified_dividends: 0,
    parent_net_capital_gain: 0,
  }, {
    childTaxableIncome: 650,
    childFilingStatus: FilingStatus.Single,
    childRegularTax: 65,
    takingStandardDeduction: true,
    childHasPreferentialIncome: false,
    childForeignEarnedIncomeExclusion: 0,
    brackets: CONFIG_BY_YEAR[2025]!,
  });
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      taxpayer_can_be_claimed_as_dependent: true,
      line2b_taxable_interest: 2_000,
      line9_total_income: 2_000,
      line11_agi: 2_000,
      line12c_deduction_total: 1_350,
      line15_taxable_income: 650,
      line16_income_tax: 65,
      line18_total_tax_before_credits: 65,
      line24_total_tax: 65,
    },
    form8615: calculation.fields,
  }, filer);
  assertStringIncludes(
    xml,
    "<ChildUnearnedIncomeAdjustedAmt>-700</ChildUnearnedIncomeAdjustedAmt>",
  );
  assertEquals(xml.includes("ChildTaxableIncomeAmt"), false);
  assertEquals(xml.includes("ChildNetInvestmentIncomeAmt"), false);
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
