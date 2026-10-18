import {
  inputSchema as disasterSourceSchema,
  verifyGroupedDistributionSources,
} from "../../nodes/inputs/income/retirement/f8915f/index.ts";
import { inputSchema as generalSourceSchema } from "../../nodes/inputs/general/filing/general/index.ts";
import { extractFilerIdentity as extractDisasterFiler } from "../../mef/filer.ts";
import { assertPublicAbleContributionSources } from "../domains/credits/individual/form8880/form8880_able_sources.ts";
import { assertPublicSection1231HistoryOwner } from "../../nodes/intermediate/forms/income/business/form4797/prior_history.ts";
import {
  assertLtcOwners,
  ltcLedgerSchema,
} from "../../nodes/intermediate/forms/adjustments/health/form8853/ltc.ts";
import { z } from "zod";
import { assertPublicEmployeeContributionSources } from "../domains/credits/individual/form8880/form8880_employee_sources.ts";
import { assertPublicSaverDistributionSources } from "../domains/credits/individual/form8880/form8880_distribution_sources.ts";
import { assertPassiveSCorpLossCalculationInputs } from "../domains/income/business/passive-s-corp-loss-calculation.ts";
import type { ExecuteResult } from "../../../../core/runtime/executor.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { publicInputSchema as form8990PublicInputSchema } from "../../nodes/intermediate/forms/deductions/business/form8990/index.ts";
import { runBoundedForm8990TwoPass } from "../../nodes/intermediate/forms/deductions/business/form8990/run-two-pass.ts";
import { projectForm8990ForExport } from "../domains/deductions/business/form8990/form8990_projection.ts";
import { assertNoRepeatedBrokerSaleSources } from "../domains/income/investments/broker-sale-source-reconciliation.ts";
import { applyForm8621QefRefigure } from "../domains/income/foreign/form8621/form8621_1294_refigure.ts";
import { executePreQefSourceReturn } from "./staged_source_return.ts";

/**
 * The staged Form 1040 return every tax year runs: source guards, the Form
 * 8839 and 8863 two-pass credits, Schedule J, Form 8990 and the Form 8621 QEF
 * refigure, each over the graph for `context.taxYear`.
 */
export function executeF1040Return(
  inputs: Record<string, unknown>,
  context: NodeContext,
): ExecuteResult {
  const disasterInput = Array.isArray(inputs.f8915f)
    ? { f8915fs: inputs.f8915f }
    : inputs.f8915f;
  if (disasterInput) {
    const items = disasterSourceSchema.parse(disasterInput).f8915fs ?? [];
    if (items.length > 1) {
      verifyGroupedDistributionSources(
        items,
        Array.isArray(inputs.f1099r)
          ? { f1099rs: inputs.f1099r }
          : inputs.f1099r,
        extractDisasterFiler(generalSourceSchema.parse(inputs.general)),
      );
    }
  }
  const ltc = z.object({ ltc_ledger: ltcLedgerSchema.optional() }).parse(
    inputs.form8853 ?? {},
  ).ltc_ledger;
  if (ltc) assertLtcOwners(ltc, inputs.general);
  assertPublicSection1231HistoryOwner(
    inputs.general,
    inputs.form4797_prior_history,
  );
  assertPublicSaverDistributionSources(inputs.general, inputs.f1099r);
  assertPublicEmployeeContributionSources(inputs.general, inputs.w2);
  assertPublicAbleContributionSources(
    inputs.general,
    inputs.w2,
    inputs.schedule_c,
    inputs.schedule_f,
  );
  assertPassiveSCorpLossCalculationInputs(inputs);
  const elected = Array.isArray(inputs.f8621) &&
    inputs.f8621.some((item) =>
      item !== null && typeof item === "object" &&
      "qef_1294_election" in item && item.qef_1294_election !== undefined
    );
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
    const full = executePreQefSourceReturn(inputs, context);
    return applyForm8621QefRefigure(inputs, full, context);
  }
  if (inputs.form8990 === undefined) {
    const full = executePreQefSourceReturn(inputs, context);
    return applyForm8621QefRefigure(inputs, full, context);
  }
  const source = form8990PublicInputSchema.parse(inputs.form8990);
  const returnInputs = Object.fromEntries(
    Object.entries(inputs).filter(([key]) => key !== "form8990"),
  );
  const twoPass = runBoundedForm8990TwoPass({
    context,
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
      [`form8990_disallowed_${context.taxYear}`]: calculatedForm8990.line31,
    },
  };
}
