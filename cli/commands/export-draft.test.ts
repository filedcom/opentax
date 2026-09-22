import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFRawStream,
  StandardFonts,
} from "pdf-lib";
import { catalog } from "../../catalog.ts";
import { appendInput } from "../store/store.ts";
import { createReturnCommand } from "./return.ts";
import { exportMefCommand, exportPdfCommand } from "./export.ts";
import { FilingStatus } from "../../forms/f1040/nodes/types.ts";

Deno.test("explicit draft XML remains labeled after clean calculation", async () => {
  const baseDir = await Deno.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    await appendInput(`${baseDir}/${returnId}`, "general", {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Synthetic",
      taxpayer_last_name: "Example",
    });
    await appendInput(`${baseDir}/${returnId}`, "f2441", {});
    await appendInput(`${baseDir}/${returnId}`, "w2", {
      box1_wages: 85000,
      box2_fed_withheld: 10000,
    });
    const xml = await exportMefCommand({
      returnId,
      baseDir,
      force: true,
      draft: true,
    });
    assertStringIncludes(xml, "DRAFT");
  } finally {
    await Deno.remove(baseDir, { recursive: true });
  }
});

Deno.test("draft PDF visibly labels every page using a synthetic PDF template", async () => {
  const baseDir = await Deno.makeTempDir();
  const original = catalog["f1040:2025"];
  try {
    const template = await PDFDocument.create();
    template.addPage();
    template.addPage();
    const bytes = await template.save();
    // Replace only IRS template fetching/rendering; exercise the real export pipeline.
    catalog["f1040:2025"] = {
      ...original,
      buildPdfBytes: () => Promise.resolve(bytes),
    };
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    const path = await exportPdfCommand({
      returnId,
      baseDir,
      force: true,
      draft: true,
    });
    const pdf = await PDFDocument.load(await Deno.readFile(path));
    assertEquals(pdf.getPageCount(), 2);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const label = font.encodeText("DRAFT / INCOMPLETE").toString();
    for (const page of pdf.getPages()) {
      const contents = page.node.Contents();
      assert(contents instanceof PDFArray);
      const text = contents.asArray().map((ref) => {
        const stream = pdf.context.lookup(ref);
        assert(stream instanceof PDFRawStream);
        return new TextDecoder().decode(decodePDFRawStream(stream).decode());
      }).join("\n");
      assertStringIncludes(text, label);
    }
  } finally {
    catalog["f1040:2025"] = original;
    await Deno.remove(baseDir, { recursive: true });
  }
});
