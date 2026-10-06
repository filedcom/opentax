import { reviewedWotcQbiWages } from "../../../inputs/schedule_c/qbi-wotc.ts";
import { roundSignedQbiDollars } from "../../../inputs/schedule_c/qbi-multiple.ts";
import {
  filedOwnedScheduleC,
  filedOwnedScheduleF,
} from "../../../owned-business-filing.ts";
import {
  computeNetProfit as fProfit,
  itemSchema as farmSchema,
} from "../schedule_f/model.ts";
import {
  computeNetProfit as cProfit,
  itemSchema as businessSchema,
} from "../../../inputs/schedule_c/model.ts";
import { patronFiledBusinessLines } from "../../../inputs/qbi_patron/calculation.ts";
import { ownedScheduleSE } from "../schedule_se/owner-calculation.ts";
import { jointOwnerQbi } from "../form8995/joint-owner.ts";
import {
  calculateOneBusiness8995ALines,
  type Form8995AInput,
} from "./index.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

export { farmWotcSourceSchema } from "./farm-wotc-source.ts";
import {
  type FarmWotcSource,
  farmWotcSourceSchema,
} from "./farm-wotc-source.ts";
export type { FarmWotcSource } from "./farm-wotc-source.ts";

export function farmWotcBusinessAmounts(
  row: FarmWotcSource["businesses"][number],
) {
  const isFarm = row.kind === "schedule_f", item = row.item;
  const reference = isFarm ? row.item.farm_id : row.item.business_reference;
  const name = isFarm
    ? row.item.line_c_farm_name
    : row.item.line_c_business_name;
  const ein = item.line_d_ein?.replace(/\D/g, "");
  const profit = isFarm
    ? row.item.qbi_wotc_filing_review
      ? patronFiledBusinessLines(
        "schedule_f",
        item,
        row.determined_wage_reduction,
      ).profit
      : filedOwnedScheduleF(row.item)?.profit ?? fProfit(row.item)
    : filedOwnedScheduleC(row.item, false, row.determined_wage_reduction)
      ?.profit ?? cProfit(row.item, row.determined_wage_reduction);
  const review = row.item.qbi_wotc_filing_review;
  const wages = isFarm
    ? row.item.qbi_w2_wages ?? 0
    : row.item.qbi_w2_wages ?? 0;
  if (
    !reference || !name || !ein || !/^\d{9}$/.test(ein) ||
    (!review && profit <= 0) ||
    item.qbi_no_other_adjustments_confirmed !== true ||
    (item.qbi_unadjusted_basis ?? 0) !== 0 ||
    (isFarm
      ? row.item.line_e_material_participation !== true ||
        row.item.line36_at_risk === "b" ||
        row.item.at_risk_simplified !== undefined ||
        row.item.accounting_method !== "cash"
      : row.item.line_g_material_participation !== true ||
        row.item.line_f_accounting_method !== "cash" ||
        row.item.line_32_at_risk !== "a" ||
        row.item.at_risk_simplified !== undefined ||
        row.item.qbi_specified_service === true)
  ) {
    throw new Error(
      "Farm WOTC QBI needs actual identified ordinary source businesses and regular at-risk SE",
    );
  }
  if (isFarm && row.determined_wage_reduction > 0) {
    const records = review?.employee_w2_records ?? [];
    const gross = row.item.line22_labor_hired ?? 0;
    if (
      !review || !records.length || !review.owner_ssn ||
      new Set(records.map((r) => r.employee_ssn)).size !== records.length ||
      new Set(records.map((r) => r.employee_reference)).size !==
        records.length ||
      new Set(records.map((r) => r.source_document_reference)).size !==
        records.length ||
      Math.abs(records.reduce((s, r) => s + r.box1_wages, 0) - gross) > 1e-6 ||
      Math.abs(records.reduce((s, r) => s + r.box5_wages, 0) - gross) > 1e-6 ||
      (row.item.line22_other_employment_credits ?? 0) !== 0 ||
      Math.abs(wages - (gross - row.determined_wage_reduction)) > 1e-6 ||
      wages < 0 ||
      (review.no_other_business_or_aggregation_confirmed !== true &&
        review.no_aggregation_confirmed !== true)
    ) {
      throw new Error(
        "Farm WOTC full reduction, employer W2 payroll and allocable QBI wages disagree",
      );
    }
  } else if (!isFarm && row.determined_wage_reduction > 0) {
    reviewedWotcQbiWages(row.item, row.determined_wage_reduction);
  } else if (
    review || wages !== 0 ||
    (isFarm && (row.item.line22_labor_hired ?? 0) !== 0)
  ) {
    throw new Error(
      "Other ordinary farm/business sources require actual zero employee wages on this farm WOTC route",
    );
  }
  return {
    reference,
    name,
    ein,
    profit,
    wages,
    recipient: item.proprietor_recipient ?? "T",
    review,
  };
}

/** Retain only calculations derived from the actual source rows, never authored QBI or SE totals. */
export function farmWotcAdvancedFields(
  input: any,
  taxableIncome: number,
): Form8995AInput | undefined {
  const farms = input.schedule_f_qbi_businesses as any[] | undefined;
  if (!farms?.some((r) => r.source_schedule_f?.qbi_wotc_filing_review)) {
    return undefined;
  }
  const businesses: FarmWotcSource["businesses"] = [
    ...farms.map((r) => ({
      kind: "schedule_f" as const,
      item: farmSchema.parse(r.source_schedule_f),
      determined_wage_reduction: r.wotc_wage_reduction ?? 0,
    })),
    ...(input.schedule_c_qbi_businesses ?? []).map((r: any) => ({
      kind: "schedule_c" as const,
      item: businessSchema.parse(r.source_schedule_c),
      determined_wage_reduction: r.wotc_wage_reduction ?? 0,
    })),
  ];
  const sum = (v: any): number =>
    Array.isArray(v) ? v.reduce((a, b) => a + b, 0) : v ?? 0;
  const amounts = businesses.map(farmWotcBusinessAmounts);
  const half = sum(input.se_tax_deduction);
  const source = farmWotcSourceSchema.parse({
    businesses,
    se_tax_deduction: half,
    joint_se_source: input.joint_se_source,
    taxpayer_ssn: String(input.taxpayer_ssn ?? "").replace(/\D/g, ""),
    joint_wages_total: input.agi - amounts.reduce((a, r) => a + r.profit, 0) +
      half,
  });
  if (
    sum(input.qbi_from_schedule_f) + sum(input.qbi_from_schedule_c) !==
      amounts.reduce((a, r) => a + r.profit, 0) ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    sum(input.qbi) !== 0 || sum(input.sstb_qbi) !== 0 ||
    sum(input.se_health_insurance_deduction) !== 0 ||
    sum(input.retirement_plan_deduction) !== 0 ||
    sum(input.line6_sec199a_dividends) !== 0 ||
    (input.net_capital_gain ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  ) {
    throw new Error(
      "Farm WOTC source/QBI income requires its complete ordinary source and reviewed adjustments",
    );
  }
  const fields: Form8995AInput = {
    filing_status: input.filing_status,
    taxable_income: Math.round(taxableIncome),
    net_capital_gain: 0,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    farm_wotc_filing_source: source,
  };
  const calculated = calculateFarmWotcLines(fields, false);
  return {
    ...fields,
    qbi: calculated.rows.reduce((s, r) => s + r.lines.line2, 0),
    w2_wages: calculated.rows.reduce((s, r) => s + r.lines.line4, 0),
    unadjusted_basis: 0,
  };
}

export function calculateFarmWotcLines(
  input: Form8995AInput,
  checkTotals = true,
) {
  const source = farmWotcSourceSchema.parse(input.farm_wotc_filing_source);
  const amounts = source.businesses.map(farmWotcBusinessAmounts);
  const reviewed = amounts.filter((a) => a.review);
  if (
    (reviewed.length !== 1 && reviewed.length !== 2) ||
    (reviewed.length === 2 && (input.filing_status !== "mfj" ||
      new Set(reviewed.map((a) => a.recipient)).size !== 2)) ||
    !["single", "mfj"].includes(input.filing_status) ||
    input.taxable_income <= (input.filing_status === "mfj" ? 394600 : 197300) ||
    !Number.isInteger(input.taxable_income) ||
    new Set(amounts.map((a) => a.reference)).size !== amounts.length ||
    new Set(amounts.map((a) => a.ein)).size !== amounts.length ||
    (input.net_capital_gain ?? 0) !== 0 ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.business_filing_details || input.single_schedule_c_source ||
    input.wotc_business_sources || input.patron_business_source ||
    input.aggregation_filing_details || input.sstb_filing_details ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  ) {
    throw new Error(
      "Farm WOTC advanced parent needs actual retained ordinary farms, owners and income range",
    );
  }
  let deductions: number[];
  if (input.filing_status === "mfj") {
    const owned = ownedScheduleSE(
      source.joint_se_source,
      CONFIG_BY_YEAR[2025].ssWageBase,
    );
    if (
      owned.deduction !== source.se_tax_deduction ||
      owned.source.businesses.length !== amounts.length ||
      amounts.some((a, i) =>
        !owned.source.businesses.some((b) =>
          b.source_reference === a.reference && b.net_profit === a.profit &&
          b.kind === source.businesses[i].kind && b.recipient === a.recipient
        )
      )
    ) {
      throw new Error(
        "Farm WOTC attributable SE must reconcile to actual owner sources",
      );
    }
    const qbi = jointOwnerQbi(
      source.joint_se_source,
      input.taxable_income,
      CONFIG_BY_YEAR[2025].ssWageBase,
    );
    deductions = amounts.map((a) =>
      qbi.joint_owner_filing_rows.find((r) =>
        r.business_reference === a.reference
      )!.se_tax_deduction
    );
  } else {
    if (
      source.joint_se_source || amounts.length !== 1 ||
      amounts[0].recipient !== "T"
    ) {
      throw new Error(
        "Single farm source must retain its actual taxpayer proprietor",
      );
    }
    deductions = [source.se_tax_deduction];
  }
  amounts.forEach((a) => {
    if (!a.review) return;
    const others = amounts.filter((o) => o.reference !== a.reference).map((o) =>
      o.reference
    );
    if (
      others.length
        ? a.review.no_other_business_or_aggregation_confirmed === true ||
          a.review.no_aggregation_confirmed !== true ||
          JSON.stringify(a.review.reviewed_other_business_references) !==
            JSON.stringify(others)
        : a.review.no_other_business_or_aggregation_confirmed !== true
    ) {
      throw new Error(
        "Farm WOTC review must identify the actual ordinary other businesses without aggregation",
      );
    }
    const owner = a.recipient === "T"
      ? source.taxpayer_ssn
      : source.joint_se_source?.identity.spouse_ssn;
    if (a.review.owner_ssn !== owner) {
      throw new Error(
        "Farm WOTC review differs from its actual proprietor identity",
      );
    }
  });
  const sourceQbi = amounts.map((a, i) =>
    roundSignedQbiDollars(a.profit - deductions[i])
  );
  const positiveTotal = sourceQbi.reduce((s, q) => s + Math.max(0, q), 0);
  const lossTotal = -sourceQbi.reduce((s, q) => s + Math.min(0, q), 0);
  const offset = Math.min(positiveTotal, lossTotal);
  const lossShares = sourceQbi.map((q) =>
    q > 0 ? Math.round(offset * q / positiveTotal) : 0
  );
  if (positiveTotal > 0) {
    lossShares[sourceQbi.indexOf(Math.max(...sourceQbi))] += offset -
      lossShares.reduce((s, q) => s + q, 0);
  }
  const adjusted = sourceQbi.map((q, i) => q > 0 ? q - lossShares[i] : 0);
  if (lossTotal > 0 && amounts.length > 2) {
    throw new Error(
      "Reviewed farm loss Schedule C currently supports two actual source businesses",
    );
  }
  const lossSchedule = lossTotal > 0
    ? {
      rows: amounts.map((a, i) => ({
        name: a.name!,
        line1a: sourceQbi[i],
        line1b: lossShares[i],
        line1c: adjusted[i],
      })),
      line2: 0,
      line3: lossTotal,
      line4: positiveTotal,
      line5: offset,
      line6: lossTotal - offset,
    }
    : undefined;
  const rows = amounts.map((a, i) => {
    const child: Form8995AInput = {
      filing_status: input.filing_status,
      taxable_income: input.taxable_income,
      qbi: lossSchedule ? adjusted[i] : sourceQbi[i],
      w2_wages: lossSchedule && adjusted[i] <= 0 ? 0 : Math.round(a.wages),
      unadjusted_basis: 0,
      farm_wotc_filing_source: source,
      business_filing_details: {
        business_name: a.name,
        ein: a.ein,
        business_qbi: lossSchedule ? adjusted[i] : sourceQbi[i],
        business_w2_wages: lossSchedule && adjusted[i] <= 0
          ? 0
          : Math.round(a.wages),
        business_ubia: 0,
        one_non_sstb_business_confirmed: true,
        no_aggregation_confirmed: true,
        no_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed: true,
        qbi_wages_ubia_sources_confirmed: true,
        taxable_income_before_qbi_confirmed: true,
      },
    };
    return {
      source: source.businesses[i],
      amounts: a,
      input: child,
      lines: calculateOneBusiness8995ALines(child),
    };
  });
  if (
    checkTotals &&
    (input.qbi !== rows.reduce((s, r) => s + r.lines.line2, 0) ||
      input.w2_wages !== rows.reduce((s, r) => s + r.lines.line4, 0) ||
      input.unadjusted_basis !== 0)
  ) {
    throw new Error(
      "Farm WOTC parent QBI/wage totals differ from actual business rows",
    );
  }
  const line16 = rows.reduce((s, r) => s + r.lines.line15, 0),
    line36 = rows[0].lines.line36;
  const parent = {
    ...rows[0].lines,
    line16,
    line27: line16,
    line32: line16,
    line37: Math.min(line16, line36),
    line39: Math.min(line16, line36),
    line40: 0,
    phaseInRequired: rows.some((r) => r.lines.phaseInRequired),
    phaseIn: rows.find((r) => r.lines.phaseInRequired)?.lines.phaseIn ??
      rows[0].lines.phaseIn,
  };
  return { source, rows, parent, lossSchedule };
}
