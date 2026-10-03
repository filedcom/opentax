import { inputSchema as ssaSchema } from "../nodes/inputs/ssa1099/index.ts";
import { inputSchema as lumpSumSchema } from "../nodes/inputs/lump_sum_ss/index.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";

/** Bind positive benefit statements to one issued copy and this return's owner. */
export function assertBenefitStatementOwner(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  if (pending.ssa1099 === undefined) return;
  const rows = ssaSchema.parse(pending.ssa1099).ssas;
  const owners = new Set<string>();
  if (filer) {
    owners.add(filer.primarySSN.replace(/\D/g, ""));
    if (
      filer.filingStatus === FilingStatus.MarriedFilingJointly && filer.spouse
    ) {
      owners.add(filer.spouse.ssn.replace(/\D/g, ""));
    }
  }
  for (const row of rows) {
    const material = row.box3_gross_benefits > 0 ||
      (row.box4_repaid ?? 0) > 0 ||
      (row.box6_federal_withheld ?? 0) > 0 ||
      (row.rrb_box10_federal_withheld ?? 0) > 0;
    if (!material) continue;
    if (
      !row.source_document_reference ||
      !owners.has(row.recipient_tin ?? "")
    ) {
      throw new Error(
        "SSA-1099 or RRB-1099 benefit needs an issued-copy reference and taxpayer or joint-spouse box 2 recipient",
      );
    }
  }
}

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
  const taxable = (pending.f1040 as Record<string, unknown> | undefined)
    ?.line6b_ss_taxable ?? 0;
  const agiTaxable = (pending.agi_aggregator as
    | Record<string, unknown>
    | undefined)?.line6b_ss_taxable;
  if (
    typeof taxable !== "number" || !Number.isFinite(taxable) ||
    taxable < 0 || taxable > expected ||
    (agiTaxable !== undefined && agiTaxable !== taxable)
  ) {
    throw new Error(
      "Form 1040 line 6b and AGI taxable benefits must fit retained line 6a benefit sources",
    );
  }
}
