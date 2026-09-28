import type { Form8990Lines } from "../../../nodes/intermediate/forms/form8990/index.ts";
import { reconcileForm8990Projection } from "../../form8990_projection.ts";
import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<Form8990Lines> & Record<string, unknown>;

// Direct Schedule C, zero reviewed prior carryforward, no floor-plan/pass-through. Native TY2025
// v5.4 IRS8990.xsd sequence, omitting all inapplicable CFC and excess-item groups.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8990Lines, string]> =
  [
    ["line1", "CYBusIntExpnsBfr163jLmtAmt"],
    ["line2", "CfwdPrevDsallwIntExpenseAmt"],
    ["line4", "FlrPlanFinancingIntExpnsAmt"],
    ["line5", "TotalAllowableBusIntExpnsAmt"],
    ["line6", "TaxableIncomeAmt"],
    ["line7", "LossDeductionNotAllocableAmt"],
    ["line8", "BusInterestExpnsNotPassThruAmt"],
    ["line9", "Sect172NOLTakenAmt"],
    ["line10", "Sect199AQlfyBusIncomeDedAmt"],
    ["line11", "DeprecAmortzDpltnDedTakenAmt"],
    ["line16", "TotalAdditionsAmt"],
    ["line18", "NotPassThruEntBusIntIncomeAmt"],
    ["line21", "TotalReductionsAmt"],
    ["line22", "AdjustedTaxableIncomeAmt"],
    ["line23", "CYBusinessInterestIncomeAmt"],
    ["line25", "TotalBusinessInterestIncomeAmt"],
    ["line26", "AdjTaxableIncomeApplcblPctAmt"],
    ["line29", "TotalBusIntExpnsLimitationAmt"],
    ["line30", "TotCYBusinessIntExpnsDedAmt"],
    ["line31", "DisallowedBusInterestExpnsAmt"],
  ];

function buildIRS8990(
  fields: Input,
  pending: Readonly<Record<string, unknown>>,
): string {
  if (Object.keys(fields).length === 0) return "";
  const projected = reconcileForm8990Projection(fields, pending);
  return elements(
    "IRS8990",
    FIELD_MAP.map(([key, tag]) => element(tag, projected[key])),
  );
}

export const form8990: MefFormDescriptor<"form8990", Input> = {
  pendingKey: "form8990",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8990--2025.pdf",
  build(fields, context) {
    if (Object.keys(fields).length === 0) return "";
    if (!context?.pending) {
      throw new Error("Form 8990 MeF needs the finalized return graph");
    }
    return buildIRS8990(fields, context.pending);
  },
};
