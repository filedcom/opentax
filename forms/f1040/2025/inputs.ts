import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import { ext, inputSchema as extInputSchema } from "../nodes/inputs/ext/index.ts";
import { f1098, itemSchema as f1098ItemSchema } from "../nodes/inputs/f1098/index.ts";
import { f1098e, itemSchema as f1098eItemSchema } from "../nodes/inputs/f1098e/index.ts";
import { f1099b, itemSchema as f1099bItemSchema } from "../nodes/inputs/f1099b/index.ts";
import { f1099c, itemSchema as f1099cItemSchema } from "../nodes/inputs/f1099c/index.ts";
import { f1099div, itemSchema as f1099divItemSchema } from "../nodes/inputs/f1099div/index.ts";
import { f1099g, itemSchema as f1099gItemSchema } from "../nodes/inputs/f1099g/index.ts";
import { f1099int, itemSchema as f1099intItemSchema } from "../nodes/inputs/f1099int/index.ts";
import { f1099k, itemSchema as f1099kItemSchema } from "../nodes/inputs/f1099k/index.ts";
import { f1099oid, itemSchema as f1099oidItemSchema } from "../nodes/inputs/f1099oid/index.ts";
import { f1099m, itemSchema as f1099mItemSchema } from "../nodes/inputs/f1099m/index.ts";
import { f1099nec, itemSchema as f1099necItemSchema } from "../nodes/inputs/f1099nec/index.ts";
import { f1099r, itemSchema as f1099rItemSchema } from "../nodes/inputs/f1099r/index.ts";
import { rrb1099r, itemSchema as rrb1099rItemSchema } from "../nodes/inputs/rrb1099r/index.ts";
import { f1095a, itemSchema as f1095aItemSchema } from "../nodes/inputs/f1095a/index.ts";
import { f4835, itemSchema as f4835ItemSchema } from "../nodes/inputs/f4835/index.ts";
import { f2441, itemSchema as f2441ItemSchema } from "../nodes/inputs/f2441/index.ts";
import { f8812, itemSchema as f8812ItemSchema } from "../nodes/inputs/f8812/index.ts";
import { f8863, itemSchema as f8863ItemSchema } from "../nodes/inputs/f8863/index.ts";
import { f8949, itemSchema as f8949ItemSchema } from "../nodes/inputs/f8949/index.ts";
import { general, inputSchema as generalInputSchema } from "../nodes/inputs/general/index.ts";
import { k1_trust, itemSchema as k1TrustItemSchema } from "../nodes/inputs/k1_trust/index.ts";
import { k1SCorpNode, itemSchema as k1SCorpItemSchema } from "../nodes/inputs/k1_s_corp/index.ts";
import { k1Partnership, itemSchema as k1PartnershipItemSchema } from "../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as scheduleAInputSchema, scheduleA } from "../nodes/inputs/schedule_a/index.ts";
import { itemSchema as scheduleCItemSchema, scheduleC } from "../nodes/inputs/schedule_c/index.ts";
import { itemSchema as scheduleEItemSchema, scheduleE } from "../nodes/inputs/schedule_e/index.ts";
import { itemSchema as ssaItemSchema, ssa1099 } from "../nodes/inputs/ssa1099/index.ts";
import { w2, w2ItemSchema } from "../nodes/inputs/w2/index.ts";
import { w2g, itemSchema as w2gItemSchema } from "../nodes/inputs/w2g/index.ts";
import { f1099patr, itemSchema as f1099patrItemSchema } from "../nodes/inputs/f1099patr/index.ts";
import { f8283, inputSchema as f8283InputSchema } from "../nodes/inputs/f8283/index.ts";
import { f9465, inputSchema as f9465InputSchema } from "../nodes/inputs/f9465/index.ts";
import { f8888, inputSchema as f8888InputSchema } from "../nodes/inputs/f8888/index.ts";
import { schedule_r, inputSchema as scheduleRInputSchema } from "../nodes/inputs/schedule_r/index.ts";
import { f2210, inputSchema as f2210InputSchema } from "../nodes/inputs/f2210/index.ts";
import { f3903, itemSchema as f3903ItemSchema } from "../nodes/inputs/f3903/index.ts";
import { f5695, inputSchema as f5695InputSchema } from "../nodes/inputs/f5695/index.ts";
import { f8936, itemSchema as f8936ItemSchema } from "../nodes/inputs/f8936/index.ts";
import { f8862, inputSchema as f8862InputSchema } from "../nodes/inputs/f8862/index.ts";
import { f8958, inputSchema as f8958InputSchema } from "../nodes/inputs/f8958/index.ts";
import { f8994, inputSchema as f8994InputSchema } from "../nodes/inputs/f8994/index.ts";
import { f8814, itemSchema as f8814ItemSchema } from "../nodes/inputs/f8814/index.ts";
import { f8379, inputSchema as f8379InputSchema } from "../nodes/inputs/f8379/index.ts";
import { f8938, inputSchema as f8938InputSchema } from "../nodes/inputs/f8938/index.ts";
import { f5884, itemSchema as f5884ItemSchema } from "../nodes/inputs/f5884/index.ts";
import { f6478, inputSchema as f6478InputSchema } from "../nodes/inputs/f6478/index.ts";
import { f6765, inputSchema as f6765InputSchema } from "../nodes/inputs/f6765/index.ts";
import { f7207, inputSchema as f7207InputSchema } from "../nodes/inputs/f7207/index.ts";
import { f8881, inputSchema as f8881InputSchema } from "../nodes/inputs/f8881/index.ts";
import { f8882, inputSchema as f8882InputSchema } from "../nodes/inputs/f8882/index.ts";
import { f8908, itemSchema as f8908ItemSchema } from "../nodes/inputs/f8908/index.ts";
import { f8941, inputSchema as f8941InputSchema } from "../nodes/inputs/f8941/index.ts";
import { f8834, itemSchema as f8834ItemSchema } from "../nodes/inputs/f8834/index.ts";
import { f8874, inputSchema as f8874InputSchema } from "../nodes/inputs/f8874/index.ts";
import { f8911, inputSchema as f8911InputSchema } from "../nodes/inputs/f8911/index.ts";
import { f8826, inputSchema as f8826InputSchema } from "../nodes/inputs/f8826/index.ts";
import { f4136, inputSchema as f4136InputSchema } from "../nodes/inputs/f4136/index.ts";
import { f3468, inputSchema as f3468InputSchema } from "../nodes/inputs/f3468/index.ts";
import { f4255, itemSchema as f4255ItemSchema } from "../nodes/inputs/f4255/index.ts";
import { f8801, inputSchema as f8801InputSchema } from "../nodes/inputs/f8801/index.ts";
import { f8332, inputSchema as f8332InputSchema } from "../nodes/inputs/f8332/index.ts";
import { f8822, inputSchema as f8822InputSchema } from "../nodes/inputs/f8822/index.ts";
import { f1310, inputSchema as f1310InputSchema } from "../nodes/inputs/f1310/index.ts";
import { f2439, itemSchema as f2439ItemSchema } from "../nodes/inputs/f2439/index.ts";
import { f8997, inputSchema as f8997InputSchema } from "../nodes/inputs/f8997/index.ts";
import { schedule_j, inputSchema as scheduleJInputSchema } from "../nodes/inputs/schedule_j/index.ts";
import { f8609, itemSchema as f8609ItemSchema } from "../nodes/inputs/f8609/index.ts";
import { f4852, itemSchema as f4852ItemSchema } from "../nodes/inputs/f4852/index.ts";
import { sep_retirement, itemSchema as sepRetirementItemSchema } from "../nodes/inputs/sep_retirement/index.ts";
import { nol_carryforward, inputSchema as nolCarryforwardInputSchema } from "../nodes/inputs/nol_carryforward/index.ts";
import { clergy, itemSchema as clergyItemSchema } from "../nodes/inputs/clergy/index.ts";
import { f8915f, itemSchema as f8915fItemSchema } from "../nodes/inputs/f8915f/index.ts";
import { f8915d, itemSchema as f8915dItemSchema } from "../nodes/inputs/f8915d/index.ts";
import { f3800, itemSchema as f3800ItemSchema } from "../nodes/inputs/f3800/index.ts";
import { f2106, itemSchema as f2106ItemSchema } from "../nodes/inputs/f2106/index.ts";
import { f5405, itemSchema as f5405ItemSchema } from "../nodes/inputs/f5405/index.ts";
import { household_wages, itemSchema as householdWagesItemSchema } from "../nodes/inputs/household_wages/index.ts";
import { ltc_premium, itemSchema as ltcPremiumItemSchema } from "../nodes/inputs/ltc_premium/index.ts";
import { sales_tax_deduction, inputSchema as salesTaxInputSchema } from "../nodes/inputs/sales_tax_deduction/index.ts";
import { auto_expense, itemSchema as autoExpenseItemSchema } from "../nodes/inputs/auto_expense/index.ts";
import { f8917, itemSchema as f8917ItemSchema } from "../nodes/inputs/f8917/index.ts";
import { f8867, itemSchema as f8867ItemSchema } from "../nodes/inputs/f8867/index.ts";
import { f8859, itemSchema as f8859ItemSchema } from "../nodes/inputs/f8859/index.ts";
import { f8820, itemSchema as f8820ItemSchema } from "../nodes/inputs/f8820/index.ts";
import { f8082, itemSchema as f8082ItemSchema } from "../nodes/inputs/f8082/index.ts";
import { f8873, itemSchema as f8873ItemSchema } from "../nodes/inputs/f8873/index.ts";
import { f8288, itemSchema as f8288ItemSchema } from "../nodes/inputs/f8288/index.ts";
import { f8621, itemSchema as f8621ItemSchema } from "../nodes/inputs/f8621/index.ts";
import { f8896, itemSchema as f8896ItemSchema } from "../nodes/inputs/f8896/index.ts";
import { f8912, itemSchema as f8912ItemSchema } from "../nodes/inputs/f8912/index.ts";
import { f8978, inputSchema as f8978InputSchema } from "../nodes/inputs/f8978/index.ts";
import { f8611, itemSchema as f8611ItemSchema } from "../nodes/inputs/f8611/index.ts";
import { f8828, itemSchema as f8828ItemSchema } from "../nodes/inputs/f8828/index.ts";
import { f8835, itemSchema as f8835ItemSchema } from "../nodes/inputs/f8835/index.ts";
import { f8844, itemSchema as f8844ItemSchema } from "../nodes/inputs/f8844/index.ts";
import { f8864, inputSchema as f8864InputSchema } from "../nodes/inputs/f8864/index.ts";
import { f8833, itemSchema as f8833ItemSchema } from "../nodes/inputs/f8833/index.ts";
import { f8840, inputSchema as f8840InputSchema } from "../nodes/inputs/f8840/index.ts";
import { f8843, itemSchema as f8843ItemSchema } from "../nodes/inputs/f8843/index.ts";
import { f8854, inputSchema as f8854InputSchema } from "../nodes/inputs/f8854/index.ts";
import { f5471, itemSchema as f5471ItemSchema } from "../nodes/inputs/f5471/index.ts";
import { f8805, itemSchema as f8805ItemSchema } from "../nodes/inputs/f8805/index.ts";
import { fec, itemSchema as fecItemSchema } from "../nodes/inputs/fec/index.ts";
import { qsehra, inputSchema as qsehraInputSchema } from "../nodes/inputs/qsehra/index.ts";
import { f965, itemSchema as f965ItemSchema } from "../nodes/inputs/f965/index.ts";
import { ppp_forgiveness, itemSchema as pppForgivenessItemSchema } from "../nodes/inputs/ppp_forgiveness/index.ts";
import { depletion, itemSchema as depletionItemSchema } from "../nodes/inputs/depletion/index.ts";
import { lump_sum_ss, itemSchema as lumpSumSSItemSchema } from "../nodes/inputs/lump_sum_ss/index.ts";
import { inputSchema as scheduleDInputSchema, schedule_d } from "../nodes/intermediate/aggregation/schedule_d/index.ts";
import { f56, inputSchema as f56InputSchema } from "../nodes/inputs/f56/index.ts";
import { f970, itemSchema as f970ItemSchema } from "../nodes/inputs/f970/index.ts";
import { f3115, itemSchema as f3115ItemSchema } from "../nodes/inputs/f3115/index.ts";
import { f4970, itemSchema as f4970ItemSchema } from "../nodes/inputs/f4970/index.ts";
import { f8697, itemSchema as f8697ItemSchema } from "../nodes/inputs/f8697/index.ts";
import { f8866, itemSchema as f8866ItemSchema } from "../nodes/inputs/f8866/index.ts";
import { qbiAggregation, inputSchema as qbiAggregationInputSchema } from "../nodes/inputs/qbi_aggregation/index.ts";
import { f843, inputSchema as f843InputSchema } from "../nodes/inputs/f843/index.ts";
import { f2120, inputSchema as f2120InputSchema } from "../nodes/inputs/f2120/index.ts";
import { f8275, inputSchema as f8275InputSchema } from "../nodes/inputs/f8275/index.ts";
import { f8857, inputSchema as f8857InputSchema } from "../nodes/inputs/f8857/index.ts";

import { f8965, inputSchema as f8965InputSchema } from "../nodes/inputs/f8965/index.ts";
import { f59e, itemSchema as f59eItemSchema } from "../nodes/inputs/f59e/index.ts";
import { f1040es, inputSchema as f1040esInputSchema } from "../nodes/inputs/f1040es/index.ts";
import { preparer, inputSchema as preparerInputSchema } from "../nodes/inputs/preparer/index.ts";

export const inputNodes: readonly InputNodeEntry[] = [
  // Array inputs (22): each item represents a single form instance
  { node: w2, itemSchema: w2ItemSchema, isArray: true },
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
  { node: f8936, itemSchema: f8936ItemSchema, isArray: true },
  { node: f8814, itemSchema: f8814ItemSchema, isArray: true },
  { node: f5884, itemSchema: f5884ItemSchema, isArray: true },
  { node: f8908, itemSchema: f8908ItemSchema, isArray: true },
  { node: f8609, itemSchema: f8609ItemSchema, isArray: true },
  { node: f4852, itemSchema: f4852ItemSchema, isArray: true },
  { node: sep_retirement, itemSchema: sepRetirementItemSchema, isArray: true },
  // Singleton inputs: entire form as a single object
  { node: scheduleA, inputSchema: scheduleAInputSchema, isArray: false },
  { node: schedule_d, inputSchema: scheduleDInputSchema, isArray: false },
  { node: ext, inputSchema: extInputSchema, isArray: false },
  { node: general, inputSchema: generalInputSchema, isArray: false },
  { node: f8283, inputSchema: f8283InputSchema, isArray: false },
  { node: f9465, inputSchema: f9465InputSchema, isArray: false },
  { node: f8888, inputSchema: f8888InputSchema, isArray: false },
  { node: schedule_r, inputSchema: scheduleRInputSchema, isArray: false },
  { node: f2210, inputSchema: f2210InputSchema, isArray: false },
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
  { node: f8911, inputSchema: f8911InputSchema, isArray: false },
  { node: f8826, inputSchema: f8826InputSchema, isArray: false },
  { node: f4136, inputSchema: f4136InputSchema, isArray: false },
  { node: f3468, inputSchema: f3468InputSchema, isArray: false },
  { node: f4255, itemSchema: f4255ItemSchema, isArray: true },
  { node: f2439, itemSchema: f2439ItemSchema, isArray: true },
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
  { node: nol_carryforward, inputSchema: nolCarryforwardInputSchema, isArray: false },
  { node: ltc_premium, itemSchema: ltcPremiumItemSchema, isArray: true },
  { node: sales_tax_deduction, inputSchema: salesTaxInputSchema, isArray: false },
  { node: auto_expense, itemSchema: autoExpenseItemSchema, isArray: true },
  { node: f8917, itemSchema: f8917ItemSchema, isArray: true },
  { node: f8867, itemSchema: f8867ItemSchema, isArray: true },
  { node: f8859, itemSchema: f8859ItemSchema, isArray: true },
  { node: f8820, itemSchema: f8820ItemSchema, isArray: true },
  { node: f8082, itemSchema: f8082ItemSchema, isArray: true },
  { node: f8873, itemSchema: f8873ItemSchema, isArray: true },
  { node: f8288, itemSchema: f8288ItemSchema, isArray: true },
  { node: f8621, itemSchema: f8621ItemSchema, isArray: true },
  { node: f8896, itemSchema: f8896ItemSchema, isArray: true },
  { node: f8912, itemSchema: f8912ItemSchema, isArray: true },
  { node: f8978, inputSchema: f8978InputSchema, isArray: false },
  { node: f8611, itemSchema: f8611ItemSchema, isArray: true },
  { node: household_wages, itemSchema: householdWagesItemSchema, isArray: true },
  { node: f8833, itemSchema: f8833ItemSchema, isArray: true },
  { node: f8843, itemSchema: f8843ItemSchema, isArray: true },
  { node: f8805, itemSchema: f8805ItemSchema, isArray: true },
  { node: f8840, inputSchema: f8840InputSchema, isArray: false },
  { node: f8854, inputSchema: f8854InputSchema, isArray: false },
  { node: f5471, itemSchema: f5471ItemSchema, isArray: true },
  { node: f8828, itemSchema: f8828ItemSchema, isArray: true },
  { node: f8835, itemSchema: f8835ItemSchema, isArray: true },
  { node: f8844, itemSchema: f8844ItemSchema, isArray: true },
  { node: f8864, inputSchema: f8864InputSchema, isArray: false },
  { node: fec, itemSchema: fecItemSchema, isArray: true },
  { node: qsehra, inputSchema: qsehraInputSchema, isArray: false },
  { node: f965, itemSchema: f965ItemSchema, isArray: true },
  { node: ppp_forgiveness, itemSchema: pppForgivenessItemSchema, isArray: true },
  { node: depletion, itemSchema: depletionItemSchema, isArray: true },
  { node: lump_sum_ss, itemSchema: lumpSumSSItemSchema, isArray: true },
  { node: f56, inputSchema: f56InputSchema, isArray: false },
  { node: f970, itemSchema: f970ItemSchema, isArray: true },
  { node: f3115, itemSchema: f3115ItemSchema, isArray: true },
  { node: f4970, itemSchema: f4970ItemSchema, isArray: true },
  { node: f8697, itemSchema: f8697ItemSchema, isArray: true },
  { node: f8866, itemSchema: f8866ItemSchema, isArray: true },
  { node: qbiAggregation, inputSchema: qbiAggregationInputSchema, isArray: false },
  { node: f843, inputSchema: f843InputSchema, isArray: false },
  { node: f2120, inputSchema: f2120InputSchema, isArray: false },
  { node: f8275, inputSchema: f8275InputSchema, isArray: false },
  { node: f8857, inputSchema: f8857InputSchema, isArray: false },
  { node: f8965, inputSchema: f8965InputSchema, isArray: false },
  { node: f59e, itemSchema: f59eItemSchema, isArray: true },
  { node: f1040es, inputSchema: f1040esInputSchema, isArray: false },
  { node: preparer, inputSchema: preparerInputSchema, isArray: false },
];
