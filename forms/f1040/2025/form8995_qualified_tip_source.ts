import { normalizeAllPending } from "./pending.ts";
import { schedule1a } from "./mef/forms/schedule1a.ts";
import {
  inputSchema,
  qualifiedBusinessTipQbiSource,
} from "../nodes/intermediate/forms/schedule1a/calculation.ts";
import {
  reviewedQualifiedTipExclusions,
  tipSourceCanonical,
} from "../nodes/intermediate/forms/form8995/qualified-tips.ts";
/** Bind the QBI adjustment to the separately reconciled actual Schedule1A sources. */
export function assertQualifiedTipQbiSource(
  fields: Record<string, unknown>,
  raw?: Readonly<Record<string, unknown>>,
) {
  const p = raw
    ? normalizeAllPending(raw as Record<string, unknown>)
    : undefined;
  const actual = p?.schedule1a === undefined
    ? undefined
    : qualifiedBusinessTipQbiSource(inputSchema.parse(p.schedule1a));
  if (
    (actual?.tips_deduction ?? 0) > 0 ||
    Number(p?.f1040?.line13b_additional_deductions ?? 0) > 0
  ) {
    if (!p?.schedule1a) {
      throw new Error(
        "QBI income cap needs the actual source Schedule1A deduction",
      );
    }
    const xml = schedule1a.build(p.schedule1a, { pending: p });
    if (!xml.includes("IRS1040Schedule1A")) {
      throw new Error("QBI tip exclusion needs its actual filed Schedule1A");
    }
  }
  if (
    tipSourceCanonical(actual) !==
      tipSourceCanonical(fields.qualified_tip_qbi_source)
  ) {
    throw new Error(
      "QBI qualified-tip exclusion is missing or detached from the actual Schedule1A source",
    );
  }
  const result = reviewedQualifiedTipExclusions(
    fields.qualified_tip_qbi_source,
  );

  return result;
}
