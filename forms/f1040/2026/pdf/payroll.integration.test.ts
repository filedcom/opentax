import { assertEquals } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { syntheticForm4137_2026 } from "../inputs/form4137.fixture.ts";
import { syntheticForm8919_2026 } from "../inputs/form8919.fixture.ts";
import { syntheticMedicare2026 } from "../nodes/form8959.fixture.ts";
import { calculateForm4137_2026 } from "../inputs/form4137.ts";
import { calculateForm8919_2026 } from "../inputs/form8919.ts";
import { calculateForm8959_2026 } from "../nodes/form8959.ts";
import { calculateSchedule2_2026 } from "../schedule2.ts";
import { buildForm4137PdfBytes2026 } from "./form4137.ts";
import { buildForm8919PdfBytes2026 } from "./form8919.ts";
import { buildForm8959PdfBytes2026 } from "./form8959.ts";
import { buildSchedule2PdfBytes2026 } from "./schedule2.ts";
Deno.test("2026 payroll PDF components reconcile the shared wage limit and separate Schedule 2 totals", async () => {
  const filer = { name: "Ada Q Rivera", ssn: "111223333" };
  const tipInput = syntheticForm4137_2026();
  tipInput.w2_tip_sources![0].ss_wages_and_tips = 184_000;
  const tips = calculateForm4137_2026(tipInput).forms[0];
  const wageInput = syntheticForm8919_2026();
  wageInput.w2_sources![0].ss_wages_and_tips = 184_000;
  wageInput.form4137_sources = [{
    recipient: "taxpayer",
    line10_ss_tips: tips.ssTips,
  }];
  const wages = calculateForm8919_2026(wageInput);
  assertEquals([
    tips.ssTips,
    tips.totalTax,
    wages.forms[0].line10,
    wages.forms[0].line13,
  ], [500, 60, 0, 145]);
  const medicareInput = syntheticMedicare2026();
  medicareInput.form4137_medicare_sources_2026 = [{
    employee_ssn: filer.ssn,
    source_reference: "form4137:2026:taxpayer",
    amount: tips.medicareTips,
  }];
  medicareInput.form8919_medicare_sources_2026 = [{
    employee_ssn: filer.ssn,
    source_reference: "form8919:2026:taxpayer",
    amount: wages.forms[0].line6,
  }];
  const medicare = calculateForm8959_2026(medicareInput);
  assertEquals([
    medicare.lines.line4,
    medicare.lines.line12,
    medicare.lines.line24,
  ], [262_000, 558, 450]);
  const scheduleInput = {
    line16a_form4137_tip_tax: tips.totalTax,
    line16b_form8919_wage_tax: wages.forms[0].line13,
    line17b_medicare_wage_tax: medicare.lines.line12,
    line11_medicare_self_employment_tax: medicare.lines.line18,
    line17c_w2_uncollected_fica: 30,
    line13k_golden_parachute_tax: 100,
  };
  const totals = calculateSchedule2_2026(scheduleInput);
  assertEquals([
    totals.line15_additional_income_taxes,
    totals.line20_employment_and_other_taxes,
    totals.line21_total_additional_taxes,
  ], [100, 793, 893]);
  const parts = [
    await buildSchedule2PdfBytes2026(scheduleInput, {
      form1040_line17: 0,
      form1040_line23: 893,
      schedule3a_line4: 793,
    }, filer),
    await buildForm4137PdfBytes2026(tipInput, {
      form1040_line1c: 2000,
      schedule2_line16a: 60,
    }, { taxpayer: filer }),
    await buildForm8919PdfBytes2026(wageInput, {
      form1040_line1g: 10_000,
      schedule2_line16b: 145,
      form8919_withholding_component: 1000,
    }, { taxpayer: filer }),
    await buildForm8959PdfBytes2026(medicareInput, {
      schedule2_line17b: 558,
      schedule2_line11: 0,
      form8959_withholding_component: 450,
    }, filer),
  ];
  const counts: number[] = [];
  for (const bytes of parts) {
    counts.push((await PDFDocument.load(bytes)).getPageCount());
  }
  assertEquals(counts, [2, 1, 1, 1]);
});
