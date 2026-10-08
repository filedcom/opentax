import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle, buildMefXml } from "../../../mef/builder.ts";
import { returnDataDocuments } from "../../../mef/execution/return-document-inventory.ts";
import { buildMefSubmissionArchive } from "../../../mef/submissions/submission-archive.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../builder.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

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
          tax_year: 2025,
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

Deno.test("joint taxpayer and spouse 1099-G unemployment copies reconcile to Schedule 1, withholding, MeF, and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      f1099g: [{
        payer_name: "Taxpayer Workforce Agency",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        account_number: "TX-CLAIM-1",
        source_document_reference: "synthetic-taxpayer-1099-G",
        box_1_unemployment: 5_000,
        box_1_repaid: 500,
        box_4_federal_withheld: 300,
      }, {
        payer_name: "Spouse Workforce Agency",
        payer_tin: "987654321",
        recipient_tin: "444556666",
        account_number: "SP-CLAIM-1",
        source_document_reference: "synthetic-spouse-1099-G",
        box_1_unemployment: 2_000,
        box_1_repaid: 100,
        box_4_federal_withheld: 100,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule1?.line7_unemployment, 6_400);
  assertEquals(pending.f1040?.line8_additional_income, 6_400);
  assertEquals(pending.f1040?.line25b_withheld_1099, 400);

  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<UnemploymentCompAmt>6400</UnemploymentCompAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<Form1099WithheldTaxAmt>400</Form1099WithheldTaxAmt>",
  );
  const xsdPath = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsdPath);
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(xmlPath, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsdPath, xmlPath],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally {
      await Deno.remove(xmlPath);
    }
  } catch (error) {
    throw error;
  }
  const filled = await buildPdfBytes(
    bundle.pending,
    base.filer,
    ".pdf-cache",
    bundle,
  );
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, filled);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    const printed = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(printed, "6400");
    assertStringIncludes(printed, "400");
  } finally {
    await Deno.remove(pdfPath);
  }

  const pendingRecord = pending as unknown as Record<string, unknown>;
  const retained1099g = pendingRecord.f1099g as {
    f1099gs: Array<Record<string, unknown>>;
  };
  const wrongOwner = {
    ...pendingRecord,
    f1099g: {
      ...retained1099g,
      f1099gs: retained1099g.f1099gs.map((row, index) =>
        index === 1 ? { ...row, recipient_tin: "999887777" } : row
      ),
    },
  };
  assertThrows(
    () =>
      buildMefXml(wrongOwner as Parameters<typeof buildMefXml>[0], base.filer),
    Error,
    "withholding recipient must match the taxpayer or joint spouse",
  );
  await assertRejects(
    () => buildPdfBytes(wrongOwner, base.filer),
    Error,
    "withholding recipient must match the taxpayer or joint spouse",
  );
});

Deno.test("1099-K personal and 1099-B broker sales retain three sale instances through PDF and submission ZIP", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-k-personal-gain-loss"
  )!;
  const filer = {
    ...fixture.filer,
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" as const },
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
    f1099b: [{
      recipient_ssn: filer.primarySSN.replaceAll("-", ""),
      payer_tin: "987654321",
      account_number: "broker-1",
      source_document_reference: "synthetic-broker-copy-1",
      transaction_id: "broker-sale-1",
      part: "B",
      description: "Broker shares",
      date_acquired: "2025-01-15",
      date_sold: "2025-06-15",
      proceeds: 1_200,
      cost_basis: 1_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line7_capital_gain, 750);
  const sales = pending.schedule_d?.transaction;
  const rows = Array.isArray(sales) ? sales : sales ? [sales] : [];
  assertEquals(rows.length, 3);
  assertEquals(
    new Set(rows.map((row) => row.source_transaction_id)).size,
    3,
  );

  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    bundle.xml,
    "<CapitalGainLossAmt>750</CapitalGainLossAmt>",
  );
  const documents = returnDataDocuments(bundle.xml)!;
  assertEquals(documents[0].tag, "IRS1040");
  assertEquals(
    documents.filter((item) => item.tag === "IRS1040ScheduleD").length,
    1,
  );
  assertEquals(
    documents.filter((item) => item.tag === "IRS8949").length > 0,
    true,
  );
  assertEquals(
    new Set(documents.map((item) => item.id)).size,
    documents.length,
  );
  const pageOrigins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    filer,
    ".pdf-cache",
    bundle,
    pageOrigins,
  );
  assertEquals(
    pageOrigins.length,
    (await PDFDocument.load(pdf)).getPageCount(),
  );
  assertEquals(pageOrigins[0]?.formKey, "f1040");
  assertEquals(pageOrigins.some((page) => page.formKey === "schedule_d"), true);
  assertEquals(pageOrigins.some((page) => page.formKey === "form8949"), true);
  assertEquals(
    pageOrigins.map((page) => page.pageNumber),
    Array.from({ length: pageOrigins.length }, (_, index) => index + 1),
  );

  const archive = await buildMefSubmissionArchive(bundle, {
    filer,
    submissionId: "1234562026276sales01",
    processingDate: new Date("2026-10-03T10:00:00Z"),
    residencyReview: {
      tax_year: 2025,
      taxpayer: {
        tin: filer.primarySSN.replaceAll("-", ""),
        tax_status: "full_year_us_citizen",
        status_source_reference: "reviewed-sale-taxpayer-citizenship",
        reviewer_reference: "reviewer-2026-10-03",
        reviewed_on: "2026-10-03",
      },
    },
  });
  assertEquals(
    new TextDecoder().decode(unzipSync(archive.bytes)["xml/submission.xml"]),
    '<?xml version="1.0" encoding="UTF-8"?>\n' + bundle.xml,
  );
});

Deno.test("two Schedule C businesses retain separate native and printable instances in the submission archive", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-form8995a-two-business-loss-netting"
  )!;
  const filer = {
    ...fixture.filer,
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" as const },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  const documents = returnDataDocuments(bundle.xml)!;
  const scheduleC = documents.filter((item) => item.tag === "IRS1040ScheduleC");
  assertEquals(scheduleC.length, 2);
  assertEquals(new Set(scheduleC.map((item) => item.id)).size, 2);
  assertStringIncludes(bundle.xml, "North Works");
  assertStringIncludes(bundle.xml, "South Shop");

  const pageOrigins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    filer,
    ".pdf-cache",
    bundle,
    pageOrigins,
  );
  assertEquals(
    pageOrigins.length,
    (await PDFDocument.load(pdf)).getPageCount(),
  );
  assertEquals(
    pageOrigins.filter((page) => page.formKey === "schedule_c").map((page) =>
      page.formCopy
    ),
    [1, 1, 2, 2],
  );
  const archive = await buildMefSubmissionArchive(bundle, {
    filer,
    submissionId: "1234562026277twocbus",
    processingDate: new Date("2026-10-04T10:00:00Z"),
    residencyReview: {
      tax_year: 2025,
      taxpayer: {
        tin: filer.primarySSN.replaceAll("-", ""),
        tax_status: "full_year_us_citizen",
        status_source_reference: "reviewed-two-business-citizenship",
        reviewer_reference: "reviewer-2026-10-04",
        reviewed_on: "2026-10-04",
      },
    },
  });
  assertEquals(
    new TextDecoder().decode(unzipSync(archive.bytes)["xml/submission.xml"]),
    '<?xml version="1.0" encoding="UTF-8"?>\n' + bundle.xml,
  );
});
