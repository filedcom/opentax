import { assertEquals, assertStringIncludes } from "@std/assert";
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
