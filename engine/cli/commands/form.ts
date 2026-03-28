import { join } from "@std/path";
import { registry } from "../../nodes/2025/registry.ts";
import { w2ItemSchema } from "../../nodes/2025/f1040/inputs/w2/index.ts";
import { appendInput } from "../store/store.ts";
import type { ZodTypeAny } from "zod";

// Per-entry validation schemas for nodes whose inputSchema wraps an array.
// All other nodes are validated directly against node.inputSchema.
const entrySchemas: Record<string, ZodTypeAny> = {
  w2: w2ItemSchema,
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
