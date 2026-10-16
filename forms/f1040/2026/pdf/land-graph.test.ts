import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { landGraphFixture2026 } from "../inputs/land-graph.fixture.ts";
import { capitalSale2026 } from "../inputs/capital.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";

async function inspect(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
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
    return new TextDecoder().decode(r.stdout).split("\f");
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 land bundle prints reconciled 4797, Schedule D and one combined 8995", async () => {
  const r = await buildDraftReturnPdf2026(landGraphFixture2026()),
    text = await inspect(r.bytes);
  const page = (form: string) =>
    r.attachments.find((a) => a.form === form)!.formPages[0];
  assertEquals(r.attachments.filter((a) => a.form === "form8995").length, 1);
  assertEquals(
    r.attachments.find((a) => a.form === "form4797")!.formPages.length,
    1,
  );
  assert(page("schedule_d") < page("form4797"));
  assert(page("form4797") < page("form8995"));
  assertStringIncludes(text[page("form4797") - 1], "40000");
  assertStringIncludes(text[page("form4797") - 1], "5000");
  assertStringIncludes(text[page("schedule_d") - 1], "40000");
  for (
    const value of ["9293", "5000", "14293", "2859", "Synthetic land business"]
  ) {
    assertStringIncludes(text[page("form8995") - 1], value);
  }
});
Deno.test("2026 land loss bundle prints original losses and allowed QBI in their respective forms", async () => {
  const r = await buildDraftReturnPdf2026(
      landGraphFixture2026(-400000, [-200000], 400000),
    ),
    text = await inspect(r.bytes);
  const page = (form: string) =>
    r.attachments.find((a) => a.form === form)!.formPages[0];
  assertStringIncludes(text[page("form4797") - 1], "(400000)");
  assertStringIncludes(text[page("form461") - 1], "(344000)");
  assertStringIncludes(text[page("form8995") - 1], "(170667)");
  assertStringIncludes(text[page("form8995") - 1], "(85333)");
  assertStringIncludes(text[page("form8995") - 1], "(256000)");
  assert(
    page("form4797") < page("form8995") && page("form8995") < page("form461"),
  );
  assertEquals(r.attachments.some((a) => a.form === "schedule_d"), false);
});
Deno.test("2026 land-only bundle includes 8995 and NIIT without Schedule C or SE", async () => {
  const f = landGraphFixture2026(45000, [], 155000);
  f.capital_gains.claim.sales = [capitalSale2026("investment")];
  const r = await buildDraftReturnPdf2026(f);
  const text = await inspect(r.bytes),
    qbi = r.attachments.find((a) => a.form === "form8995")!;
  assertEquals(
    r.attachments.some((a) => ["schedule_c", "schedule_se"].includes(a.form)),
    false,
  );
  assertStringIncludes(text[qbi.formPages[0] - 1], "Synthetic land business");
  assertStringIncludes(text[qbi.formPages[0] - 1], "1000");
  const niit = r.attachments.find((a) => a.form === "form8960")!;
  assertStringIncludes(text[niit.formPages[0] - 1], "45200");
  assertStringIncludes(text[niit.formPages[0] - 1], "-45000");
  assertEquals(r.calculation.pending.schedule2.line6_niit, 8);
});
