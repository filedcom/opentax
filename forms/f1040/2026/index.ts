import type { FormDefinition } from "../../../core/types/form-definition.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import type { FilerIdentity } from "../mef/header.ts";
import { inputNodes as inputNodes2025 } from "../2025/inputs.ts";
import { registry } from "../2025/registry.ts";
import { buildMefBundle, buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/execution/pending.ts";
import type { MefFormsPending } from "../2025/mef/types.ts";
import { assertF1040FinalHeader } from "../2025/domains/general/return-assembly/filer-source-reconciliation.ts";
import { F1040_2026_CONFIG } from "./config.ts";

const context = { taxYear: F1040_2026_CONFIG.taxYear, formType: "f1040" };

export const inputNodes = inputNodes2025;

function executeReturn(inputs: Record<string, unknown>) {
  return execute(buildExecutionPlan(registry), registry, inputs, context);
}

function noPdf(): never {
  throw new Error("TY2026 PDF forms are not available yet; export MeF XML");
}

export const f1040_2026: FormDefinition = {
  ...F1040_2026_CONFIG,
  inputNodes,
  registry,
  executeReturn,
  prepareReturn: async (
    pendingInput,
    filerInput,
    attachmentsInput = [],
  ) => {
    const pending = structuredClone(pendingInput);
    const filer = filerInput ? structuredClone(filerInput) : undefined;
    const normalized = buildPending(pending) as MefFormsPending;
    assertF1040FinalHeader(normalized.f1040 ?? {}, filer);
    const bundle = await buildMefBundle(normalized, {
      filer,
      attachments: attachmentsInput.map((row) => ({
        ...row,
        bytes: new Uint8Array(row.bytes),
      })),
      schemaVersion: F1040_2026_CONFIG.mefSchemaVersion,
      year: F1040_2026_CONFIG.taxYear,
      returnType: "1040",
    });
    return { bundle, renderPdf: () => Promise.resolve(noPdf()) };
  },
  buildMefXml: (pending, filer) =>
    buildMefXml(
      pending as MefFormsPending,
      filer as FilerIdentity | undefined,
      F1040_2026_CONFIG.mefSchemaVersion,
      F1040_2026_CONFIG.taxYear,
      "1040",
    ),
  buildPdfBytes: () => Promise.resolve(noPdf()),
  buildPending: (pending: Record<string, unknown>) =>
    buildPending(pending) as Record<string, unknown>,
};
