import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import {
  ExclusionType,
  inputSchema as form982Schema,
  qpriExcludedAmount,
} from "../../../../../nodes/intermediate/forms/income/other/form982/index.ts";
import {
  f1099c,
  inputSchema as f1099cSchema,
} from "../../../../../nodes/inputs/income/other/f1099c/index.ts";

export function assertForm982AbsentSource(
  pending: Readonly<Record<string, unknown>> | undefined,
  context: NodeContext,
): void {
  if (pending?.f1099c === undefined) return;
  const original = f1099cSchema.parse(pending.f1099c);
  const hasForm982Deposit = f1099c.compute(context, original).outputs.some((entry) => entry.nodeType === "form982");
  if (hasForm982Deposit) {
    throw new Error("Form 982 source exists without its required filing form");
  }
}

/** Verify the filed QPRI facts against the original, single excluded 1099-C. */
export function projectQpriForm982(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
  context: NodeContext,
) {
  // IRC §108(a)(1)(E), as amended by P.L. 119-21, and the Form 982 line 1e
  // instructions: a discharge after 2025 qualifies only under a written
  // arrangement entered into before 2026, which the 1099-C source lacks.
  if (context.taxYear >= 2026) {
    throw new Error(
      `Form 982 QPRI for TY${context.taxYear} needs a written arrangement entered into before 2026; IRC §108(a)(1)(E) excludes no later discharge without one`,
    );
  }
  const input = form982Schema.strict().parse(raw);
  if (input.exclusion_type !== ExclusionType.Qpri) {
    throw new Error(
      "Form 982 export needs tax-attribute reduction details for this exclusion type",
    );
  }
  if (input.principal_residence_retained === undefined) {
    throw new Error(
      "Form 982 QPRI needs confirmation whether the residence was retained",
    );
  }
  if (
    input.principal_residence_retained &&
    input.principal_residence_basis === undefined
  ) {
    throw new Error("Form 982 retained residence needs its basis for line 10b");
  }
  const original = f1099cSchema.parse(pending.f1099c);
  const excludedItems = original.f1099cs.filter((item) =>
    item.routing === "excluded"
  );
  if (
    excludedItems.length !== 1 ||
    excludedItems[0].exclusion_type !== ExclusionType.Qpri
  ) {
    throw new Error("Form 982 QPRI needs one original excluded 1099-C");
  }
  const sourceOutput = f1099c.compute(context, original).outputs.find((entry) => entry.nodeType === "form982");
  if (!sourceOutput) {
    throw new Error("Form 982 QPRI lacks an original 1099-C exclusion deposit");
  }
  const deposited = form982Schema.strict().parse(sourceOutput.fields);
  const inputKeys = Object.keys(input).sort();
  const depositedKeys = Object.keys(deposited).sort();
  if (
    inputKeys.length !== depositedKeys.length ||
    inputKeys.some((key, index) =>
      key !== depositedKeys[index] ||
      input[key as keyof typeof input] !== deposited[key as keyof typeof input]
    )
  ) {
    throw new Error("Form 982 QPRI differs from its original 1099-C deposit");
  }
  const cfg = CONFIG_BY_YEAR[context.taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${context.taxYear}`);
  const cap = input.qpri_mfs ? cfg.qpriCapMfs : cfg.qpriCapStandard;
  const excluded = qpriExcludedAmount(input, cap);
  if (excluded <= 0) {
    throw new Error("Form 982 QPRI has no qualifying debt to exclude");
  }
  return {
    qpri_checkbox: true,
    line2_excluded_cod: excluded,
    ...(input.principal_residence_retained && {
      line10b_principal_residence_basis_reduction: Math.min(
        excluded,
        input.principal_residence_basis!,
      ),
    }),
  };
}
