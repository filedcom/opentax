import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildForm4797PdfBytes2026 } from "./form4797.ts";
import { landDispositionFixture2026 } from "../inputs/land-disposition.fixture.ts";
import { landPdfOverflowFixture2026 } from "./form4797.fixture.ts";
import { calculateLandDispositions2026 } from "../inputs/land-disposition-source.ts";
const filer = { name: "Synthetic Land Seller", ssn: "123456789" };
const destinations = {
  schedule_d_line11: 40000,
  schedule1_line4: 5000,
  section1231_loss_taken_into_account: 0,
};
async function text(bytes: Uint8Array) {
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
Deno.test("2026 Form 4797 prints a source-reconciled static land page and omits unused recapture parts", async () => {
  const bytes = await buildForm4797PdfBytes2026(
      landDispositionFixture2026(),
      destinations,
      filer,
    ),
    pdf = await PDFDocument.load(bytes),
    t = (await text(bytes))[0];
  assertEquals(pdf.getPageCount(), 1);
  assert(!pdf.catalog.has(PDFName.of("AcroForm")));
  assert(!pdf.getPage(0).node.has(PDFName.of("Annots")));
  for (
    const s of [
      "Synthetic Land Seller",
      "Synthetic farmland",
      "06/01/2015",
      "06/02/2026",
      "45000",
      "40000",
      "5000",
      "DRAFT - NOT FOR FILING",
    ]
  ) assertStringIncludes(t, s);
  assert(!t.includes("Part III"));
});
Deno.test("2026 Form 4797 follows the no-lookback and all-recaptured gain branches", async () => {
  const f = landDispositionFixture2026();
  f.claim.prior_history.opening_period_losses = [];
  for (const year of f.claim.prior_history.filed_years) {
    year.filed_line7_net_gain_loss = 0;
    year.section1231_loss_taken_into_account = 0;
    delete year.filed_line8_nonrecaptured_loss;
    delete year.filed_line12_recaptured_gain;
  }
  const t = (await text(
    await buildForm4797PdfBytes2026(f, {
      ...destinations,
      schedule_d_line11: 45000,
      schedule1_line4: 0,
    }, filer),
  ))[0];
  assertEquals((t.match(/45000/g) ?? []).length, 2); // property gain and line 8; line 10 is skipped.
  const g = landDispositionFixture2026();
  g.claim.sales[0].closing.gross_sales_price = 59000;
  const recap = (await text(
    await buildForm4797PdfBytes2026(g, {
      ...destinations,
      schedule_d_line11: 0,
      schedule1_line4: 4000,
    }, filer),
  ))[0];
  assertEquals((recap.match(/4000/g) ?? []).length, 5);
  assertStringIncludes(recap, "5000");
});
Deno.test("2026 Form 4797 prints the disposition loss while retaining a separately finalized deductible vintage", async () => {
  const f = landDispositionFixture2026();
  f.claim.sales[0].closing.gross_sales_price = 50000;
  const d = {
    schedule_d_line11: 0,
    schedule1_line4: -5000,
    section1231_loss_taken_into_account: 2000,
  };
  const finalized = {
    amount_taken_into_account: 2000,
    finalized_limitation_workpaper_reference: "synthetic-loss-owner",
  };
  const t =
    (await text(await buildForm4797PdfBytes2026(f, d, filer, finalized)))[0];
  assertStringIncludes(t, "(5000)");
  assert(!t.includes("2000"));
  await assertRejects(
    () => buildForm4797PdfBytes2026(f, d, filer),
    Error,
    "current loss needs",
  );
  await assertRejects(
    () =>
      buildForm4797PdfBytes2026(
        f,
        { ...d, section1231_loss_taken_into_account: 2001 },
        filer,
        finalized,
      ),
    Error,
    "destinations disagree",
  );
});
Deno.test("2026 Form 4797 continuation preserves every long and short property once", async () => {
  const f = landPdfOverflowFixture2026(), r = calculateLandDispositions2026(f);
  const bytes = await buildForm4797PdfBytes2026(f, {
    schedule_d_line11: r.line10_long_term_gain,
    schedule1_line4: r.line20b_schedule1_gain_loss,
    section1231_loss_taken_into_account: 0,
  }, filer);
  const pages = await text(bytes),
    t = pages.slice(1).join("\n"),
    pdf = await PDFDocument.load(bytes);
  assert(pdf.getPageCount() >= 3);
  assert(pdf.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  assert(!pdf.catalog.has(PDFName.of("AcroForm")));
  for (const s of f.claim.sales) {
    assertEquals(t.split(s.sale_reference).length - 1, 1);
  }
  assertStringIncludes(t, "Part I, line 2");
  assertStringIncludes(t, "Part II, line 11");
  assertStringIncludes(t, "Basis + costs");
  assertStringIncludes(t, "Total carried to form");
});
Deno.test("2026 Form 4797 rejects every stale receiving amount and mismatched identity", async () => {
  for (
    const key of Object.keys(destinations) as (keyof typeof destinations)[]
  ) {
    await assertRejects(
      () =>
        buildForm4797PdfBytes2026(landDispositionFixture2026(), {
          ...destinations,
          [key]: destinations[key] + 1,
        }, filer),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildForm4797PdfBytes2026(landDispositionFixture2026(), destinations, {
        ...filer,
        ssn: "987654321",
      }),
    Error,
    "identity",
  );
});
Deno.test("2026 Form 4797 paginates one long property description without repeating amounts", async () => {
  const f = landDispositionFixture2026();
  f.claim.sales[0].description = "BEGINPROPERTY " +
    "Reviewed boundary detail ".repeat(300) + " ENDPROPERTY";
  const bytes = await buildForm4797PdfBytes2026(f, destinations, filer),
    pages = await text(bytes),
    t = pages.join("\n");
  assert(pages.length > 4);
  assertStringIncludes(t, "BEGINPROPERTY");
  assertStringIncludes(t, "ENDPROPERTY");
  assertEquals(t.split("sale-1").length - 1, 1);
  // Official summary, one detail row and statement total, never every split page.
  assertEquals((t.match(/100000/g) ?? []).length, 3);
});
