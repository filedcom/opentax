import {
  type BusinessLossSource2026,
  calculateBusinessLoss2026,
} from "./business-loss-source.ts";
import type { resolveBusinessQbi2026 } from "./business-qbi.ts";
import { FilingStatus } from "../../nodes/types.ts";

type BusinessQbi = ReturnType<typeof resolveBusinessQbi2026>;
/** Current supported businesses are all qualified, nonfarm Schedule C sources.
 * This reviewed bookkeeping allocation is not a statutory allocation rule for
 * mixed qualified losses, farm losses, dispositions or released suspensions. */
export function applyBusinessLossToQbi2026(
  base: BusinessQbi,
  raw?: BusinessLossSource2026,
) {
  const regular = base.business.businesses.filter((b) =>
    b.source.kind === "sole_proprietor"
  );
  const net = regular.reduce((n, b) => n + b.lines.line31, 0) -
    base.business.schedule1_line15;
  const threshold = base.source_input.filing_status === FilingStatus.MFJ
    ? 512000
    : 256000;
  if (!raw) {
    if (net < -threshold) {
      throw new Error("QBI needs the reconciled Form 461 loss workpaper");
    }
    return { ...base, loss_attribution: undefined };
  }
  const loss = calculateBusinessLoss2026(raw);
  const review = base.source_input.loss_limit_review;
  if (!review) throw new Error("QBI loss allocation needs its source review");
  const { qbi_loss_allocation: method, ...lossReview } = review;
  if (
    JSON.stringify(loss.source_input.business_sources) !==
      JSON.stringify(base.business.source_input) ||
    JSON.stringify(loss.source_input.review) !== JSON.stringify(lossReview)
  ) {
    throw new Error(
      "QBI and Form 461 must replay identical business sources and review",
    );
  }
  if (loss.capital.land) {
    throw new Error(
      "Land QBI needs disposition character and loss attribution",
    );
  }
  const excess = loss.schedule1_line8p;
  const regularRefs = new Set(regular.map((b) => b.source.business_reference));
  const weights = base.rows.filter((r) =>
    regularRefs.has(r.business_reference) && r.qbi < 0
  )
    .map((r) => ({
      reference: r.business_reference,
      weight: BigInt(-r.qbi),
      amount: 0,
      remainder: 0n,
    }));
  const total = weights.reduce((n, r) => n + r.weight, 0n);
  if (BigInt(excess) > total) {
    throw new Error("Disallowed loss exceeds qualified source losses");
  }
  for (const row of weights) {
    row.amount = Number(BigInt(excess) * row.weight / total);
    row.remainder = BigInt(excess) * row.weight % total;
  }
  let residual = excess - weights.reduce((n, r) => n + r.amount, 0);
  // Largest remainder, stable source-reference tie break, conserves printed dollars.
  for (
    const row of [...weights].sort((a, b) =>
      a.remainder === b.remainder
        ? a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0
        : a.remainder > b.remainder
        ? -1
        : 1
    )
  ) {
    if (residual-- > 0) row.amount++;
  }
  const rows = base.rows.map((row) => {
    const amount = weights.find((w) =>
      w.reference === row.business_reference
    )?.amount ?? 0;
    return {
      ...row,
      qbi_before_rounding: row.qbi_before_rounding + amount,
      qbi: row.qbi + amount,
      allocated_excess_business_loss: amount,
    };
  });
  const active = base.active_qbi_before_rounding + excess;
  return {
    ...base,
    rows,
    qbi: base.qbi + excess,
    active_qbi_before_rounding: active,
    minimum_deduction: active >= 1000 ? 400 : 0,
    loss_attribution: {
      source_reference: loss.source_input.record_reference,
      review_reference: review.record_reference,
      method,
      excess_business_loss: excess,
      qualified_suspended_loss: excess,
      nonqualified_suspended_loss: 0,
      origin_tax_year: 2026 as const,
      first_carryforward_tax_year: 2027 as const,
      // Separate from Form 8995's carryforward of losses already allowed in 2026.
      kind: "section461l_qualified_nol_origin" as const,
      activities: weights.map((w) => ({
        business_reference: w.reference,
        owner_tin:
          rows.find((r) => r.business_reference === w.reference)!.owner_tin,
        loss_before_limit: Number(w.weight),
        disallowed_loss: w.amount,
        allowed_loss: Number(w.weight) - w.amount,
      })),
    },
  };
}
