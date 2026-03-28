import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import type {
  InputsJson,
  MetaJson,
  NodeInputEntry,
  ReturnJson,
} from "./types.ts";

const RETURN_JSON = "return.json";

async function readReturnJson(returnPath: string): Promise<ReturnJson> {
  const filePath = join(returnPath, RETURN_JSON);
  try {
    return JSON.parse(await Deno.readTextFile(filePath)) as ReturnJson;
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
): Promise<{ returnId: string; returnPath: string }> {
  const returnId = crypto.randomUUID();
  const returnPath = join(baseDir, returnId);

  await ensureDir(returnPath);

  const meta: MetaJson = {
    returnId,
    year,
    createdAt: new Date().toISOString(),
  };

  await writeReturnJson(returnPath, { meta, inputs: {} });

  return { returnId, returnPath };
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
