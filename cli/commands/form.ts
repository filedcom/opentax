import { join } from "@std/path";
import { catalog } from "../../catalog.ts";
import { appendInput, loadMeta } from "../store/store.ts";

function getCatalogEntry(formType: string, year: number) {
  const key = `${formType}:${year}`;
  const def = catalog[key];
  if (!def) throw new Error(`Unsupported form: ${key}`);
  return def;
}

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

  const returnPath = join(args.baseDir, args.returnId);
  const meta = await loadMeta(returnPath);
  const def = getCatalogEntry(meta.formType ?? "f1040", meta.year);

  // Per-entry validation schemas derived from inputNodes for array-type nodes.
  // Each entry is validated as a single item; the store accumulates them into an array.
  // All other nodes (general, schedule_a, ext, schedule_d) are validated directly against node.inputSchema.
  const entrySchemas = Object.fromEntries(
    def.inputNodes
      .filter((e): e is Extract<typeof e, { isArray: true }> => e.isArray)
      .map((e) => [e.node.nodeType, e.itemSchema]),
  );

  const node = def.registry[args.nodeType];
  if (!node) {
    throw new Error(`Unknown node type: ${args.nodeType}`);
  }

  const schema = entrySchemas[args.nodeType] ?? node.inputSchema;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Validation error: ${parsed.error.message}`);
  }

  const { id } = await appendInput(returnPath, args.nodeType, data);

  return { id, nodeType: args.nodeType };
}
