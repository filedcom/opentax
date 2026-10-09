import { assertPublicAbleContributionSources } from "./domains/credits/individual/form8880/form8880_able_sources.ts";
import { assertPublicEmployeeContributionSources } from "./domains/credits/individual/form8880/form8880_employee_sources.ts";
import { assertPublicSaverDistributionSources } from "./domains/credits/individual/form8880/form8880_distribution_sources.ts";
import { preparePublicForm8886Return } from "./domains/general/filing/form8886/public-return.ts";
import { assertPassiveSCorpLossCalculationInputs } from "./domains/income/business/passive-s-corp-loss-calculation.ts";
import type { FormDefinition } from "../../../core/types/form-definition.ts";
import type { ExecuteResult } from "../../../core/runtime/executor.ts";
import type { FilerIdentity } from "../mef/header.ts";
import { publicInputSchema as form8990PublicInputSchema } from "../nodes/intermediate/forms/deductions/business/form8990/index.ts";
import { runBoundedForm8990TwoPass } from "../nodes/intermediate/forms/deductions/business/form8990/run-two-pass.ts";
import { projectForm8990ForExport } from "./domains/deductions/business/form8990/form8990_projection.ts";
import type { MefFormsPending } from "./mef/types.ts";
import { F1040_2025_CONFIG } from "./config.ts";
import { inputNodes } from "./inputs.ts";
import { registry } from "./registry.ts";
import { buildMefBundle, buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/execution/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assertF1040FinalHeader } from "./domains/general/return-assembly/filer-source-reconciliation.ts";
import { assertNoRepeatedBrokerSaleSources } from "./domains/income/investments/broker-sale-source-reconciliation.ts";
import { applyForm8621QefRefigure } from "./domains/income/foreign/form8621/form8621_1294_refigure.ts";
import { executePreQefSourceReturn } from "./return-processing/staged_source_return.ts";

function executeReturn(inputs: Record<string, unknown>): ExecuteResult {
  assertPublicSaverDistributionSources(inputs.general, inputs.f1099r);
  assertPublicEmployeeContributionSources(inputs.general, inputs.w2);
  assertPublicAbleContributionSources(inputs.general, inputs.w2);
  assertPassiveSCorpLossCalculationInputs(inputs);
  const elected = Array.isArray(inputs.f8621) &&
    inputs.f8621.some((item) =>
      item !== null && typeof item === "object" &&
      "qef_1294_election" in item && item.qef_1294_election !== undefined
    );
  if (elected && inputs.form8839 !== undefined && inputs.f8863 !== undefined) {
    throw new Error(
      "Form 8621 Election B with both adoption and education credits needs a settled combined counterfactual",
    );
  }
  if (
    inputs.form8990 !== undefined && elected
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
    const full = executePreQefSourceReturn(inputs);
    return applyForm8621QefRefigure(inputs, full);
  }
  if (inputs.form8990 === undefined) {
    const full = executePreQefSourceReturn(inputs);
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
