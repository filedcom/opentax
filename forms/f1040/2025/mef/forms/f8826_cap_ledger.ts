import type { MefBuildContext } from "../form-descriptor.ts";
import { disabledAccessLimit } from "../../../nodes/intermediate/forms/disabled_access_limit/index.ts";
import {
  inputSchema as form8582crInputSchema,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";
import {
  calculateForm8826,
  inputSchema as f8826InputSchema,
  isEligible as isForm8826Eligible,
} from "../../../nodes/inputs/f8826/index.ts";
import { reconcileDisabledAccessK1Credits } from "./f8826_credit_evidence.ts";

/** Rebuild the filed cap from the gross graph ledger, not the reduced credits. */
export function readDisabledAccessCapLedger(context: MefBuildContext) {
  const pending = context.pending;
  if (!pending || pending.disabled_access_limit === undefined) return undefined;
  const raw = disabledAccessLimit.inputSchema.parse(
    pending.disabled_access_limit,
  );
  const form8826 = pending.f8826 === undefined
    ? undefined
    : f8826InputSchema.parse(pending.f8826);
  const selfCredit = form8826 && isForm8826Eligible(form8826)
    ? calculateForm8826(form8826).line6
    : 0;
  const expectedSelf = form8826?.subject_to_passive_activity_limit &&
      selfCredit > 0
    ? {
      source_document_reference: form8826.source_document_reference,
      credit_amount: selfCredit,
    }
    : undefined;
  if (
    JSON.stringify(raw.required_disabled_access_self_credit) !==
      JSON.stringify(expectedSelf)
  ) {
    throw new Error(
      "Passive Form 8826 source differs from the gross disabled-access ledger",
    );
  }
  const expectedPassThrough = (form8826?.pass_through_credits ?? []).flatMap(
    (source) =>
      source.credit_amount > 0 && source.subject_to_passive_activity_limit
        ? [{
          source_type: source.entity_type,
          source_ein: source.entity_ein,
          source_document_reference: source.source_document_reference,
          credit_amount: source.credit_amount,
        }]
        : [],
  );
  if (
    JSON.stringify(raw.required_form8826_pass_through_credits ?? []) !==
      JSON.stringify(expectedPassThrough)
  ) {
    throw new Error(
      "Passive Form 8826 pass-through sources differ from the gross disabled-access ledger",
    );
  }
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
  // A source can receive a zero-cent share of the cap and disappear from the
  // filed Form 3800 rows. Its original K-1 still has to be verified.
  reconcileDisabledAccessK1Credits(
    (raw.f8826_credit_entries ?? []).flatMap((entry) => {
      if (entry.source_type === "self" || !entry.source_document_reference) {
        return [];
      }
      if (!entry.source_ein) {
        throw new Error("Form 8826 K-1 source needs its EIN");
      }
      return [{
        source_type: entry.source_type,
        entity_ein: entry.source_ein,
        source_document_reference: entry.source_document_reference,
        source_statement_reference: entry.source_statement_reference,
        credit_amount: entry.credit_amount,
        subject_to_passive_activity_limit:
          entry.subject_to_passive_activity_limit,
      }];
    }),
    pending,
  );
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
