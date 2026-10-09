import { f1040_2025 } from "../../2025/index.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { scheduleA } from "../../2025/mef/forms/deductions/itemized/schedule_a.ts";
import { scheduleAPdf } from "../../2025/pdf/forms/deductions/itemized/schedule_a.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { w2 } from "../../nodes/inputs/income/wages/w2/index.ts";
import { scheduleC as scheduleCNode } from "../../nodes/inputs/income/business/schedule_c/index.ts";
import { scheduleC as scheduleCMef } from "../../2025/mef/forms/income/business/schedule_c.ts";
import { scheduleCPdf } from "../../2025/pdf/forms/income/business/schedule_c.ts";
import { fillFormPdf } from "../../2025/pdf/builder.ts";
import { testFiler } from "../../2025/mef/execution/test-filer.ts";
import {
  scenario104002Input,
  SCENARIO_1040_02_RECONCILIATION,
} from "./scenario_1040_02_input.ts";
import { SCENARIO_1040_02_FACTS } from "./ty2025_cases.ts";

Deno.test("ATS 1040 Scenario 2 issued W-2s reconcile to statutory Schedule C", async () => {
  const input = scenario104002Input();
  const forms = input.w2 as Array<Record<string, unknown>>;
  const business = (input.schedule_c as Array<Record<string, unknown>>)[0];
  assertEquals(forms.length, 2);
  assertEquals(forms[0].employee_ssn, SCENARIO_1040_02_FACTS.taxpayer.ssn);
  assertEquals(forms[1].employee_ssn, SCENARIO_1040_02_FACTS.spouse.ssn);
  assertEquals(forms[0].box13_statutory_employee, true);
  assertEquals(forms[1].box13_statutory_employee, false);
  assertEquals(
    forms[0].source_document_reference,
    "irs-ty2025-ats-1040-02-w2-page-4",
  );

  const wages = w2.compute(
    { taxYear: 2025, formType: "f1040" },
    w2.inputSchema.parse({ w2s: forms }),
  );
  const routed = (type: string) =>
    wages.outputs.find((item) => item.nodeType === type)?.fields;
  assertEquals(
    routed("f1040")?.line1a_wages,
    SCENARIO_1040_02_RECONCILIATION.regularW2Wages,
  );
  assertEquals(
    routed("f1040")?.line25a_w2_withheld,
    SCENARIO_1040_02_RECONCILIATION.totalW2Withholding,
  );
  const sources = routed("schedule_c")?.statutory_w2_sources;
  assertEquals((sources as unknown[])?.length, 1);
  assertEquals(
    (sources as Array<Record<string, unknown>>)[0].amount,
    SCENARIO_1040_02_RECONCILIATION.statutoryW2Receipts,
  );

  const scheduleCInput = scheduleCNode.inputSchema.parse({
    schedule_cs: [business],
    statutory_w2_sources: sources,
  });
  const result = scheduleCNode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleCInput,
  );
  const schedule1 = result.outputs.find((item) => item.nodeType === "schedule1")
    ?.fields;
  assertEquals(
    schedule1?.line3_schedule_c,
    SCENARIO_1040_02_RECONCILIATION.scheduleCProfit,
  );
  assertEquals(
    (business.line_8_advertising as number) +
      (business.line_9_car_truck_expenses as number) +
      (business.line_19_pension_plans as number) +
      (business.line_22_supplies as number) +
      (business.line_23_taxes_licenses as number),
    SCENARIO_1040_02_RECONCILIATION.scheduleCExpenses,
  );

  const filer = {
    ...testFiler(),
    primarySSN: SCENARIO_1040_02_FACTS.taxpayer.ssn,
    fullName: "John Jones",
  };
  const [xml] = scheduleCMef.build(scheduleCInput, { filer });
  assertStringIncludes(
    xml,
    "<TotalGrossReceiptsAmt>29513</TotalGrossReceiptsAmt>",
  );
  assertStringIncludes(xml, "<NetProfitOrLossAmt>26979</NetProfitOrLossAmt>");
  const projected = scheduleCPdf.projectFields!(scheduleCInput, {
    general: input.general as Record<string, unknown>,
    w2: { w2s: forms },
    schedule_c: scheduleCInput,
  });
  const [copy] = scheduleCPdf.instances!(projected, filer);
  assertEquals(copy.line1, 29_513);
  assertEquals(copy.line28, 2_534);
  assertEquals(copy.line31, 26_979);
  const bytes = await fillFormPdf(scheduleCPdf, copy, filer, ".pdf-cache");
  assertEquals((await PDFDocument.load(bytes!)).getPageCount(), 2);
});

Deno.test("ATS 1040 Scenario 2 retains missing return and attachment evidence", () => {
  const input = scenario104002Input();
  const general = input.general as Record<string, unknown>;
  assertEquals(Object.keys(input).sort(), [
    "general",
    "schedule_a",
    "schedule_c",
    "w2",
  ]);
  assertEquals(general.filing_status, "mfj");
  assertEquals(general.digital_assets, false);
  assertEquals(input.f8283, undefined);
  assertEquals(input.estimated_tax_payments, undefined);
  assertEquals(SCENARIO_1040_02_RECONCILIATION.missing.length, 5);
});

Deno.test("ATS 1040 Scenario 2 retains its printed below-standard itemizing election and interest entries", () => {
  const result = f1040_2025.executeReturn(scenario104002Input());
  assertEquals(result.diagnostics, []);
  const p = result.pending;
  assertEquals(p.schedule_a?.force_itemized, true);
  assertEquals(p.schedule_a?.line_5b_real_estate_tax, 8_972);
  assertEquals(p.schedule_a?.line_8a_mortgage_interest_1098, 11_000);
  assertEquals(p.schedule_a?.line_8c_points_no_1098, 251);
  assertEquals(p.f1040?.line12a_standard_deduction, undefined);
  const filer = extractFilerIdentity(p.f1040)!;
  assertThrows(
    () => scheduleA.build(p.schedule_a, { filer, pending: p }),
    Error,
    "Schedule A line 8a needs retained Form 1098 source",
  );
  assertThrows(
    () => scheduleAPdf.instances!(p.schedule_a, filer, p),
    Error,
    "Schedule A line 8a needs retained Form 1098 source",
  );
  // No native/PDF total or final-tax pass: mortgage evidence, statutory-W2 SALT and gifts remain open.
});
