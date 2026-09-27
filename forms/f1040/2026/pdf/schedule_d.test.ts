import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { irsScheduleDPdf2026 } from "./forms/schedule_d.ts";
import { buildScheduleDPdfBytes2026 } from "./schedule_d.ts";

const filer = { name: "Ada Rivera", ssn: "111223333" };
const schedule = {
  line_6_carryover: 0,
  line_14_carryover: 1_000,
  qof_disposition: false,
  qof_deferral_or_inclusion: false,
  other_capital_activity: false,
  form4952_filing: false,
  line13_cap_gain_distrib: 5_000,
  print_qof_disposition: false,
  print_line7_st_total: 0,
  print_line13_cap_gain_distrib: 5_000,
  print_line15_lt_total: 4_000,
  print_line16_combined: 4_000,
  print_line17_both_gains: true,
  print_line18_28pct: 0,
  print_line19_unrecaptured_1250: 0,
  print_line20_qdcgt: true,
};
const f1040 = {
  filing_status: "single",
  line7a_capital_gain: 4_000,
  line7b_schedule_d_not_required: false,
  line3a_qualified_dividends: 0,
};

Deno.test("TY2026 Schedule D PDF maps every pinned draft widget", async () => {
  const source = await PDFDocument.load(
    await Deno.readFile(
      new URL(
        "../../../../docs/ty2026/corpus/draft/f1040sd.pdf",
        import.meta.url,
      ),
    ),
    { ignoreEncryption: true },
  );
  const names = new Set(
    source.getForm().getFields().map((field) => field.getName()),
  );
  assertEquals(irsScheduleDPdf2026.fields.length, 55);
  assertEquals(
    irsScheduleDPdf2026.fields.every((entry) => names.has(entry.pdfField)),
    true,
  );
});

Deno.test("TY2026 Schedule D PDF fills carryover and distributions", async () => {
  const bytes = await buildScheduleDPdfBytes2026(schedule, f1040, filer);
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 2);
  assertEquals(pdf.getForm().getFields().length, 0);
  await assertRejects(
    () =>
      buildScheduleDPdfBytes2026(schedule, {
        ...f1040,
        line7a_capital_gain: 4_001,
      }, filer),
    Error,
    "disagrees with Form 1040 line 7a",
  );
  await assertRejects(
    () =>
      buildScheduleDPdfBytes2026(
        {
          ...schedule,
          transaction: [{ part: "A" }],
        },
        f1040,
        filer,
      ),
    Error,
    "needs source form or Form 8949 detail",
  );
  await assertRejects(
    () =>
      buildScheduleDPdfBytes2026(
        {
          ...schedule,
          line13_cap_gain_distrib: 4_000,
        },
        f1040,
        filer,
      ),
    Error,
    "lines do not reconcile",
  );
});

Deno.test("TY2026 Schedule D PDF handles a limited capital loss", async () => {
  const bytes = await buildScheduleDPdfBytes2026({
    ...schedule,
    line_6_carryover: 6_000,
    line_14_carryover: 0,
    line13_cap_gain_distrib: 0,
    print_line13_cap_gain_distrib: undefined,
    print_line7_st_total: -6_000,
    print_line15_lt_total: 0,
    print_line16_combined: -6_000,
    print_line17_both_gains: undefined,
    print_line18_28pct: undefined,
    print_line19_unrecaptured_1250: undefined,
    print_line20_qdcgt: undefined,
    print_line21_loss: -3_000,
  }, {
    ...f1040,
    line7a_capital_gain: -3_000,
    line3a_qualified_dividends: 100,
  }, filer);
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 2);
});
