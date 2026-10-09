import { z } from "zod";
import {
  calculateBonus4562,
  filedBonus4562Schema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form4562/bonus.ts";
import { inputSchema as scheduleCSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import {
  calculateForm8911PropertyAmounts,
  inputSchema as form8911Schema,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";

export function reconcileBonus4562(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const filed = filedBonus4562Schema.parse(raw);
  const retained = filedBonus4562Schema.parse(pending.form4562);
  const expected = calculateBonus4562(retained.bonus_asset);
  if (JSON.stringify(filed) !== JSON.stringify(expected)) {
    throw new Error("Form 4562 bonus lines differ from the retained asset");
  }
  const asset = expected.bonus_asset;
  const owner = z.object({ taxpayer_ssn: z.string() }).parse(pending.f1040);
  const businesses = scheduleCSchema.parse(pending.schedule_c).schedule_cs;
  if (
    owner.taxpayer_ssn.replaceAll("-", "") !== asset.proprietor_ssn ||
    businesses.length !== 1 ||
    businesses[0].business_reference !== asset.business_reference ||
    businesses[0].proprietor_recipient !== "T" ||
    !businesses[0].line_g_material_participation ||
    businesses[0].statutory_employee === true ||
    businesses[0].disposed_of_business === true
  ) {
    throw new Error(
      "Form 4562 bonus asset needs one participating taxpayer-owned Schedule C",
    );
  }
  if (
    (businesses[0].line_13_depreciation ?? 0) !==
      expected.line22_total_depreciation
  ) {
    throw new Error(
      "Form 4562 bonus depreciation differs from Schedule C line 13",
    );
  }
  if (
    ["schedule_f", "schedule_e", "form4835"].some((key) =>
      pending[key] !== undefined
    )
  ) {
    throw new Error(
      "Form 4562 single bonus asset cannot establish other activity depreciation",
    );
  }
  if (asset.form8911_property_reference) {
    const source = form8911Schema.parse(pending.f8911);
    const properties = source.properties;
    const property = properties?.find((p) =>
      p.property_reference === asset.form8911_property_reference
    );
    if (
      !property || properties?.length !== 1 || property.cost !== asset.cost ||
      property.business_use_pct !== 1 ||
      property.placed_in_service !== asset.placed_in_service_date ||
      property.property_description !== asset.asset_description ||
      property.business_source?.proprietor_ssn !== asset.proprietor_ssn ||
      property.business_source.schedule_c_business_reference !==
        asset.business_reference ||
      property.business_source.source_document_reference !==
        asset.source_document_ref ||
      property.business_source.section179_deduction !== 0
    ) {
      throw new Error(
        "Form 4562 bonus asset differs from its Form 8911 property",
      );
    }
    const credit = calculateForm8911PropertyAmounts(property);
    if (
      credit.businessCredit !== asset.credit_basis_reduction ||
      credit.personalCredit !== 0
    ) {
      throw new Error(
        "Form 4562 basis reduction differs from Form 8911 property credit",
      );
    }
  } else if (
    asset.credit_basis_reduction !== 0 || pending.f8911 !== undefined
  ) {
    throw new Error(
      "Form 4562 bonus asset needs its Form 8911 basis-reduction link",
    );
  }
  return expected;
}
