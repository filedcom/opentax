import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import type {
  InputsJson,
  MetaJson,
  NodeInputEntry,
  ReturnJson,
} from "./types.ts";

export function buildEngineInputs(inputs: InputsJson): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [nodeType, entries] of Object.entries(inputs)) {
    if (nodeType === "start") {
      // Start entries contain start-node input fields directly (e.g. { general: {...} }).
      // Merge them all into the top-level so the start node can find each field by key.
      for (const entry of entries) {
        Object.assign(result, entry.fields);
      }
    } else {
      // All other node types are array inputs; the start node collects them by nodeType key.
      result[nodeType] = entries.map((e) => e.fields);
    }
  }
  return result;
}

const RETURN_JSON = "return.json";

async function readReturnJson(returnPath: string): Promise<ReturnJson> {
  const filePath = join(returnPath, RETURN_JSON);
  try {
    const raw = JSON.parse(await Deno.readTextFile(filePath)) as ReturnJson;
    return {
      ...raw,
      meta: {
        ...raw.meta,
        formType: raw.meta.formType ?? "f1040",
      },
    };
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw err;
  }
}

async function writeReturnJson(
  returnPath: string,
  data: ReturnJson,
): Promise<void> {
  await Deno.writeTextFile(
    join(returnPath, RETURN_JSON),
    JSON.stringify(data, null, 2),
  );
}

/**
 * Returns a stable ID for a new entry of the given nodeType.
 * Takes existing entries for that nodeType's bucket.
 * Pure function — no I/O.
 */
export function nextId(
  entries: readonly NodeInputEntry[],
  nodeType: string,
): string {
  return `${nodeType}_${String(entries.length + 1).padStart(2, "0")}`;
}

/**
 * Creates a new return directory with a single return.json containing
 * { meta: { returnId, year, createdAt }, inputs: {} }.
 */
export async function createReturn(
  year: number,
  baseDir: string,
  formType = "f1040",
): Promise<{ returnId: string; returnPath: string }> {
  const returnId = crypto.randomUUID();
  const returnPath = join(baseDir, returnId);

  await ensureDir(returnPath);

  const meta: MetaJson = {
    returnId,
    year,
    formType,
    createdAt: new Date().toISOString(),
  };

  await writeReturnJson(returnPath, { meta, inputs: {} });

  return { returnId, returnPath };
}

export async function loadReturn(
  returnPath: string,
): Promise<{ meta: MetaJson; inputs: InputsJson }> {
  const { meta, inputs } = await readReturnJson(returnPath);
  return { meta, inputs };
}

export async function loadMeta(returnPath: string): Promise<MetaJson> {
  return (await readReturnJson(returnPath)).meta;
}

export async function loadInputs(returnPath: string): Promise<InputsJson> {
  return (await readReturnJson(returnPath)).inputs;
}

export async function appendInput(
  returnPath: string,
  nodeType: string,
  fields: Record<string, unknown>,
): Promise<{ id: string }> {
  const returnData = await readReturnJson(returnPath);
  const existing = returnData.inputs[nodeType] ?? [];
  const id = nextId(existing, nodeType);
  const entry: NodeInputEntry = { id, fields };
  const updatedInputs: InputsJson = {
    ...returnData.inputs,
    [nodeType]: [...existing, entry],
  };
  await writeReturnJson(returnPath, {
    meta: returnData.meta,
    inputs: updatedInputs,
  });
  return { id };
}

export async function listInputs(
  returnPath: string,
): Promise<{ nodeType: string; id: string; fields: Readonly<Record<string, unknown>> }[]> {
  const { inputs } = await readReturnJson(returnPath);
  const result: { nodeType: string; id: string; fields: Readonly<Record<string, unknown>> }[] = [];
  for (const [nodeType, entries] of Object.entries(inputs)) {
    for (const entry of entries) {
      result.push({ nodeType, id: entry.id, fields: entry.fields });
    }
  }
  return result;
}

export async function getInput(
  returnPath: string,
  entryId: string,
): Promise<{ nodeType: string; id: string; fields: Readonly<Record<string, unknown>> }> {
  const { inputs } = await readReturnJson(returnPath);
  for (const [nodeType, entries] of Object.entries(inputs)) {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) return { nodeType, id: entry.id, fields: entry.fields };
  }
  throw new Error(`Entry not found: ${entryId}`);
}

export async function updateInput(
  returnPath: string,
  entryId: string,
  fields: Record<string, unknown>,
): Promise<{ id: string; nodeType: string }> {
  const returnData = await readReturnJson(returnPath);
  for (const [nodeType, entries] of Object.entries(returnData.inputs)) {
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx >= 0) {
      const updatedEntry: NodeInputEntry = { id: entryId, fields };
      const updatedEntries = [
        ...entries.slice(0, idx),
        updatedEntry,
        ...entries.slice(idx + 1),
      ];
      const updatedInputs: InputsJson = {
        ...returnData.inputs,
        [nodeType]: updatedEntries,
      };
      await writeReturnJson(returnPath, {
        meta: returnData.meta,
        inputs: updatedInputs,
      });
      return { id: entryId, nodeType };
    }
  }
  throw new Error(`Entry not found: ${entryId}`);
}

export async function deleteInput(
  returnPath: string,
  entryId: string,
): Promise<{ id: string; nodeType: string }> {
  const returnData = await readReturnJson(returnPath);
  for (const [nodeType, entries] of Object.entries(returnData.inputs)) {
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx >= 0) {
      const updatedEntries = [
        ...entries.slice(0, idx),
        ...entries.slice(idx + 1),
      ];
      const updatedInputs: InputsJson = {
        ...returnData.inputs,
        [nodeType]: updatedEntries,
      };
      await writeReturnJson(returnPath, {
        meta: returnData.meta,
        inputs: updatedInputs,
      });
      return { id: entryId, nodeType };
    }
  }
  throw new Error(`Entry not found: ${entryId}`);
}
