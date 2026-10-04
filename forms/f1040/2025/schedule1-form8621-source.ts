import { f8621, type Form8621Lines } from "../nodes/inputs/f8621/index.ts";

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
    expected = record(
      result.outputs.find((output) => output.nodeType === "schedule1")?.fields,
    );
  }
  for (const key of incomeKeys) {
    if (amount(schedule1?.[key]) !== amount(expected?.[key])) {
      throw new Error(
        "Schedule 1 Form 8621 income differs from retained PFIC holdings",
      );
    }
  }
}
