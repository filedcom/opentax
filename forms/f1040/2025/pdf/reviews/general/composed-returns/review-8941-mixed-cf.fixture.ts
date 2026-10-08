import {
  commonControlForm8941Shares,
  inputSchema,
} from "../../../../../nodes/inputs/credits/health/f8941/index.ts";
import { form8941CommonControlInputs } from "./review-8941-common-control.fixture.ts";
import { ownedFarmRecord } from "../../taxes/self-employment/review-schedule-se-farm-owner.fixture.ts";
import { computeNetProfit as computeCProfit } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import {
  computeNetProfit as computeFProfit,
  itemSchema as farmItemSchema,
} from "../../../../../nodes/intermediate/forms/income/business/schedule_f/model.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { allocateSharedSeDeduction } from "../../../../../nodes/inputs/income/business/schedule_c/qbi-multiple.ts";

/** Same-proprietor retail Schedule C and owned cash farm SHOP payrolls. */
export function form8941MixedCfInputs(agriculture = 170000) {
  const original: any = form8941CommonControlInputs();
  const [c, priorFarm] = original.f8941.group_members;
  const farmId = "SHOP-Controlled-Farm";
  const {
    schedule_c_business_reference: _oldBusiness,
    other_schedule_c_employee_benefits: _oldBenefits,
    excluded_workers: _excluded,
    excluded_worker_reviews: _reviews,
    ...farmFields
  } = priorFarm;
  const source: any = inputSchema.parse({
    ...original.f8941,
    qualifying_arrangement: "same_proprietor_mixed_c_f_common_control",
    member_control_records: [
      original.f8941.member_control_records[0],
      {
        ...original.f8941.member_control_records[1],
        business_reference: farmId,
      },
    ],
    group_members: [c, {
      ...farmFields,
      schedule_f_farm_id: farmId,
      other_schedule_f_employee_benefits: 1000,
      cash_schedule_f_shop_employer_confirmed: true,
      farm_ownership_source_reference:
        "Synthetic controlled farm ownership deed",
      farming_activity_source_reference: "Synthetic operated grain farm ledger",
      farm_issued_receipt_references: [
        "Synthetic controlled farm issued 1099G",
        "Synthetic controlled farm issued 1099NEC",
      ],
    }],
  });
  const shares = commonControlForm8941Shares(source);
  const scheduleC = { ...original.schedule_c[0] };
  const member: any = source.group_members[1];
  const wageTotal = member.employees.reduce(
    (sum: number, worker: any) => sum + worker.social_security_medicare_wages,
    0,
  );
  const farm: any = {
    ...ownedFarmRecord(0, "T"),
    farm_id: farmId,
    line_d_ein: member.employment_ein,
    line4a_ag_program_payments: agriculture,
    line4b_ag_program_payments_taxable: agriculture,
    line8_other_income: 50000,
    line15_employee_benefits: member.other_schedule_f_employee_benefits +
      shares.memberPremiums[1],
    line22_labor_hired: wageTotal,
    shop_employee_w2_records: member.employees.map((worker: any) => ({
      employee_reference: worker.employee_reference,
      employee_ssn: worker.employee_ssn,
      employer_ein: member.employment_ein,
      payroll_record_reference: worker.enrollment_and_payroll_record_reference,
      social_security_medicare_wages: worker.social_security_medicare_wages,
      hours_of_service: worker.hours_of_service,
    })),
  };
  const cProfit = computeCProfit({
    ...scheduleC,
    line_14_employee_benefits: scheduleC.line_14_employee_benefits -
      shares.shares[0],
  });
  const fProfit = computeFProfit(farmItemSchema.parse({
    ...farm,
    line15_employee_benefits: farm.line15_employee_benefits - shares.shares[1],
  }));
  const seDeduction = scheduleSELines({
    net_profit_schedule_c: cProfit,
    net_profit_schedule_f: fProfit,
    w2_ss_wages: 0,
  }, CONFIG_BY_YEAR[2025].ssWageBase)?.line13 ?? 0;
  const allocations = allocateSharedSeDeduction(
    [cProfit, fProfit],
    seDeduction,
  );
  const review = (index: number) => ({
    deduction_amount: allocations[index],
    allocation_method: "positive_profit_proportion_with_cent_residual" as const,
    reasonable_for_business_facts_confirmed: true as const,
    consistently_applied_and_books_agree_confirmed: true as const,
    all_businesses_included_confirmed: true as const,
    no_aggregation_confirmed: true as const,
    workpaper_reference: `Synthetic mixed C/F group SE allocation ${index}`,
    reviewed_by: "Synthetic reviewer",
    reviewed_on: "2026-10-06",
  });
  scheduleC.qbi_se_tax_allocation_review = review(0);
  farm.qbi_se_tax_allocation_review = review(1);
  return {
    general: original.general,
    f8941: source,
    schedule_c: [scheduleC],
    schedule_f: { schedule_fs: [farm] },
    f1099g: [{
      payer_name: "Synthetic Controlled Agricultural Program Issuer",
      payer_tin: "345678901",
      recipient_tin: source.owner_ssn,
      account_number: "CONTROLLED-FARM-AGRI",
      source_document_reference: member.farm_issued_receipt_references[0],
      farm_id: farmId,
      box_7_agriculture: agriculture,
      box_7_payment_kind: "agricultural_program",
      box_7_review_reference:
        "Synthetic controlled farm taxable program payment review",
    }],
    f1099nec: [{
      payer_name: "Synthetic Controlled Farm Customer",
      payer_tin: "234567891",
      recipient_ssn: source.owner_ssn,
      account_number: "CONTROLLED-FARM-OTHER",
      source_document_reference: member.farm_issued_receipt_references[1],
      box1_nec: 50000,
      for_routing: "schedule_f",
      farm_id: farmId,
    }],
  };
}
