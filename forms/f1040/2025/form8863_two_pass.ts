import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildPending } from "./mef/pending.ts";
import { registry } from "./registry.ts";

const context = { taxYear: 2025, formType: "f1040" } as const;
export type Form8863GraphExecutor = (
  inputs: Record<string, unknown>,
) => ExecuteResult;
const rawGraph: Form8863GraphExecutor = (inputs) =>
  execute(buildExecutionPlan(registry), registry, inputs, context);

function row(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Form 8863 needs reviewed return-level source fields");
  }
  return value as Record<string, unknown>;
}

/** Recompute only Form 8863's return-derived workpaper operands. */
export function executeForm8863TwoPass(
  inputs: Record<string, unknown>,
  counterfactual = false,
  executeGraph: Form8863GraphExecutor = rawGraph,
): ExecuteResult {
  if (!Array.isArray(inputs.f8863) || inputs.f8863.length === 0) {
    throw new Error("Form 8863 two-pass needs actual student sources");
  }
  if (inputs.form8839 !== undefined || inputs.form8990 !== undefined) {
    throw new Error("Form 8863 two-pass needs settled other staged credits");
  }
  let provisionalDependent = inputs.f8812 === undefined ? undefined : (() => {
    if (!Array.isArray(inputs.f8812) || inputs.f8812.length !== 1) {
      throw new Error(
        "Form 8863 with Schedule 8812 needs one reviewed return source",
      );
    }
    const { agi: _agi, income_tax_liability: _tax, ...rest } = row(
      inputs.f8812[0],
    );
    return [rest];
  })();
  const firstInputs = Object.fromEntries(
    Object.entries(inputs).filter(([key]) =>
      ![
        "f8863",
        "f8863_claimant_review",
        "f8863_credit_limit_worksheet",
      ]
        .includes(key)
    ),
  );
  if (provisionalDependent) {
    const general = row(firstInputs.general);
    if (!["single", "mfj"].includes(String(general.filing_status))) {
      throw new Error(
        "Form 8863 with Schedule 8812 needs supported dependent tax context",
      );
    }
    const baseline = executeGraph({
      ...firstInputs,
      general: { ...general, dependents: [] },
      f8812: undefined,
    });
    if (baseline.diagnostics.length > 0) {
      throw new Error("Form 8863 needs settled pre-dependent income tax");
    }
    const baselineSink = row(buildPending(baseline.pending).f1040);
    provisionalDependent = [{
      ...provisionalDependent[0],
      agi: baselineSink.line11_agi,
      income_tax_liability: baselineSink.line18_total_tax_before_credits,
    }];
    firstInputs.f8812 = provisionalDependent;
  }
  const pre = executeGraph(firstInputs);
  if (pre.diagnostics.length > 0) {
    throw new Error(
      "Form 8863 needs a settled pre-education return: " +
        pre.diagnostics.map((item) => item.message).join("; "),
    );
  }
  const pending = buildPending(pre.pending);
  const sink = row(pending.f1040);
  const schedule3 = pending.schedule3 === undefined
    ? {}
    : row(pending.schedule3);
  if (inputs.form2555 !== undefined || inputs.form4563 !== undefined) {
    throw new Error("Form 8863 MAGI needs supported foreign-income refigure");
  }
  const magi = Number(sink.line11_agi);
  const line18 = Number(sink.line18_total_tax_before_credits);
  if (!Number.isFinite(magi) || !Number.isFinite(line18)) {
    throw new Error("Form 8863 needs computed AGI and income tax");
  }
  const source = row(inputs.f8863_credit_limit_worksheet);
  const worksheet = row(source.credit_limit_worksheet);
  const prior = {
    form1040_line18_tax: line18,
    schedule3_line1_foreign_tax_credit: Number(
      schedule3.line1_foreign_tax_credit ?? 0,
    ),
    schedule3_line2_dependent_care_credit: Number(
      schedule3.line2_childcare_credit ?? 0,
    ),
    schedule3_line6d: Number(schedule3.line6d_elderly_disabled_credit ?? 0),
    schedule3_line6l: Number(schedule3.line6l_form8978_credit ?? 0),
  };
  if (!counterfactual) {
    if (
      inputs.f8863.some((student) => row(student).filer_magi !== magi) ||
      Object.entries(prior).some(([key, value]) => worksheet[key] !== value)
    ) {
      throw new Error(
        "Form 8863 filed MAGI and credit limit must equal the actual pre-education return",
      );
    }
  }
  const secondInputs = {
    ...inputs,
    ...(provisionalDependent ? { f8812: provisionalDependent } : {}),
    f8863: inputs.f8863.map((student) => ({
      ...row(student),
      filer_magi: magi,
    })),
    f8863_credit_limit_worksheet: {
      ...source,
      credit_limit_worksheet: { ...worksheet, ...prior },
    },
  };
  if (inputs.f8812 === undefined) return executeGraph(secondInputs);
  const beforeDependent = executeGraph(secondInputs);
  if (beforeDependent.diagnostics.length > 0) {
    throw new Error("Form 8863 needs settled credit before Schedule 8812");
  }
  const educationCredit = Number(
    buildPending(beforeDependent.pending).schedule3?.line3_education_credit ??
      0,
  );
  const dependent = row(inputs.f8812[0]);
  const dependentWorksheet = row(dependent.credit_limit_worksheet);
  if (
    !Number.isFinite(educationCredit) ||
    (!counterfactual &&
      (dependent.agi !== magi ||
        dependent.income_tax_liability !== line18 ||
        dependentWorksheet.schedule3_line3 !== educationCredit))
  ) {
    throw new Error(
      "Schedule 8812 filed AGI, income tax, and preceding education credit must match source return",
    );
  }
  return executeGraph({
    ...secondInputs,
    f8812: [{
      ...dependent,
      agi: magi,
      income_tax_liability: line18,
      credit_limit_worksheet: {
        ...dependentWorksheet,
        schedule3_line3: educationCredit,
      },
    }],
  });
}
