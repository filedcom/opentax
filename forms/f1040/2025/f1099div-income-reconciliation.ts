import { inputSchema } from "../nodes/inputs/f1099div/index.ts";

/** Keep the retained portion of each issued 1099-DIV on final Form 1040. */
export function assert1099DivIncomeSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
): void {
  if (pending.f1099div === undefined) return;
  const copies = inputSchema.parse(pending.f1099div).f1099divs;
  const ordinary = copies.reduce(
    (sum, row) =>
      sum + row.box1a -
      (row.isNominee ? row.nominee_distribution?.box1a ?? 0 : 0),
    0,
  );
  const qualified = copies.reduce(
    (sum, row) =>
      sum + (row.box1b ?? 0) -
      (row.isNominee ? row.nominee_distribution?.box1b ?? 0 : 0),
    0,
  );
  const line3b = fields.line3b_ordinary_dividends ?? 0;
  const line3a = fields.line3a_qualified_dividends ?? 0;
  if (
    typeof line3b !== "number" || !Number.isFinite(line3b) ||
    line3b + 0.01 < ordinary
  ) {
    throw new Error(
      "Form 1040 line 3b omits sourced Form 1099-DIV ordinary dividends",
    );
  }
  if (
    typeof line3a !== "number" || !Number.isFinite(line3a) ||
    line3a + 0.01 < qualified
  ) {
    throw new Error(
      "Form 1040 line 3a omits sourced Form 1099-DIV qualified dividends",
    );
  }
}
