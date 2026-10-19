import { execute, type ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { registry } from "../../../../registry.ts";
import {
  type FilingStatus,
  filingStatusSchema,
} from "../../../../../nodes/types.ts";

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

function amount(value: unknown): number {
  const values = Array.isArray(value) ? value : [value];
  return values.reduce<number>((sum, item) => {
    if (item === undefined || item === null) return sum;
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error("Form 8863 needs computed AGI and income tax");
    }
    return sum + item;
  }, 0);
}

export interface Form8863ReturnFacts {
  readonly agi: number;
  readonly magi: number;
  readonly filingStatus: FilingStatus;
  readonly worksheet: {
    readonly form1040_line18_tax: number;
    readonly schedule3_line1_foreign_tax_credit: number;
    readonly schedule3_line2_dependent_care_credit: number;
    readonly schedule3_line6d: number;
    readonly schedule3_line6l: number;
  };
}

function returnFilingStatus(inputs: Record<string, unknown>): FilingStatus {
  const students = Array.isArray(inputs.f8863) ? inputs.f8863.map(row) : [];
  const status = filingStatusSchema.safeParse(
    inputs.general === undefined
      ? students[0]?.filing_status
      : row(inputs.general).filing_status,
  );
  if (!status.success) {
    throw new Error("Form 8863 needs the return's filing status");
  }
  return status.data;
}

/**
 * Form 8863 lines 3 and 14 and Credit Limit Worksheet lines 4 and 5, read
 * from a return whose AGI, tax and earlier credits are settled. None of them
 * depends on the education credit itself.
 */
export function form8863ReturnFacts(
  inputs: Record<string, unknown>,
  executed: ExecuteResult,
): Form8863ReturnFacts {
  const dependents = Array.isArray(inputs.f8812) ? inputs.f8812.map(row) : [];
  if (
    inputs.form4563 !== undefined ||
    dependents.some((item) =>
      amount(item.puerto_rico_excluded_income) > 0 ||
      amount(item.form_4563_amount) > 0
    )
  ) {
    throw new Error("Form 8863 MAGI needs supported foreign-income refigure");
  }
  const filingStatus = returnFilingStatus(inputs);
  const pending = buildPending(executed.pending);
  const sink = row(pending.f1040);
  const schedule3 = pending.schedule3 === undefined
    ? {}
    : row(pending.schedule3);
  const agi = sink.line11_agi;
  const line18 = sink.line18_total_tax_before_credits;
  if (
    typeof agi !== "number" || !Number.isFinite(agi) ||
    typeof line18 !== "number" || !Number.isFinite(line18)
  ) {
    throw new Error("Form 8863 needs computed AGI and income tax");
  }
  // Lines 3 and 14 add back Form 2555 exclusions (Pub. 970: lines 45 and 50).
  const magi = agi + amount(sink.form8839_form2555_line45) +
    amount(sink.form8839_form2555_line50);
  return {
    agi,
    magi,
    filingStatus,
    worksheet: {
      form1040_line18_tax: line18,
      schedule3_line1_foreign_tax_credit:
        amount(schedule3.line1_foreign_tax_credit) +
        amount(schedule3.line1_foreign_tax_1099),
      schedule3_line2_dependent_care_credit: amount(
        schedule3.line2_childcare_credit,
      ),
      schedule3_line6d: amount(schedule3.line6d_elderly_disabled_credit),
      schedule3_line6l: amount(schedule3.line6l_form8978_credit),
    },
  };
}

function claimsCredit(student: unknown): boolean {
  const item = row(student);
  return amount(item.aoc_adjusted_expenses) > 0 ||
    amount(item.llc_adjusted_expenses) > 0;
}

/** A claimed credit whose MAGI, filing status or credit limit is left to the return. */
export function form8863NeedsReturnFacts(
  inputs: Record<string, unknown>,
): boolean {
  if (!Array.isArray(inputs.f8863)) return false;
  const claiming = inputs.f8863.filter(claimsCredit);
  return claiming.length > 0 &&
    (inputs.f8863_credit_limit_worksheet === undefined ||
      claiming.some((student) =>
        row(student).filer_magi === undefined ||
        row(student).filing_status === undefined
      ));
}

/** Preparer-entered return-level values must equal the return's own. */
export function assertForm8863SuppliedFacts(
  inputs: Record<string, unknown>,
  facts: Form8863ReturnFacts,
): void {
  const students = Array.isArray(inputs.f8863) ? inputs.f8863.map(row) : [];
  if (
    students.some((student) =>
      student.filing_status !== undefined &&
      student.filing_status !== facts.filingStatus
    )
  ) {
    throw new Error(
      "Form 8863 filing status must equal the return's filing status",
    );
  }
  const worksheet = inputs.f8863_credit_limit_worksheet === undefined
    ? undefined
    : row(row(inputs.f8863_credit_limit_worksheet).credit_limit_worksheet);
  if (
    students.some((student) =>
      student.filer_magi !== undefined && student.filer_magi !== facts.magi
    ) ||
    (worksheet !== undefined &&
      Object.entries(facts.worksheet).some(([key, value]) =>
        worksheet[key] !== value
      ))
  ) {
    throw new Error(
      "Form 8863 filed MAGI and credit limit must equal the actual pre-education return",
    );
  }
}

/** Check a finished return's supplied Form 8863 values against that return. */
export function assertForm8863ReturnFacts(
  inputs: Record<string, unknown>,
  executed: ExecuteResult,
): void {
  if (
    !Array.isArray(inputs.f8863) || executed.diagnostics.length > 0 ||
    !inputs.f8863.some(claimsCredit)
  ) return;
  assertForm8863SuppliedFacts(inputs, form8863ReturnFacts(inputs, executed));
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
  const facts = form8863ReturnFacts(inputs, pre);
  if (!counterfactual) assertForm8863SuppliedFacts(inputs, facts);
  const { agi, magi } = facts;
  const line18 = facts.worksheet.form1040_line18_tax;
  const source = inputs.f8863_credit_limit_worksheet === undefined
    ? {}
    : row(inputs.f8863_credit_limit_worksheet);
  const worksheet = source.credit_limit_worksheet === undefined
    ? {}
    : row(source.credit_limit_worksheet);
  const secondInputs = {
    ...inputs,
    ...(provisionalDependent ? { f8812: provisionalDependent } : {}),
    f8863: inputs.f8863.map((student) => ({
      ...row(student),
      filer_magi: magi,
      filing_status: facts.filingStatus,
    })),
    f8863_credit_limit_worksheet: {
      ...source,
      credit_limit_worksheet: { ...worksheet, ...facts.worksheet },
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
      (dependent.agi !== agi ||
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
      agi,
      income_tax_liability: line18,
      credit_limit_worksheet: {
        ...dependentWorksheet,
        schedule3_line3: educationCredit,
      },
    }],
  });
}
