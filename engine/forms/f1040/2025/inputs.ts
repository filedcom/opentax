import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import { ext, inputSchema as extInputSchema } from "../nodes/inputs/ext/index.ts";
import { f1098, itemSchema as f1098ItemSchema } from "../nodes/inputs/f1098/index.ts";
import { f1099b, itemSchema as f1099bItemSchema } from "../nodes/inputs/f1099b/index.ts";
import { f1099c, itemSchema as f1099cItemSchema } from "../nodes/inputs/f1099c/index.ts";
import { f1099div, itemSchema as f1099divItemSchema } from "../nodes/inputs/f1099div/index.ts";
import { f1099g, itemSchema as f1099gItemSchema } from "../nodes/inputs/f1099g/index.ts";
import { f1099int, itemSchema as f1099intItemSchema } from "../nodes/inputs/f1099int/index.ts";
import { f1099k, itemSchema as f1099kItemSchema } from "../nodes/inputs/f1099k/index.ts";
import { f1099m, itemSchema as f1099mItemSchema } from "../nodes/inputs/f1099m/index.ts";
import { f1099nec, itemSchema as f1099necItemSchema } from "../nodes/inputs/f1099nec/index.ts";
import { f1099r, itemSchema as f1099rItemSchema } from "../nodes/inputs/f1099r/index.ts";
import { f2441, itemSchema as f2441ItemSchema } from "../nodes/inputs/f2441/index.ts";
import { f8812, itemSchema as f8812ItemSchema } from "../nodes/inputs/f8812/index.ts";
import { f8863, itemSchema as f8863ItemSchema } from "../nodes/inputs/f8863/index.ts";
import { f8949, itemSchema as f8949ItemSchema } from "../nodes/inputs/f8949/index.ts";
import { general, inputSchema as generalInputSchema } from "../nodes/inputs/general/index.ts";
import { inputSchema as scheduleAInputSchema, scheduleA } from "../nodes/inputs/schedule_a/index.ts";
import { itemSchema as scheduleCItemSchema, scheduleC } from "../nodes/inputs/schedule_c/index.ts";
import { itemSchema as scheduleEItemSchema, scheduleE } from "../nodes/inputs/schedule_e/index.ts";
import { itemSchema as ssaItemSchema, ssa1099 } from "../nodes/inputs/ssa1099/index.ts";
import { w2, w2ItemSchema } from "../nodes/inputs/w2/index.ts";
import { inputSchema as scheduleDInputSchema, schedule_d } from "../nodes/intermediate/schedule_d/index.ts";

export const inputNodes: readonly InputNodeEntry[] = [
  // Array inputs (22): each item represents a single form instance
  { node: w2, itemSchema: w2ItemSchema, isArray: true },
  { node: f1099int, itemSchema: f1099intItemSchema, isArray: true },
  { node: f1099div, itemSchema: f1099divItemSchema, isArray: true },
  { node: f1099nec, itemSchema: f1099necItemSchema, isArray: true },
  { node: f1099g, itemSchema: f1099gItemSchema, isArray: true },
  { node: f1099m, itemSchema: f1099mItemSchema, isArray: true },
  { node: f1099c, itemSchema: f1099cItemSchema, isArray: true },
  { node: f1099k, itemSchema: f1099kItemSchema, isArray: true },
  { node: f1099b, itemSchema: f1099bItemSchema, isArray: true },
  { node: f1099r, itemSchema: f1099rItemSchema, isArray: true },
  { node: f1098, itemSchema: f1098ItemSchema, isArray: true },
  { node: f2441, itemSchema: f2441ItemSchema, isArray: true },
  { node: f8812, itemSchema: f8812ItemSchema, isArray: true },
  { node: f8863, itemSchema: f8863ItemSchema, isArray: true },
  { node: f8949, itemSchema: f8949ItemSchema, isArray: true },
  { node: scheduleC, itemSchema: scheduleCItemSchema, isArray: true },
  { node: scheduleE, itemSchema: scheduleEItemSchema, isArray: true },
  { node: ssa1099, itemSchema: ssaItemSchema, isArray: true },
  // Singleton inputs (4): entire form as a single object
  { node: scheduleA, inputSchema: scheduleAInputSchema, isArray: false },
  { node: schedule_d, inputSchema: scheduleDInputSchema, isArray: false },
  { node: ext, inputSchema: extInputSchema, isArray: false },
  { node: general, inputSchema: generalInputSchema, isArray: false },
];
