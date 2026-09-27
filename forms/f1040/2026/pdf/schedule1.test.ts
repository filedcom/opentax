import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../nodes/types.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import { schedule1_2026 } from "../nodes/schedule1.ts";
import { buildCorePdfBytes2026 } from "./core.ts";
import { irsSchedule1Pdf2026 } from "./forms/schedule1.ts";
import { buildSchedule1PdfBytes2026 } from "./schedule1.ts";

const context = { taxYear: 2026, formType: "f1040" };
const filer = { name: "Ada Rivera", ssn: "111223333" };

function penaltyReturn() {
  const schedule1 = schedule1_2026.compute(context, {
    line18_early_withdrawal: 100,
    agi_schedule1_line10: 0,
    agi_schedule1_line26: 100,
  }).outputs[0].fields;
  const f1040 = f1040_2026_node.compute(context, {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    digital_assets: false,
    taxpayer_citizen_national_or_work_authorized: true,
    line1a_wages: 2_000,
    line9_total_income: 2_000,
    line10_adjustments: 100,
    deduction_method: "standard",
  }).outputs.find((entry) => entry.nodeType === "f1040")!.fields;
  return { schedule1, f1040 };
}

Deno.test("TY2026 Schedule 1 PDF map uses fields in the pinned draft", async () => {
  const inventory = new URL(
    "../../../../docs/ty2026/pdf-fields-f1040s1.csv",
    import.meta.url,
  );
  const rows = (await Deno.readTextFile(inventory)).trim().split("\n");
  const names = new Set(rows.slice(1).map((row) => row.split(",")[0]));
  for (const entry of irsSchedule1Pdf2026.fields) {
    assertEquals(names.has(entry.pdfField), true, entry.pdfField);
  }
  assertEquals(irsSchedule1Pdf2026.pageIndices?.({}), [1, 2]);
});

Deno.test("TY2026 Schedule 1 PDF fills penalty and joins Form 1040", async () => {
  const { schedule1, f1040 } = penaltyReturn();
  const bytes = await buildSchedule1PdfBytes2026(schedule1, f1040, filer);
  const schedulePdf = await PDFDocument.load(bytes);
  assertEquals(schedulePdf.getPageCount(), 2);
  assertEquals(schedulePdf.getForm().getFields().length, 0);
  const core = await PDFDocument.load(
    await buildCorePdfBytes2026({ f1040, schedule1 }),
  );
  assertEquals(core.getPageCount(), 4);
  await assertRejects(
    () => buildCorePdfBytes2026({ f1040 }),
    Error,
    "needs Schedule 1",
  );
});

Deno.test("TY2026 Schedule 1 PDF rejects incorrect totals", async () => {
  const { schedule1, f1040 } = penaltyReturn();
  await assertRejects(
    () =>
      buildSchedule1PdfBytes2026(
        { ...schedule1, line26_total_adjustments: 99 },
        f1040,
        filer,
      ),
    Error,
    "do not reconcile",
  );
  await assertRejects(
    () =>
      buildSchedule1PdfBytes2026(
        schedule1,
        { ...f1040, line10_adjustments: 99 },
        filer,
      ),
    Error,
    "disagrees with Form 1040",
  );
});
