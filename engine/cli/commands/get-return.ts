import { loadInputs, loadMeta } from "../store/store.ts";
import { buildExecutionPlan, execute } from "../../mod.ts";
import { registry } from "../../registry.ts";
import type { InputEntry } from "../store/types.ts";
import { join } from "@std/path";

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
    const key = `${entry.nodeType}s`; // w2 -> w2s
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(entry.data);
  }
  return grouped;
}

export async function getReturnCommand(
  args: GetReturnArgs,
): Promise<GetReturnResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const meta = await loadMeta(returnPath);
  const entries = await loadInputs(returnPath);

  // Build engine inputs from stored entries
  const engineInputs = buildEngineInputs(entries);

  // Replay the engine
  const plan = buildExecutionPlan(registry, engineInputs);
  const result = execute(plan, registry, engineInputs);

  // Extract line_1a from pending
  // W2Node deposits wages as [box1] array, so pending["line_01z_wages"]["wages"] is number[]
  const wagesPending = result.pending["line_01z_wages"];
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
