import type { Form8621Lines } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function amount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Form 8621 Election B needs calculated ${label}`);
  }
  return value;
}

/** Per-PFIC Part III lines 9a–9c, reconciled to the filed return tax. */
export function form8621ElectionBTaxForHolding(
  pending: Readonly<Record<string, unknown>>,
  item: Form8621Lines["item"],
): { line9a: number; line9b: number; line9c: number } {
  if (!item.qef_1294_election) {
    throw new Error("Form 8621 tax allocation needs an elected QEF holding");
  }
  const rows = record(pending.form8621)?.items;
  if (!Array.isArray(rows)) {
    throw new Error("Form 8621 Election B needs calculated holding rows");
  }
  const elected = rows
    .map((row) => record(row)?.item)
    .map(record)
    .filter((row) => row?.qef_1294_election !== undefined);
  const f1040 = record(pending.f1040);
  const filedTax = amount(f1040?.line24_total_tax, "Form 1040 line 24");
  const totalDeferred = amount(
    f1040?.form8621_1294_deferred_tax ?? 0,
    "total deferred tax",
  );
  if (elected.length === 1) {
    return {
      line9a: filedTax + totalDeferred,
      line9b: filedTax,
      line9c: totalDeferred,
    };
  }
  const allocations = record(
    record(pending.form8621_1294_refigure)?.allocations,
  );
  const keys = elected.map((row) => String(row?.company_ein_or_ref));
  if (
    !allocations || keys.length < 2 ||
    Object.keys(allocations).length !== keys.length ||
    keys.some((key) => !(key in allocations))
  ) {
    throw new Error(
      "Form 8621 multiple Election B holdings need per-QEF tax allocation",
    );
  }
  let sum = 0;
  for (const key of keys) {
    const allocation = record(allocations[key]);
    const line9a = amount(allocation?.line9a, `${key} line 9a`);
    const line9b = amount(allocation?.line9b, `${key} line 9b`);
    const line9c = amount(allocation?.line9c, `${key} line 9c`);
    if (line9a !== filedTax + totalDeferred || line9c !== line9a - line9b) {
      throw new Error(
        "Form 8621 per-QEF tax allocation differs from full return",
      );
    }
    sum += line9c;
  }
  if (sum !== totalDeferred) {
    throw new Error("Form 8621 per-QEF deferred taxes differ from Form 1040");
  }
  const selected = record(allocations[item.company_ein_or_ref]);
  return {
    line9a: amount(selected?.line9a, "holding line 9a"),
    line9b: amount(selected?.line9b, "holding line 9b"),
    line9c: amount(selected?.line9c, "holding line 9c"),
  };
}
