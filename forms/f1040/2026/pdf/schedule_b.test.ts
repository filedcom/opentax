import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1099int } from "../../nodes/inputs/f1099int/index.ts";
import { schedule_b_2026 } from "../nodes/schedule_b.ts";
import { irsScheduleBPdf2026 } from "./forms/schedule_b.ts";
import { buildScheduleBPdfBytes2026 } from "./schedule_b.ts";

const context = { taxYear: 2026, formType: "f1040" };
const filer = { name: "Ada Rivera", ssn: "111223333" };

function scheduleFrom1099() {
  const source = f1099int.compute(context, {
    f1099ints: [{
      payer_name: "Test Bank",
      box1: 2_000,
      nominee_interest: 100,
    }],
  });
  const deposit =
    source.outputs.find((entry) => entry.nodeType === "schedule_b")!.fields;
  const result = schedule_b_2026.compute(context, {
    ...deposit,
    foreign_account: false,
    foreign_trust: false,
  });
  return result.outputs.find((entry) => entry.nodeType === "schedule_b")!
    .fields;
}

Deno.test("TY2026 Schedule B PDF map uses fields in the pinned draft", async () => {
  const inventory = new URL(
    "../../../../docs/ty2026/pdf-fields-f1040sb.csv",
    import.meta.url,
  );
  const rows = (await Deno.readTextFile(inventory)).trim().split("\n");
  const names = new Set(rows.slice(1).map((row) => row.split(",")[0]));
  for (const entry of irsScheduleBPdf2026.fields) {
    assertEquals(names.has(entry.pdfField), true, entry.pdfField);
  }
  assertEquals(irsScheduleBPdf2026.pageIndices?.({}), [1]);
});

Deno.test("TY2026 Schedule B PDF fills one printed page with adjustments", async () => {
  const fields = scheduleFrom1099();
  assertEquals(fields.print_line2_total, 1_900);
  const bytes = await buildScheduleBPdfBytes2026(fields, filer);
  const document = await PDFDocument.load(bytes);
  assertEquals(document.getPageCount(), 1);
  assertEquals(document.getForm().getFields().length, 0);
});

Deno.test("TY2026 Schedule B PDF appends payer and seller details", async () => {
  const details = Array.from({ length: 15 }, (_, index) => ({
    payerName: `Buyer ${index + 1}`,
    gross: 100,
    adjustments: [],
    net: 100,
    sellerFinanced: index === 0,
    buyerSsn: index === 0 ? "111223333" : undefined,
    buyerAddress: index === 0 ? "10 Main St" : undefined,
  }));
  const result = schedule_b_2026.compute(context, {
    taxable_interest_net: details.map((detail) => detail.net),
    interest_detail: details,
  });
  const fields =
    result.outputs.find((entry) => entry.nodeType === "schedule_b")!
      .fields;
  assertEquals(fields.file_schedule_b, true);
  assertEquals(fields.needs_interest_statement, true);
  const bytes = await buildScheduleBPdfBytes2026(fields, filer);
  const document = await PDFDocument.load(bytes);
  assertEquals(document.getPageCount(), 3);
});

Deno.test("TY2026 Schedule B PDF rejects missing Part III and misreconciled rows", async () => {
  const fields = scheduleFrom1099();
  await assertRejects(
    () =>
      buildScheduleBPdfBytes2026(
        { ...fields, foreign_account: undefined },
        filer,
      ),
    Error,
    "needs Part III answers",
  );
  await assertRejects(
    () =>
      buildScheduleBPdfBytes2026(
        { ...fields, print_line2_total: 1_800 },
        filer,
      ),
    Error,
    "rows and lines do not reconcile",
  );
});
