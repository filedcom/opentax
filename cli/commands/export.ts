import { join } from "@std/path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
import type { ExecutorDiagnosticEntry } from "../../core/runtime/executor.ts";

function getCatalogEntry(formType: string, year: number) {
  const key = `${formType}:${year}`;
  const def = catalog[key];
  if (!def) throw new Error(`Unsupported form: ${key}`);
  return def;
}

export type ExportReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
  /** Skip only reject-severity business rules; never bypass calculation failures. */
  readonly force?: boolean;
  /** Always label output as draft; permit incomplete calculations for diagnostic review. */
  readonly draft?: boolean;
};

/** Error thrown when reject-severity rules fail and --force is not set. */
export class ExportRejectedError extends Error {
  constructor(
    readonly entries: readonly DiagnosticEntry[],
  ) {
    const lines = entries.map((e) => `  [${e.ruleNumber}] ${e.message}`);
    super(
      `Export blocked by ${entries.length} reject-level rule(s):\n${
        lines.join("\n")
      }\n\nRe-run with --force to override.`,
    );
    this.name = "ExportRejectedError";
  }
}

/** Error thrown when executor diagnostics make finalized export unsafe. */
export class ExportExecutionError extends Error {
  constructor(
    readonly entries: readonly ExecutorDiagnosticEntry[],
  ) {
    const lines = entries.map((e) =>
      `  [${e.code}] ${e.nodeType}: ${e.message}`
    );
    super(
      `Finalized export blocked by ${entries.length} executor diagnostic(s):\n${
        lines.join("\n")
      }\n\nRe-run with --draft only for visibly labeled diagnostic output, or fix executor errors before exporting finalized PDF or MeF XML.`,
    );
    this.name = "ExportExecutionError";
  }
}

type PipelineResult = {
  readonly pending: Readonly<Record<string, Record<string, unknown>>>;
  readonly def: ReturnType<typeof getCatalogEntry>;
  readonly filer: ReturnType<typeof extractFilerIdentity>;
  readonly executorDiagnostics: readonly ExecutorDiagnosticEntry[];
};

const ALWAYS_APPLICABLE_RULE_PREFIXES = [
  "IND",
  "R0000",
  "T0000",
  "X0000",
] as const;

function rulePrefixForDocumentTag(tag: string): string | undefined {
  if (tag === "IRS1040") return "F1040";
  if (tag === "IRSW2") return "FW2";
  const schedule = /^IRS1040Schedule(.+)$/.exec(tag)?.[1];
  if (schedule) return `S${schedule}`;
  const form = /^IRS(.+)$/.exec(tag)?.[1];
  return form ? `F${form}` : undefined;
}

function pendingFormIdsForPrefix(prefix: string): readonly string[] {
  if (prefix === "F1040") return ["f1040"];
  if (prefix === "FW2") return ["w2"];
  if (prefix === "SEIC") return ["eitc"];
  if (prefix === "SSE") return ["schedule_se"];
  if (/^S[123]$/.test(prefix)) return [`schedule${prefix.slice(1)}`];
  if (/^S[A-Z]$/.test(prefix)) {
    return [`schedule_${prefix.slice(1).toLowerCase()}`];
  }
  if (prefix.startsWith("F")) {
    const suffix = prefix.slice(1).toLowerCase();
    return [`form${suffix}`, `form_${suffix}`];
  }
  return [];
}

interface EmittedValidationScope {
  readonly rulePrefixes: ReadonlySet<string>;
  readonly formCounts: ReadonlyMap<string, number>;
}

function emittedValidationScope(xml: string): EmittedValidationScope {
  const prefixes = new Set<string>(ALWAYS_APPLICABLE_RULE_PREFIXES);
  const formCounts = new Map<string, number>();
  for (const match of xml.matchAll(/<(IRS[A-Za-z0-9]+) documentId=/g)) {
    const prefix = rulePrefixForDocumentTag(match[1]);
    if (!prefix) continue;
    prefixes.add(prefix);
    for (const formId of pendingFormIdsForPrefix(prefix)) {
      formCounts.set(formId, (formCounts.get(formId) ?? 0) + 1);
    }
  }
  return { rulePrefixes: prefixes, formCounts };
}

function validateBusinessRules(
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer: PipelineResult["filer"],
  force: boolean | undefined,
  emittedScope?: EmittedValidationScope,
): void {
  const f1040 = pending["f1040"] ?? {};
  const filerInfo = {
    primarySSN: filer?.primarySSN ?? "",
    spouseSSN: filer?.spouse?.ssn,
    filingStatus: typeof f1040["filing_status"] === "number"
      ? f1040["filing_status"] as number
      : 0,
    ...filer,
  };
  const ctx = createReturnContext(
    pending,
    filerInfo,
    FIELD_REGISTRY,
    emittedScope?.formCounts,
  );
  const report = evaluateRules(
    ALL_RULES,
    ctx,
    emittedScope?.rulePrefixes,
  );
  const rejectEntries = report.entries.filter(
    (entry) =>
      entry.severity === "reject" || entry.severity === "reject_and_stop",
  );

  if (rejectEntries.length > 0 && !force) {
    throw new ExportRejectedError(rejectEntries);
  }

  for (
    const entry of report.entries.filter((item) => item.severity === "alert")
  ) {
    console.warn(`[ALERT] [${entry.ruleNumber}] ${entry.message}`);
  }
  if (rejectEntries.length > 0 && force) {
    console.warn(
      `[WARNING] Exporting with ${rejectEntries.length} reject-level rule failure(s) (--force override active).`,
    );
    for (const entry of rejectEntries) {
      console.warn(`  [${entry.ruleNumber}] ${entry.message}`);
    }
  }
}

/** Shared: execute nodes, warn on failures, run validation gate. */
async function runReturnPipeline(
  args: ExportReturnArgs,
): Promise<PipelineResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const { meta, inputs } = await loadReturn(returnPath);
  const def = getCatalogEntry(meta.formType ?? "f1040", meta.year);
  const executionPlan = buildExecutionPlan(def.registry);
  const singletonNodeTypes = new Set(
    def.inputNodes.filter((e) => !e.isArray).map((e) => e.node.nodeType),
  );
  const engineInputs = buildEngineInputs(inputs, singletonNodeTypes);
  const result = execute(executionPlan, def.registry, engineInputs, {
    taxYear: meta.year,
    formType: meta.formType ?? "f1040",
  });

  // Warn about executor node failures before building output
  for (const d of result.diagnostics) {
    console.warn(`[${d.code}] ${d.nodeType}: ${d.message}`);
  }
  if (result.diagnostics.length > 0) {
    console.warn(
      `[WARNING] ${result.diagnostics.length} node(s) failed during execution — exported output may be incomplete.`,
    );
    if (!args.draft) {
      throw new ExportExecutionError(result.diagnostics);
    }
  }

  // Extract filer identity for output builders and validation.
  const f1040 = (result.pending["f1040"] ?? {}) as Record<string, unknown>;
  const filer = extractFilerIdentity(f1040);

  return {
    pending: result.pending,
    def,
    filer,
    executorDiagnostics: result.diagnostics,
  };
}

function draftXmlNotice(entries: readonly ExecutorDiagnosticEntry[]): string {
  // Do not embed arbitrary diagnostic text in XML comments (it may contain "--").
  return `<!-- DRAFT/INCOMPLETE: diagnostic review only; ${entries.length} executor diagnostic(s). Not finalized or filing-ready. -->\n`;
}

async function addDraftWatermark(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const page of doc.getPages()) {
    const { height } = page.getSize();
    page.drawText("DRAFT / INCOMPLETE", {
      x: 36,
      y: height - 36,
      size: 18,
      font,
      color: rgb(0.85, 0, 0),
    });
    page.drawText(
      "Diagnostic review only. Not finalized or filing-ready.",
      {
        x: 36,
        y: height - 58,
        size: 9,
        font,
        color: rgb(0.85, 0, 0),
      },
    );
  }
  return doc.save();
}

export async function exportMefCommand(
  args: ExportReturnArgs,
): Promise<string> {
  const { pending, def, filer, executorDiagnostics } = await runReturnPipeline(
    args,
  );
  const normalized = def.buildPending(pending);
  const xml = def.buildMefXml(normalized, filer);
  validateBusinessRules(
    pending,
    filer,
    args.force,
    emittedValidationScope(xml),
  );
  return args.draft ? draftXmlNotice(executorDiagnostics) + xml : xml;
}

export type ExportPdfArgs = ExportReturnArgs & {
  /** Output file path. Defaults to <baseDir>/<returnId>/export.pdf */
  readonly outputPath?: string;
};

export async function exportPdfCommand(
  args: ExportPdfArgs,
): Promise<string> {
  const { pending, def, filer } = await runReturnPipeline(
    args,
  );
  validateBusinessRules(pending, filer, args.force);
  const pdfBytes = await def.buildPdfBytes(pending, filer);
  const outputBytes = args.draft ? await addDraftWatermark(pdfBytes) : pdfBytes;
  const outPath = args.outputPath ??
    join(args.baseDir, args.returnId, "export.pdf");
  await Deno.writeFile(outPath, outputBytes);
  return outPath;
}
