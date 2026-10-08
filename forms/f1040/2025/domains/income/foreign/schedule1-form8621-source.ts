import { f8621, type Form8621Lines } from "../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { income_tax_calculation } from "../../../../nodes/intermediate/worksheets/taxes/calculation/income_tax_calculation/index.ts";
import { assertForm8621QefRefigureSource } from "./form8621/form8621_1294_refigure.ts";

const incomeKeys = [
  "line8z_form8621_qef",
  "line8z_form8621_mtm",
  "line8z_form8621_section1291",
] as const;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function amount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error("Schedule 1 Form 8621 income needs whole-dollar amounts");
  }
  return value;
}

/** Replay the retained PFIC holdings before either final return exporter runs. */
export function assertSchedule1Form8621Source(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule1 = record(pending.schedule1);
  const form = record(pending.form8621);
  let expected: Record<string, unknown> | undefined;
  let expected1294: Record<string, unknown> | undefined;
  let expected8949: Record<string, unknown>[] = [];
  if (form !== undefined) {
    if (!Array.isArray(form.items) || form.items.length === 0) {
      throw new Error("Form 8621 source needs calculated holding rows");
    }
    const input = f8621.inputSchema.parse({
      f8621s: (form.items as Form8621Lines[]).map((line) => line.item),
    });
    const result = f8621.compute(
      { taxYear: 2025, formType: "f1040" },
      input,
    );
    expected8949 = result.outputs
      .filter((row) => row.nodeType === "form8949")
      .map((row) => record(record(row.fields)?.transaction))
      .filter((row): row is Record<string, unknown> => row !== undefined);
    expected = record(
      result.outputs.find((output) => output.nodeType === "schedule1")?.fields,
    );
    expected1294 = record(
      result.outputs.find((output) =>
        output.nodeType === "income_tax_calculation" &&
        record(output.fields)?.form8621_1294_undistributed_ordinary !==
          undefined
      )?.fields,
    );
  }
  const form8949 = record(pending.form8949);
  const rows8949 = Array.isArray(pending.form8949)
    ? pending.form8949
    : Array.isArray(form8949?.transaction)
    ? form8949.transaction
    : [];
  const actual8949 = rows8949
    .map(record)
    .filter((row): row is Record<string, unknown> => row !== undefined)
    .filter((row) =>
      typeof row.source_transaction_id === "string" &&
      row.source_transaction_id.startsWith("form8621:")
    );
  const fields8949 = [
    "part",
    "description",
    "source_transaction_id",
    "date_acquired",
    "date_sold",
    "proceeds",
    "cost_basis",
    "adjustment_codes",
    "adjustment_amount",
    "gain_loss",
    "is_long_term",
  ];
  const project8949 = (row: Record<string, unknown>) =>
    fields8949.map((field) => row[field]);
  if (
    JSON.stringify(actual8949.map(project8949)) !==
      JSON.stringify(expected8949.map(project8949))
  ) {
    throw new Error(
      "Form 8621 line 14c differs from Form 8949 residual capital loss",
    );
  }
  for (const key of incomeKeys) {
    if (amount(schedule1?.[key]) !== amount(expected?.[key])) {
      throw new Error(
        "Schedule 1 Form 8621 income differs from retained PFIC holdings",
      );
    }
  }
  const taxInput = record(pending.income_tax_calculation);
  for (
    const key of [
      "form8621_1294_undistributed_ordinary",
      "form8621_1294_undistributed_capital",
    ]
  ) {
    if (amount(taxInput?.[key]) !== amount(expected1294?.[key])) {
      throw new Error(
        "Form 8621 section 1294 tax deferral differs from retained QEF holdings",
      );
    }
  }
  const filed = record(pending.f1040);
  if (expected1294) {
    if (!taxInput) {
      throw new Error(
        "Form 8621 section 1294 needs retained tax worksheet inputs",
      );
    }
    const taxResult = income_tax_calculation.compute(
      { taxYear: 2025, formType: "f1040" },
      income_tax_calculation.inputSchema.parse(taxInput),
    );
    const calculated = record(
      taxResult.outputs.find((output) => output.nodeType === "f1040")?.fields,
    );
    const beforeCredits = amount(
      calculated?.form8621_1294_deferred_tax_before_credits,
    );
    const line22 = amount(filed?.line22_tax_after_credits);
    const line23 = amount(filed?.line23_other_taxes);
    if (
      amount(filed?.form8621_1294_deferred_tax_before_credits) !==
        beforeCredits
    ) {
      throw new Error(
        "Form 8621 section 1294 tax worksheet differs from source",
      );
    }
    assertForm8621QefRefigureSource(pending);
    const applied = line22 + line23 -
      amount(filed?.form8621_1294_counterfactual_total_tax);
    if (
      amount(filed?.form8621_1294_deferred_tax) !== applied ||
      amount(filed?.form8621_1294_total_tax_before_deferral) !==
        line22 + line23 ||
      amount(filed?.line24_total_tax) !== line22 + line23 - applied
    ) {
      throw new Error(
        "Form 8621 section 1294 Form 1040 tax differs from source",
      );
    }
  } else if (
    amount(filed?.form8621_1294_deferred_tax) !== 0 ||
    amount(filed?.form8621_1294_deferred_tax_before_credits) !== 0
  ) {
    throw new Error("Form 8621 section 1294 tax has no QEF election source");
  }
}
