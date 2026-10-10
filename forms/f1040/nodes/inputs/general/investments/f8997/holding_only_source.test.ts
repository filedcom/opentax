import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../../2025/index.ts";
import { buildPending } from "../../../../../2025/mef/execution/pending.ts";
import { buildMefXml } from "../../../../../2025/mef/builder.ts";
import { buildPdfBytes } from "../../../../../2025/pdf/builder.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { inputSchema } from "./ledger.ts";
import { PDFDocument } from "pdf-lib";
import { sha256Hex } from "../../../../../2025/return-processing/prepared-source.ts";
import { reviewForm8997HoldingOnlySource } from "./holding_only_source.ts";

async function reviewedPdf(
  pageCount: number,
  label: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index++) {
    pdf.addPage([200, 200]).drawText(`${label} ${index + 1}`);
  }
  return pdf.save();
}

const priorBytes = await reviewedPdf(2, "2024 Form 8997");
const issuerBytes = await reviewedPdf(1, "2025 QOF issuer statement");
const input = {
  tax_year: 2025,
  complete_annual_ledger_confirmed: true,
  reviewed_annual_workpaper_reference: "2025-lot-review",
  prior_year: {
    kind: "continuing",
    filed_form8997_reference: "2024-filed-8997",
    closing_lots: [{
      lot_id: "lot-2021",
      qof_ein: "123456789",
      acquired_date: "2021-04-15",
      short_term: 0,
      long_term: 50_000,
    }],
  },
  investment_lots: [{
    lot_id: "lot-2021",
    qof_ein: "123456789",
    acquired_date: "2021-04-15",
    description: "Five percent QOF interest",
    qof_source_document_reference: "issuer-2025-lot-statement",
    reviewed_workpaper_reference: "2025-lot-review",
    opening_deferred_gain: { short_term: 0, long_term: 50_000 },
    events: [],
    closing_deferred_gain: { short_term: 0, long_term: 50_000 },
  }],
  uninvested_deferred_gain_at_year_end: { short_term: 0, long_term: 0 },
  foreign_eligible_taxpayer: false,
  treaty_benefits_waived: false,
  no_form1099b_for_disposition: false,
} as const;

Deno.test("Form 8997 staged holding-only review binds one lot to distinct prior and issuer files", async () => {
  const review = {
    prior_form8997_pdf: {
      source_document_reference: "2024-filed-8997",
      file_name: "2024-form8997.pdf",
      sha256: await sha256Hex(priorBytes),
      reviewed_by: "Reviewer A",
      reviewed_on: "2026-09-30",
    },
    qof_issuer_statement_pdf: {
      source_document_reference: "issuer-2025-lot-statement",
      file_name: "2025-qof-issuer.pdf",
      sha256: await sha256Hex(issuerBytes),
      reviewed_by: "Reviewer A",
      reviewed_on: "2026-09-30",
    },
    filed_2024_form8997_reference: "2024-filed-8997",
    reviewed_2025_workpaper_reference: "2025-lot-review",
    lot_id: "lot-2021",
    qof_ein: "123456789",
    acquired_date: "2021-04-15",
    description: "Five percent QOF interest",
    short_term_deferred_gain: 0,
    long_term_deferred_gain: 50_000,
    prior_form_lot_fields_match_pdf_reviewed: true,
    issuer_identity_and_holding_match_pdf_reviewed: true,
    issuer_qof_status_for_2025_reviewed: true,
  } as const;
  const statement = await reviewForm8997HoldingOnlySource(
    input,
    review,
    priorBytes,
    issuerBytes,
  );
  assertEquals(statement.part_i.totals.long_term, 50_000);
  assertEquals(statement.part_iv.totals.long_term, 50_000);
  for (
    const altered of [
      { ...review, qof_ein: "987654321" },
      { ...review, long_term_deferred_gain: 49_999 },
      { ...review, lot_id: "other-lot" },
      { ...review, issuer_qof_status_for_2025_reviewed: false },
      {
        ...review,
        qof_issuer_statement_pdf: {
          ...review.qof_issuer_statement_pdf,
          source_document_reference:
            review.prior_form8997_pdf.source_document_reference,
        },
      },
    ]
  ) {
    await assertRejects(() =>
      reviewForm8997HoldingOnlySource(input, altered, priorBytes, issuerBytes)
    );
  }
  await assertRejects(() =>
    reviewForm8997HoldingOnlySource(
      input,
      review,
      priorBytes,
      new TextEncoder().encode("%PDF-1.7 altered issuer statement"),
    )
  );
  await assertRejects(() =>
    reviewForm8997HoldingOnlySource(
      input,
      review,
      issuerBytes,
      issuerBytes,
    )
  );
  const fakePdf = new TextEncoder().encode("%PDF-1.7 header only");
  const fakeDigest = await sha256Hex(fakePdf);
  await assertRejects(() =>
    reviewForm8997HoldingOnlySource(
      input,
      {
        ...review,
        prior_form8997_pdf: {
          ...review.prior_form8997_pdf,
          sha256: fakeDigest,
        },
      },
      fakePdf,
      issuerBytes,
    )
  );
  const onePagePrior = await reviewedPdf(1, "incomplete 2024 Form 8997");
  const onePageDigest = await sha256Hex(onePagePrior);
  await assertRejects(() =>
    reviewForm8997HoldingOnlySource(
      input,
      {
        ...review,
        prior_form8997_pdf: {
          ...review.prior_form8997_pdf,
          sha256: onePageDigest,
        },
      },
      onePagePrior,
      issuerBytes,
    )
  );
  await assertRejects(() =>
    reviewForm8997HoldingOnlySource(
      {
        ...input,
        investment_lots: [{
          ...input.investment_lots[0],
          events: [{ event_id: "unreviewed-2025-event" }],
        }],
      },
      review,
      priorBytes,
      issuerBytes,
    )
  );
});

Deno.test("Form 8997 holdings preserve the complete reporting return but cannot bypass annual attachments", async () => {
  const general = {
    filing_status: "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111223333",
    taxpayer_dob: "1985-06-15",
    digital_assets: false,
    address_line1: "1 Main St",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  };
  const wages = [{
    employee_ssn: "111223333",
    employer_name: "Example Employer",
    employer_ein: "123456789",
    box1_wages: 75000,
    box2_fed_withheld: 11000,
    box3_ss_wages: 75000,
    box4_ss_withheld: 4650,
    box5_medicare_wages: 75000,
    box6_medicare_withheld: 1087.5,
  }];
  const filer = {
    primarySSN: "111223333",
    firstName: "Alex",
    firstNameWithInitial: "Alex",
    lastName: "Example",
    nameLine1: "ALEX EXAMPLE",
    nameControl: "EXAM",
    filingStatus: FilingStatus.Single,
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  };
  const baseline = f1040_2025.executeReturn({ general, w2: wages });
  assertEquals(baseline.diagnostics, []);
  for (
    const [short_term, long_term] of [[0, 50000], [50000, 0], [20000, 30000]]
  ) {
    const holding = inputSchema.parse(input);
    if (holding.prior_year.kind !== "continuing") {
      throw new Error("Expected continuing source");
    }
    Object.assign(holding.prior_year.closing_lots[0], {
      short_term,
      long_term,
    });
    holding.investment_lots[0].opening_deferred_gain = {
      short_term,
      long_term,
    };
    holding.investment_lots[0].closing_deferred_gain = {
      short_term,
      long_term,
    };
    const executed = f1040_2025.executeReturn({
      general,
      w2: wages,
      f8997: holding,
    });
    assertEquals(executed.diagnostics, []);
    assertEquals(executed.pending.f1040, baseline.pending.f1040);
    assertEquals(executed.pending.f1040.line24_total_tax, 7955);
    const pending = buildPending(executed.pending);
    assertThrows(
      () => buildMefXml(pending, filer),
      Error,
      "Form 8997 requires a native annual QOF holdings document",
    );
    await assertRejects(
      () => buildPdfBytes(pending, filer),
      Error,
      "Form 8997 requires a native annual QOF holdings document",
    );
  }
});
