import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { amtFixture2026 } from "../nodes/form6251.fixture.ts";
import { buildForm6251PdfBytes2026 } from "./form6251.ts";

const filer = { name: "Ada Q Rivera", ssn: "111223333" };
const destinations = {
  form1040_line11b: 150000,
  form1040_line12e: 16100,
  form1040_line14: 16100,
  form1040_line15: 133900,
  form1040_line16: 24734,
  schedule1a_line43: 0,
  schedule2_line2: 16840,
};
Deno.test("2026 Form 6251 verifies ISO/return amounts and prints two static draft pages", async () => {
  for (const preferences of [false, true]) {
    const raw = {
      ...amtFixture2026,
      ...(preferences
        ? { qualified_dividends: 20000, regular_tax: 22934 }
        : {}),
    };
    const d = {
      ...destinations,
      ...(preferences
        ? { form1040_line16: 22934, schedule2_line2: 16440 }
        : {}),
    };
    const bytes = await buildForm6251PdfBytes2026(raw, d, filer);
    const pdf = await PDFDocument.load(bytes);
    assertEquals(pdf.getPageCount(), 2);
    assertEquals(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
    for (const page of pdf.getPages()) {
      assertEquals(page.node.has(PDFName.of("Annots")), false);
    }
  }
});
Deno.test("2026 Form 6251 refuses stale return/AMT destinations and unrelated filer identity", async () => {
  for (const field of Object.keys(destinations)) {
    await assertRejects(
      () =>
        buildForm6251PdfBytes2026(amtFixture2026, {
          ...destinations,
          [field]: destinations[field as keyof typeof destinations] + 1,
        }, filer),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildForm6251PdfBytes2026(amtFixture2026, destinations, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
  await assertRejects(
    () =>
      buildForm6251PdfBytes2026(
        { ...amtFixture2026, iso_sources_2026: undefined },
        { ...destinations, schedule2_line2: 0 },
        filer,
      ),
    Error,
    "does not require",
  );
});
Deno.test("2026 Form 6251 prints senior addback and itemized tax basis using separately reconciled lines", async () => {
  const raw = {
    ...amtFixture2026,
    taking_standard_deduction: false,
    line1a_deductions_without_senior: 30000,
    regular_tax_income: 120000,
    regular_taxable_income: 114000,
    regular_tax: 19958,
    line2a_taxes_paid: 20000,
  };
  // 150000 - (36000 - 6000) + 20000 + 100000 = 240000 AMTI;
  // (240000 - 90100) * 26% = 38974; minus regular tax 19958 = 19016.
  const d = {
    ...destinations,
    form1040_line12e: 30000,
    form1040_line14: 36000,
    form1040_line15: 114000,
    form1040_line16: 19958,
    schedule1a_line43: 6000,
    schedule_a_line7: 20000,
    schedule2_line2: 19016,
  };
  const bytes = await buildForm6251PdfBytes2026(raw, d, filer);
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
  await assertRejects(
    () =>
      buildForm6251PdfBytes2026(
        raw,
        { ...d, schedule_a_line7: undefined },
        filer,
      ),
    Error,
    "destinations disagree",
  );
});

Deno.test("2026 Form 6251 recomputes PAB sources and verifies exempt/preferential return lines", async () => {
  const { syntheticInvestmentClaim2026, syntheticPabReview2026 } = await import(
    "../inputs/investment.fixture.ts"
  );
  const claim = syntheticInvestmentClaim2026();
  claim.f1099divs = [];
  Object.assign(claim.f1099ints[0], {
    recipient_tin: "111223333",
    box1: 0,
    box8: 100000,
    box9: 100000,
    pab_review: syntheticPabReview2026(),
  });
  const raw = {
    ...amtFixture2026,
    iso_sources_2026: undefined,
    investment_sources_2026: claim,
  };
  const d = {
    ...destinations,
    form1040_line2a: 100000,
    form1040_line3a: 0,
    form1040_line7a: 0,
  };
  const bytes = await buildForm6251PdfBytes2026(raw, d, filer);
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
  await assertRejects(
    () =>
      buildForm6251PdfBytes2026(raw, { ...d, form1040_line2a: 99999 }, filer),
    Error,
    "destinations disagree",
  );
});
