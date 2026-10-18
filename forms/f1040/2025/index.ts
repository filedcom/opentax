import { preparePublicForm8886Return } from "./domains/general/filing/form8886/public-return.ts";
import type { FormDefinition } from "../../../core/types/form-definition.ts";
import type { ExecuteResult } from "../../../core/runtime/executor.ts";
import type { FilerIdentity } from "../mef/header.ts";
import type { MefFormsPending } from "./mef/types.ts";
import { F1040_2025_CONFIG } from "./config.ts";
import { inputNodes } from "./inputs.ts";
import { registry } from "./registry.ts";
import { buildMefBundle, buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/execution/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assertF1040FinalHeader } from "./domains/general/return-assembly/filer-source-reconciliation.ts";
import { executeF1040Return } from "./return-processing/execute_return.ts";

const context = {
  taxYear: F1040_2025_CONFIG.taxYear,
  formType: F1040_2025_CONFIG.formType,
};

function executeReturn(inputs: Record<string, unknown>): ExecuteResult {
  return executeF1040Return(inputs, context);
}

export const f1040_2025: FormDefinition = {
  ...F1040_2025_CONFIG,
  inputNodes,
  registry,
  executeReturn,
  prepareReturn: async (
    pendingInput,
    filerInput,
    attachmentsInput = [],
    retainedSourceDocumentsInput = [],
  ) => {
    const attachments = attachmentsInput.map((row) => ({
      ...row,
      bytes: new Uint8Array(row.bytes),
    }));
    const retainedSourceDocuments = retainedSourceDocumentsInput.map((row) => ({
      ...row,
      bytes: new Uint8Array(row.bytes),
    }));
    const pending = structuredClone(pendingInput);
    const filer = filerInput ? structuredClone(filerInput) : undefined;
    const normalized = buildPending(pending) as MefFormsPending;
    assertF1040FinalHeader(normalized.f1040 ?? {}, filer);
    const form8886 = await preparePublicForm8886Return(
      pending,
      filer,
      executeReturn,
    );
    const bundle = await buildMefBundle(normalized, {
      filer,
      form8886,
      attachments,
      retainedSourceDocuments,
      schemaVersion: F1040_2025_CONFIG.mefSchemaVersion,
      year: F1040_2025_CONFIG.taxYear,
      returnType: "1040",
    });
    return {
      bundle,
      renderPdf: () =>
        buildPdfBytes(bundle.pending, filer, ".pdf-cache", bundle),
    };
  },
  buildMefXml: (pending, filer) =>
    buildMefXml(
      pending as MefFormsPending,
      filer as FilerIdentity | undefined,
      F1040_2025_CONFIG.mefSchemaVersion,
      F1040_2025_CONFIG.taxYear,
      F1040_2025_CONFIG.formType === "f1040"
        ? "1040"
        : F1040_2025_CONFIG.formType,
    ),
  buildPdfBytes: (pending, filer) => buildPdfBytes(pending, filer),
  buildPending: (pending: Record<string, unknown>) =>
    buildPending(pending) as Record<string, unknown>,
};
