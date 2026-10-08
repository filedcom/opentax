import { MARK_TO_MARKET_EXCLUSION_2025 } from "./constants.ts";
import {
  type MarkToMarketAsset,
  markToMarketAssetSchema,
  type SectionC,
} from "./section-c.ts";

export type MarkToMarketAssetAllocation = {
  assetId: string;
  description: string;
  builtInGainOrLoss: number;
  exclusionAllocated: number;
  gainAfterExclusion: number;
};

// The Form 8854 MeF amounts are integer dollars. Use the same rounded FMV and
// basis for every displayed gain, exclusion, and deferral computation.
export function wholeDollarAssets(section: SectionC): MarkToMarketAsset[] {
  return section.mark_to_market_assets.map((asset) => ({
    ...asset,
    fmv_day_before_expatriation: Math.round(
      asset.fmv_day_before_expatriation,
    ),
    us_adjusted_basis: Math.round(asset.us_adjusted_basis),
  }));
}

// Part II, Section C, line 2: only properties with built-in gain share the
// $890,000 exclusion. This returns the per-property amounts needed for the
// eventual statement and income-form routing. It does not decide whether a
// built-in loss is deductible or whether an asset is subject to mark-to-market.
export function allocateMarkToMarketExclusion(
  rawAssets: readonly MarkToMarketAsset[],
): MarkToMarketAssetAllocation[] {
  const assets = rawAssets.map((asset) => markToMarketAssetSchema.parse(asset));
  const ids = new Set<string>();
  for (const asset of assets) {
    if (ids.has(asset.item_id)) {
      throw new Error(`Duplicate Form 8854 asset ID: ${asset.item_id}`);
    }
    ids.add(asset.item_id);
  }

  const gainsCents = assets.map((asset) =>
    Math.round(asset.fmv_day_before_expatriation * 100) -
    Math.round(asset.us_adjusted_basis * 100)
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
    assetId: asset.item_id,
    description: asset.description,
    builtInGainOrLoss: gainsCents[index] / 100,
    exclusionAllocated: allocatedCents[index] / 100,
    gainAfterExclusion: (positiveCents[index] - allocatedCents[index]) / 100,
  }));
}
