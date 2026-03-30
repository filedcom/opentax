import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Filing Thresholds (IRC §6038D) ────────────────────────────────────

// Single / MFS filing in US: year-end >$50k OR max value >$75k during year
// MFJ filing in US: year-end >$100k OR max value >$150k during year
// Single living abroad: year-end >$200k OR max value >$300k
// MFJ living abroad: year-end >$400k OR max value >$600k
// Penalty for failure to file: $10,000 (and up to $50,000 for continued failure)

// Asset type categories
export enum ForeignAssetType {
  BankAccount = "bank_account",
  BrokerageAccount = "brokerage_account",
  ForeignStock = "foreign_stock",
  ForeignBond = "foreign_bond",
  ForeignPartnershipInterest = "foreign_partnership_interest",
  ForeignTrustInterest = "foreign_trust_interest",
  ForeignPensionPlan = "foreign_pension_plan",
  Other = "other",
}

const assetSchema = z.object({
  // Asset identification
  asset_type: z.nativeEnum(ForeignAssetType).optional(),
  description: z.string().optional(),
  country: z.string().optional(),                           // ISO 2-letter country code

  // Value information
  max_value_during_year: z.number().nonnegative().optional(),
  year_end_value: z.number().nonnegative().optional(),

  // Whether income from this asset was reported on the return
  income_reported: z.boolean().optional(),
  // Where on the return the income was reported (e.g. "Schedule B", "Schedule E")
  income_reported_on: z.string().optional(),
});

// Form 8938 — Statement of Specified Foreign Financial Assets
//
// Disclosure form required when aggregate value of specified foreign financial
// assets exceeds filing thresholds. No tax is computed — this is a FBAR-adjacent
// information reporting requirement.

export const inputSchema = z.object({
  // Filing residency context
  lives_abroad: z.boolean().optional(),
  filing_status: z.string().optional(),           // "single", "mfj", "mfs", etc.

  // Summary values
  max_value_all_assets: z.number().nonnegative().optional(),   // maximum aggregate during year
  year_end_value_all_assets: z.number().nonnegative().optional(),

  // Individual asset entries
  assets: z.array(assetSchema).optional(),

  // Whether any PFIC (Passive Foreign Investment Company) assets are held
  has_pfic: z.boolean().optional(),

  // Whether a foreign tax credit was claimed for any income from these assets
  foreign_tax_credit_claimed: z.boolean().optional(),
});

type F8938Input = z.infer<typeof inputSchema>;

class F8938Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8938";
  readonly inputSchema = inputSchema;
  // Form 8938 is disclosure only — no downstream tax-computation outputs.
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F8938Input): NodeResult {
    inputSchema.parse(rawInput);
    return { outputs: [] };
  }
}

export const f8938 = new F8938Node();
