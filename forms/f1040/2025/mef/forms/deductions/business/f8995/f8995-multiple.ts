import {
  assertMultiBusinessInvestmentSources,
  assertMultiBusinessInvestmentTax,
} from "./f8995-investment.ts";
import { normalizeAllPending } from "../../../../../return-processing/pending.ts";
import {
  inputSchema as cSchema,
  projectScheduleCItems,
} from "../../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { reviewedMultipleScheduleCQbi } from "../../../../../../nodes/inputs/income/business/schedule_c/qbi-multiple.ts";
import { inputSchema as qbiSchema } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995/index.ts";
import { inputSchema as seSchema } from "../../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import { scheduleSELines } from "../../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { inputSchema as w2Schema } from "../../../../../../nodes/inputs/income/wages/w2/index.ts";
import { CONFIG_BY_YEAR } from "../../../../../../nodes/config/index.ts";
import type { Filed8995 } from "./f8995-route.ts";

/** Replay all business sources and the one combined Schedule SE before printing rows. */
export function assertMultipleScheduleC8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (!rawPending) {
    throw new Error(
      "Multiple Schedule C Form 8995 needs its complete return source",
    );
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const parsed = qbiSchema.parse(fields);
  const investment = assertMultiBusinessInvestmentSources(parsed, pending);
  const c = cSchema.parse(pending.schedule_c);
  const items = projectScheduleCItems(c);
  const rows = parsed.multi_business_filing_rows;
  const retained = parsed.schedule_c_qbi_businesses;
  const general = pending.general;
  const f1040 = pending.f1040;
  const s1 = pending.schedule1;
  const w2 = pending.w2 === undefined ? undefined : w2Schema.parse(pending.w2);
  const wages = w2?.w2s.reduce((sum, row) => sum + row.box1_wages, 0) ?? 0;
  const ssWages =
    w2?.w2s.reduce((sum, row) => sum + (row.box3_ss_wages ?? 0), 0) ?? 0;
  const number = (value: unknown) =>
    value === undefined ? 0 : typeof value === "number" ? value : NaN;
  const sum = (value: unknown) =>
    Array.isArray(value)
      ? value.reduce((total, entry) => total + number(entry), 0)
      : number(value);
  const deduction = sum(parsed.se_tax_deduction);
  const amounts = reviewedMultipleScheduleCQbi(items, deduction);
  const profit = amounts.profits.reduce((sum, value) => sum + value, 0);
  const seExpected = scheduleSELines({
    net_profit_schedule_c: profit,
    w2_ss_wages: ssWages,
  }, CONFIG_BY_YEAR[2025].ssWageBase);
  const se = pending.schedule_se === undefined
    ? undefined
    : seSchema.parse(pending.schedule_se);
  const seActual = se
    ? scheduleSELines(se, CONFIG_BY_YEAR[2025].ssWageBase)
    : undefined;
  const healthSource = pending.form7206?.schedule_c_source as {
    businesses?: Array<Record<string, unknown>>;
    unadjusted_source?: boolean;
  } | undefined;
  const seSource = pending.form7206?.schedule_se_source as
    | Record<string, unknown>
    | undefined;
  const blocked = [
    "schedule_f",
    "schedule_e",
    "k1_partnership",
    "k1_s_corp",
    "f1099patr",
    "sep_retirement",
    "f5884",
    "form8995a",
  ];
  const zeroFields = [
    "qbi_from_schedule_f",
    "qbi",
    "se_health_insurance_deduction",
    "retirement_plan_deduction",
    "line6_sec199a_dividends",
    "qbi_loss_carryforward",
    "reit_loss_carryforward",
  ];
  const sameAmount = (actual: unknown, expected: number): actual is number =>
    typeof actual === "number" && Number.isFinite(actual) &&
    Math.abs(actual - expected) < 1e-8;
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
  if (
    !rows || !retained || rows.length !== items.length ||
    retained.length !== items.length ||
    !f1040 || !s1 || !general || parsed.filing_status !== "single" ||
    general.filing_status !== "single" ||
    blocked.some((key) => pending[key] !== undefined) ||
    (c.wotc_wage_reductions?.length ?? 0) !== 0 ||
    zeroFields.some((key) => sum(fields[key]) !== 0) ||
    parsed.reit_dividend_sources ||
    parsed.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    parsed.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    general.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    parsed.taxpayer_ssn?.replace(/\D/g, "") !==
      String(general.taxpayer_ssn).replace(/\D/g, "") ||
    new Set(items.map((item) => item.business_reference)).size !==
      items.length ||
    items.some((item, index) => {
      const row = rows[index];
      const business = retained[index];
      const tin = item.line_d_ein
        ? { kind: "ein", value: item.line_d_ein.replace(/\D/g, "") }
        : { kind: "ssn", value: parsed.taxpayer_ssn!.replace(/\D/g, "") };
      return !item.business_reference || !item.line_c_business_name ||
        item.line_c_business_name.length > 75 ||
        !/^[A-Za-z0-9#()&'-]+(?: [A-Za-z0-9#()&'-]+)*$/.test(
          item.line_c_business_name,
        ) || !/^\d{9}$/.test(tin.value) ||
        row.business_reference !== item.business_reference ||
        row.business_name !== item.line_c_business_name ||
        !same(row.tin, tin) ||
        row.qbi !== amounts.filedQbi[index] ||
        row.raw_qbi !== amounts.qbi[index] ||
        row.se_tax_deduction !== amounts.allocations[index] ||
        !same(business.source_schedule_c, item) ||
        business.qbi !== amounts.profits[index] ||
        business.business_reference !== item.business_reference ||
        business.business_name !== item.line_c_business_name ||
        business.ein !== item.line_d_ein?.replace(/\D/g, "") ||
        business.no_other_adjustments_confirmed !== true ||
        business.w2_wages !== (item.qbi_w2_wages ?? 0) ||
        business.ubia !== (item.qbi_unadjusted_basis ?? 0);
    }) ||
    !sameAmount(
      sum(parsed.qbi_from_schedule_c) + sum(parsed.sstb_qbi),
      profit,
    ) ||
    deduction !== (seExpected?.line13 ?? 0) || !same(seExpected, seActual) ||
    (seExpected &&
      (se?.net_profit_schedule_c !== profit ||
        number(se.net_profit_schedule_f) !== 0 ||
        se.farm_optional_method_elected === true ||
        number(se.w2_ss_wages) !== ssWages ||
        number(se.unreported_tips_4137) !== 0 ||
        number(se.wages_8919) !== 0)) ||
    (!seExpected && se &&
      Object.keys(se).some((key) => key !== "w2_ss_wages")) ||
    !healthSource ||
    healthSource.unadjusted_source !==
      ((c.form8941_premium_reductions?.length ?? 0) === 0) ||
    healthSource.businesses?.length !== items.length ||
    healthSource.businesses.some((business, index) =>
      business.business_reference !== items[index].business_reference ||
      business.proprietor_recipient !== items[index].proprietor_recipient ||
      business.line31_net_profit !== amounts.profits[index]
    ) ||
    !seSource || seSource.net_profit_schedule_c !== (seExpected ? profit : 0) ||
    number(seSource.net_profit_schedule_f) !== 0 ||
    seSource.farm_optional_method_elected !== false ||
    seSource.line13_deduction !== deduction ||
    Object.keys(pending.form7206!).some((key) =>
      !["schedule_c_source", "schedule_se_source"].includes(key)
    ) ||
    w2?.w2s.some((row) =>
      row.employee_ssn?.replace(/\D/g, "") !==
        parsed.taxpayer_ssn!.replace(/\D/g, "") ||
      row.box13_statutory_employee === true
    ) ||
    s1.line3_schedule_c !== profit ||
    number(s1.line15_se_deduction) !== deduction ||
    number(s1.line16_sep_simple) !== 0 ||
    number(s1.line17_se_health_insurance) !== 0 ||
    number(pending.schedule2?.line4_se_tax) !== (seExpected?.line12 ?? 0) ||
    number(f1040.line1a_wages) !== wages ||
    number(f1040.line1z_total_wages) !== wages ||
    f1040.line8_additional_income !== profit ||
    !sameAmount(
      f1040.line9_total_income,
      wages + profit + investment.interest + investment.ordinary +
        investment.returnCapital,
    ) ||
    number(f1040.line10_adjustments) !== deduction ||
    !sameAmount(
      f1040.line11_agi,
      wages + profit + investment.interest + investment.ordinary +
        investment.returnCapital - deduction,
    ) ||
    [
      "line13b_additional_deductions",
    ].some((key) => number(f1040[key]) !== 0) ||
    number(f1040.line2b_taxable_interest) !== investment.interest ||
    number(f1040.line3a_qualified_dividends) !== investment.qualified ||
    number(f1040.line3b_ordinary_dividends) !== investment.ordinary ||
    number(f1040.line7a_cap_gain_distrib) !==
      (pending.f1099b === undefined ? investment.capital : 0) ||
    number(f1040.line7_capital_gain) !==
      (pending.f1099b === undefined ? 0 : investment.returnCapital) ||
    typeof f1040.line12c_deduction_total !== "number"
  ) {
    throw new Error(
      "Multiple Schedule C Form 8995 payroll, business, shared SE allocation and return sources do not reconcile",
    );
  }
  const line2 = rows.reduce((sum, row) => sum + row.qbi, 0);
  const line4 = Math.max(0, line2);
  const line5 = Math.round(line4 * .2);
  const line11 = Math.round(
    Math.max(0, f1040.line11_agi - f1040.line12c_deduction_total),
  );
  if (line11 > CONFIG_BY_YEAR[2025].qbiThresholdSingle) {
    throw new Error(
      "Multiple Schedule C simplified QBI must remain below the Form 8995 threshold",
    );
  }
  const line12 = investment.filedQbiCapitalLimit;
  const line13 = Math.max(0, line11 - line12);
  const line14 = Math.round(line13 * .2);
  const expected = {
    2: line2,
    3: 0,
    4: line4,
    5: line5,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: line5,
    11: line11,
    12: line12,
    13: line13,
    14: line14,
    15: Math.min(line5, line14),
    16: Math.max(0, -line2),
    17: 0,
  };
  if (
    Object.entries(expected).some(([line, value]) =>
      fields[`line${line}`] !== value
    ) || fields.qbi_deduction !== expected[15] ||
    number(f1040.line13_qbi_deduction) !== expected[15] ||
    f1040.line14_deductions_qbi_total !==
      f1040.line12c_deduction_total + expected[15] ||
    f1040.line15_taxable_income !==
      Math.max(0, f1040.line11_agi - f1040.line14_deductions_qbi_total)
  ) {
    throw new Error(
      "Multiple Schedule C Form 8995 signed rows, loss offset and filed lines differ from Form 1040",
    );
  }
  assertMultiBusinessInvestmentTax(pending, investment);
  return {
    businesses: rows.map((row) => ({
      businessName: row.business_name,
      tin: row.tin,
      qbi: row.qbi,
    })),
    lines: expected,
  };
}
