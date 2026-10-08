import type { Form8995AInput } from "./index.ts";
import {
  computeNetProfit,
  projectScheduleCItems,
} from "../../../../../inputs/income/business/schedule_c/model.ts";
import { calculateCharitableNaturalResource } from "../../../../../inputs/deductions/charitable/f8283/natural-resource-source.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import { FilingStatus } from "../../../../../types.ts";

/** A depletion-only mineral interest is not UBIA depreciable property. Its
 * complete paid mine-cost account contains corporate vendors, not employees. */
export function assertProducingMiningZeroQbi(input: Form8995AInput) {
  const retained = input.producing_mining_zero_qbi_source;
  if (!retained) return false;
  if (
    input.single_schedule_c_source || input.single_sstb_schedule_c_source ||
    input.farm_wotc_filing_source || input.wotc_business_sources ||
    input.patron_business_source || input.patron_filing_details ||
    input.aggregation_filing_details || input.sstb_filing_details ||
    input.schedule_c_qbi_businesses
  ) {
    throw new Error(
      "Producing mine zero QBI cannot replace another retained business route",
    );
  }
  const business = retained.business;
  const item = business.source_schedule_c;
  const source = item.donated_natural_resource_property_source;
  if (
    !source || source.kind !== "producing_mining_617" ||
    source.donor_ssn !== retained.owner_ssn ||
    source.business_reference !== business.business_reference ||
    item.proprietor_recipient !== "T" || source.proprietor_recipient !== "T" ||
    input.filing_status !== FilingStatus.Single ||
    source.mineral_cost_allocation_record.separate_depreciable_asset_cost !==
      0 ||
    source.mineral_cost_allocation_record.residual_nonmineral_land_cost !== 0
  ) {
    throw new Error(
      "Producing mine zero QBI needs its same owned depletion-only mineral account",
    );
  }
  const details = input.business_filing_details;
  if (
    !business.ein || !details || details.ein !== business.ein ||
    details.business_name !== business.business_name ||
    details.business_qbi !== input.qbi || details.business_w2_wages !== 0 ||
    details.business_ubia !== 0
  ) {
    throw new Error(
      "Producing mine zero QBI filing details differ from actual business identity",
    );
  }
  const current = source.annual_records.at(-1)!;
  if (
    current.tax_year !== 2025 ||
    current.expenses.some((row) =>
      row.vendor_entity_classification !== "c_corporation"
    )
  ) {
    throw new Error(
      "Producing mine zero QBI needs complete current corporate-vendor cost records",
    );
  }
  const projected = projectScheduleCItems({ schedule_cs: [item] })[0];
  const calc = calculateCharitableNaturalResource(source);
  const profit = current.gross_property_income - calc.current_year.deduction -
    calc.current_year.depletion;
  if (
    computeNetProfit(projected) !== profit || business.qbi !== profit ||
    profit <= 0 || (item.line_26_wages ?? 0) !== 0 ||
    (item.qbi_w2_wages ?? 0) !== 0 || (item.qbi_unadjusted_basis ?? 0) !== 0 ||
    item.qbi_specified_service === true || item.qbi_wotc_filing_review ||
    item.qbi_sstb_filing_review ||
    item.qbi_no_other_adjustments_confirmed !== true ||
    business.w2_wages !== 0 || business.ubia !== 0 || input.w2_wages !== 0 ||
    input.unadjusted_basis !== 0 ||
    input.qbi !== profit - retained.se_tax_deduction || input.qbi! <= 0 ||
    input.taxable_income <=
      CONFIG_BY_YEAR[2025].qbiThresholdSingle +
        CONFIG_BY_YEAR[2025].qbiPhaseInRange / 2 ||
    (input.sstb_qbi ?? 0) !== 0 || input.net_capital_gain !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.patron_of_specified_cooperative === true ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.aggregation_groups?.length
  ) {
    throw new Error(
      "Producing mine zero QBI differs from actual profit/halfSE/wage/UBIA/threshold source",
    );
  }
  return true;
}
