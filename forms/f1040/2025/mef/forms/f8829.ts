import { element, elements } from "../../../mef/xml.ts";
import { TS } from "../../../nodes/types.ts";
import {
  calculateRentedHomeForm8829,
  type Form8829Lines,
  type RentedHomeSource,
  rentedHomeSourceSchema,
} from "../../../nodes/intermediate/forms/form_8829/index.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
  projectForm8829ScheduleCItems,
} from "../../../nodes/inputs/schedule_c/model.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<Form8829Lines & { rented_home: RentedHomeSource }>;

// TY2025 v5.4 IRS8829.xsd order. Inapplicable owner-home, direct-expense,
// casualty, interest, tax, and depreciation elements are omitted.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Form8829Lines, string]> =
  [
    ["line1", "BusinessUseSquareFeetCnt"],
    ["line2", "TotalAreaOfHomeCnt"],
    ["line3", "BusinessSquareFeetPct"],
    ["line7", "BusinessPct"],
    ["line8", "HomeBusinessGainOrLossAmt"],
    ["line18b", "InsuranceIndirectAmt"],
    ["line19b", "RentIndirectAmt"],
    ["line20b", "RepairsAndMaintIndirectAmt"],
    ["line21b", "UtilitiesIndirectAmt"],
    ["line22b", "OtherExpensesIndirectAmt"],
    ["line23b", "IndirectNondeductedSubtotalAmt"],
    ["line24", "AllwblIndrNondeductedExpnssAmt"],
    ["line25", "OperatingExpensesCarryoverAmt"],
    ["line26", "NondeductibleNetExpensesAmt"],
    ["line27", "AllowableOperatingExpensesAmt"],
    ["line28", "CsltyLossesAndDeprecLimitAmt"],
    ["line32", "CasualtyLossesAndDeprecNetAmt"],
    ["line33", "AllwblExCsltyLossesDeprecAmt"],
    ["line34", "TotalAllowableExpensesAmt"],
    ["line35", "CasualtyLossPortionAmt"],
    ["line36", "AllowableHomeBusExpnssSchCAmt"],
    ["line43", "OperatingExpensesAmt"],
    ["line44", "ExcessCsltyLossesAndDeprecAmt"],
  ];

function identity(source: RentedHomeSource, context?: MefBuildContext) {
  const filer = context?.filer;
  if (!filer) throw new Error("Form 8829 needs proprietor identity");
  if (source.recipient === TS.S) {
    if (!filer.spouse) throw new Error("Form 8829 spouse identity is missing");
    return {
      name: [
        filer.spouse.firstName,
        filer.spouse.middleInitial,
        filer.spouse.lastName,
      ]
        .filter(Boolean).join(" "),
      ssn: filer.spouse.ssn,
    };
  }
  const name = filer.fullName ?? filer.nameLine1;
  if (!name) throw new Error("Form 8829 proprietor name is missing");
  return { name, ssn: filer.primarySSN };
}

function checkScheduleC(
  source: RentedHomeSource,
  lines: Form8829Lines,
  context?: MefBuildContext,
): void {
  if (!context?.pending) {
    throw new Error("Form 8829 needs Schedule C reconciliation");
  }
  const scheduleC = scheduleCInputSchema.parse(context.pending.schedule_c);
  if (
    scheduleC.schedule_cs.length !== 1 ||
    scheduleC.schedule_cs[0].business_reference !== source.business_reference ||
    (scheduleC.wotc_wage_reductions?.length ?? 0) > 0 ||
    (scheduleC.line1_gross_receipts ?? 0) > 0 ||
    (scheduleC.statutory_wages ?? 0) > 0 ||
    (scheduleC.line16a_interest_mortgage ?? 0) > 0 ||
    (scheduleC.line_9_car_truck_expenses ?? 0) > 0 ||
    (scheduleC.line_12_depletion ?? 0) > 0 ||
    (scheduleC.line_30_home_office ?? 0) > 0 ||
    (scheduleC.schedule_cs[0].line_30_home_office ?? 0) > 0 ||
    scheduleC.schedule_cs[0].home_office_method === "simplified" ||
    scheduleC.schedule_cs[0].home_office_sq_ft !== undefined
  ) {
    throw new Error(
      "Form 8829 needs one identified Schedule C business and matching line 30",
    );
  }
  if (
    computeNetProfit(scheduleC.schedule_cs[0]) !==
      source.schedule_c_line29_tentative_profit
  ) {
    throw new Error("Form 8829 line 8 differs from Schedule C line 29");
  }
  const claim = scheduleC.form8829_line30;
  if (lines.line36 > 0) {
    if (
      !claim || claim.business_reference !== source.business_reference ||
      claim.home_identifier !== source.home_identifier ||
      claim.recipient !== TS.T || source.recipient !== TS.T ||
      claim.schedule_c_line29_tentative_profit !==
        source.schedule_c_line29_tentative_profit ||
      claim.line36 !== lines.line36
    ) {
      throw new Error("Form 8829 line 36 needs matching Schedule C claim");
    }
    const projected = projectForm8829ScheduleCItems(scheduleC)[0];
    if (
      projected.proprietor_recipient !== TS.T ||
      projected.line_30_home_office !== lines.line36 ||
      computeNetProfit(projected) !==
        source.schedule_c_line29_tentative_profit - lines.line36
    ) {
      throw new Error("Form 8829 line 36 differs from filed Schedule C");
    }
  } else if (claim) {
    throw new Error("Form 8829 zero line 36 cannot claim Schedule C line 30");
  }
}

function buildIRS8829(fields: Input, context?: MefBuildContext): string {
  if (Object.keys(fields).length === 0) return "";
  const source = rentedHomeSourceSchema.parse(fields.rented_home);
  const lines = calculateRentedHomeForm8829(source);
  for (const [key] of FIELD_MAP) {
    if (fields[key] !== lines[key]) {
      throw new Error(`Form 8829 ${key} differs from source calculation`);
    }
  }
  checkScheduleC(source, lines, context);
  const proprietor = identity(source, context);
  return elements("IRS8829", [
    element("ProprietorNm", proprietor.name),
    element("SSN", proprietor.ssn.replaceAll("-", "")),
    ...FIELD_MAP.map(([key, tag]) =>
      element(
        tag,
        key === "line3" || key === "line7" ? lines[key].toFixed(5) : lines[key],
      )
    ),
  ]);
}

export const form8829: MefFormDescriptor<"form_8829", Input> = {
  pendingKey: "form_8829",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8829--2025.pdf",
  build: buildIRS8829,
};
