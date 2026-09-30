import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefXml } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const xsdAvailable = (() => {
  try {
    Deno.statSync(xsd);
    return true;
  } catch {
    return false;
  }
})();
const plan = buildExecutionPlan(registry);

for (const fixture of pdfReviewFixtures) {
  Deno.test({
    name: `filled-PDF source ${fixture.id} also exports TY2025 v5.4 XML`,
    ignore: !xsdAvailable,
    async fn() {
      const result = execute(plan, registry, { ...fixture.inputs }, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(result.diagnostics, []);
      const xml = buildMefXml(buildPending(result.pending), fixture.filer);
      if (fixture.id === "single-1099nec-trade-business-tips-schedule1a") {
        const line15 = result.pending.schedule1.line15_se_deduction as number;
        const expected = Math.min(12_000, 10_000 - Math.round(line15));
        assertEquals(expected, 9_294);
        assertEquals(
          result.pending.f1040.line13b_additional_deductions,
          expected,
        );
        assertStringIncludes(
          xml,
          `<QualifiedTipsTradeOrBusAmt>${expected}</QualifiedTipsTradeOrBusAmt>`,
        );
        assertStringIncludes(
          xml,
          `<TotalQualifiedTipsAmt>${expected}</TotalQualifiedTipsAmt>`,
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                schedule1a: {
                  ...result.pending.schedule1a,
                  qualified_trade_business_tips: [{
                    ...(
                      result.pending.schedule1a
                        .qualified_trade_business_tips as Array<
                          Record<string, unknown>
                        >
                    )[0],
                    amount: 11_999,
                  }],
                },
              }),
              fixture.filer,
            ),
          Error,
          "do not match filed payer sources",
        );
      }
      if (fixture.id === "single-nec-misc-business-tips-schedule1a") {
        const reports = result.pending.schedule1a
          .qualified_trade_business_tips as Array<Record<string, unknown>>;
        assertEquals(reports.length, 2);
        assertEquals(
          reports.reduce((sum, row) => sum + Number(row.amount), 0),
          13_000,
        );
        assertEquals(result.pending.f1040.line13b_additional_deductions, 9_294);
        assertStringIncludes(
          xml,
          "<QualifiedTipsTradeOrBusAmt>9294</QualifiedTipsTradeOrBusAmt>",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                schedule1a: {
                  ...result.pending.schedule1a,
                  qualified_trade_business_tips: reports.map((row) =>
                    row.source_form === "1099misc"
                      ? { ...row, amount: 4_999 }
                      : row
                  ),
                },
              }),
              fixture.filer,
            ),
          Error,
          "do not match filed payer sources",
        );
      }
      if (fixture.id === "single-nec-misc-k-business-tips-schedule1a") {
        const tips = result.pending.schedule1a
          .qualified_trade_business_tips as Array<Record<string, unknown>>;
        assertEquals(tips.length, 3);
        assertEquals(
          tips.reduce((sum, row) => sum + Number(row.amount), 0),
          14_000,
        );
        assertEquals(
          (result.pending.schedule_c.schedule_cs as Array<
            Record<string, unknown>
          >)[0].line_1_gross_receipts,
          18_000,
        );
        assertEquals(result.pending.f1040.line13b_additional_deductions, 9_294);
        assertStringIncludes(
          xml,
          "<QualifiedTipsTradeOrBusAmt>9294</QualifiedTipsTradeOrBusAmt>",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                schedule_c: {
                  ...result.pending.schedule_c,
                  f1099k_receipt_sources: [
                    ...(result.pending.schedule_c
                      .f1099k_receipt_sources as Array<Record<string, unknown>>)
                      .map((
                        row: Record<string, unknown>,
                      ) => ({
                        ...row,
                        amount: 7_999,
                      })),
                  ],
                },
              }),
              fixture.filer,
            ),
          Error,
          "1099-K Schedule C source differs",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                f1099m: {
                  f1099ms: (result.pending.f1099m.f1099ms as Array<
                    Record<string, unknown>
                  >)
                    .map((row) => ({ ...row, payer_tin: "99-9999999" })),
                },
              }),
              fixture.filer,
            ),
          Error,
          "1099-K omitted receipts do not match",
        );
      }
      if (fixture.id === "single-nec-k-nonbusiness-line8j") {
        assertEquals(result.pending.schedule1.line9_total_other_income, 8_000);
        assertEquals(result.pending.f1040.line8_additional_income, 8_000);
        assertStringIncludes(
          xml,
          "<ActivityNotForProfitIncmAmt>8000</ActivityNotForProfitIncmAmt>",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                schedule1: {
                  ...result.pending.schedule1,
                  line8j_f1099k_hobby_income: 4_999,
                },
              }),
              fixture.filer,
            ),
          Error,
          "1099-K nonbusiness income differs",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                f1099k: {
                  f1099ks: (result.pending.f1099k.f1099ks as Array<
                    Record<string, unknown>
                  >)
                    .map((row) => ({ ...row, recipient_tin: "999-88-7777" })),
                },
              }),
              fixture.filer,
            ),
          Error,
          "matching filer",
        );
      }
      if (fixture.id === "single-k-blank-tin-withholding") {
        assertEquals(result.pending.f1040.line8_additional_income, 5_000);
        assertEquals(result.pending.f1040.line25b_withheld_1099, 480);
        assertEquals(result.pending.f1040.line25b_f1099k_withheld, 480);
        assertStringIncludes(
          xml,
          "<Form1099WithheldTaxAmt>480</Form1099WithheldTaxAmt>",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                f1099k: {
                  f1099ks: (result.pending.f1099k.f1099ks as Array<
                    Record<string, unknown>
                  >)
                    .map((row) => ({ ...row, box4_federal_withheld: 479 })),
                },
              }),
              fixture.filer,
            ),
          Error,
          "differs from payer box 4",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                f1099k: {
                  f1099ks: (result.pending.f1099k.f1099ks as Array<
                    Record<string, unknown>
                  >)
                    .map((row) => ({
                      ...row,
                      recipient_identity_review: {
                        ...(row.recipient_identity_review as Record<
                          string,
                          unknown
                        >),
                        address_zip: "99999",
                      },
                    })),
                },
              }),
              fixture.filer,
            ),
          Error,
          "identified payer, recipient",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                f1099k: {
                  f1099ks: (result.pending.f1099k.f1099ks as Array<
                    Record<string, unknown>
                  >)
                    .map((row) => ({
                      ...row,
                      recipient_tin: "111-22-3333",
                      recipient_identity_review: {
                        ...(row.recipient_identity_review as Record<
                          string,
                          unknown
                        >),
                        address_zip: "99999",
                      },
                    })),
                },
              }),
              fixture.filer,
            ),
          Error,
          "identified payer, recipient",
        );
      }
      if (fixture.id === "single-k-personal-gain-loss") {
        const rows = result.pending.form8949.transaction as Array<
          Record<string, unknown>
        >;
        assertEquals(rows.length, 2);
        assertEquals(rows.find((row) => row.part === "C")?.gain_loss, 550);
        assertEquals(
          rows.find((row) => row.part === "F")?.adjustment_codes,
          "L",
        );
        assertEquals(rows.find((row) => row.part === "F")?.gain_loss, 0);
        assertEquals(result.pending.f1040.line7_capital_gain, 550);
        assertStringIncludes(
          xml,
          "<CapitalGainLossAmt>550</CapitalGainLossAmt>",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                form8949: {
                  transaction: rows.map((row) =>
                    row.part === "F"
                      ? { ...row, adjustment_amount: 0, gain_loss: -300 }
                      : row
                  ),
                },
              }),
              fixture.filer,
            ),
          Error,
          "1099-K personal-item sales differ",
        );
      }
      if (fixture.id === "single-k-reported-error") {
        assertEquals(
          result.pending.schedule1.form1099k_reported_error_or_loss,
          1_000,
        );
        assertEquals(
          result.pending.schedule1.line10_total_additional_income ?? 0,
          0,
        );
        assertEquals(result.pending.f1040.line8_additional_income ?? 0, 0);
        assertStringIncludes(
          xml,
          "<Form1099KRptErrorOrLossAmt>1000</Form1099KRptErrorOrLossAmt>",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                schedule1: {
                  ...result.pending.schedule1,
                  form1099k_reported_error_or_loss: 900,
                },
              }),
              fixture.filer,
            ),
          Error,
          "reported-error amount differs",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                f1099k: {
                  f1099ks: (result.pending.f1099k.f1099ks as Array<
                    Record<string, unknown>
                  >).map((row) => ({ ...row, recipient_tin: "999-99-9999" })),
                },
              }),
              fixture.filer,
            ),
          Error,
          "identified payer, recipient",
        );
      }
      if (fixture.id === "single-k-mixed-business-personal") {
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                f1099k: {
                  f1099ks: (result.pending.f1099k.f1099ks as Array<
                    Record<string, unknown>
                  >).map((row) => ({ ...row, for_routing: undefined })),
                },
              }),
              fixture.filer,
            ),
          Error,
          "needs a reviewed income classification",
        );
        const kRows = result.pending.schedule_c
          .f1099k_receipt_sources as Array<Record<string, unknown>>;
        const rawSale = result.pending.form8949.transaction as
          | Record<string, unknown>
          | Array<Record<string, unknown>>;
        const sales = Array.isArray(rawSale) ? rawSale : [rawSale];
        assertEquals(kRows.length, 1);
        assertEquals(kRows[0].box1a_gross_payments, 2_800);
        assertEquals(kRows[0].amount, 2_000);
        assertEquals(kRows[0].personal_item_sales_gross, 800);
        assertEquals(sales.length, 1);
        assertEquals(sales[0].part, "F");
        assertEquals(sales[0].gain_loss, 500);
        assertEquals(result.pending.f1040.line7_capital_gain, 500);
        assertEquals(
          (result.pending.schedule_c.schedule_cs as Array<
            Record<string, unknown>
          >)[0].line_1_gross_receipts,
          2_000,
        );
        assertStringIncludes(
          xml,
          "<CapitalGainLossAmt>500</CapitalGainLossAmt>",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                schedule_c: {
                  ...result.pending.schedule_c,
                  f1099k_receipt_sources: [{
                    ...kRows[0],
                    personal_item_sales_gross: 700,
                  }],
                },
              }),
              fixture.filer,
            ),
          Error,
          "1099-K Schedule C source differs",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                form8949: { transaction: [{ ...sales[0], proceeds: 700 }] },
              }),
              fixture.filer,
            ),
          Error,
          "1099-K personal-item sales differ",
        );
      }
      if (fixture.id === "single-k-mixed-duplicate-personal") {
        const kRow = (result.pending.schedule_c
          .f1099k_receipt_sources as Array<Record<string, unknown>>)[0];
        const necRow = (result.pending.schedule_c
          .f1099nec_receipt_sources as Array<Record<string, unknown>>)[0];
        assertEquals(kRow.box1a_gross_payments, 3_800);
        assertEquals(kRow.amount, 2_000);
        assertEquals(kRow.not_included_in_schedule_c_receipts, 1_000);
        assertEquals(kRow.personal_item_sales_gross, 800);
        assertEquals(necRow.amount, 1_000);
        assertEquals(
          (result.pending.schedule_c.schedule_cs as Array<
            Record<string, unknown>
          >)[0].line_1_gross_receipts,
          3_000,
        );
        assertEquals(result.pending.f1040.line7_capital_gain, 500);
        assertStringIncludes(
          xml,
          "<CapitalGainLossAmt>500</CapitalGainLossAmt>",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                f1099nec: {
                  f1099necs: (result.pending.f1099nec.f1099necs as Array<
                    Record<string, unknown>
                  >).map((row) => ({ ...row, payer_tin: "99-9999999" })),
                },
              }),
              fixture.filer,
            ),
          Error,
          "1099-K omitted receipts do not match",
        );
        assertThrows(
          () =>
            buildMefXml(
              buildPending({
                ...result.pending,
                schedule_c: {
                  ...result.pending.schedule_c,
                  f1099k_receipt_sources: [{
                    ...kRow,
                    not_included_in_schedule_c_receipts: 0,
                  }],
                },
              }),
              fixture.filer,
            ),
          Error,
          "1099-K Schedule C source differs",
        );
      }
      if (fixture.id === "single-partnership-code-l-r-ordinary") {
        assertEquals(result.pending.schedule1.line4_other_gains, 1_000);
        assertEquals(result.pending.f1040.line8_additional_income, 1_000);
        assertEquals(result.pending.f1040.line11_agi, 31_000);
        assertEquals((xml.match(/<OrdinaryGainLoss>/g) ?? []).length, 2);
        assertEquals(
          result.pending.form8582?.has_current_4797_transaction,
          undefined,
        );
        assertStringIncludes(xml, "K-1 L 123456789");
        assertStringIncludes(xml, "K-1 R 987654321");
      }
      if (fixture.id === "single-six-partnership-code-l-r-continuation") {
        assertEquals(result.pending.schedule1.line4_other_gains, 1_000);
        assertEquals(result.pending.f1040.line8_additional_income, 1_000);
        assertEquals(result.pending.f1040.line11_agi, 31_000);
        assertEquals((xml.match(/<OrdinaryGainLoss>/g) ?? []).length, 6);
        assertEquals(
          result.pending.form8582?.has_current_4797_transaction,
          undefined,
        );
      }
      if (fixture.id === "single-three-car-loan-schedule1a") {
        assertEquals(
          (xml.match(/<QlfyPassengerVehicleLoanIntGrp>/g) ?? []).length,
          3,
        );
        assertEquals(
          result.pending.f1040.line13b_additional_deductions,
          4_000,
        );
        assertStringIncludes(
          xml,
          "<TotQualifiedCarLoanInterestAmt>4000</TotQualifiedCarLoanInterestAmt>",
        );
      }
      if (fixture.id === "single-two-w2-qualified-tips-schedule1a") {
        assertEquals(
          result.pending.f1040.line13b_additional_deductions,
          5_000,
        );
        assertStringIncludes(
          xml,
          "<QualifiedTipsWagesAmt>0</QualifiedTipsWagesAmt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedTipsEmployeeAmt>5000</QualifiedTipsEmployeeAmt>",
        );
      }
      if (fixture.id === "single-form4137-qualified-tips-schedule1a") {
        assertEquals(result.pending.f1040.line1c_unreported_tips, 1_500);
        assertEquals(
          result.pending.f1040.line13b_additional_deductions,
          6_500,
        );
        assertStringIncludes(
          xml,
          "<QualifiedTipsWagesAmt>5000</QualifiedTipsWagesAmt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedTipsForm4137Amt>6500</QualifiedTipsForm4137Amt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedTipsEmployeeAmt>6500</QualifiedTipsEmployeeAmt>",
        );
        assertStringIncludes(xml, "<IRS4137 ");
      }
      if (fixture.id === "single-two-partnership-code-s-capital") {
        assertEquals(result.pending.schedule_d.line_5_k1_st, 400);
        assertEquals(result.pending.schedule_d.line_12_k1_lt, 600);
        assertEquals(result.pending.schedule_d.print_line16_combined, 1_000);
        assertEquals(result.pending.f1040.line7_capital_gain, 1_000);
        assertEquals(result.pending.f1040.line11_agi, 31_000);
        assertStringIncludes(xml, "<IRS1040ScheduleD ");
      }
      if (fixture.id === "single-partnership-code-k-and-w2g") {
        assertEquals(result.pending.schedule1.line8b_gambling_winnings, 1_200);
        assertEquals(result.pending.f1040.line8_additional_income, 1_200);
        assertEquals(result.pending.f1040.line11_agi, 31_200);
        assertEquals(result.pending.f1040.line25c_total, 50);
        assertStringIncludes(
          xml,
          "<GamblingReportableWinningAmt>1200</GamblingReportableWinningAmt>",
        );
        assertStringIncludes(xml, "<IRSW2G ");
      }
      if (fixture.id === "single-two-partnership-code-e-cod") {
        assertEquals(result.pending.schedule1.line8c_cod_income, 1_000);
        assertEquals(result.pending.f1040.line8_additional_income, 1_000);
        assertEquals(result.pending.f1040.line11_agi, 31_000);
        assertStringIncludes(
          xml,
          "<DebtCancellationAmt>1000</DebtCancellationAmt>",
        );
        assertEquals(xml.includes("<IRS982 "), false);
      }
      if (fixture.id === "single-two-partnership-code-j-recoveries") {
        assertEquals(result.pending.schedule1.line9_total_other_income, 1_000);
        assertEquals(result.pending.f1040.line8_additional_income, 1_000);
        assertEquals(result.pending.f1040.line11_agi, 31_000);
        assertEquals((xml.match(/<OtherIncomeTypeStmt>/g) ?? []).length, 2);
        assertStringIncludes(xml, "Partnership K-1 code J recovery 123456789");
        assertStringIncludes(xml, "Partnership K-1 code J recovery 987654321");
      }
      if (fixture.id === "single-five-dependent-continuation") {
        assertEquals(
          (xml.match(/<DependentDetail>/g) ?? []).length,
          5,
        );
        assertStringIncludes(
          xml,
          "<MainHomeInUSOverHalfYrInd>X</MainHomeInUSOverHalfYrInd>",
        );
        assertStringIncludes(xml, "<MoreDependentsInd>X</MoreDependentsInd>");
        assertEquals(result.pending.f1040.line19_child_tax_credit, 2_500);
      }
      if (fixture.id === "single-withheld-w2g") {
        assertEquals(result.pending.schedule1.line8b_gambling_winnings, 10_000);
        assertEquals(result.pending.f1040.line25c_total, 2_400);
        assertStringIncludes(xml, "<IRSW2G ");
        assertStringIncludes(
          xml,
          "<FederalIncomeTaxWithheldAmt>2400</FederalIncomeTaxWithheldAmt>",
        );
      }
      if (fixture.id === "single-schedule-h-three-state-futa") {
        assertEquals(result.pending.schedule2.line9_household_employment, 90);
        assertEquals(
          (xml.match(/<UnemploymentStateTaxGroup>/g) ?? []).length,
          3,
        );
        assertStringIncludes(xml, "<FUTATaxAmt>90</FUTATaxAmt>");
      }
      if (fixture.id === "single-form8814-child-dividends-adjustments") {
        assertEquals(result.pending.f1040.line3a_qualified_dividends, 500);
        assertEquals(result.pending.f1040.line3b_ordinary_dividends, 500);
        assertEquals(result.pending.f1040.form8814_tax, 135);
        assertEquals(result.pending.schedule1.line8z_form8814, 500);
        assertStringIncludes(xml, "<ChildTaxableInterestStmt ");
        assertStringIncludes(xml, 'childInterestAndDividendTaxAmt="135"');
      }
      if (fixture.id === "single-8862-ctc-reinstatement") {
        const dependent = (result.pending.f1040.dependent_details as Array<
          { first_name: string; credit_category: string }
        >)[0];
        assertEquals(dependent.first_name, "Jamie");
        assertEquals(dependent.credit_category, "ctc");
        assertEquals(result.pending.f1040.line19_child_tax_credit, 2_200);
        assertStringIncludes(xml, "<IRS8862 ");
        assertStringIncludes(xml, "<IRS1040Schedule8812 ");
      }
      if (fixture.id === "single-1098-prior-year-recovery") {
        assertEquals(
          result.pending.schedule_a.line_8a_mortgage_interest_1098,
          18_000,
        );
        assertEquals(
          result.pending.schedule1.line8z_f1098_interest_recovery,
          1_200,
        );
        assertEquals(result.pending.f1040.line8_additional_income, 1_200);
        assertEquals(result.pending.f1040.line11_agi, 81_200);
        assertStringIncludes(
          xml,
          "<RptHomeMortgIntAndPointsAmt>18000</RptHomeMortgIntAndPointsAmt>",
        );
        assertStringIncludes(xml, "<OtherIncomeTotalAmt");
      }
      if (fixture.id === "single-sourced-collectibles-gain") {
        assertEquals(
          result.pending.rate_28_gain_worksheet.collectibles_gain_from_8949,
          3_000,
        );
        assertEquals(result.pending.qdcgtw.line18_28pct_gain, 3_000);
        assertEquals(result.pending.income_tax_calculation.rate_28_gain, 3_000);
        assertEquals(result.pending.schedule_d.print_line18_28pct, 3_000);
        assertEquals(result.pending.f1040.line11_agi, 33_000);
        assertStringIncludes(xml, "<TotalLTCGL1099NotShowBasisGrp>");
      }
      if (fixture.id === "single-short-and-long-form8949-sales") {
        assertEquals(result.pending.schedule_d.print_line7_st_total, 1_000);
        assertEquals(result.pending.schedule_d.print_line15_lt_total, 2_000);
        assertEquals(result.pending.schedule_d.print_line16_combined, 3_000);
        assertEquals(result.pending.f1040.line11_agi, 33_000);
        assertStringIncludes(xml, "<TotalSTCGL1099NotShowBasisGrp>");
        assertStringIncludes(xml, "<TotalLTCGL1099NotReceivedGrp>");
      }
      if (fixture.id === "single-direct-broker-basis-sales") {
        assertEquals(result.pending.schedule_d.line_1a_proceeds, 2_000);
        assertEquals(result.pending.schedule_d.line_1a_cost, 1_000);
        assertEquals(result.pending.schedule_d.line_8a_proceeds, 4_000);
        assertEquals(result.pending.schedule_d.line_8a_cost, 2_000);
        assertEquals(result.pending.schedule_d.print_line16_combined, 3_000);
        assertEquals(result.pending.f1040.line11_agi, 33_000);
        assertStringIncludes(xml, "<TotalSTCGL1099BssRptNoAdjGrp>");
        assertStringIncludes(xml, "<TotalLTCGL1099BssRptNoAdjGrp>");
        assertEquals(xml.includes("<IRS8949 "), false);
      }
      if (fixture.id === "single-direct-and-adjusted-broker-sales") {
        assertEquals(result.pending.schedule_d.line_1a_proceeds, 2_000);
        assertEquals(result.pending.schedule_d.print_line7_st_total, 800);
        assertEquals(result.pending.f1040.line11_agi, 30_800);
        assertStringIncludes(xml, "<TotalSTCGL1099BssRptNoAdjGrp>");
        assertStringIncludes(xml, "<TotalSTCGL1099ShowsBasisGrp>");
        assertStringIncludes(xml, "<IRS8949 ");
      }
      if (fixture.id === "single-final-trust-k1-long-term-capital-loss") {
        assertEquals(result.pending.schedule_d.line_12_k1_lt, -900);
        assertEquals(result.pending.schedule_d.print_line15_lt_total, -900);
        assertEquals(result.pending.f1040.line11_agi, 29_100);
        assertStringIncludes(
          xml,
          "<NetLTGainOrLossFromSchK1Amt>-900</NetLTGainOrLossFromSchK1Amt>",
        );
      }
      if (fixture.id === "single-mixed-final-trust-and-partnership-capital") {
        assertEquals(result.pending.schedule_d.line_5_k1_st, 200);
        assertEquals(result.pending.schedule_d.line_12_k1_lt, 100);
        assertEquals(result.pending.f1040.line11_agi, 30_300);
        assertStringIncludes(
          xml,
          "<NetSTGainOrLossFromSchK1Amt>200</NetSTGainOrLossFromSchK1Amt>",
        );
        assertStringIncludes(
          xml,
          "<NetLTGainOrLossFromSchK1Amt>100</NetLTGainOrLossFromSchK1Amt>",
        );
      }
      if (fixture.id === "single-final-trust-k1-short-term-capital-loss") {
        assertEquals(result.pending.schedule_d.line_5_k1_st, -700);
        assertEquals(result.pending.schedule_d.print_line7_st_total, -700);
        assertEquals(result.pending.f1040.line11_agi, 29_300);
        assertStringIncludes(
          xml,
          "<NetSTGainOrLossFromSchK1Amt>-700</NetSTGainOrLossFromSchK1Amt>",
        );
      }
      if (fixture.id === "single-final-trust-k1-section67e-deduction") {
        assertEquals(
          result.pending.schedule1.line24k_section67e_excess_deduction,
          500,
        );
        assertEquals(result.pending.schedule1.line26_total_adjustments, 500);
        assertEquals(
          result.pending.schedule1.line25_total_other_adjustments,
          500,
        );
        assertEquals(result.pending.f1040.line11_agi, 29_500);
        assertStringIncludes(
          xml,
          "<Section67eExcessDeductionAmt>500</Section67eExcessDeductionAmt>",
        );
        assertStringIncludes(
          xml,
          "<TotalAdjustmentsAmt>500</TotalAdjustmentsAmt>",
        );
        assertStringIncludes(
          xml,
          "<TotalOtherAdjustmentsAmt>500</TotalOtherAdjustmentsAmt>",
        );
      }
      if (fixture.id === "single-child-unearned-income") {
        assertStringIncludes(xml, "<IRS8615 ");
        assertEquals(xml.includes("<IRS8960 "), false);
      }
      if (fixture.id === "single-high-wage-no-niit") {
        assertStringIncludes(xml, "<IRS8960 ");
        assertStringIncludes(xml, "<ModifiedAGIAmt>220000</ModifiedAGIAmt>");
        assertStringIncludes(
          xml,
          "<IndivNetInvstIncomeTaxAmt>0</IndivNetInvstIncomeTaxAmt>",
        );
      }
      if (fixture.id === "single-direct-pension-rollover") {
        assertEquals(result.pending.f1040.line5a_pension_gross, 20_000);
        assertEquals(result.pending.f1040.line5b_pension_taxable, 0);
        assertStringIncludes(
          xml,
          "<PensionsAnnuitiesAmt>20000</PensionsAnnuitiesAmt>",
        );
        assertStringIncludes(
          xml,
          "<TotalTaxablePensionsAmt>0</TotalTaxablePensionsAmt>",
        );
        assertStringIncludes(
          xml,
          "<PensionsAnnuitiesRolloverInd>X</PensionsAnnuitiesRolloverInd>",
        );
      }
      if (fixture.id === "joint-senior-schedule1a") {
        assertEquals(result.pending.f1040.line11_agi, 160_000);
        assertEquals(
          result.pending.f1040.line13b_additional_deductions,
          10_800,
        );
        assertEquals(result.pending.form6251.regular_tax_income, 125_300);
        assertStringIncludes(xml, "<IRS1040Schedule1A ");
        assertStringIncludes(xml, "<ModifiedAGIAmt>160000</ModifiedAGIAmt>");
        assertStringIncludes(
          xml,
          "<PrimaryEnhancedSeniorDedAmt>5400</PrimaryEnhancedSeniorDedAmt>",
        );
        assertStringIncludes(
          xml,
          "<SpouseEnhancedSeniorDedAmt>5400</SpouseEnhancedSeniorDedAmt>",
        );
        assertStringIncludes(
          xml,
          "<EnhancedSeniorDeductionAmt>10800</EnhancedSeniorDeductionAmt><TotalAdditionalDeductionsAmt>10800</TotalAdditionalDeductionsAmt>",
        );
      }
      if (fixture.id === "joint-mixed-schedule1a") {
        assertEquals(result.pending.f1040.line11_agi, 160_000);
        assertEquals(
          result.pending.f1040.line13b_additional_deductions,
          23_800,
        );
        const tags = [
          "<QualifiedTipsEmployeeAmt>5000</QualifiedTipsEmployeeAmt>",
          "<QualifiedOvertimeCompDedAmt>4000</QualifiedOvertimeCompDedAmt>",
          "<QualifiedCarLoanInterestDedAmt>4000</QualifiedCarLoanInterestDedAmt>",
          "<EnhancedSeniorDeductionAmt>10800</EnhancedSeniorDeductionAmt>",
          "<TotalAdditionalDeductionsAmt>23800</TotalAdditionalDeductionsAmt>",
        ];
        let previous = xml.indexOf("<IRS1040Schedule1A ");
        for (const tag of tags) {
          const position = xml.indexOf(tag, previous + 1);
          assertEquals(position > previous, true, tag);
          previous = position;
        }
      }
      if (fixture.id === "single-w2-qualified-tips-schedule1a") {
        assertEquals(result.pending.f1040.line13b_additional_deductions, 5_000);
        assertStringIncludes(xml, "<IRS1040Schedule1A ");
        assertStringIncludes(
          xml,
          "<QualifiedTipsWagesAmt>5000</QualifiedTipsWagesAmt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedTipsEmployeeAmt>5000</QualifiedTipsEmployeeAmt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedTipsDeductionAmt>5000</QualifiedTipsDeductionAmt>",
        );
        assertStringIncludes(
          xml,
          "<TotalAdditionalDeductionsAmt>5000</TotalAdditionalDeductionsAmt>",
        );
      }
      if (fixture.id === "single-two-w2-flsa-overtime-schedule1a") {
        assertEquals(result.pending.f1040.line11_agi, 80_000);
        assertEquals(result.pending.f1040.line13b_additional_deductions, 4_000);
        assertStringIncludes(xml, "<IRS1040Schedule1A ");
        assertStringIncludes(
          xml,
          "<QualifiedOvertimeWagesAmt>4000</QualifiedOvertimeWagesAmt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedOvertimeForm1099Amt>0</QualifiedOvertimeForm1099Amt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedOvertimeCompDedAmt>4000</QualifiedOvertimeCompDedAmt>",
        );
        assertStringIncludes(
          xml,
          "<TotalAdditionalDeductionsAmt>4000</TotalAdditionalDeductionsAmt>",
        );
      }
      if (fixture.id === "single-reviewed-car-loan-schedule1a") {
        assertEquals(result.pending.f1040.line11_agi, 80_000);
        assertEquals(result.pending.f1040.line13b_additional_deductions, 4_000);
        assertStringIncludes(xml, "<IRS1040Schedule1A ");
        assertStringIncludes(xml, "<VIN>1HGCM82633A004352</VIN>");
        assertStringIncludes(
          xml,
          "<QualifiedCarLoanIntDedSchAmt>0</QualifiedCarLoanIntDedSchAmt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedCarLoanInterestAmt>4000</QualifiedCarLoanInterestAmt>",
        );
        assertStringIncludes(
          xml,
          "<QualifiedCarLoanInterestDedAmt>4000</QualifiedCarLoanInterestDedAmt>",
        );
        assertStringIncludes(
          xml,
          "<TotalAdditionalDeductionsAmt>4000</TotalAdditionalDeductionsAmt>",
        );
      }
      if (fixture.id === "joint-two-w2s-schedule-lep") {
        assertStringIncludes(
          xml,
          "<WagesSalariesAndTipsAmt>70000</WagesSalariesAndTipsAmt>",
        );
        assertEquals((xml.match(/<IRS1040ScheduleLEP /g) ?? []).length, 2);
        assertStringIncludes(
          xml,
          "<PersonNm>Alex Example</PersonNm><SSN>111223333</SSN><LanguagePreferenceCd>001</LanguagePreferenceCd>",
        );
        assertStringIncludes(
          xml,
          "<PersonNm>Sam Example</PersonNm><SSN>444556666</SSN><LanguagePreferenceCd>011</LanguagePreferenceCd>",
        );
      }
      if (fixture.id === "single-ira-rollover") {
        assertEquals(result.pending.f1040.line4a_ira_gross, 5_000);
        assertEquals(result.pending.f1040.line4b_ira_taxable, 0);
        assertEquals(result.pending.f1040.line4c_ira_rollover, true);
        assertStringIncludes(
          xml,
          "<IRADistributionRolloverInd>X</IRADistributionRolloverInd>",
        );
      }
      if (
        fixture.id === "single-ira-qualified-plan-rollover" ||
        fixture.id === "single-ira-2026-rollover"
      ) {
        assertEquals(result.pending.f1040.line4c_ira_rollover, true);
        assertStringIncludes(
          xml,
          'referenceDocumentName="IRADistributionStatement"',
        );
        assertStringIncludes(xml, "<IRADistributionStatement documentId=");
        assertStringIncludes(
          xml,
          fixture.id === "single-ira-qualified-plan-rollover"
            ? "Example 401(k) qualified plan"
            : "2026-01-15",
        );
      }
      const path = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(path, xml);
        const checked = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, path],
          stdout: "piped",
          stderr: "piped",
        }).output();
        assertEquals(
          checked.code,
          0,
          `${fixture.id}: ${new TextDecoder().decode(checked.stderr)}`,
        );
      } finally {
        await Deno.remove(path);
      }
    },
  });
}
