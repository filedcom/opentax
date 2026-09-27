import type { z } from "zod";
import { assetSchema, MARK_TO_MARKET_EXCLUSION_2025 } from "./index.ts";

type Asset = z.infer<typeof assetSchema>;

export type MarkToMarketAssetAllocation = {
  assetId: string;
  description: string;
  builtInGainOrLoss: number;
  exclusionAllocated: number;
  gainAfterExclusion: number;
};

// Part II, Section C, line 2: only properties with built-in gain share the
// $890,000 exclusion. This returns the per-property amounts needed for the
// eventual statement and income-form routing. It does not decide whether a
// built-in loss is deductible or whether an asset is subject to mark-to-market.
export function allocateMarkToMarketExclusion(
  rawAssets: readonly Asset[],
): MarkToMarketAssetAllocation[] {
  const assets = rawAssets.map((asset) => assetSchema.parse(asset));
  const ids = new Set<string>();
  for (const asset of assets) {
    if (ids.has(asset.asset_id)) {
      throw new Error(`Duplicate Form 8854 asset ID: ${asset.asset_id}`);
    }
    ids.add(asset.asset_id);
  }

  const gainsCents = assets.map((asset) =>
    Math.round(asset.fmv_at_expatriation * 100) -
    Math.round(asset.basis * 100)
  );
  const positiveCents = gainsCents.map((gain) => Math.max(gain, 0));
  const totalPositiveCents = positiveCents.reduce((sum, gain) => sum + gain, 0);
  if (!Number.isSafeInteger(totalPositiveCents)) {
    throw new Error("Form 8854 aggregate gain exceeds safe cent precision");
  }
  const exclusionCents = Math.min(
    totalPositiveCents,
    MARK_TO_MARKET_EXCLUSION_2025 * 100,
  );
  const allocatedCents = Array<number>(assets.length).fill(0);
  if (exclusionCents > 0) {
    const shares = positiveCents.map((gain, index) => {
      const numerator = BigInt(gain) * BigInt(exclusionCents);
      const denominator = BigInt(totalPositiveCents);
      return {
        index,
        floor: Number(numerator / denominator),
        remainder: numerator % denominator,
      };
    });
    const remainderCents = exclusionCents -
      shares.reduce((sum, share) => sum + share.floor, 0);
    for (const share of shares) allocatedCents[share.index] = share.floor;
    for (
      const share of [...shares].sort((a, b) =>
        a.remainder === b.remainder
          ? a.index - b.index
          : a.remainder > b.remainder
          ? -1
          : 1
      ).slice(0, remainderCents)
    ) {
      allocatedCents[share.index] += 1;
    }
  }

  return assets.map((asset, index) => ({
    assetId: asset.asset_id,
    description: asset.description,
    builtInGainOrLoss: gainsCents[index] / 100,
    exclusionAllocated: allocatedCents[index] / 100,
    gainAfterExclusion: (positiveCents[index] - allocatedCents[index]) / 100,
  }));
}
