import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { z } from "zod";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { publicInputSchema } from "../nodes/inputs/schedule_j/index.ts";
import { scheduleJTaxSourceSchema } from "../nodes/intermediate/forms/schedule_j/tax-source.ts";
import { registry } from "./registry.ts";
import { buildPending } from "./mef/pending.ts";

const nonfarmEmployerRecordSchema = z.object({
  tax_year: z.literal(2025),
  issued_by: z.string().trim().min(1),
  issued_on: z.string().regex(/^202[5-6]-\d{2}-\d{2}$/),
  employer_ein: z.string().regex(/^\d{9}$/),
  employer_name: z.string().trim().min(1),
  legal_entity_type: z.literal("c_corporation"),
  naics_code: z.string().regex(/^\d{6}$/),
  employee_ssn: z.string().regex(/^\d{9}$/),
  w2_source_document_reference: z.string().trim().min(1),
  w2_box1_wages: z.number().int().positive(),
  w2_box2_withholding: z.number().nonnegative(),
  w2_box3_ss_wages: z.number().nonnegative(),
  w2_box5_medicare_wages: z.number().nonnegative(),
  employment_start: z.string().regex(/^2025-\d{2}-\d{2}$/),
  employment_end: z.string().regex(/^2025-\d{2}-\d{2}$/),
  services: z.string().trim().min(1),
}).strict();

function nonfarmWages(
  inputs: Record<string, unknown>,
  source: z.infer<typeof publicInputSchema>,
): number {
  const w2s = inputs.w2;
  if (w2s === undefined) {
    if (source.nonfarm_wage_source) {
      throw new Error("Schedule J nonfarm wage record has no issued W-2");
    }
    return 0;
  }
  if (
    !Array.isArray(w2s) || w2s.length !== 1 ||
    !source.nonfarm_wage_source
  ) {
    throw new Error(
      "Schedule J needs each nonfarm wage attributed to one issued W-2 and employer record",
    );
  }
  const wage = record(w2s[0]);
  const proof = source.nonfarm_wage_source;
  const encoded = proof.bytes_base64;
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (
    btoa(String.fromCharCode(...bytes)) !== encoded ||
    createHash("sha256").update(bytes).digest("hex") !== proof.sha256
  ) {
    throw new Error(
      "Schedule J nonfarm employer record bytes differ from retained digest",
    );
  }
  const employer = nonfarmEmployerRecordSchema.parse(
    JSON.parse(new TextDecoder().decode(bytes)),
  );
  const general = record(inputs.general);
  const farm = record(
    record(inputs.schedule_f).schedule_fs instanceof Array
      ? (record(inputs.schedule_f).schedule_fs as unknown[])[0]
      : undefined,
  );
  const digits = (v: unknown) => String(v ?? "").replaceAll("-", "");
  const amount = Number(wage.box1_wages);
  if (
    !Number.isSafeInteger(amount) || amount <= 0 ||
    employer.naics_code.startsWith("11") ||
    employer.employment_start > employer.employment_end ||
    employer.issued_on < employer.employment_end ||
    employer.employer_ein === digits(farm.line_d_ein) ||
    employer.issued_by !== employer.employer_name ||
    employer.employer_ein !== digits(wage.employer_ein) ||
    employer.employer_name !== wage.employer_name ||
    employer.employee_ssn !== digits(general.taxpayer_ssn) ||
    employer.employee_ssn !== digits(wage.employee_ssn) ||
    employer.w2_source_document_reference !== wage.source_document_reference ||
    proof.document_id !== wage.schedule_j_nonfarm_wage_source_document_id ||
    employer.w2_box1_wages !== amount ||
    employer.w2_box2_withholding !== wage.box2_fed_withheld ||
    employer.w2_box3_ss_wages !== wage.box3_ss_wages ||
    employer.w2_box5_medicare_wages !== wage.box5_medicare_wages ||
    wage.box13_statutory_employee === true
  ) {
    throw new Error(
      "Schedule J W-2 does not match a distinct nonfarm employer and owner source",
    );
  }
  return amount;
}

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
  const wages = nonfarmWages(inputs, source);
  // Establish the separately attributable investment income from actual graph
  // sources. Other business/adjustment allocations still need their own proof.
  const allowed = new Set([
    "filing_status",
    "line6_schedule_f",
    "line15_se_deduction",
    "line8z_form8621_qef",
    "line3b_ordinary_dividends",
    "line1a_wages",
    "line7_capital_gain",
    "line7a_cap_gain_distrib",
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
    total(agi.line7a_cap_gain_distrib);
  if (total(agi.line1a_wages) !== wages) {
    throw new Error(
      "Schedule J nonfarm W-2 wages differ from actual AGI source",
    );
  }
  const finalInputs = structuredClone(inputs);
  finalInputs.schedule_j = {
    ...source,
    _derived_source: {
      current_year_tax_source: worksheet,
      nonfarm_investment_income: investment,
      ...(wages ? { nonfarm_wage_income: wages } : {}),
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
  executeFiledReturn: (
    inputs: Record<string, unknown>,
  ) => ExecuteResult = executeScheduleJSourceReturn,
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
  const qef = pending.form8621_1294_refigure === undefined
    ? undefined
    : record(pending.form8621_1294_refigure);
  const adoption = pending.form8839_route === undefined
    ? undefined
    : record(pending.form8839_route);
  const sourceInputs = qef === undefined
    ? {
      ...record(marker.source_inputs),
      ...(adoption === undefined ? {} : {
        form8839: adoption.public_source,
      }),
    }
    : record(qef.source_inputs);
  const replay = executeFiledReturn(sourceInputs);
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
