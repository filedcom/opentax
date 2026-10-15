import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { niitFixture2026 } from "../nodes/form8960.fixture.ts";
import { buildForm8960PdfBytes2026 } from "./form8960.ts";
const filer = { name: "Synthetic Investor", ssn: "123456789" };
const destinations = {
  form1040_line2b: 30000,
  form1040_line3b: 20000,
  form1040_line7a: 5000,
  form1040_line11b: 300000,
  form1040_line12e: 50400,
  schedule1_line18: 1000,
  schedule_a_line5d: 50000,
  schedule_a_line7: 40400,
  schedule2_line6: 1883,
};
Deno.test("2026 Form 8960 prints a static draft and removes its IRS cover", async () => {
  const bytes = await buildForm8960PdfBytes2026(
    niitFixture2026(),
    destinations,
    filer,
  );
  const pdf = await PDFDocument.load(bytes);
  assertEquals(pdf.getPageCount(), 1);
  assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
  assertEquals(pdf.getPages()[0].node.has(PDFName.of("Annots")), false);
});
Deno.test("2026 Form 8960 checks every receiving amount and filer identity", async () => {
  for (
    const key of Object.keys(destinations) as (keyof typeof destinations)[]
  ) {
    await assertRejects(
      () =>
        buildForm8960PdfBytes2026(niitFixture2026(), {
          ...destinations,
          [key]: destinations[key] + 1,
        }, filer),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildForm8960PdfBytes2026(niitFixture2026(), destinations, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
  await assertRejects(
    () =>
      buildForm8960PdfBytes2026({ ...niitFixture2026(), magi: 200000 }, {
        ...destinations,
        form1040_line11b: 200000,
        schedule2_line6: 0,
      }, filer),
    Error,
    "does not require",
  );
});
Deno.test("2026 Form 8960 renders an above-threshold return even with zero investment income", async () => {
  const raw = {
    ...niitFixture2026(),
    investment_sources_2026: undefined,
    taxable_interest_from_agi: 0,
    ordinary_dividends_from_agi: 0,
    capital_gain_from_agi: 0,
    early_withdrawal_penalty_from_agi: 0,
  };
  const bytes = await buildForm8960PdfBytes2026(raw, {
    ...destinations,
    form1040_line2b: 0,
    form1040_line3b: 0,
    form1040_line7a: 0,
    schedule1_line18: 0,
    schedule2_line6: 0,
  }, filer);
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 1);
});
