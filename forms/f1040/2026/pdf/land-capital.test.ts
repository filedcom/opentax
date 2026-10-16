import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildCapitalPdfBytes2026 } from "./capital-gains.ts";
import { buildForm8960PdfBytes2026 } from "./form8960.ts";
import {
  landCapitalFixture2026,
  landNiitFixture2026,
} from "../inputs/land-capital.fixture.ts";
const filer = { name: "Synthetic Land Seller", ssn: "123456789" };
const capitalDestinations = {
  form1040_line7a: 40200,
  form1040_line7b: false,
  form1040_line3a: 0,
  preferential_gain: 40000,
  form4797_line10: 40000,
  schedule1_line4: 5000,
};
const niitDestinations = {
  form1040_line2b: 0,
  form1040_line3b: 0,
  form1040_line7a: 40200,
  form1040_line11b: 300000,
  form1040_line12e: 16100,
  schedule1_line4: 5000,
  schedule1_line18: 0,
  schedule2_line6: 8,
};
async function inspect(bytes: Uint8Array, pages: number) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.getPageCount(), pages);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout);
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 land Schedule D prints the shared 4797 gain on line 11 and reconciles both characters", async () => {
  const source = landCapitalFixture2026();
  const bytes = await buildCapitalPdfBytes2026(
    source,
    capitalDestinations,
    filer,
    "schedule_d",
  );
  const t = await inspect(bytes, 2);
  const lines = t.split("\n");
  const line11 = lines.findIndex((s) => /Gain from Form 4797/.test(s));
  assertStringIncludes(lines.slice(line11, line11 + 2).join("\n"), "40000");
  assertStringIncludes(t, "40200");
  assertStringIncludes(t, "DRAFT - NOT FOR FILING");
  for (
    const d of [
      { ...capitalDestinations, form4797_line10: 45000 },
      { ...capitalDestinations, schedule1_line4: 4000 },
      { ...capitalDestinations, form4797_line10: undefined },
    ]
  ) {
    await assertRejects(
      () => buildCapitalPdfBytes2026(source, d, filer, "schedule_d"),
      Error,
      "disagree",
    );
  }
});
Deno.test("2026 land NIIT PDF prints ordinary plus capital gain and its supported exclusion", async () => {
  const source = landNiitFixture2026();
  const bytes = await buildForm8960PdfBytes2026(
    source,
    niitDestinations,
    filer,
  );
  const t = await inspect(bytes, 1);
  assertStringIncludes(t, "45200");
  assertStringIncludes(t, "-45000");
  assertStringIncludes(t, "200");
  assertStringIncludes(t, "DRAFT - NOT FOR FILING");
  for (
    const d of [
      { ...niitDestinations, schedule1_line4: 4000 },
      { ...niitDestinations, schedule1_line4: undefined },
    ]
  ) {
    await assertRejects(
      () => buildForm8960PdfBytes2026(source, d, filer),
      Error,
      "disagree",
    );
  }
});
