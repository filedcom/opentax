import type { NodeRegistry } from "../../../core/types/node-registry.ts";
import { general } from "../nodes/inputs/general/index.ts";
import { f1098e } from "../nodes/inputs/f1098e/index.ts";
import { f1099g } from "../nodes/inputs/f1099g/index.ts";
import { f1099int } from "../nodes/inputs/f1099int/index.ts";
import { w2 } from "../nodes/inputs/w2/index.ts";
import { agi_aggregator } from "../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { form4137 } from "../nodes/intermediate/forms/form4137/index.ts";
import { form8960 } from "../nodes/intermediate/forms/form8960/index.ts";
import { form6251 } from "../nodes/intermediate/forms/form6251/index.ts";
import { schedule_d } from "../nodes/intermediate/aggregation/schedule_d/index.ts";
import { schedule1a } from "../nodes/intermediate/forms/schedule1a/index.ts";
import { income_tax_calculation } from "../nodes/intermediate/worksheets/income_tax_calculation/index.ts";
import { start } from "./start.ts";
import { f1040_2026_node } from "./nodes/f1040.ts";
import { f8812_2026 } from "./nodes/f8812.ts";
import { f1099div_2026 } from "./nodes/f1099div.ts";
import { f1099b_2026 } from "./nodes/f1099b.ts";
import { f1099da_2026 } from "./nodes/f1099da.ts";
import { f8949_2026 } from "./nodes/f8949.ts";
import { schedule_h_2026 } from "./nodes/schedule_h.ts";
import { form8949 } from "../nodes/intermediate/forms/form8949/index.ts";
import { schedule1_2026 } from "./nodes/schedule1.ts";
import { schedule_b_2026 } from "./nodes/schedule_b.ts";
import { schedule2_2026 } from "./nodes/schedule2.ts";
import { schedule3_2026 } from "./nodes/schedule3.ts";
import { schedule3a } from "./nodes/schedule3a.ts";
import { standard_deduction_2026 } from "./nodes/standard_deduction.ts";

/** TY2026 calculation graph; expand only after each node's 2026 routes are checked. */
export const registry: NodeRegistry = {
  start,
  general,
  f1098e,
  f1099g,
  f1099int,
  f1099div: f1099div_2026,
  f1099b: f1099b_2026,
  f1099da: f1099da_2026,
  f8949: f8949_2026,
  schedule_h: schedule_h_2026,
  form8949,
  w2,
  form4137,
  form8960,
  form6251,
  schedule_d,
  schedule_b: schedule_b_2026,
  agi_aggregator,
  schedule1a,
  schedule2: schedule2_2026,
  schedule3: schedule3_2026,
  standard_deduction: standard_deduction_2026,
  income_tax_calculation,
  f8812: f8812_2026,
  f1040: f1040_2026_node,
  schedule1: schedule1_2026,
  schedule3a,
};
