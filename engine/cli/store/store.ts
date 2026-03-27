import { ensureDir } from "@std/fs";
import type { InputEntry, MetaJson } from "./types.ts";

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
  const returnPath = `${baseDir}/${returnId}`;

  await ensureDir(returnPath);

  const meta: MetaJson = {
    returnId,
    year,
    createdAt: new Date().toISOString(),
  };

  await Deno.writeTextFile(
    `${returnPath}/meta.json`,
    JSON.stringify(meta, null, 2),
  );

  await Deno.writeTextFile(
    `${returnPath}/inputs.json`,
    JSON.stringify([], null, 2),
  );

  return { returnId, returnPath };
}

/**
 * Reads and returns the MetaJson from returnPath/meta.json.
 * Throws a descriptive error if the file does not exist.
 */
export async function loadMeta(returnPath: string): Promise<MetaJson> {
  try {
    const text = await Deno.readTextFile(`${returnPath}/meta.json`);
    return JSON.parse(text) as MetaJson;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(`meta.json not found at ${returnPath}`);
    }
    throw err;
  }
}

/**
 * Reads and returns the InputEntry[] from returnPath/inputs.json.
 * Throws a descriptive error if the file does not exist.
 */
export async function loadInputs(returnPath: string): Promise<InputEntry[]> {
  try {
    const text = await Deno.readTextFile(`${returnPath}/inputs.json`);
    return JSON.parse(text) as InputEntry[];
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(`inputs.json not found at ${returnPath}`);
    }
    throw err;
  }
}

/**
 * Appends entry to the inputs.json array at returnPath.
 * Immutable pattern: reads existing array, creates new array, writes back.
 */
export async function appendInput(
  returnPath: string,
  entry: InputEntry,
): Promise<void> {
  const existing = await loadInputs(returnPath);
  const updated = [...existing, entry];
  await Deno.writeTextFile(
    `${returnPath}/inputs.json`,
    JSON.stringify(updated, null, 2),
  );
}
