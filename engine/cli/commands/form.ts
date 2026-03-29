import { join } from "@std/path";
import { registry } from "../../nodes/2025/registry.ts";
import { w2ItemSchema } from "../../forms/f1040/nodes/inputs/w2/index.ts";
import { itemSchema as f1098ItemSchema } from "../../forms/f1040/nodes/inputs/f1098/index.ts";
import { itemSchema as f1099bItemSchema } from "../../forms/f1040/nodes/inputs/f1099b/index.ts";
import { itemSchema as f1099cItemSchema } from "../../forms/f1040/nodes/inputs/f1099c/index.ts";
import { itemSchema as f1099divItemSchema } from "../../forms/f1040/nodes/inputs/f1099div/index.ts";
import { itemSchema as f1099gItemSchema } from "../../forms/f1040/nodes/inputs/f1099g/index.ts";
import { itemSchema as f1099intItemSchema } from "../../forms/f1040/nodes/inputs/f1099int/index.ts";
import { itemSchema as f1099kItemSchema } from "../../forms/f1040/nodes/inputs/f1099k/index.ts";
import { itemSchema as f1099mItemSchema } from "../../forms/f1040/nodes/inputs/f1099m/index.ts";
import { itemSchema as f1099necItemSchema } from "../../forms/f1040/nodes/inputs/f1099nec/index.ts";
import { itemSchema as f1099rItemSchema } from "../../forms/f1040/nodes/inputs/f1099r/index.ts";
import { itemSchema as f2441ItemSchema } from "../../forms/f1040/nodes/inputs/f2441/index.ts";
import { itemSchema as f8812ItemSchema } from "../../forms/f1040/nodes/inputs/f8812/index.ts";
import { itemSchema as f8863ItemSchema } from "../../forms/f1040/nodes/inputs/f8863/index.ts";
import { itemSchema as f8949ItemSchema } from "../../forms/f1040/nodes/inputs/f8949/index.ts";
import { itemSchema as scheduleCItemSchema } from "../../forms/f1040/nodes/inputs/schedule_c/index.ts";
import { itemSchema as scheduleEItemSchema } from "../../forms/f1040/nodes/inputs/schedule_e/index.ts";
import { itemSchema as ssaItemSchema } from "../../forms/f1040/nodes/inputs/ssa1099/index.ts";
import { appendInput } from "../store/store.ts";
import type { ZodTypeAny } from "zod";

// Per-entry validation schemas for nodes whose inputSchema wraps an array.
// Each entry is validated as a single item; the store accumulates them into an array.
// All other nodes (general, schedule_a, ext, schedule_d) are validated directly against node.inputSchema.
const entrySchemas: Record<string, ZodTypeAny> = {
  w2: w2ItemSchema,
  f1098: f1098ItemSchema,
  f1099b: f1099bItemSchema,
  f1099c: f1099cItemSchema,
  f1099div: f1099divItemSchema,
  f1099g: f1099gItemSchema,
  f1099int: f1099intItemSchema,
  f1099k: f1099kItemSchema,
  f1099m: f1099mItemSchema,
  f1099nec: f1099necItemSchema,
  f1099r: f1099rItemSchema,
  f2441: f2441ItemSchema,
  f8812: f8812ItemSchema,
  f8863: f8863ItemSchema,
  f8949: f8949ItemSchema,
  schedule_c: scheduleCItemSchema,
  schedule_e: scheduleEItemSchema,
  ssa1099: ssaItemSchema,
};

export type FormAddArgs = {
  readonly returnId: string;
  readonly nodeType: string;
  readonly dataJson: string;
  readonly baseDir: string;
};

export type FormAddResult = {
  readonly id: string;
  readonly nodeType: string;
};

export async function formAddCommand(
  args: FormAddArgs,
): Promise<FormAddResult> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(args.dataJson);
  } catch {
    throw new Error(`Invalid JSON: ${args.dataJson}`);
  }

  const node = registry[args.nodeType];
  if (!node) {
    throw new Error(`Unknown node type: ${args.nodeType}`);
  }

  const schema = entrySchemas[args.nodeType] ?? node.inputSchema;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Validation error: ${parsed.error.message}`);
  }

  const returnPath = join(args.baseDir, args.returnId);
  const { id } = await appendInput(returnPath, args.nodeType, data);

  return { id, nodeType: args.nodeType };
}
