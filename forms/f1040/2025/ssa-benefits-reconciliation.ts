import { inputSchema as ssaSchema } from "../nodes/inputs/ssa1099/index.ts";
import { inputSchema as lumpSumSchema } from "../nodes/inputs/lump_sum_ss/index.ts";

/** Replay the modeled SSA-1099, RRB-1099, and lump-sum line 6a sources. */
export function assertSocialSecurityBenefitSource(
  pending: Record<string, unknown>,
): void {
  const ssa = pending.ssa1099 === undefined
    ? []
    : ssaSchema.parse(pending.ssa1099).ssas;
  const lump = pending.lump_sum_ss === undefined
    ? []
    : lumpSumSchema.parse(pending.lump_sum_ss).lump_sum_sss;
  const ssaNet = ssa.reduce(
    (sum, row) =>
      sum + (row.box5_net_benefits ??
        row.box3_gross_benefits - (row.box4_repaid ?? 0)),
    0,
  );
  if (ssaNet < 0) {
    throw new Error(
      "Negative total SSA-1099 benefits need repayment deduction or credit review before filing",
    );
  }
  const lumpNet = lump.reduce(
    (sum, row) => sum + row.total_ss_benefits_this_year,
    0,
  );
  const expected = ssaNet + lumpNet;
  const actual = (pending.f1040 as Record<string, unknown> | undefined)
    ?.line6a_ss_gross ?? 0;
  if (actual !== expected) {
    throw new Error(
      "Form 1040 line 6a differs from retained Social Security benefit sources",
    );
  }
}
