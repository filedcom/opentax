import { nativeFecInputSchema } from "../nodes/inputs/fec/index.ts";
import {
  correctivePlanItems,
  inputSchema as f1099rInputSchema,
} from "../nodes/inputs/f1099r/index.ts";
import {
  codeDExcessDeferral,
  inputSchema as w2InputSchema,
} from "../nodes/inputs/w2/index.ts";
import { physicalPresenceFilingSchema } from "../nodes/intermediate/forms/form2555/calculation.ts";

/** A positive line 1h must be explained by exactly one retained 2025 route. */
export function assertLine1hSupportedSource(
  fields: Readonly<Record<string, unknown>>,
  pending?: Readonly<Record<string, unknown>>,
): void {
  const sources: number[] = [];
  if (pending?.fec !== undefined) {
    sources.push(
      nativeFecInputSchema.parse(pending.fec).fecs.reduce(
        (sum, item) => sum + item.compensation_usd,
        0,
      ),
    );
  }
  const filing = (pending?.form2555 as Record<string, unknown> | undefined)
    ?.filing_details;
  if (filing !== undefined) {
    sources.push(physicalPresenceFilingSchema.parse(filing).foreign_wages);
  }
  if (pending?.w2 !== undefined) {
    const excess = codeDExcessDeferral(w2InputSchema.parse(pending.w2).w2s);
    if (excess.amount > 0) sources.push(excess.amount);
  }
  if (pending?.f1099r !== undefined) {
    const corrections = correctivePlanItems(
      f1099rInputSchema.parse(pending.f1099r).f1099rs,
    );
    if (corrections.length > 0) {
      sources.push(corrections.reduce(
        (sum, item) => sum + (item.box2a_taxable_amount ?? 0),
        0,
      ));
    }
  }
  const filed = fields.line1h_other_earned;
  if (
    sources.length === 0 &&
    (filed === undefined || filed === null || filed === 0)
  ) {
    return;
  }
  if (
    sources.length !== 1 || !Number.isSafeInteger(sources[0]) ||
    sources[0] <= 0 || filed !== sources[0]
  ) {
    throw new Error(
      "Form 1040 line 1h needs exactly one supported retained source matching its filed amount",
    );
  }
  const agiRaw = (pending?.agi_aggregator as
    | Record<string, unknown>
    | undefined)?.line1h_other_earned;
  const agi = typeof agiRaw === "number" ? agiRaw : Array.isArray(agiRaw) &&
      agiRaw.every((value) => typeof value === "number")
    ? agiRaw.reduce((sum, value) => sum + value, 0)
    : undefined;
  if (agi !== sources[0]) {
    throw new Error(
      "Form 1040 line 1h retained source must match the finalized AGI amount",
    );
  }
}
