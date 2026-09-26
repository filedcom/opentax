import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { BondType } from "../../../nodes/inputs/f8912/index.ts";
import { buildForm8912Document } from "./f8912.ts";

const source = {
  reported_bonds: [{
    bond_type: BondType.QECB,
    issue_date: "2017-12-31",
    issuer_name: "Town Energy Authority",
    issuer_ein: "123456789",
    unique_identifier: "BOND-1097",
    credit_amount: 100,
    issuer_elected_direct_payment: false,
    is_pass_through_creb_credit: false,
  }],
  unreported_bonds: [{
    bond_type: BondType.QECB,
    issue_date: "2017-12-31",
    issuer_name: "Town Energy Authority",
    issuer_city: "Austin",
    issuer_state: "TX",
    issuer_ein: "123456789",
    maturity_date: "2030-12-31",
    line18_rows: [{
      cusip: "123456789",
      outstanding_principal: 10_000,
      credit_rate: 0.05,
      credit_allowance_percentage: 0.5,
    }],
    issuer_elected_direct_payment: false,
    is_pass_through_creb_credit: false,
  }],
  carryforwards: [{
    bond_type: BondType.QECB,
    issue_date: "2017-12-31",
    bond_identifier: "BOND-OLD",
    origin_tax_year: 2024,
    amount: 25,
  }],
};

const limit = {
  line1Form1097BtcCredit: 100,
  line2PartIVCredit: 175,
  line3QualifiedBondCarryforward: 25,
  form1040Line16: 1_000,
  schedule2Line1z: 0,
  form6251Line11: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  form3800AllowedCredit: 0,
  priorYearMinimumTaxCredit: 0,
  hasPassThroughCrebCredit: false,
};

Deno.test("Form 8912 MeF draft keeps source rows and allowed credit distinct", () => {
  const xml = buildForm8912Document(source, limit);
  assertStringIncludes(
    xml,
    "<TotalAllForm1097BTCAmt>100</TotalAllForm1097BTCAmt>",
  );
  assertStringIncludes(
    xml,
    "<CarryforwardPYBondCreditAmt>25</CarryforwardPYBondCreditAmt>",
  );
  assertStringIncludes(xml, "<TotalCreditAmt>300</TotalCreditAmt>");
  assertStringIncludes(
    xml,
    "<CurrentYearAllowableCreditAmt>300</CurrentYearAllowableCreditAmt>",
  );
  assertStringIncludes(xml, "<CUSIPNum>123456789</CUSIPNum>");
  assertStringIncludes(xml, "<CreditRt>0.05</CreditRt>");
  assertStringIncludes(xml, "<PercentageAmt>50.00</PercentageAmt>");
  assertStringIncludes(
    xml,
    "<TotalOtherNotRptF1097BTCAmt>250</TotalOtherNotRptF1097BTCAmt>",
  );
  assertStringIncludes(
    xml,
    "<NewCleanEnergyBondAmt>175</NewCleanEnergyBondAmt>",
  );
});

Deno.test("Form 8912 MeF draft rejects a limit disconnected from its sources", () => {
  assertThrows(
    () => buildForm8912Document(source, { ...limit, line2PartIVCredit: 500 }),
    Error,
    "line 2 does not reconcile",
  );
});

Deno.test("Form 8912 MeF draft emits each Part IV line 18 detail", () => {
  const twoRows = {
    ...source,
    unreported_bonds: [{
      ...source.unreported_bonds[0],
      line18_rows: [
        source.unreported_bonds[0].line18_rows[0],
        {
          ...source.unreported_bonds[0].line18_rows[0],
          credit_allowance_percentage: 0.25,
        },
      ],
    }],
  };
  const xml = buildForm8912Document(twoRows, {
    ...limit,
    line2PartIVCredit: 262.5,
  });
  assertEquals(xml.split("<BondNotRptOn1097BTCDetail>").length - 1, 2);
  assertStringIncludes(
    xml,
    "<TotalOtherNotRptF1097BTCAmt>375</TotalOtherNotRptF1097BTCAmt>",
  );
  assertStringIncludes(
    xml,
    "<NewCleanEnergyBondAmt>263</NewCleanEnergyBondAmt>",
  );
});

Deno.test("Form 8912 MeF draft limits line 12 after prior credits", () => {
  const xml = buildForm8912Document(source, {
    ...limit,
    form1040Line16: 250,
    foreignTaxCredit: 50,
    form3800AllowedCredit: 100,
  });
  assertStringIncludes(xml, "<NetIncomeTaxAmt>100</NetIncomeTaxAmt>");
  assertStringIncludes(
    xml,
    "<CurrentYearAllowableCreditAmt>100</CurrentYearAllowableCreditAmt>",
  );
});

Deno.test("Form 8912 MeF draft validates its IRS source schema", async () => {
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/PartnershipIncome/Common/IRS8912/IRS8912.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsd);
  } catch {
    return;
  }
  const xml = buildForm8912Document(source, limit).replace(
    "<IRS8912>",
    '<IRS8912 xmlns="http://www.irs.gov/efile">',
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});
