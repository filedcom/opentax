import {
  landDispositionBridge2026Schema,
  resolveLandDispositionBridge2026,
} from "../inputs/land-disposition-bridge.ts";
import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../nodes/intermediate/aggregation/income/investments/schedule_d/index.ts";
import { investmentOwner2026 } from "../inputs/investment-source.ts";
import {
  calculateInvestmentClaim2026,
  investmentClaim2026Schema,
} from "../inputs/investment-claim.ts";
import {
  capitalClaim2026Schema,
  directCapitalRow2026,
  resolveCapitalSources2026,
} from "../inputs/capital-source.ts";
export const capitalGainClaimInput2026Schema = z.object({
  claim: capitalClaim2026Schema,
}).strict();
export const capitalGainInput2026Schema = investmentOwner2026.extend({
  claim: capitalClaim2026Schema.optional(),
  digital_assets_answer: z.boolean(),
  investment_sources_2026: investmentClaim2026Schema.optional(),
  land_sources_2026: landDispositionBridge2026Schema.optional(),
}).strict();
export type CapitalGainInput2026 = z.input<typeof capitalGainInput2026Schema>;
export function calculateCapitalGains2026(raw: CapitalGainInput2026) {
  const input = capitalGainInput2026Schema.parse(raw),
    owner = {
      filing_status: input.filing_status,
      taxpayer_ssn: input.taxpayer_ssn,
      ...(input.spouse_ssn ? { spouse_ssn: input.spouse_ssn } : {}),
    };
  const investment = input.investment_sources_2026
    ? calculateInvestmentClaim2026({
      ...input.investment_sources_2026,
      ...owner,
    })
    : undefined;
  const sources = input.claim
    ? resolveCapitalSources2026(input.claim, owner)
    : undefined;
  if (
    input.claim?.land_disposition_inventory_reference &&
    !input.land_sources_2026
  ) {
    throw new Error(
      "Linked land inventory needs its actual disposition sources",
    );
  }
  const land = input.land_sources_2026
    ? resolveLandDispositionBridge2026(
      input.land_sources_2026,
      owner,
      input.claim?.record_reference,
      input.claim?.land_disposition_inventory_reference,
    )
    : undefined;
  const landCapitalGain = land?.calculation.line10_long_term_gain ?? 0;
  if (sources?.has_digital_sales && !input.digital_assets_answer) {
    throw new Error(
      "Digital-asset dispositions require the Form 1040 digital-assets answer",
    );
  }
  const review = input.investment_sources_2026?.capital_gain_inventory_review;
  if (review && "capital_transaction_inventory_reference" in review) {
    if (
      review.capital_transaction_inventory_reference !==
        input.claim?.record_reference
    ) {
      throw new Error(
        "Investment and capital transaction inventories must reference the same reviewed sources",
      );
    }
  } else if (sources && review) {
    throw new Error(
      "Distribution-only inventory conflicts with capital dispositions or carryover sources",
    );
  }
  const distributions = investment?.lines.capital_gain_distributions ?? 0;
  const rows = sources?.rows ?? [],
    fileRows = rows.filter((r) => !directCapitalRow2026(r));
  const direct = (long: boolean) => {
    const selected = rows.filter((r) =>
      directCapitalRow2026(r) && r.is_long_term === long
    );
    const proceeds = selected.reduce((n, r) => n + r.proceeds, 0),
      cost = selected.reduce((n, r) => n + r.cost_basis, 0);
    return { proceeds, cost, gain: Math.round(proceeds) - Math.round(cost) };
  };
  const short = direct(false),
    long = direct(true),
    carry = sources?.carry ?? { short_term: 0, long_term: 0 };
  const sharedInput = {
    filing_status: input.filing_status,
    transaction: fileRows.length ? fileRows : undefined,
    line_1a_proceeds: short.proceeds,
    line_1a_cost: short.cost,
    line_8a_proceeds: long.proceeds,
    line_8a_cost: long.cost,
    line_6_carryover: carry.short_term,
    line_14_carryover: carry.long_term,
    line13_cap_gain_distrib: distributions,
    // Legacy shared key covers Form 4797 as well as Form 2439.
    line_11_form2439: landCapitalGain,
  };
  const shared = schedule_d.compute(
    { taxYear: 2026, formType: "f1040" },
    sharedInput,
  );
  const value = (node: string, key: string) =>
    shared.outputs.reduce(
      (n, o) =>
        n + (o.nodeType === node && typeof o.fields[key] === "number"
          ? o.fields[key] as number
          : 0),
      0,
    );
  const returnGain = value("f1040", "line7_capital_gain") +
    value("f1040", "line7a_cap_gain_distrib");
  const preferred = value("income_tax_calculation", "net_capital_gain");
  const summary = (parts: string[]) => {
    const selected = fileRows.filter((r) => parts.includes(r.part));
    return {
      proceeds: selected.reduce((n, r) => n + r.proceeds, 0),
      cost: selected.reduce((n, r) => n + r.cost_basis, 0),
      adjustment: selected.reduce((n, r) => n + (r.adjustment_amount ?? 0), 0),
      gain: selected.reduce((n, r) => n + r.gain_loss, 0),
    };
  };
  const groups = {
    line1b: summary(["A", "G"]),
    line2: summary(["B", "H"]),
    line3: summary(["C", "I"]),
    line8b: summary(["D", "J"]),
    line9: summary(["E", "K"]),
    line10: summary(["F", "L"]),
  };
  const line7 = short.gain + groups.line1b.gain + groups.line2.gain +
    groups.line3.gain - carry.short_term;
  const line15 = long.gain + groups.line8b.gain + groups.line9.gain +
    groups.line10.gain + landCapitalGain + distributions - carry.long_term;
  const line16 = line7 + line15,
    limit = input.filing_status === "mfs" ? 1500 : 3000;
  if (
    returnGain !== (line16 < 0 ? Math.max(-limit, line16) : line16) ||
    preferred !== Math.max(0, Math.min(line15, line16))
  ) {
    throw new Error(
      "Shared Schedule D calculation does not reconcile to reported capital columns",
    );
  }
  const fileSchedule = rows.length > 0 || carry.short_term > 0 ||
    carry.long_term > 0 || landCapitalGain > 0;
  return {
    source_input: input,
    land,
    line11_form4797: landCapitalGain,
    ordinary_disposition_gain_loss:
      land?.calculation.line20b_schedule1_gain_loss ?? 0,
    investment,
    sources,
    rows,
    file_rows: fileRows,
    groups,
    direct_short: short,
    direct_long: long,
    carry,
    distributions,
    qualified_dividends: investment?.lines.line3a ?? 0,
    line7,
    line15,
    line16,
    return_gain: returnGain,
    preferential_gain: preferred,
    withholding: sources?.withholding ?? 0,
    file_schedule_d: fileSchedule,
    file_form8949: fileRows.length > 0,
    direct_distribution: !fileSchedule && distributions > 0,
  };
}
class CapitalGainsNode2026 extends TaxNode<typeof capitalGainInput2026Schema> {
  readonly nodeType = "capital_gains";
  readonly inputSchema = capitalGainInput2026Schema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return [
      "f1040",
      "agi_aggregator",
      "income_tax_calculation",
      "form6251",
      "form8960",
      "capital_loss_carryover",
      "standard_deduction",
      "eitc",
    ];
  }
  compute(ctx: NodeContext, input: CapitalGainInput2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Capital sources require f1040:2026 context");
    }
    const r = calculateCapitalGains2026(input);
    if (r.land) {
      throw new Error(
        "Land disposition graph registration awaits QBI, loss-limit and Form 4797 attachment owners",
      );
    }
    const income = r.direct_distribution
      ? { line7a_cap_gain_distrib: r.return_gain }
      : r.file_schedule_d
      ? { line7_capital_gain: r.return_gain }
      : {};
    return {
      outputs: [
        {
          nodeType: "eitc",
          fields: { capital_disposition_activity_2026: r.file_schedule_d },
        },
        {
          nodeType: "capital_loss_carryover",
          fields: {
            filing_status: r.source_input.filing_status,
            taxpayer_ssn: r.source_input.taxpayer_ssn,
            ...(r.source_input.spouse_ssn
              ? { spouse_ssn: r.source_input.spouse_ssn }
              : {}),
            schedule_d_line7: r.line7,
            schedule_d_line15: r.line15,
          },
        },
        { nodeType: this.nodeType, fields: { calculation_2026: r } },
        {
          nodeType: "standard_deduction",
          fields: { capital_sources_2026: r.source_input },
        },
        {
          nodeType: "f1040",
          fields: {
            ...income,
            ...(r.withholding ? { line25b_withheld_1099: r.withholding } : {}),
          },
        },
        { nodeType: "agi_aggregator", fields: income },
        {
          nodeType: "income_tax_calculation",
          fields: { net_capital_gain: r.preferential_gain },
        },
        {
          nodeType: "form6251",
          fields: { capital_sources_2026: r.source_input },
        },
        {
          nodeType: "form8960",
          fields: { capital_sources_2026: r.source_input },
        },
      ],
    };
  }
}
export const capital_gains_2026 = new CapitalGainsNode2026();
