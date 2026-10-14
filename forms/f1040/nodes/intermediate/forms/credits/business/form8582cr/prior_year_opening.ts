import { z } from "zod";
import {
  calculateForm8582CR,
  inputSchema as form8582crInputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "./index.ts";
import { creditSourceSchema } from "./source.ts";

const amount = z.number().int().nonnegative().refine(Number.isSafeInteger);
const positiveAmount = z.number().int().positive().refine(Number.isSafeInteger);
const copyReference = z.string().trim().min(1);
const priorYearCopiesSchema = z.object({
  return_copy_reference: copyReference,
  form8582cr_copy_reference: copyReference,
}).strict();
const worksheet9RowSchema = z.object({
  source: creditSourceSchema,
  originating_tax_year: z.union([z.literal(2023), z.literal(2024)]),
  column_a_credit: positiveAmount,
  column_b_unallowed: positiveAmount,
  column_c_allowed: amount,
}).strict();

/** Reviewed prior copies and Worksheet 9; no field establishes IRS acceptance. */
export const form8582CR2024OpeningCandidateSchema = z.object({
  taxpayer_tin: z.string().regex(/^\d{9}$/),
  no_recapture_or_bankruptcy_transfer_reviewed: z.literal(true),
  prior_2023: priorYearCopiesSchema.extend({
    tax_year: z.literal(2023),
    single_activity_credit_type_reviewed: z.literal(true),
    source: creditSourceSchema,
    form8582cr_line5: positiveAmount,
    form8582cr_line37: amount,
  }),
  prior_2024: priorYearCopiesSchema.extend({
    tax_year: z.literal(2024),
    form8582cr_line5: positiveAmount,
    form8582cr_line37: amount,
    worksheet9_rows: z.array(worksheet9RowSchema).length(2),
  }),
}).strict();

type Source = z.infer<typeof creditSourceSchema>;

function sourceIdentity(source: Source): string {
  return JSON.stringify({
    activity_reference: source.activity_reference,
    source_form: source.source_form,
    source_document_reference: source.source_document_reference,
    source_origin: source.source_origin,
    category: source.category,
    reporting_route: source.reporting_route,
    form3800_credit_line: source.form3800_credit_line,
    publicly_traded_partnership: source.publicly_traded_partnership,
  });
}

function isBoundedSource(source: Source): boolean {
  return source.category === PassiveCreditCategory.Other &&
    source.source_form === "Form 8874" &&
    source.source_origin.kind === PassiveCreditSourceOrigin.Self &&
    source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
    source.form3800_credit_line === "1i" &&
    !source.publicly_traded_partnership;
}

/** Reconcile two distinct credit vintages through 2024 Worksheet 9 into 2025. */
export function reconcileForm8582CR2024OpeningCandidate(
  rawCandidate: unknown,
  raw2025Form8582CR: unknown,
  raw2025General: unknown,
) {
  const candidate = form8582CR2024OpeningCandidateSchema.parse(rawCandidate);
  const current = form8582crInputSchema.parse(raw2025Form8582CR);
  const general = z.object({ taxpayer_ssn: z.string().min(1) }).parse(
    raw2025General,
  );
  const prior = candidate.prior_2023.source;
  const rows = candidate.prior_2024.worksheet9_rows;
  const row2023 = rows.find((row) => row.originating_tax_year === 2023);
  const row2024 = rows.find((row) => row.originating_tax_year === 2024);
  const prior2023Unallowed = candidate.prior_2023.form8582cr_line5 -
    candidate.prior_2023.form8582cr_line37;
  const sum = (
    key: "column_a_credit" | "column_b_unallowed" | "column_c_allowed",
  ) => rows.reduce((total, row) => total + row[key], 0);
  if (
    candidate.taxpayer_tin !== general.taxpayer_ssn.replace(/\D/g, "") ||
    !isBoundedSource(prior) ||
    prior.current_year_credit !== candidate.prior_2023.form8582cr_line5 ||
    prior.prior_unallowed_credits.length !== 0 ||
    prior2023Unallowed <= 0 || !Number.isSafeInteger(prior2023Unallowed) ||
    !row2023 || !row2024 ||
    row2023.source.activity_reference === row2024.source.activity_reference ||
    row2023.source.source_document_reference ===
      row2024.source.source_document_reference ||
    candidate.prior_2023.return_copy_reference ===
      candidate.prior_2024.return_copy_reference ||
    candidate.prior_2023.form8582cr_copy_reference ===
      candidate.prior_2024.form8582cr_copy_reference ||
    sourceIdentity(row2023.source) === sourceIdentity(row2024.source) ||
    rows.some((row) =>
      !isBoundedSource(row.source) ||
      row.column_b_unallowed + row.column_c_allowed !== row.column_a_credit
    ) ||
    sourceIdentity(row2023.source) !== sourceIdentity(prior) ||
    row2023.source.current_year_credit !== 0 ||
    row2023.source.prior_unallowed_credits.length !== 1 ||
    row2023.source.prior_unallowed_credits[0].originating_tax_year !== 2023 ||
    row2023.source.prior_unallowed_credits[0].credit_amount !==
      prior2023Unallowed ||
    row2023.source.prior_unallowed_credits[0].source_document_reference !==
      prior.source_document_reference ||
    row2023.column_a_credit !== prior2023Unallowed ||
    row2024.source.current_year_credit !== row2024.column_a_credit ||
    row2024.source.prior_unallowed_credits.length !== 0 ||
    sum("column_a_credit") !== candidate.prior_2024.form8582cr_line5 ||
    sum("column_c_allowed") !== candidate.prior_2024.form8582cr_line37 ||
    sum("column_b_unallowed") !==
      candidate.prior_2024.form8582cr_line5 -
        candidate.prior_2024.form8582cr_line37 ||
    current.credit_sources.length !== 2 ||
    !Number.isSafeInteger(sum("column_a_credit")) ||
    !Number.isSafeInteger(sum("column_b_unallowed")) ||
    !Number.isSafeInteger(sum("column_c_allowed"))
  ) {
    throw new Error(
      "Form 8582-CR prior-credit candidate differs from the 2023 credit, 2024 Worksheet 9, or filed line totals",
    );
  }
  for (const row of rows) {
    const matching = current.credit_sources.filter((source) =>
      sourceIdentity(source) === sourceIdentity(row.source)
    );
    const source = matching[0];
    const carry = source?.prior_unallowed_credits[0];
    if (
      matching.length !== 1 || !source ||
      source.current_year_credit !== 0 ||
      source.prior_unallowed_credits.length !== 1 || !carry ||
      carry.originating_tax_year !== row.originating_tax_year ||
      carry.credit_amount !== row.column_b_unallowed ||
      carry.source_document_reference !== row.source.source_document_reference
    ) {
      throw new Error(
        "Form 8582-CR 2025 prior credit differs from its 2024 Worksheet 9 activity and vintage",
      );
    }
  }
  const lines = calculateForm8582CR(current);
  const openingTotal = sum("column_b_unallowed");
  if (
    lines.partI.other.prior !== openingTotal ||
    lines.partI.line5 !== openingTotal ||
    lines.sourceAllocations.length !== 2 ||
    lines.sourceAllocations.reduce(
        (total, source) => total + source.total_credit,
        0,
      ) !== openingTotal
  ) {
    throw new Error(
      "Form 8582-CR 2025 opening differs from its computed Part I and source allocations",
    );
  }
  return {
    tax_year: 2025 as const,
    rows: rows.map((row) => ({
      originating_tax_year: row.originating_tax_year,
      source: current.credit_sources.find((source) =>
        sourceIdentity(source) === sourceIdentity(row.source)
      )!,
      prior_unallowed_credit: row.column_b_unallowed,
    })),
    preview_line4b: lines.partI.other.prior,
    preview_line5: lines.partI.line5,
    preview_line37: lines.line37,
    preview_form3800_passive_allocations: lines.sourceAllocations,
    prior_2023_return_copy_reference:
      candidate.prior_2023.return_copy_reference,
    prior_2024_return_copy_reference:
      candidate.prior_2024.return_copy_reference,
  };
}
