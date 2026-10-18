/**
 * `tax validate --returnId <id>` command.
 *
 * Runs the full MeF business rules validation engine against a computed
 * return and produces a diagnostics report.
 */

import { join } from "node:path";
import type { ExecutorDiagnosticEntry } from "../../core/runtime/executor.ts";
import { catalog } from "../../catalog.ts";
import { buildEngineInputs, loadReturn } from "../store/store.ts";
import { singletonPublicInputKeys } from "../store/public-input-keys.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import { createReturnContext } from "../../core/validation/context.ts";
import { evaluateRules } from "../../core/validation/engine.ts";
import {
  formatDiagnosticsJson,
  formatDiagnosticsText,
} from "../../core/validation/report.ts";
import type {
  DiagnosticEntry,
  DiagnosticsReport,
  ErrorCategory,
} from "../../core/validation/types.ts";
import { FIELD_REGISTRY } from "../../forms/f1040/validation/field-registry.ts";
import { rulesForReturnVersion } from "../../forms/f1040/validation/rules/ty2026.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { returnHeaderNameLine1 } from "../../forms/f1040/mef/header.ts";
import { emittedValidationScope, isTransmissionOnlyRule } from "./export.ts";
import {
  loadReturnSourceFiles,
  resolveSourceBytes,
  withMissingSourceFiles,
} from "./return-source-files.ts";
import { returnHints } from "./return-hints.ts";

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
  const engineInputs = await resolveSourceBytes(
    returnPath,
    buildEngineInputs(inputs, singletonPublicInputKeys(def)),
  );
  const result = def.executeReturn(engineInputs);
  const pending = normalizeAllPending(result.pending);

  // Extract filer identity for header field access
  const f1040 = pending["f1040"] ?? {};
  const filerIdentity = extractFilerIdentity(f1040);
  let scope: ReturnType<typeof emittedValidationScope> | undefined;
  let ownReport: DiagnosticsReport | undefined;
  let assemblyError: DiagnosticEntry | undefined;
  let missing: readonly string[] = [];
  try {
    const files = await loadReturnSourceFiles(returnPath, pending);
    missing = files.missing;
    // Assemble the filed projection export uses (Form 8949 rows, only a
    // completed Form 8960), with source files when the return has them.
    const xml = files.attachments.length + files.retained.length > 0
      ? (await def.prepareReturn(
        pending,
        filerIdentity,
        files.attachments,
        files.retained,
      )).bundle.xml
      : def.buildMefXml(def.buildPending(result.pending), filerIdentity);
    if (def.mefRuleReport) ownReport = def.mefRuleReport(pending, xml);
    else scope = emittedValidationScope(xml);
  } catch (error) {
    assemblyError = {
      ruleNumber: "MEF_ASSEMBLY",
      severity: "reject",
      category: "xml_error",
      message: withMissingSourceFiles(error, missing).message,
      formRef: "Return",
    };
  }

  // Build return context
  const filerInfo = {
    primarySSN: filerIdentity?.primarySSN ?? "",
    spouseSSN: filerIdentity?.spouse?.ssn,
    filingStatus: typeof f1040["filing_status"] === "number"
      ? f1040["filing_status"] as number
      : 0,
    ...filerIdentity,
    NameLine1Txt: filerIdentity
      ? returnHeaderNameLine1(filerIdentity)
      : undefined,
    returnVersion: scope?.returnVersion,
  };

  const ctx = createReturnContext(
    pending,
    filerInfo,
    FIELD_REGISTRY,
    scope?.formCounts,
    scope?.emitted,
  );

  // Only emitted documents have applicable return-level rules. A failed
  // assembly is itself a reject diagnostic, so it cannot imply a filing pass.
  const report: DiagnosticsReport = assemblyError
    ? {
      entries: [],
      summary: { total: 0, passed: 0, rejected: 0, alerts: 0, skipped: 0 },
      canFile: false,
    }
    : ownReport ?? evaluateRules(
      rulesForReturnVersion(scope?.returnVersion).filter((rule) =>
        !isTransmissionOnlyRule(rule.ruleNumber)
      ),
      ctx,
      scope?.rulePrefixes,
    );

  // Merge executor diagnostics into report entries
  const executorEntries: DiagnosticEntry[] = result.diagnostics.map(
    (d: ExecutorDiagnosticEntry) => ({
      ruleNumber: d.code,
      severity: "reject" as const,
      category: "general" as ErrorCategory,
      message: `${d.nodeType}: ${d.message}`,
      formRef: d.nodeId,
    }),
  );

  // Claims the facts point to but the return does not make; they never block filing.
  const hintEntries: DiagnosticEntry[] = returnHints(pending).map((
    message,
  ) => ({
    ruleNumber: "OPENTAX_HINT",
    severity: "alert" as const,
    category: "information" as ErrorCategory,
    message,
    formRef: "Return",
  }));

  const hasExecutorFailures = executorEntries.length > 0;
  const mergedEntries = [
    ...executorEntries,
    ...(assemblyError ? [assemblyError] : []),
    ...report.entries,
    ...hintEntries,
  ];
  const mergedSummary = {
    ...report.summary,
    total: report.summary.total + executorEntries.length +
      (assemblyError ? 1 : 0) + hintEntries.length,
    rejected: report.summary.rejected + executorEntries.length +
      (assemblyError ? 1 : 0),
    alerts: report.summary.alerts + hintEntries.length,
  };
  const mergedReport: DiagnosticsReport = {
    entries: mergedEntries,
    summary: mergedSummary,
    canFile: !hasExecutorFailures && !assemblyError && report.canFile,
  };

  // Format output
  const format = args.format ?? "json";
  const formatted = format === "text"
    ? formatDiagnosticsText(mergedReport, args.returnId, meta.year)
    : formatDiagnosticsJson(mergedReport);

  return { report: mergedReport, formatted };
}
