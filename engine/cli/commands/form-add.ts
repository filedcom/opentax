import { appendInput, loadInputs, nextId } from "../store/store.ts";
import { registry } from "../../registry.ts";
import type { InputEntry } from "../store/types.ts";
import { join } from "@std/path";

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

export async function formAddCommand(args: FormAddArgs): Promise<FormAddResult> {
  // 1. Parse JSON
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(args.dataJson);
  } catch {
    throw new Error(`Invalid JSON: ${args.dataJson}`);
  }

  // 2. Validate against node's inputSchema
  const node = registry[args.nodeType];
  if (!node) {
    throw new Error(`Unknown node type: ${args.nodeType}`);
  }

  // Wrap the user-supplied inner data with the nodeType key to match schema shape
  const wrappedInput = { [args.nodeType]: data };
  const parsed = node.inputSchema.safeParse(wrappedInput);
  if (!parsed.success) {
    throw new Error(`Validation error: ${parsed.error.message}`);
  }

  // 3. Assign stable ID and append
  const returnPath = join(args.baseDir, args.returnId);
  const existing = await loadInputs(returnPath);
  const id = nextId(existing, args.nodeType);
  const entry: InputEntry = { id, nodeType: args.nodeType, data };
  await appendInput(returnPath, entry);

  return { id, nodeType: args.nodeType };
}
