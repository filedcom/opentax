import { z } from "zod";

export const priorIsoSaleReviewSchema = z.object({
  prior_2024_form3921_reference: z.string().trim().min(1),
  prior_2024_return_reference: z.string().trim().min(1),
  prior_2024_form6251_reference: z.string().trim().min(1),
  prior_2024_filer_tin: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  prior_2024_form6251_line2i: z.number().int().positive(),
  corporation_name: z.string().trim().min(1),
  corporation_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  option_grant_date: z.string().date(),
  exercise_date: z.string().date(),
  exercise_price_per_share: z.number().int().nonnegative(),
  exercise_fmv_per_share: z.number().int().positive(),
  shares_exercised_and_sold: z.number().int().positive(),
  broker_2025_1099b_reference: z.string().trim().min(1),
  form8949_source_transaction_id: z.string().trim().min(1),
  sale_date: z.string().date(),
  proceeds: z.number().int().positive(),
  no_other_2024_iso_adjustments_verified: z.literal(true),
  no_partial_lot_sale_or_prior_disposition_verified: z.literal(true),
  no_2025_compensation_or_disqualifying_disposition_verified: z.literal(true),
}).strict();

const rawSaleSchema = z.object({
  f8949s: z.array(z.object({
    source_transaction_id: z.string(),
    broker_statement_reference: z.string().trim().min(1),
    date_acquired: z.string(),
    date_sold: z.string(),
    proceeds: z.number(),
    cost_basis: z.number(),
    amt_cost_basis: z.number(),
    adjustment_codes: z.string().optional(),
    adjustment_amount: z.number().optional(),
  })).length(1),
});

type Review = z.infer<typeof priorIsoSaleReviewSchema>;
type BasisRow = {
  source_transaction_id: string;
  part: string;
  proceeds: number;
  regular_basis: number;
  amt_basis: number;
  regular_gain: number;
  amt_gain: number;
};

function afterAnniversary(date: string, years: number, sale: string): boolean {
  const anniversary = new Date(`${date}T00:00:00Z`);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + years);
  return sale > anniversary.toISOString().slice(0, 10);
}

export function assertPriorIsoSaleCalculation(
  rawReview: unknown,
  rawRows: BasisRow | readonly BasisRow[] | undefined,
): void {
  const review = priorIsoSaleReviewSchema.parse(rawReview);
  const rows: readonly BasisRow[] = rawRows === undefined
    ? []
    : Array.isArray(rawRows)
    ? rawRows
    : [rawRows as BasisRow];
  const regularBasis = review.exercise_price_per_share *
    review.shares_exercised_and_sold;
  const amtBasis = review.exercise_fmv_per_share *
    review.shares_exercised_and_sold;
  const row = rows[0];
  if (
    rows.length !== 1 || !row || !Number.isSafeInteger(regularBasis) ||
    !Number.isSafeInteger(amtBasis) || amtBasis <= regularBasis ||
    review.prior_2024_form6251_line2i !== amtBasis - regularBasis ||
    !review.exercise_date.startsWith("2024-") ||
    !review.sale_date.startsWith("2025-") ||
    review.option_grant_date >= review.exercise_date ||
    !afterAnniversary(review.option_grant_date, 2, review.sale_date) ||
    !afterAnniversary(review.exercise_date, 1, review.sale_date) ||
    row.source_transaction_id !== review.form8949_source_transaction_id ||
    !["D", "E", "F"].includes(row.part) ||
    row.proceeds !== review.proceeds ||
    row.regular_basis !== regularBasis || row.amt_basis !== amtBasis ||
    row.regular_gain !== review.proceeds - regularBasis ||
    row.amt_gain !== review.proceeds - amtBasis ||
    !(
      (row.regular_gain > 0 && row.amt_gain > 0) ||
      (row.regular_gain < 0 && row.amt_gain < 0)
    )
  ) {
    throw new Error(
      "Form 6251 prior ISO sale needs one qualifying full-lot Form 8949 gain or loss with the exact 2024 Form 3921 and Form 6251 bases",
    );
  }
}

/** Replay the reviewed prior lot against the finalized return and retained sale. */
export function assertPriorIsoSaleExport(
  rawFields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
  primaryTin: string | undefined,
  isSingle: boolean,
): void {
  const parsed = assertPriorIsoSaleRetention(rawFields, pending);
  if (!parsed) return;
  assertPriorIsoSaleCalculation(
    parsed,
    rawFields.line2k_8949_basis_dispositions as
      | BasisRow
      | BasisRow[]
      | undefined,
  );
  const rawSale = rawSaleSchema.parse(pending?.f8949).f8949s;
  const transaction = rawSale[0];
  const regularGain = parsed.proceeds -
    parsed.exercise_price_per_share * parsed.shares_exercised_and_sold;
  const regularScheduleD = regularGain < 0
    ? Math.max(regularGain, -3_000)
    : regularGain;
  if (
    !isSingle || !primaryTin ||
    parsed.prior_2024_filer_tin.replaceAll("-", "") !==
      primaryTin.replaceAll("-", "") ||
    rawSale.length !== 1 || !transaction ||
    transaction.source_transaction_id !==
      parsed.form8949_source_transaction_id ||
    transaction.broker_statement_reference !==
      parsed.broker_2025_1099b_reference ||
    transaction.date_acquired !== parsed.exercise_date ||
    transaction.date_sold !== parsed.sale_date ||
    transaction.proceeds !== parsed.proceeds ||
    transaction.cost_basis !==
      parsed.exercise_price_per_share * parsed.shares_exercised_and_sold ||
    transaction.amt_cost_basis !==
      parsed.exercise_fmv_per_share * parsed.shares_exercised_and_sold ||
    (transaction.adjustment_codes ?? "") !== "" ||
    (transaction.adjustment_amount ?? 0) !== 0 ||
    (pending?.f1040 as Record<string, unknown> | undefined)
        ?.line7_capital_gain !== regularScheduleD ||
    (pending?.schedule2 as Record<string, unknown> | undefined)?.line2_amt !==
      rawFields.line11_amt
  ) {
    throw new Error(
      "Form 6251 prior ISO sale needs matching filer, raw 2025 broker/Form 8949 row, Schedule 2 and Form 1040 capital gain",
    );
  }
}

export function assertPriorIsoSaleRetention(
  rawFields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): Review | undefined {
  const review = rawFields.prior_iso_sale_review;
  const retainedForm = pending?.form6251 as Record<string, unknown> | undefined;
  const retainedRoute = retainedForm?.prior_iso_sale_review;
  if (review === undefined && retainedRoute === undefined) return;
  if (review === undefined || retainedRoute === undefined) {
    throw new Error(
      "Form 6251 prior ISO sale needs the retained and printed reviewed lot",
    );
  }
  const parsed = priorIsoSaleReviewSchema.parse(review);
  const retainedReview = priorIsoSaleReviewSchema.safeParse(
    retainedForm?.prior_iso_sale_review,
  );
  if (
    !retainedReview.success ||
    Object.keys(parsed).some((key) =>
      parsed[key as keyof Review] !== retainedReview.data[key as keyof Review]
    ) ||
    retainedForm?.line2k_disposition !== rawFields.line2k_disposition ||
    retainedForm?.iso_adjustment !== rawFields.iso_adjustment ||
    retainedForm?.line11_amt !== rawFields.line11_amt
  ) {
    throw new Error(
      "Form 6251 prior ISO sale needs the retained reviewed lot and final calculated amounts",
    );
  }
  return parsed;
}
