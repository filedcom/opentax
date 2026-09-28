import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import {
  ExclusionType,
  inputSchema as form982Schema,
  qpriExcludedAmount,
} from "../nodes/intermediate/forms/form982/index.ts";
import {
  f1099c,
  inputSchema as f1099cSchema,
} from "../nodes/inputs/f1099c/index.ts";

export function assertForm982AbsentSource(
  pending?: Readonly<Record<string, unknown>>,
): void {
  if (pending?.f1099c === undefined) return;
  const original = f1099cSchema.parse(pending.f1099c);
  const hasForm982Deposit = f1099c.compute(
    { taxYear: 2025, formType: "f1040" },
    original,
  ).outputs.some((entry) => entry.nodeType === "form982");
  if (hasForm982Deposit) {
    throw new Error("Form 982 source exists without its required filing form");
  }
}

/** Verify the filed QPRI facts against the original, single excluded 1099-C. */
export function projectQpriForm982(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
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
  const sourceOutput = f1099c.compute(
    { taxYear: 2025, formType: "f1040" },
    original,
  ).outputs.find((entry) => entry.nodeType === "form982");
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
  const cap = input.qpri_mfs
    ? CONFIG_BY_YEAR[2025].qpriCapMfs
    : CONFIG_BY_YEAR[2025].qpriCapStandard;
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
