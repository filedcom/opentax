import {
  claimInputSchema as schedule1aSchema,
  schedule1a_2026,
} from "./nodes/schedule1a.ts";
import {
  cash_charity_2026,
  cashGift2026Schema,
} from "./inputs/cash-charity.ts";
import {
  general_2026,
  inputSchema as generalSchema,
} from "./inputs/general.ts";
import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import { w2_2026, w2Item2026Schema } from "./inputs/w2.ts";

/**
 * Incremental 2026 source catalog, not yet registered as a filing product.
 * The general node supplies filing_status/taxpayer_ssn/spouse_ssn to W-2;
 * identity is not repeated or trusted independently on each public input row.
 */
export const inputNodes: readonly InputNodeEntry[] = [
  { node: schedule1a_2026, isArray: false, inputSchema: schedule1aSchema },
  { node: general_2026, isArray: false, inputSchema: generalSchema },
  {
    node: cash_charity_2026,
    isArray: true,
    inputKey: "cash_gifts",
    itemSchema: cashGift2026Schema,
  },
  {
    node: w2_2026,
    isArray: true,
    inputKey: "w2s",
    itemSchema: w2Item2026Schema,
  },
];
