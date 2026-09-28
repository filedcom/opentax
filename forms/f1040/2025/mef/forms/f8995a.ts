import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  assertPatron1099PATRSource,
  calculateOneBusiness8995ALines,
  calculateOneSstb8995ALines,
  calculateScheduleCLossLines,
  type Form8995AInput,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
} from "../../../nodes/inputs/schedule_c/model.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { assertScheduleBAggregationJoin } from "./f8995a_schedule_b.ts";

type Input = Form8995AInput | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

// Native parent projection for the single bounded aggregation.
export function buildStagedAggregatedIRS8995A(
  raw: unknown,
  context: MefBuildContext | undefined,
): string {
  const input = inputSchema.strict().parse(raw);
  const { source, parent } = assertScheduleBAggregationJoin(input, context);
  const lines = [
    elements("QBIDeductionInformationGrp", [
      elements("TradeOrBusinessName", [
        element("BusinessNameLine1Txt", source.group_name),
      ]),
      element("AggregatedInd", "X"),
      element("QualifiedBusinessIncomeAmt", parent.line2),
      element("QlfyBusinessIncome20PctAmt", parent.line3),
      element("AllocableShareW2WagesAmt", parent.line4),
      element("AllocableShareW2Wages50PctAmt", parent.line5),
      element("AllocableShareW2Wages25PctAmt", parent.line6),
      element("AllocableShareUBIAQlfyPropAmt", parent.line7),
      element("AllcblShrUBIAQlfyProp025PctAmt", parent.line8),
      element("TotalAllcblW2WgsQlfyPropPctAmt", parent.line9),
      element("GrtrAllcblShrW2WageQlfyPropAmt", parent.line10),
      element("W2WageQlfyPropLimitationAmt", parent.line11),
      element("QBIDedBeforePatronReductionAmt", parent.line13),
      element("QBIComponentAmt", parent.line15),
    ]),
    element("TotalQBIComponentAmt", parent.line16),
    element("QlfyREITDivPTPIncomeLossAmt", 0),
    element("PYQlfyREITDivPTPLossCfwdAmt", 0),
    element("TotQlfyREITDivPTPIncomeAmt", 0),
    element("REITPTPComponentAmt", 0),
    element("QBIDedBfrIncomeLimitationAmt", parent.line32),
    element("TaxableIncomeBeforeQBIDedAmt", parent.line33),
    element("NetCapitalGainAmt", 0),
    element("AdjustedTaxableIncomeAmt", parent.line35),
    element("IncomeLimitationAmt", parent.line36),
    element("QBIDedBeforeDPADSect199AgAmt", parent.line37),
    element("DPADSect199AgAllocAgricHortAmt", 0),
    element("QualifiedBusinessIncomeDedAmt", parent.line39),
    element("TotQlfyREITDivPTPLossCfwdAmt", 0),
  ];
  return elements("IRS8995A", lines);
}

export function validateOneBusiness(fields: Form8995AInput) {
  const details = fields.business_filing_details;
  if (!details) {
    throw new Error(
      "Form 8995-A MeF needs identified per-business QBI source details",
    );
  }
  if (
    fields.filing_status !== NodeFilingStatus.Single ||
    fields.taxable_income <=
      CONFIG_BY_YEAR[2025].qbiThresholdSingle +
        CONFIG_BY_YEAR[2025].qbiPhaseInRange / 2
  ) {
    throw new Error(
      "Form 8995-A MeF currently supports only single filers fully above the wage-limit phase-in range",
    );
  }
  if (
    (fields.sstb_qbi ?? 0) !== 0 ||
    (fields.sstb_w2_wages ?? 0) !== 0 ||
    (fields.sstb_unadjusted_basis ?? 0) !== 0 ||
    (fields.line6_sec199a_dividends ?? 0) !== 0 ||
    (fields.qbi_loss_carryforward ?? 0) !== 0 ||
    (fields.reit_loss_carryforward ?? 0) !== 0 ||
    (fields.aggregation_groups ?? []).length !== 0 ||
    fields.net_capital_gain !== 0
  ) {
    throw new Error(
      "Form 8995-A MeF does not yet support SSTB, aggregation, REIT/PTP, loss, or capital-gain paths",
    );
  }
  if (
    fields.patron_of_specified_cooperative === true &&
    !fields.patron_filing_details
  ) {
    throw new Error(
      "Form 8995-A MeF needs Schedule D cooperative and 1099-PATR source details",
    );
  }
  if (
    fields.patron_of_specified_cooperative !== true &&
    fields.patron_filing_details
  ) {
    throw new Error(
      "Form 8995-A MeF cooperative source requires affirmative patron status",
    );
  }
  if (
    fields.qbi === undefined || fields.qbi <= 0 ||
    fields.w2_wages === undefined || fields.unadjusted_basis === undefined ||
    fields.qbi !== details.business_qbi ||
    fields.w2_wages !== details.business_w2_wages ||
    fields.unadjusted_basis !== details.business_ubia ||
    ![
      fields.qbi,
      fields.w2_wages,
      fields.unadjusted_basis,
      fields.taxable_income,
    ]
      .every(Number.isInteger)
  ) {
    throw new Error(
      "Form 8995-A MeF needs matching whole-dollar per-business QBI, W-2 wages, UBIA, and taxable income",
    );
  }
  const lines = calculateOneBusiness8995ALines(fields);
  if (!Object.values(lines).every(Number.isInteger) || lines.line39 <= 0) {
    throw new Error(
      "Form 8995-A MeF needs a positive whole-dollar calculated QBI deduction",
    );
  }
  return { details, lines };
}

export function assertScheduleCLossSources(
  fields: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const lines = calculateScheduleCLossLines(fields);
  const source = scheduleCInputSchema.safeParse(pending?.schedule_c);
  if (
    !source.success || !source.data.schedule_cs ||
    source.data.schedule_cs.length !== 2 ||
    source.data.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    pending?.form8829 !== undefined || pending?.form5884 !== undefined
  ) {
    throw new Error(
      "Form 8995-A Schedule C needs exactly two retained unadjusted Schedule C source items",
    );
  }
  for (const business of lines.businesses) {
    const sourceItem = source.data.schedule_cs.find((item) =>
      item.business_reference === business.business_reference
    );
    if (
      !sourceItem ||
      JSON.stringify(sourceItem) !==
        JSON.stringify(business.source_schedule_c) ||
      computeNetProfit(sourceItem) !== business.qbi ||
      (sourceItem.line_26_wages ?? 0) < business.w2_wages
    ) {
      throw new Error(
        "Form 8995-A Schedule C QBI, payroll, and business source differ from the retained Schedule C return",
      );
    }
  }
}

function reconcileReturn(
  context: MefBuildContext | undefined,
  deduction: number,
  fields: Form8995AInput,
): void {
  if (!context?.filer || !context.pending) {
    throw new Error(
      "Form 8995-A MeF needs return header and pending deduction reconciliation context",
    );
  }
  if (context.filer.filingStatus !== HeaderFilingStatus.Single) {
    throw new Error("Form 8995-A filing status differs from the return header");
  }
  if (context.pending.form8995 !== undefined) {
    throw new Error(
      "Form 8995-A and Form 8995 cannot both be pending for one return",
    );
  }
  const companion = context.pending.form8995a_schedule_d;
  const sstbCompanion = context.pending.form8995a_schedule_a;
  const lossCompanion = context.pending.form8995a_schedule_c;
  if (fields.sstb_filing_details) {
    const parsed = inputSchema.strict().safeParse(sstbCompanion);
    if (
      !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(fields)
    ) {
      throw new Error(
        "Form 8995-A Schedule A companion is missing or differs from its parent source",
      );
    }
  } else if (sstbCompanion !== undefined) {
    throw new Error("Form 8995-A Schedule A companion has no SSTB parent");
  }
  if (fields.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
    assertScheduleCLossSources(fields, context.pending);
    const parsed = inputSchema.strict().safeParse(lossCompanion);
    if (
      !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(fields)
    ) {
      throw new Error(
        "Form 8995-A Schedule C companion is missing or differs from its parent source",
      );
    }
  } else if (lossCompanion !== undefined) {
    throw new Error("Form 8995-A Schedule C companion has no loss parent");
  }
  if (fields.patron_of_specified_cooperative === true) {
    assertPatron1099PATRSource(fields, context.pending.f1099patr);
    const parsed = inputSchema.strict().safeParse(companion);
    if (
      !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(fields)
    ) {
      throw new Error(
        "Form 8995-A Schedule D companion is missing or differs from its parent source",
      );
    }
  } else if (companion !== undefined) {
    throw new Error("Form 8995-A Schedule D companion has no patron parent");
  }
  const form1040 = z.object({ line13_qbi_deduction: z.number() })
    .safeParse(context.pending.f1040);
  if (!form1040.success || form1040.data.line13_qbi_deduction !== deduction) {
    throw new Error("Form 8995-A line 39 differs from Form 1040 line 13");
  }
}

function buildIRS8995A(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  if (Object.keys(rawFields).length === 0) {
    throw new Error("Form 8995-A MeF cannot file an empty pending record");
  }
  const fields = inputSchema.strict().parse(rawFields);
  if (
    fields.aggregation_filing_details ||
    (fields.aggregation_groups ?? []).length > 0
  ) {
    return buildStagedAggregatedIRS8995A(fields, context);
  }
  if (fields.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
    const lines = calculateScheduleCLossLines(fields);
    reconcileReturn(context, lines.parent.line39, fields);
    const parent = lines.parent;
    return elements("IRS8995A", [
      ...lines.businesses.map((business) => {
        const adjusted = business.qbi > 0;
        return elements("QBIDeductionInformationGrp", [
          elements("TradeOrBusinessName", [
            element("BusinessNameLine1Txt", business.business_name!),
          ]),
          element("EIN", business.ein!),
          element("QualifiedBusinessIncomeAmt", adjusted ? parent.line2 : 0),
          element("QlfyBusinessIncome20PctAmt", adjusted ? parent.line3 : 0),
          element("AllocableShareW2WagesAmt", adjusted ? parent.line4 : 0),
          element("AllocableShareW2Wages50PctAmt", adjusted ? parent.line5 : 0),
          element("AllocableShareW2Wages25PctAmt", adjusted ? parent.line6 : 0),
          element("AllocableShareUBIAQlfyPropAmt", adjusted ? parent.line7 : 0),
          element(
            "AllcblShrUBIAQlfyProp025PctAmt",
            adjusted ? parent.line8 : 0,
          ),
          element(
            "TotalAllcblW2WgsQlfyPropPctAmt",
            adjusted ? parent.line9 : 0,
          ),
          element(
            "GrtrAllcblShrW2WageQlfyPropAmt",
            adjusted ? parent.line10 : 0,
          ),
          element("W2WageQlfyPropLimitationAmt", adjusted ? parent.line11 : 0),
          element(
            "QBIDedBeforePatronReductionAmt",
            adjusted ? parent.line13 : 0,
          ),
          element("QBIComponentAmt", adjusted ? parent.line15 : 0),
        ]);
      }),
      element("TotalQBIComponentAmt", parent.line16),
      element("QlfyREITDivPTPIncomeLossAmt", 0),
      element("PYQlfyREITDivPTPLossCfwdAmt", 0),
      element("TotQlfyREITDivPTPIncomeAmt", 0),
      element("REITPTPComponentAmt", 0),
      element("QBIDedBfrIncomeLimitationAmt", parent.line32),
      element("TaxableIncomeBeforeQBIDedAmt", parent.line33),
      element("NetCapitalGainAmt", 0),
      element("AdjustedTaxableIncomeAmt", parent.line35),
      element("IncomeLimitationAmt", parent.line36),
      element("QBIDedBeforeDPADSect199AgAmt", parent.line37),
      element("DPADSect199AgAllocAgricHortAmt", 0),
      element("QualifiedBusinessIncomeDedAmt", parent.line39),
      element("TotQlfyREITDivPTPLossCfwdAmt", 0),
    ]);
  }
  if (
    fields.sstb_filing_details || (fields.sstb_qbi ?? 0) !== 0 ||
    (fields.sstb_w2_wages ?? 0) !== 0 ||
    (fields.sstb_unadjusted_basis ?? 0) !== 0
  ) {
    const lines = calculateOneSstb8995ALines(fields);
    reconcileReturn(context, lines.line39, fields);
    return elements("IRS8995A", [
      elements("QBIDeductionInformationGrp", [
        elements("TradeOrBusinessName", [
          element("BusinessNameLine1Txt", lines.source.business_name),
        ]),
        element("SpecifiedServiceInd", "X"),
        element("EIN", lines.source.ein),
        element("QualifiedBusinessIncomeAmt", lines.line2),
        element("QlfyBusinessIncome20PctAmt", lines.line3),
        element("AllocableShareW2WagesAmt", lines.line4),
        element("AllocableShareW2Wages50PctAmt", lines.line5),
        element("AllocableShareW2Wages25PctAmt", lines.line6),
        element("AllocableShareUBIAQlfyPropAmt", lines.line7),
        element("AllcblShrUBIAQlfyProp025PctAmt", lines.line8),
        element("TotalAllcblW2WgsQlfyPropPctAmt", lines.line9),
        element("GrtrAllcblShrW2WageQlfyPropAmt", lines.line10),
        element("W2WageQlfyPropLimitationAmt", lines.line11),
        element("QBIDedBeforePatronReductionAmt", lines.line13),
        element("QBIComponentAmt", lines.line15),
        ...(lines.line19 > 0
          ? [
            element("QBI20PctLessGrtrAllcblShareAmt", lines.line19),
            element("TotalPhaseInReductionAmt", lines.line25),
            element("QBIAfterPhaseInReductionAmt", lines.line26),
          ]
          : []),
      ]),
      element("TotalQBIComponentAmt", lines.line16),
      element(
        "FilingStatusThresholdCd",
        CONFIG_BY_YEAR[2025].qbiThresholdSingle,
      ),
      element(
        "TXIBfrQBIDedLessThresholdAmt",
        lines.line33 - CONFIG_BY_YEAR[2025].qbiThresholdSingle,
      ),
      element("FilingStatusPhaseInRangeCd", 50_000),
      element("PhaseInPct", lines.phaseIn.toFixed(5)),
      element("QlfyREITDivPTPIncomeLossAmt", 0),
      element("PYQlfyREITDivPTPLossCfwdAmt", 0),
      element("TotQlfyREITDivPTPIncomeAmt", 0),
      element("REITPTPComponentAmt", 0),
      element("QBIDedBfrIncomeLimitationAmt", lines.line32),
      element("TaxableIncomeBeforeQBIDedAmt", lines.line33),
      element("NetCapitalGainAmt", 0),
      element("AdjustedTaxableIncomeAmt", lines.line35),
      element("IncomeLimitationAmt", lines.line36),
      element("QBIDedBeforeDPADSect199AgAmt", lines.line37),
      element("DPADSect199AgAllocAgricHortAmt", 0),
      element("QualifiedBusinessIncomeDedAmt", lines.line39),
      element("TotQlfyREITDivPTPLossCfwdAmt", 0),
    ]);
  }
  const { details, lines } = validateOneBusiness(fields);
  reconcileReturn(context, lines.line39, fields);
  return elements("IRS8995A", [
    elements("QBIDeductionInformationGrp", [
      elements("TradeOrBusinessName", [
        element("BusinessNameLine1Txt", details.business_name),
      ]),
      element("EIN", details.ein),
      ...(fields.patron_of_specified_cooperative === true
        ? [element("PatronInd", "X")]
        : []),
      element("QualifiedBusinessIncomeAmt", lines.line2),
      element("QlfyBusinessIncome20PctAmt", lines.line3),
      element("AllocableShareW2WagesAmt", lines.line4),
      element("AllocableShareW2Wages50PctAmt", lines.line5),
      element("AllocableShareW2Wages25PctAmt", lines.line6),
      element("AllocableShareUBIAQlfyPropAmt", lines.line7),
      element("AllcblShrUBIAQlfyProp025PctAmt", lines.line8),
      element("TotalAllcblW2WgsQlfyPropPctAmt", lines.line9),
      element("GrtrAllcblShrW2WageQlfyPropAmt", lines.line10),
      element("W2WageQlfyPropLimitationAmt", lines.line11),
      element("QBIDedBeforePatronReductionAmt", lines.line13),
      ...(fields.patron_of_specified_cooperative === true
        ? [element("PatronReductionAmt", lines.line14)]
        : []),
      element("QBIComponentAmt", lines.line15),
    ]),
    element("TotalQBIComponentAmt", lines.line16),
    element("QlfyREITDivPTPIncomeLossAmt", 0),
    element("PYQlfyREITDivPTPLossCfwdAmt", 0),
    element("TotQlfyREITDivPTPIncomeAmt", 0),
    element("REITPTPComponentAmt", 0),
    element("QBIDedBfrIncomeLimitationAmt", lines.line32),
    element("TaxableIncomeBeforeQBIDedAmt", lines.line33),
    element("NetCapitalGainAmt", lines.line34),
    element("AdjustedTaxableIncomeAmt", lines.line35),
    element("IncomeLimitationAmt", lines.line36),
    element("QBIDedBeforeDPADSect199AgAmt", lines.line37),
    element("DPADSect199AgAllocAgricHortAmt", 0),
    element("QualifiedBusinessIncomeDedAmt", lines.line39),
    element("TotQlfyREITDivPTPLossCfwdAmt", 0),
  ]);
}

export const form8995a: MefFormDescriptor<"form8995a", Input> = {
  pendingKey: "form8995a",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995a.pdf",
  build(fields, context) {
    return buildIRS8995A(fields, context);
  },
};
