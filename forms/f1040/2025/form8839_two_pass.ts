import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { parsePublicForm8839Source } from "../nodes/intermediate/forms/form8839/public_source.ts";
import { finalizeStagedForm8839Sink } from "../nodes/intermediate/forms/form8839/staged_sink_finalizer.ts";
import { schedule3 } from "../nodes/intermediate/aggregation/schedule3/index.ts";
import { f1040 } from "../nodes/outputs/f1040/index.ts";
import { normalizePendingDict } from "./pending.ts";
import { registry } from "./registry.ts";

/** Recalculate the adoption credit after the ordinary graph settles. */
export function executeForm8839TwoPass(
  inputs: Record<string, unknown>,
): ExecuteResult {
  const { source, publicSource } = parsePublicForm8839Source(inputs.form8839);
  const firstInputs = Object.fromEntries(
    Object.entries(inputs).filter(([key]) => key !== "form8839"),
  );
  const pre = execute(buildExecutionPlan(registry), registry, firstInputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  if (
    pre.diagnostics.length > 0 ||
    ["form2555", "f2555", "form4563", "f4563"].some((key) =>
      inputs[key] !== undefined || pre.pending[key] !== undefined
    )
  ) {
    throw new Error(
      "Form 8839 needs a fully settled pre-adoption return without foreign-income exclusions",
    );
  }
  const graphSink = normalizePendingDict(pre.pending.f1040, "f1040");
  const graphSchedule3 = normalizePendingDict(
    pre.pending.schedule3,
    "schedule3",
  );
  if (!graphSink) {
    throw new Error("Form 8839 needs an executor-computed Form 1040 sink");
  }
  const marker = { form8839_source_credit_pending: true } as const;
  const emptySchedule3 = graphSchedule3 === undefined
    ? schedule3.compute(
      { taxYear: 2025, formType: "f1040" },
      schedule3.inputSchema.parse(marker),
    )
    : undefined;
  const schedule3To1040 = emptySchedule3?.outputs.find((output) =>
    output.nodeType === "f1040"
  )?.fields;
  if (graphSchedule3 === undefined && !schedule3To1040) {
    throw new Error("Form 8839 needs computed Schedule 3 priority lines");
  }
  const preSink = {
    ...graphSink,
    ...(schedule3To1040 ?? {}),
  };
  const preSchedule3 = { ...graphSchedule3, ...marker };
  const settled = finalizeStagedForm8839Sink(
    source,
    publicSource.reviewed_source,
    f1040.inputSchema.parse(preSink),
    publicSource.magi_review,
  );
  if (
    settled.credit.line18 <= 0 ||
    settled.credit.line14 !== settled.credit.line18
  ) {
    throw new Error(
      "Form 8839 direct route needs a positive fully used nonrefundable credit; carryforward filing is not supported",
    );
  }
  return {
    ...pre,
    pending: {
      ...pre.pending,
      form8839: source,
      form8839_route: {
        public_source: publicSource,
        pre_adoption_sink_input: preSink,
        pre_adoption_schedule3: preSchedule3,
      },
      schedule3: {
        ...preSchedule3,
        ...settled.finalSchedule3,
      },
      f1040: {
        ...preSink,
        ...settled.final1040,
      },
    },
  };
}
