import { z } from "zod";
import { ownedAbleDistributions } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { inputSchema as form5329Schema } from "../../../../../nodes/intermediate/forms/taxes/retirement/form5329/index.ts";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";

const incomeSchema = z.object({
  line8q_able_taxable_earnings: z.number().int().nonnegative().optional(),
});

/** Run before document selection, including zero-credit and tax-free distributions. */
export function assertAbleDistributionReturn(
  pending: Readonly<Record<string, unknown>>,
): void {
  const general = generalSchema.pick({
    form8880_able_contribution_review: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
    filing_status: true,
  }).partial().parse(pending.general ?? {});
  const distributions = ownedAbleDistributions(
    general.form8880_able_contribution_review,
    general.taxpayer_ssn,
    general.spouse_ssn,
    general.filing_status,
  );
  const total = distributions.reduce(
    (sum, d) => sum + d.taxableWholeDollars,
    0,
  );
  if (total > 0) {
    const niit = z.object({ magi: z.number().finite().optional() }).parse(
      pending.form8960 ?? {},
    );
    const filed = z.object({ line11_agi: z.number().finite() }).parse(
      pending.f1040,
    );
    const threshold = general.filing_status === FilingStatus.MFJ
      ? 250000
      : general.filing_status === FilingStatus.MFS
      ? 125000
      : 200000;
    if (Math.max(niit.magi ?? 0, filed.line11_agi) > threshold) {
      throw new Error(
        "Taxable ABLE distributions above the NIIT threshold need a reviewed Form 8960 classification",
      );
    }
  }
  for (const key of ["schedule1", "agi_aggregator"] as const) {
    const income = incomeSchema.parse(pending[key] ?? {});
    if (
      (income.line8q_able_taxable_earnings ?? 0) !== total ||
      (distributions.length > 0 &&
        income.line8q_able_taxable_earnings === undefined)
    ) {
      throw new Error(
        `ABLE taxable earnings differ from retained ${key} source totals`,
      );
    }
  }
  // The computed collection also has owner_forms; select only its typed inputs.
  const collection = z.object({
    owner_entries: form5329Schema.shape.owner_entries,
  }).parse(pending.form5329 ?? {});
  const actual = (collection.owner_entries ?? []).filter((e) =>
    e.able_distribution_review
  );
  const expected = distributions.filter((d) => d.taxableWholeDollars > 0);
  if (actual.length !== expected.length) {
    throw new Error("ABLE Form 5329 source inventory differs");
  }
  for (const distribution of expected) {
    const owner =
      distribution.ownerSsn === general.taxpayer_ssn?.replaceAll("-", "")
        ? TS.T
        : TS.S;
    const matches = actual.filter((e) => e.owner === owner);
    const entry = matches[0];
    if (
      matches.length !== 1 || !entry ||
      JSON.stringify(entry.able_distribution_review) !==
        JSON.stringify(distribution.source) ||
      entry.esa_able_distribution !== distribution.taxableWholeDollars ||
      (entry.esa_able_exception ?? 0) !== 0
    ) {
      throw new Error(
        "ABLE Form 5329 owner, taxable earnings or source differs",
      );
    }
  }
}
