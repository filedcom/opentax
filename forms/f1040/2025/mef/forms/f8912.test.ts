import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { BondType } from "../../../nodes/inputs/f8912/index.ts";
import { buildForm8912Document } from "./f8912.ts";

const source = {
  reported_bonds: [{
    bond_type: BondType.QECB,
    issue_date: "2017-12-31",
    issuer_name: "Town Energy Authority",
    issuer_ein: "123456789",
    unique_identifier_code: "O" as const,
    unique_identifier: "BOND1097",
    monthly_credit_amounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100],
    credit_amount: 100,
    purchase_accrued_interest: 0,
    sale_accrued_interest: 0,
    taxable_interest_reported_elsewhere: 0,
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
    acquisition_date: "2024-01-01",
    purchase_accrued_interest: 0,
    sale_accrued_interest: 0,
    taxable_interest_reported_elsewhere: 0,
    line18_rows: [{
      cusip: "123456789",
      outstanding_principal: 10_000,
      credit_rate: 0.05,
      allowance_dates: ["2025-03-15", "2025-06-15"],
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

const finalized = {
  form1040Line16: 1_000,
  form1040Line19: 0,
  schedule2Line1z: 0,
  form6251Line11: 0,
  schedule3Line1: 0,
  schedule3Line6a: 0,
  schedule3Line6b: 0,
  schedule3Line6k: 300,
  schedule3Line8: 300,
  form3800AllowedCredit: 0,
};

Deno.test("Form 8912 MeF draft keeps source rows and allowed credit distinct", () => {
  const xml = buildForm8912Document(source, finalized);
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

Deno.test("Form 8912 MeF draft rejects a Schedule 3 line 6k mismatch", () => {
  assertThrows(
    () =>
      buildForm8912Document(source, {
        ...finalized,
        schedule3Line6k: 500,
        schedule3Line8: 500,
      }),
    Error,
    "reconcile to finalized Schedule 3 line 6k",
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
          allowance_dates: ["2025-09-15"],
        },
      ],
    }],
  };
  const xml = buildForm8912Document(twoRows, {
    ...finalized,
    schedule3Line6k: 387.5,
    schedule3Line8: 387.5,
  });
  assertEquals(xml.split("<BondNotRptOn1097BTCDetail>").length - 1, 2);
  assertStringIncludes(xml, "<PercentageAmt>25.00</PercentageAmt>");
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
    ...finalized,
    form1040Line16: 250,
    schedule3Line1: 50,
    schedule3Line6a: 100,
    schedule3Line6k: 100,
    schedule3Line8: 250,
    form3800AllowedCredit: 100,
  });
  assertStringIncludes(xml, "<NetIncomeTaxAmt>100</NetIncomeTaxAmt>");
  assertStringIncludes(
    xml,
    "<CurrentYearAllowableCreditAmt>100</CurrentYearAllowableCreditAmt>",
  );
});

Deno.test("Form 8912 MeF draft rejects unmatched allowed Form 3800 credit", () => {
  assertThrows(
    () =>
      buildForm8912Document(source, {
        ...finalized,
        schedule3Line6a: 100,
        schedule3Line8: 400,
      }),
    Error,
    "reconcile to allowed Form 3800",
  );
});

Deno.test("Form 8912 MeF draft rejects purchase interest larger than its bond credit", () => {
  assertThrows(
    () =>
      buildForm8912Document({
        ...source,
        reported_bonds: [{
          ...source.reported_bonds[0],
          purchase_accrued_interest: 101,
        }],
      }, finalized),
    Error,
    "cannot exceed current-year bond credit",
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
  const xml = buildForm8912Document(source, finalized).replace(
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
