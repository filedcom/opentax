import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { filedForm461Schema } from "../../../nodes/intermediate/forms/form461/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Fields = z.infer<typeof filedForm461Schema>;
type Input = Fields | readonly [];

// IRS461.xsd, TY2025 v5.4: preserve the native sequence and signed values.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line2_business_income_loss", "BusinessIncomeLossAmt"],
  ["line3_capital_gain_loss", "CapitalGainLossAmt"],
  ["line4_other_gain_loss", "OtherGainLossAmt"],
  ["line5_rental_income_loss", "RentalRealEstateIncomeLossAmt"],
  ["line6_net_farm_profit_loss", "NetFarmProfitLossAmt"],
  ["line8_other_income_gain_loss", "OtherIncomeGainOrLossAmt"],
  ["line9_total_income_loss", "TotalIncomeOrLossAmt"],
  ["line10_nonbusiness_income_gain", "IncomeOrGainAmt"],
  ["line11_nonbusiness_deduction_loss", "DeductionOrLossAmt"],
  ["line12_nonbusiness_total", "TotalGainOrLossAmt"],
  ["line13_adjustment", "AdjustedTotalGainOrLossAmt"],
  ["line14_adjusted_total", "AdjustedTotalIncomeAmt"],
  ["line15_threshold", "FilingStatusThresholdCd"],
  ["line16_excess_business_loss", "ExcessBusinessLossAmt"],
];

function pendingLine(
  pending: object,
  key: string,
): number {
  const value = Object.entries(pending).find(([name]) => name === key)?.[1];
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  if (
    key === "line5_schedule_e" && Array.isArray(value) &&
    value.every((entry) => typeof entry === "number")
  ) {
    return value.reduce((sum: number, entry: number) => sum + entry, 0);
  }
  throw new Error(`Form 461 cannot reconcile ${key} from the filed return`);
}

function buildIRS461(rawFields: Input, context?: MefBuildContext): string {
  // The executor may retain input fields even when no filed form was emitted.
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  if (
    rawFields !== null && typeof rawFields === "object" &&
    !FIELD_MAP.some(([key]) => key in rawFields)
  ) return "";
  const fields = filedForm461Schema.parse(rawFields);
  if (
    fields.line9_total_income_loss !==
      fields.line2_business_income_loss + fields.line6_net_farm_profit_loss ||
    fields.line14_adjusted_total !== fields.line9_total_income_loss ||
    fields.line16_excess_business_loss !==
      fields.line14_adjusted_total + fields.line15_threshold
  ) {
    throw new Error(
      "Form 461 lines 9, 14, and 16 do not reconcile to the source lines and threshold",
    );
  }
  const pending = context?.pending;
  if (!pending?.schedule1 || !pending.f1040) {
    throw new Error(
      "Form 461 needs filed Schedule 1 and Form 1040 for C/F-only reconciliation",
    );
  }
  const schedule1 = pending.schedule1;
  const f1040 = z.record(z.unknown()).parse(pending.f1040);
  if (!f1040.filing_status) {
    throw new Error("Form 461 needs the filed Form 1040 filing status");
  }
  const expectedThreshold = f1040.filing_status === "mfj" ? 626_000 : 313_000;
  if (fields.line15_threshold !== expectedThreshold) {
    throw new Error(
      "Form 461 line 15 does not match the return filing status",
    );
  }
  const c = pendingLine(schedule1, "line3_schedule_c");
  const f = pendingLine(schedule1, "line6_schedule_f");
  const excess = pendingLine(schedule1, "line8p_excess_business_loss");
  if (c !== fields.line2_business_income_loss) {
    throw new Error("Form 461 line 2 does not reconcile to Schedule 1 line 3");
  }
  if (f !== fields.line6_net_farm_profit_loss) {
    throw new Error("Form 461 line 6 does not reconcile to Schedule 1 line 6");
  }
  if (excess !== Math.max(0, -fields.line16_excess_business_loss)) {
    throw new Error(
      "Form 461 line 16 does not reconcile to Schedule 1 line 8p",
    );
  }
  const unsupportedReturnLines = [
    ["Form 1040 line 7a Schedule D", pendingLine(f1040, "line7_capital_gain")],
    [
      "Form 1040 line 7a direct distribution",
      pendingLine(f1040, "line7a_cap_gain_distrib"),
    ],
    ["Schedule 1 line 4", pendingLine(schedule1, "line4_other_gains")],
    ["Schedule 1 line 5", pendingLine(schedule1, "line5_schedule_e")],
  ] as const;
  for (const [label, amount] of unsupportedReturnLines) {
    if (amount !== 0) {
      throw new Error(
        `Form 461 C/F-only route cannot classify ${label}; complete the other Part I and Part II lines`,
      );
    }
  }
  for (const [key] of Object.entries(schedule1)) {
    if (
      key.startsWith("line8") && key !== "line8p_excess_business_loss" &&
      pendingLine(schedule1, key) !== 0
    ) {
      throw new Error(
        `Form 461 C/F-only route cannot classify Schedule 1 ${key}`,
      );
    }
  }
  const unsupportedSources = [
    "schedule_d",
    "form8949",
    "form6781",
    "schedule_e",
    "form8582",
    "form4797",
    "form6252",
    "form4684",
    "form8824",
  ] as const;
  for (const key of unsupportedSources) {
    if (pending[key] !== undefined) {
      throw new Error(
        `Form 461 C/F-only route cannot classify ${key} source items`,
      );
    }
  }
  return elements(
    "IRS461",
    FIELD_MAP.map(([key, tag]) => element(tag, fields[key])),
  );
}

export const form461: MefFormDescriptor<"form461", Input> = {
  pendingKey: "form461",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f461.pdf",
  build(fields, context) {
    return buildIRS461(fields, context);
  },
};
