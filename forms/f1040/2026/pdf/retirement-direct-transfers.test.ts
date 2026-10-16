import { assert, assertEquals } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { directTransfersGraph2026 } from "../inputs/retirement-direct-transfers.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
Deno.test("2026 direct transfer bundle prints reconciled substitute and rollover income without invented issuer attachments", async () => {
  const b = await buildDraftReturnPdf2026(directTransfersGraph2026());
  assertEquals(b.sourceAttachments, []);
  assertEquals(b.calculation.pending.f1040.line5c_rollover, true);
  assertEquals(b.attachments.some((a) => a.form.startsWith("form5329")), false);
  const page =
    b.attachments.find((a) => a.form === "f4852:substitute-2026")!.formPages[0];
  const doc = await PDFDocument.load(b.bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, b.bytes);
    const text = async (p: number, rect?: number[]) => {
      const r = await new Deno.Command("pdftotext", {
        args: [
          "-layout",
          "-f",
          String(p),
          "-l",
          String(p),
          ...(rect
            ? [
              "-x",
              String(rect[0]),
              "-y",
              String(rect[1]),
              "-W",
              String(rect[2]),
              "-H",
              String(rect[3]),
            ]
            : []),
          file,
          "-",
        ],
      }).output();
      assertEquals(r.code, 0);
      return new TextDecoder().decode(r.stdout).trim();
    };
    assertEquals(await text(1, [253, 630, 70, 12]), "16000");
    assertEquals(await text(1, [505, 630, 71, 12]), "4000");
    assertEquals(await text(page, [237, 432, 73, 12]), "16000.25");
    assertEquals(await text(page, [237, 444, 73, 12]), "4000.25");
    assertEquals(await text(page, [504, 492, 73, 12]), "2000.00");
    for (let p = 1; p <= doc.getPageCount(); p++) {
      const content = await text(p);
      assert(!content.includes("roth-receipt"));
      assert(!content.includes("plan-basis-"));
    }
  } finally {
    await Deno.remove(file);
  }
  assertEquals(b.filingReady, false);
});
