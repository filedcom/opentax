import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { form8960 } from "../../intermediate/forms/form8960/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import {
  calculateExcessEvents,
  ExcessEventKind,
  excessEventSchema,
} from "./excess_distribution.ts";
import type { ExcessEventResult } from "./excess_distribution.ts";
import {
  calculateMtmDisposition,
  mtmDispositionSchema,
  mtmOtherLossForm8949Transaction,
} from "./mtm_disposition.ts";
import { form8949 } from "../../intermediate/forms/form8949/index.ts";
import { retainedSourceCopySchema } from "./retained_source_copy.ts";
import { isTy2025IrsCountryCode } from "../../irs_country_code.ts";
import {
  calculateSection1294PriorStatus,
  section1294PriorStatusSchema,
} from "./section1294.ts";

// TY2025 — Form 8621: Information Return by a Shareholder of a PFIC or QEF
// US shareholders of Passive Foreign Investment Companies (PFICs) file annually.
// IRC §§1291–1298. Three taxation regimes:
// 1. Excess Distribution (default) — IRC §1291: special tax + interest charge on
//    distributions exceeding 125% of prior 3-year average.
// 2. Mark-to-Market (MTM) — IRC §1296: annual gain/loss recognition on FMV changes.
// 3. QEF (Qualified Electing Fund) — IRC §1293: annual inclusion of ordinary income
//    and net capital gain from PFIC.
//
export enum PficRegime {
  EXCESS_DISTRIBUTION = "EXCESS_DISTRIBUTION",
  MTM = "MTM",
  QEF = "QEF",
}

function isIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

// Facts shown on the printed parent form. The source document reference is an
// evidence locator, not proof that the issuer's records were authenticated.
export const form8621ParentSourceSchema = z.object({
  corporation_address: z.object({
    line1: z.string().trim().min(1),
    line2: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1),
    province_or_state: z.string().trim().min(1).optional(),
    country_code: z.string().regex(/^[A-Z]{2}$/).refine(
      isTy2025IrsCountryCode,
      "Form 8621 corporation address needs a TY2025 IRS country code",
    ),
    postal_code: z.string().trim().min(1).optional(),
  }).strict(),
  corporation_tax_year_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  corporation_tax_year_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  share_classes: z.array(
    z.object({
      description: z.string().trim().min(1),
      year_end_shares: z.number().int().nonnegative(),
      year_end_value_usd: z.number().nonnegative(),
    }).strict(),
  ).min(1),
  jointly_owned_with_spouse: z.boolean(),
  shares_acquired_during_2025: z.boolean(),
  acquisition_date: z.string().regex(/^2025-\d{2}-\d{2}$/).optional(),
  election_status: z.enum([
    "section1291_no_new_election",
    "qef_new_2025",
    "qef_continuing",
    "mtm_new_2025",
    "mtm_continuing",
  ]),
  no_outstanding_section1294_election: z.boolean(),
  section1294_prior_status: section1294PriorStatusSchema.optional(),
  issuer_record: retainedSourceCopySchema.extend({
    bytes_base64: retainedSourceCopySchema.shape.bytes_base64.optional(),
  }),
  // The QEF/Annual Intermediary Statement reports the shareholder's pro rata
  // amounts, rather than a taxpayer-supplied stand-alone tax operand.
  qef_annual_statement: retainedSourceCopySchema.extend({
    ordinary_earnings_usd: z.number().nonnegative(),
    net_capital_gain_usd: z.number().nonnegative(),
  }).optional(),
  qef_1294_activity_record: retainedSourceCopySchema.extend({
    distributions_cash_and_property_usd: z.number().nonnegative(),
    transferred_share_earnings_usd: z.number().nonnegative(),
  }).optional(),
  // Election continuity is a claim about an earlier filed form, not a result
  // inferred from this year's ordinary income or market price.
  prior_election_filing: retainedSourceCopySchema.extend({
    tax_year: z.number().int().min(1987).max(2024),
    election_kind: z.enum(["qef", "mtm"]),
    accepted_submission_id: z.string().trim().min(1),
    acceptance_record: retainedSourceCopySchema.extend({
      submission_id: z.string().trim().min(1),
      disposition: z.literal("Accepted"),
    }),
  }).optional(),
  mtm_year_end_value_record: retainedSourceCopySchema.extend({
    quoted_value_usd: z.number().nonnegative(),
    market_name: z.string().trim().min(1),
  }).optional(),
  mtm_adjusted_basis_record: retainedSourceCopySchema.extend({
    adjusted_basis_usd: z.number().nonnegative(),
    unreversed_inclusions_usd: z.number().nonnegative(),
  }).optional(),
  // Staged PDF evidence locators for each prior holding-year distribution,
  // including an issuer record that reports zero. Exact bytes still need an
  // independent authentication step before a printable parent can register.
  section1291_prior_distribution_records: z.array(
    z.object({
      source_event_index: z.number().int().nonnegative(),
      tax_year: z.number().int().min(2022).max(2024),
      currency_code: z.string().regex(/^[A-Z]{3}$/),
      amount: z.number().nonnegative(),
      document_id: z.string().trim().min(1),
      sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
      bytes_base64: retainedSourceCopySchema.shape.bytes_base64.optional(),
    }).strict(),
  ).optional(),
}).strict().superRefine((source, ctx) => {
  for (
    const date of [
      source.corporation_tax_year_start,
      source.corporation_tax_year_end,
      source.acquisition_date,
    ]
  ) {
    if (date && !isIsoDate(date)) {
      ctx.addIssue({
        code: "custom",
        message: "PFIC source date must be a real calendar date",
      });
    }
  }
  if (source.corporation_tax_year_start >= source.corporation_tax_year_end) {
    ctx.addIssue({
      code: "custom",
      message: "PFIC tax year must end after it starts",
    });
  }
  if (source.corporation_tax_year_end.slice(0, 4) !== "2025") {
    ctx.addIssue({ code: "custom", message: "PFIC tax year must end in 2025" });
  }
  if (source.shares_acquired_during_2025 !== Boolean(source.acquisition_date)) {
    ctx.addIssue({
      code: "custom",
      message: "2025 share acquisition needs its date",
    });
  }
  if (
    new Set(source.share_classes.map((share) => share.description)).size !==
      source.share_classes.length
  ) {
    ctx.addIssue({
      code: "custom",
      message: "PFIC share classes must be distinct",
    });
  }
  if (
    source.no_outstanding_section1294_election ===
      Boolean(source.section1294_prior_status)
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8621 section 1294 absence and prior election status conflict",
    });
  }
});

// Per-item schema — each Form 8621 covers one PFIC/QEF holding
export const itemSchema = z.object({
  // Legal name of the PFIC or QEF
  company_name: z.string(),
  // IRS business rule F8621-026 requires an EIN or foreign-entity reference ID.
  company_ein_or_ref: z.string().regex(/^(?:\d{2}-?\d{7}|[A-Za-z0-9]{1,50})$/),
  // Country where PFIC/QEF is incorporated (Form 8621 line A)
  country_of_incorporation: z.string(),
  // Taxation regime elected for this PFIC (Form 8621 Parts II/III/IV)
  regime: z.nativeEnum(PficRegime),
  // Number of shares owned at year end (Form 8621 Part I line 1a)
  shares_owned: z.number().nonnegative(),
  // Fair market value of shares at end of tax year (Form 8621 Part I line 1b)
  fmv_at_year_end: z.number().nonnegative(),
  parent_source: form8621ParentSourceSchema.optional(),
  // Each section 1291 distribution block supplies prior-year history and all
  // current distributions; each disposition supplies its realized gain.
  excess_events: z.array(excessEventSchema).optional(),
  // QEF: pro-rata share of ordinary income (Form 8621 Part III line 6a; IRC §1293(a)(1)(A))
  qef_ordinary_income: z.number().nonnegative().optional(),
  qef_ordinary_951_or_1293g_reduction: z.number().nonnegative().optional(),
  // QEF: pro-rata share of net capital gain (Form 8621 Part III line 6b; IRC §1293(a)(1)(B))
  qef_capital_gain: z.number().nonnegative().optional(),
  qef_capital_951_or_1293g_reduction: z.number().nonnegative().optional(),
  qef_1294_election: z.object({
    distributions_cash_and_property_usd: z.number().nonnegative(),
    transferred_share_earnings_usd: z.number().nonnegative(),
    undistributed_ordinary_earnings_usd: z.number().nonnegative(),
    undistributed_capital_gain_usd: z.number().nonnegative(),
    no_section951_inclusion: z.literal(true),
  }).strict().optional(),
  // Form 8621 Part IV lines 10a-12. A loss is limited by unreversed prior
  // inclusions, rather than accepted as an arbitrary signed amount.
  mtm_adjusted_basis_at_year_end: z.number().nonnegative().optional(),
  mtm_unreversed_inclusions: z.number().nonnegative().optional(),
  mtm_dispositions: z.array(mtmDispositionSchema).optional(),
}).strict();

export const inputSchema = z.object({
  f8621s: z.array(itemSchema).min(1),
});

export type F8621Item = z.infer<typeof itemSchema>;
type F8621Items = F8621Item[];

export interface Form8621Lines {
  item: F8621Item;
  excessEvents: ExcessEventResult[];
}

// MTM items
function mtmItems(items: F8621Items): F8621Items {
  return items.filter((item) => item.regime === PficRegime.MTM);
}

// QEF items
function qefItems(items: F8621Items): F8621Items {
  return items.filter((item) => item.regime === PficRegime.QEF);
}

// MTM: total gain/loss across all MTM items
function totalMtmGainLoss(items: F8621Items): number {
  return mtmItems(items).reduce((sum, item) => {
    if (item.mtm_adjusted_basis_at_year_end === undefined) {
      throw new Error(
        "Form 8621 mark-to-market needs adjusted year-end stock basis",
      );
    }
    const difference = item.fmv_at_year_end -
      item.mtm_adjusted_basis_at_year_end;
    const yearEnd = difference >= 0
      ? difference
      : -Math.min(-difference, item.mtm_unreversed_inclusions ?? 0);
    if (item.mtm_unreversed_inclusions === undefined) {
      if (difference < 0) {
        throw new Error(
          "Form 8621 mark-to-market loss needs unreversed prior inclusions",
        );
      }
    }
    return sum + yearEnd + (item.mtm_dispositions ?? []).reduce(
      (total, disposition) =>
        total + calculateMtmDisposition(disposition).ordinary,
      0,
    );
  }, 0);
}

// QEF ordinary earnings belong on Schedule 1. Its net capital gain instead
// belongs on Schedule D as long-term gain.
function totalQefOrdinaryIncome(items: F8621Items): number {
  return qefItems(items).reduce(
    (sum, item) =>
      sum + (item.qef_ordinary_income ?? 0) -
      (item.qef_ordinary_951_or_1293g_reduction ?? 0),
    0,
  );
}

function validateHoldings(items: F8621Items): void {
  const identifiers = items.map((item) => item.company_ein_or_ref);
  if (new Set(identifiers).size !== identifiers.length) {
    throw new Error(
      "Form 8621 needs one filing per unique PFIC/QEF identifier",
    );
  }
  for (const item of items) {
    if (
      item.regime !== PficRegime.QEF &&
      ((item.qef_ordinary_income ?? 0) > 0 ||
        (item.qef_ordinary_951_or_1293g_reduction ?? 0) > 0 ||
        (item.qef_capital_gain ?? 0) > 0 ||
        (item.qef_capital_951_or_1293g_reduction ?? 0) > 0 ||
        item.qef_1294_election !== undefined)
    ) {
      throw new Error("Form 8621 QEF earnings require the QEF regime");
    }
    if (
      item.regime !== PficRegime.MTM &&
      (item.mtm_adjusted_basis_at_year_end !== undefined ||
        item.mtm_unreversed_inclusions !== undefined ||
        item.mtm_dispositions !== undefined)
    ) {
      throw new Error("Form 8621 mark-to-market basis requires the MTM regime");
    }
    if (
      item.regime === PficRegime.QEF &&
      (item.qef_ordinary_income === undefined ||
        item.qef_capital_gain === undefined)
    ) {
      throw new Error(
        "Form 8621 QEF needs both pro rata ordinary earnings and capital gain facts",
      );
    }
    if (
      (item.qef_ordinary_951_or_1293g_reduction ?? 0) >
        (item.qef_ordinary_income ?? 0) ||
      (item.qef_capital_951_or_1293g_reduction ?? 0) >
        (item.qef_capital_gain ?? 0)
    ) {
      throw new Error(
        "Form 8621 QEF section 951 or 1293(g) reduction exceeds pro rata income",
      );
    }
    const deferred = item.qef_1294_election;
    if (deferred) {
      const ordinary = (item.qef_ordinary_income ?? 0) -
        (item.qef_ordinary_951_or_1293g_reduction ?? 0);
      const capital = (item.qef_capital_gain ?? 0) -
        (item.qef_capital_951_or_1293g_reduction ?? 0);
      const undistributed = deferred.undistributed_ordinary_earnings_usd +
        deferred.undistributed_capital_gain_usd;
      if (
        (item.qef_ordinary_951_or_1293g_reduction ?? 0) > 0 ||
        (item.qef_capital_951_or_1293g_reduction ?? 0) > 0 ||
        undistributed <= 0 ||
        deferred.undistributed_ordinary_earnings_usd > ordinary ||
        deferred.undistributed_capital_gain_usd > capital ||
        undistributed !== ordinary + capital -
            deferred.distributions_cash_and_property_usd -
            deferred.transferred_share_earnings_usd
      ) {
        throw new Error(
          "Form 8621 section 1294 election amounts or section 951 exclusion differ from QEF earnings",
        );
      }
    }
    if (
      item.regime !== PficRegime.EXCESS_DISTRIBUTION &&
      item.excess_events?.length
    ) {
      throw new Error(
        "Form 8621 excess events require the section 1291 regime",
      );
    }
    if (item.mtm_dispositions?.length) {
      const ids = item.mtm_dispositions.map((row) => row.transaction_id);
      if (new Set(ids).size !== ids.length) {
        throw new Error("Form 8621 MTM disposition IDs must be distinct");
      }
      for (const row of item.mtm_dispositions) {
        mtmOtherLossForm8949Transaction(row);
      }
    }
    if (
      item.parent_source?.section1294_prior_status &&
      item.regime !== PficRegime.QEF
    ) {
      throw new Error(
        "Form 8621 prior section 1294 elections need a QEF holding",
      );
    }
  }
}

function calculatedLines(items: F8621Items): Form8621Lines[] {
  return items.map((item) => ({
    item,
    excessEvents: (item.excess_events ?? []).flatMap(calculateExcessEvents),
  }));
}

function totalEventLine(
  lines: readonly Form8621Lines[],
  pick: (event: ExcessEventResult) => number,
): number {
  return lines.flatMap((line) => line.excessEvents).reduce(
    (sum, event) => sum + pick(event),
    0,
  );
}

class F8621Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8621";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    schedule2,
    schedule_b,
    schedule_d,
    form8960,
    income_tax_calculation,
    form8949,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { f8621s } = inputSchema.parse(input);
    validateHoldings(f8621s);
    const elected = f8621s.filter((item) => item.qef_1294_election);
    if (elected.length > 1) {
      throw new Error(
        "Form 8621 multiple section 1294 elections need separate tax-difference allocation",
      );
    }
    const lines = calculatedLines(f8621s);
    const currentAndPrePficIncome = totalEventLine(
      lines,
      (event) => event.line16b_current_and_pre_pfic_income,
    );
    const additionalTax = totalEventLine(
      lines,
      (event) => event.line16e_additional_tax,
    );
    const interest = totalEventLine(
      lines,
      (event) => event.line16f_interest,
    );

    const mtmIncome = totalMtmGainLoss(f8621s);
    const qefOrdinaryIncome = totalQefOrdinaryIncome(f8621s);
    const qef1294 = elected[0]?.qef_1294_election;
    const prior1294 = f8621s.flatMap((item) =>
      item.parent_source?.section1294_prior_status
        ? calculateSection1294PriorStatus(
          item.parent_source.section1294_prior_status,
          item.company_ein_or_ref,
        )
        : []
    );
    const priorTaxDue = prior1294.reduce(
      (sum, column) => sum + (column.taxDue ?? 0),
      0,
    );
    const priorInterestDue = prior1294.reduce(
      (sum, column) => sum + (column.interestDue ?? 0),
      0,
    );
    const otherIncomeFields = {
      ...(qefOrdinaryIncome !== 0
        ? { line8z_form8621_qef: qefOrdinaryIncome }
        : {}),
      ...(mtmIncome !== 0 ? { line8z_form8621_mtm: mtmIncome } : {}),
      ...(currentAndPrePficIncome !== 0
        ? { line8z_form8621_section1291: currentAndPrePficIncome }
        : {}),
    };
    const mtmOtherLossRows = f8621s.flatMap((item) =>
      (item.mtm_dispositions ?? []).flatMap((row) => {
        const transaction = mtmOtherLossForm8949Transaction(
          row,
          item.company_ein_or_ref,
        );
        return transaction ? [transaction] : [];
      })
    );
    const capitalGain = qefItems(f8621s).reduce(
      (sum, item) =>
        sum + (item.qef_capital_gain ?? 0) -
        (item.qef_capital_951_or_1293g_reduction ?? 0),
      0,
    );
    const nonexcessDividends = f8621s.flatMap((item) =>
      (item.excess_events ?? [])
        .flatMap((event) =>
          event.kind === ExcessEventKind.Distribution
            ? [{
              payerName: item.company_name,
              ordinaryDividends: event.taxable_nonexcess_dividend_usd,
            }]
            : []
        )
    ).filter((dividend) => dividend.ordinaryDividends > 0);

    return {
      outputs: [
        ...mtmOtherLossRows.map((transaction) =>
          output(form8949, { transaction })
        ),
        { nodeType: "form8621", fields: { items: lines } },
        ...nonexcessDividends.map((dividend) => output(schedule_b, dividend)),
        ...(nonexcessDividends.length > 0
          ? [output(form8960, {
            line2_ordinary_dividends: nonexcessDividends.reduce(
              (sum, dividend) => sum + dividend.ordinaryDividends,
              0,
            ),
          })]
          : []),
        ...(Object.keys(otherIncomeFields).length > 0
          ? [
            output(schedule1, {
              ...otherIncomeFields,
              line8z_form8621_mtm: otherIncomeFields.line8z_form8621_mtm ?? 0,
            }),
            output(agi_aggregator, {
              ...otherIncomeFields,
              line8z_form8621_mtm: otherIncomeFields.line8z_form8621_mtm ?? 0,
            }),
          ]
          : []),
        ...(capitalGain > 0
          ? [output(schedule_d, { line_11_qef_lt: capitalGain })]
          : []),
        ...(additionalTax > 0
          ? [output(income_tax_calculation, { form8621_tax: additionalTax })]
          : []),
        ...(qef1294
          ? [output(income_tax_calculation, {
            form8621_1294_undistributed_ordinary:
              qef1294.undistributed_ordinary_earnings_usd,
            form8621_1294_undistributed_capital:
              qef1294.undistributed_capital_gain_usd,
          })]
          : []),
        ...(interest > 0
          ? [output(schedule2, { line17p_form8621_interest: interest })]
          : []),
        ...(priorTaxDue > 0 || priorInterestDue > 0
          ? [output(schedule2, {
            line17z_form8621_1294_deferred_tax: priorTaxDue,
            line17q_form8621_1294_interest: priorInterestDue,
          })]
          : []),
      ],
    };
  }
}

export const f8621 = new F8621Node();
