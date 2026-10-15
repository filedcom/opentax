import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildSchedule3PdfBytes2026 } from "./schedule3.ts";
import { calculateSchedule3_2026 } from "../schedule3.ts";
import { excessWithholdingFixture2026 } from "../schedule3.fixture.ts";
import { eicGraphFixture2026 } from "../nodes/eitc.fixture.ts";
async function text(bytes: Uint8Array) {
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(result.code, 0);
    return new TextDecoder().decode(result.stdout).split("\f");
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 Schedule 3 bundle attaches line 11 and reconciles original W-2 sources", async () => {
  const input = excessWithholdingFixture2026();
  const r = await buildDraftReturnPdf2026(input);
  assertEquals(r.attachments.map((a) => a.form), [
    "f1040",
    "schedule2",
    "schedule3",
    "form8959",
    "form8960",
  ]);
  const pages = await text(r.bytes);
  const s = r.attachments.find((a) => a.form === "schedule3")!;
  assertEquals(s.formPages, [5]);
  assertStringIncludes(pages[4], "7161");
  assertStringIncludes(pages[1], "37161");
  const pdf = await PDFDocument.load(r.bytes);
  assertEquals(pdf.getPageCount(), 7);
  assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  assert(!r.unfinishedReceivers.includes("schedule3"));
  await assertRejects(
    () =>
      buildSchedule3PdfBytes2026(
        { line11_excess_ss: 7160 },
        { form1040_line20: 0, form1040_line31: 7160 },
        { name: "Synthetic Investor", ssn: input.general.taxpayer_ssn },
        {
          w2s: input.w2s,
          filing_status: input.general.filing_status,
          taxpayer_ssn: input.general.taxpayer_ssn,
        },
      ),
    Error,
    "differs from W-2",
  );
  await assertRejects(
    () =>
      buildSchedule3PdfBytes2026({ line11_excess_ss: 7161 }, {
        form1040_line20: 0,
        form1040_line31: 7161,
      }, { name: "Synthetic Investor", ssn: input.general.taxpayer_ssn }),
    Error,
    "source identity",
  );
});
Deno.test("2026 Schedule 3 precedes Schedule 3-A and ACTC uses its excess credit", async () => {
  const r = await buildDraftReturnPdf2026(
    excessWithholdingFixture2026(10000, 3),
  );
  assertEquals(r.attachments.map((a) => a.form), [
    "f1040",
    "schedule2",
    "schedule3",
    "schedule3a",
    "schedule_eic",
    "schedule8812",
    "form8959",
  ]);
  const s = r.calculation.pending.schedule3a;
  assertEquals(s.line1b_other_payments, 7161);
  assertEquals(s.line2_eligible_refundable_credits, 9611);
  const lines = await text(r.bytes);
  assertStringIncludes(
    lines[
      r.attachments.find((a) => a.form === "schedule8812")!.formPages[1] - 1
    ],
    "11672",
  );
});
Deno.test("2026 Schedule 3 excludes the cover, leaves reserved fields empty and preserves overflow descriptions", async () => {
  const raw = {
    line2_childcare_credit: 1500,
    line13e_section1062_tax: 321,
    line6z_other_credits: Array.from(
      { length: 45 },
      (_, i) => ({
        description: `Credit source ${i + 1} with a complete description`,
        amount: i + 1,
        source_reference: `credit-${i + 1}`,
      }),
    ),
    line13z_other_payments: [{
      description: "First reviewed payment",
      amount: 12.5,
      source_reference: "payment-a",
    }, {
      description: "Second reviewed payment",
      amount: 17.5,
      source_reference: "payment-b",
    }],
  };
  const c = calculateSchedule3_2026(raw);
  const b = await buildSchedule3PdfBytes2026(raw, {
    form1040_line20: c.lines.line8_total,
    form1040_line31: c.lines.line15_total,
  }, { name: "Synthetic Investor", ssn: "123456789" });
  const pages = await text(b);
  assertStringIncludes(pages[0], "321");
  assertStringIncludes(pages[0], "See attached statement");
  assertStringIncludes(
    pages.join("\n"),
    "Credit source 45 with a complete description - $45.00",
  );
  assertStringIncludes(pages.join("\n"), "Second reviewed payment - $17.50");
  const pdf = await PDFDocument.load(b);
  assertEquals(pdf.getPageCount(), 4);
  await assertRejects(
    () =>
      buildSchedule3PdfBytes2026(raw, {
        form1040_line20: 0,
        form1040_line31: 0,
      }, { name: "Synthetic Investor", ssn: "123456789" }),
    Error,
    "disagree",
  );
});
Deno.test("2026 no-payment return omits Schedule 3", async () => {
  const r = await buildDraftReturnPdf2026(eicGraphFixture2026(10000, 0));
  assert(!r.attachments.some((a) => a.form === "schedule3"));
});
