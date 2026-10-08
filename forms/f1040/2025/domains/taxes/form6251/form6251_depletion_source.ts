import { projectScheduleCItems } from "../../../../nodes/inputs/schedule_c/model.ts";
import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCSourceSchema,
  wotcReductionsByBusiness,
} from "../../../../nodes/inputs/schedule_c/index.ts";

/** Recompute the signed Schedule C AMT depletion refigure at export. */
export function assertForm6251DepletionSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const amount = fields.line2d_depletion;
  const source = scheduleCSourceSchema.safeParse(pending?.schedule_c);
  const businesses = source.success ? projectScheduleCItems(source.data) : [];
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
  const unreviewedDepletion = businesses.some((business) =>
    (business.line_12_depletion ?? 0) > 0 &&
    business.amt_depletion_worksheet === undefined
  );
  if (
    (amount === undefined || amount === null || amount === 0) &&
    regular - amt === 0 && !unreviewedDepletion
  ) return;
  const reductions = source.success
    ? wotcReductionsByBusiness(source.data)
    : new Map<string, number>();
  const scheduleCProfit = businesses.reduce(
    (sum, business) =>
      sum + calculateScheduleCAtRiskNet(
        business,
        reductions.get(business.business_reference ?? "") ?? 0,
      ).atRiskNet,
    0,
  );
  const schedule1 = pending?.schedule1 as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const filedAmt = fields.line11_amt;
  if (
    !source.success || worksheets.length === 0 ||
    unreviewedDepletion ||
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
    regular - amt !== amount ||
    schedule1?.line3_schedule_c !== scheduleCProfit ||
    typeof filedAmt !== "number" || filedAmt <= 0 ||
    schedule2?.line2_amt !== filedAmt ||
    typeof form1040?.line17_additional_taxes !== "number" ||
    form1040.line17_additional_taxes < filedAmt ||
    typeof form1040.line16_income_tax !== "number" ||
    form1040.line18_total_tax_before_credits !==
      form1040.line16_income_tax + form1040.line17_additional_taxes
  ) {
    throw new Error(
      "Form 6251 line 2d needs matching retained Schedule C property-level AMT depletion and final-return tax",
    );
  }
}
