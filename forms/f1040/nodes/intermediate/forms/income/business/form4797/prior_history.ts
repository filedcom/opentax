import { z } from "zod";
import { FilingStatus, filingStatusSchema } from "../../../../../types.ts";

const dollars = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const signedDollars = z.number().int().min(-Number.MAX_SAFE_INTEGER).max(
  Number.MAX_SAFE_INTEGER,
);
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const owner = z.object({ taxpayer_ssn: ssn, spouse_ssn: ssn.optional() })
  .strict();
const balanceSchema = z.object({
  loss_year: z.number().int(),
  remaining_loss: dollars.positive(),
}).strict();
const yearSchema = z.object({
  tax_year: z.number().int().min(2020).max(2024),
  owner,
  filed_return_reference: reference,
  source_document_reference: reference,
  filed_line7_net_gain_loss: signedDollars,
  section1231_loss_taken_into_account: dollars,
  filed_line8_nonrecaptured_loss: dollars.optional(),
  filed_line12_recaptured_gain: dollars.optional(),
}).strict();

/** Reviewed transcriptions only. References do not establish IRS acceptance. */
export const section1231PriorHistorySchema = z.object({
  tax_year: z.literal(2025),
  owner,
  opening_2020_source_reference: reference,
  opening_2020_losses: z.array(balanceSchema.extend({
    loss_year: z.number().int().min(2015).max(2019),
  })).max(5),
  filed_years: z.array(yearSchema).length(5),
  current_year_loss_taken_into_account: dollars.optional(),
  current_year_loss_source_reference: reference.optional(),
}).strict().superRefine((history, context) => {
  const years = history.filed_years.map((year) => year.tax_year);
  const references = history.filed_years.map((year) =>
    year.source_document_reference
  );
  if (
    years.some((year, index) => year !== 2020 + index) ||
    new Set(history.opening_2020_losses.map((row) => row.loss_year)).size !==
      history.opening_2020_losses.length ||
    new Set(references).size !== 5 ||
    new Set(history.filed_years.map((year) => year.filed_return_reference))
        .size !== 5 ||
    references.includes(history.opening_2020_source_reference) ||
    history.owner.taxpayer_ssn === history.owner.spouse_ssn ||
    history.filed_years.some((year) =>
      year.owner.taxpayer_ssn !== history.owner.taxpayer_ssn ||
      year.owner.spouse_ssn !== history.owner.spouse_ssn
    )
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 4797 history needs distinct loss vintages, ordered 2020–2024 filed sources and consistent owners",
    });
  }
});

/** Same five-year replay contract, with the window determined by the return year. */
export function section1231HistorySchemaForYear(taxYear: 2025 | 2026) {
  const firstYear = taxYear - 5;
  return z.object({
    tax_year: z.literal(taxYear),
    owner,
    opening_period_source_reference: reference,
    opening_period_losses: z.array(balanceSchema.extend({
      loss_year: z.number().int().min(firstYear - 5).max(firstYear - 1),
    })).max(5),
    filed_years: z.array(yearSchema.extend({
      tax_year: z.number().int().min(firstYear).max(taxYear - 1),
    })).length(5),
    current_year_loss_taken_into_account: dollars.optional(),
    current_year_loss_source_reference: reference.optional(),
  }).strict().superRefine((history, context) => {
    const years = history.filed_years.map((year) => year.tax_year);
    const references = history.filed_years.map((year) =>
      year.source_document_reference
    );
    if (
      years.some((year, index) => year !== firstYear + index) ||
      new Set(history.opening_period_losses.map((row) => row.loss_year))
          .size !== history.opening_period_losses.length ||
      new Set(references).size !== 5 ||
      new Set(history.filed_years.map((year) => year.filed_return_reference))
          .size !== 5 ||
      references.includes(history.opening_period_source_reference) ||
      history.owner.taxpayer_ssn === history.owner.spouse_ssn ||
      history.filed_years.some((year) =>
        year.owner.taxpayer_ssn !== history.owner.taxpayer_ssn ||
        year.owner.spouse_ssn !== history.owner.spouse_ssn
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `Form 4797 history needs distinct loss vintages, ordered ${firstYear}-${
            taxYear - 1
          } filed sources and consistent owners`,
      });
    }
  });
}
export type AnnualSection1231History = z.infer<
  ReturnType<typeof section1231HistorySchemaForYear>
>;

export const priorHistoryPublicSchema = z.object({
  section_1231_prior_history: section1231PriorHistorySchema,
}).strict();
export type Section1231PriorHistory = z.infer<
  typeof section1231PriorHistorySchema
>;
type Balance = z.infer<typeof balanceSchema>;

function total(rows: readonly Balance[]): number {
  const amount = rows.reduce((sum, row) => sum + row.remaining_loss, 0);
  if (!Number.isSafeInteger(amount)) {
    throw new Error("Form 4797 prior-loss total exceeds whole-dollar range");
  }
  return amount;
}

function oldestFirst(rows: readonly Balance[], consumed: number): Balance[] {
  const sorted = rows.toSorted((a, b) => a.loss_year - b.loss_year);
  return sorted.map((row, index) => ({
    ...row,
    remaining_loss: row.remaining_loss -
      Math.min(
        row.remaining_loss,
        Math.max(0, consumed - total(sorted.slice(0, index))),
      ),
  })).filter((row) => row.remaining_loss > 0);
}

function annualLosses(
  rows: readonly Balance[],
  year: number,
  net: number,
  deductedLoss: number,
) {
  if ((net >= 0 && deductedLoss !== 0) || (net < 0 && deductedLoss > -net)) {
    throw new Error(
      "Form 4797 loss taken into account must reconcile to the year's net section 1231 loss",
    );
  }
  const eligible = rows.filter((row) => row.loss_year >= year - 5);
  const prior = total(eligible);
  const ordinaryRecapture = Math.min(Math.max(net, 0), prior);
  const remaining = oldestFirst(eligible, ordinaryRecapture);
  const ending = deductedLoss > 0
    ? [...remaining, { loss_year: year, remaining_loss: deductedLoss }]
    : remaining;
  total(ending);
  return {
    tax_year: year,
    expired_loss: total(rows) - prior,
    opening_losses: eligible,
    opening_nonrecaptured_loss: prior,
    line8: net > 0 ? prior : 0,
    ordinary_recapture: ordinaryRecapture,
    long_term_gain: Math.max(0, net - ordinaryRecapture),
    ordinary_gain_loss: net < 0 ? net : ordinaryRecapture,
    loss_taken_into_account: deductedLoss,
    ending_losses: ending,
  };
}

/** Replay filed sources and expose the opening ledger without finalizing current losses. */
export function replaySection1231PriorYears(
  taxYear: 2025 | 2026,
  raw: AnnualSection1231History,
) {
  const history = section1231HistorySchemaForYear(taxYear).parse(raw);
  const replay = history.filed_years.reduce((state, filed) => {
    const year = annualLosses(
      state.losses,
      filed.tax_year,
      filed.filed_line7_net_gain_loss,
      filed.section1231_loss_taken_into_account,
    );
    if (
      (filed.filed_line8_nonrecaptured_loss ?? 0) !== year.line8 ||
      (filed.filed_line12_recaptured_gain ?? 0) !== year.ordinary_recapture
    ) {
      throw new Error(
        `Form 4797 filed ${filed.tax_year} lines 8/12 conflict with oldest-first prior-loss history`,
      );
    }
    return { losses: year.ending_losses, years: [...state.years, year] };
  }, {
    losses: history.opening_period_losses as Balance[],
    years: [] as ReturnType<typeof annualLosses>[],
  });
  const opening = annualLosses(replay.losses, taxYear, 0, 0);
  return {
    owner: history.owner,
    prior_years: replay.years,
    prior_year_ending_losses: replay.losses,
    opening_losses: opening.opening_losses,
    opening_nonrecaptured_loss: opening.opening_nonrecaptured_loss,
    expired_before_current_year: opening.expired_loss,
  };
}

/** Finalize current character and carryforward only with the actual allowed loss. */
export function calculateSection1231HistoryForYear(
  taxYear: 2025 | 2026,
  raw: AnnualSection1231History,
  currentNet: number,
) {
  const history = section1231HistorySchemaForYear(taxYear).parse(raw);
  signedDollars.parse(currentNet);
  const replay = replaySection1231PriorYears(taxYear, history);
  if (
    currentNet < 0 &&
    (history.current_year_loss_taken_into_account === undefined ||
      history.current_year_loss_source_reference === undefined)
  ) {
    throw new Error(
      "Form 4797 current loss needs the amount taken into account after applicable tax limitations and its review reference",
    );
  }
  const current = annualLosses(
    replay.prior_year_ending_losses,
    taxYear,
    currentNet,
    history.current_year_loss_taken_into_account ?? 0,
  );
  const nextOpening = current.ending_losses.filter((row) =>
    row.loss_year >= taxYear - 4
  );
  return {
    owner: history.owner,
    prior_years: replay.prior_years,
    current,
    next_tax_year: taxYear + 1,
    opening_next_year_losses: nextOpening,
    opening_next_year_nonrecaptured_loss: total(nextOpening),
    expires_before_next_year: total(current.ending_losses) - total(nextOpening),
  };
}

/** Preserve the TY2025 public contract and retained carryforward field names. */
export function calculateSection1231History(
  raw: Section1231PriorHistory,
  currentNet: number,
) {
  const history = section1231PriorHistorySchema.parse(raw);
  const { opening_2020_source_reference, opening_2020_losses, ...rest } =
    history;
  const result = calculateSection1231HistoryForYear(2025, {
    ...rest,
    opening_period_source_reference: opening_2020_source_reference,
    opening_period_losses: opening_2020_losses,
  }, currentNet);
  return {
    owner: result.owner,
    prior_years: result.prior_years,
    current: result.current,
    opening_2026_losses: result.opening_next_year_losses,
    opening_2026_nonrecaptured_loss:
      result.opening_next_year_nonrecaptured_loss,
    expires_before_2026: result.expires_before_next_year,
  };
}

export function assertPublicSection1231HistoryOwner(
  rawGeneral: unknown,
  rawHistory: unknown,
): void {
  if (rawHistory === undefined) return;
  const history =
    priorHistoryPublicSchema.parse(rawHistory).section_1231_prior_history;
  const general = z.object({
    taxpayer_ssn: z.string(),
    spouse_ssn: z.string().optional(),
    filing_status: filingStatusSchema,
  }).parse(rawGeneral);
  if (
    history.owner.taxpayer_ssn !== general.taxpayer_ssn.replace(/\D/g, "") ||
    history.owner.spouse_ssn !==
      (general.filing_status === FilingStatus.MFJ
        ? general.spouse_ssn?.replace(/\D/g, "")
        : undefined) ||
    (general.filing_status === FilingStatus.MFJ && !history.owner.spouse_ssn)
  ) {
    throw new Error(
      "Form 4797 prior-loss history must identify the current taxpayer and joint-filing spouse",
    );
  }
}

export function assertSection1231HistoryFilingEvidence(
  rawHistory: unknown,
): void {
  if (rawHistory === undefined) return;
  section1231PriorHistorySchema.parse(rawHistory);
  throw new Error(
    "Form 4797 prior-loss history needs authenticated filed returns and acceptance evidence before filing export",
  );
}
