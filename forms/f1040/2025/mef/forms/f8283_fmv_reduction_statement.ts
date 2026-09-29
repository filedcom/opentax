import { inputSchema } from "../../../nodes/inputs/f8283/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import {
  assertShortTermReductionSource,
  buildFmvReductionStatement,
  needsFmvReductionStatement,
} from "./f8283.ts";
import { assertElectedSectionAReconciled } from "./f8283_election.ts";
import {
  carriedSectionAItem,
  reconcileForm8283Carryover,
} from "./f8283_carryover.ts";

// ReturnData1040.xsd places FairMarketValueStatement after the vehicle
// statement. Its document ID is linked from Section A column (h).
export const form8283FmvReductionStatement: MefFormDescriptor<
  "form8283_fmv_reduction_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "form8283_fmv_reduction_statement",
  sourcePendingKeys: ["f8283"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8283--2025.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f8283;
    if (raw === undefined) return [];
    const parsed = inputSchema.parse(raw);
    if (parsed.carryover_evidence !== undefined) {
      const items = reconcileForm8283Carryover(parsed, context).map((row) =>
        carriedSectionAItem(row.evidence)
      );
      const reduced = items.filter(needsFmvReductionStatement);
      if (context.documentIdsByPendingKey) {
        const ids = context.documentIdsByPendingKey
          .form8283_fmv_reduction_statement ?? [];
        if (
          ids.length !== reduced.length || ids.some((id) => !id.trim()) ||
          new Set(ids).size !== ids.length
        ) {
          throw new Error(
            "Form 8283 carryover FMV reductions need distinct linked native statements",
          );
        }
      }
      return items.flatMap((item, index) =>
        needsFmvReductionStatement(item)
          ? [buildFmvReductionStatement(item, index)]
          : []
      );
    }
    if (
      (parsed.section_a_items ?? []).some((item) =>
        item.capital_gain_reduction_election_confirmed === true
      )
    ) {
      assertElectedSectionAReconciled(context);
    }
    const reduced = (parsed.section_a_items ?? []).filter(
      needsFmvReductionStatement,
    );
    for (const item of reduced) assertShortTermReductionSource(item);
    if (context.documentIdsByPendingKey) {
      const ids = context.documentIdsByPendingKey
        .form8283_fmv_reduction_statement ?? [];
      if (
        ids.length !== reduced.length || ids.some((id) => !id.trim()) ||
        new Set(ids).size !== ids.length
      ) {
        throw new Error(
          "Form 8283 Section A reductions need distinct linked native FMV-reduction statement IDs",
        );
      }
    }
    return (parsed.section_a_items ?? []).flatMap((item, index) =>
      needsFmvReductionStatement(item)
        ? [buildFmvReductionStatement(item, index)]
        : []
    );
  },
};
