import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import type { ScheduleFItem } from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import { testFiler } from "../test-filer.ts";
import { buildMefXml } from "../builder.ts";
import { scheduleF } from "./schedule_f.ts";

function farm(overrides: Partial<ScheduleFItem> = {}): ScheduleFItem {
  return {
    line_a_principal_crop_activity: "GRAIN FARMING",
    line_b_agricultural_activity_code: "111100",
    line_e_material_participation: true,
    accounting_method: "cash",
    line1_sales_livestock_resale: 0,
    ...overrides,
  };
}

Deno.test("Schedule F emits one cash-method document per sourced farm", () => {
  const xml = buildMefXml({
    schedule_f: {
      schedule_fs: [
        farm({
          line1_sales_livestock_resale: 50_000,
          line1b_cost_livestock_resale: 30_000,
          line2_sales_products_raised: 8_000,
          line5b_ccc_loans_forfeited: 4_000,
          line5c_ccc_loans_forfeited_taxable: 2_000,
          line12_conservation: 9_000,
          line16_feed: 3_000,
          line32_other_expenses: [{
            description: "FARM SOFTWARE",
            amount: 500,
          }],
          line36_at_risk: "a",
        }),
        farm({ line2_sales_products_raised: 1_000 }),
      ],
    },
  }, testFiler());
  assertStringIncludes(xml, 'documentCnt="3"');
  assertStringIncludes(
    xml,
    '<IRS1040ScheduleF documentId="IRS1040ScheduleF1">',
  );
  assertStringIncludes(
    xml,
    '<IRS1040ScheduleF documentId="IRS1040ScheduleF2">',
  );
  assertStringIncludes(xml, "<PurchasedProfitAmt>20000</PurchasedProfitAmt>");
  assertStringIncludes(
    xml,
    "<SaleOfProductsRaisedAmt>8000</SaleOfProductsRaisedAmt>",
  );
  assertStringIncludes(
    xml,
    "<CCCLoansForfeitedTaxableAmt>2000</CCCLoansForfeitedTaxableAmt>",
  );
  assertStringIncludes(xml, "<GrossIncomeAmt>30000</GrossIncomeAmt>");
  assertStringIncludes(
    xml,
    "<ConservationExpenseAmt>7500</ConservationExpenseAmt>",
  );
  assertStringIncludes(xml, "<TotalExpensesAmt>11000</TotalExpensesAmt>");
  assertStringIncludes(
    xml,
    "<NetFarmProfitLossAmt>19000</NetFarmProfitLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<ExpenseDescriptionTxt>FARM SOFTWARE</ExpenseDescriptionTxt>",
  );
});

Deno.test("Schedule F MeF labor matches gross payroll less employment credits", () => {
  const [xml] = scheduleF.build({
    schedule_fs: [farm({
      farm_id: "FARM-1",
      line1_sales_livestock_resale: 50_000,
      line22_labor_hired: 10_000,
      line22_other_employment_credits: 500,
    })],
    wotc_wage_reductions: [{ farm_id: "FARM-1", credit_amount: 2_400 }],
  }, { filer: testFiler() });
  assertStringIncludes(
    xml,
    "<LaborHiredExpenseAmt>7100</LaborHiredExpenseAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmProfitLossAmt>42900</NetFarmProfitLossAmt>",
  );
});

Deno.test("Schedule F rejects an unsourced WOTC labor reduction in a return bundle", () => {
  const fields = {
    schedule_fs: [farm({ farm_id: "FARM-1", line22_labor_hired: 6_000 })],
    wotc_wage_reductions: [{ farm_id: "FARM-1", credit_amount: 2_400 }],
  };
  assertThrows(() =>
    scheduleF.build(fields, {
      filer: testFiler(),
      pending: { schedule_f: fields },
    })
  );
});

Deno.test("Schedule F reports preliminary farm loss and links at-risk computation separately", () => {
  const [xml] = scheduleF.build({
    schedule_fs: [farm({
      line2_sales_products_raised: 1_000,
      line16_feed: 4_000,
      line36_at_risk: "b",
      at_risk_simplified: {
        opening_adjusted_basis: 900,
        current_year_increases: 0,
        line9_decreases_and_exclusions: 0,
      },
    })],
  }, { filer: testFiler() });
  assertStringIncludes(
    xml,
    "<NetFarmProfitLossAmt>-3000</NetFarmProfitLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<SomeInvestmentIsNotAtRiskInd>X</SomeInvestmentIsNotAtRiskInd>",
  );
});

Deno.test("Schedule F links itemized CCC loans and crop-insurance deferral statements", () => {
  const xml = buildMefXml({
    schedule_f: {
      schedule_fs: [
        farm({
          line5a_ccc_loans_election: 2_000,
          line5a_ccc_loan_details: [{
            description: "CORN LOAN",
            amount: 2_000,
          }],
        }),
        farm({
          line6a_crop_insurance: 5_000,
          line6b_crop_insurance_taxable: 0,
          line6c_defer_crop_insurance: true,
          line6c_crop_insurance_deferral_details: {
            cash_method: true,
            normal_practice_next_year_percent: 80,
            damaged_crops: [{
              crop: "CORN",
              damage_date: "2025-08-01",
              cause: "HAIL",
            }],
            payments: [{
              crop: "CORN",
              received_date: "2025-10-01",
              amount: 5_000,
              carrier: "FARM INSURER",
            }],
          },
        }),
      ],
    },
  }, testFiler());
  assertStringIncludes(xml, 'documentCnt="5"');
  assertStringIncludes(
    xml,
    '<CCCLoanReportedElectionAmt referenceDocumentId="CCCLoanDetailCashMethodStmt3"',
  );
  assertStringIncludes(
    xml,
    '<ElectionDeferCropInsProcInd referenceDocumentId="PostponementCropInsDsstrStmt4"',
  );
  assertStringIncludes(xml, "<LoanDesc>CORN LOAN</LoanDesc>");
  assertStringIncludes(xml, "<NormalBusPracticeStatementTxt>");
  assertStringIncludes(
    xml,
    "<CropInsProcAndDsstrPymtAmt>5000</CropInsProcAndDsstrPymtAmt>",
  );
  assertStringIncludes(
    xml,
    "<CropInsProcAndDsstrPymtTxblAmt>0</CropInsProcAndDsstrPymtTxblAmt>",
  );
});

Deno.test("Schedule F emits accrual Part III and links its own CCC statement", () => {
  const xml = buildMefXml({
    schedule_f: {
      schedule_fs: [{
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "accrual",
        part_iii: {
          line37_sales_products: 10_000,
          line40a_ccc_loans_election: 2_000,
          line40a_ccc_loan_details: [{
            description: "WHEAT LOAN",
            amount: 2_000,
          }],
          line45_beginning_inventory: 1_000,
          line46_products_purchased: 0,
          line48_ending_inventory: 2_000,
          inventory_method: "farm_price",
        },
        line16_feed: 500,
      }],
    },
  }, testFiler());
  assertStringIncludes(
    xml,
    "<MethodOfAccountingAccrualInd>X</MethodOfAccountingAccrualInd>",
  );
  assertStringIncludes(
    xml,
    "<FarmIncomeCashMethodGrp><GrossIncomeAmt>13000</GrossIncomeAmt></FarmIncomeCashMethodGrp>",
  );
  assertStringIncludes(
    xml,
    "<CostOfProductsSoldAmt>1000</CostOfProductsSoldAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmProfitLossAmt>12500</NetFarmProfitLossAmt>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentName="CCCLoanDetailAccrualMethodStatement"',
  );
  assertStringIncludes(xml, "<CCCLoanDetailAccrualMethodStmt documentId=");
});

Deno.test("Schedule F rejects source facts that cannot yet produce a complete document", () => {
  assertThrows(
    () =>
      scheduleF.build({
        farm_sources: [{
          farm_id: "farm-1",
          kind: "1099m_crop_insurance",
          amount: 100,
        }],
      }),
    Error,
    "unknown farm_id",
  );
  assertThrows(
    () =>
      scheduleF.build(
        { schedule_fs: [farm({ accounting_method: "accrual" })] },
        { filer: testFiler() },
      ),
    Error,
    "Part III",
  );
  assertThrows(
    () =>
      scheduleF.build({
        schedule_fs: [farm({ line5a_ccc_loans_election: 100 })],
      }, { filer: testFiler() }),
    Error,
    "itemized CCC loans",
  );
  assertThrows(
    () =>
      scheduleF.build({
        schedule_fs: [farm({
          farm_id: "farm-1",
          line6a_crop_insurance: 100,
          line6b_crop_insurance_taxable: 100,
        })],
        farm_sources: [{
          farm_id: "farm-1",
          kind: "1099m_crop_insurance",
          amount: 100,
          deferred: true,
        }],
      }, { filer: testFiler() }),
    Error,
    "without line 6c election",
  );
});

Deno.test("Schedule F without farm activities emits no document", () => {
  assertEquals(scheduleF.build({}), []);
});
