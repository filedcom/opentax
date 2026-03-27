import { createReturn } from "../store/store.ts";

export type CreateReturnArgs = {
  readonly year: number;
  readonly baseDir: string;
};

import { join } from "@std/path";
import { buildExecutionPlan, execute } from "../../mod.ts";
import { f1040_line_1z } from "../../nodes/2025/f1040/f1040_line_01z/index.ts";
import { registry } from "../../nodes/2025/registry.ts";
import { loadInputs, loadMeta } from "../store/store.ts";
import type { InputEntry } from "../store/types.ts";

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

  const wagesPending = result.pending[f1040_line_1z.nodeType];
  let line1a = 0;
  if (wagesPending && wagesPending["wages"] !== undefined) {
    const wages = wagesPending["wages"];
    if (Array.isArray(wages)) {
      line1a = (wages as number[]).reduce((a, b) => a + b, 0);
    } else if (typeof wages === "number") {
      line1a = wages;
    }
  }

  return {
    returnId: meta.returnId,
    year: meta.year,
    lines: { line_1a: line1a },
  };
}
