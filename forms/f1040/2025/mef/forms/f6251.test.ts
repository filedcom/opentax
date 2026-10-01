import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6251 } from "./f6251.ts";
import { FilingStatus } from "../../../mef/header.ts";
import { buildIsoAmtBasisLedger } from "../../../nodes/inputs/f3921/index.ts";
import {
  form6251 as calculatedForm6251,
  inputSchema as form6251InputSchema,
} from "../../../nodes/intermediate/forms/form6251/index.ts";
import { form6251Pdf } from "../../pdf/forms/f6251.ts";

function isoContext(amount: number) {
  const f3921s = [{
    source_document_reference: "Issued Form 3921 test copy",
    corporation_name: "Option Corporation",
    corporation_ein: "12-3456789",
    employee_tin: "111223333",
    box1_date_option_granted: "2022-06-01",
    box2_date_option_exercised: "2025-06-02",
    box3_exercise_price_per_share: 0,
    box4_fmv_per_share: amount,
    box5_shares_transferred: 1,
    rights_transferable_and_not_subject_to_substantial_risk_on_exercise: true,
    shares_disposed_during_exercise_year: 0,
    amount_paid_for_option: 0,
  }];
  return {
    filer: {
      primarySSN: "111223333",
      nameLine1: "Test Taxpayer",
      nameControl: "TAXP",
      address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      filingStatus: FilingStatus.Single,
    },
    pending: {
      f3921: {
        f3921s,
        iso_amt_basis_ledger: buildIsoAmtBasisLedger({ f3921s }),
      },
    },
  };
}

function filed(fields: Parameters<typeof form6251.build>[0]): string {
  const context = isoContext(fields.iso_adjustment ?? 0);
  const pab = pabSourcePending(fields);
  const trust = typeof fields.line2j_estates_and_trusts === "number" &&
      fields.line2j_estates_and_trusts !== 0
    ? {
      k1_trust: {
        k1_trusts: [
          trustCopy(fields.line2j_estates_and_trusts),
        ],
      },
    }
    : {};
  return form6251.build(
    {
      line11_amt: 1,
      ...fields,
      ...(typeof fields.depreciation_adjustment === "number" &&
          fields.depreciation_adjustment !== 0
        ? {
          line2l_depreciation_workpaper: depreciationWorkpaper(
            fields.depreciation_adjustment,
          ),
        }
        : {}),
    },
    { ...context, pending: { ...context.pending, ...trust, ...pab } },
  );
}

function pabSourcePending(fields: Parameters<typeof form6251.build>[0]) {
  const total = fields.private_activity_bond_interest ?? 0;
  const rawInterest = fields.line2g_pab_interest ?? 0;
  const interest = Array.isArray(rawInterest)
    ? rawInterest.reduce((sum, value) => sum + value, 0)
    : rawInterest;
  return {
    ...(interest > 0
      ? {
        f1099int: {
          f1099ints: [{
            payer_name: "Bond Payer",
            box8: interest,
            box9: interest,
          }],
        },
      }
      : {}),
    ...(total > interest
      ? {
        f1099div: {
          f1099divs: [{
            payerName: "Bond Fund",
            isNominee: false,
            box11: false,
            box1a: 0,
            box12: total - interest,
            box13: total - interest,
          }],
        },
      }
      : {}),
  };
}

function trustCopy(amount: number) {
  return {
    estate_trust_name: "Synthetic Trust",
    estate_trust_ein: "123456789",
    source_document_reference: "synthetic issued trust K-1",
    box12_code_a_amt_adjustment: amount,
    box12_codes_b_through_f_absent: true,
    box12_codes_g_through_i_absent: true,
  };
}

function depreciationWorkpaper(amount: number) {
  return {
    properties: [{
      property_id: "synthetic-machine",
      placed_in_service_year: 2021,
      regular_200_percent_declining_balance: true,
      non_section1250_property: true,
      no_special_allowance_or_section179_component: true,
      not_passive_at_risk_limited_or_tax_shelter_farm: true,
      no_inventory_capitalization_difference: true,
      regular_tax_depreciation: Math.max(amount, 0),
      amt_depreciation: Math.max(-amount, 0),
      reviewed_workpaper_reference: "Synthetic 2025 depreciation review",
    }],
  };
}

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

Deno.test("sourced retained ISO plus qualified dividends reconciles Part III in MeF and PDF", () => {
  const result = calculatedForm6251.compute(
    { taxYear: 2025, formType: "f1040" },
    form6251InputSchema.parse({
      filing_status: "single",
      regular_tax_income: 20_000,
      regular_taxable_income: 20_000,
      regular_tax: 5_000,
      iso_adjustment: 180_000,
      qualified_dividends: 10_000,
    }),
  );
  const fields = result.outputs.find((row) => row.nodeType === "form6251")
    ?.fields ?? {};
  const base = isoContext(180_000);
  const pending = {
    ...base.pending,
    f1099div: {
      f1099divs: [{
        payerName: "Dividend Payer",
        isNominee: false,
        box11: false,
        box1a: 12_000,
        box1b: 10_000,
      }],
    },
    f1040: {
      line3a_qualified_dividends: 10_000,
      line3b_ordinary_dividends: 12_000,
      line11_agi: 20_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 20_000,
    },
  };
  assertEquals(fields.line13, 10_000);
  assertEquals(fields.line15, 10_000);
  assertStringIncludes(
    form6251.build(fields, { ...base, pending }),
    "<CapitalGainsWorksheetAmt>10000</CapitalGainsWorksheetAmt>",
  );
  const pdf = form6251Pdf.projectFields!(fields, pending);
  assertEquals(pdf.line13, 10_000);
  assertEquals(form6251Pdf.instances!(fields, base.filer, pending).length, 1);
  const altered = {
    ...pending,
    f1099div: {
      f1099divs: [{
        ...pending.f1099div.f1099divs[0],
        box1b: 9_999,
      }],
    },
  };
  assertThrows(
    () => form6251.build(fields, { ...base, pending: altered }),
    Error,
    "reconciled 1099-DIV",
  );
  assertThrows(
    () => form6251Pdf.projectFields!(fields, altered),
    Error,
    "reconciled 1099-DIV",
  );
  assertThrows(
    () =>
      form6251.build(fields, {
        ...base,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line15_taxable_income: 20_001 },
        },
      }),
    Error,
    "finalized Form 1040",
  );
});

Deno.test("retained ISO Part III sums distinct ordinary 1099-DIV payers", () => {
  const result = calculatedForm6251.compute(
    { taxYear: 2025, formType: "f1040" },
    form6251InputSchema.parse({
      filing_status: "single",
      regular_tax_income: 20_000,
      regular_taxable_income: 20_000,
      regular_tax: 5_000,
      iso_adjustment: 180_000,
      qualified_dividends: 10_000,
    }),
  );
  const fields = result.outputs.find((row) => row.nodeType === "form6251")
    ?.fields ?? {};
  const base = isoContext(180_000);
  const first = {
    payerName: "First Dividend Payer",
    source_document_reference: "issued-2025-1099-div-first",
    isNominee: false,
    box11: false,
    box1a: 7_000,
    box1b: 6_000,
  };
  const second = {
    payerName: "Second Dividend Payer",
    source_document_reference: "issued-2025-1099-div-second",
    isNominee: false,
    box11: false,
    box1a: 5_000,
    box1b: 4_000,
  };
  const pending = {
    ...base.pending,
    f1099div: { f1099divs: [first, second] },
    f1040: {
      line3a_qualified_dividends: 10_000,
      line3b_ordinary_dividends: 12_000,
      line11_agi: 20_000,
      line14_deductions_qbi_total: 0,
      line15_taxable_income: 20_000,
    },
  };
  assertStringIncludes(
    form6251.build(fields, { ...base, pending }),
    "<CapitalGainsWorksheetAmt>10000</CapitalGainsWorksheetAmt>",
  );
  assertEquals(form6251Pdf.projectFields!(fields, pending).line13, 10_000);
  const changedPayer = {
    ...pending,
    f1099div: {
      f1099divs: [first, { ...second, box1b: 3_999 }],
    },
  };
  assertThrows(
    () => form6251.build(fields, { ...base, pending: changedPayer }),
    Error,
    "reconciled 1099-DIV payers",
  );
  assertThrows(
    () => form6251Pdf.projectFields!(fields, changedPayer),
    Error,
    "reconciled 1099-DIV payers",
  );
  assertThrows(
    () =>
      form6251Pdf.projectFields!(fields, {
        ...pending,
        f1099div: {
          f1099divs: [first, {
            ...second,
            source_document_reference: first.source_document_reference,
          }],
        },
      }),
    Error,
    "reconciled 1099-DIV payers",
  );
  assertThrows(
    () =>
      form6251Pdf.projectFields!(fields, {
        ...pending,
        f1099div: { f1099divs: [first, { ...second, box7: 1 }] },
      }),
    Error,
    "reconciled 1099-DIV payers",
  );
});

Deno.test("line 2j estate/trust adjustment serializes signed in XSD order", () => {
  const xml = filed({
    iso_adjustment: 100,
    line2j_estates_and_trusts: -800,
    depreciation_adjustment: 50,
  });
  const line2i = xml.indexOf(
    "<IncentiveStockOptionsAmt>100</IncentiveStockOptionsAmt>",
  );
  const line2j = xml.indexOf("<EstatesAndTrustsAmt>-800</EstatesAndTrustsAmt>");
  const line2l = xml.indexOf("<DepreciationAmt>50</DepreciationAmt>");
  assertEquals(line2i >= 0 && line2i < line2j && line2j < line2l, true);
});

Deno.test("line 2k Form 8949 AMT basis difference serializes signed in XSD order", () => {
  const xml = form6251.build({
    line11_amt: 1,
    line2j_estates_and_trusts: 100,
    line2k_disposition: -10_000,
    line2k_8949_basis_dispositions: {
      source_transaction_id: "basis-sale",
      part: "D",
      proceeds: 75_000,
      regular_basis: 25_000,
      amt_basis: 35_000,
      regular_gain: 50_000,
      amt_gain: 40_000,
    },
    depreciation_adjustment: 200,
    line2l_depreciation_workpaper: depreciationWorkpaper(200),
  }, {
    pending: {
      k1_trust: { k1_trusts: [trustCopy(100)] },
      f8949: {
        f8949s: [{
          source_transaction_id: "basis-sale",
          part: "D",
          description: "Shares",
          date_acquired: "2022-01-10",
          date_sold: "2025-06-20",
          proceeds: 75_000,
          cost_basis: 25_000,
          amt_cost_basis: 35_000,
        }],
      },
    },
  });
  const line2j = xml.indexOf("<EstatesAndTrustsAmt>100</EstatesAndTrustsAmt>");
  const line2k = xml.indexOf(
    "<PropertyDispositionAmt>-10000</PropertyDispositionAmt>",
  );
  const line2l = xml.indexOf("<DepreciationAmt>200</DepreciationAmt>");
  assertEquals(line2j >= 0 && line2j < line2k && line2k < line2l, true);
});

// ---------------------------------------------------------------------------
// Section 1: Empty input
// ---------------------------------------------------------------------------

Deno.test("empty object returns empty string", () => {
  assertEquals(form6251.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form6251.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("regular_tax_income at zero does not file Form 6251 by itself", () => {
  const result = form6251.build({ regular_tax_income: 0 });
  assertEquals(result, "");
});

Deno.test("an adjustment without AMT does not attach Form 6251", () => {
  assertEquals(
    form6251.build({ iso_adjustment: 5_000 }, isoContext(5_000)),
    "",
  );
});

Deno.test("line 2d depletion serializes as a signed amount between lines 2c and 2g", () => {
  const xml = form6251.build({
    line11_amt: 1,
    line2c_investment_interest: 100,
    line2d_depletion: -250,
    private_activity_bond_interest: 500,
  }, {
    pending: {
      schedule_c: {
        schedule_cs: [{
          line_a_principal_business: "Synthetic mining",
          line_b_business_code: "212000",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: 50_000,
          line_12_depletion: 0,
          amt_depletion_worksheet: {
            source_reference: "synthetic depletion review",
            all_property_income_and_basis_limits_applied_verified: true,
            no_at_risk_or_basis_limitation_verified: true,
            properties: [{
              property_reference: "mine-1",
              regular_allowed_depletion: 0,
              amt_allowed_depletion: 250,
            }],
          },
        }],
      },
      ...pabSourcePending({ private_activity_bond_interest: 500 }),
    },
  });
  const line2c = xml.indexOf(
    "<InvestmentInterestAmt>100</InvestmentInterestAmt>",
  );
  const line2d = xml.indexOf("<DepletionAmt>-250</DepletionAmt>");
  const line2g = xml.indexOf(
    "<ExemptPrivateActivityBondsAmt>500</ExemptPrivateActivityBondsAmt>",
  );
  assertEquals(line2c >= 0 && line2c < line2d && line2d < line2g, true);
});

Deno.test("line 2o circulation cost serializes signed after depreciation", () => {
  const xml = form6251.build({
    line11_amt: 1,
    depreciation_adjustment: 100,
    line2l_depreciation_workpaper: depreciationWorkpaper(100),
    line2o_circulation_costs: -250,
    amti: 1_000,
  }, {
    pending: {
      f59e: {
        f59es: [{
          expenditure_type: "circulation",
          amortization_period_start: "2025-01-01",
          original_amount: 250,
          remaining_unamortized: 0,
          regular_tax_deduction: 0,
          amt_deduction: 250,
          regular_three_year_writeoff_elected: false,
          circulation_reviewed_workpaper_reference:
            "synthetic circulation review",
          circulation_no_unamortized_property_loss: true,
        }],
      },
    },
  });
  const line2l = xml.indexOf("<DepreciationAmt>100</DepreciationAmt>");
  const line2o = xml.indexOf("<CirculationCostAmt>-250</CirculationCostAmt>");
  const line4 = xml.indexOf("<AlternativeMinTaxableIncomeAmt>");
  assertEquals(line2l >= 0 && line2l < line2o && line2o < line4, true);
});

Deno.test("a claimed Form 8911 credit attaches Form 6251 with zero AMT", () => {
  const xml = form6251.build({ must_file_for_credit: true, line11_amt: 0 });
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("line 7 above line 10 attaches Form 6251 even when AMTFTC leaves zero AMT", () => {
  const xml = form6251.build({
    tentative_tax: 29_094,
    amtftc: 29_094,
    net_tmt: 0,
    regular_tax: 10_000,
    line11_amt: 0,
  });
  assertStringIncludes(xml, "<IRS6251>");
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
  assertEquals(
    form6251.build({
      tentative_tax: 29_094,
      regular_tax: 30_000,
      line11_amt: 0,
    }),
    "",
  );
});

Deno.test("negative-adjustment filing attaches zero-AMT Form 6251 even when line 7 is below line 10", () => {
  const xml = form6251.build({
    regular_tax_income: 100_000,
    line2c_investment_interest: -20_000,
    tentative_tax: 0,
    regular_tax: 2_000,
    line11_amt: 0,
    must_file_for_negative_adjustments: true,
  });
  assertStringIncludes(xml, "<IRS6251>");
  assertStringIncludes(
    xml,
    "<InvestmentInterestAmt>-20000</InvestmentInterestAmt>",
  );
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("domestic preferential-income counterfactual retains a zero-AMT filing form", () => {
  const xml = form6251.build({
    regular_tax_income: 100_000,
    qualified_dividends: 1_000,
    line2c_investment_interest: -20_000,
    tentative_tax: 0,
    regular_tax: 2_000,
    line11_amt: 0,
    must_file_for_negative_adjustments: true,
  });
  assertStringIncludes(xml, "<IRS6251>");
  assertStringIncludes(
    xml,
    "<InvestmentInterestAmt>-20000</InvestmentInterestAmt>",
  );
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>0</AlternativeMinimumTaxAmt>",
  );
});

Deno.test("negative-adjustment filing trigger cannot emit an empty Form 6251", () => {
  assertThrows(
    () => form6251.build({ must_file_for_negative_adjustments: true }),
    Error,
    "needs calculated form lines",
  );
});

Deno.test("Part III fields follow TY2025 XSD order and omit inapplicable lines", () => {
  const xml = filed({
    line12: 111_900,
    line13: 10_000,
    line20: 10_000,
    line23: 10_000,
    line40: 26_494,
  });
  assertEquals(xml.includes("<UnrecapturedSection1250GainAmt>"), false);
  const tags = [
    "ReportedAltMinTaxableIncAmt",
    "CapitalGainsWorksheetAmt",
    "IncomeAboveThresholdWorkshtAmt",
    "SmllrAbvThrshldOrAltMinGainAmt",
    "TaxOnAlternativeMinimumGainAmt",
  ];
  assertEquals(
    tags.map((tag) => xml.indexOf(`<${tag}>`)),
    [...tags.map((tag) => xml.indexOf(`<${tag}>`))].sort((a, b) => a - b),
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping for the base input fields
// ---------------------------------------------------------------------------

Deno.test("regular_tax_income maps to Form 6251 line 1b", () => {
  const result = filed({
    regular_tax_income: 75000,
    iso_adjustment: 1,
  });
  assertStringIncludes(
    result,
    "<AGILessTotDedLessEnhncSrDedAmt>75000</AGILessTotDedLessEnhncSrDedAmt>",
  );
});

Deno.test("regular_tax maps to AdjustedRegularTaxAmt", () => {
  const result = filed({ regular_tax: 12000, iso_adjustment: 1 });
  assertStringIncludes(
    result,
    "<AdjustedRegularTaxAmt>12000</AdjustedRegularTaxAmt>",
  );
});

Deno.test("iso_adjustment maps to IncentiveStockOptionsAmt", () => {
  const result = filed({ iso_adjustment: 5000 });
  assertStringIncludes(
    result,
    "<IncentiveStockOptionsAmt>5000</IncentiveStockOptionsAmt>",
  );
});

Deno.test("depreciation_adjustment maps to DepreciationAmt", () => {
  const result = filed({ depreciation_adjustment: 3000 });
  assertStringIncludes(
    result,
    "<DepreciationAmt>3000</DepreciationAmt>",
  );
});

Deno.test("unsourced direct ATNOLD cannot be serialized as Form 6251 line 2f", () => {
  for (const adjustment of [-2_000, 2_000]) {
    assertThrows(
      () => filed({ nol_adjustment: adjustment }),
      Error,
      "sourced regular NOL and AMT NOL refigures",
    );
  }
});

Deno.test("private_activity_bond_interest maps to ExemptPrivateActivityBondsAmt", () => {
  const result = filed({ private_activity_bond_interest: 800 });
  assertStringIncludes(
    result,
    "<ExemptPrivateActivityBondsAmt>800</ExemptPrivateActivityBondsAmt>",
  );
});

Deno.test("private-activity-bond interest cannot export without its retained source", () => {
  assertThrows(
    () =>
      form6251.build({ line11_amt: 1, private_activity_bond_interest: 800 }),
    Error,
    "retained 1099-INT/OID/DIV",
  );
});

Deno.test("qsbs_adjustment maps to Section1202ExclusionAmt", () => {
  const result = filed({ qsbs_adjustment: 10000 });
  assertStringIncludes(
    result,
    "<Section1202ExclusionAmt>10000</Section1202ExclusionAmt>",
  );
});

Deno.test("line2a_taxes_paid maps to ScheduleATaxesAmt", () => {
  const result = filed({ line2a_taxes_paid: 15000 });
  assertStringIncludes(result, "<ScheduleATaxesAmt>15000</ScheduleATaxesAmt>");
});

Deno.test("line2b_tax_refund maps to positive TotalRefundReceivedAmt", () => {
  const result = filed({ line2b_tax_refund: 1_000 });
  assertStringIncludes(
    result,
    "<TotalRefundReceivedAmt>1000</TotalRefundReceivedAmt>",
  );
});

Deno.test("mixed other_adjustments cannot be serialized as line 3", () => {
  for (const adjustment of [-1000, 1000]) {
    assertThrows(
      () => filed({ other_adjustments: adjustment }),
      Error,
      "mixed other_adjustments needs line-specific AMT modeling",
    );
  }
});

Deno.test("amtftc maps to AMTForeignTaxCreditAmt", () => {
  const result = filed({ amtftc: 4500 });
  assertStringIncludes(
    result,
    "<AMTForeignTaxCreditAmt>4500</AMTForeignTaxCreditAmt>",
  );
});

Deno.test("Form 6251 XML rejects a line 8 credit when line 10 reaches line 7", () => {
  assertThrows(
    () =>
      form6251.build({
        tentative_tax: 29_094,
        regular_tax: 30_000,
        amtftc: 5_000,
        net_tmt: 24_094,
        line11_amt: 0,
        must_file_for_credit: true,
      }),
    Error,
    "line 8 must be blank",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("context-only income does not file Form 6251", () => {
  const result = form6251.build({ regular_tax_income: 75000 });
  assertEquals(result, "");
});

Deno.test("context-only income and regular tax do not file Form 6251", () => {
  const result = form6251.build({
    regular_tax_income: 75000,
    regular_tax: 12000,
  });
  assertEquals(result, "");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  line11_amt: 1,
  regular_tax_income: 75000,
  regular_tax: 12000,
  iso_adjustment: 5000,
  depreciation_adjustment: 3000,
  line2l_depreciation_workpaper: depreciationWorkpaper(3000),
  private_activity_bond_interest: 800,
  qsbs_adjustment: 10000,
  line2a_taxes_paid: 15000,
  amtftc: 4500,
};

Deno.test("base fields present: output wrapped in IRS6251 tag", () => {
  const context = isoContext(5_000);
  const result = form6251.build(allFields, {
    ...context,
    pending: { ...context.pending, ...pabSourcePending(allFields) },
  });
  assertStringIncludes(result, "<IRS6251>");
  assertStringIncludes(result, "</IRS6251>");
});

Deno.test("base fields present: all elements emitted", () => {
  const context = isoContext(5_000);
  const result = form6251.build(allFields, {
    ...context,
    pending: { ...context.pending, ...pabSourcePending(allFields) },
  });
  assertStringIncludes(
    result,
    "<AGILessTotDedLessEnhncSrDedAmt>75000</AGILessTotDedLessEnhncSrDedAmt>",
  );
  assertStringIncludes(
    result,
    "<AdjustedRegularTaxAmt>12000</AdjustedRegularTaxAmt>",
  );
  assertStringIncludes(
    result,
    "<IncentiveStockOptionsAmt>5000</IncentiveStockOptionsAmt>",
  );
  assertStringIncludes(
    result,
    "<DepreciationAmt>3000</DepreciationAmt>",
  );
  assertStringIncludes(
    result,
    "<ExemptPrivateActivityBondsAmt>800</ExemptPrivateActivityBondsAmt>",
  );
  assertStringIncludes(
    result,
    "<Section1202ExclusionAmt>10000</Section1202ExclusionAmt>",
  );
  assertStringIncludes(result, "<ScheduleATaxesAmt>15000</ScheduleATaxesAmt>");
  assertStringIncludes(
    result,
    "<AMTForeignTaxCreditAmt>4500</AMTForeignTaxCreditAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields (filing_status) are ignored
// ---------------------------------------------------------------------------

Deno.test("filing_status string field is silently ignored", () => {
  const result = filed({
    filing_status: "MFJ",
    regular_tax_income: 75000,
    iso_adjustment: 1,
  });
  assertStringIncludes(
    result,
    "<AGILessTotDedLessEnhncSrDedAmt>75000</AGILessTotDedLessEnhncSrDedAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
