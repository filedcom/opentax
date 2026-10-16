import {
  ableSource2026Schema,
  calculateAbleSources2026,
} from "../inputs/able-source.ts";
import { landNiitExclusion2026 } from "../inputs/land-disposition-bridge.ts";
import {
  calculateCapitalGains2026,
  capitalGainInput2026Schema,
} from "./capital-gains.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  form8960,
  printFieldsSchema,
} from "../../nodes/intermediate/forms/taxes/investments/form8960/index.ts";
import { investmentOwner2026 } from "../inputs/investment-source.ts";
import {
  calculateInvestmentClaim2026,
  investmentClaim2026Schema,
} from "../inputs/investment-claim.ts";
import { schedule2_2026 } from "./schedule2.ts";
import { FilingStatus } from "../../nodes/types.ts";
const money = z.number().finite().int().nonnegative().safe();
const cfg = {
  niitThresholdMfj: 250000,
  niitThresholdMfs: 125000,
  niitThresholdOther: 200000,
};
export const inputSchema = investmentOwner2026.extend({
  tax_residency: z.enum([
    "full_year_citizen_or_resident",
    "nonresident_or_dual_status",
  ]).optional(),
  magi: z.number().finite().int().safe(),
  able_sources_2026: ableSource2026Schema.optional(),
  able_taxable_earnings_from_agi: money.default(0),
  foreign_earned_income_exclusion_from_agi: z.literal(0),
  other_niit_income_pending: z.literal(false),
  early_withdrawal_penalty_from_agi: money,
  taxable_interest_from_agi: money,
  ordinary_dividends_from_agi: money,
  capital_gain_from_agi: z.number().finite().int().safe(),
  ordinary_disposition_gain_from_agi: z.number().finite().int().safe().default(
    0,
  ),
  taking_standard_deduction: z.boolean(),
  itemized_before_overall_limit: money,
  itemized_after_overall_limit: money,
  investment_sources_2026: investmentClaim2026Schema.optional(),
  capital_sources_2026: capitalGainInput2026Schema.optional(),
  schedule_a_tax_facts: z.object({
    tax_election: z.enum(["income", "actual_sales"]),
    income_taxes: money,
    total_taxes_before_limit: money,
    allowed_taxes: money,
  }).strict().optional(),
}).strict();
export type Form8960Input2026 = z.input<typeof inputSchema>;
export function calculateForm8960_2026(raw: Form8960Input2026) {
  const input = inputSchema.parse(raw);
  const capital = input.capital_sources_2026
    ? calculateCapitalGains2026(input.capital_sources_2026)
    : undefined;
  const investment = input.investment_sources_2026
    ? calculateInvestmentClaim2026({
      ...input.investment_sources_2026,
      filing_status: input.filing_status,
      taxpayer_ssn: input.taxpayer_ssn,
      ...(input.spouse_ssn ? { spouse_ssn: input.spouse_ssn } : {}),
    })
    : undefined;
  const line1 = investment?.lines.line2b ?? 0;
  const line2 = investment?.lines.line3b ?? 0;
  if (
    capital && (
      capital.source_input.filing_status !== input.filing_status ||
      capital.source_input.taxpayer_ssn !== input.taxpayer_ssn ||
      capital.source_input.spouse_ssn !== input.spouse_ssn
    )
  ) throw new Error("NIIT capital sources must match return owners");
  const capitalGain = capital?.return_gain ??
    investment?.lines.capital_gain_distributions ?? 0;
  const ordinaryGain = capital?.ordinary_disposition_gain_loss ?? 0;
  const landExclusion = capital?.land
    ? landNiitExclusion2026(capital.land)
    : undefined;
  const line5 = capitalGain + ordinaryGain;
  const line5b = landExclusion?.line5b_adjustment ?? 0;
  const line10 = investment?.lines.early_withdrawal_penalty ?? 0;
  if (
    line1 !== input.taxable_interest_from_agi ||
    line2 !== input.ordinary_dividends_from_agi ||
    capitalGain !== input.capital_gain_from_agi ||
    ordinaryGain !== input.ordinary_disposition_gain_from_agi ||
    line10 !== input.early_withdrawal_penalty_from_agi
  ) {
    throw new Error(
      "NIIT investment sources disagree with AGI income or penalty",
    );
  }
  if (
    input.itemized_after_overall_limit > input.itemized_before_overall_limit
  ) throw new Error("NIIT itemized deductions exceed the pre-limit amount");
  const limit = input.filing_status === FilingStatus.MFJ ||
      input.filing_status === FilingStatus.QSS
    ? cfg.niitThresholdMfj
    : input.filing_status === FilingStatus.MFS
    ? cfg.niitThresholdMfs
    : cfg.niitThresholdOther;
  if (
    (investment || capital?.source_input.claim || input.magi > limit) &&
    input.tax_residency !== "full_year_citizen_or_resident"
  ) {
    throw new Error(
      "NIIT needs reviewed full-year citizen/resident status; dual-status elections need their owner",
    );
  }
  const able = input.able_sources_2026
    ? calculateAbleSources2026(input.able_sources_2026)
    : undefined;
  if (
    (able?.taxable_earnings ?? 0) !== input.able_taxable_earnings_from_agi ||
    able &&
      (able.source_input.filing_status !== input.filing_status ||
        able.source_input.taxpayer_ssn !== input.taxpayer_ssn ||
        able.source_input.spouse_ssn !== input.spouse_ssn)
  ) {
    throw Error(
      "NIIT ABLE sources must reconcile actual owners and AGI earnings",
    );
  }
  if (able && able.taxable_earnings > 0 && input.magi > limit) {
    throw Error(
      "Taxable ABLE earnings above the NIIT threshold need a reviewed section 1411 classification",
    );
  }
  const gross = line1 + line2 + line5 + line5b;
  let line9b = 0;
  const taxes = input.schedule_a_tax_facts;
  if (
    !input.taking_standard_deduction &&
    input.itemized_before_overall_limit > 0 && !taxes
  ) {
    throw new Error(
      "NIIT itemized selection needs the Schedule A tax handoff, including zero",
    );
  }
  if (
    taxes && (taxes.allowed_taxes > taxes.total_taxes_before_limit ||
      taxes.allowed_taxes > input.itemized_before_overall_limit ||
      (taxes.tax_election === "income" &&
        taxes.income_taxes > taxes.total_taxes_before_limit))
  ) {
    throw new Error("NIIT Schedule A tax amounts do not reconcile");
  }
  if (
    !input.taking_standard_deduction && input.magi > limit && gross > 0 &&
    taxes?.tax_election === "income" && taxes.income_taxes > 0
  ) {
    if (
      !input.investment_sources_2026?.state_income_tax_allocation_review &&
      !capital?.source_input.claim?.state_income_tax_allocation_review
    ) {
      throw new Error(
        "NIIT itemized income taxes need a reasonable allocation review",
      );
    }
    // First allocate the allowed SALT deduction proportionally to income taxes;
    // personal-use real/personal property taxes are not investment expenses.
    // Then apply the reviewed gross-NII/AGI method in Reg. 1.1411-4(g)(1).
    const incomeTaxAfterSalt = taxes.income_taxes * taxes.allowed_taxes /
      taxes.total_taxes_before_limit;
    line9b = Math.round(incomeTaxAfterSalt * Math.min(1, gross / input.magi));
    // Reg. 1.1411-4(f)(7)(ii): the NII itemized deduction cannot exceed the
    // total itemized deduction remaining after §68. The 2026 §68 has no former
    // subsection (c) exceptions; it applies to the entire itemized total.
    line9b = Math.min(line9b, input.itemized_after_overall_limit);
  }
  const sharedInput = {
    filing_status: input.filing_status,
    magi: input.magi,
    line1_taxable_interest: line1,
    line2_ordinary_dividends: line2,
    line5a_net_gain: line5,
    line5b_net_gain_adjustment: line5b,
    line9b_state_local_tax: line9b,
    line10_additional_modifications: line10,
  };
  const shared = form8960.computeWithConfig(
    { taxYear: 2026, formType: "f1040" },
    sharedInput,
    cfg,
    Math.round,
  );
  const printedRaw = shared.outputs.find((o) => o.nodeType === "form8960")
    ?.fields;
  const printed = printedRaw ? printFieldsSchema.parse(printedRaw) : undefined;
  const tax = printed?.line17_niit ?? 0;
  return {
    source_input: input,
    investment,
    land_exclusion_workpaper: landExclusion,
    shared_input: sharedInput,
    file_form8960: input.magi > limit,
    lines: printed ? { ...printed, line17_niit: tax } : undefined,
    tax,
  };
}
class Form8960Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8960";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2_2026]);
  compute(ctx: NodeContext, input: Form8960Input2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 8960 needs f1040:2026 context");
    }
    const result = calculateForm8960_2026(input);
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: {
            calculation_2026: result,
            file_form8960: result.file_form8960,
          },
        },
        { nodeType: "schedule2", fields: { line6_niit: result.tax } },
      ],
    };
  }
}
export const form8960_2026 = new Form8960Node2026();
