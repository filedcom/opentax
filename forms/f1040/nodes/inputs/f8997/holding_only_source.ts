import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { sha256Hex } from "../../../2025/domains/execution/prepared-source.ts";
import {
  calculateForm8997Statement,
  type Form8997Statement,
  inputSchema,
} from "./ledger.ts";

const pdfReview = z.object({
  source_document_reference: z.string().trim().min(1),
  file_name: z.string().trim().regex(/\.pdf$/i),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().date(),
}).strict();

/** A single retained lot, reviewed against distinct prior-filing and issuer files. */
export const form8997HoldingOnlyReviewSchema = z.object({
  prior_form8997_pdf: pdfReview,
  qof_issuer_statement_pdf: pdfReview,
  filed_2024_form8997_reference: z.string().trim().min(1),
  reviewed_2025_workpaper_reference: z.string().trim().min(1),
  lot_id: z.string().trim().min(1),
  qof_ein: z.string().regex(/^\d{9}$/),
  acquired_date: z.string().date(),
  description: z.string().trim().min(1),
  short_term_deferred_gain: z.number().int().nonnegative(),
  long_term_deferred_gain: z.number().int().nonnegative(),
  prior_form_lot_fields_match_pdf_reviewed: z.literal(true),
  issuer_identity_and_holding_match_pdf_reviewed: z.literal(true),
  issuer_qof_status_for_2025_reviewed: z.literal(true),
}).strict();

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value);
}

async function exactPdf(
  bytes: Uint8Array,
  sha256: string,
  minimumPages: number,
): Promise<boolean> {
  if (
    !(bytes instanceof Uint8Array) || bytes.length < 8 ||
    bytes.length > 60_000_000 ||
    new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-" ||
    await sha256Hex(bytes) !== sha256
  ) return false;
  try {
    const pdf = await PDFDocument.load(bytes);
    return pdf.getPageCount() >= minimumPages;
  } catch {
    return false;
  }
}

/**
 * Staged evidence gate only. Hashes bind the reviewed files; they cannot prove
 * IRS acceptance, issuer authenticity, or the PDFs' printed field contents.
 */
export async function reviewForm8997HoldingOnlySource(
  rawInput: unknown,
  rawReview: unknown,
  priorFormBytes: Uint8Array,
  issuerStatementBytes: Uint8Array,
): Promise<Form8997Statement> {
  const input = inputSchema.parse(rawInput);
  const review = form8997HoldingOnlyReviewSchema.parse(rawReview);
  const prior = input.prior_year;
  const lot = input.investment_lots[0];
  const priorLot = prior.kind === "continuing"
    ? prior.closing_lots[0]
    : undefined;
  if (
    prior.kind !== "continuing" || prior.closing_lots.length !== 1 ||
    input.investment_lots.length !== 1 || !lot || !priorLot ||
    lot.new_deferral !== undefined || lot.events.length !== 0 ||
    lot.formerly_qof_ein !== undefined ||
    lot.acquired_date >= "2025-01-01" ||
    review.short_term_deferred_gain + review.long_term_deferred_gain === 0 ||
    input.uninvested_deferred_gain_at_year_end.short_term !== 0 ||
    input.uninvested_deferred_gain_at_year_end.long_term !== 0 ||
    input.no_form1099b_for_disposition ||
    review.filed_2024_form8997_reference !== prior.filed_form8997_reference ||
    review.prior_form8997_pdf.source_document_reference !==
      prior.filed_form8997_reference ||
    review.reviewed_2025_workpaper_reference !==
      input.reviewed_annual_workpaper_reference ||
    lot.reviewed_workpaper_reference !==
      input.reviewed_annual_workpaper_reference ||
    review.qof_issuer_statement_pdf.source_document_reference !==
      lot.qof_source_document_reference ||
    review.lot_id !== lot.lot_id || review.lot_id !== priorLot.lot_id ||
    review.qof_ein !== lot.qof_ein || review.qof_ein !== priorLot.qof_ein ||
    review.acquired_date !== lot.acquired_date ||
    review.acquired_date !== priorLot.acquired_date ||
    review.description !== lot.description ||
    review.short_term_deferred_gain !== priorLot.short_term ||
    review.long_term_deferred_gain !== priorLot.long_term ||
    review.short_term_deferred_gain !== lot.opening_deferred_gain.short_term ||
    review.long_term_deferred_gain !== lot.opening_deferred_gain.long_term ||
    review.short_term_deferred_gain !== lot.closing_deferred_gain.short_term ||
    review.long_term_deferred_gain !== lot.closing_deferred_gain.long_term ||
    review.prior_form8997_pdf.source_document_reference ===
      review.qof_issuer_statement_pdf.source_document_reference ||
    review.prior_form8997_pdf.file_name ===
      review.qof_issuer_statement_pdf.file_name ||
    review.prior_form8997_pdf.sha256 ===
      review.qof_issuer_statement_pdf.sha256 ||
    !validDate(review.prior_form8997_pdf.reviewed_on) ||
    !validDate(review.qof_issuer_statement_pdf.reviewed_on) ||
    !validDate(review.acquired_date) ||
    !await exactPdf(priorFormBytes, review.prior_form8997_pdf.sha256, 2) ||
    !await exactPdf(
      issuerStatementBytes,
      review.qof_issuer_statement_pdf.sha256,
      1,
    )
  ) {
    throw new Error(
      "Form 8997 one-lot holding needs distinct exact prior Form 8997 and issuer files matching the opening and closing ledger",
    );
  }
  const statement = calculateForm8997Statement(input);
  if (
    statement.part_i.rows.length !== 1 ||
    statement.part_ii.rows.length !== 0 ||
    statement.part_iii.rows.length !== 0 ||
    statement.part_iv.rows.length !== 1
  ) {
    throw new Error(
      "Form 8997 holding-only review cannot include current-year activity",
    );
  }
  return statement;
}
