import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildCombinedQbiPdfBytes2026 } from "./form8995.ts";
import {
  combinedQbiFixture2026,
  combinedQbiSelectionFixture2026,
} from "../inputs/combined-qbi.fixture.ts";
import { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
const owners = {
  taxpayer: { name: "Synthetic Combined Filer", ssn: "123456789" },
};
function destinations(
  raw: Parameters<typeof calculateDeductionSelection2026>[0],
) {
  const r = calculateDeductionSelection2026(raw).resolution.selected;
  return {
    form1040_line11b: raw.agi,
    form1040_line12e: r.line12eStandardOrItemized,
    form1040_line12f: r.line12fNonitemizerCharity,
    form1040_line13a: r.line13aSchedule1a,
    form1040_line13b: r.line13bQbi,
    form1040_line15: r.line15TaxableIncome,
  };
}
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
Deno.test("2026 combined Form 8995 prints C and ordinary land QBI with the chosen deduction", async () => {
  const f = combinedQbiSelectionFixture2026(), d = destinations(f);
  assertEquals([d.form1040_line13b, d.form1040_line15], [2859, 81041]);
  const t = await inspect(await buildCombinedQbiPdfBytes2026(f, d, owners), 1);
  for (const amount of ["9293", "5000", "14293", "40000", "2859"]) {
    assertStringIncludes(t, amount);
  }
  assertStringIncludes(t, "Synthetic land business");
  assertStringIncludes(t, "DRAFT - NOT FOR FILING");
  for (const key of Object.keys(d) as (keyof typeof d)[]) {
    await assertRejects(
      () =>
        buildCombinedQbiPdfBytes2026(f, { ...d, [key]: d[key] + 1 }, owners),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildCombinedQbiPdfBytes2026(f, d, {
        taxpayer: { ...owners.taxpayer, ssn: "987654321" },
      }),
    Error,
    "matching filer",
  );
});
Deno.test("2026 combined Form 8995 prints allowed losses without the suspended NOL origin", async () => {
  const f = combinedQbiSelectionFixture2026(
    combinedQbiFixture2026(-400000, [-200000]),
  );
  const t = await inspect(
    await buildCombinedQbiPdfBytes2026(f, destinations(f), owners),
    1,
  );
  assertStringIncludes(t, "(85333)");
  assertStringIncludes(t, "(170667)");
  assertStringIncludes(t, "(256000)");
  assertEquals(t.includes("344000"), false);
});
Deno.test("2026 combined Form 8995 continuation includes every business and land activity once", async () => {
  const source = combinedQbiFixture2026(45000, Array(8).fill(10000));
  const businesses =
    source.land_sources.loss_sources.loss_sources.business_sources!.businesses;
  businesses.forEach((b, i) => b.business_name = `Synthetic service ${i + 1}`);
  const f = combinedQbiSelectionFixture2026(source, 200000);
  const t = await inspect(
    await buildCombinedQbiPdfBytes2026(f, destinations(f), owners),
    2,
  );
  for (
    const name of [
      ...businesses.map((b) => b.business_name!),
      "Synthetic land business",
    ]
  ) assertEquals(t.split(name).length - 1, 1);
  assertStringIncludes(t, "Line 2 includes all 9 businesses");
});
