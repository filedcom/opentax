import { element, elements } from "../../../mef/xml.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  calculateDirectScheduleCForm8990,
  type DirectScheduleCSource,
  directScheduleCSourceSchema,
  type Form8990Lines,
} from "../../../nodes/intermediate/forms/form8990/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../nodes/inputs/schedule_c/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<
  Form8990Lines & { direct_schedule_c: DirectScheduleCSource }
>;

// Direct Schedule C, no carryforward/floor-plan/pass-through. Native TY2025
// v5.4 IRS8990.xsd sequence, omitting all inapplicable CFC and excess-item groups.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8990Lines, string]> =
  [
    ["line1", "CYBusIntExpnsBfr163jLmtAmt"],
    ["line2", "CfwdPrevDsallwIntExpenseAmt"],
    ["line4", "FlrPlanFinancingIntExpnsAmt"],
    ["line5", "TotalAllowableBusIntExpnsAmt"],
    ["line6", "TaxableIncomeAmt"],
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

function checkScheduleC(
  source: DirectScheduleCSource,
  context?: MefBuildContext,
): void {
  if (!context?.pending) {
    throw new Error("Form 8990 needs Schedule C reconciliation");
  }
  const scheduleC = scheduleCInputSchema.parse(context.pending.schedule_c);
  if (scheduleC.schedule_cs.length !== 1) {
    throw new Error("Form 8990 direct route needs one Schedule C business");
  }
  const item = scheduleC.schedule_cs[0];
  const interest = (item.line_16a_interest_mortgage ?? 0) +
    (item.line_16b_interest_other ?? 0);
  if (
    item.business_reference !== source.business_reference ||
    interest !== source.current_year_business_interest_expense ||
    (scheduleC.line16a_interest_mortgage ?? 0) > 0
  ) {
    throw new Error(
      "Form 8990 line 1 differs from identified Schedule C interest",
    );
  }
}

function buildIRS8990(fields: Input, context?: MefBuildContext): string {
  if (Object.keys(fields).length === 0) return "";
  const source = directScheduleCSourceSchema.parse(fields.direct_schedule_c);
  const lines = calculateDirectScheduleCForm8990(
    source,
    CONFIG_BY_YEAR[2025].smallBizGrossReceipts,
  );
  for (const [key] of FIELD_MAP) {
    if (fields[key] !== lines[key]) {
      throw new Error(`Form 8990 ${key} differs from source calculation`);
    }
  }
  checkScheduleC(source, context);
  return elements(
    "IRS8990",
    FIELD_MAP.map(([key, tag]) => element(tag, lines[key])),
  );
}

export const form8990: MefFormDescriptor<"form8990", Input> = {
  pendingKey: "form8990",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8990--2025.pdf",
  build: buildIRS8990,
};
