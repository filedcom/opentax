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
  // Each section 1291 distribution block supplies prior-year history and all
  // current distributions; each disposition supplies its realized gain.
  excess_events: z.array(excessEventSchema).optional(),
  // QEF: pro-rata share of ordinary income (Form 8621 Part III line 6a; IRC §1293(a)(1)(A))
  qef_ordinary_income: z.number().nonnegative().optional(),
  qef_ordinary_951_or_1293g_reduction: z.number().nonnegative().optional(),
  // QEF: pro-rata share of net capital gain (Form 8621 Part III line 6b; IRC §1293(a)(1)(B))
  qef_capital_gain: z.number().nonnegative().optional(),
  qef_capital_951_or_1293g_reduction: z.number().nonnegative().optional(),
  // Form 8621 Part IV lines 10a-12. A loss is limited by unreversed prior
  // inclusions, rather than accepted as an arbitrary signed amount.
  mtm_adjusted_basis_at_year_end: z.number().nonnegative().optional(),
  mtm_unreversed_inclusions: z.number().nonnegative().optional(),
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
    if (difference >= 0) return sum + difference;
    if (item.mtm_unreversed_inclusions === undefined) {
      throw new Error(
        "Form 8621 mark-to-market loss needs unreversed prior inclusions",
      );
    }
    return sum - Math.min(-difference, item.mtm_unreversed_inclusions);
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
        (item.qef_capital_951_or_1293g_reduction ?? 0) > 0)
    ) {
      throw new Error("Form 8621 QEF earnings require the QEF regime");
    }
    if (
      item.regime !== PficRegime.MTM &&
      (item.mtm_adjusted_basis_at_year_end !== undefined ||
        item.mtm_unreversed_inclusions !== undefined)
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
    if (
      item.regime !== PficRegime.EXCESS_DISTRIBUTION &&
      item.excess_events?.length
    ) {
      throw new Error(
        "Form 8621 excess events require the section 1291 regime",
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
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { f8621s } = inputSchema.parse(input);
    validateHoldings(f8621s);
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
    const otherIncomeFields = {
      ...(qefOrdinaryIncome !== 0
        ? { line8z_form8621_qef: qefOrdinaryIncome }
        : {}),
      ...(mtmIncome !== 0 ? { line8z_form8621_mtm: mtmIncome } : {}),
      ...(currentAndPrePficIncome !== 0
        ? { line8z_form8621_section1291: currentAndPrePficIncome }
        : {}),
    };
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
        ...(interest > 0
          ? [output(schedule2, { line17p_form8621_interest: interest })]
          : []),
      ],
    };
  }
}

export const f8621 = new F8621Node();
