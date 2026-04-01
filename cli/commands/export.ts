import { join } from "@std/path";
import { execute } from "../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../core/runtime/planner.ts";
import { catalog } from "../../catalog.ts";
import { buildEngineInputs, loadReturn } from "../store/store.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import { createReturnContext } from "../../core/validation/context.ts";
import { evaluateRules } from "../../core/validation/engine.ts";
import { FIELD_REGISTRY } from "../../forms/f1040/validation/field-registry.ts";
import { ALL_RULES } from "../../forms/f1040/validation/rules/index.ts";
import type { DiagnosticEntry } from "../../core/validation/types.ts";

function getCatalogEntry(formType: string, year: number) {
  const key = `${formType}:${year}`;
  const def = catalog[key];
  if (!def) throw new Error(`Unsupported form: ${key}`);
  return def;
}

export type ExportReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
  /** Skip reject-severity validation gate and export anyway. */
  readonly force?: boolean;
};

/** Error thrown when reject-severity rules fail and --force is not set. */
export class ExportRejectedError extends Error {
  constructor(
    readonly entries: readonly DiagnosticEntry[],
  ) {
    const lines = entries.map((e) => `  [${e.ruleNumber}] ${e.message}`);
    super(
      `Export blocked by ${entries.length} reject-level rule(s):\n${lines.join("\n")}\n\nRe-run with --force to override.`,
    );
    this.name = "ExportRejectedError";
  }
}

export async function exportMefCommand(
  args: ExportReturnArgs,
): Promise<string> {
  const returnPath = join(args.baseDir, args.returnId);
  const { meta, inputs } = await loadReturn(returnPath);
  const def = getCatalogEntry(meta.formType ?? "f1040", meta.year);
  const executionPlan = buildExecutionPlan(def.registry);
  const engineInputs = buildEngineInputs(inputs);
  const result = execute(executionPlan, def.registry, engineInputs, { taxYear: meta.year });

  // Extract filer identity for header field access
  const f1040 = (result.pending["f1040"] ?? {}) as Record<string, unknown>;
  const filer = extractFilerIdentity(f1040);

  // Run validation gate before building MeF XML
  const filerInfo = {
    primarySSN: filer?.primarySSN ?? "",
    spouseSSN: filer?.spouse?.ssn,
    filingStatus: typeof f1040["filing_status"] === "number"
      ? f1040["filing_status"] as number
      : 0,
    ...filer,
  };
  const ctx = createReturnContext(result.pending, filerInfo, FIELD_REGISTRY);
  const report = evaluateRules(ALL_RULES, ctx);

  // Collect reject-severity failures (not alerts)
  const rejectEntries = report.entries.filter(
    (e) => e.severity === "reject" || e.severity === "reject_and_stop",
  );

  if (rejectEntries.length > 0 && !args.force) {
    throw new ExportRejectedError(rejectEntries);
  }

  // Warn about alert-severity failures (always, even with --force)
  const alertEntries = report.entries.filter((e) => e.severity === "alert");
  for (const entry of alertEntries) {
    console.warn(`[ALERT] [${entry.ruleNumber}] ${entry.message}`);
  }
  if (rejectEntries.length > 0 && args.force) {
    console.warn(
      `[WARNING] Exporting with ${rejectEntries.length} reject-level rule failure(s) (--force override active).`,
    );
    for (const entry of rejectEntries) {
      console.warn(`  [${entry.ruleNumber}] ${entry.message}`);
    }
  }

  const pending = def.buildPending(result.pending);
  return def.buildMefXml(pending, filer);
}
