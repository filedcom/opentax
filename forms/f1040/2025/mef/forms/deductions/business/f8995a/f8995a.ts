import { roundWholeDollars } from "../../../../../../whole-dollars.ts";
import { assertLossWotcSources } from "../../../../../domains/deductions/business/form8995a/form8995a_loss_wotc_source.ts";
import { scheduleSELines } from "../../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { assertOwnedScheduleSE } from "../../../../../domains/taxes/self-employment/schedule-se/schedule-se-owner-source.ts";
import type { FilerIdentity } from "../../../../../../mef/header.ts";
import { mefBusinessNameLine1 } from "../../../../../../mef/business-name.ts";
import { calculateIndependentPatronBusinesses } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { patronProprietorSsn } from "../../../../../domains/deductions/business/form8995a/form8995a_patron_reconciliation.ts";
import { assertProducingMiningZeroQbi } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/producing-mining.ts";
import { assertProducingMiningZeroQbiReturn } from "../../../../../domains/deductions/business/form8995a/form8995a_producing_mining_source.ts";
import { assertQualifiedTipQbiSource } from "../../../../../domains/deductions/business/form8995/form8995_qualified_tip_source.ts";
import { assertFarmWotcReturn } from "../../../../../domains/deductions/business/form8995/form8995_farm_wotc_reconciliation.ts";
import { assertMixedFishingQbiReturn } from "../../../../../domains/deductions/business/form8995a/form8995a_mixed_fishing_source.ts";
import { calculateFarmWotcLines } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/farm-wotc.ts";
import { assertSstbScheduleCSource } from "./f8995a-sstb-source.ts";
import { assertForm8995APatronReturn } from "../../../../../domains/deductions/business/form8995a/form8995a_patron_reconciliation.ts";
import { inputSchema as w2InputSchema } from "../../../../../../nodes/inputs/income/wages/w2/index.ts";
import {
  assertMultiBusinessInvestmentSources,
  assertMultiBusinessInvestmentTax,
} from "../f8995/f8995-investment.ts";
import { z } from "zod";
import { element, elements } from "../../../../../../mef/xml.ts";
import { mefTaxYear } from "../../../../support/year-config.ts";
import {
  phaseInRangeCodeElement,
  thresholdCodeElement,
} from "./f8995a-schema-codes.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../../../../nodes/types.ts";
import { qbiYearConfig } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/thresholds.ts";
import {
  assertMfsSstbOwner,
  assertPatron1099PATRSource,
  calculateLossBusinessPhase,
  calculateOneBusiness8995ALines,
  calculateOneSstb8995ALines,
  calculateOwnedWotcBusinesses,
  calculateScheduleCLossLines,
  type Form8995AInput,
  inputSchema,
} from "../../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
} from "../../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import type {
  MefBuildContext,
  MefFormDescriptor,
} from "../../../../form-descriptor.ts";
import { assertScheduleBAggregationJoin } from "./f8995a_schedule_b.ts";
import { assertZeroReductionScheduleAReturn } from "./f8995a_schedule_a.ts";
import { qualifiedReitDividends } from "../f8995/f8995-route.ts";
import { assertForm8995AWotcReturn } from "../../../../../domains/deductions/business/form8995a/form8995a_wotc_reconciliation.ts";

type Input = Form8995AInput | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

export function assertNoFiledForm8995(
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const source = pending?.form8995;
  if (
    source && typeof source === "object" &&
    (Object.hasOwn(source, "qbi_deduction") || Object.hasOwn(source, "line15"))
  ) {
    throw new Error(
      "Form 8995-A and a filed Form 8995 cannot both be pending for one return",
    );
  }
}

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
        element(
          "BusinessNameLine1Txt",
          mefBusinessNameLine1(source.group_name),
        ),
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
      ...(parent.phaseInRequired
        ? [
          element("QBI20PctLessGrtrAllcblShareAmt", parent.line19),
          element("TotalPhaseInReductionAmt", parent.line25),
          element("QBIAfterPhaseInReductionAmt", parent.line26),
        ]
        : []),
    ]),
    element("TotalQBIComponentAmt", parent.line16),
    ...(parent.phaseInRequired
      ? [
        thresholdCodeElement(parent.patronThreshold),
        element(
          "TXIBfrQBIDedLessThresholdAmt",
          parent.line33 - parent.patronThreshold!,
        ),
        phaseInRangeCodeElement(parent.patronPhaseInRange),
        element("PhaseInPct", parent.phaseIn!.toFixed(5)),
      ]
      : []),
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

export function validateOneBusiness(
  fields: Form8995AInput,
  taxYear: number,
) {
  const details = fields.business_filing_details;
  if (!details) {
    throw new Error(
      "Form 8995-A MeF needs identified per-business QBI source details",
    );
  }
  if (
    (fields.filing_status !== NodeFilingStatus.Single &&
      !fields.patron_business_source &&
      !(fields.single_schedule_c_source &&
        fields.filing_status === NodeFilingStatus.MFJ)) ||
    !fields.patron_business_source && !fields.single_schedule_c_source &&
      !fields.single_schedule_f_source &&
      fields.taxable_income <=
        qbiYearConfig(taxYear).qbiThresholdSingle +
          qbiYearConfig(taxYear).qbiPhaseInRange / 2
  ) {
    throw new Error(
      "Form 8995-A MeF needs its supported filing status and retained business source above the applicable threshold",
    );
  }
  if (
    (fields.sstb_qbi ?? 0) !== 0 ||
    (fields.sstb_w2_wages ?? 0) !== 0 ||
    (fields.sstb_unadjusted_basis ?? 0) !== 0 ||
    (fields.qbi_loss_carryforward ?? 0) !== 0 ||
    (fields.reit_loss_carryforward ?? 0) !== 0 ||
    (fields.aggregation_groups ?? []).length !== 0 ||
    (!fields.single_schedule_f_source && !fields.patron_business_source &&
      fields.net_capital_gain !== 0)
  ) {
    throw new Error(
      "Form 8995-A MeF does not yet support SSTB, aggregation, loss, or capital-gain paths",
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
  if (
    !fields.single_schedule_f_source && !fields.patron_business_source &&
    details.qualified_dividends_zero_confirmed !== true
  ) {
    throw new Error(
      "Form8995A nonzero qualified dividends need an actual source route",
    );
  }
  if (fields.producing_mining_zero_qbi_source) {
    assertProducingMiningZeroQbi(fields, taxYear);
  }
  const lines = calculateOneBusiness8995ALines(fields, taxYear);
  if (
    !Object.entries(lines).filter(([key, value]) =>
      /^line\d+$/.test(key) && value !== undefined
    ).every(([, value]) => Number.isInteger(value)) ||
    lines.line39 < 0 ||
    (lines.line39 === 0 && !fields.single_schedule_f_source &&
      !fields.producing_mining_zero_qbi_source)
  ) {
    throw new Error(
      "Form 8995-A MeF needs a sourced whole-dollar calculated QBI deduction",
    );
  }
  return { details, lines };
}

export function assertOneBusinessReitSource(
  fields: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const amount = fields.line6_sec199a_dividends ?? 0;
  if (amount === 0) {
    if (fields.reit_dividend_sources !== undefined) {
      throw new Error("Form 8995-A REIT source needs a positive line 28");
    }
    return;
  }
  const issued = pending?.f1099div as
    | { f1099divs?: unknown[] }
    | undefined;
  if (
    fields.patron_of_specified_cooperative === true ||
    !fields.reit_dividend_sources ||
    fields.reit_dividend_sources.length !== 1 ||
    issued?.f1099divs?.length !== 1 ||
    amount !== qualifiedReitDividends(
        pending?.f1099div,
        fields.reit_dividend_sources,
        0,
      ) ||
    (pending?.f1040 as Record<string, unknown> | undefined)
        ?.line3b_ordinary_dividends !== amount ||
    ((pending?.f1040 as Record<string, unknown> | undefined)
        ?.line3a_qualified_dividends ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8995-A REIT line 28 needs one reviewed issued 1099-DIV and matching Form 1040 ordinary dividends",
    );
  }
}

function assertMfsLossSources(
  fields: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
  filer?: FilerIdentity,
): void {
  if (fields.filing_status !== NodeFilingStatus.MFS) return;
  const retained = pending as
    | Record<string, Record<string, unknown>>
    | undefined;
  const general = retained?.general;
  const final = retained?.f1040;
  const ssn = String(general?.taxpayer_ssn ?? "").replaceAll("-", "");
  if (
    !general || !final || !/^\d{9}$/.test(ssn) ||
    general.filing_status !== NodeFilingStatus.MFS ||
    final.filing_status !== NodeFilingStatus.MFS ||
    String(final.taxpayer_ssn ?? "").replaceAll("-", "") !== ssn ||
    general.mfs_spouse_itemizing !== false ||
    final.mfs_spouse_itemizing !== false
  ) {
    throw new Error(
      "MFS QBI losses require finalized separate return and spouse deduction facts",
    );
  }
  for (const business of fields.schedule_c_qbi_businesses ?? []) {
    const review = business.source_schedule_c.qbi_mfs_loss_review;
    if (
      !review || review.owner_ssn !== ssn ||
      general.address_state !== review.mailing_address_state ||
      String(general.spouse_ssn ?? "").replaceAll("-", "") !==
        review.spouse_ssn ||
      String(final.spouse_ssn ?? "").replaceAll("-", "") !==
        review.spouse_ssn ||
      (filer && (filer.address.state !== review.mailing_address_state ||
        filer.spouse?.ssn.replaceAll("-", "") !== review.spouse_ssn))
    ) {
      throw new Error(
        "MFS QBI loss review differs from actual owner, spouse or mailing address",
      );
    }
  }
  if (
    pending?.w2 !== undefined &&
    w2InputSchema.parse(pending.w2).w2s.some((w) =>
      w.employee_ssn?.replaceAll("-", "") !== ssn
    )
  ) {
    throw new Error(
      "MFS QBI loss wages must belong to the reviewed separate-income owner",
    );
  }
}

export function assertScheduleCLossFiler(
  fields: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
  taxYear: number,
): void {
  if (
    fields.filing_status === NodeFilingStatus.Single ||
    fields.farm_wotc_filing_source
  ) return;
  const expected = fields.filing_status === NodeFilingStatus.MFJ
    ? HeaderFilingStatus.MarriedFilingJointly
    : fields.filing_status === NodeFilingStatus.MFS
    ? HeaderFilingStatus.MarriedFilingSeparately
    : fields.filing_status === NodeFilingStatus.HOH
    ? HeaderFilingStatus.HeadOfHousehold
    : fields.filing_status === NodeFilingStatus.QSS
    ? HeaderFilingStatus.QualifyingSurvivingSpouse
    : undefined;
  const retained = pending as
    | Record<string, Record<string, unknown>>
    | undefined;
  const general = retained?.general;
  const ssn = String(general?.taxpayer_ssn ?? "").replaceAll("-", "");
  if (
    !filer || !expected || filer.filingStatus !== expected ||
    general?.filing_status !== fields.filing_status || !/^\d{9}$/.test(ssn) ||
    ssn !== filer.primarySSN.replaceAll("-", "") ||
    retained?.f1040?.filing_status !== fields.filing_status ||
    String(retained?.f1040?.taxpayer_ssn ?? "").replaceAll("-", "") !== ssn
  ) {
    throw new Error(
      "Form 8995-A loss proprietor or filing status differs from the final filer",
    );
  }
  assertMfsLossSources(fields, pending, filer);
  if (fields.filing_status === NodeFilingStatus.MFJ) {
    if (!assertOwnedScheduleSE(retained!, taxYear, filer)) {
      throw new Error(
        "Form 8995-A joint losses need retained proprietor computations",
      );
    }
  }
}

export function assertScheduleCLossSources(
  fields: Form8995AInput,
  pending: Readonly<Record<string, unknown>> | undefined,
  taxYear: number,
): void {
  if (fields.farm_wotc_filing_source) {
    assertFarmWotcReturn(fields, pending, taxYear);
    if (!calculateFarmWotcLines(fields, taxYear).lossSchedule) {
      throw new Error("Farm loss companion needs actual source loss");
    }
    return;
  }
  const lines = calculateScheduleCLossLines(fields, taxYear);
  assertLossWotcSources(fields, pending);
  assertMfsLossSources(fields, pending);
  if (fields.filing_status === NodeFilingStatus.MFJ) {
    if (
      !assertOwnedScheduleSE(
        pending as Record<string, Record<string, unknown>>,
        taxYear,
      )
    ) {
      throw new Error(
        "Form 8995-A joint losses need retained proprietor computations",
      );
    }
  }
  const seDeduction = fields.loss_se_tax_source?.deduction ?? 0;
  if (
    fields.qbi_capital_sources !== undefined ||
    pending?.f1099div !== undefined || pending?.f1099int !== undefined ||
    pending?.f1099b !== undefined
  ) {
    const retained = pending as Record<string, Record<string, unknown>>;
    const investment = assertMultiBusinessInvestmentSources(
      {
        ...fields,
        taxpayer_ssn: String(retained.general.taxpayer_ssn).replace(/\D/g, ""),
      },
      retained,
      true,
    );
    if (fields.net_capital_gain !== investment.filedQbiCapitalLimit) {
      throw new Error(
        "Form 8995-A capital limitation differs from entered source contributions",
      );
    }
    const wages = retained.w2 === undefined
      ? 0
      : w2InputSchema.parse(retained.w2).w2s.reduce(
        (sum, row) => sum + row.box1_wages,
        0,
      );
    const profit = lines.businesses.reduce(
      (sum, business) => sum + business.qbi,
      0,
    );
    // Line 9 adds the whole-dollar income lines.
    const expectedIncome = [
      wages,
      profit,
      investment.interest,
      investment.ordinary,
      investment.returnCapital,
    ].reduce((sum, value) => sum + roundWholeDollars(value), 0);
    if (
      !Number.isFinite(retained.f1040.line9_total_income) ||
      !Number.isFinite(retained.f1040.line11_agi) ||
      Math.abs(Number(retained.f1040.line9_total_income) - expectedIncome) >=
        1e-8 ||
      Math.abs(
          Number(retained.f1040.line11_agi) - (expectedIncome - seDeduction),
        ) >= 1e-8 ||
      (retained.f1040.line10_adjustments ?? 0) !== seDeduction ||
      (retained.f1040.line1a_wages ?? 0) !== wages ||
      (retained.f1040.line1z_total_wages ?? 0) !== wages
    ) {
      throw new Error(
        "Form 8995-A investment taxable income differs from retained wage, business and investment sources",
      );
    }
    assertMultiBusinessInvestmentTax(
      retained,
      investment,
      2025,
      fields.filing_status,
    );
  }

  const source = scheduleCInputSchema.safeParse(pending?.schedule_c);
  if (
    !source.success || !source.data.schedule_cs ||
    source.data.schedule_cs.length !== lines.businesses.length ||
    (pending?.general as Record<string, unknown> | undefined)
        ?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    fields.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    pending?.form8829 !== undefined || pending?.form5884 !== undefined
  ) {
    throw new Error(
      "Form 8995-A Schedule C needs all retained unadjusted Schedule C source items",
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
      computeNetProfit(sourceItem, business.wotc_wage_reduction ?? 0) !==
        business.qbi ||
      (sourceItem.line_26_wages ?? 0) < business.w2_wages
    ) {
      throw new Error(
        "Form 8995-A Schedule C QBI, payroll, and business source differ from the retained Schedule C return",
      );
    }
  }
  if (fields.loss_se_tax_source) {
    const retained = pending as Record<string, Record<string, unknown>>;
    const wages = pending?.w2 === undefined
      ? []
      : w2InputSchema.parse(pending.w2).w2s;
    if (fields.filing_status === NodeFilingStatus.MFJ) {
      const owned = assertOwnedScheduleSE(retained, taxYear);
      if (
        !owned ||
        JSON.stringify(fields.loss_se_tax_source.joint_se_source) !==
          JSON.stringify(owned.source)
      ) {
        throw Error(
          "QBI loss SE owner inventory differs from the retained return",
        );
      }
    } else {
      const owner = String(retained.general?.taxpayer_ssn ?? "").replaceAll(
        "-",
        "",
      );
      if (
        !/^\d{9}$/.test(owner) ||
        wages.some((w) => w.employee_ssn?.replaceAll("-", "") !== owner)
      ) {
        throw Error("QBI loss SE wages must belong to the actual proprietor");
      }
      const se = scheduleSELines({
        net_profit_schedule_c: lines.businesses.reduce(
          (sum, b) => sum + b.qbi,
          0,
        ),
        w2_ss_wages: wages.reduce(
          (sum, w) => sum + (w.box3_ss_wages ?? 0) + (w.box7_ss_tips ?? 0),
          0,
        ),
      }, qbiYearConfig(taxYear).ssWageBase);
      if (
        !se || se.line13 !== seDeduction ||
        retained.schedule2?.line4_se_tax !== se.line12 ||
        retained.schedule_se?.net_profit_schedule_c !== se.line3
      ) {
        throw Error(
          "QBI loss deduction must replay the owner's Schedule SE and Schedule 2",
        );
      }
    }
    // Other self-employment sources need their own combined attribution route.
    if (
      (retained.schedule_se?.net_profit_schedule_f ?? 0) !== 0 ||
      (retained.schedule_se?.unreported_tips_4137 ?? 0) !== 0 ||
      (retained.schedule_se?.wages_8919 ?? 0) !== 0 ||
      retained.schedule_se?.farm_optional_method_elected === true
    ) {
      throw Error(
        "QBI loss SE allocation needs the complete Schedule C-only proprietor inventory",
      );
    }
  }
  const schedule1 = z.object({
    line3_schedule_c: z.number(),
    line10_total_additional_income: z.number(),
    line15_se_deduction: z.number().nonnegative().optional(),
    line16_sep_simple: z.number().nonnegative().optional(),
    line17_se_health_insurance: z.number().nonnegative().optional(),
  }).passthrough().safeParse(pending?.schedule1);
  const form1040 = z.object({
    line8_additional_income: z.number(),
    line13_qbi_deduction: z.number().nonnegative(),
    line13b_additional_deductions: z.number().nonnegative().optional(),
    line15_taxable_income: z.number().nonnegative(),
  }).passthrough().safeParse(pending?.f1040);
  if (
    !schedule1.success || !form1040.success ||
    schedule1.data.line3_schedule_c !==
      lines.businesses.reduce((sum, business) => sum + business.qbi, 0) ||
    schedule1.data.line10_total_additional_income !==
      form1040.data.line8_additional_income ||
    form1040.data.line13_qbi_deduction !== lines.parent.line39 ||
    // Line 33 files whole-dollar taxable income before the QBI deduction.
    form1040.data.line15_taxable_income +
          form1040.data.line13_qbi_deduction +
          (form1040.data.line13b_additional_deductions ?? 0) !==
      Math.round(fields.taxable_income) ||
    (schedule1.data.line15_se_deduction ?? 0) !== seDeduction ||
    (schedule1.data.line16_sep_simple ?? 0) !== 0 ||
    (schedule1.data.line17_se_health_insurance ?? 0) !== 0
  ) {
    throw new Error(
      "Form 8995-A Schedule C net profit and zero QBI adjustments must match filed Schedule 1 and Form 1040",
    );
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
  const taxYear = mefTaxYear(context);
  const expectedStatus = fields.filing_status === NodeFilingStatus.MFJ
    ? HeaderFilingStatus.MarriedFilingJointly
    : fields.filing_status === NodeFilingStatus.MFS
    ? HeaderFilingStatus.MarriedFilingSeparately
    : fields.filing_status === NodeFilingStatus.HOH
    ? HeaderFilingStatus.HeadOfHousehold
    : fields.filing_status === NodeFilingStatus.QSS
    ? HeaderFilingStatus.QualifyingSurvivingSpouse
    : HeaderFilingStatus.Single;
  if (
    context.filer.filingStatus !== expectedStatus ||
    (fields.filing_status !== NodeFilingStatus.Single &&
      fields.filing_status !== NodeFilingStatus.HOH &&
      fields.filing_status !== NodeFilingStatus.QSS &&
      fields.filing_status !== NodeFilingStatus.MFS &&
      fields.filing_status !== NodeFilingStatus.MFJ) ||
    ((fields.filing_status === NodeFilingStatus.MFJ ||
      fields.filing_status === NodeFilingStatus.MFS ||
      fields.filing_status === NodeFilingStatus.HOH ||
      fields.filing_status === NodeFilingStatus.QSS) &&
      !fields.sstb_filing_details &&
      !(fields.schedule_c_qbi_businesses?.some((business) =>
        business.qbi < 0
      )) &&
      !fields.patron_business_source &&
      !(fields.filing_status === NodeFilingStatus.MFJ &&
        (fields.independent_patron_sources || fields.patron_business_source ||
          fields.single_schedule_c_source ||
          fields.wotc_business_sources || fields.farm_wotc_filing_source ||
          fields.mixed_fishing_qbi_source?.joint_se_source)))
  ) {
    throw new Error("Form 8995-A filing status differs from the return header");
  }
  const jointWotc = fields.single_schedule_c_source?.joint_se_source ??
    fields.wotc_business_sources?.[0].joint_se_source ??
    fields.farm_wotc_filing_source?.joint_se_source ??
    fields.independent_patron_sources?.owned_se_source;
  if (
    jointWotc &&
    (jointWotc.identity.primary_ssn !==
        context.filer.primarySSN.replaceAll("-", "") ||
      jointWotc.identity.spouse_ssn !==
        context.filer.spouse?.ssn.replaceAll("-", ""))
  ) {
    throw new Error(
      "Form8995A joint WOTC owners differ from actual return header",
    );
  }
  if (
    fields.farm_wotc_filing_source &&
    fields.farm_wotc_filing_source.taxpayer_ssn !==
      context.filer.primarySSN.replaceAll("-", "")
  ) {
    throw new Error(
      "Farm WOTC primary owner differs from actual return header",
    );
  }
  if (fields.sstb_filing_details) {
    assertMfsSstbOwner(fields, context.filer.primarySSN);
  }
  if (fields.patron_business_source) {
    patronProprietorSsn(fields, context.filer);
  }
  if (
    (fields.patron_filing_details?.source_1099patr
        .box6_section199ag_deduction ?? 0) > 0 &&
    fields.patron_filing_details?.source_1099patr.recipient_tin !==
      patronProprietorSsn(fields, context?.filer)
  ) {
    throw new Error(
      "Form 8995-A cooperative box 6 recipient differs from the final filer",
    );
  }
  assertNoFiledForm8995(context.pending);
  const companion = context.pending.form8995a_schedule_d;
  const sstbCompanion = context.pending.form8995a_schedule_a;
  const aggregationCompanion = context.pending.form8995a_schedule_b;
  const lossCompanion = context.pending.form8995a_schedule_c;
  if (fields.sstb_filing_details) {
    assertSstbScheduleCSource(
      fields,
      context.pending,
      taxYear,
      context.filer.primarySSN,
      context.filer,
    );
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
  if (
    fields.schedule_c_qbi_businesses?.some((business) => business.qbi < 0) ||
    (fields.farm_wotc_filing_source &&
      calculateFarmWotcLines(fields, taxYear).lossSchedule)
  ) {
    if (aggregationCompanion !== undefined) {
      throw new Error(
        "Form 8995-A Schedule C loss cannot accompany Schedule B aggregation",
      );
    }
    assertScheduleCLossSources(fields, context.pending, taxYear);
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

function ownedWotcGroup(
  fields: Form8995AInput,
  details: NonNullable<Form8995AInput["business_filing_details"]>,
  lines: ReturnType<typeof calculateOneBusiness8995ALines>,
): string {
  return elements("QBIDeductionInformationGrp", [
    elements("TradeOrBusinessName", [
      element("BusinessNameLine1Txt", details.business_name),
    ]),
    element("EIN", details.ein),
    ...(fields.patron_of_specified_cooperative === true
      ? [element("PatronInd", "X")]
      : []),
    element("QualifiedBusinessIncomeAmt", lines.line2),
    element("QlfyBusinessIncome20PctAmt", lines.line3),
    ...(fields.patron_business_source &&
        fields.taxable_income <= lines.patronThreshold!
      ? []
      : [
        element("AllocableShareW2WagesAmt", lines.line4),
        element("AllocableShareW2Wages50PctAmt", lines.line5),
        element("AllocableShareW2Wages25PctAmt", lines.line6),
        element("AllocableShareUBIAQlfyPropAmt", lines.line7),
        element("AllcblShrUBIAQlfyProp025PctAmt", lines.line8),
        element("TotalAllcblW2WgsQlfyPropPctAmt", lines.line9),
        element("GrtrAllcblShrW2WageQlfyPropAmt", lines.line10),
        element("W2WageQlfyPropLimitationAmt", lines.line11),
      ]),
    element("QBIDedBeforePatronReductionAmt", lines.line13),
    ...(fields.patron_of_specified_cooperative === true
      ? [element("PatronReductionAmt", lines.line14)]
      : []),
    element("QBIComponentAmt", lines.line15),
    ...(lines.phaseInRequired
      ? [
        element("QBI20PctLessGrtrAllcblShareAmt", lines.line19),
        element("TotalPhaseInReductionAmt", lines.line25),
        element("QBIAfterPhaseInReductionAmt", lines.line26),
      ]
      : []),
  ]);
}

// Registry values are parsed here before use; keeping the raw boundary unknown
// avoids expanding every QBI source variant in the registry callable union.
function buildIRS8995A(rawFields: unknown, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  if (
    rawFields && typeof rawFields === "object" &&
    Object.keys(rawFields).length === 0
  ) {
    throw new Error("Form 8995-A MeF cannot file an empty pending record");
  }
  // 2026 Form 8995-A adds line 40 (IRC §199A(i) minimum deduction); the
  // 2026v1.0 IRS8995A schema keeps the TY2025 lines and has no element for it.
  if (
    rawFields && typeof rawFields === "object" &&
    Object.hasOwn(rawFields, "minimum_deduction")
  ) {
    throw new Error(
      "Form 8995-A line 40 minimum deduction has no 2026v1.0 MeF element; export waits for a schema that carries it",
    );
  }
  const fields = inputSchema.strict().parse(rawFields);
  const taxYear = mefTaxYear(context);
  assertProducingMiningZeroQbiReturn(fields, context?.pending, taxYear);
  if (fields.farm_wotc_filing_source) {
    assertQualifiedTipQbiSource(
      fields as unknown as Record<string, unknown>,
      context?.pending,
      mefTaxYear(context),
    );
  }
  assertFarmWotcReturn(
    fields as unknown as Record<string, unknown>,
    context?.pending,
    taxYear,
  );
  if (!fields.farm_wotc_filing_source) {
    assertForm8995AWotcReturn(fields, context?.pending, taxYear);
  }
  assertForm8995APatronReturn(fields, context?.pending, taxYear);
  if (
    fields.aggregation_filing_details || fields.rpe_aggregation_source ||
    (fields.aggregation_groups ?? []).length > 0
  ) {
    return buildStagedAggregatedIRS8995A(fields, context);
  }
  if (fields.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
    const lines = calculateScheduleCLossLines(fields, taxYear);
    assertScheduleCLossFiler(
      fields,
      context?.pending,
      context?.filer,
      taxYear,
    );
    reconcileReturn(context, lines.parent.line39, fields);
    const parent = lines.parent;
    const phases = lines.businessLines.map(({ parent }) =>
      calculateLossBusinessPhase(
        fields.taxable_income,
        parent.line3,
        parent.line10,
        fields.filing_status,
        taxYear,
      )
    );
    const phaseIn = phases.find((phase) => phase !== undefined);
    return elements("IRS8995A", [
      ...lines.businessLines.map(({ business, parent }, index) => {
        const phase = phases[index];
        return elements("QBIDeductionInformationGrp", [
          elements("TradeOrBusinessName", [
            element("BusinessNameLine1Txt", business.business_name!),
          ]),
          element("EIN", business.ein!),
          element("QualifiedBusinessIncomeAmt", parent.line2),
          element("QlfyBusinessIncome20PctAmt", parent.line3),
          element("AllocableShareW2WagesAmt", parent.line4),
          element("AllocableShareW2Wages50PctAmt", parent.line5),
          element("AllocableShareW2Wages25PctAmt", parent.line6),
          element("AllocableShareUBIAQlfyPropAmt", parent.line7),
          element(
            "AllcblShrUBIAQlfyProp025PctAmt",
            parent.line8,
          ),
          element(
            "TotalAllcblW2WgsQlfyPropPctAmt",
            parent.line9,
          ),
          element(
            "GrtrAllcblShrW2WageQlfyPropAmt",
            parent.line10,
          ),
          element("W2WageQlfyPropLimitationAmt", parent.line11),
          element(
            "QBIDedBeforePatronReductionAmt",
            parent.line13,
          ),
          element("QBIComponentAmt", parent.line15),
          ...(phase !== undefined
            ? [
              element("QBI20PctLessGrtrAllcblShareAmt", phase.line19),
              element("TotalPhaseInReductionAmt", phase.line25),
              element("QBIAfterPhaseInReductionAmt", phase.line26),
            ]
            : []),
        ]);
      }),
      element("TotalQBIComponentAmt", parent.line16),
      ...(phaseIn
        ? [
          thresholdCodeElement(phaseIn.threshold),
          element("TXIBfrQBIDedLessThresholdAmt", phaseIn.excess),
          phaseInRangeCodeElement(phaseIn.range),
          element("PhaseInPct", phaseIn.ratio.toFixed(5)),
        ]
        : []),
      element("QlfyREITDivPTPIncomeLossAmt", 0),
      element("PYQlfyREITDivPTPLossCfwdAmt", 0),
      element("TotQlfyREITDivPTPIncomeAmt", 0),
      element("REITPTPComponentAmt", 0),
      element("QBIDedBfrIncomeLimitationAmt", parent.line32),
      element("TaxableIncomeBeforeQBIDedAmt", parent.line33),
      element("NetCapitalGainAmt", parent.line34),
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
    const lines = calculateOneSstb8995ALines(fields, taxYear);
    reconcileReturn(context, lines.line39, fields);
    assertZeroReductionScheduleAReturn(fields, lines, context?.pending);
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
        element("QBI20PctLessGrtrAllcblShareAmt", lines.line19),
        element("TotalPhaseInReductionAmt", lines.line25),
        element("QBIAfterPhaseInReductionAmt", lines.line26),
      ]),
      element("TotalQBIComponentAmt", lines.line16),
      thresholdCodeElement(lines.threshold),
      element(
        "TXIBfrQBIDedLessThresholdAmt",
        lines.line33 - lines.threshold,
      ),
      phaseInRangeCodeElement(lines.phaseInRange),
      element("PhaseInPct", lines.phaseIn.toFixed(5)),
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
  const mixed = assertMixedFishingQbiReturn(fields, context?.pending, taxYear);
  const oldMulti = fields.independent_patron_sources
    ? calculateIndependentPatronBusinesses(fields, taxYear)
    : fields.farm_wotc_filing_source
    ? calculateFarmWotcLines(fields, taxYear)
    : fields.wotc_business_sources
    ? calculateOwnedWotcBusinesses(fields, taxYear)
    : undefined;
  const multi = mixed ?? oldMulti;
  const multiRows = mixed
    ? mixed.rows.map((row) => ({
      input: { ...fields, business_filing_details: row.details },
      details: row.details,
      lines: row.lines,
    }))
    : oldMulti?.rows.map((row) => ({
      input: row.input,
      details: row.input.business_filing_details!,
      lines: row.lines,
    }));
  const { details, lines } = multi
    ? {
      details: multiRows![0].details,
      lines: multi.parent,
    }
    : validateOneBusiness(fields, taxYear);
  if (!multi) assertOneBusinessReitSource(fields, context?.pending);
  reconcileReturn(context, lines.line39, fields);
  return elements("IRS8995A", [
    ...(multiRows
      ? multiRows.map((row) =>
        ownedWotcGroup(row.input, row.details, row.lines)
      )
      : [ownedWotcGroup(fields, details, lines)]),
    element("TotalQBIComponentAmt", lines.line16),
    ...(lines.phaseInRequired
      ? [
        thresholdCodeElement(lines.patronThreshold),
        element(
          "TXIBfrQBIDedLessThresholdAmt",
          lines.line33 - lines.patronThreshold!,
        ),
        phaseInRangeCodeElement(lines.patronPhaseInRange),
        element("PhaseInPct", lines.phaseIn!.toFixed(5)),
      ]
      : []),
    element("QlfyREITDivPTPIncomeLossAmt", lines.line28),
    element("PYQlfyREITDivPTPLossCfwdAmt", lines.line29),
    element("TotQlfyREITDivPTPIncomeAmt", lines.line30),
    element("REITPTPComponentAmt", lines.line31),
    element("QBIDedBfrIncomeLimitationAmt", lines.line32),
    element("TaxableIncomeBeforeQBIDedAmt", lines.line33),
    element("NetCapitalGainAmt", lines.line34),
    element("AdjustedTaxableIncomeAmt", lines.line35),
    element("IncomeLimitationAmt", lines.line36),
    element("QBIDedBeforeDPADSect199AgAmt", lines.line37),
    element("DPADSect199AgAllocAgricHortAmt", lines.line38),
    element("QualifiedBusinessIncomeDedAmt", lines.line39),
    element("TotQlfyREITDivPTPLossCfwdAmt", 0),
  ]);
}

export const form8995a = {
  sourcePendingKeys: undefined,
  buildAdditionalDocuments: undefined,
  buildBinaryAttachments: undefined,

  pendingKey: "form8995a",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8995a.pdf",
  build(fields: unknown, context?: MefBuildContext) {
    return buildIRS8995A(fields, context);
  },
} satisfies MefFormDescriptor<"form8995a", Input>;
