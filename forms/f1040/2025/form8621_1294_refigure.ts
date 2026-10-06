import { isDeepStrictEqual } from "node:util";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { f1040 } from "../nodes/outputs/f1040/index.ts";
import { buildPending } from "./mef/pending.ts";
import { registry } from "./registry.ts";
import { executeForm8839TwoPass } from "./form8839_two_pass.ts";

const context = { taxYear: 2025, formType: "f1040" } as const;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function deferredHoldings(inputs: Record<string, unknown>) {
  const holdings = inputs.f8621;
  if (holdings === undefined) return [];
  if (!Array.isArray(holdings)) {
    throw new Error("Form 8621 Election B needs actual holding source inputs");
  }
  return holdings.filter((value) => record(value)?.qef_1294_election);
}

/** Re-execute the entire return without only the undistributed QEF earnings. */
export function applyForm8621QefRefigure(
  inputs: Record<string, unknown>,
  full: ExecuteResult,
): ExecuteResult {
  const elected = deferredHoldings(inputs);
  if (elected.length === 0) return full;
  if (
    elected.length !== 1 || inputs.form8990 !== undefined
  ) {
    throw new Error(
      "Form 8621 Election B needs one elected holding and a settled full-return counterfactual",
    );
  }
  if (full.diagnostics.length > 0) return full;
  const withoutInputs = structuredClone(inputs);
  withoutInputs.f8621 = (withoutInputs.f8621 as Record<string, unknown>[])
    .map((item) => {
      const election = record(item.qef_1294_election);
      if (!election) return item;
      const ordinary = Number(item.qef_ordinary_income) -
        Number(election.undistributed_ordinary_earnings_usd);
      const capital = Number(item.qef_capital_gain) -
        Number(election.undistributed_capital_gain_usd);
      if (
        !Number.isFinite(ordinary) || !Number.isFinite(capital) ||
        ordinary < 0 || capital < 0
      ) {
        throw new Error(
          "Form 8621 Election B counterfactual exceeds actual QEF earnings",
        );
      }
      const { qef_1294_election: _election, ...rest } = item;
      return {
        ...rest,
        qef_ordinary_income: ordinary,
        qef_capital_gain: capital,
      };
    });
  const childSource = record(withoutInputs.f8615);
  if (childSource) {
    const election = record(record(elected[0])?.qef_1294_election);
    const removed = Number(election?.undistributed_ordinary_earnings_usd) +
      Number(election?.undistributed_capital_gain_usd);
    const childUnearned = Number(childSource.child_unearned_income);
    if (
      !Number.isFinite(removed) || !Number.isFinite(childUnearned) ||
      childUnearned < removed
    ) {
      throw new Error(
        "Form 8621 Election B child unearned income cannot exclude the QEF earnings",
      );
    }
    withoutInputs.f8615 = {
      ...childSource,
      child_unearned_income: childUnearned - removed,
    };
  }
  const without = inputs.form8839 === undefined
    ? execute(buildExecutionPlan(registry), registry, withoutInputs, context)
    : executeForm8839TwoPass(withoutInputs);
  if (without.diagnostics.length > 0) {
    throw new Error(
      "Form 8621 Election B needs a settled without-QEF return: " +
        without.diagnostics.map((row) => row.message).join("; "),
    );
  }
  const full1040 = record(buildPending(full.pending).f1040);
  const without1040 = record(buildPending(without.pending).f1040);
  const line9a = Number(full1040?.line22_tax_after_credits) +
    Number(full1040?.line23_other_taxes ?? 0);
  const line9b = Number(without1040?.line24_total_tax);
  if (
    !Number.isFinite(line9a) || !Number.isFinite(line9b) ||
    line9b >= line9a
  ) {
    throw new Error(
      "Form 8621 Election B needs a positive full-return tax increase from undistributed earnings",
    );
  }
  const sinkInput = {
    ...record(full.pending.f1040),
    form8621_1294_counterfactual_total_tax: line9b,
  };
  const oldSink = f1040.compute(
    context,
    f1040.inputSchema.parse(record(full.pending.f1040)),
  );
  const oldFiled = record(
    oldSink.outputs.find((output) => output.nodeType === "f1040")?.fields,
  );
  const sink = f1040.compute(context, f1040.inputSchema.parse(sinkInput));
  const filed = record(
    sink.outputs.find((output) => output.nodeType === "f1040")
      ?.fields,
  );
  if (!filed || !oldFiled) {
    throw new Error("Form 8621 Election B needs a recomputed Form 1040");
  }
  const retainedSinkInputs = Object.fromEntries(
    Object.entries(record(full.pending.f1040) ?? {}).filter(([key]) =>
      !(key in oldFiled)
    ),
  );
  return {
    ...full,
    pending: {
      ...full.pending,
      f1040: {
        ...retainedSinkInputs,
        ...filed,
        form8621_1294_counterfactual_total_tax: line9b,
      },
      form8621_1294_refigure: {
        source_inputs: structuredClone(inputs),
      },
    },
  };
}

/** Both exporters independently rerun the retained full and counterfactual returns. */
export function assertForm8621QefRefigureSource(
  pending: Readonly<Record<string, unknown>>,
): void {
  const marker = record(pending.form8621_1294_refigure);
  if (!marker) {
    throw new Error("Form 8621 Election B needs full-return source replay");
  }
  const inputs = record(marker.source_inputs);
  if (!inputs) {
    throw new Error("Form 8621 Election B needs actual source inputs");
  }
  const full = inputs.form8839 === undefined
    ? execute(buildExecutionPlan(registry), registry, inputs, context)
    : executeForm8839TwoPass(inputs);
  if (full.diagnostics.length > 0) {
    throw new Error(
      "Form 8621 section 1294 source return has graph diagnostics",
    );
  }
  const expected = applyForm8621QefRefigure(inputs, full);
  if (
    !isDeepStrictEqual(
      buildPending(expected.pending),
      buildPending(pending as Record<string, unknown>),
    )
  ) {
    throw new Error(
      "Form 8621 section 1294 filed return differs from full source and without-QEF refigure",
    );
  }
}
