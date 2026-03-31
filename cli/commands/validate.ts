/**
 * `tax validate --returnId <id>` command.
 *
 * Runs the full MeF business rules validation engine against a computed
 * return and produces a diagnostics report.
 */

import { join } from "@std/path";
import { execute } from "../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../core/runtime/planner.ts";
import { catalog } from "../../catalog.ts";
import { buildEngineInputs, loadReturn } from "../store/store.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import { createReturnContext } from "../../core/validation/context.ts";
import { evaluateRules } from "../../core/validation/engine.ts";
import { formatDiagnosticsJson, formatDiagnosticsText } from "../../core/validation/report.ts";
import type { DiagnosticsReport } from "../../core/validation/types.ts";
import { FIELD_REGISTRY } from "../../forms/f1040/validation/field-registry.ts";
import { ALL_RULES } from "../../forms/f1040/validation/rules/index.ts";

function getCatalogEntry(formType: string, year: number) {
  const key = `${formType}:${year}`;
  const def = catalog[key];
  if (!def) throw new Error(`Unsupported form: ${key}`);
  return def;
}

export type ValidateReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
  readonly format?: "text" | "json";
};

export type ValidateReturnResult = {
  readonly report: DiagnosticsReport;
  readonly formatted: string;
};

/**
 * Validate a tax return against all MeF business rules.
 * Returns the diagnostics report and formatted output.
 */
export async function validateReturnCommand(
  args: ValidateReturnArgs,
): Promise<ValidateReturnResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const { meta, inputs } = await loadReturn(returnPath);
  const def = getCatalogEntry(meta.formType ?? "f1040", meta.year);
  const executionPlan = buildExecutionPlan(def.registry);
  const engineInputs = buildEngineInputs(inputs);
  const result = execute(executionPlan, def.registry, engineInputs, { taxYear: meta.year });

  // Extract filer identity for header field access
  const f1040 = (result.pending["f1040"] ?? {}) as Record<string, unknown>;
  const filerIdentity = extractFilerIdentity(f1040);

  // Build return context
  const filerInfo = {
    primarySSN: filerIdentity?.primarySSN ?? "",
    spouseSSN: filerIdentity?.spouse?.ssn,
    filingStatus: typeof f1040["filing_status"] === "number"
      ? f1040["filing_status"] as number
      : 0,
    ...filerIdentity,
  };

  const ctx = createReturnContext(result.pending, filerInfo, FIELD_REGISTRY);

  // Run all rules
  const report = evaluateRules(ALL_RULES, ctx);

  // Format output
  const format = args.format ?? "json";
  const formatted = format === "text"
    ? formatDiagnosticsText(report, args.returnId, meta.year)
    : formatDiagnosticsJson(report);

  return { report, formatted };
}
