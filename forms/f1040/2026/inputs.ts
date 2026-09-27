import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import { z } from "zod";
import { general } from "../nodes/inputs/general/index.ts";
import { w2, w2ItemSchema } from "../nodes/inputs/w2/index.ts";
import { ssa1099_2026, ssa1099Item2026Schema } from "./nodes/ssa1099.ts";
import {
  f1098e,
  itemSchema as f1098eItemSchema,
} from "../nodes/inputs/f1098e/index.ts";
import {
  f1099g,
  itemSchema as f1099gItemSchema,
} from "../nodes/inputs/f1099g/index.ts";
import {
  f1099int,
  itemSchema as f1099intItemSchema,
} from "../nodes/inputs/f1099int/index.ts";
import { schedule_b_2026 } from "./nodes/schedule_b.ts";
import { schedule_d } from "../nodes/intermediate/aggregation/schedule_d/index.ts";
import { f1099div_2026, f1099divItem2026Schema } from "./nodes/f1099div.ts";
import { f1099b_2026, f1099bItem2026Schema } from "./nodes/f1099b.ts";
import { f1099da_2026, f1099daItem2026Schema } from "./nodes/f1099da.ts";
import { f8949_2026, f8949Item2026Schema } from "./nodes/f8949.ts";
import { schedule_h_2026 } from "./nodes/schedule_h.ts";
import { f5695_2026 } from "./nodes/f5695.ts";
import { form4137 } from "../nodes/intermediate/forms/form4137/index.ts";
import { f8812_facts_2026 } from "./nodes/f8812_facts.ts";
import {
  claimInputSchema as schedule1AClaimInputSchema,
  schedule1a,
} from "../nodes/intermediate/forms/schedule1a/index.ts";

/** Input surface backed by the currently verified TY2026 calculation graph. */
const f1099gItemSchema2026 = f1099gItemSchema.omit({
  box_10a_state: true,
  box_10b_state_id: true,
  box_11_state_withheld: true,
}).strict();

/** Affirmative return-level facts required for the capital-gain filing decision. */
export const capitalActivityInput2026Schema = z.object({
  line_6_carryover: z.number().finite().nonnegative(),
  line_14_carryover: z.number().finite().nonnegative(),
  qof_disposition: z.boolean(),
  qof_deferral_or_inclusion: z.boolean(),
  // Activity outside the explicit 1099-B, 1099-DA, 1099-DIV, and f8949 inputs.
  other_capital_activity: z.boolean(),
  form4952_filing: z.boolean(),
}).strict();

export const inputNodes: readonly InputNodeEntry[] = [
  { node: general, inputSchema: general.inputSchema, isArray: false },
  { node: w2, itemSchema: w2ItemSchema, isArray: true },
  { node: ssa1099_2026, itemSchema: ssa1099Item2026Schema, isArray: true },
  { node: f1098e, itemSchema: f1098eItemSchema, isArray: true },
  { node: f1099g, itemSchema: f1099gItemSchema2026, isArray: true },
  { node: f1099int, itemSchema: f1099intItemSchema.strict(), isArray: true },
  { node: f1099div_2026, itemSchema: f1099divItem2026Schema, isArray: true },
  { node: f1099b_2026, itemSchema: f1099bItem2026Schema, isArray: true },
  { node: f1099da_2026, itemSchema: f1099daItem2026Schema, isArray: true },
  { node: f8949_2026, itemSchema: f8949Item2026Schema, isArray: true },
  {
    node: schedule_h_2026,
    inputSchema: schedule_h_2026.inputSchema,
    isArray: false,
  },
  { node: f5695_2026, inputSchema: f5695_2026.inputSchema, isArray: false },
  {
    node: schedule_d,
    inputSchema: capitalActivityInput2026Schema,
    isArray: false,
  },
  {
    node: schedule_b_2026,
    inputSchema: schedule_b_2026.inputSchema.pick({
      foreign_account: true,
      fbar_required: true,
      foreign_countries: true,
      foreign_trust: true,
    }).strict(),
    isArray: false,
  },
  { node: form4137, inputSchema: form4137.inputSchema, isArray: false },
  {
    node: f8812_facts_2026,
    inputSchema: f8812_facts_2026.inputSchema,
    isArray: false,
  },
  { node: schedule1a, inputSchema: schedule1AClaimInputSchema, isArray: false },
];
