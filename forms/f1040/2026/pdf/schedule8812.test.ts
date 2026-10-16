import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildSchedule8812PdfBytes2026 } from "./schedule8812.ts";
import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
import type { calculateChildCredit2026 } from "../nodes/f8812.ts";

async function extract(bytes: Uint8Array) {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/return.pdf`, bytes);
    const output = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/return.pdf`, "-"],
    }).output();
    assertEquals(output.code, 0);
    return new TextDecoder().decode(output.stdout).split("\f");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}
Deno.test("2026 child-credit bundle attaches a reconciled static Schedule 8812", async () => {
  const result = await buildDraftReturnPdf2026(childCreditGraphFixture2026());
  assertEquals(result.attachments.map((a) => a.form), [
    "f1040",
    "schedule8812",
  ]);
  assertEquals(result.filingReady, false);
  assert(!result.unfinishedReceivers.includes("f8812"));
  const doc = await PDFDocument.load(result.bytes);
  assertEquals(doc.getPageCount(), 4);
  assertEquals(doc.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const text = await extract(result.bytes);
  assertStringIncludes(text[2], "Synthetic Investor");
  assertStringIncludes(text[2], "2200");
  assertStringIncludes(text[2], "50000");
  const calculated = result.calculation.pending.f8812
    .calculation_2026 as ReturnType<typeof calculateChildCredit2026>;
  await assertRejects(
    () =>
      buildSchedule8812PdfBytes2026(calculated.source_input, {
        form1040_line11b: 50000,
        form1040_line18: 3823,
        form1040_line19: 2199,
        form1040_line28: 0,
        qualifying_children: 1,
        other_dependents: 0,
        declines_actc: false,
      }, { name: "Synthetic Investor", ssn: "123456789" }),
    Error,
    "disagree",
  );
});
Deno.test("2026 ACTC prints its worksheet and selects Schedule 3-A before attachment 47", async () => {
  const result = await buildDraftReturnPdf2026(
    childCreditGraphFixture2026(10003),
  );
  assertEquals(result.attachments.map((a) => a.form), [
    "f1040",
    "schedule3a",
    "schedule8812",
  ]);
  const text = await extract(result.bytes);
  const page =
    result.attachments.find((a) => a.form === "schedule8812")!.formPages[1];
  assertStringIncludes(text[page - 1], "10003");
  assertStringIncludes(text[page - 1], "7503");
  assertStringIncludes(text[page - 1], "1125");
  assertEquals(result.calculation.pending.f1040.line28_actc, 1125);
});
Deno.test("2026 phased-out child credit keeps the dependent but omits Schedule 8812", async () => {
  const result = await buildDraftReturnPdf2026(
    childCreditGraphFixture2026(250000),
  );
  assert(!result.attachments.some((a) => a.form === "schedule8812"));
  assertEquals(result.calculation.pending.f1040.dependent_count, 1);
  assertEquals(result.calculation.pending.f1040.line19_child_tax_credit, 0);
});
Deno.test("2026 ACTC opt-out omits the refundable worksheet and keeps the nonrefundable credit", async () => {
  const input = childCreditGraphFixture2026(20000);
  input.f8812.do_not_claim_actc = true;
  const result = await buildDraftReturnPdf2026(input);
  const text = await extract(result.bytes);
  const page =
    result.attachments.find((a) => a.form === "schedule8812")!.formPages[1];
  assert(!text[page - 1].includes("20000"));
  assertEquals(result.calculation.pending.f1040.line19_child_tax_credit, 393);
  assertEquals(result.calculation.pending.f1040.line28_actc, 0);
});
