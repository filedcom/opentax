import { inputSchema as form6251InputSchema } from "../../../../nodes/intermediate/forms/form6251/index.ts";

/** Recheck the property-level line 2l workpaper before native/PDF export. */
export function assertForm6251DepreciationSource(
  fields: Readonly<Record<string, unknown>>,
): void {
  const amount = fields.depreciation_adjustment;
  const raw = fields.line2l_depreciation_workpaper;
  if (
    (amount === undefined || amount === null || amount === 0) &&
    raw === undefined
  ) return;
  const parsed = form6251InputSchema.shape.line2l_depreciation_workpaper
    .safeParse(raw);
  const rows = parsed.success ? parsed.data?.properties : undefined;
  if (
    typeof amount !== "number" || amount === 0 || !rows ||
    new Set(rows.map((row) => row.property_id)).size !== rows.length ||
    rows.reduce(
        (sum, row) => sum + row.regular_tax_depreciation - row.amt_depreciation,
        0,
      ) !== amount
  ) {
    throw new Error(
      "Form 6251 line 2l needs its distinct reviewed property depreciation workpaper at export",
    );
  }
}
