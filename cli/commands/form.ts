import { join } from "@std/path";
import { catalog } from "../../catalog.ts";
import type { FormDefinition } from "../../core/types/form-definition.ts";
import {
  appendInput,
  deleteInput,
  getInput,
  listInputs,
  loadMeta,
  updateInput,
} from "../store/store.ts";

function getCatalogEntry(formType: string, year: number) {
  const key = `${formType}:${year}`;
  const def = catalog[key];
  if (!def) throw new Error(`Unsupported form: ${key}`);
  return def;
}

function getUserInputSchema(def: FormDefinition, nodeType: string) {
  const entry = def.inputNodes.find((candidate) => candidate.node.nodeType === nodeType);
  if (entry) return entry.isArray ? entry.itemSchema : entry.inputSchema;

  // The start node is the graph's composite input and is routed directly.
  if (nodeType === "start") return def.registry.start.inputSchema;

  throw new Error(
    `Node type ${nodeType} is not a valid input for ${def.formType}/${def.taxYear}`,
  );
}

// ─── form add ─────────────────────────────────────────────────────────────────

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

  const node = def.registry[args.nodeType];
  if (!node) {
    throw new Error(`Unknown node type: ${args.nodeType}`);
  }

  const schema = getUserInputSchema(def, args.nodeType);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Validation error: ${parsed.error.message}`);
  }

  const { id } = await appendInput(returnPath, args.nodeType, data);

  return { id, nodeType: args.nodeType };
}

// ─── form list ────────────────────────────────────────────────────────────────

export type FormListArgs = {
  readonly returnId: string;
  readonly baseDir: string;
  readonly nodeType?: string;
};

export type FormListEntry = {
  readonly id: string;
  readonly nodeType: string;
  readonly fields: Readonly<Record<string, unknown>>;
};

export async function formListCommand(
  args: FormListArgs,
): Promise<readonly FormListEntry[]> {
  const returnPath = join(args.baseDir, args.returnId);
  const entries = await listInputs(returnPath);
  if (args.nodeType) {
    return entries.filter((e) => e.nodeType === args.nodeType);
  }
  return entries;
}

// ─── form get ─────────────────────────────────────────────────────────────────

export type FormGetArgs = {
  readonly returnId: string;
  readonly entryId: string;
  readonly baseDir: string;
};

export async function formGetCommand(
  args: FormGetArgs,
): Promise<FormListEntry> {
  const returnPath = join(args.baseDir, args.returnId);
  return getInput(returnPath, args.entryId);
}

// ─── form update ──────────────────────────────────────────────────────────────

export type FormUpdateArgs = {
  readonly returnId: string;
  readonly entryId: string;
  readonly dataJson: string;
  readonly baseDir: string;
};

export type FormUpdateResult = {
  readonly id: string;
  readonly nodeType: string;
};

export async function formUpdateCommand(
  args: FormUpdateArgs,
): Promise<FormUpdateResult> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(args.dataJson);
  } catch {
    throw new Error(`Invalid JSON: ${args.dataJson}`);
  }

  const returnPath = join(args.baseDir, args.returnId);
  const meta = await loadMeta(returnPath);
  const def = getCatalogEntry(meta.formType ?? "f1040", meta.year);

  // Find the existing entry to determine its nodeType for validation
  const existing = await getInput(returnPath, args.entryId);

  const node = def.registry[existing.nodeType];
  if (!node) {
    throw new Error(`Unknown node type: ${existing.nodeType}`);
  }

  const schema = getUserInputSchema(def, existing.nodeType);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Validation error: ${parsed.error.message}`);
  }

  return updateInput(returnPath, args.entryId, data);
}

// ─── form delete ──────────────────────────────────────────────────────────────

export type FormDeleteArgs = {
  readonly returnId: string;
  readonly entryId: string;
  readonly baseDir: string;
};

export type FormDeleteResult = {
  readonly id: string;
  readonly nodeType: string;
};

export async function formDeleteCommand(
  args: FormDeleteArgs,
): Promise<FormDeleteResult> {
  const returnPath = join(args.baseDir, args.returnId);
  return deleteInput(returnPath, args.entryId);
}
