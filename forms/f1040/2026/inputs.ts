import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import { general } from "../nodes/inputs/general/index.ts";
import { w2, w2ItemSchema } from "../nodes/inputs/w2/index.ts";
import {
  f1098e,
  itemSchema as f1098eItemSchema,
} from "../nodes/inputs/f1098e/index.ts";
import {
  f1099g,
  itemSchema as f1099gItemSchema,
} from "../nodes/inputs/f1099g/index.ts";
import { form4137 } from "../nodes/intermediate/forms/form4137/index.ts";
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

export const inputNodes: readonly InputNodeEntry[] = [
  { node: general, inputSchema: general.inputSchema, isArray: false },
  { node: w2, itemSchema: w2ItemSchema, isArray: true },
  { node: f1098e, itemSchema: f1098eItemSchema, isArray: true },
  { node: f1099g, itemSchema: f1099gItemSchema2026, isArray: true },
  { node: form4137, inputSchema: form4137.inputSchema, isArray: false },
  { node: schedule1a, inputSchema: schedule1AClaimInputSchema, isArray: false },
];
