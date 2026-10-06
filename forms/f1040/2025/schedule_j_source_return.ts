import { isDeepStrictEqual } from "node:util";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { publicInputSchema } from "../nodes/inputs/schedule_j/index.ts";
import { scheduleJTaxSourceSchema } from "../nodes/intermediate/forms/schedule_j/tax-source.ts";
import { registry } from "./registry.ts";
import { buildPending } from "./mef/pending.ts";

const context = { taxYear: 2025, formType: "f1040" } as const;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      "Schedule J source replay needs a calculated source record",
    );
  }
  return value as Record<string, unknown>;
}
function total(value: unknown): number {
  if (value === undefined) return 0;
  const result = Array.isArray(value)
    ? value.reduce((sum, v) => sum + total(v), 0)
    : Number(value);
  if (!Number.isFinite(result)) {
    throw new Error("Schedule J source amount must be finite");
  }
  return result;
}
function raw(inputs: Record<string, unknown>): ExecuteResult {
  return execute(buildExecutionPlan(registry), registry, inputs, context);
}

/** Innermost graph stage, reusable in credit and QEF counterfactual passes. */
export function executeScheduleJSourceReturn(
  inputs: Record<string, unknown>,
): ExecuteResult {
  if (inputs.schedule_j === undefined) return raw(inputs);
  // Private worksheet operands cannot be supplied by a public caller.
  const source = publicInputSchema.parse(inputs.schedule_j);
  const preferential = Object.values(source.tax_treatment).some((facts) =>
    facts.has_qualified_dividends || facts.has_net_capital_gain ||
    facts.has_unrecaptured_section1250_gain || facts.has_28_percent_rate_gain
  );
  if (!preferential) return raw(inputs);
  const noElection = structuredClone(inputs);
  delete noElection.schedule_j;
  const baseline = raw(noElection);
  if (baseline.diagnostics.length) {
    throw new Error(
      "Schedule J needs a settled actual return without the election: " +
        baseline.diagnostics.map((d) => d.message).join("; "),
    );
  }
  const tax = record(baseline.pending.income_tax_calculation);
  const agi = record(baseline.pending.agi_aggregator);
  const farm = record(baseline.pending.schedule_j_calculation);
  // Establish the separately attributable investment income from actual graph
  // sources. Other business/adjustment allocations still need their own proof.
  const allowed = new Set([
    "filing_status",
    "line6_schedule_f",
    "line15_se_deduction",
    "line8z_form8621_qef",
    "line3b_ordinary_dividends",
    "line7_capital_gain",
    "line7a_capital_gain_distributions",
  ]);
  for (const [key, value] of Object.entries(agi)) {
    if (!allowed.has(key) && key !== "filing_status" && total(value) !== 0) {
      throw new Error(
        `Schedule J needs attributable current-year source allocation for ${key}`,
      );
    }
  }
  if (
    farm.fishing_net_profit !== undefined ||
    total(farm.schedule_c_net_profit) !== 0
  ) {
    throw new Error(
      "Schedule J preferential source replay needs independently allocated fishing or other business deductions",
    );
  }
  const worksheet = scheduleJTaxSourceSchema.parse({
    qualified_dividends: Math.round(total(tax.qualified_dividends)),
    net_capital_gain: Math.round(total(tax.net_capital_gain)),
    unrecaptured_1250_gain: Math.round(total(tax.unrecaptured_1250_gain)),
    rate_28_gain: Math.round(total(tax.rate_28_gain)),
    form4952_line4g: Math.round(total(tax.form4952_election)),
    form4952_line4e: Math.round(total(tax.form4952_elected_capital_gain)),
    source_reference: "actual-no-election-return-tax-sources",
  });
  const investment = total(agi.line3b_ordinary_dividends) +
    total(agi.line7_capital_gain) +
    total(agi.line7a_capital_gain_distributions);
  const finalInputs = structuredClone(inputs);
  finalInputs.schedule_j = {
    ...source,
    _derived_source: {
      current_year_tax_source: worksheet,
      nonfarm_investment_income: investment,
    },
  };
  const result = raw(finalInputs);
  if (result.diagnostics.length) return result;
  return {
    ...result,
    pending: {
      ...result.pending,
      schedule_j_source_replay: {
        source_inputs: structuredClone(inputs),
        no_election_income_tax: structuredClone(tax),
        no_election_form6251: structuredClone(baseline.pending.form6251),
      },
    },
  };
}

/** Exporters replay actual sources, including each filed prior-year worksheet. */
export function assertScheduleJSourceReturn(
  pending: Readonly<Record<string, unknown>>,
): void {
  const calculation = pending.schedule_j_calculation as
    | Record<string, unknown>
    | undefined;
  const sourceTax =
    (pending.income_tax_calculation as Record<string, unknown> | undefined)
      ?.schedule_j_current_tax_source;
  const treatment = calculation?.tax_treatment as
    | Record<string, Record<string, unknown>>
    | undefined;
  const filedJ = pending.schedule_j as Record<string, unknown> | undefined;
  const actualTax = pending.income_tax_calculation as
    | Record<string, unknown>
    | undefined;
  const actual1040 = pending.f1040 as Record<string, unknown> | undefined;
  const actualPreferential = filedJ?.line23 !== undefined &&
    (total(actualTax?.qualified_dividends) > 0 ||
      total(actualTax?.net_capital_gain) > 0 ||
      total(actual1040?.line3a_qualified_dividends) > 0);
  const preferential = actualPreferential || sourceTax !== undefined ||
    (treatment &&
      Object.values(treatment).some((f) =>
        f.has_qualified_dividends || f.has_net_capital_gain ||
        f.has_unrecaptured_section1250_gain || f.has_28_percent_rate_gain
      ));
  if (!preferential && pending.schedule_j_source_replay === undefined) return;
  const marker = record(pending.schedule_j_source_replay);
  const replay = executeScheduleJSourceReturn(record(marker.source_inputs));
  if (
    replay.diagnostics.length ||
    !isDeepStrictEqual(
      buildPending(replay.pending),
      buildPending(pending as Record<string, unknown>),
    )
  ) {
    throw new Error(
      "Schedule J filed return differs from actual source replay",
    );
  }
}
