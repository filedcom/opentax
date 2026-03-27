import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import type { InputEntry, MetaJson } from "./types.ts";

const RETURN_METADATA_JSON = "meta.json";
const INPUTS_JSON = "inputs.json";

async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    return JSON.parse(await Deno.readTextFile(filePath)) as T;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw err;
  }
}

/**
 * Returns a stable ID for a new entry of the given nodeType.
 * Counts existing entries with matching nodeType and increments.
 * Pure function — no I/O.
 */
export function nextId(
  entries: readonly InputEntry[],
  nodeType: string,
): string {
  const count = entries.filter((e) => e.nodeType === nodeType).length;
  return `${nodeType}_${String(count + 1).padStart(2, "0")}`;
}

/**
 * Creates a new return directory under baseDir with a UUID as the folder name.
 * Writes meta.json (returnId, year, createdAt) and an empty inputs.json.
 * Returns { returnId, returnPath }.
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

  await Deno.writeTextFile(
    join(returnPath, RETURN_METADATA_JSON),
    JSON.stringify(meta, null, 2),
  );
  await Deno.writeTextFile(
    join(returnPath, INPUTS_JSON),
    JSON.stringify([], null, 2),
  );

  return { returnId, returnPath };
}

export function loadMeta(returnPath: string): Promise<MetaJson> {
  return readJsonFile<MetaJson>(join(returnPath, RETURN_METADATA_JSON));
}

export function loadInputs(returnPath: string): Promise<InputEntry[]> {
  return readJsonFile<InputEntry[]>(join(returnPath, INPUTS_JSON));
}

export async function writeInputs(
  returnPath: string,
  entries: InputEntry[],
): Promise<void> {
  await Deno.writeTextFile(
    join(returnPath, INPUTS_JSON),
    JSON.stringify(entries, null, 2),
  );
}

export async function appendInput(
  returnPath: string,
  entry: InputEntry,
): Promise<void> {
  const existing = await loadInputs(returnPath);
  await writeInputs(returnPath, [...existing, entry]);
}
