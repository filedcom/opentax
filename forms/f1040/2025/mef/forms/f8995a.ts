import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  calculateOneBusiness8995ALines,
  type Form8995AInput,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Form8995AInput | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function validateOneBusiness(fields: Form8995AInput) {
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
      "Form 8995-A MeF does not yet support SSTB, aggregation, REIT/PTP, loss, patron, or capital-gain paths",
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

function reconcileReturn(
  context: MefBuildContext | undefined,
  deduction: number,
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
  const { details, lines } = validateOneBusiness(fields);
  reconcileReturn(context, lines.line39);
  return elements("IRS8995A", [
    elements("QBIDeductionInformationGrp", [
      elements("TradeOrBusinessName", [
        element("BusinessNameLine1Txt", details.business_name),
      ]),
      element("EIN", details.ein),
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
