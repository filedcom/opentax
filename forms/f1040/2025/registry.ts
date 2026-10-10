import { currentOrphanAllocationNode } from "../nodes/inputs/credits/business/f3800/current-allocation-node.ts";
import { f8886 } from "./domains/general/filing/form8886/public-node.ts";
import { qbiPatron } from "../nodes/inputs/deductions/business/qbi_patron/index.ts";
import { education_income } from "../nodes/inputs/income/other/education_income/index.ts";
import type { NodeRegistry } from "../../../core/types/node-registry.ts";
import { buildStartNode, inputNodes } from "./return-processing/start.ts";

// ── Inputs ────────────────────────────────────────────────────────────────────
import { ext } from "../nodes/inputs/payments/estimated/ext/index.ts";
import { form1116_review } from "../nodes/inputs/credits/foreign/form1116_review/index.ts";
import { form1116_carryover_review } from "../nodes/inputs/credits/foreign/form1116_carryover_review/index.ts";
import { form1116_prior_carryover } from "../nodes/inputs/credits/foreign/form1116_prior_carryover/index.ts";
import { form8582_prior_year_record } from "../nodes/inputs/income/business/form8582_prior_year_record/index.ts";
import { f1098 } from "../nodes/inputs/deductions/mortgage/f1098/index.ts";
import { mortgage_refinance_points } from "../nodes/inputs/deductions/mortgage/mortgage_refinance_points/index.ts";
import { f1099b } from "../nodes/inputs/income/investments/f1099b/index.ts";
import { f1099c } from "../nodes/inputs/income/other/f1099c/index.ts";
import { f1099div } from "../nodes/inputs/income/investments/f1099div/index.ts";
import { f1099g } from "../nodes/inputs/income/other/f1099g/index.ts";
import { f1099int } from "../nodes/inputs/income/investments/f1099int/index.ts";
import { f1099k } from "../nodes/inputs/income/business/f1099k/index.ts";
import { f1099oid } from "../nodes/inputs/income/investments/f1099oid/index.ts";
import { f1099m } from "../nodes/inputs/income/business/f1099m/index.ts";
import { f1099nec } from "../nodes/inputs/income/business/f1099nec/index.ts";
import { f1099r } from "../nodes/inputs/income/retirement/f1099r/index.ts";
import { f1095a } from "../nodes/inputs/credits/health/f1095a/index.ts";
import { f4835 } from "../nodes/inputs/income/business/f4835/index.ts";
import { f2441 } from "../nodes/inputs/credits/individual/f2441/index.ts";
import { f8812 } from "../nodes/inputs/credits/child/f8812/index.ts";
import { f8863 } from "../nodes/inputs/credits/individual/f8863/index.ts";
import { f8949 as f8949InputNode } from "../nodes/inputs/income/investments/f8949/index.ts";
import { general } from "../nodes/inputs/general/filing/general/index.ts";
import { k1_trust } from "../nodes/inputs/income/rental-passthrough/k1_trust/index.ts";
import { k1SCorpNode } from "../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { k1Partnership } from "../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { scheduleA } from "../nodes/inputs/deductions/itemized/schedule_a/index.ts";
import { scheduleC } from "../nodes/inputs/income/business/schedule_c/index.ts";
import { scheduleE } from "../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { personal_property_rental } from "../nodes/inputs/income/other/personal_property_rental/index.ts";
import { rrb1099r } from "../nodes/inputs/income/retirement/rrb1099r/index.ts";
import { ssa1099 } from "../nodes/inputs/income/retirement/ssa1099/index.ts";
import { w2 } from "../nodes/inputs/income/wages/w2/index.ts";
import { ct2 } from "../nodes/inputs/taxes/employment/ct2/index.ts";
import { w2g } from "../nodes/inputs/income/gambling/w2g/index.ts";
import { f1099patr } from "../nodes/inputs/income/business/f1099patr/index.ts";
import { f8283 } from "../nodes/inputs/deductions/charitable/f8283/index.ts";
import { f7217 } from "../nodes/inputs/income/business/f7217/index.ts";
import { f9465 } from "../nodes/inputs/payments/installments/f9465/index.ts";
import { f8888 } from "../nodes/inputs/payments/refund/f8888/index.ts";
import { schedule_r } from "../nodes/inputs/credits/elderly-disabled/schedule_r/index.ts";
import { schedule_lep } from "../nodes/inputs/general/filing/schedule_lep/index.ts";
import { f9000 } from "../nodes/inputs/general/filing/f9000/index.ts";
import { f4547 } from "../nodes/inputs/general/disclosures/f4547/index.ts";
import { payment_request } from "../nodes/inputs/payments/settlement/payment_request/index.ts";
import { amendment_request } from "../nodes/inputs/general/filing/amendment_request/index.ts";
import { benefit_1042s } from "../nodes/inputs/income/retirement/benefit_1042s/index.ts";
import { f2210 } from "../nodes/inputs/taxes/underpayment/f2210/index.ts";
import { f2210f } from "../nodes/inputs/taxes/underpayment/f2210f/index.ts";
import { f3903 } from "../nodes/inputs/adjustments/moving/f3903/index.ts";
import { f5695 } from "../nodes/inputs/credits/individual/f5695/index.ts";
import { f8936 } from "../nodes/inputs/credits/individual/f8936/index.ts";
import { f8862 } from "../nodes/inputs/credits/individual/f8862/index.ts";
import { f8958 } from "../nodes/inputs/general/filing/f8958/index.ts";
import { f8994 } from "../nodes/inputs/credits/business/f8994/index.ts";
import { f8814 } from "../nodes/inputs/income/investments/f8814/index.ts";
import { f8379 } from "../nodes/inputs/payments/refundable/f8379/index.ts";
import { f8938 } from "../nodes/inputs/general/foreign/f8938/index.ts";
import { f5884 } from "../nodes/inputs/credits/business/f5884/index.ts";
import { f6478 } from "../nodes/inputs/credits/business/f6478/index.ts";
import { f6765 } from "../nodes/inputs/credits/business/f6765/index.ts";
import { f7207 } from "../nodes/inputs/credits/business/f7207/index.ts";
import { f8881 } from "../nodes/inputs/credits/business/f8881/index.ts";
import { f8882 } from "../nodes/inputs/credits/business/f8882/index.ts";
import { f8908 } from "../nodes/inputs/credits/business/f8908/index.ts";
import { f8941 } from "../nodes/inputs/credits/health/f8941/index.ts";
import { f8834 } from "../nodes/inputs/credits/individual/f8834/index.ts";
import { f8874 } from "../nodes/inputs/credits/business/f8874/index.ts";
import { f8874_recapture } from "../nodes/inputs/credits/business/f8874/recapture_node.ts";
import { f453a_interest } from "../nodes/inputs/taxes/interest/f453a_interest/index.ts";
import { f8911 } from "../nodes/inputs/credits/business/f8911/index.ts";
import { f8826 } from "../nodes/inputs/credits/business/f8826/index.ts";
import { f4136 } from "../nodes/inputs/credits/business/f4136/index.ts";
import { f3468 } from "../nodes/inputs/credits/business/f3468/index.ts";
import { f4255 } from "../nodes/inputs/taxes/credit-recapture/f4255/index.ts";
import { f8801 } from "../nodes/inputs/credits/amt/f8801/index.ts";
import { f8332 } from "../nodes/inputs/general/filing/f8332/index.ts";
import { f8822 } from "../nodes/inputs/general/filing/f8822/index.ts";
import { f1310 } from "../nodes/inputs/general/filing/f1310/index.ts";
import { f2439 } from "../nodes/inputs/payments/investments/f2439/index.ts";
import { f3921 } from "../nodes/inputs/income/investments/f3921/index.ts";
import { f8997 } from "../nodes/inputs/general/investments/f8997/index.ts";
import { schedule_j } from "../nodes/inputs/taxes/income-averaging/schedule_j/index.ts";
import { schedule_j_calculation } from "../nodes/intermediate/forms/taxes/income-averaging/schedule_j/index.ts";
import { f8609 } from "../nodes/inputs/credits/business/f8609/index.ts";
import { f4852 } from "../nodes/inputs/income/wages/f4852/index.ts";
import { clergy } from "../nodes/inputs/income/wages/clergy/index.ts";
import { f8915f } from "../nodes/inputs/income/retirement/f8915f/index.ts";
import { f8915d } from "../nodes/inputs/income/retirement/f8915d/index.ts";
import { sep_retirement } from "../nodes/inputs/adjustments/retirement/sep_retirement/index.ts";
import { f3800 } from "../nodes/inputs/credits/business/f3800/index.ts";
import { f2106 } from "../nodes/inputs/adjustments/employment/f2106/index.ts";
import { f5405 } from "../nodes/inputs/taxes/other/f5405/index.ts";
import { ltc_premium } from "../nodes/inputs/adjustments/health/ltc_premium/index.ts";
import { sales_tax_deduction } from "../nodes/inputs/deductions/itemized/sales_tax_deduction/index.ts";
import { auto_expense } from "../nodes/inputs/income/business/auto_expense/index.ts";
import { nol_carryforward } from "../nodes/inputs/income/business/nol_carryforward/index.ts";
import { f8082 } from "../nodes/inputs/general/disclosures/f8082/index.ts";
import { f8873 } from "../nodes/inputs/income/foreign/f8873/index.ts";
import { f8288 } from "../nodes/inputs/payments/withholding/f8288/index.ts";
import { f8621 } from "../nodes/inputs/income/foreign/f8621/index.ts";
import { f8917 } from "../nodes/inputs/adjustments/education/f8917/index.ts";
import { f8867 } from "../nodes/inputs/general/filing/f8867/index.ts";
import { f8859 } from "../nodes/inputs/credits/individual/f8859/index.ts";
import { f8820 } from "../nodes/inputs/credits/business/f8820/index.ts";
import { f8896 } from "../nodes/inputs/credits/business/f8896/index.ts";
import { f8912 } from "../nodes/inputs/credits/individual/f8912/index.ts";
import { f8978 } from "../nodes/inputs/taxes/passthrough/f8978/index.ts";
import { f8615 } from "../nodes/inputs/taxes/investments/f8615/index.ts";
import { f8611 } from "../nodes/inputs/taxes/credit-recapture/f8611/index.ts";
import { household_wages } from "../nodes/inputs/income/wages/household_wages/index.ts";
import { f8828 } from "../nodes/inputs/taxes/credit-recapture/f8828/index.ts";
import { f8835 } from "../nodes/inputs/credits/business/f8835/index.ts";
import { f8844 } from "../nodes/inputs/credits/business/f8844/index.ts";
import { f8864 } from "../nodes/inputs/credits/business/f8864/index.ts";
import { f8833 } from "../nodes/inputs/general/foreign/f8833/index.ts";
import { f8840 } from "../nodes/inputs/general/filing/f8840/index.ts";
import { f8843 } from "../nodes/inputs/general/filing/f8843/index.ts";
import { f8854 } from "../nodes/inputs/general/foreign/f8854/index.ts";
import { f8854Annual } from "../nodes/inputs/general/foreign/f8854/annual_node.ts";
import { f5471 } from "../nodes/inputs/general/foreign/f5471/index.ts";
import { f8805 } from "../nodes/inputs/payments/withholding/f8805/index.ts";
import { depletion } from "../nodes/inputs/income/business/depletion/index.ts";
import { lump_sum_ss } from "../nodes/inputs/income/retirement/lump_sum_ss/index.ts";
import { fec } from "../nodes/inputs/income/foreign/fec/index.ts";
import { qsehra } from "../nodes/inputs/credits/health/qsehra/index.ts";
import { f965 } from "../nodes/inputs/taxes/foreign/f965/index.ts";
import { ppp_forgiveness } from "../nodes/inputs/income/other/ppp_forgiveness/index.ts";
import { qbiAggregation } from "../nodes/inputs/deductions/business/qbi_aggregation/index.ts";
import { f114 } from "../nodes/inputs/general/filing/f114/index.ts";
import { schedule_b_part_iii } from "../nodes/inputs/general/foreign/schedule_b_part_iii/index.ts";
import { f8594 } from "../nodes/inputs/general/disclosures/f8594/index.ts";
import { f8903 } from "../nodes/inputs/deductions/business/f8903/index.ts";
import { f14039 } from "../nodes/inputs/general/filing/f14039/index.ts";
import { f911 } from "../nodes/inputs/general/filing/f911/index.ts";
import { f843 } from "../nodes/inputs/payments/disputes/f843/index.ts";
import { f56 } from "../nodes/inputs/general/filing/f56/index.ts";
import { f970 } from "../nodes/inputs/income/business/f970/index.ts";
import { f3115 } from "../nodes/inputs/income/business/f3115/index.ts";
import { f8965 } from "../nodes/inputs/taxes/other/f8965/index.ts";
import { f59e } from "../nodes/inputs/deductions/business/f59e/index.ts";
import { f1040es } from "../nodes/inputs/payments/estimated/f1040es/index.ts";
import { f4970 } from "../nodes/inputs/taxes/other/f4970/index.ts";
import { f8697 } from "../nodes/inputs/taxes/interest/f8697/index.ts";
import { f8858 } from "../nodes/inputs/general/foreign/f8858/index.ts";
import { f8866 } from "../nodes/inputs/taxes/interest/f8866/index.ts";
import { f1098e } from "../nodes/inputs/adjustments/education/f1098e/index.ts";
import { educator_expenses } from "../nodes/inputs/adjustments/education/educator_expenses/index.ts";
import { preparer } from "../nodes/inputs/general/filing/preparer/index.ts";
import { self_employed_health_insurance } from "../nodes/inputs/adjustments/health/self_employed_health_insurance/index.ts";

// ── Intermediates ─────────────────────────────────────────────────────────────
import { eitc } from "../nodes/intermediate/forms/credits/earned-income/eitc/index.ts";
import { form8962 } from "../nodes/intermediate/forms/credits/health/form8962/index.ts";
import { form2441 } from "../nodes/intermediate/forms/credits/individual/form2441/index.ts";
import { form2555 } from "../nodes/intermediate/forms/income/foreign/form2555/index.ts";
import { form4137 } from "../nodes/intermediate/forms/taxes/employment/form4137/index.ts";
import { form4562 } from "../nodes/intermediate/forms/deductions/business/form4562/index.ts";
import { form461 } from "../nodes/intermediate/forms/income/business/form461/index.ts";
import { form4952 } from "../nodes/intermediate/forms/deductions/investments/form4952/index.ts";
import { form4684 } from "../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";
import { form4797 } from "../nodes/intermediate/forms/income/business/form4797/index.ts";
import { form8824 } from "../nodes/intermediate/forms/income/business/form8824/index.ts";
import { form4972Elections } from "../nodes/intermediate/forms/taxes/retirement/form4972/elections.ts";
import { form5329 } from "../nodes/intermediate/forms/taxes/retirement/form5329/index.ts";
import { form5695 } from "../nodes/intermediate/forms/credits/individual/form5695/index.ts";
import { jointOccupancyStatementNode } from "../nodes/intermediate/forms/general/filing/joint_occupancy_statement/index.ts";
import { form6198 } from "../nodes/intermediate/forms/income/business/form6198/index.ts";
import { form6251 } from "../nodes/intermediate/forms/taxes/amt/form6251/index.ts";
import { form6252 } from "../nodes/intermediate/forms/income/investments/form6252/index.ts";
import { form8615 } from "../nodes/intermediate/forms/taxes/investments/form8615/index.ts";
import { form6781 } from "../nodes/intermediate/forms/income/investments/form6781/index.ts";
import { form8582 } from "../nodes/intermediate/forms/income/business/form8582/index.ts";
import { form8582cr } from "../nodes/intermediate/forms/credits/business/form8582cr/index.ts";
import { disabledAccessLimit } from "../nodes/intermediate/forms/credits/business/disabled_access_limit/index.ts";
import { form8606 } from "../nodes/intermediate/forms/income/retirement/form8606/index.ts";
import { form8396 } from "../nodes/intermediate/forms/credits/individual/form8396/index.ts";
import { form8815 } from "../nodes/intermediate/forms/income/investments/form8815/index.ts";
import { form8839 } from "../nodes/intermediate/forms/credits/individual/form8839/index.ts";
import { form8853 } from "../nodes/intermediate/forms/adjustments/health/form8853/index.ts";
import { form8880 } from "../nodes/intermediate/forms/credits/individual/form8880/index.ts";
import { form7203 } from "../nodes/intermediate/forms/income/business/form7203/index.ts";
import { form7206 } from "../nodes/intermediate/forms/adjustments/health/form7206/index.ts";
import { form8889 } from "../nodes/intermediate/forms/adjustments/health/form8889/index.ts";
import { form8919 } from "../nodes/intermediate/forms/taxes/employment/form8919/index.ts";
import { form8949 } from "../nodes/intermediate/forms/income/investments/form8949/index.ts";
import { form8959 } from "../nodes/intermediate/forms/taxes/employment/form8959/index.ts";
import { form8960 } from "../nodes/intermediate/forms/taxes/investments/form8960/index.ts";
import { form8990 } from "../nodes/intermediate/forms/deductions/business/form8990/index.ts";
import { form8995 } from "../nodes/intermediate/forms/deductions/business/form8995/index.ts";
import {
  form8995a,
  form8995aScheduleA,
  form8995aScheduleC,
  form8995aScheduleD,
} from "../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { form982 } from "../nodes/intermediate/forms/income/other/form982/index.ts";
import { form_1116 } from "../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { form_8829 } from "../nodes/intermediate/forms/deductions/business/form_8829/index.ts";
import { ira_deduction_worksheet } from "../nodes/intermediate/worksheets/adjustments/retirement/ira_deduction_worksheet/index.ts";
import { rate_28_gain_worksheet } from "../nodes/intermediate/worksheets/taxes/calculation/rate_28_gain_worksheet/index.ts";
import { schedule2 } from "../nodes/intermediate/aggregation/taxes/other/schedule2/index.ts";
import { schedule3 } from "../nodes/intermediate/aggregation/general/return-assembly/schedule3/index.ts";
import { schedule_b } from "../nodes/intermediate/aggregation/income/investments/schedule_b/index.ts";
import { schedule_d } from "../nodes/intermediate/aggregation/income/investments/schedule_d/index.ts";
import { schedule_d_final } from "../nodes/intermediate/aggregation/income/investments/schedule_d_final/index.ts";
import { schedule_f } from "../nodes/intermediate/forms/income/business/schedule_f/index.ts";
import { schedule_h } from "../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";
import { schedule_se } from "../nodes/intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import { unrecaptured_1250_worksheet } from "../nodes/intermediate/worksheets/taxes/calculation/unrecaptured_1250_worksheet/index.ts";
import { agi_aggregator } from "../nodes/intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { agi_final } from "../nodes/intermediate/aggregation/general/return-assembly/agi_final/index.ts";
import { income_tax_calculation } from "../nodes/intermediate/worksheets/taxes/calculation/income_tax_calculation/index.ts";
import { form8978_reporting_year } from "../nodes/intermediate/worksheets/taxes/passthrough/form8978_reporting_year/index.ts";
import { qdcgtw } from "../nodes/intermediate/worksheets/taxes/calculation/qdcgtw/index.ts";
import { standard_deduction } from "../nodes/intermediate/worksheets/deductions/standard/standard_deduction/index.ts";
import { schedule1a } from "../nodes/intermediate/forms/deductions/additional/schedule1a/index.ts";

import { alimony_received } from "../nodes/inputs/income/other/alimony_received/index.ts";

// ── Outputs ───────────────────────────────────────────────────────────────────
import { f1040 } from "../nodes/outputs/general/return-assembly/f1040/index.ts";
import { schedule1 } from "../nodes/outputs/general/return-assembly/schedule1/index.ts";

const start = buildStartNode(inputNodes);

export const registry: NodeRegistry = {
  // ── Start ──────────────────────────────────────────────────────────────────
  start,

  // ── Inputs ─────────────────────────────────────────────────────────────────
  ext,
  f1098,
  mortgage_refinance_points,
  f1099b,
  f1099c,
  f1099div,
  f1099g,
  f1099int,
  f1099k,
  f1099oid,
  f1099m,
  f1099nec,
  f1099r,
  f1095a,
  f4835,
  f2441,
  f8812,
  f8863,
  education_income,
  f8949: f8949InputNode,
  general,
  form1116_review,
  form1116_carryover_review,
  form1116_prior_carryover,
  form8582_prior_year_record,
  k1_trust,
  k1_s_corp: k1SCorpNode,
  k1_partnership: k1Partnership,
  schedule_a: scheduleA,
  schedule_c: scheduleC,
  schedule_e: scheduleE,
  personal_property_rental,
  rrb1099r,
  ssa1099,
  w2,
  ct2,
  w2g,
  f1099patr,
  f8283,
  f7217,
  f9465,
  f8888,
  schedule_r,
  schedule_lep,
  f8886,
  f9000,
  f4547,
  payment_request,
  amendment_request,
  benefit_1042s,
  f2210,
  f2210f,
  f3903,
  f5695,
  f8936,
  f8862,
  f8958,
  f8994,
  f8814,
  f8379,
  f8938,
  f5884,
  f6478,
  f6765,
  f7207,
  f8881,
  f8882,
  f8908,
  f8941,
  f8834,
  f8874,
  f8874_recapture,
  f453a_interest,
  f8911,
  f8826,
  f4136,
  f3468,
  f4255,
  f8801,
  f8332,
  f8822,
  f1310,
  f2439,
  f3921,
  f8997,
  schedule_j,
  schedule_j_calculation,
  f8609,
  f4852,
  sep_retirement,
  clergy,
  f8915f,
  f8915d,
  f3800,
  form3800_current_orphan_allocation: currentOrphanAllocationNode,
  f2106,
  f5405,
  nol_carryforward,
  ltc_premium,
  sales_tax_deduction,
  auto_expense,
  f8917,
  f8867,
  f8859,
  f8820,
  f8896,
  f8912,
  f8978,
  f8615,
  f8611,
  f8082,
  f8873,
  f8288,
  f8621,
  household_wages,
  f8828,
  f8835,
  f8844,
  f8864,
  f8833,
  f8840,
  f8843,
  f8854,
  f8854Annual,
  f5471,
  f8805,
  fec,
  qsehra,
  f965,
  ppp_forgiveness,
  depletion,
  lump_sum_ss,
  qbi_aggregation: qbiAggregation,
  qbi_patron: qbiPatron,
  f114,
  schedule_b_part_iii,
  f8594,
  f8903,
  f14039,
  f911,
  f843,
  f56,
  f970,
  f3115,
  f8965,
  f59e,
  f1040es,
  f4970,
  f8697,
  f8858,
  f8866,
  f1098e,
  educator_expenses,
  preparer,
  self_employed_health_insurance,

  // ── Intermediates ───────────────────────────────────────────────────────────
  eitc,
  form8962,
  form2441,
  form2555,
  form4137,
  form4562,
  form461,
  form4684,
  form4952,
  form4797,
  form8824,
  form4972: form4972Elections,
  form5329,
  form5695,
  jointOccupancyStatementNode,
  form6198,
  form6251,
  form6252,
  form6781,
  form8615,
  form8582,
  disabled_access_limit: disabledAccessLimit,
  form8582cr,
  form8606,
  form8396,
  form8815,
  form8839,
  form8853,
  form8880,
  form7203,
  form7206,
  form8889,
  form8919,
  form8949,
  form8959,
  form8960,
  form8990,
  form8995,
  form8995a,
  form8995aScheduleA,
  form8995aScheduleC,
  form8995aScheduleD,
  form982,
  form_1116,
  form_8829,
  ira_deduction_worksheet,
  rate_28_gain_worksheet,
  schedule2,
  schedule3,
  schedule_b,
  schedule_d,
  schedule_d_final,
  schedule_f,
  schedule_h,
  schedule_se,
  unrecaptured_1250_worksheet,
  agi_aggregator,
  agi_final,
  income_tax_calculation,
  form8978_reporting_year,
  qdcgtw,
  standard_deduction,
  schedule1a,

  alimony_received,

  // ── Outputs ─────────────────────────────────────────────────────────────────
  f1040,
  schedule1,
};
