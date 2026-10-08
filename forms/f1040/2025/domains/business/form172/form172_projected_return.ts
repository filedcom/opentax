import type { SourceDocumentBytes } from "../../../../../../core/runtime/source-documents.ts";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { registry } from "../../../registry.ts";
import { executeForm172Form8990Return } from "./form172_form8990_return.ts";
import { executePreQefSourceReturn } from "../../execution/staged_source_return.ts";
import { agi_aggregator } from "../../../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../../nodes/outputs/schedule1/index.ts";
import { form6251 } from "../../../../nodes/intermediate/forms/form6251/index.ts";
import { f1040 } from "../../../../nodes/outputs/f1040/index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { stageForm172ReviewedReturnCalculation } from "./form172_reviewed_return.ts";

/** Internal full base-graph rerun, not a public/admitted NOL filing route.
 * The deduction comes only from recomputed retained history. Independent AMT,
 * special multi-pass composition and source/legal verification remain open. */
export async function stageForm172ProjectedReturn(
  rawInputs: Readonly<Record<string, unknown>>,
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const inputs = structuredClone(rawInputs);
  const staged = await stageForm172ReviewedReturnCalculation(
    inputs,
    rawBinding,
    rawDocuments,
    inputs.form8990 !== undefined
      ? (source) => executeForm172Form8990Return(source).execution
      : undefined,
  );
  // These routes need their source-dependent staging composed with the NOL
  // replay rather than silently falling back to the ordinary graph.
  if (
    inputs.schedule_j !== undefined ||
    (Array.isArray(inputs.f8621) &&
      inputs.f8621.some((v) =>
        v && typeof v === "object" && "qef_1294_election" in v
      ))
  ) {
    throw new Error(
      "NOL projection needs composed source-dependent return stages",
    );
  }
  const deduction = staged.deduction;
  class RetainedNolStart extends TaxNode {
    readonly nodeType = "start";
    readonly inputSchema = registry.start.inputSchema;
    readonly outputNodes = new OutputNodes([
      ...registry.start.outputNodeTypes.flatMap((t) =>
        registry[t] ? [registry[t]] : []
      ),
      agi_aggregator,
      schedule1,
      form6251,
    ]);
    compute(
      ctx: Parameters<typeof registry.start.compute>[0],
      input: Parameters<typeof registry.start.compute>[1],
    ) {
      const ordinary = registry.start.compute(ctx, input);
      return {
        ...ordinary,
        outputs: [...ordinary.outputs, {
          nodeType: agi_aggregator.nodeType,
          fields: { line8a_nol_deduction: deduction },
        }, {
          nodeType: schedule1.nodeType,
          fields: { line8a_nol_deduction: deduction },
        }, {
          nodeType: form6251.nodeType,
          fields: { line2e_regular_nol: deduction },
        }],
      };
    }
  }
  const projectedRegistry = { ...registry, start: new RetainedNolStart() };
  const executeNolGraph = (
    source: Record<string, unknown>,
    context: Parameters<typeof execute>[3] = {
      taxYear: 2025,
      formType: "f1040",
    },
  ) =>
    execute(
      buildExecutionPlan(projectedRegistry),
      projectedRegistry,
      source,
      context,
    );
  // Recompute return-derived adoption/education operands on every NOL pass.
  const interestComposition = inputs.form8990 === undefined
    ? undefined
    : executeForm172Form8990Return(inputs, executeNolGraph, deduction);
  const execution = interestComposition?.execution ??
    executePreQefSourceReturn(inputs, true, executeNolGraph);
  if (execution.diagnostics.length > 0) {
    throw new Error("NOL projection needs successful graph rerun");
  }
  const pending = normalizeAllPending(execution.pending);
  if (
    !pending.f1040 || pending.schedule1?.line8a_nol_deduction !== deduction ||
    Number(pending.f1040.line11_agi) !==
      Number(pending.f1040.line9_total_income) -
        Number(pending.f1040.line10_adjustments)
  ) {
    throw new Error("NOL projection Schedule1 and calculated Form1040 differ");
  }
  if (
    deduction > 0 &&
    (pending.form6251?.line2e_regular_nol !== deduction ||
      Number(pending.form6251?.nol_adjustment ?? 0) !== 0)
  ) {
    throw new Error(
      "NOL projection needs the regular AMT addback before ATNOLD",
    );
  }
  const finalizer = execution.replayInputs?.f1040;
  if (!finalizer) {
    throw new Error("NOL projection needs the actual retained finalizer");
  }
  const replayInput = f1040.inputSchema.parse(finalizer);
  const replay = f1040.compute(
    { taxYear: 2025, formType: "f1040" },
    replayInput,
  )
    .outputs.find((o) => o.nodeType === "f1040")?.fields;
  if (!replay) throw new Error("NOL projected finalizer replay is missing");
  for (const key of Object.keys(replay).filter((k) => /^line\d/.test(k))) {
    if (JSON.stringify(replay[key]) !== JSON.stringify(pending.f1040[key])) {
      throw new Error(`NOL projected finalizer differs from calculated ${key}`);
    }
  }
  // Keep both exports guarded even for an exhausted zero-valued loss history.
  pending.nol_carryforward = {
    nol_carryforwards: [{
      year: staged.originYear,
      nol_amount: staged.historyOpeningLoss,
    }],
  };
  return {
    ...staged,
    projected_pending: pending,
    projected_form1040: pending.f1040,
    projected_schedule1: pending.schedule1,
    projected_execution: execution,
    projected_return_replay_input: replayInput,
    projectedFinalizerReconciled: true as const,
    ...(interestComposition
      ? {
        form8990_nol_composition: interestComposition.twoPass,
        form8990NolOrderingReconciled: true as const,
      }
      : {}),
    baseGraphNolProjectionReconciled: true as const,
    amtRegularNolAddbackReconciled: true as const,
    currentAgiDependentRefiguresVerified: false as const,
    amtNolReconciled: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}
