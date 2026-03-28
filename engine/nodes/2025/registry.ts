import type { NodeRegistry } from "../../core/types/node-registry.ts";
import { f1098 } from "./f1040/inputs/1098/index.ts";
import { r1099 } from "./f1040/inputs/1099/index.ts";
import { f2441 } from "./f1040/inputs/2441/index.ts";
import { f8812 } from "./f1040/inputs/8812/index.ts";
import { f8863 } from "./f1040/inputs/8863/index.ts";
import { f8949 as f8949InputNode } from "./f1040/inputs/8949/index.ts";
import { b99 } from "./f1040/inputs/99B/index.ts";
import { c99 } from "./f1040/inputs/99C/index.ts";
import { g99 } from "./f1040/inputs/99G/index.ts";
import { k99 } from "./f1040/inputs/99K/index.ts";
import { m99 } from "./f1040/inputs/99M/index.ts";
import { scheduleA } from "./f1040/inputs/A/index.ts";
import { scheduleC } from "./f1040/inputs/C/index.ts";
import { scheduleD } from "./f1040/inputs/D/index.ts";
import { div } from "./f1040/inputs/DIV/index.ts";
import { scheduleE } from "./f1040/inputs/E/index.ts";
import { ext } from "./f1040/inputs/EXT/index.ts";
import { int } from "./f1040/inputs/INT/index.ts";
import { nec } from "./f1040/inputs/NEC/index.ts";
import { w2 } from "./f1040/inputs/W2/index.ts";
import { form2441 } from "./f1040/intermediate/form2441/index.ts";
import { form4137 } from "./f1040/intermediate/form4137/index.ts";
import { form4972 } from "./f1040/intermediate/form4972/index.ts";
import { form5329 } from "./f1040/intermediate/form5329/index.ts";
import { form6251 } from "./f1040/intermediate/form6251/index.ts";
import { form8839 } from "./f1040/intermediate/form8839/index.ts";
import { form8853 } from "./f1040/intermediate/form8853/index.ts";
import { form8889 } from "./f1040/intermediate/form8889/index.ts";
import { form8919 } from "./f1040/intermediate/form8919/index.ts";
import { form8949 } from "./f1040/intermediate/form8949/index.ts";
import { form8959 } from "./f1040/intermediate/form8959/index.ts";
import { form8880 } from "./f1040/intermediate/form8880/index.ts";
import { form8995 } from "./f1040/intermediate/form8995/index.ts";
import { form8995a } from "./f1040/intermediate/form8995a/index.ts";
import { form982 } from "./f1040/intermediate/form982/index.ts";
import { form_1116 } from "./f1040/intermediate/form_1116/index.ts";
import { ira_deduction_worksheet } from "./f1040/intermediate/ira_deduction_worksheet/index.ts";
import { rate_28_gain_worksheet } from "./f1040/intermediate/rate_28_gain_worksheet/index.ts";
import { schedule2 } from "./f1040/intermediate/schedule2/index.ts";
import { schedule3 } from "./f1040/intermediate/schedule3/index.ts";
import { schedule_b } from "./f1040/intermediate/schedule_b/index.ts";
import { unrecaptured_1250_worksheet } from "./f1040/intermediate/unrecaptured_1250_worksheet/index.ts";
import { schedule_d } from "./f1040/intermediate/schedule_d/index.ts";
import { schedule_f } from "./f1040/intermediate/schedule_f/index.ts";
import { schedule_se } from "./f1040/intermediate/schedule_se/index.ts";
import { f1040 } from "./f1040/outputs/f1040/index.ts";
import { schedule1 } from "./f1040/outputs/schedule1/index.ts";
import { start } from "./f1040/start/index.ts";

export const registry: NodeRegistry = {
  start,
  // Input nodes — keyed by their nodeType string
  w2,
  int,
  div,
  nec,
  g99,
  m99,
  c99,
  k99,
  b99,
  r1099,
  f1098,
  f2441,
  f8812,
  f8863,
  // Input nodes whose nodeType matches intermediate routing destinations
  schedule_a: scheduleA,
  schedule_c: scheduleC,
  schedule_e: scheduleE,
  // Input nodes with unique nodeTypes
  d_screen: scheduleD,
  f8949: f8949InputNode,
  ext,
  // Intermediate computation nodes
  form2441,
  form4137,
  form4972,
  form5329,
  form6251,
  form8839,
  form8853,
  form8880,
  form8889,
  form8919,
  form8949,
  form8959,
  form8995,
  form8995a,
  form982,
  form_1116,
  ira_deduction_worksheet,
  rate_28_gain_worksheet,
  schedule2,
  schedule3,
  schedule_b,
  unrecaptured_1250_worksheet,
  schedule_d,
  schedule_f,
  schedule_se,
  // Output nodes
  f1040,
  schedule1,
};
