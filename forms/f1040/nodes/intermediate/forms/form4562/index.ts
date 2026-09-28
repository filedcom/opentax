import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { FilingStatus } from "../../../types.ts";

// A first source-to-filing path: one fully elected, nonlisted Schedule C asset.
// Other asset classes need their own rows and depreciation calculations.
export const singleAssetSchema = z.object({
  business_reference: z.string().trim().min(1),
  activity_description: z.string().trim().min(1).max(40),
  asset_description: z.string().trim().min(1).max(100),
  source_document_ref: z.string().trim().min(1),
  placed_in_service_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  cost: z.number().int().positive(),
  elected_cost: z.number().int().nonnegative(),
  taxpayer_active_business_income: z.number().int().nonnegative(),
  taxpayer_active_business_income_source_ref: z.string().trim().min(1),
  prior_year_carryover: z.literal(0),
  prior_year_carryover_source_ref: z.string().trim().min(1),
  business_use_pct: z.literal(100),
  is_listed_property: z.literal(false),
  bonus_elected_out: z.literal(true),
  no_other_depreciation_for_activity: z.literal(true),
  no_other_depreciation_assets_on_return: z.literal(true),
  return_asset_inventory_source_ref: z.string().trim().min(1),
  filing_status: z.nativeEnum(FilingStatus),
}).strict();

export const publicInputSchema = z.object({
  asset: singleAssetSchema,
}).strict();

// These upstream aggregate deposits are still recognized solely so the node
// can reject them with a specific error. They are never a filing route.
export const inputSchema = z.object({
  asset: singleAssetSchema.optional(),
  section_179_deduction: z.number().nonnegative().optional(),
  section_179_cost: z.number().nonnegative().optional(),
  section_179_elected: z.number().nonnegative().optional(),
  section_179_carryover: z.number().nonnegative().optional(),
  business_income_limit: z.number().optional(),
  bonus_depreciation_basis: z.number().nonnegative().optional(),
  bonus_depreciation_basis_post_jan19: z.number().nonnegative().optional(),
  elect_out_bonus: z.boolean().optional(),
  elect_40pct_bonus: z.boolean().optional(),
  macrs_gds_basis: z.number().nonnegative().optional(),
  macrs_gds_recovery_period: z.number().positive().optional(),
  macrs_gds_year_of_service: z.number().int().min(1).optional(),
  macrs_gds_month_placed_in_service: z.number().int().min(1).max(12).optional(),
  macrs_prior_depreciation: z.number().nonnegative().optional(),
  is_listed_property: z.boolean().optional(),
  business_use_pct: z.number().min(0).max(100).optional(),
  is_luxury_auto: z.boolean().optional(),
  luxury_auto_year: z.number().int().min(1).optional(),
}).strict();

type Form4562Input = z.infer<typeof inputSchema>;

export const filedForm4562Schema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  business_reference: z.string().trim().min(1),
  activity_description: z.string().trim().min(1).max(40),
  asset_description: z.string().trim().min(1).max(100),
  source_document_ref: z.string().trim().min(1),
  taxpayer_active_business_income_source_ref: z.string().trim().min(1),
  taxpayer_active_business_income: z.number().int().nonnegative(),
  line1_maximum_dollar_limitation: z.number().int().nonnegative(),
  line2_total_cost: z.number().int().nonnegative(),
  line3_threshold_cost: z.number().int().nonnegative(),
  line4_reduction: z.number().int().nonnegative(),
  line5_dollar_limitation: z.number().int().nonnegative(),
  line6_elected_cost: z.number().int().nonnegative(),
  line8_total_elected_cost: z.number().int().nonnegative(),
  line9_tentative_deduction: z.number().int().nonnegative(),
  line10_prior_carryover: z.literal(0),
  line11_business_income_limitation: z.number().int().nonnegative(),
  line12_section179_expense_deduction: z.number().int().nonnegative(),
  line13_next_year_carryover: z.number().int().nonnegative(),
  line22_total_depreciation: z.number().int().nonnegative(),
});

function hasLegacyAggregate(input: Form4562Input): boolean {
  return Object.entries(input).some(([key, value]) =>
    key !== "asset" && value !== undefined
  );
}

function validServiceDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value);
}

class Form4562Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4562";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: Form4562Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (hasLegacyAggregate(input)) {
      throw new Error(
        "Form 4562 aggregate-only inputs cannot establish native asset rows or a valid Schedule C deduction",
      );
    }
    if (!input.asset) return { outputs: [] };
    const asset = input.asset;
    if (
      ctx.taxYear !== 2025 || !validServiceDate(asset.placed_in_service_date)
    ) {
      throw new Error(
        "Form 4562 single-asset path needs a valid 2025 placed-in-service date",
      );
    }
    if (asset.filing_status === FilingStatus.MFS) {
      throw new Error(
        "Form 4562 married-filing-separately section 179 allocation is not supported",
      );
    }
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) {
      throw new Error(`No Form 4562 limits for tax year ${ctx.taxYear}`);
    }
    if (asset.elected_cost !== asset.cost) {
      throw new Error(
        "Form 4562 single-asset path requires full-cost section 179 election; residual bonus/MACRS basis is not modeled",
      );
    }
    if (asset.cost > cfg.section179Limit) {
      throw new Error(
        "Form 4562 single-asset cost exceeds the bounded section 179 dollar limit",
      );
    }

    const line1 = Math.min(asset.cost, cfg.section179Limit);
    const line2 = asset.cost;
    const line3 = cfg.section179PhaseoutThreshold;
    const line4 = Math.max(0, line2 - line3);
    const line5 = Math.max(0, line1 - line4);
    const line8 = asset.elected_cost;
    const line9 = Math.min(line5, line8);
    const line11 = Math.min(asset.taxpayer_active_business_income, line5);
    const line12 = Math.min(line9, line11);
    const line13 = line9 - line12;
    const fields = filedForm4562Schema.parse({
      filing_status: asset.filing_status,
      business_reference: asset.business_reference,
      activity_description: asset.activity_description,
      asset_description: asset.asset_description,
      source_document_ref: asset.source_document_ref,
      taxpayer_active_business_income_source_ref:
        asset.taxpayer_active_business_income_source_ref,
      taxpayer_active_business_income: asset.taxpayer_active_business_income,
      line1_maximum_dollar_limitation: line1,
      line2_total_cost: line2,
      line3_threshold_cost: line3,
      line4_reduction: line4,
      line5_dollar_limitation: line5,
      line6_elected_cost: asset.elected_cost,
      line8_total_elected_cost: line8,
      line9_tentative_deduction: line9,
      line10_prior_carryover: 0,
      line11_business_income_limitation: line11,
      line12_section179_expense_deduction: line12,
      line13_next_year_carryover: line13,
      line22_total_depreciation: line12,
    });
    return {
      outputs: [{ nodeType: this.nodeType, fields }],
      ...(line13 > 0
        ? { carryforwards: { section179_disallowed_next_year: line13 } }
        : {}),
    };
  }
}

export const form4562 = new Form4562Node();
