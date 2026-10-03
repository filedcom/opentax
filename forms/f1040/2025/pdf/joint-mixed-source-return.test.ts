import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle, buildMefXml } from "../mef/builder.ts";
import { returnDataDocuments } from "../mef/return-document-inventory.ts";
import { buildMefSubmissionArchive } from "../mef/submission-archive.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "joint-two-w2s"
)!;

Deno.test("joint mixed sources reconcile through Form 1040, Schedule B, MeF, and filled PDF", async () => {
  const filer = {
    ...base.filer,
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" as const },
  };
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
      f1040es: {
        payment_q1: 1_000,
        quarter_payment_records: [{
          quarter: "q1",
          amount: 1_000,
          payer_tin: "444556666",
          payment_date: "2025-04-15",
          payment_record_reference: "Synthetic 2025 spouse Q1 payment",
        }],
      },
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
    filer,
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

  const pdf = await buildPdfBytes(pending, filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 3);

  const documents = returnDataDocuments(bundle.xml)!;
  assertEquals(documents[0].tag, "IRS1040");
  assertEquals(documents.filter((item) => item.tag === "IRSW2").length, 2);
  assertEquals(
    documents.filter((item) => item.tag === "IRS1040ScheduleB").length,
    1,
  );
  assertEquals(
    new Set(documents.map((item) => item.id)).size,
    documents.length,
  );
  const archive = await buildMefSubmissionArchive(bundle, {
    filer,
    submissionId: "1234562026276abcdefg",
    processingDate: new Date("2026-10-03T10:00:00Z"),
    residencyReview: {
      tax_year: 2025,
      taxpayer: {
        tin: filer.primarySSN.replaceAll("-", ""),
        tax_status: "full_year_us_citizen",
        status_source_reference: "reviewed-taxpayer-citizenship",
        reviewer_reference: "reviewer-2026-10-03",
        reviewed_on: "2026-10-03",
      },
      spouse: {
        tin: filer.spouse!.ssn.replaceAll("-", ""),
        tax_status: "full_year_us_citizen",
        status_source_reference: "reviewed-spouse-citizenship",
        reviewer_reference: "reviewer-2026-10-03",
        reviewed_on: "2026-10-03",
      },
    },
  });
  assertEquals(
    new TextDecoder().decode(unzipSync(archive.bytes)["xml/submission.xml"]),
    '<?xml version="1.0" encoding="UTF-8"?>\n' + bundle.xml,
  );

  const changedInterest = buildPending({
    ...result.pending,
    f1040: { ...filed, line2b_taxable_interest: 1_701 },
  });
  assertThrows(
    () => buildMefXml(changedInterest, filer),
    Error,
    "line 2b",
  );
  await assertRejects(
    () => buildPdfBytes(changedInterest, filer),
    Error,
    "line 2b",
  );
});
