import {
  calculateGovernmentPayments2026,
  governmentSource2026Schema,
} from "../inputs/government-source.ts";
import {
  calculateCapitalGains2026,
  capitalGainInput2026Schema,
} from "./capital-gains.ts";
import {
  calculateInvestmentClaim2026,
  investmentClaim2026Schema,
} from "../inputs/investment-claim.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { amt2026 as cfg } from "../../nodes/config/2026-amt.ts";
import { incomeWorksheet2026 as gains } from "../../nodes/config/2026-tax-worksheets.ts";
import {
  computeExemption,
  computeMfsAddition,
  computePartThree,
  computeTentativeMinimumTax,
  partThreeWorksheetInputs,
} from "../../nodes/intermediate/forms/taxes/amt/form6251/calculation.ts";
import {
  calculateIsoSources2026,
  isoClaim2026Schema,
} from "../inputs/iso-source.ts";
import { schedule2_2026 } from "./schedule2.ts";

const signed = z.number().finite().int().min(-Number.MAX_SAFE_INTEGER / 100)
  .max(Number.MAX_SAFE_INTEGER / 100);
const money = signed.nonnegative();
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
/** Internal calculation contract; this node is never a public input entry.
 * Additional adjustments must arrive from audited source owners before enabling.
 */
export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
  line1a_deductions_without_senior: money,
  regular_tax_income: signed,
  regular_taxable_income: money,
  regular_tax: money,
  taking_standard_deduction: z.boolean(),
  line2a_taxes_paid: money,
  iso_sources_2026: isoClaim2026Schema.optional(),
  government_sources_2026: governmentSource2026Schema.optional(),
  investment_sources_2026: investmentClaim2026Schema.optional(),
  capital_sources_2026: capitalGainInput2026Schema.optional(),
  qualified_dividends: money.default(0),
  net_capital_gain: money.default(0),
  unrecaptured_1250_gain: money.default(0),
  rate_28_gain: money.default(0),
  // Accept the income node's explicit zero handoffs, never discard an active
  // branch that requires a missing 2026 source refigure/worksheet.
  form4952_regular_election: z.literal(0).optional(),
  form4952_regular_elected_capital_gain: z.literal(0).optional(),
  form4952_amt_election: z.literal(0).optional(),
  form4952_amt_elected_capital_gain: z.literal(0).optional(),
  form4952_amt_line2c_difference: z.literal(0).optional(),
  foreign_earned_income_exclusion: z.literal(0).optional(),
  foreign_exclusion_disallowed_deductions: z.literal(0).optional(),
}).strict();
export type Form6251Input2026 = z.input<typeof inputSchema>;

export function calculateForm6251_2026(raw: Form6251Input2026) {
  const input = inputSchema.parse(raw);
  const capital = input.capital_sources_2026
    ? calculateCapitalGains2026(input.capital_sources_2026)
    : undefined;
  if (
    capital && (
      capital.source_input.filing_status !== input.filing_status ||
      capital.source_input.taxpayer_ssn !==
        input.taxpayer_ssn.replaceAll("-", "") ||
      capital.source_input.spouse_ssn !== input.spouse_ssn?.replaceAll("-", "")
    )
  ) throw new Error("AMT capital sources must match return owners");
  if (
    input.net_capital_gain === 0 &&
    (input.unrecaptured_1250_gain > 0 || input.rate_28_gain > 0)
  ) throw new Error("AMT special-rate gains need reconciled net capital gain");
  const iso = input.iso_sources_2026
    ? calculateIsoSources2026({
      ...input.iso_sources_2026,
      filing_status: input.filing_status,
      taxpayer_ssn: input.taxpayer_ssn,
      ...(input.spouse_ssn ? { spouse_ssn: input.spouse_ssn } : {}),
    })
    : undefined;
  const investment = input.investment_sources_2026
    ? calculateInvestmentClaim2026({
      ...input.investment_sources_2026,
      filing_status: input.filing_status,
      taxpayer_ssn: input.taxpayer_ssn,
      ...(input.spouse_ssn ? { spouse_ssn: input.spouse_ssn } : {}),
    })
    : undefined;
  if (
    investment &&
    (investment.lines.line3a !== input.qualified_dividends ||
      (capital?.preferential_gain ??
          investment.lines.capital_gain_distributions) !==
        input.net_capital_gain)
  ) {
    throw new Error(
      "AMT investment sources disagree with regular preference income",
    );
  }
  if (capital && capital.preferential_gain !== input.net_capital_gain) {
    throw new Error(
      "AMT capital sources disagree with regular preference income",
    );
  }
  const government = input.government_sources_2026
    ? calculateGovernmentPayments2026(input.government_sources_2026)
    : undefined;
  if (
    government &&
    (government.source_input.filing_status !== input.filing_status ||
      government.source_input.taxpayer_ssn !== input.taxpayer_ssn ||
      government.source_input.spouse_ssn !== input.spouse_ssn)
  ) throw new Error("AMT government sources must match return owners");
  const line2b = government?.lines.state_refund ?? 0;
  const line2g = investment?.lines.amt_pab_interest ?? 0;
  const line2i = iso?.line2i ?? 0;
  const base = input.regular_tax_income + input.line2a_taxes_paid - line2b +
    line2g +
    line2i;
  const mfsAddition = input.filing_status === FilingStatus.MFS
    ? computeMfsAddition(
      base,
      cfg.mfsAdditionStart,
      cfg.mfsAdditionCap,
      cfg.mfsAdditionRate,
    )
    : 0;
  const line4 = base + mfsAddition;
  const line5 = computeExemption(
    line4,
    input.filing_status,
    cfg.exemption,
    cfg.phaseOutStart,
    cfg.phaseOutRate,
  );
  const line6 = Math.max(0, line4 - line5);
  const hasPreference = input.qualified_dividends > 0 ||
    input.net_capital_gain > 0;
  // With no AMT disposition or investment-interest refigure, regular and AMT
  // preference facts coincide. ISO exercises affect ordinary AMTI, not gain.
  const worksheet = hasPreference && line6 > 0
    ? partThreeWorksheetInputs(
      input.regular_taxable_income,
      input.qualified_dividends,
      input.net_capital_gain,
      input.unrecaptured_1250_gain,
      input.rate_28_gain,
      input.filing_status,
      0,
      0,
      gains.scheduleDLine19Limit[input.filing_status],
    )
    : undefined;
  const partThree = worksheet
    ? computePartThree(
      line6,
      worksheet,
      input.filing_status,
      gains.qdcgtZeroCeiling,
      gains.qdcgtTwentyFloor,
      cfg.thresholdStandard,
      cfg.thresholdMfs,
      cfg.adjustmentStandard,
      cfg.adjustmentMfs,
    )
    : undefined;
  const line7 = partThree?.line40 ??
    computeTentativeMinimumTax(
      line6,
      input.filing_status,
      cfg.thresholdStandard,
      cfg.thresholdMfs,
      cfg.adjustmentStandard,
      cfg.adjustmentMfs,
    );
  // No FTC, Schedule J, 4972, 8978, or Schedule 2 line 1z source is enabled in
  // this contract; positive unsupported fields fail strict parsing above.
  const line9 = line7;
  const line10 = input.regular_tax;
  const line11 = Math.max(0, line9 - line10);
  return {
    source_input: input,
    iso,
    government,
    investment,
    partThree,
    amtiBeforeMfsAddition: base,
    mfsAddition,
    file_form6251: line7 > line10,
    lines: {
      line1a: input.line1a_deductions_without_senior,
      line1b: input.regular_tax_income,
      line2a: input.line2a_taxes_paid,
      ...(line2b > 0 ? { line2b } : {}),
      ...(iso ? { line2i } : {}),
      ...(investment ? { line2g } : {}),
      line4,
      line5,
      line6,
      line7,
      line9,
      line10,
      line11,
      ...partThree,
    },
  };
}

class Form6251Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form6251";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2_2026]);
  compute(ctx: NodeContext, raw: Form6251Input2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 6251 needs f1040:2026 context");
    }
    const result = calculateForm6251_2026(raw);
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: {
            calculation_2026: result,
            file_form6251: result.file_form6251,
          },
        },
        { nodeType: "schedule2", fields: { line2_amt: result.lines.line11 } },
      ],
    };
  }
}
export const form6251_2026 = new Form6251Node2026();
