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
