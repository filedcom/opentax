import { assert, assertEquals } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { form4852IraGraph2026 } from "../inputs/form4852-ira.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
Deno.test("2026 substitute IRA bundle reconciles Form 4852 with annual Form 8606 and early tax without an invented issuer PDF", async () => {
  const b = await buildDraftReturnPdf2026(form4852IraGraph2026());
  assertEquals(b.sourceAttachments, []);
  assertEquals(b.calculation.pending.f1040.line4b_ira_taxable, 14800);
  assertEquals(b.calculation.pending.f1040.line25b_withheld_1099, 1000);
  const substitute = b.attachments.find((a) =>
    a.form === "f4852:ira-distribution"
  )!;
  const basis = b.attachments.find((a) => a.form === "form8606:taxpayer")!;
  const early = b.attachments.find((a) => a.form === "form5329:taxpayer")!;
  const doc = await PDFDocument.load(b.bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, b.bytes);
    const text = async (page: number, rect?: number[]) => {
      const r = await new Deno.Command("pdftotext", {
        args: [
          "-layout",
          "-f",
          String(page),
          "-l",
          String(page),
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
    assertEquals(await text(substitute.formPages[0], [237, 444, 73, 12]), "");
    assertEquals(
      await text(substitute.formPages[0], [504, 432, 73, 12]),
      "1000.00",
    );
    assertEquals(
      await text(substitute.formPages[0], [504, 516, 73, 12]),
      "IRA",
    );
    // Independently locate the filed basis carryforward, ordinary taxable and conversion taxable cells.
    assertEquals(await text(basis.formPages[0], [505, 684, 71, 12]), "2800");
    assertEquals(await text(basis.formPages[1], [505, 144, 71, 12]), "5550");
    assertEquals(await text(basis.formPages[1], [505, 264, 71, 12]), "9250");
    assertEquals(await text(early.formPages[0], [505, 300, 71, 12]), "555");
    for (let page = 1; page <= doc.getPageCount(); page++) {
      const content = await text(page);
      assert(!content.includes("evidence-ira-payment"));
      assert(!content.includes("custodian-annual-payment-ledger"));
    }
  } finally {
    await Deno.remove(file);
  }
  assertEquals(b.filingReady, false);
});
