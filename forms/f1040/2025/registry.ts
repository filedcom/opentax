import type { NodeRegistry } from "../../../core/types/node-registry.ts";
import { buildStartNode, inputNodes } from "./start.ts";

// ── Inputs ────────────────────────────────────────────────────────────────────
import { ext } from "../nodes/inputs/ext/index.ts";
import { f1098 } from "../nodes/inputs/f1098/index.ts";
import { f1099b } from "../nodes/inputs/f1099b/index.ts";
import { f1099c } from "../nodes/inputs/f1099c/index.ts";
import { f1099div } from "../nodes/inputs/f1099div/index.ts";
import { f1099g } from "../nodes/inputs/f1099g/index.ts";
import { f1099int } from "../nodes/inputs/f1099int/index.ts";
import { f1099k } from "../nodes/inputs/f1099k/index.ts";
import { f1099oid } from "../nodes/inputs/f1099oid/index.ts";
import { f1099m } from "../nodes/inputs/f1099m/index.ts";
import { f1099nec } from "../nodes/inputs/f1099nec/index.ts";
import { f1099r } from "../nodes/inputs/f1099r/index.ts";
import { f1095a } from "../nodes/inputs/f1095a/index.ts";
import { f4835 } from "../nodes/inputs/f4835/index.ts";
import { f2441 } from "../nodes/inputs/f2441/index.ts";
import { f8812 } from "../nodes/inputs/f8812/index.ts";
import { f8863 } from "../nodes/inputs/f8863/index.ts";
import { f8949 as f8949InputNode } from "../nodes/inputs/f8949/index.ts";
import { general } from "../nodes/inputs/general/index.ts";
import { k1_trust } from "../nodes/inputs/k1_trust/index.ts";
import { k1SCorpNode } from "../nodes/inputs/k1_s_corp/index.ts";
import { k1Partnership } from "../nodes/inputs/k1_partnership/index.ts";
import { scheduleA } from "../nodes/inputs/schedule_a/index.ts";
import { scheduleC } from "../nodes/inputs/schedule_c/index.ts";
import { scheduleE } from "../nodes/inputs/schedule_e/index.ts";
import { rrb1099r } from "../nodes/inputs/rrb1099r/index.ts";
import { ssa1099 } from "../nodes/inputs/ssa1099/index.ts";
import { w2 } from "../nodes/inputs/w2/index.ts";
import { w2g } from "../nodes/inputs/w2g/index.ts";
import { f1099patr } from "../nodes/inputs/f1099patr/index.ts";
import { f8283 } from "../nodes/inputs/f8283/index.ts";
import { f9465 } from "../nodes/inputs/f9465/index.ts";
import { f8888 } from "../nodes/inputs/f8888/index.ts";
import { schedule_r } from "../nodes/inputs/schedule_r/index.ts";
import { f2210 } from "../nodes/inputs/f2210/index.ts";
import { f3903 } from "../nodes/inputs/f3903/index.ts";
import { f5695 } from "../nodes/inputs/f5695/index.ts";
import { f8936 } from "../nodes/inputs/f8936/index.ts";
import { f8862 } from "../nodes/inputs/f8862/index.ts";
import { f8958 } from "../nodes/inputs/f8958/index.ts";
import { f8994 } from "../nodes/inputs/f8994/index.ts";
import { f8814 } from "../nodes/inputs/f8814/index.ts";
import { f8379 } from "../nodes/inputs/f8379/index.ts";
import { f8938 } from "../nodes/inputs/f8938/index.ts";
import { f5884 } from "../nodes/inputs/f5884/index.ts";
import { f6478 } from "../nodes/inputs/f6478/index.ts";
import { f6765 } from "../nodes/inputs/f6765/index.ts";
import { f7207 } from "../nodes/inputs/f7207/index.ts";
import { f8881 } from "../nodes/inputs/f8881/index.ts";
import { f8882 } from "../nodes/inputs/f8882/index.ts";
import { f8908 } from "../nodes/inputs/f8908/index.ts";
import { f8941 } from "../nodes/inputs/f8941/index.ts";
import { f8834 } from "../nodes/inputs/f8834/index.ts";
import { f8874 } from "../nodes/inputs/f8874/index.ts";
import { f8911 } from "../nodes/inputs/f8911/index.ts";
import { f8826 } from "../nodes/inputs/f8826/index.ts";
import { f4136 } from "../nodes/inputs/f4136/index.ts";
import { f3468 } from "../nodes/inputs/f3468/index.ts";
import { f4255 } from "../nodes/inputs/f4255/index.ts";
import { f8801 } from "../nodes/inputs/f8801/index.ts";
import { f8332 } from "../nodes/inputs/f8332/index.ts";
import { f8822 } from "../nodes/inputs/f8822/index.ts";
import { f1310 } from "../nodes/inputs/f1310/index.ts";
import { f2439 } from "../nodes/inputs/f2439/index.ts";
import { f8997 } from "../nodes/inputs/f8997/index.ts";
import { schedule_j } from "../nodes/inputs/schedule_j/index.ts";
import { f8609 } from "../nodes/inputs/f8609/index.ts";
import { f4852 } from "../nodes/inputs/f4852/index.ts";
import { clergy } from "../nodes/inputs/clergy/index.ts";
import { f8915f } from "../nodes/inputs/f8915f/index.ts";
import { f8915d } from "../nodes/inputs/f8915d/index.ts";
import { sep_retirement } from "../nodes/inputs/sep_retirement/index.ts";
import { f3800 } from "../nodes/inputs/f3800/index.ts";
import { f2106 } from "../nodes/inputs/f2106/index.ts";
import { f5405 } from "../nodes/inputs/f5405/index.ts";
import { ltc_premium } from "../nodes/inputs/ltc_premium/index.ts";
import { sales_tax_deduction } from "../nodes/inputs/sales_tax_deduction/index.ts";
import { auto_expense } from "../nodes/inputs/auto_expense/index.ts";
import { nol_carryforward } from "../nodes/inputs/nol_carryforward/index.ts";
import { f8082 } from "../nodes/inputs/f8082/index.ts";
import { f8873 } from "../nodes/inputs/f8873/index.ts";
import { f8288 } from "../nodes/inputs/f8288/index.ts";
import { f8621 } from "../nodes/inputs/f8621/index.ts";
import { f8917 } from "../nodes/inputs/f8917/index.ts";
import { f8867 } from "../nodes/inputs/f8867/index.ts";
import { f8859 } from "../nodes/inputs/f8859/index.ts";
import { f8820 } from "../nodes/inputs/f8820/index.ts";
import { f8896 } from "../nodes/inputs/f8896/index.ts";
import { f8912 } from "../nodes/inputs/f8912/index.ts";
import { f8978 } from "../nodes/inputs/f8978/index.ts";
import { f8611 } from "../nodes/inputs/f8611/index.ts";
import { household_wages } from "../nodes/inputs/household_wages/index.ts";
import { f8828 } from "../nodes/inputs/f8828/index.ts";
import { f8835 } from "../nodes/inputs/f8835/index.ts";
import { f8844 } from "../nodes/inputs/f8844/index.ts";
import { f8864 } from "../nodes/inputs/f8864/index.ts";
import { f8833 } from "../nodes/inputs/f8833/index.ts";
import { f8840 } from "../nodes/inputs/f8840/index.ts";
import { f8843 } from "../nodes/inputs/f8843/index.ts";
import { f8854 } from "../nodes/inputs/f8854/index.ts";
import { f5471 } from "../nodes/inputs/f5471/index.ts";
import { f8805 } from "../nodes/inputs/f8805/index.ts";
import { depletion } from "../nodes/inputs/depletion/index.ts";
import { lump_sum_ss } from "../nodes/inputs/lump_sum_ss/index.ts";
import { fec } from "../nodes/inputs/fec/index.ts";
import { qsehra } from "../nodes/inputs/qsehra/index.ts";
import { f965 } from "../nodes/inputs/f965/index.ts";
import { ppp_forgiveness } from "../nodes/inputs/ppp_forgiveness/index.ts";
import { qbiAggregation } from "../nodes/inputs/qbi_aggregation/index.ts";
import { f114 } from "../nodes/inputs/f114/index.ts";
import { f8594 } from "../nodes/inputs/f8594/index.ts";
import { f8903 } from "../nodes/inputs/f8903/index.ts";
import { f14039 } from "../nodes/inputs/f14039/index.ts";
import { f911 } from "../nodes/inputs/f911/index.ts";
import { f843 } from "../nodes/inputs/f843/index.ts";
import { f56 } from "../nodes/inputs/f56/index.ts";
import { f970 } from "../nodes/inputs/f970/index.ts";
import { f3115 } from "../nodes/inputs/f3115/index.ts";
import { f8965 } from "../nodes/inputs/f8965/index.ts";
import { f59e } from "../nodes/inputs/f59e/index.ts";
import { f1040es } from "../nodes/inputs/f1040es/index.ts";

// ── Intermediates ─────────────────────────────────────────────────────────────
import { eitc } from "../nodes/intermediate/forms/eitc/index.ts";
import { form8962 } from "../nodes/intermediate/forms/form8962/index.ts";
import { form2441 } from "../nodes/intermediate/forms/form2441/index.ts";
import { form2555 } from "../nodes/intermediate/forms/form2555/index.ts";
import { form4137 } from "../nodes/intermediate/forms/form4137/index.ts";
import { form4562 } from "../nodes/intermediate/forms/form4562/index.ts";
import { form461 } from "../nodes/intermediate/forms/form461/index.ts";
import { form4952 } from "../nodes/intermediate/forms/form4952/index.ts";
import { form4684 } from "../nodes/intermediate/forms/form4684/index.ts";
import { form4797 } from "../nodes/intermediate/forms/form4797/index.ts";
import { form8824 } from "../nodes/intermediate/forms/form8824/index.ts";
import { form4972 } from "../nodes/intermediate/forms/form4972/index.ts";
import { form5329 } from "../nodes/intermediate/forms/form5329/index.ts";
import { form5695 } from "../nodes/intermediate/forms/form5695/index.ts";
import { form6198 } from "../nodes/intermediate/forms/form6198/index.ts";
import { form6251 } from "../nodes/intermediate/forms/form6251/index.ts";
import { form6252 } from "../nodes/intermediate/forms/form6252/index.ts";
import { form8615 } from "../nodes/intermediate/forms/form8615/index.ts";
import { form6781 } from "../nodes/intermediate/forms/form6781/index.ts";
import { form8582 } from "../nodes/intermediate/forms/form8582/index.ts";
import { form8582cr } from "../nodes/intermediate/forms/form8582cr/index.ts";
import { form8606 } from "../nodes/intermediate/forms/form8606/index.ts";
import { form8396 } from "../nodes/intermediate/forms/form8396/index.ts";
import { form8815 } from "../nodes/intermediate/forms/form8815/index.ts";
import { form8839 } from "../nodes/intermediate/forms/form8839/index.ts";
import { form8853 } from "../nodes/intermediate/forms/form8853/index.ts";
import { form8880 } from "../nodes/intermediate/forms/form8880/index.ts";
import { form7203 } from "../nodes/intermediate/forms/form7203/index.ts";
import { form7206 } from "../nodes/intermediate/forms/form7206/index.ts";
import { form8889 } from "../nodes/intermediate/forms/form8889/index.ts";
import { form8919 } from "../nodes/intermediate/forms/form8919/index.ts";
import { form8949 } from "../nodes/intermediate/forms/form8949/index.ts";
import { form8959 } from "../nodes/intermediate/forms/form8959/index.ts";
import { form8960 } from "../nodes/intermediate/forms/form8960/index.ts";
import { form8990 } from "../nodes/intermediate/forms/form8990/index.ts";
import { form8995 } from "../nodes/intermediate/forms/form8995/index.ts";
import { form8995a } from "../nodes/intermediate/forms/form8995a/index.ts";
import { form982 } from "../nodes/intermediate/forms/form982/index.ts";
import { form_1116 } from "../nodes/intermediate/forms/form_1116/index.ts";
import { form_8829 } from "../nodes/intermediate/forms/form_8829/index.ts";
import { ira_deduction_worksheet } from "../nodes/intermediate/worksheets/ira_deduction_worksheet/index.ts";
import { rate_28_gain_worksheet } from "../nodes/intermediate/worksheets/rate_28_gain_worksheet/index.ts";
import { schedule2 } from "../nodes/intermediate/aggregation/schedule2/index.ts";
import { schedule3 } from "../nodes/intermediate/aggregation/schedule3/index.ts";
import { schedule_b } from "../nodes/intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../nodes/intermediate/aggregation/schedule_d/index.ts";
import { schedule_f } from "../nodes/intermediate/forms/schedule_f/index.ts";
import { schedule_h } from "../nodes/intermediate/forms/schedule_h/index.ts";
import { schedule_se } from "../nodes/intermediate/forms/schedule_se/index.ts";
import { unrecaptured_1250_worksheet } from "../nodes/intermediate/worksheets/unrecaptured_1250_worksheet/index.ts";
import { agi_aggregator } from "../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { income_tax_calculation } from "../nodes/intermediate/worksheets/income_tax_calculation/index.ts";
import { qdcgtw } from "../nodes/intermediate/worksheets/qdcgtw/index.ts";
import { standard_deduction } from "../nodes/intermediate/worksheets/standard_deduction/index.ts";

// ── Outputs ───────────────────────────────────────────────────────────────────
import { f1040 } from "../nodes/outputs/f1040/index.ts";
import { schedule1 } from "../nodes/outputs/schedule1/index.ts";

const start = buildStartNode(inputNodes);

export const registry: NodeRegistry = {
  // ── Start ──────────────────────────────────────────────────────────────────
  start,

  // ── Inputs ─────────────────────────────────────────────────────────────────
  ext,
  f1098,
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
  f8949: f8949InputNode,
  general,
  k1_trust,
  k1_s_corp: k1SCorpNode,
  k1_partnership: k1Partnership,
  schedule_a: scheduleA,
  schedule_c: scheduleC,
  schedule_e: scheduleE,
  rrb1099r,
  ssa1099,
  w2,
  w2g,
  f1099patr,
  f8283,
  f9465,
  f8888,
  schedule_r,
  f2210,
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
  f8997,
  schedule_j,
  f8609,
  f4852,
  sep_retirement,
  clergy,
  f8915f,
  f8915d,
  f3800,
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
  f5471,
  f8805,
  fec,
  qsehra,
  f965,
  ppp_forgiveness,
  depletion,
  lump_sum_ss,
  qbi_aggregation: qbiAggregation,
  f114,
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
  form4972,
  form5329,
  form5695,
  form6198,
  form6251,
  form6252,
  form6781,
  form8615,
  form8582,
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
  form982,
  form_1116,
  form_8829,
  ira_deduction_worksheet,
  rate_28_gain_worksheet,
  schedule2,
  schedule3,
  schedule_b,
  schedule_d,
  schedule_f,
  schedule_h,
  schedule_se,
  unrecaptured_1250_worksheet,
  agi_aggregator,
  income_tax_calculation,
  qdcgtw,
  standard_deduction,

  // ── Outputs ─────────────────────────────────────────────────────────────────
  f1040,
  schedule1,
};
