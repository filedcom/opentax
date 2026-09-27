import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { schedule2_2026 } from "../nodes/schedule2.ts";
import { irsSchedule2Pdf2026 } from "./forms/schedule2.ts";
import { buildSchedule2PdfBytes2026 } from "./schedule2.ts";

const context = { taxYear: 2026, formType: "f1040" };
const filer = { name: "Ada Rivera", ssn: "111223333" };

function schedule2(input: Record<string, number>) {
  return schedule2_2026.compute(context, input).outputs.find((entry) =>
    entry.nodeType === "schedule2"
  )!.fields;
}

Deno.test("TY2026 Schedule 2 PDF fields exist in its pinned draft", async () => {
  const inventory = new URL(
    "../../../../docs/ty2026/pdf-fields-f1040s2.csv",
    import.meta.url,
  );
  const rows = (await Deno.readTextFile(inventory)).trim().split("\n");
  const names = new Set(rows.slice(1).map((row) => row.split(",")[0]));
  for (const entry of irsSchedule2Pdf2026.fields) {
    assertEquals(names.has(entry.pdfField), true, entry.pdfField);
  }
  assertEquals(irsSchedule2Pdf2026.pageIndices?.({}), [1, 2]);
});

Deno.test("TY2026 Schedule 2 PDF fills AMT, NIIT, and tip tax", async () => {
  const fields = schedule2({
    line2_amt: 68_712,
    line6_niit: 380,
    line16a_form4137_tip_tax: 153,
  });
  const bytes = await buildSchedule2PdfBytes2026(fields, filer);
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 2);
  assertEquals(pdf.getForm().getFields().length, 0);
});

Deno.test("TY2026 Schedule 2 PDF rejects inconsistent totals and omitted descriptions", async () => {
  const fields = schedule2({ line2_amt: 5_000 });
  await assertRejects(
    () =>
      buildSchedule2PdfBytes2026(
        { ...fields, line3_part1_tax: 4_000 },
        filer,
      ),
    Error,
    "does not reconcile",
  );
  const missingDescription = schedule2({ line1y_other_additions: 200 });
  await assertRejects(
    () => buildSchedule2PdfBytes2026(missingDescription, filer),
    Error,
    "needs the description/election",
  );
});
