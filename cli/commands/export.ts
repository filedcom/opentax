import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { catalog } from "../../catalog.ts";
import { buildEngineInputs, loadReturn } from "../store/store.ts";
import { singletonPublicInputKeys } from "../store/public-input-keys.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import { returnHeaderNameLine1 } from "../../forms/f1040/mef/header.ts";
import { createReturnContext } from "../../core/validation/context.ts";
import { evaluateRules } from "../../core/validation/engine.ts";
import {
  type EmittedReturn,
  parseEmittedReturn,
  rulePrefixForDocumentTag,
} from "../../core/validation/emitted-documents.ts";
import { FIELD_REGISTRY } from "../../forms/f1040/validation/field-registry.ts";
import { rulesForReturnVersion } from "../../forms/f1040/validation/rules/ty2026.ts";
import type {
  DiagnosticEntry,
  DiagnosticsReport,
} from "../../core/validation/types.ts";
import type { ExecutorDiagnosticEntry } from "../../core/runtime/executor.ts";
import { loadForm8839Attachments } from "./form8839-attachments.ts";
import {
  loadForm8835PurchaseAttachments,
  loadForm8862RetainedNotices,
} from "./return-source-files.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { buildForm4972PaperPdfBytes } from "../../forms/f1040/2025/pdf/builder.ts";
import { reconcileForm4972Collection } from "../../forms/f1040/2025/domains/taxes/retirement/form4972/form4972_collection_reconciliation.ts";
import { sha256Hex } from "../../forms/f1040/2025/return-processing/prepared-source.ts";
import type {
  FilerIdentity,
  OriginatorInfo,
} from "../../forms/f1040/mef/header.ts";
import { OriginatorType } from "../../forms/f1040/nodes/inputs/general/filing/preparer/index.ts";
import {
  buildMefSubmissionArchive,
  type MefSubmissionArchive,
} from "../../forms/f1040/2025/mef/submissions/submission-archive.ts";
import { filingResidencyReviewSchema } from "../../forms/f1040/2025/mef/submissions/residency-review.ts";
import {
  isOnlineFilerEfin,
  mefSubmissionId,
  type MefTestCd,
  randomSubmissionSequence,
} from "../../forms/f1040/2025/mef/submissions/submission-manifest.ts";

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
] as const;

// These checks require transmitter/session metadata that is absent from a
// return-only XML or PDF export. They belong to the later A2A submission gate.
const TRANSMISSION_ONLY_RULES = new Set([
  "IND-062", // transmitter IP address
  "IND-063", // transmitter timestamp
  "R0000-051-01",
  "R0000-052-01",
  "R0000-054-01",
  "R0000-060",
  "R0000-080-01",
  "R0000-081-01",
  "R0000-082",
  "R0000-114",
  "R0000-115",
  "R0000-118-01",
  "R0000-119-01",
  "R0000-143",
  "R0000-180",
  "R0000-228",
  "R0000-229",
]);

export function isTransmissionOnlyRule(ruleNumber: string): boolean {
  if (TRANSMISSION_ONLY_RULES.has(ruleNumber)) return true;
  const indNumber = /^IND-(\d+)/.exec(ruleNumber);
  if (!indNumber) return false;
  const number = Number(indNumber[1]);
  // IND-189 through IND-203 require filing security or additional filer
  // metadata gathered by a transmitter, not by the return-only exporters.
  return number >= 189 && number <= 203;
}

function pendingFormIdsForPrefix(prefix: string): readonly string[] {
  if (prefix === "F1040") return ["f1040"];
  if (prefix === "FW2") return ["w2"];
  if (prefix === "SEIC") return ["schedule_eic", "eitc"];
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
  readonly returnVersion?: string;
  readonly emitted: EmittedReturn;
}

export function emittedValidationScope(xml: string): EmittedValidationScope {
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
  // Supporting documents count as present forms: FECRecord → fec_record.
  for (const match of xml.matchAll(/<([A-Z][A-Za-z0-9]+) documentId=/g)) {
    if (match[1].startsWith("IRS")) continue;
    const formId = match[1].replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();
    formCounts.set(formId, (formCounts.get(formId) ?? 0) + 1);
  }
  const returnVersion = /<Return\b[^>]*\breturnVersion="([^"]+)"/.exec(xml)
    ?.[1];
  return {
    rulePrefixes: prefixes,
    formCounts,
    returnVersion,
    emitted: parseEmittedReturn(xml),
  };
}

/** Reject-level IRS business rules the emitted return fails, as export applies them. */
export function businessRuleReport(
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer: PipelineResult["filer"],
  emittedScope?: EmittedValidationScope,
) {
  const f1040 = pending["f1040"] ?? {};
  const filerInfo = {
    primarySSN: filer?.primarySSN ?? "",
    spouseSSN: filer?.spouse?.ssn,
    filingStatus: typeof f1040["filing_status"] === "number"
      ? f1040["filing_status"] as number
      : 0,
    ...filer,
    NameLine1Txt: filer ? returnHeaderNameLine1(filer) : undefined,
    returnVersion: emittedScope?.returnVersion,
    ats_test_submission: f1040["ats_test_submission"] === true,
  };
  const ctx = createReturnContext(
    pending,
    filerInfo,
    FIELD_REGISTRY,
    emittedScope?.formCounts,
    emittedScope?.emitted,
  );
  return evaluateRules(
    rulesForReturnVersion(emittedScope?.returnVersion).filter((rule) =>
      !isTransmissionOnlyRule(rule.ruleNumber)
    ),
    ctx,
    emittedScope?.rulePrefixes,
  );
}

export function validateBusinessRules(
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer: PipelineResult["filer"],
  force: boolean | undefined,
  emittedScope?: EmittedValidationScope,
): void {
  gateRuleReport(businessRuleReport(pending, filer, emittedScope), force);
}

/** The emitted return's own rule set: a Form 4868 is not judged by Form 1040 rules. */
function validateSubmissionRules(
  def: PipelineResult["def"],
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer: PipelineResult["filer"],
  force: boolean | undefined,
  xml: string,
): void {
  if (def.mefRuleReport) {
    gateRuleReport(def.mefRuleReport(pending, xml), force);
    return;
  }
  validateBusinessRules(pending, filer, force, emittedValidationScope(xml));
}

function gateRuleReport(
  report: DiagnosticsReport,
  force: boolean | undefined,
): void {
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
export async function runReturnPipeline(
  args: ExportReturnArgs,
): Promise<PipelineResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const { meta, inputs } = await loadReturn(returnPath);
  const def = getCatalogEntry(meta.formType ?? "f1040", meta.year);
  const engineInputs = buildEngineInputs(inputs, singletonPublicInputKeys(def));
  const result = def.executeReturn(engineInputs);

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
  const pending = normalizeAllPending(result.pending);
  const f1040 = pending["f1040"] ?? {};
  const filer = extractFilerIdentity(f1040);

  return {
    pending,
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
  const label = "DRAFT / INCOMPLETE";
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.min(36, width / 16);
    page.drawText(label, {
      x: (width - font.widthOfTextAtSize(label, size)) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.4, 0.4, 0.4),
      opacity: 0.14,
    });
  }
  return doc.save();
}

export async function exportMefCommand(
  args: ExportReturnArgs,
): Promise<string> {
  const { pending, def, filer, executorDiagnostics } = await runReturnPipeline(
    args,
  );
  const returnPath = join(args.baseDir, args.returnId);
  const attachments = [
    ...await loadForm8839Attachments(returnPath, pending),
    ...await loadForm8835PurchaseAttachments(returnPath, pending),
  ];
  const prepared = await def.prepareReturn(
    pending,
    filer,
    attachments,
    await loadForm8862RetainedNotices(returnPath, pending),
  );
  const xml = prepared.bundle.xml;
  validateSubmissionRules(def, pending, filer, args.force, xml);
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
  const returnPath = join(args.baseDir, args.returnId);
  const attachments = [
    ...await loadForm8839Attachments(returnPath, pending),
    ...await loadForm8835PurchaseAttachments(returnPath, pending),
  ];
  // An unidentified draft is a PDF preview; it has no fileable MeF return.
  const prepared = args.draft && !filer ? undefined : await def.prepareReturn(
    pending,
    filer,
    attachments,
    await loadForm8862RetainedNotices(returnPath, pending),
  );
  if (prepared) {
    validateSubmissionRules(
      def,
      pending,
      filer,
      args.force,
      prepared.bundle.xml,
    );
  } else {
    validateBusinessRules(pending, filer, args.force);
  }
  const pdfBytes = prepared
    ? await prepared.renderPdf()
    : await def.buildPdfBytes(def.buildPending(pending), filer);
  const outputBytes = args.draft ? await addDraftWatermark(pdfBytes) : pdfBytes;
  const outPath = args.outputPath ??
    join(args.baseDir, args.returnId, "export.pdf");
  await writeFile(outPath, outputBytes);
  return outPath;
}

/** This route emits a paper packet only; it never constructs MeF XML. */
export async function exportForm4972PaperCommand(
  args: ExportPdfArgs,
): Promise<string> {
  if (args.force || args.draft) {
    throw new Error(
      "Form 4972 paper-only export cannot bypass filing checks or export a draft",
    );
  }
  const { pending, def, filer } = await runReturnPipeline(args);
  if (def.formType !== "f1040" || def.taxYear !== 2025) {
    throw new Error("Form 4972 paper-only export requires a TY2025 Form 1040");
  }
  // MeF business rules are scoped by emitted native documents. This route
  // deliberately emits no native return; source and PDF guards still run.
  const bytes = await buildForm4972PaperPdfBytes(
    def.buildPending(pending),
    filer,
  );
  const scoped = reconcileForm4972Collection(
    pending.form4972,
    pending,
    filer,
    "paper",
  );
  const outPath = args.outputPath ??
    join(args.baseDir, args.returnId, "paper-only-form4972.pdf");
  await writeFile(outPath, bytes);
  await writeFile(
    `${outPath}.source-manifest.json`,
    JSON.stringify(
      {
        filingChannel: "paper_only",
        taxYear: 2025,
        electronicSubmissionAuthorized: false,
        pdfSha256: await sha256Hex(bytes),
        form1040Line16: pending.f1040.line16_income_tax,
        form4972Tax: pending.f1040.form4972_tax,
        participantForms: scoped.map(({ fields, sources, tax }, index) => ({
          copy: index + 1,
          recipient: fields.recipient,
          participantName: sources[0].form4972_plan?.participant_name,
          participantSsn: sources[0].form4972_plan?.participant_ssn,
          planReference: sources[0].form4972_plan?.plan_reference,
          sourceDocumentReferences: fields.source_document_references,
          capitalGainElection: fields.elect_capital_gain,
          tenYearAveragingElection: fields.elect_10yr_averaging,
          determinedTax: tax,
          line30Tax: fields.line30,
        })),
        sourceRetentionNotice:
          "Retained source records and any required statements must be reviewed separately; this manifest is not an IRS attachment or acceptance record.",
      },
      null,
      2,
    ),
  );
  return outPath;
}

export type ExportMefSubmissionArgs = ExportReturnArgs & {
  /** Originator EFIN; must agree with the return's preparer EFIN when both exist. */
  readonly efin?: string;
  /** IRS-assigned eight-digit Software ID for the return header. */
  readonly softwareId?: string;
  /** Seven-character Submission ID sequence; random when omitted. */
  readonly sequence?: string;
  readonly processingDate?: Date;
  /** Defaults to <baseDir>/<returnId>/residency-review.json. */
  readonly residencyReviewPath?: string;
  /** Defaults to <baseDir>/<returnId>/submissions. */
  readonly outputDir?: string;
};

export type MefSubmissionExport = {
  readonly submissionId: string;
  readonly path: string;
  readonly sha256: string;
  readonly testCd: MefTestCd;
  readonly entries: readonly string[];
};

/** Put the transmitter's originator and Software ID into the return header. */
export function withSubmissionOriginator(
  filer: FilerIdentity,
  efin: string | undefined,
  softwareId: string | undefined,
): FilerIdentity & { readonly originator: OriginatorInfo } {
  const returnEfin = filer.originator?.efin;
  if (efin !== undefined && returnEfin !== undefined && efin !== returnEfin) {
    throw new Error(
      `--efin ${efin} differs from the return's preparer EFIN ${returnEfin}`,
    );
  }
  const originatorEfin = returnEfin ?? efin;
  if (!originatorEfin) {
    throw new Error(
      "MeF submission needs the originator EFIN: pass --efin or enter preparer.efin",
    );
  }
  if (!softwareId) {
    throw new Error(
      "MeF submission needs the IRS-assigned Software ID: pass --software-id",
    );
  }
  return {
    ...filer,
    softwareId,
    originator: filer.originator ?? {
      efin: originatorEfin,
      originatorType: isOnlineFilerEfin(originatorEfin)
        ? OriginatorType.OnlineFiler
        : OriginatorType.ERO,
    },
  };
}

/** Build, without writing, the submission ZIP that export and transmission share. */
export async function prepareMefSubmissionArchive(
  args: Omit<ExportMefSubmissionArgs, "outputDir">,
): Promise<MefSubmissionArchive> {
  if (args.force || args.draft) {
    throw new Error(
      "MeF submission export cannot bypass filing checks or export a draft",
    );
  }
  const { pending, def, filer: returnFiler } = await runReturnPipeline(args);
  if (def.formType !== "f1040" || def.taxYear !== 2025) {
    throw new Error("MeF submission export requires a TY2025 Form 1040");
  }
  if (!returnFiler) {
    throw new Error("MeF submission export needs the identified taxpayer");
  }
  const filer = withSubmissionOriginator(
    returnFiler,
    args.efin,
    args.softwareId,
  );
  const returnPath = join(args.baseDir, args.returnId);
  const prepared = await def.prepareReturn(
    pending,
    filer,
    [
      ...await loadForm8839Attachments(returnPath, pending),
      ...await loadForm8835PurchaseAttachments(returnPath, pending),
    ],
    await loadForm8862RetainedNotices(returnPath, pending),
  );
  validateBusinessRules(
    pending,
    filer,
    false,
    emittedValidationScope(prepared.bundle.xml),
  );
  const processingDate = args.processingDate ?? new Date();
  const residencyReview = filingResidencyReviewSchema.parse(JSON.parse(
    await readFile(
      args.residencyReviewPath ?? join(returnPath, "residency-review.json"),
      "utf8",
    ),
  ));
  return await buildMefSubmissionArchive(prepared.bundle, {
    filer,
    submissionId: mefSubmissionId(
      filer.originator.efin,
      processingDate,
      args.sequence ?? randomSubmissionSequence(),
    ),
    processingDate,
    residencyReview,
  });
}

/** The archive's ZIP written under returns/<id>/submissions (or `outputDir`), never overwritten. */
export async function writeMefSubmissionArchive(
  archive: MefSubmissionArchive,
  returnPath: string,
  outputDir = join(returnPath, "submissions"),
): Promise<MefSubmissionExport> {
  await mkdir(outputDir, { recursive: true });
  const path = join(outputDir, archive.fileName);
  await writeFile(path, archive.bytes, { flag: "wx" });
  return {
    submissionId: archive.submissionId,
    path,
    sha256: await sha256Hex(archive.bytes),
    testCd: archive.testCd,
    entries: [
      "manifest/manifest.xml",
      "xml/submission.xml",
      ...archive.bundle.attachments.map((a) => `attachment/${a.fileName}`),
    ],
  };
}

/** Pub 4164 submission ZIP: manifest/manifest.xml, xml/submission.xml, attachment/*.pdf. */
export async function exportMefSubmissionCommand(
  args: ExportMefSubmissionArgs,
): Promise<MefSubmissionExport> {
  return await writeMefSubmissionArchive(
    await prepareMefSubmissionArchive(args),
    join(args.baseDir, args.returnId),
    args.outputDir,
  );
}
