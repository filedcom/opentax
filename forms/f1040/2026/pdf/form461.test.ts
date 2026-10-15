import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { businessLossFixture2026 } from "../inputs/business-loss.fixture.ts";
import { buildForm461PdfBytes2026 } from "./form461.ts";
const filer = { name: "Synthetic Business Owner", ssn: "123456789" };
const destinations = {
  schedule1_line3: -350000,
  form1040_line7a: 0,
  schedule1_line4: 0,
  schedule1_line15: 0,
  schedule1_line8p: 94000,
  excess_loss_origin_2026: 94000,
};
Deno.test("2026 Form 461 prints signed losses on one static draft page", async () => {
  const bytes = await buildForm461PdfBytes2026(
    businessLossFixture2026(),
    destinations,
    filer,
  );
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 1);
  assertEquals(pdf.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(pdf.getPage(0).node.has(PDFName.of("Annots")), false);
});
Deno.test("2026 Form 461 reconciles every destination and filer before printing", async () => {
  for (
    const key of Object.keys(destinations) as (keyof typeof destinations)[]
  ) {
    await assertRejects(
      () =>
        buildForm461PdfBytes2026(businessLossFixture2026(), {
          ...destinations,
          [key]: destinations[key] + 1,
        }, filer),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildForm461PdfBytes2026(businessLossFixture2026(), destinations, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
});
Deno.test("2026 Form 461 prints a required filing with no addback but rejects an unnecessary form", async () => {
  const d = {
    ...destinations,
    schedule1_line3: -128001,
    schedule1_line8p: 0,
    excess_loss_origin_2026: 0,
  };
  const bytes = await buildForm461PdfBytes2026(
    businessLossFixture2026([-128001]),
    d,
    filer,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 1);
  await assertRejects(
    () =>
      buildForm461PdfBytes2026(businessLossFixture2026([-128000]), {
        ...d,
        schedule1_line3: -128000,
      }, filer),
    Error,
    "do not require",
  );
});
