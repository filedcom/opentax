import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  capitalFixture2026,
  capitalSale2026,
  mixedCapitalFixture2026,
} from "../inputs/capital.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildCapitalPdfBytes2026 } from "./capital-gains.ts";
import type { calculateCapitalGains2026 } from "../nodes/capital-gains.ts";
async function texts(bytes: Uint8Array) {
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
Deno.test("Capital bundle prints Schedule D and category-specific Form 8949 without duplicate direct sales", async () => {
  const r = await buildDraftReturnPdf2026(mixedCapitalFixture2026()),
    doc = await PDFDocument.load(r.bytes);
  assert(!doc.catalog.has(PDFName.of("AcroForm")));
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const d = r.attachments.find((a) => a.form === "schedule_d")!,
    a = r.attachments.find((a) => a.form === "form8949")!;
  assertEquals(d.formPages.length, 2);
  assertEquals(a.formPages.length, 3);
  assertEquals(a.statementPages, []);
  assert(a.formPages[0] > d.formPages[1]);
  const t = await texts(r.bytes);
  assertStringIncludes(t[d.formPages[0] - 1], "6400");
  assertStringIncludes(t[d.formPages[1] - 1], "6301");
  const trades = a.formPages.map((p) => t[p - 1]).join("\n");
  assertStringIncludes(trades, "(500)");
  assertStringIncludes(trades, "(100)");
  assert(!trades.includes("Synthetic Digital Lot J"));
  assert(!trades.includes("Synthetic Shares a"));
  const c = r.calculation.pending.capital_gains.calculation_2026 as ReturnType<
    typeof calculateCapitalGains2026
  >;
  await assertRejects(
    () =>
      buildCapitalPdfBytes2026(
        c.source_input,
        {
          form1040_line7a: 6300,
          form1040_line7b: false,
          form1040_line3a: 0,
          preferential_gain: 6301,
        },
        { name: "Synthetic Investor", ssn: "123456789" },
        "schedule_d",
      ),
    Error,
    "disagree",
  );
});
Deno.test("Form 8949 repeats a category after eleven rows; direct-only sales attach just Schedule D", async () => {
  const f = capitalFixture2026();
  f.capital_gains.claim.sales = Array.from({ length: 12 }, (_, i) => {
    const s = capitalSale2026(String(i));
    if (s.reporting.kind !== "1099-B") throw new Error("fixture");
    s.reporting.box5_noncovered = true;
    s.reporting.box12_basis_reported = false;
    return s;
  });
  const r = await buildDraftReturnPdf2026(f);
  assertEquals(
    r.attachments.find((a) => a.form === "form8949")!.formPages.length,
    2,
  );
  const t = await texts(r.bytes),
    a = r.attachments.find((a) => a.form === "form8949")!;
  assertStringIncludes(t[a.formPages[0] - 1], "11000");
  assertStringIncludes(t[a.formPages[1] - 1], "1000");
  const direct = await buildDraftReturnPdf2026(capitalFixture2026());
  assert(direct.attachments.some((a) => a.form === "schedule_d"));
  assert(!direct.attachments.some((a) => a.form === "form8949"));
});
