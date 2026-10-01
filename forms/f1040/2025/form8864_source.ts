import {
  calculateForm8864,
  inputSchema as form8864InputSchema,
} from "../nodes/inputs/f8864/index.ts";
import { inputSchema as scheduleCInputSchema } from "../nodes/inputs/schedule_c/model.ts";

/** Direct proprietor and Form 8864 line 9 income-inclusion reconciliation. */
export function reconcileForm8864DirectProducer(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const source = form8864InputSchema.parse(raw);
  if (
    JSON.stringify(source) !==
      JSON.stringify(form8864InputSchema.parse(pending.f8864))
  ) {
    throw new Error("Form 8864 source differs from the prepared return");
  }
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  if (
    typeof form1040?.taxpayer_ssn !== "string" ||
    form1040.taxpayer_ssn.replaceAll("-", "") !== source.proprietor_ssn
  ) {
    throw new Error("Form 8864 producer differs from finalized Form 1040");
  }
  const businesses = scheduleCInputSchema.parse(pending.schedule_c).schedule_cs;
  const matches = businesses.filter((business) =>
    business.business_reference === source.schedule_c_business_reference
  );
  if (
    matches.length !== 1 ||
    matches[0].proprietor_recipient !== "T" ||
    matches[0].line_g_material_participation !== true ||
    matches[0].line_d_ein !== source.producer_ein ||
    matches[0].statutory_employee === true ||
    matches[0].disposed_of_business === true
  ) {
    throw new Error(
      "Form 8864 needs one taxpayer-owned Schedule C producer with the same EIN",
    );
  }
  const business = matches[0];
  const lines = calculateForm8864(source);
  if (
    (business.line_1_gross_receipts ?? 0) <= 0 ||
    business.line_6_other_income !== lines.line9
  ) {
    throw new Error(
      "Form 8864 line 9 credit must equal Schedule C line 6 other-income inclusion",
    );
  }
  return { source, lines };
}
