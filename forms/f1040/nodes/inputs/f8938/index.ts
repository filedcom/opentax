import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// The continuous-use Form 8938 and instructions (Rev. November 2021) govern
// the TY2025 individual-return disclosure. This node does not file the form.
export enum ForeignAssetType {
  DepositAccount = "deposit_account",
  CustodialAccount = "custodial_account",
  OtherFinancialAccount = "other_financial_account",
  ForeignStock = "foreign_stock_not_in_account",
  ForeignSecurity = "foreign_security_not_in_account",
  ForeignEntityInterest = "foreign_entity_interest",
  ForeignTrustInterest = "foreign_trust_interest",
  ForeignPensionInterest = "foreign_pension_interest",
  Other = "other_specified_foreign_financial_asset",
}

const money = z.number().finite().nonnegative();
const foreignAddress = z.object({
  line1: z.string().max(35).regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/),
  line2: z.string().max(35).regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/)
    .optional(),
  city: z.string().max(50).regex(/^[A-Za-z]( ?[A-Za-z])*$/),
  province_or_state: z.string().min(1).max(17).optional(),
  country: z.string().regex(/^[A-Z]{2}$/),
  postal_code: z.string().min(1).max(16).optional(),
});
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => {
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(parsed) &&
      new Date(parsed).toISOString().slice(0, 10) === value;
  },
  "Enter a valid ISO calendar date",
);

const assetSchema = z.object({
  asset_id: z.string().min(1), // stable source-document identity
  asset_type: z.nativeEnum(ForeignAssetType),
  description: z.string().min(1),
  asset_identifier: z.string().min(1), // account number or asset identifier
  country: z.string().regex(/^[A-Z]{2}$/),
  institution_or_issuer_name: z.string().min(1),
  institution_or_issuer_address: foreignAddress,
  // Form 8938 Part VI lines 35c and 36a-c, when the asset is reported there.
  foreign_entity_type: z.enum(["partnership", "corporation", "trust", "estate"])
    .optional(),
  issuer_or_counterparty_role: z.enum(["issuer", "counterparty"]).optional(),
  issuer_or_counterparty_type: z.enum([
    "individual",
    "partnership",
    "corporation",
    "trust",
    "estate",
  ]).optional(),
  issuer_or_counterparty_is_us_person: z.boolean().optional(),
  owner: z.enum([
    "taxpayer",
    "spouse",
    "joint_with_spouse",
    "joint_with_other",
  ]),
  spouse_is_specified_individual: z.boolean().optional(), // MFS joint-asset threshold
  opened_or_acquired_date: date.optional(),
  closed_or_disposed_date: date.optional(),
  currency_code: z.string().regex(/^[A-Z]{3}$/),
  year_end_exchange_rate_usd_per_unit: z.number().finite().positive(),
  exchange_rate_source: z.string().min(1),
  exchange_rate_date: date,
  maximum_value_native: money,
  year_end_value_native: money,
  maximum_value_usd: money, // entire asset, including jointly owned assets
  year_end_value_usd: money,
  // Assets filed on these forms still count for an individual's threshold;
  // Part IV may replace repeated Part V/VI detail only with actual filed evidence.
  excepted_on_form: z.enum(["3520", "3520-A", "5471", "8621", "8865"])
    .optional(),
  filed_exception_form_reference: z.string().min(1).optional(),
  tax_items: z.array(z.object({
    kind: z.enum([
      "interest",
      "dividends",
      "royalties",
      "other_income",
      "gain_loss",
      "deduction",
      "credit",
    ]),
    amount_usd: z.number().finite(),
    filed_form_and_line: z.string().min(1),
  })),
}).superRefine((asset, ctx) => {
  const partV = asset.asset_type === ForeignAssetType.DepositAccount ||
    asset.asset_type === ForeignAssetType.CustodialAccount;
  const entity = asset.asset_type === ForeignAssetType.ForeignStock ||
    asset.asset_type === ForeignAssetType.ForeignEntityInterest ||
    asset.asset_type === ForeignAssetType.ForeignTrustInterest;
  if (!partV && entity && !asset.foreign_entity_type) {
    ctx.addIssue({
      code: "custom",
      path: ["foreign_entity_type"],
      message: "Part VI foreign entity type is required",
    });
  }
  if (
    asset.asset_type === ForeignAssetType.ForeignStock &&
    asset.foreign_entity_type !== "corporation"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["foreign_entity_type"],
      message: "Foreign stock must identify a corporation",
    });
  }
  if (
    asset.asset_type === ForeignAssetType.ForeignTrustInterest &&
    asset.foreign_entity_type !== "trust"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["foreign_entity_type"],
      message: "Foreign trust interest must identify a trust",
    });
  }
  if (
    !partV && !entity &&
    (!asset.issuer_or_counterparty_role || !asset.issuer_or_counterparty_type ||
      asset.issuer_or_counterparty_is_us_person === undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["issuer_or_counterparty_role"],
      message: "Part VI issuer or counterparty classification is required",
    });
  }
  if (
    asset.currency_code === "USD" &&
    asset.year_end_exchange_rate_usd_per_unit !== 1
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["year_end_exchange_rate_usd_per_unit"],
      message: "USD assets use a conversion rate of 1",
    });
  }
  if (asset.exchange_rate_date !== "2025-12-31") {
    ctx.addIssue({
      code: "custom",
      path: ["exchange_rate_date"],
      message: "Form 8938 uses the last-day-of-year exchange rate",
    });
  }
  for (
    const [native, usd] of [
      [asset.maximum_value_native, asset.maximum_value_usd],
      [asset.year_end_value_native, asset.year_end_value_usd],
    ]
  ) {
    if (
      Math.abs(native * asset.year_end_exchange_rate_usd_per_unit - usd) > 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maximum_value_usd"],
        message:
          "USD value does not reconcile to native value at the stated year-end rate",
      });
      break;
    }
  }
  if (asset.year_end_value_usd > asset.maximum_value_usd) {
    ctx.addIssue({
      code: "custom",
      path: ["year_end_value_usd"],
      message: "Year-end value exceeds annual maximum",
    });
  }
  if (
    asset.closed_or_disposed_date &&
    (asset.year_end_value_native !== 0 || asset.year_end_value_usd !== 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["year_end_value_usd"],
      message: "Disposed asset cannot have a year-end value",
    });
  }
  if (
    asset.opened_or_acquired_date && asset.closed_or_disposed_date &&
    asset.opened_or_acquired_date > asset.closed_or_disposed_date
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["closed_or_disposed_date"],
      message: "Disposition precedes acquisition",
    });
  }
  if (
    asset.opened_or_acquired_date &&
    asset.opened_or_acquired_date > "2025-12-31"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["opened_or_acquired_date"],
      message: "Asset was not held during TY2025",
    });
  }
  if (
    asset.closed_or_disposed_date &&
    (asset.closed_or_disposed_date < "2025-01-01" ||
      asset.closed_or_disposed_date > "2025-12-31")
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["closed_or_disposed_date"],
      message: "TY2025 disposition date must occur during TY2025",
    });
  }
  if (asset.excepted_on_form && !asset.filed_exception_form_reference) {
    ctx.addIssue({
      code: "custom",
      path: ["filed_exception_form_reference"],
      message: "Part IV exception needs an actual filed-form reference",
    });
  }
  if (!asset.excepted_on_form && asset.filed_exception_form_reference) {
    ctx.addIssue({
      code: "custom",
      path: ["excepted_on_form"],
      message: "Filed-form reference requires a Part IV form",
    });
  }
});

const usResidence = z.object({ location: z.literal("united_states") });
const abroadResidence = z.object({
  location: z.literal("qualifying_abroad"),
  foreign_tax_home_country: z.string().regex(/^[A-Z]{2}$/),
  presence_test: z.enum([
    "bona_fide_resident_full_year",
    "physical_presence_330_days",
  ]),
  qualifying_period_start: date,
  qualifying_period_end: date,
  full_days_abroad_in_period: z.number().int().min(0).max(366).optional(),
});

export const inputSchema = z.object({
  specified_individual_type: z.enum([
    "us_citizen",
    "resident_alien",
    "nonresident_joint_return_election",
  ]),
  annual_income_tax_return_required: z.boolean(),
  filing_status: z.enum(["single", "mfj", "mfs", "hoh", "qw"]),
  residence: z.discriminatedUnion("location", [usResidence, abroadResidence]),
  max_value_all_assets: money, // contemporaneous peak, not sum of per-asset maxima
  year_end_value_all_assets: money,
  assets: z.array(assetSchema).min(1),
}).superRefine((input, ctx) => {
  if (
    input.specified_individual_type === "nonresident_joint_return_election" &&
    input.filing_status !== "mfj"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["filing_status"],
      message: "Nonresident resident-election route requires a joint return",
    });
  }
  if (
    input.residence.location === "qualifying_abroad" &&
    input.residence.presence_test === "bona_fide_resident_full_year" &&
    input.specified_individual_type !== "us_citizen"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["residence", "presence_test"],
      message: "Bona fide residence abroad test requires U.S. citizenship",
    });
  }
  if (
    input.residence.location === "qualifying_abroad" &&
    input.specified_individual_type === "nonresident_joint_return_election"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["residence"],
      message:
        "Abroad threshold needs separate resident status review for an elected nonresident spouse",
    });
  }
  if (input.residence.location === "qualifying_abroad") {
    const residence = input.residence;
    if (residence.presence_test === "bona_fide_resident_full_year") {
      if (
        residence.qualifying_period_start > "2025-01-01" ||
        residence.qualifying_period_end < "2025-12-31"
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["residence"],
          message: "Bona fide residence must include the entire TY2025 year",
        });
      }
    } else {
      const [year, month, day] = residence.qualifying_period_start.split("-")
        .map(Number);
      const expectedEnd = new Date(
        Date.UTC(year + 1, month - 1, day) - 86_400_000,
      )
        .toISOString().slice(0, 10);
      if (
        residence.qualifying_period_end !== expectedEnd ||
        residence.qualifying_period_end < "2025-01-01" ||
        residence.qualifying_period_end > "2025-12-31" ||
        (residence.full_days_abroad_in_period ?? 0) < 330
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["residence"],
          message:
            "Physical presence needs 330 full foreign days in a 12-month period ending in TY2025",
        });
      }
    }
  }
  const ids = new Set<string>();
  let yearEnd = 0;
  let upperBound = 0;
  let lowerBound = 0;
  for (let i = 0; i < input.assets.length; i++) {
    const asset = input.assets[i];
    if (ids.has(asset.asset_id)) {
      ctx.addIssue({
        code: "custom",
        path: ["assets", i, "asset_id"],
        message: "Duplicate asset source identity",
      });
    }
    ids.add(asset.asset_id);
    if (input.filing_status !== "mfj" && asset.owner === "spouse") {
      ctx.addIssue({
        code: "custom",
        path: ["assets", i, "owner"],
        message: "Spouse-only asset is not owned by this separate filer",
      });
    }
    if (
      input.filing_status !== "mfj" && input.filing_status !== "mfs" &&
      asset.owner === "joint_with_spouse"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["assets", i, "owner"],
        message: "Spousal joint ownership requires married filing status",
      });
    }
    if (
      asset.owner === "joint_with_spouse" && input.filing_status === "mfs" &&
      asset.spouse_is_specified_individual === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["assets", i, "spouse_is_specified_individual"],
        message: "MFS joint valuation needs spouse specified-individual status",
      });
    }
    const factor =
      input.filing_status === "mfs" && asset.owner === "joint_with_spouse" &&
        asset.spouse_is_specified_individual
        ? 0.5
        : 1;
    yearEnd += asset.year_end_value_usd * factor;
    upperBound += asset.maximum_value_usd * factor;
    lowerBound = Math.max(lowerBound, asset.maximum_value_usd * factor);
  }
  if (Math.abs(yearEnd - input.year_end_value_all_assets) > 1) {
    ctx.addIssue({
      code: "custom",
      path: ["year_end_value_all_assets"],
      message:
        "Year-end aggregate must reconcile to ownership-adjusted asset values",
    });
  }
  if (
    input.max_value_all_assets < lowerBound - 1 ||
    input.max_value_all_assets > upperBound + 1 ||
    input.max_value_all_assets < input.year_end_value_all_assets - 1
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["max_value_all_assets"],
      message:
        "Contemporaneous peak is outside the bounds from the asset ledger",
    });
  }
});

export type F8938Input = z.infer<typeof inputSchema>;

export interface F8938Summary {
  partI: {
    depositAccountCount: number;
    depositMaximumValueUsd: number;
    custodialAccountCount: number;
    custodialMaximumValueUsd: number;
    anyAccountClosed: boolean;
  };
  partII: {
    otherAssetCount: number;
    otherMaximumValueUsd: number;
    anyAssetOpenedOrClosed: boolean;
  };
  partIV: Record<"3520" | "3520-A" | "5471" | "8621" | "8865", number>;
}

/** Parts I, II and IV use Form 8938 detail/exception reporting, not threshold shares. */
export function deriveF8938Summary(input: F8938Input): F8938Summary {
  const summary: F8938Summary = {
    partI: {
      depositAccountCount: 0,
      depositMaximumValueUsd: 0,
      custodialAccountCount: 0,
      custodialMaximumValueUsd: 0,
      anyAccountClosed: false,
    },
    partII: {
      otherAssetCount: 0,
      otherMaximumValueUsd: 0,
      anyAssetOpenedOrClosed: false,
    },
    partIV: { "3520": 0, "3520-A": 0, "5471": 0, "8621": 0, "8865": 0 },
  };
  const exceptedForms = new Set<string>();
  for (const asset of input.assets) {
    if (asset.excepted_on_form) {
      const key =
        `${asset.excepted_on_form}:${asset.filed_exception_form_reference}`;
      if (!exceptedForms.has(key)) {
        summary.partIV[asset.excepted_on_form]++;
        exceptedForms.add(key);
      }
      continue;
    }
    if (asset.asset_type === ForeignAssetType.DepositAccount) {
      summary.partI.depositAccountCount++;
      summary.partI.depositMaximumValueUsd += asset.maximum_value_usd;
      summary.partI.anyAccountClosed ||= !!asset.closed_or_disposed_date;
    } else if (asset.asset_type === ForeignAssetType.CustodialAccount) {
      summary.partI.custodialAccountCount++;
      summary.partI.custodialMaximumValueUsd += asset.maximum_value_usd;
      summary.partI.anyAccountClosed ||= !!asset.closed_or_disposed_date;
    } else {
      summary.partII.otherAssetCount++;
      summary.partII.otherMaximumValueUsd += asset.maximum_value_usd;
      summary.partII.anyAssetOpenedOrClosed ||=
        !!asset.opened_or_acquired_date ||
        !!asset.closed_or_disposed_date;
    }
  }
  return summary;
}

export function form8938ThresholdDecision(input: F8938Input): {
  yearEndThreshold: number;
  anyTimeThreshold: number;
  filingRequired: boolean;
} {
  const abroad = input.residence.location === "qualifying_abroad";
  const joint = input.filing_status === "mfj";
  const yearEndThreshold = abroad
    ? (joint ? 400_000 : 200_000)
    : (joint ? 100_000 : 50_000);
  const anyTimeThreshold = abroad
    ? (joint ? 600_000 : 300_000)
    : (joint ? 150_000 : 75_000);
  return {
    yearEndThreshold,
    anyTimeThreshold,
    filingRequired: input.annual_income_tax_return_required &&
      (input.year_end_value_all_assets > yearEndThreshold ||
        input.max_value_all_assets > anyTimeThreshold),
  };
}

class F8938Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8938";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F8938Input): NodeResult {
    inputSchema.parse(rawInput);
    return { outputs: [] }; // information disclosure, no tax computation
  }
}

export const f8938 = new F8938Node();
