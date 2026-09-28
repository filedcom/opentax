import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { TS } from "../../../nodes/types.ts";
import { DistributionCode } from "../../../nodes/inputs/f1099r/index.ts";

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
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name: "XSD: 2025 Form 4972 tax links to Form 1040 line 16",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 100_000,
        box2a_taxable_amount: 100_000,
        box3_capital_gain: 10_000,
        box7_distribution_code: DistributionCode.CodeA,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: {
      filing_status: "single",
      line16_income_tax: 14_710,
      form4972_tax: 14_710,
    },
    form4972: {
      recipient: TS.T,
      lump_sum_amount: 100_000,
      capital_gain_amount: 10_000,
      elect_capital_gain: true,
      elect_10yr_averaging: true,
      born_before_1936: true,
      entire_balance_distributed: true,
      rolled_over_any: false,
      beneficiary_distribution: false,
      participant_five_year_member: true,
      prior_election_after_1986: false,
      line6: 10_000,
      line7: 2_000,
      line8: 90_000,
      line9: 0,
      line10: 90_000,
      line11: 0,
      line12: 90_000,
      line17: 90_000,
      line18: 0,
      line19: 90_000,
      line23: 9_000,
      line24: 1_271,
      line25: 12_710,
      line29: 12_710,
      line30: 14_710,
    },
  }, filer);
  assertStringIncludes(xml, "<Form4972Ind referenceDocumentId=");
  assertStringIncludes(
    xml,
    "<LumpSumDistributionTaxAmt>14710</LumpSumDistributionTaxAmt>",
  );
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
  name:
    "XSD: 2025 Form 4972 elected NUA amounts occupy the line 6 and 8 attributes",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 100_000,
        box2a_taxable_amount: 100_000,
        box3_capital_gain: 30_000,
        box6_nua: 20_000,
        box7_distribution_code: DistributionCode.CodeA,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: {
      filing_status: "single",
      line16_income_tax: 18_950,
      form4972_tax: 18_950,
    },
    form4972: {
      recipient: TS.T,
      lump_sum_amount: 100_000,
      capital_gain_amount: 30_000,
      box6_nua: 20_000,
      elect_include_nua: true,
      elect_capital_gain: true,
      elect_10yr_averaging: true,
      born_before_1936: true,
      entire_balance_distributed: true,
      rolled_over_any: false,
      beneficiary_distribution: false,
      participant_five_year_member: true,
      prior_election_after_1986: false,
      line6: 36_000,
      line6_nua_capital_gain: 6_000,
      line7: 7_200,
      line8: 84_000,
      line8_nua_included: 14_000,
      line10: 84_000,
      line12: 84_000,
      line17: 84_000,
      line19: 84_000,
      line25: 11_750,
      line29: 11_750,
      line30: 18_950,
    },
  }, filer);
  assertStringIncludes(xml, 'capitalGainElectionNUAAmt="6000"');
  assertStringIncludes(xml, 'netUnrealizedAppreciationAmt="14000"');
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
  name: "XSD: 2025 Form 4972 Part-II-only NUA keeps Part III absent",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 100_000,
        box2a_taxable_amount: 100_000,
        box3_capital_gain: 30_000,
        box6_nua: 20_000,
        box7_distribution_code: DistributionCode.CodeA,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: {
      filing_status: "single",
      line5b_pension_taxable: 84_000,
      line16_income_tax: 7_200,
      form4972_tax: 7_200,
    },
    form4972: {
      recipient: TS.T,
      lump_sum_amount: 100_000,
      capital_gain_amount: 30_000,
      box6_nua: 20_000,
      elect_include_nua: true,
      elect_capital_gain: true,
      born_before_1936: true,
      entire_balance_distributed: true,
      rolled_over_any: false,
      beneficiary_distribution: false,
      participant_five_year_member: true,
      prior_election_after_1986: false,
      line6: 36_000,
      line6_nua_capital_gain: 6_000,
      line7: 7_200,
    },
  }, filer);
  assertStringIncludes(xml, 'capitalGainElectionNUAAmt="6000"');
  assertEquals(xml.includes("<LumpSumDistriOrdinaryIncmAmt"), false);
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
