import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../nodes/types.ts";
import { f1099int } from "../../nodes/inputs/f1099int/index.ts";
import { form6251 } from "../../nodes/intermediate/forms/form6251/index.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import { schedule_b_2026 } from "../nodes/schedule_b.ts";
import { schedule2_2026 } from "../nodes/schedule2.ts";
import { buildCorePdfBytes2026 } from "./core.ts";

Deno.test("TY2026 core PDF appends required Schedule 3-A from a calculated credit", async () => {
  const result = f1040_2026_node.compute({ taxYear: 2026, formType: "f1040" }, {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line9_total_income: 20_000,
    deduction_method: "standard",
    line16_income_tax: 500,
    line27a_eic: 1_000,
    schedule2_line20: 100,
    wants_federal_public_benefit: false,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!
    .fields;
  const schedule =
    result.outputs.find((output) => output.nodeType === "schedule3a")!.fields;
  const bytes = await buildCorePdfBytes2026({ f1040, schedule3a: schedule });
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 3);
  await assertRejects(
    () => buildCorePdfBytes2026({ f1040 }),
    Error,
    "presence disagrees",
  );
  await assertRejects(
    () =>
      buildCorePdfBytes2026({
        f1040,
        schedule3a: { ...schedule, line6_federal_public_benefit: 601 },
      }),
    Error,
    "line 32b",
  );
});

Deno.test("TY2026 core PDF omits Schedule 3-A without a relevant credit", async () => {
  const result = f1040_2026_node.compute({ taxYear: 2026, formType: "f1040" }, {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line9_total_income: 20_000,
    deduction_method: "standard",
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!
    .fields;
  const pdf = await PDFDocument.load(await buildCorePdfBytes2026({ f1040 }));
  assertEquals(pdf.getPageCount(), 2);
});

Deno.test("TY2026 core PDF appends and reconciles required Schedule B", async () => {
  const context = { taxYear: 2026, formType: "f1040" };
  const source = f1099int.compute(context, {
    f1099ints: [{
      payer_name: "Test Bank",
      box1: 2_000,
      nominee_interest: 100,
    }],
  });
  const deposit =
    source.outputs.find((entry) => entry.nodeType === "schedule_b")!.fields;
  const schedule = schedule_b_2026.compute(context, {
    ...deposit,
    foreign_account: false,
    foreign_trust: false,
  }).outputs.find((entry) => entry.nodeType === "schedule_b")!.fields;
  const result = f1040_2026_node.compute(context, {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line2b_taxable_interest: 1_900,
    line9_total_income: 1_900,
    deduction_method: "standard",
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!
    .fields;
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({ f1040, scheduleB: schedule }),
  );
  assertEquals(pdf.getPageCount(), 3);
  await assertRejects(
    () => buildCorePdfBytes2026({ f1040 }),
    Error,
    "needs Schedule B",
  );
  await assertRejects(
    () =>
      buildCorePdfBytes2026({
        f1040,
        scheduleB: { ...schedule, print_line4_total: 1_800 },
      }),
    Error,
    "disagrees with Form 1040",
  );
});

Deno.test("TY2026 core PDF appends Schedule 2 and Form 6251 for AMT", async () => {
  const context = { taxYear: 2026, formType: "f1040" };
  const result = f1040_2026_node.compute(context, {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line9_total_income: 100_000,
    deduction_method: "standard",
    standard_deduction: 16_100,
    line16_income_tax: 13_170,
    line17_additional_taxes: 68_712,
  });
  const f1040 = result.outputs.find((entry) => entry.nodeType === "f1040")!
    .fields;
  const schedule2 = schedule2_2026.compute(context, {
    line2_amt: 68_712,
  }).outputs.find((entry) => entry.nodeType === "schedule2")!.fields;
  const filed = form6251.compute(context, {
    filing_status: FilingStatus.Single,
    regular_tax_income: 83_900,
    regular_taxable_income: 83_900,
    regular_tax: 13_170,
    line2a_taxes_paid: 16_100,
    iso_adjustment: 300_000,
    taking_standard_deduction: true,
  }).outputs.find((entry) => entry.nodeType === "form6251")!.fields;
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({ f1040, schedule2, form6251: filed }),
  );
  assertEquals(pdf.getPageCount(), 6);
  await assertRejects(
    () => buildCorePdfBytes2026({ f1040 }),
    Error,
    "needs Schedule 2",
  );
  await assertRejects(
    () => buildCorePdfBytes2026({ f1040, schedule2 }),
    Error,
    "Form 6251 disagrees",
  );
});
