import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle, buildMefXml } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "joint-two-w2s"
)!;

Deno.test("joint mixed sources reconcile through Form 1040, Schedule B, MeF, and filled PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      f1099int: [{
        payer_name: "Taxpayer Bank",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        source_document_reference: "synthetic-taxpayer-int",
        box1: 800,
      }, {
        payer_name: "Spouse Bank",
        payer_tin: "987654321",
        recipient_tin: "444556666",
        source_document_reference: "synthetic-spouse-int",
        box1: 900,
      }],
      f1099div: [{
        payerName: "Taxpayer Fund",
        payerTin: "123456789",
        recipient_tin: "111223333",
        source_document_reference: "synthetic-taxpayer-div",
        isNominee: false,
        box11: false,
        box1a: 600,
        box1b: 200,
      }, {
        payerName: "Spouse Fund",
        payerTin: "987654321",
        recipient_tin: "444556666",
        source_document_reference: "synthetic-spouse-div",
        isNominee: false,
        box11: false,
        box1a: 700,
        box1b: 300,
      }],
      f1040es: { payment_q1: 1_000 },
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filed = pending.f1040!;
  assertEquals(filed.line1a_wages, 127_000);
  assertEquals(filed.line2b_taxable_interest, 1_700);
  assertEquals(filed.line3b_ordinary_dividends, 1_300);
  assertEquals(filed.line3a_qualified_dividends, 500);
  assertEquals(filed.line9_total_income, 130_000);
  assertEquals(filed.line25a_w2_withheld, 13_000);
  assertEquals(filed.line26_estimated_tax, 1_000);
  assertEquals(filed.line33_total_payments, 14_000);
  assertEquals(filed.line34_overpayment, 2_531);
  assertEquals(pending.schedule_b?.print_line4_total, 1_700);
  assertEquals(pending.schedule_b?.print_line6_total, 1_300);

  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  for (
    const tag of [
      "<WagesSalariesAndTipsAmt>127000</WagesSalariesAndTipsAmt>",
      "<TaxableInterestAmt>1700</TaxableInterestAmt>",
      "<OrdinaryDividendsAmt>1300</OrdinaryDividendsAmt>",
      "<QualifiedDividendsAmt>500</QualifiedDividendsAmt>",
      "<EstimatedTaxPaymentsAmt>1000</EstimatedTaxPaymentsAmt>",
      "<TotalPaymentsAmt>14000</TotalPaymentsAmt>",
      "<OverpaidAmt>2531</OverpaidAmt>",
      "<IRS1040ScheduleB ",
    ]
  ) assertStringIncludes(bundle.xml, tag);

  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 3);

  const changedInterest = buildPending({
    ...result.pending,
    f1040: { ...filed, line2b_taxable_interest: 1_701 },
  });
  assertThrows(
    () => buildMefXml(changedInterest, base.filer),
    Error,
    "line 2b",
  );
  await assertRejects(
    () => buildPdfBytes(changedInterest, base.filer),
    Error,
    "line 2b",
  );
});
