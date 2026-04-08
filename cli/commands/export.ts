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

type PipelineResult = {
  readonly pending: Record<string, unknown>;
  readonly def: ReturnType<typeof getCatalogEntry>;
  readonly filer: ReturnType<typeof extractFilerIdentity>;
};

/** Shared: execute nodes, warn on failures, run validation gate. */
async function runReturnPipeline(args: ExportReturnArgs): Promise<PipelineResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const { meta, inputs } = await loadReturn(returnPath);
  const def = getCatalogEntry(meta.formType ?? "f1040", meta.year);
  const executionPlan = buildExecutionPlan(def.registry);
  const singletonNodeTypes = new Set(
    def.inputNodes.filter((e) => !e.isArray).map((e) => e.node.nodeType),
  );
  const engineInputs = buildEngineInputs(inputs, singletonNodeTypes);
  const result = execute(executionPlan, def.registry, engineInputs, { taxYear: meta.year });

  // Warn about executor node failures before building output
  for (const d of result.diagnostics) {
    console.warn(`[${d.code}] ${d.nodeType}: ${d.message}`);
  }
  if (result.diagnostics.length > 0) {
    console.warn(
      `[WARNING] ${result.diagnostics.length} node(s) failed during execution — exported output may be incomplete.`,
    );
  }

  // Extract filer identity for header field access
  const f1040 = (result.pending["f1040"] ?? {}) as Record<string, unknown>;
  const filer = extractFilerIdentity(f1040);

  // Run validation gate
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

  const rejectEntries = report.entries.filter(
    (e) => e.severity === "reject" || e.severity === "reject_and_stop",
  );

  if (rejectEntries.length > 0 && !args.force) {
    throw new ExportRejectedError(rejectEntries);
  }

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

  return { pending: result.pending, def, filer };
}

export async function exportMefCommand(
  args: ExportReturnArgs,
): Promise<string> {
  const { pending, def, filer } = await runReturnPipeline(args);
  const normalized = def.buildPending(pending);
  return def.buildMefXml(normalized, filer);
}

export type ExportPdfArgs = ExportReturnArgs & {
  /** Output file path. Defaults to <baseDir>/<returnId>/export.pdf */
  readonly outputPath?: string;
};

export async function exportPdfCommand(
  args: ExportPdfArgs,
): Promise<string> {
  const { pending, def } = await runReturnPipeline(args);
  const pdfBytes = await def.buildPdfBytes(pending);
  const outPath = args.outputPath ?? join(args.baseDir, args.returnId, "export.pdf");
  await Deno.writeFile(outPath, pdfBytes);
  return outPath;
}
