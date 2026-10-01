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
} from "../../../nodes/inputs/schedule_c/index.ts";
import {
  computeNetProfit as computeFarmNetProfit,
  inputSchema as scheduleFInputSchema,
  itemSchema as scheduleFItemSchema,
  reconcileFarmSources,
  wotcReductionsByFarm,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import { inputSchema as form1099DivInputSchema } from "../../../nodes/inputs/f1099div/index.ts";

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
): void {
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
    (typeof prior === "number" && current + prior < 0) ||
    (typeof fields.line17 === "number" && fields.line17 > 0) ||
    (typeof fields.line16 === "number" && fields.line16 > 0)
  ) {
    throw new Error(
      "Form 8995 zero deduction cannot omit an unfiled QBI or REIT/PTP loss carryforward",
    );
  }
}

export type OneBusiness8995 = {
  readonly businessName: string;
  readonly tin: { readonly kind: "ein" | "ssn"; readonly value: string };
  readonly qbi: number;
  readonly lines: Readonly<Record<(typeof lineNumbers)[number], number>>;
};

function assertFiledLines(
  fields: Record<string, unknown>,
  f1040: Record<string, unknown>,
  reit: number = 0,
): OneBusiness8995["lines"] {
  const qbi = fields.line1_qbi as number;
  const line11 = fields.line11 as number;
  const line5 = Math.round(qbi * 0.2);
  const line9 = Math.round(reit * 0.2);
  const line14 = Math.round(line11 * 0.2);
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
    12: 0,
    13: line11,
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

function oneQualifiedReitDividend(source: unknown): number {
  if (source === undefined) return 0;
  const parsed = form1099DivInputSchema.safeParse(source);
  const item = parsed.success && parsed.data.f1099divs.length === 1
    ? parsed.data.f1099divs[0]
    : undefined;
  const review = item?.section199a_holding_review;
  const validDate = (date: string | undefined) =>
    !!date && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  if (
    !item || !item.source_document_reference || !item.payerName ||
    item.isNominee || item.nominee_distribution !== undefined || item.box11 ||
    !Number.isSafeInteger(item.box5) || (item.box5 ?? 0) <= 0 ||
    (item.box5 ?? 0) > 1_500 || item.box1a !== item.box5 ||
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
  return item.box5!;
}

/** Only the fully reconciled, one-business positive route can leave the guard. */
export function assertOneScheduleC8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): OneBusiness8995 {
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
  const reit = oneQualifiedReitDividend(pending.f1099div);
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
  const rawQbi = sourceBusiness ? computeNetProfit(sourceBusiness) : 0;
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
  const sourceW2s = Array.isArray(pending.w2?.w2s) ? pending.w2.w2s : [];
  const statutoryW2s = sourceW2s.filter((w2) =>
    w2.box13_statutory_employee === true &&
    w2.employee_ssn?.replace(/\D/g, "") === filerSsn &&
    w2.box1_wages === sourceBusiness?.line_1_gross_receipts
  );
  const statutoryNoSeDeduction = sourceBusiness?.statutory_employee === true &&
    sourceBusiness.proprietor_recipient === "T" &&
    statutoryW2s.length === 1 &&
    f1040?.line1a_wages === sourceW2s.reduce(
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
    otherSourceKeys.some((key) => pending[key] !== undefined) ||
    (!hasHealthDeduction && form7206 !== undefined &&
      Object.keys(form7206).some((key) =>
        key !== "schedule_c_source" && key !== "schedule_se_source"
      )) ||
    (hasHealthDeduction &&
      (!healthPlan?.success ||
        healthPlan.data.business_reference !==
          sourceBusiness?.business_reference ||
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
    (sourceInput?.wotc_wage_reductions?.length ?? 0) !== 0 ||
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
      ? ssn.length !== 9 || ssn !== filerSsn ||
        ssn !== fields.taxpayer_ssn?.toString().replace(/\D/g, "") ||
        ssn !== f1040.taxpayer_ssn?.toString().replace(/\D/g, "") ||
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
    !zeroOrAbsent(f1040.line3a_qualified_dividends) ||
    (f1040.line3b_ordinary_dividends ?? 0) !== reit ||
    !zeroOrAbsent(f1040.line7_capital_gain) ||
    !zeroOrAbsent(f1040.line7a_cap_gain_distrib) ||
    !zeroOrAbsent(fields.net_capital_gain) ||
    !zeroOrAbsent(f1040.line13b_additional_deductions) ||
    typeof f1040.line11_agi !== "number" ||
    typeof f1040.line12c_deduction_total !== "number" ||
    Math.round(f1040.line11_agi - f1040.line12c_deduction_total) !==
      fields.line11
  ) {
    throw new Error(
      "Form 8995 positive filing needs one identified Schedule C business and exact Schedule 1/1040 source reconciliation",
    );
  }
  const qbi = fields.line1_qbi as number;
  const expected = assertFiledLines(fields, f1040, reit);
  return {
    businessName: sourceBusiness.line_c_business_name,
    tin: usesSsn ? { kind: "ssn", value: ssn } : { kind: "ein", value: ein },
    qbi,
    lines: expected,
  };
}

/** One identified farm, with its own Schedule SE deduction and no other QBI sources. */
export function assertOneScheduleF8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): OneBusiness8995 {
  if (!rawPending) {
    throw new Error(
      "Form 8995 needs its complete source and final return pending graph",
    );
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const source = scheduleFInputSchema.safeParse(pending.schedule_f);
  if (source.success) reconcileFarmSources(source.data);
  const farm = source.success && source.data.schedule_fs.length === 1
    ? source.data.schedule_fs[0]
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
  const rawQbi = farm && source.success
    ? computeFarmNetProfit(
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
    "f1099div",
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
    !zeroOrAbsent(fields.qbi_loss_carryforward) ||
    !zeroOrAbsent(fields.reit_loss_carryforward) ||
    !zeroOrAbsent(fields.se_health_insurance_deduction) ||
    !zeroOrAbsent(fields.retirement_plan_deduction) ||
    !zeroOrAbsent(schedule1.line16_sep_simple) ||
    !zeroOrAbsent(schedule1.line17_se_health_insurance) ||
    schedule1.line6_schedule_f !== rawQbi ||
    !zeroOrAbsent(f1040.line3a_qualified_dividends) ||
    !zeroOrAbsent(f1040.line7_capital_gain) ||
    !zeroOrAbsent(f1040.line7a_cap_gain_distrib) ||
    !zeroOrAbsent(fields.net_capital_gain) ||
    !zeroOrAbsent(f1040.line13b_additional_deductions) ||
    typeof f1040.line11_agi !== "number" ||
    typeof f1040.line12c_deduction_total !== "number" ||
    Math.round(f1040.line11_agi - f1040.line12c_deduction_total) !==
      fields.line11
  ) {
    throw new Error(
      "Form 8995 positive filing needs one identified Schedule F farm and exact Schedule 1/1040 source reconciliation",
    );
  }
  return {
    businessName: farm.line_c_farm_name,
    tin: usesSsn ? { kind: "ssn", value: ssn } : { kind: "ein", value: ein },
    qbi: fields.line1_qbi as number,
    lines: assertFiledLines(fields, f1040),
  };
}

export function assertOneBusiness8995(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): OneBusiness8995 {
  if (fields.schedule_f_qbi_businesses !== undefined) {
    return assertOneScheduleF8995(fields, pending);
  }
  return assertOneScheduleC8995(fields, pending);
}
