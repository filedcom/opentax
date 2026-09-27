import type { NodeRegistry } from "../../../core/types/node-registry.ts";
import { general } from "../nodes/inputs/general/index.ts";
import { w2 } from "../nodes/inputs/w2/index.ts";
import { agi_aggregator } from "../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { form4137 } from "../nodes/intermediate/forms/form4137/index.ts";
import { schedule1a } from "../nodes/intermediate/forms/schedule1a/index.ts";
import { income_tax_calculation } from "../nodes/intermediate/worksheets/income_tax_calculation/index.ts";
import { start } from "./start.ts";
import { f1040_2026_node } from "./nodes/f1040.ts";
import { schedule2_2026 } from "./nodes/schedule2.ts";
import { schedule3a } from "./nodes/schedule3a.ts";
import { standard_deduction_2026 } from "./nodes/standard_deduction.ts";

/** TY2026 calculation graph; expand only after each node's 2026 routes are checked. */
export const registry: NodeRegistry = {
  start,
  general,
  w2,
  form4137,
  agi_aggregator,
  schedule1a,
  schedule2: schedule2_2026,
  standard_deduction: standard_deduction_2026,
  income_tax_calculation,
  f1040: f1040_2026_node,
  schedule3a,
};
