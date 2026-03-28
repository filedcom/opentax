import type { NodeRegistry } from "../../core/types/node-registry.ts";
import { f1098 } from "./f1040/inputs/f1098/index.ts";
import { f1099r } from "./f1040/inputs/f1099r/index.ts";
import { f2441 } from "./f1040/inputs/f2441/index.ts";
import { f8812 } from "./f1040/inputs/f8812/index.ts";
import { f8863 } from "./f1040/inputs/f8863/index.ts";
import { f8949 as f8949InputNode } from "./f1040/inputs/f8949/index.ts";
import { f1099b } from "./f1040/inputs/f1099b/index.ts";
import { f1099c } from "./f1040/inputs/f1099c/index.ts";
import { f1099g } from "./f1040/inputs/f1099g/index.ts";
import { f1099k } from "./f1040/inputs/f1099k/index.ts";
import { f1099m } from "./f1040/inputs/f1099m/index.ts";
import { scheduleA } from "./f1040/inputs/schedule_a/index.ts";
import { scheduleC } from "./f1040/inputs/schedule_c/index.ts";
import { schedule_d } from "./f1040/intermediate/schedule_d/index.ts";
import { f1099div } from "./f1040/inputs/f1099div/index.ts";
import { scheduleE } from "./f1040/inputs/schedule_e/index.ts";
import { ext } from "./f1040/inputs/ext/index.ts";
import { general } from "./f1040/inputs/general/index.ts";
import { f1099int } from "./f1040/inputs/f1099int/index.ts";
import { f1099nec } from "./f1040/inputs/f1099nec/index.ts";
import { w2 } from "./f1040/inputs/w2/index.ts";
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
import { form4562 } from "./f1040/intermediate/form4562/index.ts";
import { form4797 } from "./f1040/intermediate/form4797/index.ts";
import { form461 } from "./f1040/intermediate/form461/index.ts";
import { form6198 } from "./f1040/intermediate/form6198/index.ts";
import { form8582 } from "./f1040/intermediate/form8582/index.ts";
import { form8960 } from "./f1040/intermediate/form8960/index.ts";
import { form8990 } from "./f1040/intermediate/form8990/index.ts";
import { form8880 } from "./f1040/intermediate/form8880/index.ts";
import { form8995 } from "./f1040/intermediate/form8995/index.ts";
import { form8995a } from "./f1040/intermediate/form8995a/index.ts";
import { form8606 } from "./f1040/intermediate/form8606/index.ts";
import { form982 } from "./f1040/intermediate/form982/index.ts";
import { form_1116 } from "./f1040/intermediate/form_1116/index.ts";
import { form_8829 } from "./f1040/intermediate/form_8829/index.ts";
import { ira_deduction_worksheet } from "./f1040/intermediate/ira_deduction_worksheet/index.ts";
import { rate_28_gain_worksheet } from "./f1040/intermediate/rate_28_gain_worksheet/index.ts";
import { schedule2 } from "./f1040/intermediate/schedule2/index.ts";
import { schedule3 } from "./f1040/intermediate/schedule3/index.ts";
import { schedule_b } from "./f1040/intermediate/schedule_b/index.ts";
import { unrecaptured_1250_worksheet } from "./f1040/intermediate/unrecaptured_1250_worksheet/index.ts";
import { schedule_f } from "./f1040/intermediate/schedule_f/index.ts";
import { schedule_se } from "./f1040/intermediate/schedule_se/index.ts";
import { f1040 } from "./f1040/outputs/f1040/index.ts";
import { schedule1 } from "./f1040/outputs/schedule1/index.ts";
import { start } from "./f1040/start/index.ts";

export const registry: NodeRegistry = {
  start,
  // Input nodes — keyed by their nodeType string
  w2,
  f1099int,
  f1099div,
  f1099nec,
  f1099g,
  f1099m,
  f1099c,
  f1099k,
  f1099b,
  f1099r,
  f1098,
  f2441,
  f8812,
  f8863,
  // Input nodes whose nodeType matches intermediate routing destinations
  schedule_a: scheduleA,
  schedule_c: scheduleC,
  schedule_e: scheduleE,
  // Input nodes with unique nodeTypes
  f8949: f8949InputNode,
  ext,
  general,
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
  form8606,
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
  unrecaptured_1250_worksheet,
  schedule_d,
  schedule_f,
  schedule_se,
  // Schedule E intermediate nodes
  form4562,
  form4797,
  form461,
  form6198,
  form8582,
  form8960,
  form8990,
  // Output nodes
  f1040,
  schedule1,
};
