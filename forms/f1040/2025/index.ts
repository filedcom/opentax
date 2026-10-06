import type { FormDefinition } from "../../../core/types/form-definition.ts";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import type { FilerIdentity } from "../mef/header.ts";
import { publicInputSchema as form8990PublicInputSchema } from "../nodes/intermediate/forms/form8990/index.ts";
import { runBoundedForm8990TwoPass } from "../nodes/intermediate/forms/form8990/run-two-pass.ts";
import { projectForm8990ForExport } from "./form8990_projection.ts";
import type { MefFormsPending } from "./mef/types.ts";
import { F1040_2025_CONFIG } from "./config.ts";
import { inputNodes } from "./inputs.ts";
import { registry } from "./registry.ts";
import { buildMefBundle, buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assertF1040FinalHeader } from "./filer-source-reconciliation.ts";
import { assertNoRepeatedBrokerSaleSources } from "./broker-sale-source-reconciliation.ts";
import { applyForm8621QefRefigure } from "./form8621_1294_refigure.ts";
import { executeForm8839TwoPass } from "./form8839_two_pass.ts";

function executeReturn(inputs: Record<string, unknown>): ExecuteResult {
  if (
    inputs.form8990 !== undefined && Array.isArray(inputs.f8621) &&
    inputs.f8621.some((item) =>
      item !== null && typeof item === "object" &&
      "qef_1294_election" in item && item.qef_1294_election !== undefined
    )
  ) {
    throw new Error(
      "Form 8621 Election B needs a settled counterfactual before Form 8990 two-pass filing",
    );
  }
  if (inputs.f1099b !== undefined && inputs.f8949 !== undefined) {
    assertNoRepeatedBrokerSaleSources(
      { f1099bs: inputs.f1099b },
      { f8949s: inputs.f8949 },
    );
  }
  if (inputs.form8839 !== undefined) {
    if (inputs.form8990 !== undefined) {
      throw new Error(
        "Form 8839 with Form 8990 needs an established credit-ordering route",
      );
    }
    const full = executeForm8839TwoPass(inputs);
    return applyForm8621QefRefigure(inputs, full);
  }
  if (inputs.form8990 === undefined) {
    const full = execute(buildExecutionPlan(registry), registry, inputs, {
      taxYear: 2025,
      formType: "f1040",
    });
    return applyForm8621QefRefigure(inputs, full);
  }
  const source = form8990PublicInputSchema.parse(inputs.form8990);
  const returnInputs = Object.fromEntries(
    Object.entries(inputs).filter(([key]) => key !== "form8990"),
  );
  const twoPass = runBoundedForm8990TwoPass({
    returnInputs,
    receipts: source.receipts,
    interestExpenseRecords: source.interestExpenseRecords,
    priorFiledScheduleCs: source.priorFiledScheduleCs,
    priorFiledForm8990: source.priorFiledForm8990,
  });
  const calculatedForm8990 = projectForm8990ForExport({
    returnInputs,
    form8990: source,
  }, twoPass);
  return {
    pending: {
      ...twoPass.internalProjectedPending,
      form8990: calculatedForm8990,
    },
    diagnostics: [
      ...twoPass.finalizedReturn.diagnostics,
      {
        severity: "error",
        code: "EXECUTOR_NODE_FAILURE",
        nodeType: "form8990",
        nodeId: "form8990",
        message:
          "Calculated Form 8990 remains unfileable until source evidence and an accepted-filing carryforward ledger are durably persisted",
      },
    ],
    carryforwards: {
      ...twoPass.finalizedReturn.carryforwards,
      form8990_disallowed_2025: calculatedForm8990.line31,
    },
  };
}

export const f1040_2025: FormDefinition = {
  ...F1040_2025_CONFIG,
  inputNodes,
  registry,
  executeReturn,
  prepareReturn: async (
    pending,
    filer,
    attachments = [],
    retainedSourceDocuments = [],
  ) => {
    const normalized = buildPending(pending) as MefFormsPending;
    assertF1040FinalHeader(normalized.f1040 ?? {}, filer);
    const bundle = await buildMefBundle(normalized, {
      filer,
      attachments,
      retainedSourceDocuments,
      schemaVersion: F1040_2025_CONFIG.mefSchemaVersion,
      year: F1040_2025_CONFIG.taxYear,
      returnType: "1040",
    });
    return {
      bundle,
      renderPdf: () => buildPdfBytes(normalized, filer, ".pdf-cache", bundle),
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
