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

// Public inputs whose whole calculation path reads the tax year from the
// node context. Every other 2025 input still has TY2025 rules or literals in
// its path, so a TY2026 return refuses it rather than computing 2025 law.
export const TY2026_SUPPORTED_INPUTS: ReadonlySet<string> = new Set([
  "general",
  "w2",
  "f8888",
]);

// General-input facts whose rules are still dated to TY2025.
const TY2025_ONLY_GENERAL_FIELDS: readonly string[] = [
  "dependents",
  "dual_status_return_2025",
  "ptc_residence_states_2025",
  "ptc_residence_months_2025",
];

const context = { taxYear: F1040_2026_CONFIG.taxYear, formType: "f1040" };

function inputKey(entry: (typeof inputNodes2025)[number]): string {
  return entry.inputKey ?? entry.node.nodeType;
}

export const inputNodes = inputNodes2025.filter((entry) =>
  TY2026_SUPPORTED_INPUTS.has(inputKey(entry))
);

export function assertTy2026Inputs(inputs: Record<string, unknown>): void {
  const unsupported = Object.keys(inputs).filter((key) =>
    inputs[key] !== undefined && !TY2026_SUPPORTED_INPUTS.has(key)
  );
  if (unsupported.length > 0) {
    throw new Error(
      `TY2026 does not yet support these inputs: ${unsupported.sort().join(", ")}`,
    );
  }
  const general = inputs.general;
  if (general !== null && typeof general === "object") {
    const dated = TY2025_ONLY_GENERAL_FIELDS.filter((field) => {
      const value = (general as Record<string, unknown>)[field];
      return value !== undefined && !(Array.isArray(value) && value.length === 0);
    });
    if (dated.length > 0) {
      throw new Error(
        `TY2026 does not yet support these general facts: ${dated.join(", ")}`,
      );
    }
  }
}

function executeReturn(inputs: Record<string, unknown>) {
  assertTy2026Inputs(inputs);
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
