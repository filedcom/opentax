import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8828 } from "./f8828.ts";
import { form8828Pdf } from "../../pdf/forms/f8828.ts";
import { FilingStatus } from "../../../mef/header.ts";

function item(overrides: Record<string, unknown> = {}) {
  return {
    property_address: {
      line1: "14 Main St",
      city: "Boise",
      state: "ID",
      zip: "83702",
    },
    subsidy_type: "tax_exempt_bond_loan",
    issuer_type: "agency",
    issuer_name: "Idaho Housing Agency",
    issuer_state: "ID",
    original_lender_name: "Example Bank",
    original_lender_address: {
      line1: "10 Bank St",
      city: "Boise",
      state: "ID",
      zip: "83702",
    },
    original_loan_closing_date: "2020-06-01",
    disposition_date: "2025-03-01",
    full_repayment_date: "2025-03-01",
    sales_price_of_interest: 300_000,
    selling_expenses: 18_000,
    adjusted_basis_of_interest: 250_000,
    adjusted_gross_income: 105_000,
    tax_exempt_interest: 1_000,
    home_gain_included_in_gross_income: 6_000,
    family_size_at_disposition: 3,
    adjusted_qualifying_income: 97_500,
    highest_federally_subsidized_loan_amount: 200_000,
    issuer_federally_subsidized_amount: 12_500,
    issuer_holding_period_percentage: 100,
    ...overrides,
  };
}

function pending(total = 6_250) {
  return {
    f1040: { line11_agi: 105_000, line2a_tax_exempt: 1_000 },
    schedule2: { line17b_mortgage_subsidy_recapture: total },
  };
}

Deno.test("staged IRS8828 and official PDF project source lines and Schedule 2 tax", () => {
  const source = { f8828s: [item()] };
  const xml = form8828.build(source, { pending: pending() });
  assertEquals(xml.length, 1);
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyPropertyAddress><AddressLine1Txt>14 Main St</AddressLine1Txt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyCertIssuerAgencyNm>Idaho Housing Agency</MortgSbsdyCertIssuerAgencyNm>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyIncomePercentageRt>0.50</MortgSbsdyIncomePercentageRt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyRecaptureTaxAmt>6250</MortgSbsdyRecaptureTaxAmt>",
  );
  const printed = form8828Pdf.instances!(source, {
    nameLine1: "Jane Taxpayer",
    primarySSN: "123456789",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: { line1: "14 Main St", city: "Boise", state: "ID", zip: "83702" },
  }, pending());
  assertEquals(printed.length, 1);
  assertEquals(printed[0].line23, 6_250);
  assertEquals(printed[0].line18, 50);
});

Deno.test("staged IRS8828 emits each property, including required zero-tax attachment", () => {
  const zero = item({
    property_address: {
      line1: "28 Hill St",
      city: "Boise",
      state: "ID",
      zip: "83702",
    },
    adjusted_basis_of_interest: 282_000,
    home_gain_included_in_gross_income: 0,
  });
  const source = { f8828s: [item(), zero] };
  const xml = form8828.build(source, { pending: pending() });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[1],
    "<MortgSbsdyGainOrLossHmSaleAmt>0</MortgSbsdyGainOrLossHmSaleAmt>",
  );
  assertEquals(xml[1].includes("MortgSbsdyRecaptureTaxAmt"), false);
});

Deno.test("staged IRS8828 rejects mismatched return amounts and invalid address shapes", () => {
  const source = { f8828s: [item()] };
  assertThrows(
    () => form8828.build(source, { pending: pending(100) }),
    Error,
    "Schedule 2",
  );
  assertThrows(
    () =>
      form8828.build(source, {
        pending: {
          ...pending(),
          f1040: { line11_agi: 100_000, line2a_tax_exempt: 1_000 },
        },
      }),
    Error,
    "Form 1040",
  );
  assertThrows(() =>
    form8828.build({
      f8828s: [item({
        property_address: "14 Main St, Boise, ID 83702",
      })],
    }), Error);
  assertThrows(() =>
    form8828.build({
      f8828s: [item({
        issuer_holding_period_percentage: 80,
      })],
    }), Error);
});
