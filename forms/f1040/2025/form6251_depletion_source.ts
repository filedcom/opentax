import { inputSchema as scheduleCSourceSchema } from "../nodes/inputs/schedule_c/index.ts";

/** Recompute the signed Schedule C AMT depletion refigure at export. */
export function assertForm6251DepletionSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const amount = fields.line2d_depletion;
  if (amount === undefined || amount === null || amount === 0) return;
  const source = scheduleCSourceSchema.safeParse(pending?.schedule_c);
  const businesses = source.success ? source.data.schedule_cs : [];
  const worksheets = businesses.filter((business) =>
    business.amt_depletion_worksheet !== undefined
  );
  const regular = worksheets.reduce(
    (sum, business) =>
      sum + (business.amt_depletion_worksheet?.properties.reduce(
        (total, property) => total + property.regular_allowed_depletion,
        0,
      ) ?? 0),
    0,
  );
  const amt = worksheets.reduce(
    (sum, business) =>
      sum + (business.amt_depletion_worksheet?.properties.reduce(
        (total, property) => total + property.amt_allowed_depletion,
        0,
      ) ?? 0),
    0,
  );
  const propertyReferences = worksheets.flatMap((business) =>
    business.amt_depletion_worksheet!.properties.map((property) =>
      property.property_reference
    )
  );
  if (
    !source.success || worksheets.length === 0 ||
    businesses.some((business) =>
      (business.line_12_depletion ?? 0) > 0 &&
      business.amt_depletion_worksheet === undefined
    ) ||
    worksheets.some((business) =>
      business.line_g_material_participation !== true ||
      business.line_32_at_risk === "b" ||
      business.at_risk_simplified !== undefined ||
      business.line_12_depletion !==
        business.amt_depletion_worksheet!.properties.reduce(
          (sum, property) => sum + property.regular_allowed_depletion,
          0,
        )
    ) ||
    new Set(propertyReferences).size !== propertyReferences.length ||
    regular - amt !== amount
  ) {
    throw new Error(
      "Form 6251 line 2d needs matching retained Schedule C property-level AMT depletion",
    );
  }
}
