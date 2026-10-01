import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { normalizeAllPending } from "../pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { form4797Pdf } from "./forms/f4797.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const sale = {
  property_id: "investment-1245-full-recapture",
  property_description: "Investment equipment",
  acquired_on: "2022-05-01",
  sold_on: "2025-06-01",
  gross_sales_price: 10_000,
  cost_or_other_basis_plus_sale_expense: 12_000,
  depreciation_allowed_or_allowable: 5_000,
  property_held_for_investment_not_business: true,
  section_1245_classification_reviewed: true,
  direct_cash_sale_no_special_recapture_exception: true,
  sale_document_reference: "SALE-2025-FULL",
  basis_document_reference: "BASIS-2022-FULL",
  depreciation_schedule_reference: "DEPR-2025-FULL",
};

Deno.test("one fully recaptured investment asset reaches Form 4797, Schedule 1, Form 1040, native and PDF without Form 8949", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      form4797_investment_1245: {
        investment_1245_dispositions: [sale],
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line4_other_gains, 3_000);
  assertEquals(result.pending.schedule1.line10_total_additional_income, 3_000);
  assertEquals(result.pending.f1040.line8_additional_income, 3_000);
  assertEquals(result.pending.f1040.line9_total_income, 78_000);
  assertEquals(result.pending.f1040.line11_agi, 78_000);
  assertEquals(result.pending.f1040.line7_capital_gain ?? 0, 0);
  const pending = buildPending(result.pending);
  const form4797 = pending.form4797;
  assert(form4797);
  assertEquals(pending.form8949, undefined);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<Section1245PropertyAmt>3000</Section1245PropertyAmt>",
  );
  assertStringIncludes(bundle.xml, "<OtherGainLossAmt>3000</OtherGainLossAmt>");
  assertStringIncludes(bundle.xml, "<NetGainAmt>0</NetGainAmt>");
  assertEquals(bundle.xml.includes("<IRS8949>"), false);
  const projected =
    form4797Pdf.projectFields?.(form4797, normalizeAllPending(pending)) ??
      {};
  assertEquals(
    (projected as Record<string, unknown>).pdf_investment_1_line25b,
    3_000,
  );
  assertEquals((projected as Record<string, unknown>).pdf_investment_line32, 0);
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const source = form4797.investment_1245_dispositions?.[0];
  assert(source);
  for (
    const changed of [
      { ...source, gross_sales_price: 10_001 },
      { ...source, depreciation_allowed_or_allowable: 4_999 },
    ]
  ) {
    const drift = buildPending({
      ...pending,
      form4797: { investment_1245_dispositions: [changed] },
    });
    await assertRejects(
      () => buildMefBundle(drift, { filer: base.filer, attachments: [] }),
      Error,
    );
    await assertRejects(
      () => buildPdfBytes(drift, base.filer, ".pdf-cache", bundle),
      Error,
    );
  }
  for (
    const drift of [
      {
        ...pending,
        schedule1: {
          ...pending.schedule1,
          line10_total_additional_income: 2_999,
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line8_additional_income: 2_999 },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line11_agi: 77_999 },
      },
    ]
  ) {
    await assertRejects(
      () => buildMefBundle(drift, { filer: base.filer, attachments: [] }),
      Error,
    );
    await assertRejects(
      () => buildPdfBytes(drift, base.filer, ".pdf-cache", bundle),
      Error,
    );
  }
});
