import { join } from "node:path";
import { z } from "zod";
import { catalog } from "../../catalog.ts";
import type { FormDefinition } from "../../core/types/form-definition.ts";
import {
  appendInput,
  deleteInput,
  getInput,
  listInputs,
  loadInputs,
  loadMeta,
  updateInput,
} from "../store/store.ts";
import {
  detachInlineBytes,
  resolveSourceBytes,
} from "./return-source-files.ts";

function getCatalogEntry(formType: string, year: number) {
  const key = `${formType}:${year}`;
  const def = catalog[key];
  if (!def) throw new Error(`Unsupported form: ${key}`);
  return def;
}

export function getUserInputSchema(def: FormDefinition, nodeType: string) {
  const entry = def.inputNodes.find((candidate) =>
    (candidate.inputKey ?? candidate.node.nodeType) === nodeType
  );
  if (entry) return entry.isArray ? entry.itemSchema : entry.inputSchema;

  // The start node is the graph's composite input and is routed directly.
  if (nodeType === "start") return def.registry.start.inputSchema;

  throw new Error(
    `Node type ${nodeType} is not a valid input for ${def.formType}/${def.taxYear}`,
  );
}

export function rejectUnknownFields(
  schema: z.ZodTypeAny,
  data: unknown,
): void {
  // Input schemas may wrap their object in superRefine. Inspect the original
  // shape before Zod's default object parsing strips misspelled fields.
  const objectSchema = schema instanceof z.ZodEffects
    ? schema.innerType()
    : schema;
  if (
    !(objectSchema instanceof z.ZodObject) ||
    data === null || typeof data !== "object" || Array.isArray(data)
  ) return;
  const unknown = Object.keys(data).filter((key) =>
    !(key in objectSchema.shape)
  );
  if (unknown.length > 0) {
    throw new Error(
      `Validation error: Unrecognized field${
        unknown.length === 1 ? "" : "s"
      }: ${unknown.join(", ")}`,
    );
  }
}

/** Inline source bytes are stored as digests of files in retained/. */
function storedFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return detachInlineBytes(fields).value;
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
  readonly hint?: string;
};

/** A box 7 code 3 disability distribution can qualify a recipient under 65
 * for the credit for the elderly or the disabled (2025 Schedule R, Part I
 * boxes 2, 4, 5, 6 and 9). */
function addHint(
  nodeType: string,
  fields: Readonly<Record<string, unknown>>,
  inputs: Readonly<Record<string, readonly unknown[]>>,
): string | undefined {
  if (nodeType !== "f1099r" || inputs["schedule_r"]?.length) return undefined;
  if (
    fields["box7_distribution_code"] !== "3" && fields["box7_code2"] !== "3"
  ) return undefined;
  return "Box 7 code 3 is a disability distribution: if the recipient is under 65 and retired on permanent and total disability, add schedule_r for the credit for the elderly or the disabled ('opentax node template schedule_r --full').";
}

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

  if (
    args.nodeType !== "start" &&
    !def.inputNodes.some((entry) =>
      (entry.inputKey ?? entry.node.nodeType) === args.nodeType
    )
  ) {
    throw new Error(`Unknown node type: ${args.nodeType}`);
  }

  const schema = getUserInputSchema(def, args.nodeType);
  rejectUnknownFields(schema, data);
  const parsed = schema.safeParse(await resolveSourceBytes(returnPath, data));
  if (!parsed.success) {
    throw new Error(`Validation error: ${parsed.error.message}`);
  }

  const publicEntry = def.inputNodes.find((entry) =>
    (entry.inputKey ?? entry.node.nodeType) === args.nodeType
  );
  const existing = await loadInputs(returnPath);
  if (
    publicEntry && !publicEntry.isArray && existing[args.nodeType]?.length
  ) {
    throw new Error(`Singleton input ${args.nodeType} already exists`);
  }

  const { id } = await appendInput(
    returnPath,
    args.nodeType,
    storedFields(parsed.data),
  );

  const hint = addHint(args.nodeType, data, existing);
  return { id, nodeType: args.nodeType, ...(hint ? { hint } : {}) };
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

export function formGetCommand(
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

  if (
    existing.nodeType !== "start" &&
    !def.inputNodes.some((entry) =>
      (entry.inputKey ?? entry.node.nodeType) === existing.nodeType
    )
  ) {
    throw new Error(`Unknown node type: ${existing.nodeType}`);
  }

  const schema = getUserInputSchema(def, existing.nodeType);
  rejectUnknownFields(schema, data);
  const parsed = schema.safeParse(await resolveSourceBytes(returnPath, data));
  if (!parsed.success) {
    throw new Error(`Validation error: ${parsed.error.message}`);
  }

  return updateInput(returnPath, args.entryId, storedFields(parsed.data));
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

export function formDeleteCommand(
  args: FormDeleteArgs,
): Promise<FormDeleteResult> {
  const returnPath = join(args.baseDir, args.returnId);
  return deleteInput(returnPath, args.entryId);
}
