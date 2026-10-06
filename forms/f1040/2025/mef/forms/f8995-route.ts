import { assertCapitalSaleSourceRows } from "../../broker-sale-source-reconciliation.ts";
import {
  inputSchema as scheduleDSourceSchema,
  schedule_d as scheduleDNode,
} from "../../../nodes/intermediate/aggregation/schedule_d/index.ts";
import { schedule1a as schedule1aNative } from "./schedule1a.ts";
import { isDeepStrictEqual } from "node:util";
import {
  filedOwnedScheduleC,
  filedOwnedScheduleF,
} from "../../../nodes/owned-business-filing.ts";
import { assertFarmWotcReturn } from "../../form8995_farm_wotc_reconciliation.ts";
import { patronFiledBusinessLines } from "../../../nodes/inputs/qbi_patron/calculation.ts";
import { assertJointOwner8995 } from "./f8995-joint-owner.ts";
import { assertMultipleScheduleC8995 } from "./f8995-multiple.ts";
import {
  allocateSharedSeDeduction,
  roundSignedQbiDollars,
} from "../../../nodes/inputs/schedule_c/qbi-multiple.ts";
import { scheduleSELines } from "../../../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import { reconcileForm8941DocumentSource } from "./f8941_source.ts";
import { normalizeAllPending } from "../../pending.ts";
import {
  calculateSingleScheduleCForm7206,
  reconcileSingleScheduleCGraphSource,
  singleScheduleCPlanSchema,
} from "../../../nodes/intermediate/forms/form7206/index.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
  itemSchema as scheduleCItemSchema,
  projectScheduleCItems,
  wotcReductionsByBusiness,
} from "../../../nodes/inputs/schedule_c/index.ts";
import {
  calculateForm5884,
  inputSchema as form5884InputSchema,
} from "../../../nodes/inputs/f5884/index.ts";
import {
  computeNetProfit as computeFarmNetProfit,
  inputSchema as scheduleFInputSchema,
  itemSchema as scheduleFItemSchema,
  projectScheduleFItems,
  reconcileFarmSources,
  wotcReductionsByFarm,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import { inputSchema as form1099DivInputSchema } from "../../../nodes/inputs/f1099div/index.ts";
import { inputSchema as w2InputSchema } from "../../../nodes/inputs/w2/index.ts";

const lineNumbers = [
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
] as const;

/** A zero deduction cannot discard a required loss carryforward workpaper. */
export function assertNoUnfiled8995Loss(
  fields: Readonly<Record<string, unknown>>,
  pending?: Readonly<Record<string, unknown>>,
): void {
  const parent = pending?.form8995a as Record<string, unknown> | undefined;
  if (
    parent?.farm_wotc_filing_source &&
    pending?.form8995a_schedule_c !== undefined &&
    fields.qbi_deduction === undefined && fields.line15 === undefined
  ) {
    assertFarmWotcReturn(parent, pending);
    const companion = pending?.form8995a_schedule_c;
    if (companion && isDeepStrictEqual(companion, parent)) return;
    throw new Error("Farm WOTC delegation needs its actual loss companion");
  }
  const sum = (name: string): number => {
    const value = fields[name];
    if (value === undefined) return 0;
    const values = Array.isArray(value) ? value : [value];
    if (
      !values.every((amount) =>
        typeof amount === "number" && Number.isFinite(amount)
      )
    ) {
      throw new Error("Form 8995 loss carryforward source must be numeric");
    }
    return values.reduce((total: number, amount: number) => total + amount, 0);
  };
  const priorQbi = sum("qbi_loss_carryforward");
  const netQbi = sum("qbi_from_schedule_c") + sum("qbi_from_schedule_f") +
    sum("qbi") + sum("sstb_qbi") - sum("se_tax_deduction") -
    sum("se_health_insurance_deduction") - sum("retirement_plan_deduction") +
    priorQbi;
  const currentReit = fields.line6_sec199a_dividends;
  const prior = fields.reit_loss_carryforward;
  if (
    currentReit !== undefined &&
      !(typeof currentReit === "number" && Number.isFinite(currentReit)) &&
      !(Array.isArray(currentReit) &&
        currentReit.every((value) =>
          typeof value === "number" && Number.isFinite(value)
        )) ||
    prior !== undefined &&
      (typeof prior !== "number" || !Number.isFinite(prior))
  ) {
    throw new Error("Form 8995 loss carryforward source must be numeric");
  }
  const current = currentReit === undefined
    ? 0
    : Array.isArray(currentReit)
    ? currentReit.reduce((sum: number, value: number) => sum + value, 0)
    : currentReit as number;
  if (
    priorQbi > 0 ||
    netQbi < 0 ||
    (typeof prior === "number" && current + prior < 0) ||
    (typeof fields.line17 === "number" && fields.line17 > 0) ||
    (typeof fields.line16 === "number" && fields.line16 > 0)
  ) {
    throw new Error(
      "Form 8995 zero deduction cannot omit an unfiled QBI or REIT/PTP loss carryforward",
    );
  }
}

export type Filed8995 = {
  readonly businesses: ReadonlyArray<{
    readonly businessName: string;
    readonly tin: { readonly kind: "ein" | "ssn"; readonly value: string };
    readonly qbi: number;
  }>;
  readonly lines: Readonly<Record<(typeof lineNumbers)[number], number>>;
};

function assertFiledLines(
  fields: Record<string, unknown>,
  f1040: Record<string, unknown>,
  reit: number = 0,
  qualifiedDividends: number = 0,
  qbi: number = fields.line1_qbi as number,
): Filed8995["lines"] {
  const line11 = fields.line11 as number;
  const line5 = Math.round(qbi * 0.2);
  const line9 = Math.round(reit * 0.2);
  const line13 = Math.max(0, line11 - qualifiedDividends);
  const line14 = Math.round(line13 * 0.2);
  const expected = {
    2: qbi,
    3: 0,
    4: qbi,
    5: line5,
    6: reit,
    7: 0,
    8: reit,
    9: line9,
    10: line5 + line9,
    11: line11,
    12: qualifiedDividends,
    13: line13,
    14: line14,
    15: Math.min(line5 + line9, line14),
    16: 0,
    17: 0,
  } as const;
  if (
    lineNumbers.some((line) => fields[`line${line}`] !== expected[line]) ||
    typeof fields.qbi_deduction !== "number" ||
    fields.qbi_deduction !== expected[15] ||
    typeof f1040.line13_qbi_deduction !== "number" ||
    f1040.line13_qbi_deduction !== expected[15]
  ) {
    throw new Error(
      "Form 8995 lines 1-17 must reconcile to the QBI deduction on Form 1040",
    );
  }
  return expected;
}

function zeroOrAbsent(value: unknown): boolean {
  return value === undefined || value === 0;
}

/** One issued, nonnominee dividend record without other 1099-DIV components. */
function qualifiedDividendSource(source: unknown, reitAnchors: unknown): {
  ordinary: number;
  qualified: number;
} {
  const parsed = form1099DivInputSchema.safeParse(source);
  const copies = parsed.success ? parsed.data.f1099divs : [];
  const item = copies.length <= 2
    ? copies.find((copy) => (copy.box1b ?? 0) > 0)
    : undefined;
  const other = copies.find((copy) => copy !== item);
  if (
    !item || (copies.length !== 1 && copies.length !== 2) ||
    (other !== undefined &&
      (reitAnchors === undefined || (other.box5 ?? 0) <= 0 ||
        other.source_document_reference === item.source_document_reference ||
        other.payerName?.trim().toLowerCase() ===
          item.payerName?.trim().toLowerCase() ||
        item.box1a + other.box1a > 1_500)) ||
    !item.payerName?.trim() || !item.source_document_reference?.trim() ||
    item.isNominee || item.nominee_distribution !== undefined || item.box11 ||
    !Number.isSafeInteger(item.box1a) || item.box1a <= 0 ||
    item.box1a > 1_500 || !Number.isSafeInteger(item.box1b) ||
    (item.box1b ?? 0) <= 0 || (item.box1b ?? 0) > item.box1a ||
    [
      item.box2a,
      item.box2b,
      item.box2c,
      item.box2d,
      item.box2e,
      item.box2f,
      item.box3,
      item.box4,
      item.box5,
      item.box6,
      item.box7,
      item.box9,
      item.box10,
      item.box12,
      item.box13,
      item.box16,
    ].some((amount) => !zeroOrAbsent(amount)) ||
    item.box8 !== undefined || item.box14 !== undefined ||
    item.box15 !== undefined ||
    item.foreign_source_dividends_usd !== undefined ||
    item.foreign_source_qualified_dividends_usd !== undefined ||
    item.foreign_tax_irs_country_code !== undefined ||
    item.foreign_tax_holding_review !== undefined ||
    item.section199a_holding_review !== undefined ||
    item.investment_property_for_form4952 === true
  ) {
    throw new Error(
      "Form 8995 qualified-dividend route needs one identified issued copy, optionally alongside one distinct REIT copy, without other dividend components or Schedule B threshold",
    );
  }
  return { ordinary: item.box1a, qualified: item.box1b! };
}

export function qualifiedReitDividends(
  source: unknown,
  anchors: unknown,
  qualifiedDividends: number,
): number {
  if (source === undefined) {
    if (anchors !== undefined) {
      throw new Error(
        "Form 8995 retained REIT sources lack issued 1099-DIV copies",
      );
    }
    return 0;
  }
  const parsed = form1099DivInputSchema.safeParse(source);
  const allItems = parsed.success ? parsed.data.f1099divs : [];
  const items = allItems.filter((item) => (item.box5 ?? 0) > 0);
  const other = allItems.filter((item) => (item.box5 ?? 0) <= 0);
  const validDate = (date: string | undefined) =>
    !!date && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  const sourceReferences = new Set<string>();
  const payerNames = new Set<string>();
  const reviewReferences = new Set<string>();
  const maximumReitCopies = qualifiedDividends > 0 ? 1 : 3;
  const maximumIssuedCopies = qualifiedDividends > 0 ? 2 : 3;
  if (
    items.length < 1 || items.length > maximumReitCopies ||
    allItems.length > maximumIssuedCopies ||
    other.length !== (qualifiedDividends > 0 ? 1 : 0) ||
    (other.length === 1 &&
      (!other[0].box1b || other[0].box1b !== qualifiedDividends ||
        allItems.reduce((sum, item) => sum + item.box1a, 0) > 1_500))
  ) {
    throw new Error(
      "Form 8995 REIT component needs at most three identified box 5 copies, or one alongside a distinct qualified-dividend copy",
    );
  }
  if (!Array.isArray(anchors) || anchors.length !== items.length) {
    throw new Error(
      "Form 8995 retained REIT sources do not match issued 1099-DIV copies",
    );
  }
  const anchoredByReference = new Map<string, Record<string, unknown>>();
  for (const anchor of anchors) {
    if (
      typeof anchor !== "object" || anchor === null ||
      Array.isArray(anchor) ||
      typeof (anchor as Record<string, unknown>).source_document_reference !==
        "string" ||
      anchoredByReference.has(
        (anchor as Record<string, string>).source_document_reference,
      )
    ) {
      throw new Error("Form 8995 retained REIT source identity is invalid");
    }
    const reference = (anchor as Record<string, string>)
      .source_document_reference;
    anchoredByReference.set(reference, anchor as Record<string, unknown>);
  }
  let total = 0;
  for (const item of items) {
    const review = item.section199a_holding_review;
    const sourceReference = item.source_document_reference?.trim();
    const payerName = item.payerName?.trim().toLowerCase();
    const reviewReference = review?.review_reference.trim();
    const anchor = sourceReference
      ? anchoredByReference.get(sourceReference)
      : undefined;
    if (
      !sourceReference || !payerName || !reviewReference || !anchor ||
      anchor.payer_name !== item.payerName ||
      anchor.box1a !== item.box1a || anchor.box5 !== item.box5 ||
      anchor.ex_dividend_date !== review?.ex_dividend_date ||
      anchor.qualified_held_days_in_91_day_window !==
        review?.qualified_held_days_in_91_day_window ||
      anchor.diminished_risk_days_excluded !==
        review?.diminished_risk_days_excluded ||
      anchor.no_related_payment_obligation_confirmed !==
        review?.no_related_payment_obligation_confirmed ||
      anchor.review_reference !== review?.review_reference ||
      anchor.reviewed_on !== review?.reviewed_on ||
      sourceReferences.has(sourceReference) || payerNames.has(payerName) ||
      reviewReferences.has(reviewReference) ||
      item.isNominee || item.nominee_distribution !== undefined || item.box11 ||
      !Number.isSafeInteger(item.box5) || (item.box5 ?? 0) <= 0 ||
      item.box1a !== item.box5 ||
      !review || !validDate(review.ex_dividend_date) ||
      !validDate(review.reviewed_on) ||
      review.qualified_held_days_in_91_day_window <= 45 ||
      review.qualified_held_days_in_91_day_window +
            review.diminished_risk_days_excluded > 91 ||
      (item.holdingPeriodDays ?? 0) <
        review.qualified_held_days_in_91_day_window +
          review.diminished_risk_days_excluded ||
      [
        item.box1b,
        item.box2a,
        item.box2b,
        item.box2c,
        item.box2d,
        item.box2e,
        item.box2f,
        item.box3,
        item.box4,
        item.box6,
        item.box7,
        item.box9,
        item.box10,
        item.box12,
        item.box13,
        item.box16,
      ].some((amount) => !zeroOrAbsent(amount)) ||
      item.investment_property_for_form4952 === true ||
      item.box8 !== undefined || item.box14 !== undefined ||
      item.box15 !== undefined ||
      item.foreign_source_dividends_usd !== undefined ||
      item.foreign_source_qualified_dividends_usd !== undefined
    ) {
      throw new Error(
        "Form 8995 REIT component needs one identified box 5 Form 1099-DIV with reviewed 91-day qualified holding and no related-payment obligation",
      );
    }
    sourceReferences.add(sourceReference);
    payerNames.add(payerName);
    reviewReferences.add(reviewReference);
    total += item.box5!;
  }
  if (total > 1_500) {
    throw new Error(
      "Form 8995 REIT component above $1,500 needs Schedule B source reconciliation",
    );
  }
  return total;
}

/** Only the fully reconciled, one-business positive route can leave the guard. */
export function assertOneScheduleC8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (!rawPending) {
    throw new Error(
      "Form 8995 needs its complete source and final return pending graph",
    );
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const source = scheduleCInputSchema.safeParse(pending.schedule_c);
  const sourceInput = source.success ? source.data : undefined;
  const businesses = source.success ? projectScheduleCItems(source.data) : [];
  const sourceBusiness = businesses[0];
  const qbiRows = fields.schedule_c_qbi_businesses;
  const row = Array.isArray(qbiRows) && qbiRows.length === 1
    ? qbiRows[0] as Record<string, unknown>
    : undefined;
  const rowSource = scheduleCItemSchema.safeParse(row?.source_schedule_c);
  const f1040 = pending.f1040;
  const schedule1 = pending.schedule1;
  const general = pending.general;
  const additionalDeduction =
    typeof f1040?.line13b_additional_deductions === "number"
      ? f1040.line13b_additional_deductions
      : 0;
  if (!Number.isSafeInteger(additionalDeduction) || additionalDeduction < 0) {
    throw new Error("Form8995 needs nonnegative sourced additional deductions");
  }
  const additionalXml = pending.schedule1a === undefined
    ? ""
    : schedule1aNative.build(pending.schedule1a, { pending });
  if (additionalDeduction > 0 && !additionalXml.includes("IRS1040Schedule1A")) {
    throw new Error(
      "Form8995 additional deductions need actual Schedule1A source reconciliation",
    );
  }

  const scheduleSe = pending.schedule_se;
  const otherSourceKeys = [
    "schedule_f",
    "schedule_e",
    "k1_partnership",
    "k1_s_corp",
    "f1099patr",
    "schedule_d",
    "f1099b",
    "sep_retirement",
  ] as const;
  const form7206 = pending.form7206;
  let sourcedCapitalGain = 0;
  let sourcedFiledCapital: number | undefined;
  if (pending.schedule_d !== undefined) {
    if (
      pending.f1099k === undefined && pending.f1099b === undefined &&
      pending.f8949 === undefined
    ) {
      throw new Error(
        "ScheduleC QBI capital sales need retained issued or direct sale sources",
      );
    }
    assertCapitalSaleSourceRows(pending);
    const d = scheduleDSourceSchema.parse(pending.schedule_d);
    for (
      const key of [
        "line_1a_proceeds",
        "line_1a_cost",
        "line_8a_proceeds",
        "line_8a_cost",
      ] as const
    ) delete d[key];
    if (
      Object.keys(d).some((key) =>
        !["transaction", "filing_status"].includes(key)
      )
    ) {
      throw new Error(
        "ScheduleC QBI capital sales have unreconciled additional ScheduleD inputs",
      );
    }
    const replay = scheduleDNode.compute(
      { taxYear: 2025, formType: "f1040" },
      d,
    );
    sourcedCapitalGain = Number(
      replay.outputs.find((o) => o.nodeType === "form8995")?.fields
        .net_capital_gain ?? 0,
    );
    const filed = replay.outputs.find((o) => o.nodeType === "f1040");
    if (
      !filed ||
      Object.entries(filed.fields).some(([key, value]) =>
        !isDeepStrictEqual(pending.f1040?.[key], value)
      )
    ) throw new Error("ScheduleC QBI capital sales differ from finalized1040");
    sourcedFiledCapital = Number(filed.fields.line7_capital_gain ?? 0);
    const final = replay.outputs.find((o) => o.nodeType === "schedule_d");
    if (
      !final ||
      Object.entries(final.fields).some(([key, value]) =>
        !isDeepStrictEqual(
          (pending.schedule_d as Record<string, unknown>)[key],
          value,
        )
      )
    ) {
      throw new Error(
        "ScheduleC QBI capital sales differ from source-replayed ScheduleD",
      );
    }
  }
  const qualifiedDividends = (pending.f1099div !== undefined &&
      !zeroOrAbsent(f1040?.line3a_qualified_dividends))
    ? qualifiedDividendSource(
      pending.f1099div,
      fields.reit_dividend_sources,
    )
    : { ordinary: 0, qualified: 0 };
  const reit = fields.reit_dividend_sources === undefined
    ? 0
    : qualifiedReitDividends(
      pending.f1099div,
      fields.reit_dividend_sources,
      qualifiedDividends.qualified,
    );
  if (
    pending.f1099div !== undefined &&
    fields.reit_dividend_sources === undefined &&
    zeroOrAbsent(fields.net_capital_gain)
  ) {
    throw new Error(
      "Form 8995 Schedule C source cannot silently omit Form 1099-DIV activity",
    );
  }
  const seDeduction = fields.se_tax_deduction ?? 0;
  const healthField = fields.se_health_insurance_deduction;
  const healthDeduction = typeof healthField === "number" ? healthField : 0;
  const hasHealthDeduction = healthDeduction > 0;
  const healthPlan = hasHealthDeduction
    ? singleScheduleCPlanSchema.safeParse(form7206?.single_schedule_c_plan)
    : undefined;
  if (hasHealthDeduction) {
    if (!healthPlan?.success || !form7206 || typeof seDeduction !== "number") {
      throw new Error("Form 8995 health deduction needs Form 7206 source");
    }
    reconcileSingleScheduleCGraphSource(
      form7206,
      healthPlan.data,
      seDeduction,
    );
  }
  // Form 5884 line 2 reduces the wage deduction even when Form 3800 limits
  // the current-year credit. Recompute QBI from that allocation, never from
  // the allowed credit posted to Schedule 3.
  const wotcSource = form5884InputSchema.safeParse(pending.f5884);
  const wotcReduction = sourceInput && sourceBusiness
    ? wotcReductionsByBusiness(sourceInput).get(
      sourceBusiness.business_reference ?? "",
    ) ?? 0
    : 0;
  const wotcLines = wotcSource.success
    ? calculateForm5884(wotcSource.data)
    : undefined;
  const wotcAllocations = wotcLines?.wageDeductionAllocations ?? [];
  const form3800Wotc = (pending.f3800 as Record<string, unknown> | undefined)
    ?.f5884_credit as Record<string, unknown> | undefined;
  const sourcedWotc = wotcSource.success && wotcReduction > 0 &&
    wotcLines?.line2 === wotcReduction &&
    wotcLines.line3 === 0 && wotcAllocations.length === 1 &&
    wotcAllocations[0].location.kind === "schedule_c" &&
    wotcAllocations[0].location.business_reference ===
      sourceBusiness?.business_reference &&
    wotcAllocations[0].credit_amount === wotcReduction &&
    form3800Wotc?.credit_amount === wotcLines.line4 &&
    form3800Wotc.subject_to_passive_activity_limit === false &&
    wotcSource.data.subject_to_passive_activity_limit !== true;
  const rawQbi = sourceBusiness
    ? filedOwnedScheduleC(sourceBusiness, false, wotcReduction)?.profit ??
      computeNetProfit(sourceBusiness, wotcReduction)
    : 0;
  const hasSeDeduction = typeof seDeduction === "number" && seDeduction > 0;
  const ein = typeof fields.line1_ein === "string"
    ? fields.line1_ein.replace(/\D/g, "")
    : "";
  const ssn = typeof fields.line1_ssn === "string"
    ? fields.line1_ssn.replace(/\D/g, "")
    : "";
  const sourceEin = sourceBusiness?.line_d_ein?.replace(/\D/g, "") ?? "";
  const usesSsn = sourceEin.length === 0;
  const filerSsn = typeof general?.taxpayer_ssn === "string"
    ? general.taxpayer_ssn.replace(/\D/g, "")
    : "";
  const ownerIsSpouse = sourceBusiness?.proprietor_recipient === "S";
  const ownerSsn = ownerIsSpouse
    ? typeof general?.spouse_ssn === "string"
      ? general.spouse_ssn.replace(/\D/g, "")
      : ""
    : filerSsn;
  const sourceW2s = Array.isArray(pending.w2?.w2s) ? pending.w2.w2s : [];
  const statutoryW2s = sourceW2s.filter((w2) =>
    w2.box13_statutory_employee === true &&
    w2.employee_ssn?.replace(/\D/g, "") === ownerSsn &&
    w2.schedule_c_business_reference === sourceBusiness?.business_reference
  );
  const statutoryNoSeDeduction = sourceBusiness?.statutory_employee === true &&
    (sourceBusiness.proprietor_recipient === "T" ||
      (sourceBusiness.proprietor_recipient === "S" &&
        general?.filing_status === "mfj")) &&
    statutoryW2s.length > 0 &&
    statutoryW2s.reduce((sum, w2) => sum + w2.box1_wages, 0) ===
      sourceBusiness.line_1_gross_receipts &&
    (f1040?.line1a_wages ?? 0) === sourceW2s.reduce(
        (sum, w2) =>
          sum + (w2.box13_statutory_employee === true ? 0 : w2.box1_wages),
        0,
      ) &&
    zeroOrAbsent(scheduleSe?.net_profit_schedule_c) &&
    zeroOrAbsent(scheduleSe?.net_profit_schedule_f) &&
    scheduleSe?.farm_optional_method_elected !== true &&
    (form7206?.schedule_se_source as Record<string, unknown> | undefined)
        ?.line13_deduction === 0;
  if (
    businesses.length !== 1 || !sourceBusiness || !row || !f1040 ||
    !schedule1 || pending.form8995a !== undefined ||
    (healthField !== undefined &&
      (typeof healthField !== "number" || !Number.isFinite(healthField) ||
        healthField < 0)) ||
    otherSourceKeys.some((key) =>
      pending[key] !== undefined &&
      !(sourcedFiledCapital !== undefined &&
        (key === "schedule_d" || key === "f1099b"))
    ) ||
    (!hasHealthDeduction && form7206 !== undefined &&
      Object.keys(form7206).some((key) =>
        key !== "schedule_c_source" && key !== "schedule_se_source"
      )) ||
    (hasHealthDeduction &&
      (!healthPlan?.success ||
        healthPlan.data.business_reference !==
          sourceBusiness?.business_reference ||
        healthPlan.data.recipient !== sourceBusiness?.proprietor_recipient ||
        healthPlan.data.schedule_c_line31_net_profit !== rawQbi ||
        calculateSingleScheduleCForm7206(healthPlan.data).line14 !==
          healthDeduction ||
        form7206?.line14 !== healthDeduction ||
        form7206?.marketplace_ptc_premium_overlap !== false)) ||
    general?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general?.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    fields.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    sourceBusiness.qbi_no_other_adjustments_confirmed !== true ||
    sourceBusiness.line_g_material_participation !== true ||
    (((sourceInput?.wotc_wage_reductions?.length ?? 0) > 0 ||
      pending.f5884 !== undefined) && !sourcedWotc) ||
    row.no_other_adjustments_confirmed !== true ||
    !rowSource.success ||
    JSON.stringify(rowSource.data) !== JSON.stringify(sourceBusiness) ||
    !sourceBusiness.business_reference ||
    fields.line1_business_reference !== sourceBusiness.business_reference ||
    !sourceBusiness.line_c_business_name ||
    sourceBusiness.line_c_business_name.length > 75 ||
    !/^[A-Za-z0-9#()&'-]+(?: [A-Za-z0-9#()&'-]+)*$/.test(
      sourceBusiness.line_c_business_name,
    ) ||
    fields.line1_business_name !== sourceBusiness.line_c_business_name ||
    (usesSsn
      ? ssn.length !== 9 || ssn !== ownerSsn ||
        (ownerIsSpouse
          ? general?.filing_status !== "mfj" ||
            f1040.filing_status !== "mfj" ||
            ssn !== f1040.spouse_ssn?.toString().replace(/\D/g, "")
          : ssn !== fields.taxpayer_ssn?.toString().replace(/\D/g, "") ||
            ssn !== f1040.taxpayer_ssn?.toString().replace(/\D/g, "")) ||
        ein !== "" || row.ein !== undefined
      : ein.length !== 9 || ein !== sourceEin ||
        row.ein !== ein || ssn !== "") ||
    typeof fields.line1_qbi !== "number" ||
    !Number.isInteger(fields.line1_qbi) ||
    fields.line1_qbi <= 0 ||
    row.qbi !== rawQbi ||
    fields.qbi_from_schedule_c !== rawQbi ||
    typeof seDeduction !== "number" ||
    Math.round(rawQbi - seDeduction - healthDeduction) !== fields.line1_qbi ||
    (hasSeDeduction
      ? scheduleSe?.net_profit_schedule_c !== rawQbi ||
        !zeroOrAbsent(scheduleSe?.net_profit_schedule_f) ||
        scheduleSe?.farm_optional_method_elected === true ||
        form7206?.schedule_se_source === undefined ||
        (form7206.schedule_se_source as Record<string, unknown>)
            .line13_deduction !== seDeduction ||
        schedule1.line15_se_deduction !== seDeduction
      : (sourceBusiness.statutory_employee === true &&
        !statutoryNoSeDeduction) ||
        (scheduleSe !== undefined && !statutoryNoSeDeduction) ||
        !zeroOrAbsent(schedule1.line15_se_deduction)) ||
    !zeroOrAbsent(fields.qbi_from_schedule_f) ||
    !zeroOrAbsent(fields.qbi) ||
    !zeroOrAbsent(fields.sstb_qbi) ||
    (fields.line6_sec199a_dividends ?? 0) !== reit ||
    !zeroOrAbsent(fields.qbi_loss_carryforward) ||
    !zeroOrAbsent(fields.reit_loss_carryforward) ||
    (hasHealthDeduction
      ? schedule1.line17_se_health_insurance !== healthDeduction
      : !zeroOrAbsent(schedule1.line17_se_health_insurance)) ||
    !zeroOrAbsent(fields.retirement_plan_deduction) ||
    !zeroOrAbsent(schedule1.line16_sep_simple) ||
    schedule1.line3_schedule_c !== rawQbi ||
    (f1040.line3a_qualified_dividends ?? 0) !==
      qualifiedDividends.qualified ||
    (f1040.line3b_ordinary_dividends ?? 0) !==
      reit + qualifiedDividends.ordinary ||
    (sourcedFiledCapital === undefined
      ? !zeroOrAbsent(f1040.line7_capital_gain)
      : f1040.line7_capital_gain !== sourcedFiledCapital) ||
    !zeroOrAbsent(f1040.line7a_cap_gain_distrib) ||
    (fields.net_capital_gain ?? 0) !==
      qualifiedDividends.qualified + sourcedCapitalGain ||
    reit + qualifiedDividends.ordinary > 1_500 ||
    typeof f1040.line11_agi !== "number" ||
    typeof f1040.line12c_deduction_total !== "number" ||
    Math.round(
        Math.max(
          0,
          f1040.line11_agi - f1040.line12c_deduction_total -
            additionalDeduction,
        ),
      ) !==
      fields.line11
  ) {
    throw new Error(
      "Form 8995 positive filing needs one identified Schedule C business and exact Schedule 1/1040 source reconciliation",
    );
  }
  const qbi = fields.line1_qbi as number;
  const expected = assertFiledLines(
    fields,
    f1040,
    reit,
    qualifiedDividends.qualified + sourcedCapitalGain,
  );
  return {
    businesses: [{
      businessName: sourceBusiness.line_c_business_name,
      tin: usesSsn ? { kind: "ssn", value: ssn } : { kind: "ein", value: ein },
      qbi,
    }],
    lines: expected,
  };
}

/** Two small Schedule C businesses with no Schedule SE tax or other QBI source. */
export function assertTwoSmallScheduleC8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (!rawPending) {
    throw new Error("Form 8995 two-business filing needs its complete return");
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const parsed = scheduleCInputSchema.safeParse(pending.schedule_c);
  const items = parsed.success ? projectScheduleCItems(parsed.data) : [];
  const sourceW2 = w2InputSchema.safeParse(pending.w2);
  const wage = sourceW2.success && sourceW2.data.w2s.length === 1
    ? sourceW2.data.w2s[0]
    : undefined;
  const rows = Array.isArray(fields.schedule_c_qbi_businesses)
    ? fields.schedule_c_qbi_businesses as Array<Record<string, unknown>>
    : [];
  const f1040 = pending.f1040;
  const general = pending.general;
  const schedule1 = pending.schedule1;
  const scheduleSe = pending.schedule_se;
  const form7206 = pending.form7206;
  const profits = items.map((item) => computeNetProfit(item));
  const total = profits.reduce((sum, amount) => sum + amount, 0);
  const scheduleCSource = form7206?.schedule_c_source as
    | Record<string, unknown>
    | undefined;
  const sourceBusinesses = Array.isArray(scheduleCSource?.businesses)
    ? scheduleCSource.businesses as Array<Record<string, unknown>>
    : [];
  const scheduleSeSource = form7206?.schedule_se_source as
    | Record<string, unknown>
    | undefined;
  const ownerSsn = String(general?.taxpayer_ssn ?? "").replace(/\D/g, "");
  const otherSources = [
    "schedule_f",
    "schedule_e",
    "k1_partnership",
    "k1_s_corp",
    "f1099patr",
    "f1099div",
    "f1099int",
    "schedule_d",
    "f1099b",
    "sep_retirement",
    "form8995a",
  ] as const;
  if (
    !parsed.success || items.length !== 2 || rows.length !== 2 ||
    !wage || !f1040 || !general || !schedule1 ||
    general.filing_status !== "single" ||
    f1040.filing_status !== "single" ||
    ownerSsn.length !== 9 ||
    String(f1040.taxpayer_ssn ?? "").replace(/\D/g, "") !== ownerSsn ||
    !Number.isSafeInteger(wage.box1_wages) || wage.box1_wages <= 0 ||
    wage.box13_statutory_employee === true ||
    String(wage.employee_ssn ?? "").replace(/\D/g, "") !== ownerSsn ||
    (wage.box12_entries?.length ?? 0) !== 0 ||
    (wage.box14_entries?.length ?? 0) !== 0 ||
    wage.flsa_overtime_review !== undefined ||
    wage.qualified_tips_box14_review !== undefined ||
    otherSources.some((key) => pending[key] !== undefined) ||
    (parsed.data.wotc_wage_reductions?.length ?? 0) !== 0 ||
    parsed.data.form8829_line30 !== undefined ||
    parsed.data.line_30_home_office !== undefined ||
    parsed.data.section481a_adjustments !== undefined ||
    !Number.isSafeInteger(total) || total <= 0 || total >= 400 ||
    scheduleCSource?.unadjusted_source !== true ||
    sourceBusinesses.length !== 2 ||
    sourceBusinesses.some((business, index) =>
      business.business_reference !== items[index]?.business_reference ||
      business.proprietor_recipient !== items[index]?.proprietor_recipient ||
      business.line31_net_profit !== profits[index]
    ) ||
    (scheduleSe !== undefined &&
      (Object.keys(scheduleSe).some((key) => key !== "w2_ss_wages") ||
        scheduleSe.w2_ss_wages !== wage.box3_ss_wages)) ||
    (scheduleSe !== undefined && scheduleSeSource === undefined) ||
    (scheduleSeSource !== undefined &&
      (scheduleSeSource.net_profit_schedule_c !== 0 ||
        scheduleSeSource.net_profit_schedule_f !== 0 ||
        scheduleSeSource.farm_optional_method_elected !== false ||
        scheduleSeSource.line13_deduction !== 0)) ||
    items.some((item, index) => {
      const row = rows[index];
      if (!row) return true;
      const rowSource = scheduleCItemSchema.safeParse(row.source_schedule_c);
      return !item.business_reference || !item.line_c_business_name ||
        !/^[A-Za-z0-9#()&'-]+(?: [A-Za-z0-9#()&'-]+)*$/.test(
          item.line_c_business_name,
        ) ||
        item.line_c_business_name.length > 75 ||
        !item.line_d_ein ||
        item.line_d_ein.replace(/\D/g, "").length !== 9 ||
        (item.proprietor_recipient !== undefined &&
          item.proprietor_recipient !== "T") ||
        item.line_g_material_participation !== true ||
        item.qbi_no_other_adjustments_confirmed !== true ||
        item.qbi_specified_service === true ||
        item.at_risk_simplified !== undefined ||
        (item.qbi_w2_wages ?? 0) !== 0 ||
        (item.qbi_unadjusted_basis ?? 0) !== 0 ||
        !Number.isSafeInteger(profits[index]) || profits[index] <= 0 ||
        !rowSource.success ||
        JSON.stringify(rowSource.data) !== JSON.stringify(item) ||
        row.business_reference !== item.business_reference ||
        row.business_name !== item.line_c_business_name ||
        row.ein !== item.line_d_ein.replace(/\D/g, "") ||
        row.qbi !== profits[index] ||
        row.no_other_adjustments_confirmed !== true;
    }) ||
    items[0].business_reference === items[1].business_reference ||
    items[0].line_c_business_name === items[1].line_c_business_name ||
    items[0].line_d_ein?.replace(/\D/g, "") ===
      items[1].line_d_ein?.replace(/\D/g, "") ||
    fields.line1_business_reference !== items[0].business_reference ||
    fields.line1_business_name !== items[0].line_c_business_name ||
    fields.line1_ein !== items[0].line_d_ein?.replace(/\D/g, "") ||
    fields.line1_ssn !== undefined || fields.line1_qbi !== profits[0] ||
    fields.line1ii_business_reference !== items[1].business_reference ||
    fields.line1ii_business_name !== items[1].line_c_business_name ||
    fields.line1ii_ein !== items[1].line_d_ein?.replace(/\D/g, "") ||
    fields.line1ii_qbi !== profits[1] ||
    fields.qbi_from_schedule_c !== total ||
    fields.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    fields.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    general.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    !zeroOrAbsent(fields.qbi_from_schedule_f) ||
    !zeroOrAbsent(fields.qbi) || !zeroOrAbsent(fields.sstb_qbi) ||
    !zeroOrAbsent(fields.se_tax_deduction) ||
    !zeroOrAbsent(fields.se_health_insurance_deduction) ||
    !zeroOrAbsent(fields.retirement_plan_deduction) ||
    !zeroOrAbsent(fields.line6_sec199a_dividends) ||
    fields.reit_dividend_sources !== undefined ||
    !zeroOrAbsent(fields.net_capital_gain) ||
    !zeroOrAbsent(fields.qbi_loss_carryforward) ||
    !zeroOrAbsent(fields.reit_loss_carryforward) ||
    form7206 &&
      Object.keys(form7206).some((key) =>
        key !== "schedule_c_source" && key !== "schedule_se_source"
      ) ||
    !zeroOrAbsent(schedule1.line15_se_deduction) ||
    !zeroOrAbsent(schedule1.line16_sep_simple) ||
    !zeroOrAbsent(schedule1.line17_se_health_insurance) ||
    schedule1.line3_schedule_c !== total ||
    f1040.line1a_wages !== wage.box1_wages ||
    f1040.line1z_total_wages !== wage.box1_wages ||
    f1040.line8_additional_income !== total ||
    f1040.line9_total_income !== wage.box1_wages + total ||
    !zeroOrAbsent(f1040.line10_adjustments) ||
    f1040.line11_agi !== wage.box1_wages + total ||
    !zeroOrAbsent(f1040.line3a_qualified_dividends) ||
    !zeroOrAbsent(f1040.line3b_ordinary_dividends) ||
    !zeroOrAbsent(f1040.line7_capital_gain) ||
    !zeroOrAbsent(f1040.line7a_cap_gain_distrib) ||
    !zeroOrAbsent(f1040.line13b_additional_deductions) ||
    typeof f1040.line12c_deduction_total !== "number" ||
    Math.round(
        Math.max(0, f1040.line11_agi - f1040.line12c_deduction_total),
      ) !==
      fields.line11
  ) {
    throw new Error(
      "Form 8995 two-business filing needs two distinct small Schedule C sources, one wage source, and exact final-return reconciliation",
    );
  }
  const lines = assertFiledLines(fields, f1040, 0, 0, total);
  if (
    f1040.line14_deductions_qbi_total !==
      f1040.line12c_deduction_total + lines[15] ||
    f1040.line15_taxable_income !==
      Math.max(0, f1040.line11_agi - f1040.line14_deductions_qbi_total)
  ) {
    throw new Error(
      "Form 8995 two-business deduction differs from Form 1040 taxable income",
    );
  }
  return {
    businesses: items.map((item, index) => ({
      businessName: item.line_c_business_name!,
      tin: { kind: "ein" as const, value: item.line_d_ein!.replace(/\D/g, "") },
      qbi: profits[index],
    })),
    lines,
  };
}

/** One identified farm, with its own Schedule SE deduction and no other QBI sources. */
export function assertOneScheduleF8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (!rawPending) {
    throw new Error(
      "Form 8995 needs its complete source and final return pending graph",
    );
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const source = scheduleFInputSchema.safeParse(pending.schedule_f);
  if (source.success) reconcileFarmSources(source.data);
  const farm = source.success && source.data.schedule_fs.length === 1
    ? projectScheduleFItems(source.data)[0]
    : undefined;
  const rows = fields.schedule_f_qbi_businesses;
  const row = Array.isArray(rows) && rows.length === 1
    ? rows[0] as Record<string, unknown>
    : undefined;
  const rowSource = scheduleFItemSchema.safeParse(row?.source_schedule_f);
  const f1040 = pending.f1040;
  const schedule1 = pending.schedule1;
  const general = pending.general;
  const scheduleSe = pending.schedule_se;
  const form7206 = pending.form7206;
  const seDeduction = fields.se_tax_deduction ?? 0;
  const qualifiedDividends = pending.f1099div !== undefined ||
      !zeroOrAbsent(fields.net_capital_gain)
    ? qualifiedDividendSource(pending.f1099div, undefined)
    : { ordinary: 0, qualified: 0 };
  const rawQbi = farm && source.success
    ? farm.qbi_wotc_filing_review
      ? patronFiledBusinessLines(
        "schedule_f",
        farm,
        wotcReductionsByFarm(source.data).get(farm.farm_id ?? "") ?? 0,
      ).profit
      : filedOwnedScheduleF(
        farm,
        source.data.farm_optional_method_elected === true,
        wotcReductionsByFarm(source.data).get(farm.farm_id ?? "") ?? 0,
      )?.profit ?? computeFarmNetProfit(
        farm,
        wotcReductionsByFarm(source.data).get(farm.farm_id ?? "") ?? 0,
      )
    : 0;
  const ein = typeof fields.line1_ein === "string"
    ? fields.line1_ein.replace(/\D/g, "")
    : "";
  const ssn = typeof fields.line1_ssn === "string"
    ? fields.line1_ssn.replace(/\D/g, "")
    : "";
  const usesSsn = !farm?.line_d_ein;
  const otherSourceKeys = [
    "schedule_c",
    "schedule_e",
    "k1_partnership",
    "k1_s_corp",
    "f1099patr",
    "schedule_d",
    "f1099b",
    "sep_retirement",
  ] as const;
  if (
    !farm || !row || !f1040 || !schedule1 ||
    pending.form8995a !== undefined ||
    otherSourceKeys.some((key) => pending[key] !== undefined) ||
    source?.success !== true ||
    source.data.farm_optional_method_elected === true ||
    source.data.farm_sources?.some((entry) =>
        entry.kind === "1099patr_cooperative"
      ) === true ||
    !zeroOrAbsent(farm.line3a_cooperative_distributions) ||
    !zeroOrAbsent(farm.line3b_cooperative_distributions_taxable) ||
    !zeroOrAbsent(farm.part_iii?.line38a_cooperative_distributions) ||
    !zeroOrAbsent(farm.part_iii?.line38b_cooperative_distributions_taxable) ||
    general?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general?.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    fields.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    farm.qbi_no_other_adjustments_confirmed !== true ||
    farm.line_e_material_participation !== true ||
    row.no_other_adjustments_confirmed !== true ||
    !rowSource.success ||
    JSON.stringify(rowSource.data) !== JSON.stringify(farm) ||
    !farm.farm_id || fields.line1_business_reference !== farm.farm_id ||
    !farm.line_c_farm_name || farm.line_c_farm_name.length > 75 ||
    !/^[A-Za-z0-9#()&'-]+(?: [A-Za-z0-9#()&'-]+)*$/.test(
      farm.line_c_farm_name,
    ) ||
    fields.line1_business_name !== farm.line_c_farm_name ||
    (usesSsn
      ? fields.line1_ein !== undefined || row.ein !== undefined ||
        ssn.length !== 9 ||
        general?.filing_status !== "single" ||
        fields.filing_status !== "single" ||
        ssn !== String(general.taxpayer_ssn ?? "").replace(/\D/g, "") ||
        ssn !== String(fields.taxpayer_ssn ?? "").replace(/\D/g, "")
      : fields.line1_ssn !== undefined || ssn !== "" ||
        ein.length !== 9 ||
        ein !== farm.line_d_ein!.replace(/\D/g, "") ||
        row.ein !== ein) ||
    row.qbi !== rawQbi ||
    fields.qbi_from_schedule_f !== rawQbi ||
    typeof fields.line1_qbi !== "number" ||
    !Number.isInteger(fields.line1_qbi) || fields.line1_qbi <= 0 ||
    typeof seDeduction !== "number" || seDeduction < 0 ||
    Math.round(rawQbi - seDeduction) !== fields.line1_qbi ||
    (seDeduction > 0
      ? scheduleSe?.net_profit_schedule_f !== rawQbi ||
        !zeroOrAbsent(scheduleSe?.net_profit_schedule_c) ||
        form7206?.schedule_se_source === undefined ||
        (form7206.schedule_se_source as Record<string, unknown>)
            .line13_deduction !== seDeduction ||
        schedule1.line15_se_deduction !== seDeduction
      : scheduleSe !== undefined ||
        !zeroOrAbsent(schedule1.line15_se_deduction)) ||
    !zeroOrAbsent(fields.qbi_from_schedule_c) ||
    !zeroOrAbsent(fields.qbi) || !zeroOrAbsent(fields.sstb_qbi) ||
    !zeroOrAbsent(fields.line6_sec199a_dividends) ||
    fields.reit_dividend_sources !== undefined ||
    !zeroOrAbsent(fields.qbi_loss_carryforward) ||
    !zeroOrAbsent(fields.reit_loss_carryforward) ||
    !zeroOrAbsent(fields.se_health_insurance_deduction) ||
    !zeroOrAbsent(fields.retirement_plan_deduction) ||
    !zeroOrAbsent(schedule1.line16_sep_simple) ||
    !zeroOrAbsent(schedule1.line17_se_health_insurance) ||
    schedule1.line6_schedule_f !== rawQbi ||
    (f1040.line3a_qualified_dividends ?? 0) !==
      qualifiedDividends.qualified ||
    (f1040.line3b_ordinary_dividends ?? 0) !==
      qualifiedDividends.ordinary ||
    !zeroOrAbsent(f1040.line7_capital_gain) ||
    !zeroOrAbsent(f1040.line7a_cap_gain_distrib) ||
    (fields.net_capital_gain ?? 0) !== qualifiedDividends.qualified ||
    !zeroOrAbsent(f1040.line13b_additional_deductions) ||
    typeof f1040.line11_agi !== "number" ||
    typeof f1040.line12c_deduction_total !== "number" ||
    Math.round(
        Math.max(0, f1040.line11_agi - f1040.line12c_deduction_total),
      ) !==
      fields.line11
  ) {
    throw new Error(
      "Form 8995 positive filing needs one identified Schedule F farm and exact Schedule 1/1040 source reconciliation",
    );
  }
  return {
    businesses: [{
      businessName: farm.line_c_farm_name,
      tin: usesSsn ? { kind: "ssn", value: ssn } : { kind: "ein", value: ein },
      qbi: fields.line1_qbi as number,
    }],
    lines: assertFiledLines(fields, f1040, 0, qualifiedDividends.qualified),
  };
}

function assertReitOnly8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (!rawPending) {
    throw new Error(
      "Form 8995 REIT-only filing needs its complete pending return",
    );
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const f1040 = pending.f1040;
  const general = pending.general;
  const schedule1 = pending.schedule1;
  const otherSourceKeys = [
    "schedule_c",
    "schedule_f",
    "schedule_e",
    "k1_partnership",
    "k1_s_corp",
    "f1099patr",
    "schedule_d",
    "f1099b",
    "sep_retirement",
  ] as const;
  const scheduleSe = pending.schedule_se;
  const seSource = pending.form7206?.schedule_se_source;
  const zeroSeSource = seSource !== null && typeof seSource === "object" &&
    !Array.isArray(seSource) &&
    Object.keys(seSource).every((key) =>
      [
        "net_profit_schedule_c",
        "net_profit_schedule_f",
        "farm_optional_method_elected",
        "line13_deduction",
      ].includes(key)
    ) &&
    zeroOrAbsent((seSource as Record<string, unknown>).net_profit_schedule_c) &&
    zeroOrAbsent((seSource as Record<string, unknown>).net_profit_schedule_f) &&
    (seSource as Record<string, unknown>).farm_optional_method_elected ===
      false &&
    zeroOrAbsent((seSource as Record<string, unknown>).line13_deduction);
  const hasBusinessSe = scheduleSe !== undefined &&
    Object.keys(scheduleSe).some((key) => key !== "w2_ss_wages");
  const hasBusiness7206 = pending.form7206 !== undefined &&
    (Object.keys(pending.form7206).some((key) =>
      key !== "schedule_se_source"
    ) ||
      !zeroSeSource);
  const reit = qualifiedReitDividends(
    pending.f1099div,
    fields.reit_dividend_sources,
    0,
  );
  if (
    !f1040 || !general || pending.form8995a !== undefined ||
    otherSourceKeys.some((key) => pending[key] !== undefined) ||
    hasBusinessSe || hasBusiness7206 ||
    !Array.isArray(fields.reit_dividend_sources) ||
    fields.reit_dividend_sources.length < 1 ||
    fields.reit_dividend_sources.length > 3 ||
    general.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    fields.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    fields.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    fields.schedule_c_qbi_businesses !== undefined ||
    fields.schedule_f_qbi_businesses !== undefined ||
    !zeroOrAbsent(fields.qbi_from_schedule_c) ||
    !zeroOrAbsent(fields.qbi_from_schedule_f) ||
    !zeroOrAbsent(fields.qbi) || !zeroOrAbsent(fields.sstb_qbi) ||
    !zeroOrAbsent(fields.se_tax_deduction) ||
    !zeroOrAbsent(fields.se_health_insurance_deduction) ||
    !zeroOrAbsent(fields.retirement_plan_deduction) ||
    !zeroOrAbsent(fields.qbi_loss_carryforward) ||
    !zeroOrAbsent(fields.reit_loss_carryforward) ||
    !zeroOrAbsent(fields.net_capital_gain) ||
    fields.line1_qbi !== 0 ||
    fields.line6_sec199a_dividends !== reit ||
    !zeroOrAbsent(schedule1?.line3_schedule_c) ||
    !zeroOrAbsent(schedule1?.line6_schedule_f) ||
    !zeroOrAbsent(schedule1?.line15_se_deduction) ||
    !zeroOrAbsent(schedule1?.line16_sep_simple) ||
    !zeroOrAbsent(schedule1?.line17_se_health_insurance) ||
    !zeroOrAbsent(f1040.line3a_qualified_dividends) ||
    f1040.line3b_ordinary_dividends !== reit ||
    !zeroOrAbsent(f1040.line7_capital_gain) ||
    !zeroOrAbsent(f1040.line7a_cap_gain_distrib) ||
    !zeroOrAbsent(f1040.line13b_additional_deductions) ||
    typeof f1040.line11_agi !== "number" ||
    typeof f1040.line12c_deduction_total !== "number" ||
    Math.round(
        Math.max(0, f1040.line11_agi - f1040.line12c_deduction_total),
      ) !==
      fields.line11
  ) {
    throw new Error(
      "Form 8995 REIT-only filing needs one to three reviewed issued 1099-DIV copies and exact Form 1040 source reconciliation",
    );
  }
  return {
    businesses: [],
    lines: assertFiledLines(fields, f1040, reit, 0),
  };
}

function assertMixedScheduleCF8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (!rawPending) throw new Error("Mixed C/F QBI needs actual filed sources");
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const cSource = scheduleCInputSchema.parse(pending.schedule_c);
  const fSource = scheduleFInputSchema.parse(pending.schedule_f);
  reconcileFarmSources(fSource);
  const cItems = projectScheduleCItems(cSource);
  const fItems = projectScheduleFItems(fSource);
  const c = cItems[0], f = fItems[0];
  const source = reconcileForm8941DocumentSource(pending.f8941, pending);
  const rows = Array.isArray(fields.multi_business_filing_rows)
    ? fields.multi_business_filing_rows as Array<Record<string, unknown>>
    : [];
  const se = pending.schedule_se, schedule1 = pending.schedule1;
  const f1040 = pending.f1040, general = pending.general;
  const form7206 = pending.form7206;
  const seSource = form7206?.schedule_se_source as
    | Record<string, unknown>
    | undefined;
  const cProfit = c ? computeNetProfit(c) : 0;
  const fProfit = f ? computeFarmNetProfit(f) : 0;
  const seLines = scheduleSELines({
    net_profit_schedule_c: cProfit,
    net_profit_schedule_f: fProfit,
    w2_ss_wages: 0,
  }, CONFIG_BY_YEAR[2025].ssWageBase);
  const half = seLines?.line13 ?? 0;
  const allocations = allocateSharedSeDeduction([cProfit, fProfit], half);
  const qbi = [cProfit, fProfit].map((profit, index) =>
    roundSignedQbiDollars(profit - allocations[index])
  );
  const sources = [c, f],
    names = [c?.line_c_business_name, f?.line_c_farm_name];
  const references = [c?.business_reference, f?.farm_id];
  const eins = [
    c?.line_d_ein?.replace(/\D/g, ""),
    f?.line_d_ein?.replace(/\D/g, ""),
  ];
  const reviews = [
    c?.qbi_se_tax_allocation_review,
    f?.qbi_se_tax_allocation_review,
  ];
  const businessRows = [
    (fields.schedule_c_qbi_businesses as Array<Record<string, unknown>>)?.[0],
    (fields.schedule_f_qbi_businesses as Array<Record<string, unknown>>)?.[0],
  ];
  if (
    source.kind !== "single" ||
    !("group_members" in source.source) ||
    source.source.qualifying_arrangement !==
      "same_proprietor_mixed_c_f_common_control" ||
    cItems.length !== 1 || fItems.length !== 1 || rows.length !== 2 ||
    !c || !f || !general || !f1040 || !schedule1 || !seLines ||
    general.filing_status !== "single" ||
    f1040.filing_status !== "single" ||
    String(general.taxpayer_ssn ?? "").replace(/\D/g, "") !==
      source.source.owner_ssn ||
    String(f1040.taxpayer_ssn ?? "").replace(/\D/g, "") !==
      source.source.owner_ssn ||
    c.proprietor_recipient !== "T" || f.proprietor_recipient !== "T" ||
    c.line_g_material_participation !== true ||
    f.line_e_material_participation !== true ||
    f.accounting_method !== "cash" ||
    references.some((ref) => !ref) || references[0] === references[1] ||
    eins.some((ein) => !ein || ein.length !== 9) || eins[0] === eins[1] ||
    reviews.some((review, index) =>
      !review || review.deduction_amount !== allocations[index] ||
      review.all_businesses_included_confirmed !== true ||
      review.no_aggregation_confirmed !== true
    ) ||
    !se || se.net_profit_schedule_c !== cProfit ||
    se.net_profit_schedule_f !== fProfit ||
    schedule1.line3_schedule_c !== cProfit ||
    schedule1.line6_schedule_f !== fProfit ||
    schedule1.line15_se_deduction !== half ||
    pending.schedule2?.line4_se_tax !== seLines.line12 ||
    f1040.line8_additional_income !== cProfit + fProfit ||
    f1040.line11_agi !== cProfit + fProfit - half ||
    seSource?.net_profit_schedule_c !== cProfit ||
    seSource?.net_profit_schedule_f !== fProfit ||
    seSource?.line13_deduction !== half ||
    fields.se_tax_deduction !== half ||
    fields.qbi_from_schedule_c !== cProfit ||
    fields.qbi_from_schedule_f !== fProfit ||
    fields.line2 !== qbi[0] + qbi[1] ||
    fields.line11 !==
      Math.round(
        Math.max(
          0,
          Number(f1040.line11_agi) - Number(f1040.line12c_deduction_total),
        ),
      ) ||
    pending.form8995a !== undefined ||
    [
      "schedule_e",
      "k1_partnership",
      "k1_s_corp",
      "f1099patr",
      "f1099div",
      "schedule_d",
      "f1099b",
      "sep_retirement",
      "w2",
    ]
      .some((key) => pending[key] !== undefined) ||
    rows.some((row, index) => {
      const expected = sources[index];
      const business = businessRows[index];
      const sourceKey = index === 0 ? "source_schedule_c" : "source_schedule_f";
      const parsed = index === 0
        ? scheduleCItemSchema.safeParse(business?.[sourceKey])
        : scheduleFItemSchema.safeParse(business?.[sourceKey]);
      return row.business_reference !== references[index] ||
        row.business_name !== names[index] ||
        !isDeepStrictEqual(row.tin, { kind: "ein", value: eins[index] }) ||
        row.qbi !== qbi[index] ||
        row.raw_qbi !== [cProfit, fProfit][index] - allocations[index] ||
        row.se_tax_deduction !== allocations[index] ||
        business?.business_reference !== references[index] ||
        business?.ein !== eins[index] ||
        business?.qbi !== [cProfit, fProfit][index] ||
        !parsed.success || !isDeepStrictEqual(parsed.data, expected);
    })
  ) {
    throw new Error(
      "Mixed C/F Form8995 needs exact two-business SHOP, SE and filed QBI sources",
    );
  }
  return {
    businesses: rows.map((row, index) => ({
      businessName: names[index]!,
      tin: { kind: "ein" as const, value: eins[index]! },
      qbi: qbi[index],
    })),
    lines: assertFiledLines(fields, f1040, 0, 0, qbi[0] + qbi[1]),
  };
}

export function assertPositive8995(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  assertFarmWotcReturn(fields, pending);
  if (
    fields.multi_business_filing_rows !== undefined &&
    fields.schedule_c_qbi_businesses !== undefined &&
    fields.schedule_f_qbi_businesses !== undefined
  ) {
    return assertMixedScheduleCF8995(fields, pending);
  }
  if (fields.joint_owner_filing_rows !== undefined) {
    return assertJointOwner8995(fields, pending);
  }
  if (fields.multi_business_filing_rows !== undefined) {
    return assertMultipleScheduleC8995(fields, pending);
  }
  if (fields.schedule_f_qbi_businesses !== undefined) {
    return assertOneScheduleF8995(fields, pending);
  }
  if (fields.schedule_c_qbi_businesses !== undefined) {
    if (
      Array.isArray(fields.schedule_c_qbi_businesses) &&
      fields.schedule_c_qbi_businesses.length === 2
    ) return assertTwoSmallScheduleC8995(fields, pending);
    return assertOneScheduleC8995(fields, pending);
  }
  return assertReitOnly8995(fields, pending);
}
