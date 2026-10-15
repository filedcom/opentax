import {
  claimInputSchema as scheduleASchema,
  schedule_a_2026,
} from "./nodes/schedule-a.ts";
import {
  claimInputSchema as form8919Schema,
  form8919_2026,
} from "./inputs/form8919.ts";
import { ct2_2026, ct2Item2026Schema } from "./inputs/ct2.ts";
import {
  claimInputSchema as form4137Schema,
  form4137_2026,
} from "./inputs/form4137.ts";
import {
  vehicle_loan_interest_2026,
  vehicleLoan2026Schema,
} from "./inputs/vehicle-loan-interest.ts";
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
  { node: schedule_a_2026, isArray: false, inputSchema: scheduleASchema },
  { node: form8919_2026, isArray: false, inputSchema: form8919Schema },
  {
    node: ct2_2026,
    isArray: true,
    inputKey: "ct2s",
    itemSchema: ct2Item2026Schema,
  },
  { node: form4137_2026, isArray: false, inputSchema: form4137Schema },
  {
    node: vehicle_loan_interest_2026,
    isArray: true,
    inputKey: "vehicle_loans",
    itemSchema: vehicleLoan2026Schema,
  },
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
