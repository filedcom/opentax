import { join } from "@std/path";
import { buildExecutionPlan, execute } from "../../mod.ts";
import { f1040_line_1z } from "../../nodes/2025/f1040/f1040_line_01z/index.ts";
import { registry } from "../../nodes/2025/registry.ts";
import { createReturn, loadInputs, loadMeta } from "../store/store.ts";
import type { InputEntry } from "../store/types.ts";

export type CreateReturnArgs = {
  readonly year: number;
  readonly baseDir: string;
};

export async function createReturnCommand(
  args: CreateReturnArgs,
): Promise<{ returnId: string }> {
  const { returnId } = await createReturn(args.year, args.baseDir);
  return { returnId };
}

export type GetReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
};

export type GetReturnResult = {
  readonly returnId: string;
  readonly year: number;
  readonly lines: {
    readonly line_1a: number;
  };
};

/**
 * Groups InputEntry[] by nodeType into the engine's expected input shape.
 * Convention: nodeType "w2" -> key "w2s" (append "s").
 */
function buildEngineInputs(
  entries: readonly InputEntry[],
): Record<string, unknown> {
  const grouped: Record<string, unknown[]> = {};
  for (const entry of entries) {
    const key = `${entry.nodeType}s`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(entry.data);
  }
  return grouped;
}

export async function getReturnCommand(
  args: GetReturnArgs,
): Promise<GetReturnResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const [meta, entries] = await Promise.all([
    loadMeta(returnPath),
    loadInputs(returnPath),
  ]);

  const engineInputs = buildEngineInputs(entries);
  const plan = buildExecutionPlan(registry, engineInputs);
  const result = execute(plan, registry, engineInputs);

  const wages = result.pending[f1040_line_1z.nodeType]?.["wages"];
  let wagesList: number[];
  if (Array.isArray(wages)) {
    wagesList = wages as number[];
  } else if (typeof wages === "number") {
    wagesList = [wages];
  } else {
    wagesList = [];
  }
  const line1a = wagesList.reduce((a, b) => a + b, 0);

  return {
    returnId: meta.returnId,
    year: meta.year,
    lines: { line_1a: line1a },
  };
}
