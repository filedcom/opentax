import {
  ExpenditureType,
  inputSchema as form59eSourceSchema,
} from "../nodes/inputs/f59e/index.ts";

/** Recompute Form 6251 line 2o from the retained reviewed §59(e) records. */
export function assertForm6251CirculationSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const amount = fields.line2o_circulation_costs;
  const parsed = form59eSourceSchema.safeParse(pending?.f59e);
  const items = parsed.success ? parsed.data.f59es : [];
  const circulation = items.filter((item) =>
    item.expenditure_type === ExpenditureType.Circulation
  );
  const difference = circulation.reduce(
    (sum, item) =>
      sum + (item.regular_tax_deduction ?? 0) - (item.amt_deduction ?? 0),
    0,
  );
  if (
    (amount === undefined || amount === null || amount === 0) &&
    difference === 0 && circulation.length === 0 &&
    (parsed.success || pending?.f59e === undefined)
  ) return;
  if (
    !parsed.success || circulation.length === 0 ||
    circulation.length !== items.length ||
    circulation.some((item) =>
      item.regular_tax_deduction === undefined ||
      item.amt_deduction === undefined ||
      item.regular_three_year_writeoff_elected === undefined ||
      item.circulation_reviewed_workpaper_reference === undefined ||
      item.circulation_no_unamortized_property_loss !== true ||
      item.regular_tax_deduction > item.original_amount ||
      item.amt_deduction > item.original_amount ||
      item.remaining_unamortized > item.original_amount ||
      (item.regular_three_year_writeoff_elected &&
        item.regular_tax_deduction !== item.amt_deduction)
    ) ||
    new Set(
        circulation.map((item) =>
          item.circulation_reviewed_workpaper_reference
        ),
      ).size !== circulation.length ||
    difference !== (amount ?? 0)
  ) {
    throw new Error(
      "Form 6251 line 2o needs matching retained, reviewed circulation-cost deductions",
    );
  }
}
