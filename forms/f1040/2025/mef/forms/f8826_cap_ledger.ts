import type { MefBuildContext } from "../form-descriptor.ts";
import { disabledAccessLimit } from "../../../nodes/intermediate/forms/disabled_access_limit/index.ts";
import {
  inputSchema as form8582crInputSchema,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";

/** Rebuild the filed cap from the gross graph ledger, not the reduced credits. */
export function readDisabledAccessCapLedger(context: MefBuildContext) {
  const pending = context.pending;
  if (!pending || pending.disabled_access_limit === undefined) return undefined;
  const raw = disabledAccessLimit.inputSchema.parse(
    pending.disabled_access_limit,
  );
  const result = disabledAccessLimit.compute(
    { taxYear: 2025, formType: "f1040" },
    raw,
  );
  const calculatedPassive = result.outputs.find((item) =>
    item.nodeType === "form8582cr"
  );
  const calculatedNonpassive = result.outputs.find((item) =>
    item.nodeType === "f3800"
  );
  const cappedPassiveSources = calculatedPassive
    ? form8582crInputSchema.parse(calculatedPassive.fields).credit_sources
    : [];
  const cappedEntries = calculatedNonpassive
    ? f3800InputSchema.parse(calculatedNonpassive.fields)
      .f8826_credit_entries ?? []
    : [];
  const filedPassiveSources = pending.form8582cr === undefined
    ? []
    : form8582crInputSchema.parse(pending.form8582cr).credit_sources;
  const filedEntries = pending.f3800 === undefined
    ? []
    : f3800InputSchema.parse(pending.f3800).f8826_credit_entries ?? [];
  if (
    JSON.stringify(cappedPassiveSources) !==
      JSON.stringify(filedPassiveSources) ||
    JSON.stringify(cappedEntries) !== JSON.stringify(filedEntries)
  ) {
    throw new Error(
      "Form 8826 capped credits differ from the gross disabled-access source ledger",
    );
  }
  const rawPassiveSources = "credit_sources" in raw
    ? form8582crInputSchema.parse(raw).credit_sources
    : [];
  return {
    rawEntries: raw.f8826_credit_entries ?? [],
    rawPassiveSources,
    cappedEntries,
    cappedPassiveSources,
  };
}
