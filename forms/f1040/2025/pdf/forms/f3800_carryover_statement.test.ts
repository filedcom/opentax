import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import type { Form3800CarryoverVintage } from "../../../nodes/inputs/f3800/carryover-ledger.ts";
import { appendForm3800CarryoverStatement } from "./f3800_carryover_statement.ts";

const vintage: Form3800CarryoverVintage = {
  source_key: "2022-new-markets-1",
  credit_type: "New markets credit",
  form3800_credit_line: "1i",
  originating_tax_year: 2022,
  originating_tax_year_end_date: "2022-12-31",
  source_document_reference: "2022 Form 8874 QEI 1",
  originating_return_reference: "2022 filed return",
  permitted_carryback_years: 1,
  credit_generated_as_filed: 5_000,
  credit_allowed_origin_year: 2_000,
  historical_uses: [{
    tax_year: 2023,
    tax_year_end_date: "2023-12-31",
    credit_allowed: 1_000,
    return_reference: "2023 filed return",
    kind: "carryforward",
  }],
  prior_adjustments: [],
  balance_carried_to_2025: 2_000,
  original_reported_balance_carried_to_2025: 2_000,
};

Deno.test("Form 3800 carryover statement renders complete vintages over multiple pages", async () => {
  const document = await PDFDocument.create();
  await appendForm3800CarryoverStatement(
    document,
    Array.from({ length: 9 }, (_, index) => ({
      ...vintage,
      source_key: `2022-new-markets-${index + 1}`,
    })),
    pdfReviewFixtures[0].filer,
  );
  assertEquals(document.getPageCount() > 1, true);
  assertEquals((await document.save()).length > 0, true);
});

Deno.test("Form 3800 carryover statement rejects missing filer and unproved revised research details", async () => {
  const document = await PDFDocument.create();
  await assertRejects(
    () => appendForm3800CarryoverStatement(document, [vintage], undefined),
    Error,
    "needs filer identity",
  );
  await assertRejects(
    () =>
      appendForm3800CarryoverStatement(document, [{
        ...vintage,
        credit_type: "Research credit",
        form3800_credit_line: "1c",
        original_reported_balance_carried_to_2025: 3_000,
      }], pdfReviewFixtures[0].filer),
    Error,
    "additional Form 6765 statement",
  );
});
