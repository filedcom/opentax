import {
  EmployeeType,
  inputSchema as employeeExpenseSchema,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { reconcileFileableForm2106Return } from "../../../adjustments/employment/form2106/form2106_staged.ts";
import {
  form4972,
  inputSchema as form4972Schema,
} from "../../../../../nodes/intermediate/forms/taxes/retirement/form4972/index.ts";
import { reconcileForm4972EstatePartII } from "../../../taxes/retirement/form4972/form4972_estate_part2_reconciliation.ts";

/** The bounded, source-reconciled Form 4972 Part-II estate-tax line 16 route. */
export function scheduleALine16EstateTax(
  pending: Readonly<Record<string, unknown>> | undefined,
  filedLine16: unknown,
): number {
  const scheduleA = pending?.schedule_a;
  const sourceLine16 = scheduleA && typeof scheduleA === "object" &&
      !Array.isArray(scheduleA)
    ? (scheduleA as Record<string, unknown>).line_16_other_deductions ?? 0
    : 0;
  const line16 = filedLine16 ?? 0;
  if (typeof line16 !== "number" || !Number.isInteger(line16) || line16 < 0) {
    throw new Error("Schedule A line 16 needs a whole-dollar deduction amount");
  }
  if (line16 !== sourceLine16) {
    throw new Error("Schedule A line 16 differs from its retained source");
  }
  if (line16 === 0) return 0;
  const collection = pending?.form4972;
  const forms = collection && typeof collection === "object" &&
      !Array.isArray(collection)
    ? (collection as Record<string, unknown>).forms
    : undefined;
  if (!Array.isArray(forms) || forms.length !== 1) {
    throw new Error(
      "Schedule A positive line 16 needs one sourced Form 4972 Part-II estate-tax deduction",
    );
  }
  const rawFields = forms[0] as Record<string, unknown>;
  const fields = form4972Schema.parse(rawFields);
  if (
    fields.elect_capital_gain !== true ||
    fields.elect_10yr_averaging === true ||
    (fields.federal_estate_tax ?? 0) <= 0 ||
    fields.elect_include_nua === true
  ) {
    throw new Error(
      "Schedule A positive line 16 needs a supported Part-II federal estate-tax source",
    );
  }
  reconcileForm4972EstatePartII(rawFields, pending);
  const calculated = form4972.compute(
    { taxYear: 2025, formType: "f1040" },
    fields,
  ).outputs;
  const estateTax = calculated.find((output) =>
    output.nodeType === "schedule_a"
  )
    ?.fields.line_16_other_deductions;
  const filed = pending?.f1040;
  const filedItemized = filed && typeof filed === "object" &&
      !Array.isArray(filed)
    ? (filed as Record<string, unknown>).line12e_itemized_deductions
    : undefined;
  const comparison = pending?.standard_deduction;
  const computedItemized = comparison && typeof comparison === "object" &&
      !Array.isArray(comparison)
    ? (comparison as Record<string, unknown>).itemized_deductions
    : undefined;
  if (
    typeof estateTax !== "number" || estateTax <= 0 ||
    estateTax !== line16 ||
    typeof filedItemized !== "number" ||
    filedItemized !== computedItemized
  ) {
    throw new Error(
      "Schedule A line 16 differs from Form 4972 estate tax or the filed itemized deduction",
    );
  }
  return estateTax;
}

/** Source-checked line 16 rows, shared by native statements and printed labels. */
export function scheduleALine16Rows(
  pending: Readonly<Record<string, unknown>> | undefined,
  filedLine16: unknown,
) {
  const employeeExpenses = pending?.f2106 === undefined
    ? undefined
    : employeeExpenseSchema.parse(pending.f2106);
  if (
    employeeExpenses?.f2106s.some((item) =>
      item.qualification.kind === EmployeeType.DISABLED_IMPAIRMENT
    )
  ) {
    const result = reconcileFileableForm2106Return(pending!);
    if (filedLine16 !== result.scheduleATotal) {
      throw new Error(
        "Schedule A line 16 differs from owned impairment expenses",
      );
    }
    return [{
      description: "IMPAIRMENT-RELATED WORK EXPENSES",
      printedDescription: "Impairment-related work expenses",
      amount: result.scheduleATotal,
    }];
  }
  const estateTax = scheduleALine16EstateTax(pending, filedLine16);
  return estateTax > 0
    ? [{
      description: "FEDERAL ESTATE TAX",
      printedDescription: "Federal estate tax",
      amount: estateTax,
    }]
    : [];
}
