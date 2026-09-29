import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import { z } from "zod";
import { form4797 } from "../nodes/intermediate/forms/form4797/index.ts";
import { investment1245DispositionSchema } from "../nodes/intermediate/forms/form4797/investment_1245.ts";
import {
  form4562,
  publicInputSchema as form4562InputSchema,
} from "../nodes/intermediate/forms/form4562/index.ts";
import {
  form1116_prior_carryover,
  inputSchema as form1116PriorCarryoverInputSchema,
} from "../nodes/inputs/form1116_prior_carryover/index.ts";
import {
  form1116_carryover_review,
  inputSchema as form1116CarryoverReviewInputSchema,
} from "../nodes/inputs/form1116_carryover_review/index.ts";
import {
  form1116_review,
  inputSchema as form1116ReviewInputSchema,
} from "../nodes/inputs/form1116_review/index.ts";
import {
  form1116_schedule_c_source,
  inputSchema as form1116ScheduleCSourceInputSchema,
} from "../nodes/inputs/form1116_schedule_c_source/index.ts";
import {
  ext,
  inputSchema as extInputSchema,
} from "../nodes/inputs/ext/index.ts";
import {
  f1098,
  itemSchema as f1098ItemSchema,
} from "../nodes/inputs/f1098/index.ts";
import {
  f1098e,
  itemSchema as f1098eItemSchema,
} from "../nodes/inputs/f1098e/index.ts";
import {
  f1099b,
  itemSchema as f1099bItemSchema,
} from "../nodes/inputs/f1099b/index.ts";
import {
  f1099c,
  itemSchema as f1099cItemSchema,
} from "../nodes/inputs/f1099c/index.ts";
import {
  f1099div,
  itemSchema as f1099divItemSchema,
} from "../nodes/inputs/f1099div/index.ts";
import {
  f1099g,
  itemSchema as f1099gItemSchema,
} from "../nodes/inputs/f1099g/index.ts";
import {
  f1099int,
  itemSchema as f1099intItemSchema,
} from "../nodes/inputs/f1099int/index.ts";
import {
  f1099k,
  itemSchema as f1099kItemSchema,
} from "../nodes/inputs/f1099k/index.ts";
import {
  f1099oid,
  itemSchema as f1099oidItemSchema,
} from "../nodes/inputs/f1099oid/index.ts";
import {
  f1099m,
  itemSchema as f1099mItemSchema,
} from "../nodes/inputs/f1099m/index.ts";
import {
  f1099nec,
  itemSchema as f1099necItemSchema,
} from "../nodes/inputs/f1099nec/index.ts";
import {
  f1099r,
  itemSchema as f1099rItemSchema,
} from "../nodes/inputs/f1099r/index.ts";
import {
  itemSchema as rrb1099rItemSchema,
  rrb1099r,
} from "../nodes/inputs/rrb1099r/index.ts";
import {
  f1095a,
  itemSchema as f1095aItemSchema,
} from "../nodes/inputs/f1095a/index.ts";
import {
  f4835,
  itemSchema as f4835ItemSchema,
} from "../nodes/inputs/f4835/index.ts";
import {
  f2441,
  itemSchema as f2441ItemSchema,
} from "../nodes/inputs/f2441/index.ts";
import {
  f8812,
  itemSchema as f8812ItemSchema,
} from "../nodes/inputs/f8812/index.ts";
import {
  f8863,
  itemSchema as f8863ItemSchema,
} from "../nodes/inputs/f8863/index.ts";
import {
  f8949,
  itemSchema as f8949ItemSchema,
} from "../nodes/inputs/f8949/index.ts";
import {
  general,
  inputSchema as generalInputSchema,
} from "../nodes/inputs/general/index.ts";
import {
  itemSchema as k1TrustItemSchema,
  k1_trust,
} from "../nodes/inputs/k1_trust/index.ts";
import {
  itemSchema as k1SCorpItemSchema,
  k1SCorpNode,
} from "../nodes/inputs/k1_s_corp/index.ts";
import {
  itemSchema as k1PartnershipItemSchema,
  k1Partnership,
} from "../nodes/inputs/k1_partnership/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../nodes/inputs/schedule_a/index.ts";
import {
  itemSchema as scheduleCItemSchema,
  scheduleC,
} from "../nodes/inputs/schedule_c/index.ts";
import {
  itemSchema as scheduleEItemSchema,
  scheduleE,
} from "../nodes/inputs/schedule_e/index.ts";
import {
  itemSchema as ssaItemSchema,
  ssa1099,
} from "../nodes/inputs/ssa1099/index.ts";
import { w2, w2ItemSchema } from "../nodes/inputs/w2/index.ts";
import { ct2, itemSchema as ct2ItemSchema } from "../nodes/inputs/ct2/index.ts";
import { itemSchema as w2gItemSchema, w2g } from "../nodes/inputs/w2g/index.ts";
import {
  f1099patr,
  itemSchema as f1099patrItemSchema,
} from "../nodes/inputs/f1099patr/index.ts";
import {
  f8283,
  inputSchema as f8283InputSchema,
} from "../nodes/inputs/f8283/index.ts";
import {
  f9465,
  inputSchema as f9465InputSchema,
} from "../nodes/inputs/f9465/index.ts";
import {
  f8888,
  inputSchema as f8888InputSchema,
} from "../nodes/inputs/f8888/index.ts";
import {
  inputSchema as scheduleRInputSchema,
  schedule_r,
} from "../nodes/inputs/schedule_r/index.ts";
import {
  inputSchema as scheduleLepInputSchema,
  schedule_lep,
} from "../nodes/inputs/schedule_lep/index.ts";
import {
  f2210,
  inputSchema as f2210InputSchema,
} from "../nodes/inputs/f2210/index.ts";
import {
  f2210f,
  inputSchema as f2210fInputSchema,
} from "../nodes/inputs/f2210f/index.ts";
import {
  f3903,
  itemSchema as f3903ItemSchema,
} from "../nodes/inputs/f3903/index.ts";
import {
  f5695,
  inputSchema as f5695InputSchema,
} from "../nodes/inputs/f5695/index.ts";
import {
  f8936,
  inputSchema as f8936InputSchema,
} from "../nodes/inputs/f8936/index.ts";
import {
  f8862,
  inputSchema as f8862InputSchema,
} from "../nodes/inputs/f8862/index.ts";
import {
  f8958,
  inputSchema as f8958InputSchema,
} from "../nodes/inputs/f8958/index.ts";
import {
  f8994,
  inputSchema as f8994InputSchema,
} from "../nodes/inputs/f8994/index.ts";
import {
  f8814,
  itemSchema as f8814ItemSchema,
} from "../nodes/inputs/f8814/index.ts";
import {
  inputSchema as scheduleBPartIIIInputSchema,
  schedule_b_part_iii,
} from "../nodes/inputs/schedule_b_part_iii/index.ts";
import {
  f8379,
  inputSchema as f8379InputSchema,
} from "../nodes/inputs/f8379/index.ts";
import {
  f8938,
  inputSchema as f8938InputSchema,
} from "../nodes/inputs/f8938/index.ts";
import {
  f5884,
  inputSchema as f5884InputSchema,
} from "../nodes/inputs/f5884/index.ts";
import {
  f6478,
  inputSchema as f6478InputSchema,
} from "../nodes/inputs/f6478/index.ts";
import {
  f6765,
  inputSchema as f6765InputSchema,
} from "../nodes/inputs/f6765/index.ts";
import {
  f7207,
  inputSchema as f7207InputSchema,
} from "../nodes/inputs/f7207/index.ts";
import {
  f8881,
  inputSchema as f8881InputSchema,
} from "../nodes/inputs/f8881/index.ts";
import {
  f8882,
  inputSchema as f8882InputSchema,
} from "../nodes/inputs/f8882/index.ts";
import {
  f8908,
  itemSchema as f8908ItemSchema,
} from "../nodes/inputs/f8908/index.ts";
import {
  f8941,
  inputSchema as f8941InputSchema,
} from "../nodes/inputs/f8941/index.ts";
import {
  f8834,
  itemSchema as f8834ItemSchema,
} from "../nodes/inputs/f8834/index.ts";
import {
  f8874,
  inputSchema as f8874InputSchema,
} from "../nodes/inputs/f8874/index.ts";
import {
  f8874_recapture,
  inputSchema as f8874RecaptureInputSchema,
} from "../nodes/inputs/f8874/recapture_node.ts";
import {
  f8911,
  inputSchema as f8911InputSchema,
} from "../nodes/inputs/f8911/index.ts";
import {
  f7217,
  inputSchema as f7217InputSchema,
} from "../nodes/inputs/f7217/index.ts";
import {
  f8826,
  inputSchema as f8826InputSchema,
} from "../nodes/inputs/f8826/index.ts";
import {
  f4136,
  inputSchema as f4136InputSchema,
} from "../nodes/inputs/f4136/index.ts";
import {
  f3468,
  inputSchema as f3468InputSchema,
} from "../nodes/inputs/f3468/index.ts";
import {
  f4255,
  inputSchema as f4255InputSchema,
} from "../nodes/inputs/f4255/index.ts";
import {
  f8801,
  inputSchema as f8801InputSchema,
} from "../nodes/inputs/f8801/index.ts";
import {
  f8332,
  inputSchema as f8332InputSchema,
} from "../nodes/inputs/f8332/index.ts";
import {
  f8822,
  inputSchema as f8822InputSchema,
} from "../nodes/inputs/f8822/index.ts";
import {
  f1310,
  inputSchema as f1310InputSchema,
} from "../nodes/inputs/f1310/index.ts";
import {
  f2439,
  itemSchema as f2439ItemSchema,
} from "../nodes/inputs/f2439/index.ts";
import {
  f3921,
  itemSchema as f3921ItemSchema,
} from "../nodes/inputs/f3921/index.ts";
import {
  f8997,
  inputSchema as f8997InputSchema,
} from "../nodes/inputs/f8997/index.ts";
import {
  inputSchema as scheduleJInputSchema,
  schedule_j,
} from "../nodes/inputs/schedule_j/index.ts";
import {
  f8609,
  itemSchema as f8609ItemSchema,
} from "../nodes/inputs/f8609/index.ts";
import {
  f4852,
  itemSchema as f4852ItemSchema,
} from "../nodes/inputs/f4852/index.ts";
import {
  itemSchema as sepRetirementItemSchema,
  sep_retirement,
} from "../nodes/inputs/sep_retirement/index.ts";
import {
  inputSchema as nolCarryforwardInputSchema,
  nol_carryforward,
} from "../nodes/inputs/nol_carryforward/index.ts";
import {
  clergy,
  itemSchema as clergyItemSchema,
} from "../nodes/inputs/clergy/index.ts";
import {
  f8915f,
  itemSchema as f8915fItemSchema,
} from "../nodes/inputs/f8915f/index.ts";
import {
  f8915d,
  itemSchema as f8915dItemSchema,
} from "../nodes/inputs/f8915d/index.ts";
import {
  f3800,
  itemSchema as f3800ItemSchema,
} from "../nodes/inputs/f3800/index.ts";
import {
  f2106,
  itemSchema as f2106ItemSchema,
} from "../nodes/inputs/f2106/index.ts";
import {
  f5405,
  itemSchema as f5405ItemSchema,
} from "../nodes/inputs/f5405/index.ts";
import {
  household_wages,
  itemSchema as householdWagesItemSchema,
} from "../nodes/inputs/household_wages/index.ts";
import {
  itemSchema as ltcPremiumItemSchema,
  ltc_premium,
} from "../nodes/inputs/ltc_premium/index.ts";
import {
  inputSchema as salesTaxInputSchema,
  sales_tax_deduction,
} from "../nodes/inputs/sales_tax_deduction/index.ts";
import {
  auto_expense,
  itemSchema as autoExpenseItemSchema,
} from "../nodes/inputs/auto_expense/index.ts";
import {
  inputSchema as scheduleFInputSchema,
  schedule_f,
} from "../nodes/intermediate/forms/schedule_f/index.ts";
import {
  form4137,
  inputSchema as form4137InputSchema,
} from "../nodes/intermediate/forms/form4137/index.ts";
import {
  form8919,
  inputSchema as form8919InputSchema,
} from "../nodes/intermediate/forms/form8919/index.ts";
import {
  inputSchema as form8582crInputSchema,
} from "../nodes/intermediate/forms/form8582cr/index.ts";
import { disabledAccessLimit } from "../nodes/intermediate/forms/disabled_access_limit/index.ts";
import {
  f8917,
  itemSchema as f8917ItemSchema,
} from "../nodes/inputs/f8917/index.ts";
import {
  f8867,
  itemSchema as f8867ItemSchema,
} from "../nodes/inputs/f8867/index.ts";
import {
  f8859,
  itemSchema as f8859ItemSchema,
} from "../nodes/inputs/f8859/index.ts";
import {
  f8820,
  inputSchema as f8820InputSchema,
} from "../nodes/inputs/f8820/index.ts";
import {
  f8082,
  itemSchema as f8082ItemSchema,
} from "../nodes/inputs/f8082/index.ts";
import {
  f8873,
  itemSchema as f8873ItemSchema,
} from "../nodes/inputs/f8873/index.ts";
import {
  f8288,
  itemSchema as f8288ItemSchema,
} from "../nodes/inputs/f8288/index.ts";
import {
  f8621,
  itemSchema as f8621ItemSchema,
} from "../nodes/inputs/f8621/index.ts";
import {
  f8896,
  itemSchema as f8896ItemSchema,
} from "../nodes/inputs/f8896/index.ts";
import {
  f8912,
  itemSchema as f8912ItemSchema,
} from "../nodes/inputs/f8912/index.ts";
import {
  f8978,
  inputSchema as f8978InputSchema,
} from "../nodes/inputs/f8978/index.ts";
import {
  f8615,
  inputSchema as f8615InputSchema,
} from "../nodes/inputs/f8615/index.ts";
import {
  f8611,
  itemSchema as f8611ItemSchema,
} from "../nodes/inputs/f8611/index.ts";
import {
  f8828,
  itemSchema as f8828ItemSchema,
} from "../nodes/inputs/f8828/index.ts";
import {
  f8835,
  itemSchema as f8835ItemSchema,
} from "../nodes/inputs/f8835/index.ts";
import {
  f8844,
  itemSchema as f8844ItemSchema,
} from "../nodes/inputs/f8844/index.ts";
import {
  f8864,
  inputSchema as f8864InputSchema,
} from "../nodes/inputs/f8864/index.ts";
import {
  f8833,
  itemSchema as f8833ItemSchema,
} from "../nodes/inputs/f8833/index.ts";
import {
  f8840,
  inputSchema as f8840InputSchema,
} from "../nodes/inputs/f8840/index.ts";
import {
  f8843,
  itemSchema as f8843ItemSchema,
} from "../nodes/inputs/f8843/index.ts";
import {
  f8854,
  inputSchema as f8854InputSchema,
} from "../nodes/inputs/f8854/index.ts";
import { f8854Annual } from "../nodes/inputs/f8854/annual_node.ts";
import { annualInputSchema } from "../nodes/inputs/f8854/annual.ts";
import {
  f5471,
  itemSchema as f5471ItemSchema,
} from "../nodes/inputs/f5471/index.ts";
import {
  f8805,
  itemSchema as f8805ItemSchema,
} from "../nodes/inputs/f8805/index.ts";
import { fec, itemSchema as fecItemSchema } from "../nodes/inputs/fec/index.ts";
import {
  inputSchema as qsehraInputSchema,
  qsehra,
} from "../nodes/inputs/qsehra/index.ts";
import {
  f965,
  inputSchema as f965InputSchema,
} from "../nodes/inputs/f965/index.ts";
import {
  itemSchema as pppForgivenessItemSchema,
  ppp_forgiveness,
} from "../nodes/inputs/ppp_forgiveness/index.ts";
import {
  depletion,
  itemSchema as depletionItemSchema,
} from "../nodes/inputs/depletion/index.ts";
import {
  itemSchema as lumpSumSSItemSchema,
  lump_sum_ss,
} from "../nodes/inputs/lump_sum_ss/index.ts";
import {
  inputSchema as scheduleDInputSchema,
  schedule_d,
} from "../nodes/intermediate/aggregation/schedule_d/index.ts";
import {
  f56,
  inputSchema as f56InputSchema,
} from "../nodes/inputs/f56/index.ts";
import {
  f970,
  itemSchema as f970ItemSchema,
} from "../nodes/inputs/f970/index.ts";
import {
  f3115,
  itemSchema as f3115ItemSchema,
} from "../nodes/inputs/f3115/index.ts";
import {
  f4970,
  itemSchema as f4970ItemSchema,
} from "../nodes/inputs/f4970/index.ts";
import {
  f8697,
  itemSchema as f8697ItemSchema,
} from "../nodes/inputs/f8697/index.ts";
import {
  f8866,
  itemSchema as f8866ItemSchema,
} from "../nodes/inputs/f8866/index.ts";
import {
  inputSchema as qbiAggregationInputSchema,
  qbiAggregation,
} from "../nodes/inputs/qbi_aggregation/index.ts";
import {
  f843,
  inputSchema as f843InputSchema,
} from "../nodes/inputs/f843/index.ts";
import {
  f2120,
  inputSchema as f2120InputSchema,
} from "../nodes/inputs/f2120/index.ts";
import {
  f8275,
  inputSchema as f8275InputSchema,
} from "../nodes/inputs/f8275/index.ts";
import {
  f8857,
  inputSchema as f8857InputSchema,
} from "../nodes/inputs/f8857/index.ts";

import {
  f8965,
  inputSchema as f8965InputSchema,
} from "../nodes/inputs/f8965/index.ts";
import {
  f59e,
  itemSchema as f59eItemSchema,
} from "../nodes/inputs/f59e/index.ts";
import {
  f1040es,
  inputSchema as f1040esInputSchema,
} from "../nodes/inputs/f1040es/index.ts";
import {
  educator_expenses,
  inputSchema as educatorExpensesInputSchema,
} from "../nodes/inputs/educator_expenses/index.ts";
import {
  form8889,
  inputSchema as form8889InputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import {
  inputSchema as iraDeductionWorksheetInputSchema,
  ira_deduction_worksheet,
} from "../nodes/intermediate/worksheets/ira_deduction_worksheet/index.ts";
import {
  inputSchema as preparerInputSchema,
  preparer,
} from "../nodes/inputs/preparer/index.ts";
import {
  itemSchema as sehiItemSchema,
  self_employed_health_insurance,
} from "../nodes/inputs/self_employed_health_insurance/index.ts";
import {
  inputSchema as scheduleHInputSchema,
  schedule_h,
} from "../nodes/intermediate/forms/schedule_h/index.ts";
import {
  alimony_received,
  itemSchema as alimonyReceivedItemSchema,
} from "../nodes/inputs/alimony_received/index.ts";
import {
  claimInputSchema as schedule1AClaimInputSchema,
  schedule1a,
} from "../nodes/intermediate/forms/schedule1a/index.ts";
import {
  form4684,
  inputSchema as form4684InputSchema,
} from "../nodes/intermediate/forms/form4684/index.ts";
import {
  form6252,
  itemSchema as form6252ItemSchema,
} from "../nodes/intermediate/forms/form6252/index.ts";
import {
  form8824,
  inputSchema as form8824InputSchema,
} from "../nodes/intermediate/forms/form8824/index.ts";
import {
  form6781,
  inputSchema as form6781InputSchema,
} from "../nodes/intermediate/forms/form6781/index.ts";
import {
  form5329,
  inputSchema as form5329InputSchema,
} from "../nodes/intermediate/forms/form5329/index.ts";
import {
  form4952,
  inputSchema as form4952InputSchema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import {
  form4972,
  publicElectionSchema as form4972PublicElectionSchema,
} from "../nodes/intermediate/forms/form4972/index.ts";
import {
  form8815,
  inputSchema as form8815InputSchema,
} from "../nodes/intermediate/forms/form8815/index.ts";
import {
  form7206,
  inputSchema as form7206InputSchema,
} from "../nodes/intermediate/forms/form7206/index.ts";
import {
  form_8829,
  inputSchema as form8829InputSchema,
} from "../nodes/intermediate/forms/form_8829/index.ts";
import {
  form8990,
  publicInputSchema as form8990InputSchema,
} from "../nodes/intermediate/forms/form8990/index.ts";
import {
  form8396,
  inputSchema as form8396InputSchema,
} from "../nodes/intermediate/forms/form8396/index.ts";
import {
  filingInputSchema as form2441InputSchema,
  form2441,
} from "../nodes/intermediate/forms/form2441/index.ts";
import {
  filingInputSchema as form2555InputSchema,
  form2555,
} from "../nodes/intermediate/forms/form2555/index.ts";

export const inputNodes: readonly InputNodeEntry[] = [
  // Array inputs: each item represents a single source record or form instance
  { node: w2, itemSchema: w2ItemSchema, isArray: true },
  { node: ct2, itemSchema: ct2ItemSchema, isArray: true },
  { node: f1099int, itemSchema: f1099intItemSchema, isArray: true },
  { node: f1099oid, itemSchema: f1099oidItemSchema, isArray: true },
  { node: f1099div, itemSchema: f1099divItemSchema, isArray: true },
  { node: f1099nec, itemSchema: f1099necItemSchema, isArray: true },
  { node: f1099g, itemSchema: f1099gItemSchema, isArray: true },
  { node: f1099m, itemSchema: f1099mItemSchema, isArray: true },
  { node: f1099c, itemSchema: f1099cItemSchema, isArray: true },
  { node: f1099k, itemSchema: f1099kItemSchema, isArray: true },
  { node: f1099b, itemSchema: f1099bItemSchema, isArray: true },
  { node: f1099r, itemSchema: f1099rItemSchema, isArray: true },
  { node: f1098, itemSchema: f1098ItemSchema, isArray: true },
  { node: f1098e, itemSchema: f1098eItemSchema, isArray: true },
  { node: f4835, itemSchema: f4835ItemSchema, isArray: true },
  { node: form6252, itemSchema: form6252ItemSchema, isArray: true },
  { node: f2441, itemSchema: f2441ItemSchema, isArray: true },
  { node: f8812, itemSchema: f8812ItemSchema, isArray: true },
  { node: f8863, itemSchema: f8863ItemSchema, isArray: true },
  { node: f8949, itemSchema: f8949ItemSchema, isArray: true },
  { node: scheduleC, itemSchema: scheduleCItemSchema, isArray: true },
  { node: scheduleE, itemSchema: scheduleEItemSchema, isArray: true },
  { node: rrb1099r, itemSchema: rrb1099rItemSchema, isArray: true },
  { node: ssa1099, itemSchema: ssaItemSchema, isArray: true },
  { node: f1095a, itemSchema: f1095aItemSchema, isArray: true },
  { node: k1_trust, itemSchema: k1TrustItemSchema, isArray: true },
  { node: k1SCorpNode, itemSchema: k1SCorpItemSchema, isArray: true },
  { node: k1Partnership, itemSchema: k1PartnershipItemSchema, isArray: true },
  { node: w2g, itemSchema: w2gItemSchema, isArray: true },
  { node: f1099patr, itemSchema: f1099patrItemSchema, isArray: true },
  { node: f3903, itemSchema: f3903ItemSchema, isArray: true },
  { node: f8814, itemSchema: f8814ItemSchema, isArray: true },
  { node: f5884, inputSchema: f5884InputSchema, isArray: false },
  { node: f8908, itemSchema: f8908ItemSchema, isArray: true },
  { node: f8609, itemSchema: f8609ItemSchema, isArray: true },
  { node: f4852, itemSchema: f4852ItemSchema, isArray: true },
  { node: sep_retirement, itemSchema: sepRetirementItemSchema, isArray: true },
  // Singleton inputs: entire form as a single object
  {
    node: schedule_b_part_iii,
    inputSchema: scheduleBPartIIIInputSchema,
    isArray: false,
  },
  { node: form2441, inputSchema: form2441InputSchema, isArray: false },
  { node: form2555, inputSchema: form2555InputSchema, isArray: false },
  { node: scheduleA, inputSchema: scheduleAInputSchema, isArray: false },
  { node: schedule_d, inputSchema: scheduleDInputSchema, isArray: false },
  { node: ext, inputSchema: extInputSchema, isArray: false },
  { node: general, inputSchema: generalInputSchema, isArray: false },
  { node: form4562, inputSchema: form4562InputSchema, isArray: false },
  {
    node: form4797,
    inputKey: "form4797_investment_1245",
    inputSchema: z.object({
      investment_1245_dispositions: z.array(investment1245DispositionSchema)
        .min(1).max(4),
    }).strict(),
    isArray: false,
  },
  {
    node: form1116_review,
    inputSchema: form1116ReviewInputSchema,
    isArray: false,
  },
  {
    node: form1116_carryover_review,
    inputSchema: form1116CarryoverReviewInputSchema,
    isArray: false,
  },
  {
    node: form1116_prior_carryover,
    inputSchema: form1116PriorCarryoverInputSchema,
    isArray: false,
  },
  {
    node: form1116_schedule_c_source,
    inputSchema: form1116ScheduleCSourceInputSchema,
    isArray: false,
  },
  { node: schedule1a, inputSchema: schedule1AClaimInputSchema, isArray: false },
  { node: form4684, inputSchema: form4684InputSchema, isArray: false },
  { node: form8824, inputSchema: form8824InputSchema, isArray: false },
  { node: form6781, inputSchema: form6781InputSchema, isArray: false },
  { node: form5329, inputSchema: form5329InputSchema, isArray: false },
  {
    node: form4972,
    inputSchema: form4972PublicElectionSchema,
    isArray: false,
  },
  { node: form4952, inputSchema: form4952InputSchema, isArray: false },
  { node: form8815, inputSchema: form8815InputSchema, isArray: false },
  { node: form7206, inputSchema: form7206InputSchema, isArray: false },
  { node: form_8829, inputSchema: form8829InputSchema, isArray: false },
  { node: form8990, inputSchema: form8990InputSchema, isArray: false },
  { node: form8396, inputSchema: form8396InputSchema, isArray: false },
  { node: f8283, inputSchema: f8283InputSchema, isArray: false },
  { node: f8936, inputSchema: f8936InputSchema, isArray: false },
  { node: f9465, inputSchema: f9465InputSchema, isArray: false },
  { node: f8888, inputSchema: f8888InputSchema, isArray: false },
  { node: schedule_r, inputSchema: scheduleRInputSchema, isArray: false },
  { node: schedule_lep, inputSchema: scheduleLepInputSchema, isArray: false },
  { node: f2210, inputSchema: f2210InputSchema, isArray: false },
  { node: f2210f, inputSchema: f2210fInputSchema, isArray: false },
  { node: f5695, inputSchema: f5695InputSchema, isArray: false },
  { node: f8862, inputSchema: f8862InputSchema, isArray: false },
  { node: f8958, inputSchema: f8958InputSchema, isArray: false },
  { node: f8994, inputSchema: f8994InputSchema, isArray: false },
  { node: f8379, inputSchema: f8379InputSchema, isArray: false },
  { node: f8938, inputSchema: f8938InputSchema, isArray: false },
  { node: f6478, inputSchema: f6478InputSchema, isArray: false },
  { node: f6765, inputSchema: f6765InputSchema, isArray: false },
  { node: f7207, inputSchema: f7207InputSchema, isArray: false },
  { node: f8881, inputSchema: f8881InputSchema, isArray: false },
  { node: f8882, inputSchema: f8882InputSchema, isArray: false },
  { node: f8941, inputSchema: f8941InputSchema, isArray: false },
  { node: f8834, itemSchema: f8834ItemSchema, isArray: true },
  { node: f8874, inputSchema: f8874InputSchema, isArray: false },
  {
    node: f8874_recapture,
    inputSchema: f8874RecaptureInputSchema,
    isArray: false,
  },
  { node: f8911, inputSchema: f8911InputSchema, isArray: false },
  { node: f7217, inputSchema: f7217InputSchema, isArray: false },
  { node: f8826, inputSchema: f8826InputSchema, isArray: false },
  { node: f4136, inputSchema: f4136InputSchema, isArray: false },
  { node: f3468, inputSchema: f3468InputSchema, isArray: false },
  { node: f4255, inputSchema: f4255InputSchema, isArray: false },
  { node: f2439, itemSchema: f2439ItemSchema, isArray: true },
  { node: f3921, itemSchema: f3921ItemSchema, isArray: true },
  { node: f8801, inputSchema: f8801InputSchema, isArray: false },
  { node: f8332, inputSchema: f8332InputSchema, isArray: false },
  { node: f8822, inputSchema: f8822InputSchema, isArray: false },
  { node: f1310, inputSchema: f1310InputSchema, isArray: false },
  { node: f8997, inputSchema: f8997InputSchema, isArray: false },
  { node: schedule_j, inputSchema: scheduleJInputSchema, isArray: false },
  { node: clergy, itemSchema: clergyItemSchema, isArray: true },
  { node: f8915f, itemSchema: f8915fItemSchema, isArray: true },
  { node: f8915d, itemSchema: f8915dItemSchema, isArray: true },
  { node: f3800, itemSchema: f3800ItemSchema, isArray: true },
  { node: f2106, itemSchema: f2106ItemSchema, isArray: true },
  { node: f5405, itemSchema: f5405ItemSchema, isArray: true },
  {
    node: nol_carryforward,
    inputSchema: nolCarryforwardInputSchema,
    isArray: false,
  },
  { node: ltc_premium, itemSchema: ltcPremiumItemSchema, isArray: true },
  {
    node: sales_tax_deduction,
    inputSchema: salesTaxInputSchema,
    isArray: false,
  },
  { node: auto_expense, itemSchema: autoExpenseItemSchema, isArray: true },
  { node: schedule_f, inputSchema: scheduleFInputSchema, isArray: false },
  { node: form4137, inputSchema: form4137InputSchema, isArray: false },
  { node: form8919, inputSchema: form8919InputSchema, isArray: false },
  {
    node: disabledAccessLimit,
    inputKey: "form8582cr",
    inputSchema: form8582crInputSchema,
    isArray: false,
  },
  { node: f8917, itemSchema: f8917ItemSchema, isArray: true },
  { node: f8867, itemSchema: f8867ItemSchema, isArray: true },
  { node: f8859, itemSchema: f8859ItemSchema, isArray: true },
  { node: f8820, inputSchema: f8820InputSchema, isArray: false },
  { node: f8082, itemSchema: f8082ItemSchema, isArray: true },
  { node: f8873, itemSchema: f8873ItemSchema, isArray: true },
  { node: f8288, itemSchema: f8288ItemSchema, isArray: true },
  { node: f8621, itemSchema: f8621ItemSchema, isArray: true },
  { node: f8896, itemSchema: f8896ItemSchema, isArray: true },
  { node: f8912, itemSchema: f8912ItemSchema, isArray: true },
  { node: f8978, inputSchema: f8978InputSchema, isArray: false },
  { node: f8615, inputSchema: f8615InputSchema, isArray: false },
  { node: f8611, itemSchema: f8611ItemSchema, isArray: true },
  {
    node: household_wages,
    itemSchema: householdWagesItemSchema,
    isArray: true,
  },
  { node: f8833, itemSchema: f8833ItemSchema, isArray: true },
  { node: f8843, itemSchema: f8843ItemSchema, isArray: true },
  { node: f8805, itemSchema: f8805ItemSchema, isArray: true },
  { node: f8840, inputSchema: f8840InputSchema, isArray: false },
  { node: f8854, inputSchema: f8854InputSchema, isArray: false },
  { node: f8854Annual, inputSchema: annualInputSchema, isArray: false },
  { node: f5471, itemSchema: f5471ItemSchema, isArray: true },
  { node: f8828, itemSchema: f8828ItemSchema, isArray: true },
  { node: f8835, itemSchema: f8835ItemSchema, isArray: true },
  { node: f8844, itemSchema: f8844ItemSchema, isArray: true },
  { node: f8864, inputSchema: f8864InputSchema, isArray: false },
  { node: fec, itemSchema: fecItemSchema, isArray: true },
  { node: qsehra, inputSchema: qsehraInputSchema, isArray: false },
  { node: f965, inputSchema: f965InputSchema, isArray: false },
  {
    node: ppp_forgiveness,
    itemSchema: pppForgivenessItemSchema,
    isArray: true,
  },
  { node: depletion, itemSchema: depletionItemSchema, isArray: true },
  { node: lump_sum_ss, itemSchema: lumpSumSSItemSchema, isArray: true },
  { node: f56, inputSchema: f56InputSchema, isArray: false },
  { node: f970, itemSchema: f970ItemSchema, isArray: true },
  { node: f3115, itemSchema: f3115ItemSchema, isArray: true },
  { node: f4970, itemSchema: f4970ItemSchema, isArray: true },
  { node: f8697, itemSchema: f8697ItemSchema, isArray: true },
  { node: f8866, itemSchema: f8866ItemSchema, isArray: true },
  {
    node: qbiAggregation,
    inputSchema: qbiAggregationInputSchema,
    isArray: false,
  },
  { node: f843, inputSchema: f843InputSchema, isArray: false },
  { node: f2120, inputSchema: f2120InputSchema, isArray: false },
  { node: f8275, inputSchema: f8275InputSchema, isArray: false },
  { node: f8857, inputSchema: f8857InputSchema, isArray: false },
  { node: f8965, inputSchema: f8965InputSchema, isArray: false },
  { node: f59e, itemSchema: f59eItemSchema, isArray: true },
  { node: f1040es, inputSchema: f1040esInputSchema, isArray: false },
  {
    node: educator_expenses,
    inputSchema: educatorExpensesInputSchema,
    isArray: false,
  },
  { node: preparer, inputSchema: preparerInputSchema, isArray: false },
  { node: form8889, inputSchema: form8889InputSchema, isArray: false },
  {
    node: ira_deduction_worksheet,
    inputSchema: iraDeductionWorksheetInputSchema,
    isArray: false,
  },
  {
    node: self_employed_health_insurance,
    itemSchema: sehiItemSchema,
    isArray: true,
  },
  { node: schedule_h, inputSchema: scheduleHInputSchema, isArray: false },
  {
    node: alimony_received,
    itemSchema: alimonyReceivedItemSchema,
    isArray: true,
  },
];
