import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { createHash } from "node:crypto";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { gamblingGraph2026 } from "../inputs/gambling.fixture.ts";
export async function gamblingWithheldPdfFixture2026() {
  const graph = gamblingGraph2026();
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("SYNTHETIC ISSUED W-2G COPY - TEST ONLY", {
    x: 40,
    y: 700,
    size: 12,
  });
  const bytes = await pdf.save({ useObjectStreams: false });
  Object.assign(graph.gambling.claim.copies[0], {
    box4_federal_withheld: 500,
    issued_copy_pdf_base64: btoa(String.fromCharCode(...bytes)),
    issued_copy_pdf_sha256: createHash("sha256").update(bytes).digest("hex"),
    issued_copy_attachment_file_name: "synthetic-w2g.pdf",
  });
  return { graph, bytes };
}
Deno.test("2026 gambling prints line 8b and the 90-percent itemized loss on reconciled draft pages", async () => {
  for (const losses of [false, true]) {
    const r = await buildDraftReturnPdf2026(gamblingGraph2026(losses));
    const doc = await PDFDocument.load(r.bytes);
    assert(!doc.catalog.has(PDFName.of("AcroForm")));
    assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    const file = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(file, r.bytes);
      const t = await new Deno.Command("pdftotext", {
        args: ["-layout", file, "-"],
      }).output();
      assertEquals(t.code, 0);
      const pages = new TextDecoder().decode(t.stdout).split("\f");
      const s1 = r.attachments.find((a) => a.form === "schedule1")!;
      assertStringIncludes(
        pages[s1.formPages[0] - 1].split("\n").find((l) =>
          l.includes("Gambling")
        )!,
        losses ? "30000" : "2500",
      );
      const a = r.attachments.find((a) => a.form === "schedule_a");
      if (losses) {
        assert(a);
        assertStringIncludes(
          pages[a.formPages[1] - 1].split("\n").find((l) =>
            l.includes("Deductible gambling losses")
          )!,
          "27000",
        );
      } else assertEquals(a, undefined);
    } finally {
      await Deno.remove(file);
    }
  }
});
Deno.test("2026 W-2G withholding retains the exact original PDF separately from generated pages", async () => {
  const f = await gamblingWithheldPdfFixture2026();
  const r = await buildDraftReturnPdf2026(f.graph);
  assertEquals(r.calculation.pending.f1040.line25c_other_withheld, 500);
  assertEquals(r.sourceAttachments.length, 1);
  assertEquals(r.sourceAttachments[0].bytes, f.bytes);
  assertEquals(r.sourceAttachments[0].requiredForForms, ["f1040"]);
  assertEquals(r.sourceAttachments[0].reference, "casino-copy");
  f.graph.gambling.claim.copies[0].issued_copy_pdf_sha256 = "0".repeat(64);
  await assertRejects(() => buildDraftReturnPdf2026(f.graph), Error, "digest");
  delete f.graph.gambling.claim.copies[0].issued_copy_pdf_base64;
  await assertRejects(
    () => buildDraftReturnPdf2026(f.graph),
    Error,
    "original issued PDF",
  );
});
