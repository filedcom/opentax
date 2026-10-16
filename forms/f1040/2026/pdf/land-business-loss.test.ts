import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { calculateLandQbi2026 } from "../inputs/land-qbi.ts";
import { landQbiFixture2026 } from "../inputs/land-qbi.fixture.ts";
import { buildForm4797PdfBytes2026 } from "./form4797.ts";
import { buildForm461PdfBytes2026 } from "./form461.ts";
const filer = { name: "Synthetic Land Seller", ssn: "123456789" };
async function text(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.getPageCount(), 1);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(result.code, 0);
    return new TextDecoder().decode(result.stdout);
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 source-derived land loss produces matching 4797 and 461 drafts without a deductible-loss override", async () => {
  const q = calculateLandQbi2026(landQbiFixture2026(-400000)), r = q.loss;
  const land = r.finalized_sources.capital_sources.land_sources_2026!;
  const p4797 = await buildForm4797PdfBytes2026(
    land.source,
    {
      schedule_d_line11: 0,
      schedule1_line4: -400000,
      section1231_loss_taken_into_account: 256000,
    },
    filer,
    land.finalized_loss,
  );
  const p461 = await buildForm461PdfBytes2026(r.finalized_sources, {
    schedule1_line3: 0,
    form1040_line7a: 0,
    schedule1_line4: -400000,
    schedule1_line15: 0,
    schedule1_line8p: 144000,
    excess_loss_origin_2026: 144000,
  }, filer);
  const a = await text(p4797), b = await text(p461);
  assertStringIncludes(a, "(400000)");
  assertEquals(a.includes("256000"), false);
  assertStringIncludes(b, "(400000)");
  assertStringIncludes(b, "256000");
  assertStringIncludes(b, "(144000)");
  assertEquals(q.qbi, -256000);
  assertEquals(q.qualified_suspended_loss, 144000);
  assertEquals(r.calculation.capital.land!.calculation.opening_2027_losses, [{
    loss_year: 2026,
    remaining_loss: 256000,
  }]);
});
