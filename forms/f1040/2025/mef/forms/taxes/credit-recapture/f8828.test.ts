import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8828 } from "./f8828.ts";
import { form8828Pdf } from "../../../../pdf/forms/taxes/credit-recapture/f8828.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { inputSchema as f8828InputSchema } from "../../../../../nodes/inputs/taxes/credit-recapture/f8828/index.ts";

function buildParsed(
  source: unknown,
  context?: Parameters<typeof form8828.build>[1],
) {
  return form8828.build(f8828InputSchema.parse(source), context);
}

function item(overrides: Record<string, unknown> = {}) {
  const facts = {
    property_address: {
      line1: "14 Main St",
      city: "Boise",
      state: "ID",
      zip: "83702",
    },
    subsidy_type: "tax_exempt_bond_loan",
    disposition_kind: "sale",
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
  const source_transaction_id =
    `${facts.disposition_kind}-${facts.property_address.line1}`;
  return {
    ...facts,
    source_transaction_id,
    reviewed_issuer: {
      document_reference: "issuer-notification-14-main",
      borrower_ssn: "123456789",
      issuer_name: facts.issuer_name,
      issuer_state: facts.issuer_state,
      issuer_type: facts.issuer_type,
      original_loan_closing_date: facts.original_loan_closing_date,
      highest_federally_subsidized_loan_amount:
        facts.highest_federally_subsidized_loan_amount,
      federally_subsidized_amount: facts.issuer_federally_subsidized_amount,
      adjusted_qualifying_income: facts.adjusted_qualifying_income,
      holding_period_percentage: facts.issuer_holding_period_percentage,
    },
    reviewed_disposition: {
      document_reference: facts.disposition_kind === "gift"
        ? "gift-deed-14-main"
        : "closing-statement-14-main",
      basis_record_reference: "basis-record-14-main",
      source_transaction_id,
      owner_ssn: "123456789",
      property_address: facts.property_address,
      disposition_date: facts.disposition_date,
      sales_price_of_interest: facts.sales_price_of_interest,
      selling_expenses: facts.selling_expenses,
      adjusted_basis_of_interest: facts.adjusted_basis_of_interest,
      gain_included_in_gross_income: facts.home_gain_included_in_gross_income,
      ...(facts.disposition_kind === "sale"
        ? { exclusion_record_reference: "home-exclusion-14-main" }
        : {}),
    },
  };
}

function gift(overrides: Record<string, unknown> = {}) {
  const disposition = item({
    disposition_kind: "gift",
    sales_price_of_interest: 280_000,
    selling_expenses: 0,
    home_gain_included_in_gross_income: 0,
    ...overrides,
  });
  return {
    ...disposition,
    reviewed_gift: {
      deed_reference: "gift-deed-14-main",
      valuation_reference: "appraisal-14-main",
      donee_name: "Adult Child",
      donee_relationship: "relative_other_than_spouse",
      donee_is_spouse_or_former_spouse: false,
      deed_date: disposition.disposition_date,
      fair_market_value_of_interest: disposition.sales_price_of_interest,
      loan_payoff_reference: "payoff-14-main",
      loan_payoff_date: disposition.full_repayment_date,
      entire_taxpayer_interest_transferred: true,
      no_consideration_confirmed: true,
    },
  };
}

function jointOwnerSale(overrides: Record<string, unknown> = {}) {
  const sale = item({
    sales_price_of_interest: 225_000,
    selling_expenses: 13_500,
    adjusted_basis_of_interest: 187_500,
    home_gain_included_in_gross_income: 4_500,
    highest_federally_subsidized_loan_amount: 150_000,
    issuer_federally_subsidized_amount: 9_375,
    ...overrides,
  });
  return {
    ...sale,
    reviewed_issuer: {
      ...sale.reviewed_issuer,
      highest_federally_subsidized_loan_amount: 200_000,
      federally_subsidized_amount: 12_500,
    },
    reviewed_coownership: {
      ownership_record_reference: "deed-75-percent-14-main",
      joint_loan_record_reference: "joint-loan-14-main",
      joint_liability_confirmed: true,
      owner_count: 2,
      taxpayer_share_numerator: 3,
      taxpayer_share_denominator: 4,
      whole_property_sales_price: 300_000,
      whole_property_selling_expenses: 18_000,
      whole_property_adjusted_basis: 250_000,
      whole_highest_federally_subsidized_loan_amount: 200_000,
      whole_issuer_federally_subsidized_amount: 12_500,
    },
  };
}

function reissuedMccSale(overrides: Record<string, unknown> = {}) {
  const sale = item({
    subsidy_type: "mortgage_credit_certificate",
    ...overrides,
  });
  return {
    ...sale,
    reviewed_mcc_reissue: {
      original_certificate_reference: "issuer-notification-14-main",
      reissued_certificate_reference: "reissued-mcc-14-main",
      refinance_settlement_reference: "refinance-closing-14-main",
      issuer_compliance_reference: "issuer-reissue-compliance-14-main",
      final_payoff_reference: "sale-payoff-14-main",
      original_certificate_issued_to_borrower_confirmed: true,
      original_certificate_replaced_entirely_confirmed: true,
      issuer_no_annual_credit_increase_confirmed: true,
      issuer_name: "Idaho Housing Agency",
      issuer_state: "ID",
      property_address: sale.property_address,
      original_loan_closing_date: sale.original_loan_closing_date,
      refinance_date: "2022-06-01",
      reissued_certificate_effective_date: "2022-06-01",
      final_replacement_loan_payoff_date: sale.full_repayment_date,
      original_certificate_outstanding_debt_at_refinance: 170_000,
      replacement_certificate_mortgage_debt: 160_000,
      original_certificate_credit_rate: 0.20,
      replacement_certificate_credit_rate: 0.18,
    },
  };
}

function conventionalQmbRefinanceSale() {
  const sale = item({
    original_loan_closing_date: "2020-01-01",
    full_repayment_date: "2022-01-01",
    disposition_date: "2025-01-01",
    issuer_holding_period_percentage: 24,
  });
  return {
    ...sale,
    reviewed_conventional_refinance: {
      refinance_settlement_reference: "conventional-refi-14-main",
      original_loan_payoff_reference: "original-qmb-payoff-14-main",
      original_issuer_notification_reference:
        sale.reviewed_issuer.document_reference,
      borrower_ssn: sale.reviewed_issuer.borrower_ssn,
      property_address: sale.property_address,
      refinance_date: sale.full_repayment_date,
      original_subsidized_loan_fully_repaid_confirmed: true,
      conventional_replacement_financing_confirmed: true,
      no_mcc_reissue_confirmed: true,
    },
  };
}

function pending(total = 6_250) {
  return {
    f1040: { line11_agi: 105_000, line2a_tax_exempt: 1_000 },
    schedule2: { line17b_mortgage_subsidy_recapture: total },
    form8949: {
      transaction: {
        part: "F",
        description: "14 Main St, Boise ID",
        source_transaction_id: "sale-14 Main St",
        date_acquired: "2020-06-01",
        date_sold: "2025-03-01",
        proceeds: 282_000,
        cost_basis: 250_000,
        adjustment_codes: "H",
        adjustment_amount: -26_000,
        gain_loss: 6_000,
        is_long_term: true,
      },
    },
  };
}

Deno.test("staged IRS8828 and official PDF project source lines and Schedule 2 tax", () => {
  const source = { f8828s: [item()] };
  const xml = buildParsed(source, { pending: pending() });
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

Deno.test("staged IRS8828 gift prints deemed FMV and requires no invented Form 8949 row", () => {
  const source = { f8828s: [gift()] };
  const finalReturn = {
    f1040: { line11_agi: 105_000, line2a_tax_exempt: 1_000 },
    schedule2: { line17b_mortgage_subsidy_recapture: 12_500 },
  };
  const xml = buildParsed(source, { pending: finalReturn });
  assertEquals(xml.length, 1);
  assertStringIncludes(
    xml[0],
    "<MortgSbsdySalesPriceIntHomeAmt>280000</MortgSbsdySalesPriceIntHomeAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyRecaptureTaxAmt>12500</MortgSbsdyRecaptureTaxAmt>",
  );
  const printed = form8828Pdf.instances!(source, {
    nameLine1: "Jane Taxpayer",
    primarySSN: "123456789",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: { line1: "14 Main St", city: "Boise", state: "ID", zip: "83702" },
  }, finalReturn);
  assertEquals(printed[0].line9, 280_000);
  assertEquals(printed[0].line23, 12_500);
});

Deno.test("staged IRS8828 gift rejects unsupported consideration and valuation tamper", () => {
  const valid = gift();
  assertThrows(() =>
    buildParsed({
      f8828s: [{
        ...valid,
        reviewed_gift: {
          ...valid.reviewed_gift,
          fair_market_value_of_interest: 279_000,
        },
      }],
    }), Error);
  assertThrows(() =>
    buildParsed({
      f8828s: [{
        ...valid,
        reviewed_gift: {
          ...valid.reviewed_gift,
          no_consideration_confirmed: false,
        },
      }],
    }), Error);
  assertThrows(
    () => buildParsed({ f8828s: [gift({ selling_expenses: 500 })] }),
    Error,
  );
});

Deno.test("staged IRS8828 joint-owner sale emits only the taxpayer share", () => {
  const source = { f8828s: [jointOwnerSale()] };
  const finalReturn = pending(7_500);
  finalReturn.form8949.transaction.proceeds = 211_500;
  finalReturn.form8949.transaction.cost_basis = 187_500;
  finalReturn.form8949.transaction.adjustment_amount = -19_500;
  finalReturn.form8949.transaction.gain_loss = 4_500;
  const xml = buildParsed(source, { pending: finalReturn });
  assertStringIncludes(
    xml[0],
    "<MortgSbsdySalesPriceIntHomeAmt>225000</MortgSbsdySalesPriceIntHomeAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyFederallySbsdzdAmt>9375</MortgSbsdyFederallySbsdzdAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyRecaptureTaxAmt>7500</MortgSbsdyRecaptureTaxAmt>",
  );
  const printed = form8828Pdf.instances!(source, {
    nameLine1: "Jane Taxpayer",
    primarySSN: "123456789",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: { line1: "14 Main St", city: "Boise", state: "ID", zip: "83702" },
  }, finalReturn);
  assertEquals(printed[0].line9, 225_000);
  assertEquals(printed[0].line23, 7_500);
});

Deno.test("staged IRS8828 joint-owner source rejects issuer and ownership tamper", () => {
  const valid = jointOwnerSale();
  const wrongIssuer = {
    ...valid,
    reviewed_issuer: {
      ...valid.reviewed_issuer,
      federally_subsidized_amount: 9_375,
    },
  };
  assertThrows(
    () => buildParsed({ f8828s: [wrongIssuer] }),
    Error,
    "issuer",
  );
  const wrongShare = {
    ...valid,
    reviewed_coownership: {
      ...valid.reviewed_coownership,
      taxpayer_share_numerator: 2,
    },
  };
  assertThrows(() => buildParsed({ f8828s: [wrongShare] }), Error);
});

Deno.test("staged IRS8828 reissued MCC keeps original loan date and final payoff on native/PDF", () => {
  const source = { f8828s: [reissuedMccSale()] };
  const xml = buildParsed(source, { pending: pending() });
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyMortgageCrCertInd>true</MortgSbsdyMortgageCrCertInd>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyOriginalLoanClsDt>2020-06-01</MortgSbsdyOriginalLoanClsDt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyOrigLoanPaymentDt>2025-03-01</MortgSbsdyOrigLoanPaymentDt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyHoldingPeriodRt>1.00</MortgSbsdyHoldingPeriodRt>",
  );
  const printed = form8828Pdf.instances!(source, {
    nameLine1: "Jane Taxpayer",
    primarySSN: "123456789",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: { line1: "14 Main St", city: "Boise", state: "ID", zip: "83702" },
  }, pending());
  assertEquals(printed[0].closing_year, "2020");
  assertEquals(printed[0].repayment_year, "2025");
  assertEquals(printed[0].line20, 100);
});

Deno.test("staged IRS8828 reissued MCC rejects certificate and payoff tamper", () => {
  const valid = reissuedMccSale();
  assertThrows(() =>
    buildParsed({
      f8828s: [{
        ...valid,
        reviewed_mcc_reissue: {
          ...valid.reviewed_mcc_reissue,
          replacement_certificate_mortgage_debt: 180_000,
        },
      }],
    }), Error);
  assertThrows(() =>
    buildParsed({
      f8828s: [{
        ...valid,
        reviewed_mcc_reissue: {
          ...valid.reviewed_mcc_reissue,
          final_replacement_loan_payoff_date: "2022-06-01",
        },
      }],
    }), Error);
});

Deno.test("staged IRS8828 QMB conventional refinance uses early payoff on native and PDF", () => {
  const source = f8828InputSchema.parse({
    f8828s: [conventionalQmbRefinanceSale()],
  });
  const finalReturn = pending(1_500);
  finalReturn.form8949.transaction.date_acquired = "2020-01-01";
  finalReturn.form8949.transaction.date_sold = "2025-01-01";
  const complete = { ...finalReturn, f8828: source };
  const filer = {
    nameLine1: "Jane Taxpayer",
    primarySSN: "123456789",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: { line1: "14 Main St", city: "Boise", state: "ID", zip: "83702" },
  };
  const xml = buildParsed(source, { pending: complete, filer });
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyOrigLoanPaymentDt>2022-01-01</MortgSbsdyOrigLoanPaymentDt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyHoldingPeriodRt>0.24</MortgSbsdyHoldingPeriodRt>",
  );
  assertStringIncludes(
    xml[0],
    "<MortgSbsdyRecaptureTaxAmt>1500</MortgSbsdyRecaptureTaxAmt>",
  );
  const [printed] = form8828Pdf.instances!(source, filer, complete);
  assertEquals(printed?.repayment_year, "2022");
  assertEquals(printed?.line20, 24);
  assertEquals(printed?.line23, 1_500);
  assertThrows(
    () =>
      buildParsed(source, {
        pending: { ...complete, f8828: { f8828s: [item()] } },
        filer,
      }),
    Error,
    "differs from prepared return",
  );
  assertThrows(
    () =>
      form8828Pdf.instances!(
        source,
        { ...filer, primarySSN: "987654321" },
        complete,
      ),
    Error,
    "return filer",
  );
});

Deno.test("staged IRS8828 rejects mismatched conventional refinance record", () => {
  const sale = f8828InputSchema.parse({
    f8828s: [conventionalQmbRefinanceSale()],
  }).f8828s[0];
  assertThrows(
    () =>
      buildParsed({
        f8828s: [{
          ...sale,
          reviewed_conventional_refinance: {
            ...sale.reviewed_conventional_refinance,
            original_loan_payoff_reference:
              sale.reviewed_conventional_refinance!
                .refinance_settlement_reference,
          },
        }],
      }),
    Error,
    "conventional refinance records",
  );
  assertThrows(() =>
    buildParsed({
      f8828s: [{
        ...sale,
        reviewed_conventional_refinance: {
          ...sale.reviewed_conventional_refinance,
          property_address: { ...sale.property_address, line1: "99 Other St" },
        },
      }],
    }), Error);
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
  const xml = buildParsed(source, { pending: pending() });
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
    () => buildParsed(source, { pending: pending(100) }),
    Error,
    "Schedule 2",
  );
  assertThrows(
    () =>
      buildParsed(source, {
        pending: {
          ...pending(),
          f1040: { line11_agi: 100_000, line2a_tax_exempt: 1_000 },
        },
      }),
    Error,
    "Form 1040",
  );
  assertThrows(() =>
    buildParsed({
      f8828s: [item({
        property_address: "14 Main St, Boise, ID 83702",
      })],
    }), Error);
  assertThrows(() =>
    buildParsed({
      f8828s: [item({
        issuer_holding_period_percentage: 80,
      })],
    }), Error);
});

Deno.test("staged IRS8828 rejects tampered issuer, sale, owner, and taxable-gain links", () => {
  const source = { f8828s: [item()] };
  const issuer = item();
  issuer.reviewed_issuer.federally_subsidized_amount = 11_000;
  assertThrows(
    () => buildParsed({ f8828s: [issuer] }, { pending: pending() }),
    Error,
    "issuer",
  );

  const sale = item();
  sale.reviewed_disposition.selling_expenses = 10_000;
  assertThrows(
    () => buildParsed({ f8828s: [sale] }, { pending: pending() }),
    Error,
    "disposition records",
  );

  const wrongGain = pending();
  wrongGain.form8949.transaction.gain_loss = 5_000;
  assertThrows(
    () => buildParsed(source, { pending: wrongGain }),
    Error,
    "Form 8949",
  );

  const noGainRow = { ...pending(), form8949: { transaction: undefined } };
  assertThrows(
    () => buildParsed(source, { pending: noGainRow }),
    Error,
    "Form 8949",
  );

  const wrongOwner = item();
  wrongOwner.reviewed_disposition.owner_ssn = "999999999";
  assertThrows(
    () =>
      buildParsed({ f8828s: [wrongOwner] }, {
        pending: pending(),
        filer: {
          nameLine1: "Jane Taxpayer",
          nameControl: "TAXP",
          primarySSN: "123456789",
          filingStatus: FilingStatus.Single,
          address: {
            line1: "14 Main St",
            city: "Boise",
            state: "ID",
            zip: "83702",
          },
        },
      }),
    Error,
    "owner",
  );
});

Deno.test("staged IRS8828 accepts fully excluded gain only with exclusion evidence", () => {
  const excluded = item({
    home_gain_included_in_gross_income: 0,
    adjusted_qualifying_income: 110_000,
  });
  const reviewed = {
    ...excluded,
    reviewed_disposition: {
      ...excluded.reviewed_disposition,
      exclusion_record_reference: undefined,
    },
  };
  assertThrows(
    () => buildParsed({ f8828s: [reviewed] }),
    Error,
    "exclusion evidence",
  );
  const xml = buildParsed({ f8828s: [excluded] }, {
    pending: { ...pending(0), form8949: undefined },
  });
  assertEquals(xml.length, 1);
});
