import { assert, assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildCombinedForm5329PdfBytes2026 } from "./form5329.ts";
import { ableGraph2026 } from "../inputs/able-graph.fixture.ts";
import { earlyRetirementSource2026 } from "../inputs/retirement-early.fixture.ts";
import type { calculateForm5329Sources2026 } from "../inputs/form5329-source.ts";
async function text(bytes: Uint8Array, page: number, rect: number[]) {
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const [x, y, w, h] = rect;
    const r = await new Deno.Command("pdftotext", {
      args: [
        "-layout",
        "-f",
        String(page),
        "-l",
        String(page),
        "-x",
        String(x),
        "-y",
        String(y),
        "-W",
        String(w),
        "-H",
        String(h),
        path,
        "-",
      ],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).trim();
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 ABLE bundle prints one combined owner Form 5329 with matching income and additional tax", async () => {
  const g = ableGraph2026(true), rs = earlyRetirementSource2026(false, 1000);
  rs.claim.copies[0].recipient_tin = g.general.taxpayer_ssn;
  g.form8880.claim.retirement_inventory_reference = rs.claim.record_reference;
  const b = await buildDraftReturnPdf2026({
    ...g,
    f1099r: { claim: rs.claim },
  });
  assertEquals(
    b.attachments.filter((a) => a.form.startsWith("form5329")).length,
    1,
  );
  const r = b.calculation.pending.form5329.calculation_2026 as ReturnType<
    typeof calculateForm5329Sources2026
  >;
  const f = { name: "Synthetic ABLE Owner", ssn: g.general.taxpayer_ssn };
  const standalone = await buildCombinedForm5329PdfBytes2026(
    r.source_input,
    "taxpayer",
    120,
    f,
  );
  const doc = await PDFDocument.load(standalone);
  assertEquals(doc.getPageCount(), 3);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  // The pinned draft's right-hand amount column, independently read after flattening.
  assertEquals(await text(standalone, 1, [503, 252, 74, 12]), "1000");
  assertEquals(await text(standalone, 1, [503, 300, 74, 12]), "100");
  assertEquals(await text(standalone, 1, [503, 372, 74, 12]), "200");
  assertEquals(await text(standalone, 1, [503, 384, 74, 12]), "0");
  assertEquals(await text(standalone, 1, [503, 396, 74, 12]), "200");
  assertEquals(await text(standalone, 1, [503, 408, 74, 12]), "20");
  const s1 = b.attachments.find((a) => a.form === "schedule1")!;
  assert(s1);
  assertEquals(await text(b.bytes, s1.formPages[0], [410, 498, 72, 12]), "200");
  assertEquals(
    b.calculation.pending.schedule1.line8q_able_taxable_earnings,
    200,
  );
  assertEquals(b.calculation.pending.schedule2.line5_form5329_early_tax, 120);
  await assertRejects(
    () => buildCombinedForm5329PdfBytes2026(r.source_input, "taxpayer", 121, f),
    Error,
    "matching Schedule 2",
  );
  await assertRejects(
    () =>
      buildCombinedForm5329PdfBytes2026(r.source_input, "taxpayer", 120, {
        ...f,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
});
Deno.test("2026 tax-free ABLE withdrawal reduces saver credit without a Form 5329 attachment", async () => {
  const g = ableGraph2026(true);
  g.able_accounts.claim.accounts[0].current_year_distributions!
    .qualified_expenses[0].amount = 2000;
  const b = await buildDraftReturnPdf2026(g);
  assertEquals(b.attachments.some((a) => a.form.startsWith("form5329")), false);
  assertEquals(b.attachments.some((a) => a.form === "form8880"), false);
  assertEquals(b.calculation.pending.f1040.line11b_agi, 24000);
});
