import { z } from "zod";
import {
  computeNetProfit as scheduleCProfit,
  itemSchema as scheduleCItemSchema,
} from "../../../inputs/schedule_c/model.ts";
import {
  allocateSharedSeDeduction,
  roundSignedQbiDollars,
} from "../../../inputs/schedule_c/qbi-multiple.ts";
import {
  computeNetProfit as scheduleFProfit,
  itemSchema as scheduleFItemSchema,
} from "../schedule_f/model.ts";
import { scheduleSELines } from "../schedule_se/calculation.ts";
import {
  ownedScheduleSE,
  ownerSourcesSchema,
} from "../schedule_se/owner-calculation.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { assertZeroLimitInventory } from "./zero-limit-inventory.ts";
import {
  calculateOneBusiness8995ALines,
  type Form8995AInput,
} from "./index.ts";

export const mixedFishingQbiSourceSchema = z.object({
  owner_ssn: z.string().regex(/^\d{9}$/).optional(),
  joint_se_source: ownerSourcesSchema.optional(),
  schedule_c: scheduleCItemSchema,
  schedule_f: scheduleFItemSchema,
  se_tax_deduction: z.number().int().nonnegative(),
}).strict();

/** Two separate owned businesses; neither an aggregation election nor a wage source. */
export function calculateMixedFishingQbi(input: Form8995AInput) {
  const source = mixedFishingQbiSourceSchema.parse(
    input.mixed_fishing_qbi_source,
  );
  const c = source.schedule_c, f = source.schedule_f;
  const profits = [scheduleCProfit(c), scheduleFProfit(f)];
  const joint = source.joint_se_source !== undefined;
  const se = joint ? undefined : scheduleSELines({
    net_profit_schedule_c: profits[0],
    net_profit_schedule_f: profits[1],
  }, CONFIG_BY_YEAR[2025].ssWageBase);
  const owned = joint
    ? ownedScheduleSE(source.joint_se_source!, CONFIG_BY_YEAR[2025].ssWageBase)
    : undefined;
  const allocations = owned
    ? [c.proprietor_recipient, f.proprietor_recipient].map((recipient) =>
      owned.instances.find((row) => row.recipient === recipient)?.line13 ?? -1
    )
    : allocateSharedSeDeduction(profits, source.se_tax_deduction);
  const reviews = [
    c.qbi_se_tax_allocation_review,
    f.qbi_se_tax_allocation_review,
  ];
  const names = [c.line_c_business_name, f.line_c_farm_name];
  const eins = [
    c.line_d_ein?.replace(/\D/g, ""),
    f.line_d_ein?.replace(/\D/g, ""),
  ];
  if (
    (joint
      ? input.filing_status !== "mfj" ||
        input.taxable_income <= 394_600 ||
        source.owner_ssn !== undefined || !owned ||
        owned.source.businesses.length !== 2 ||
        owned.instances.length !== 2 ||
        owned.deduction !== source.se_tax_deduction ||
        c.proprietor_recipient === f.proprietor_recipient ||
        !["T", "S"].includes(c.proprietor_recipient ?? "") ||
        !["T", "S"].includes(f.proprietor_recipient ?? "") ||
        [c.business_reference, f.farm_id].some((reference, index) => {
          const business = owned.source.businesses.find((row) =>
            row.source_reference === reference
          );
          return !business || business.recipient !==
              [c.proprietor_recipient, f.proprietor_recipient][index] ||
            business.kind !== ["schedule_c", "schedule_f"][index] ||
            business.net_profit !== profits[index];
        }) || allocations.some((value) => value < 0)
      : input.filing_status !== "single" ||
        input.taxable_income <= 197_300 || input.taxable_income >= 247_300 ||
        source.owner_ssn === undefined || !se ||
        se.line13 !== source.se_tax_deduction) ||
    !Number.isInteger(input.taxable_income) ||
    profits.some((p) => !Number.isSafeInteger(p) || p <= 0) ||
    !c.business_reference || !f.farm_id || c.business_reference === f.farm_id ||
    names.some((name) => !name) ||
    eins.some((ein) => !/^\d{9}$/.test(ein ?? "")) ||
    eins[0] === eins[1] || (!joint &&
      (c.proprietor_recipient !== "T" || f.proprietor_recipient !== "T")) ||
    c.line_b_business_code !== "114110" ||
    c.line_g_material_participation !== true ||
    f.line_e_material_participation !== true ||
    c.line_f_accounting_method !== "cash" || f.accounting_method !== "cash" ||
    c.qbi_no_other_adjustments_confirmed !== true ||
    f.qbi_no_other_adjustments_confirmed !== true ||
    (c.qbi_w2_wages ?? 0) !== 0 || (f.qbi_w2_wages ?? 0) !== 0 ||
    (c.qbi_unadjusted_basis ?? 0) !== 0 ||
    (f.qbi_unadjusted_basis ?? 0) !== 0 ||
    (!joint && reviews.some((review, i) =>
      !review ||
      review.deduction_amount !== allocations[i] ||
      review.allocation_method !==
        "positive_profit_proportion_with_cent_residual" ||
      review.reasonable_for_business_facts_confirmed !== true ||
      review.consistently_applied_and_books_agree_confirmed !== true ||
      review.all_businesses_included_confirmed !== true ||
      review.no_aggregation_confirmed !== true
    )) ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.patron_of_specified_cooperative !== false ||
    input.business_filing_details || input.single_schedule_c_source ||
    input.single_schedule_f_source || input.farm_wotc_filing_source ||
    input.aggregation_filing_details || input.aggregation_groups?.length ||
    (input.sstb_qbi ?? 0) !== 0 || (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.w2_wages !== 0 || input.unadjusted_basis !== 0
  ) {
    throw new Error(
      "Mixed fishing Form 8995-A needs two actual owned businesses and reviewed SE allocation",
    );
  }
  const qbi = profits.map((profit, i) =>
    roundSignedQbiDollars(profit - allocations[i])
  );
  if (input.qbi !== qbi[0] + qbi[1]) {
    throw new Error(
      "Mixed fishing Form 8995-A QBI differs from actual business sources",
    );
  }
  if (input.taxable_income >= 494_600) {
    if (
      (c.line_26_wages ?? 0) !== 0 || (c.line_13_depreciation ?? 0) !== 0 ||
      (f.line22_labor_hired ?? 0) !== 0 ||
      (f.line14_depreciation ?? 0) !== 0 ||
      c.qbi_w2_wages !== 0 || f.qbi_w2_wages !== 0 ||
      c.qbi_unadjusted_basis !== 0 || f.qbi_unadjusted_basis !== 0
    ) {
      throw new Error(
        "Full phase-out zero limit conflicts with filed payroll, depreciation, or QBI limit amounts",
      );
    }
    const ownerSsns = joint
      ? [c.proprietor_recipient, f.proprietor_recipient].map((recipient) =>
        recipient === "S"
          ? owned!.source.identity.spouse_ssn
          : owned!.source.identity.primary_ssn
      )
      : [source.owner_ssn, source.owner_ssn];
    [c, f].forEach((business, index) =>
      assertZeroLimitInventory(business.qbi_zero_limit_inventory, {
        owner_ssn: ownerSsns[index]!,
        business_reference: [c.business_reference, f.farm_id][index]!,
        employer_ein: eins[index]!,
      })
    );
  }
  const rows = qbi.map((amount, i) => {
    const details = {
      business_name: names[i]!,
      ein: eins[i]!,
      business_qbi: amount,
      business_w2_wages: 0,
      business_ubia: 0,
      one_non_sstb_business_confirmed: true as const,
      no_aggregation_confirmed: true as const,
      no_ptp_or_loss_carryforward_confirmed: true as const,
      qualified_dividends_zero_confirmed: joint,
      qbi_wages_ubia_sources_confirmed: true as const,
      taxable_income_before_qbi_confirmed: true as const,
    };
    const child: Form8995AInput = {
      ...input,
      qbi: amount,
      business_filing_details: details,
    };
    return { details, lines: calculateOneBusiness8995ALines(child) };
  });
  const line16 = rows.reduce((sum, row) => sum + row.lines.line15, 0);
  const line36 = rows[0].lines.line36;
  const parent = {
    ...rows[0].lines,
    line16,
    line32: line16,
    line37: Math.min(line16, line36),
    line39: Math.min(line16, line36),
  };
  return { source, rows, parent, profits, allocations };
}
