import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../../2025/registry.ts";
import { w2 as nativeW2 } from "../../2025/mef/forms/income/other/w2.ts";
import { irs1040Pdf } from "../../2025/pdf/forms/general/return-assembly/f1040.ts";
import { fillFormPdf } from "../../2025/pdf/builder.ts";
import { testFiler } from "../../2025/mef/execution/test-filer.ts";
import {
  scenario104004Input,
  SCENARIO_1040_04_RECONCILIATION,
} from "./scenario_1040_04_input.ts";
import { SCENARIO_1040_04_FACTS } from "./ty2025_cases.ts";

Deno.test("ATS 1040 Scenario 4 W-2 reaches calculation, native statement and partial PDF", async () => {
  const input = scenario104004Input();
  const result = execute(buildExecutionPlan(registry), registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const form = result.pending.f1040;
  assertEquals(
    form?.line1a_wages,
    SCENARIO_1040_04_RECONCILIATION.form1040Line1aWages,
  );
  assertEquals(
    form?.line25a_w2_withheld,
    SCENARIO_1040_04_RECONCILIATION.form1040Line25aWithholding,
  );
  const filer = {
    ...testFiler(),
    primarySSN: SCENARIO_1040_04_FACTS.taxpayer.ssn,
    fullName: "Sarah Smith",
  };
  const [w2Xml] = nativeW2.build(result.pending.w2, { filer });
  assertStringIncludes(w2Xml, "<WagesAmt>36014</WagesAmt>");
  assertStringIncludes(w2Xml, "<WithholdingAmt>4581</WithholdingAmt>");
  const projected = irs1040Pdf.projectFields!(
    {
      line1a_wages: form?.line1a_wages,
      line25a_w2_withheld: form?.line25a_w2_withheld,
    },
    result.pending,
  );
  assertEquals(projected.line1a_wages, 36_014);
  assertEquals(projected.line25a_w2_withheld, 4_581);
  const pdf = await fillFormPdf(irs1040Pdf, projected, filer, ".pdf-cache");
  assertEquals((await PDFDocument.load(pdf!)).getPageCount(), 2);
});

Deno.test("ATS 1040 Scenario 4 printed solar and vehicle credits stay outside filing input", () => {
  const facts = SCENARIO_1040_04_FACTS;
  const recon = SCENARIO_1040_04_RECONCILIATION;
  assertEquals(
    facts.form8835.solarKilowattHoursProducedAndSold *
      facts.form8835.printedSolarRate,
    recon.solarBaseCreditFromPrintedKwhAndRate,
  );
  assertEquals(
    recon.solarBaseCreditFromPrintedKwhAndRate * 5,
    recon.solarFivefoldCreditIfPrintedLine8EligibilityApplies,
  );
  assertEquals(
    recon.solarFivefoldCreditIfPrintedLine8EligibilityApplies,
    recon.printedForm3800SolarCredit,
  );
  assertEquals(facts.form8835.ownerIsTaxpayer, false);
  assertEquals(facts.form8835.computedLine15Blank, true);
  assertEquals(
    facts.form8936ScheduleA.businessUseCreditLines9Through11Blank,
    true,
  );
  assertEquals(recon.printedForm3800VehicleBusinessCredit, 130);
  assertEquals(Object.keys(scenario104004Input()).sort(), ["general", "w2"]);
  assertEquals(recon.missing.length, 4);
});
