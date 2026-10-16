import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { studentLoanGraphFixture2026 } from "../inputs/student-loan.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 student-loan sources print the phaseout result on Schedule 1 and reach return settlement", async () => {
  const result = await buildDraftReturnPdf2026(
    studentLoanGraphFixture2026(190000, FilingStatus.MFJ),
  );
  assertEquals(result.attachments.map((a) => a.form), ["f1040", "schedule1"]);
  assertEquals(result.calculation.pending.f1040.line10_adjustments, 1250);
  assertEquals(result.calculation.pending.f1040.line11b_agi, 188750);
  const document = await PDFDocument.load(result.bytes);
  assertEquals(document.getPageCount(), 4);
  assertEquals(document.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(document.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/return.pdf`, result.bytes);
    const output = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/return.pdf`, "-"],
    }).output();
    assertEquals(output.code, 0);
    const pages = new TextDecoder().decode(output.stdout).split("\f");
    assertStringIncludes(pages[0], "188750");
    assertStringIncludes(pages[3], "Student loan interest deduction");
    assertStringIncludes(pages[3], "1250");
    assert(!pages[3].includes("2500"));
    assertStringIncludes(pages[2], "Synthetic Investor & Second Borrower");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
  const phasedOut = await buildDraftReturnPdf2026(
    studentLoanGraphFixture2026(205000, FilingStatus.MFJ),
  );
  assertEquals(phasedOut.calculation.pending.f1040.line10_adjustments, 0);
  assert(!phasedOut.attachments.some((a) => a.form === "schedule1"));
});
