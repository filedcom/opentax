import type { NodeRegistry } from "../../core/types/node-registry.ts";

// ── Start ─────────────────────────────────────────────────────────────────────
import { start } from "../../forms/f1040/nodes/start/index.ts";

// ── Inputs ────────────────────────────────────────────────────────────────────
import { ext } from "../../forms/f1040/nodes/inputs/ext/index.ts";
import { f1098 } from "../../forms/f1040/nodes/inputs/f1098/index.ts";
import { f1099b } from "../../forms/f1040/nodes/inputs/f1099b/index.ts";
import { f1099c } from "../../forms/f1040/nodes/inputs/f1099c/index.ts";
import { f1099div } from "../../forms/f1040/nodes/inputs/f1099div/index.ts";
import { f1099g } from "../../forms/f1040/nodes/inputs/f1099g/index.ts";
import { f1099int } from "../../forms/f1040/nodes/inputs/f1099int/index.ts";
import { f1099k } from "../../forms/f1040/nodes/inputs/f1099k/index.ts";
import { f1099m } from "../../forms/f1040/nodes/inputs/f1099m/index.ts";
import { f1099nec } from "../../forms/f1040/nodes/inputs/f1099nec/index.ts";
import { f1099r } from "../../forms/f1040/nodes/inputs/f1099r/index.ts";
import { f2441 } from "../../forms/f1040/nodes/inputs/f2441/index.ts";
import { f8812 } from "../../forms/f1040/nodes/inputs/f8812/index.ts";
import { f8863 } from "../../forms/f1040/nodes/inputs/f8863/index.ts";
import { f8949 as f8949InputNode } from "../../forms/f1040/nodes/inputs/f8949/index.ts";
import { general } from "../../forms/f1040/nodes/inputs/general/index.ts";
import { scheduleA } from "../../forms/f1040/nodes/inputs/schedule_a/index.ts";
import { scheduleC } from "../../forms/f1040/nodes/inputs/schedule_c/index.ts";
import { scheduleE } from "../../forms/f1040/nodes/inputs/schedule_e/index.ts";
import { ssa1099 } from "../../forms/f1040/nodes/inputs/ssa1099/index.ts";
import { w2 } from "../../forms/f1040/nodes/inputs/w2/index.ts";

// ── Intermediates ─────────────────────────────────────────────────────────────
import { form2441 } from "../../forms/f1040/nodes/intermediate/form2441/index.ts";
import { form4137 } from "../../forms/f1040/nodes/intermediate/form4137/index.ts";
import { form4562 } from "../../forms/f1040/nodes/intermediate/form4562/index.ts";
import { form461 } from "../../forms/f1040/nodes/intermediate/form461/index.ts";
import { form4797 } from "../../forms/f1040/nodes/intermediate/form4797/index.ts";
import { form4972 } from "../../forms/f1040/nodes/intermediate/form4972/index.ts";
import { form5329 } from "../../forms/f1040/nodes/intermediate/form5329/index.ts";
import { form6198 } from "../../forms/f1040/nodes/intermediate/form6198/index.ts";
import { form6251 } from "../../forms/f1040/nodes/intermediate/form6251/index.ts";
import { form8582 } from "../../forms/f1040/nodes/intermediate/form8582/index.ts";
import { form8606 } from "../../forms/f1040/nodes/intermediate/form8606/index.ts";
import { form8839 } from "../../forms/f1040/nodes/intermediate/form8839/index.ts";
import { form8853 } from "../../forms/f1040/nodes/intermediate/form8853/index.ts";
import { form8880 } from "../../forms/f1040/nodes/intermediate/form8880/index.ts";
import { form8889 } from "../../forms/f1040/nodes/intermediate/form8889/index.ts";
import { form8919 } from "../../forms/f1040/nodes/intermediate/form8919/index.ts";
import { form8949 } from "../../forms/f1040/nodes/intermediate/form8949/index.ts";
import { form8959 } from "../../forms/f1040/nodes/intermediate/form8959/index.ts";
import { form8960 } from "../../forms/f1040/nodes/intermediate/form8960/index.ts";
import { form8990 } from "../../forms/f1040/nodes/intermediate/form8990/index.ts";
import { form8995 } from "../../forms/f1040/nodes/intermediate/form8995/index.ts";
import { form8995a } from "../../forms/f1040/nodes/intermediate/form8995a/index.ts";
import { form982 } from "../../forms/f1040/nodes/intermediate/form982/index.ts";
import { form_1116 } from "../../forms/f1040/nodes/intermediate/form_1116/index.ts";
import { form_8829 } from "../../forms/f1040/nodes/intermediate/form_8829/index.ts";
import { ira_deduction_worksheet } from "../../forms/f1040/nodes/intermediate/ira_deduction_worksheet/index.ts";
import { rate_28_gain_worksheet } from "../../forms/f1040/nodes/intermediate/rate_28_gain_worksheet/index.ts";
import { schedule2 } from "../../forms/f1040/nodes/intermediate/schedule2/index.ts";
import { schedule3 } from "../../forms/f1040/nodes/intermediate/schedule3/index.ts";
import { schedule_b } from "../../forms/f1040/nodes/intermediate/schedule_b/index.ts";
import { schedule_d } from "../../forms/f1040/nodes/intermediate/schedule_d/index.ts";
import { schedule_f } from "../../forms/f1040/nodes/intermediate/schedule_f/index.ts";
import { schedule_se } from "../../forms/f1040/nodes/intermediate/schedule_se/index.ts";
import { unrecaptured_1250_worksheet } from "../../forms/f1040/nodes/intermediate/unrecaptured_1250_worksheet/index.ts";

// ── Outputs ───────────────────────────────────────────────────────────────────
import { f1040 } from "../../forms/f1040/nodes/outputs/f1040/index.ts";
import { schedule1 } from "../../forms/f1040/nodes/outputs/schedule1/index.ts";

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
  f1099m,
  f1099nec,
  f1099r,
  f2441,
  f8812,
  f8863,
  f8949: f8949InputNode,
  general,
  schedule_a: scheduleA,
  schedule_c: scheduleC,
  schedule_e: scheduleE,
  ssa1099,
  w2,

  // ── Intermediates ───────────────────────────────────────────────────────────
  form2441,
  form4137,
  form4562,
  form461,
  form4797,
  form4972,
  form5329,
  form6198,
  form6251,
  form8582,
  form8606,
  form8839,
  form8853,
  form8880,
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
  schedule_se,
  unrecaptured_1250_worksheet,

  // ── Outputs ─────────────────────────────────────────────────────────────────
  f1040,
  schedule1,
};
