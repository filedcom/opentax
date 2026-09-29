import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f3800, f8826CreditEntrySchema } from "../../../inputs/f3800/index.ts";
import { allocateMixedDisabledAccessCredits } from "../../../inputs/f3800/disabled-access.ts";
import {
  form8582cr,
  inputSchema as form8582crInputSchema,
  PassiveCreditReportingRoute,
} from "../form8582cr/index.ts";

// This node accumulates raw Form 8826/K-1 amounts and the public Form 8582-CR
// facts before either passive tax limitation or Form 3800 source allocation.
// The original amounts stay in pending.disabled_access_limit for filed-source
// reconciliation. No second public return-input shape is introduced.
const inputSchema = z.object({
  f8826_credit_entries: z.array(f8826CreditEntrySchema).optional(),
  required_disabled_access_self_credit: z.object({
    source_document_reference: z.string().trim().min(1),
    credit_amount: z.number().finite().positive().refine((amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
    ),
  }).optional(),
  required_form8826_pass_through_credits: z.array(z.object({
    source_type: z.enum(["partnership", "s_corporation"]),
    source_ein: z.string().regex(/^\d{9}$/),
    source_document_reference: z.string().trim().min(1),
    credit_amount: z.number().finite().positive().refine((amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
    ),
  })).optional(),
}).passthrough();

class DisabledAccessLimitNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "disabled_access_limit";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8582cr, f3800]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const entries = input.f8826_credit_entries ?? [];
    if (entries.some((entry) => entry.subject_to_passive_activity_limit)) {
      throw new Error(
        "Passive Form 8826 source needs matching Form 8582-CR activity facts",
      );
    }
    const sourceIds = new Set<string>();
    for (const entry of entries) {
      const id = `${entry.source_type}:${entry.source_ein ?? "self"}`;
      if (sourceIds.has(id)) {
        throw new Error(`Duplicate Form 8826 credit source ${id}`);
      }
      sourceIds.add(id);
    }
    const hasPassiveFacts = "credit_sources" in input;
    if (
      !hasPassiveFacts &&
      ("required_disabled_access_k1_credits" in input ||
        "required_orphan_drug_k1_credits" in input ||
        input.required_disabled_access_self_credit !== undefined ||
        (input.required_form8826_pass_through_credits?.length ?? 0) > 0)
    ) {
      throw new Error(
        "Passive disabled-access credit needs Form 8582-CR activity and tax facts",
      );
    }
    const passive = hasPassiveFacts ? form8582crInputSchema.parse(input) : null;
    if (input.required_disabled_access_self_credit) {
      const required = input.required_disabled_access_self_credit;
      const matched = passive?.credit_sources.filter((source) =>
        source.source_form === "Form 8826" &&
        source.source_origin.kind === "self" &&
        source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
        source.form3800_credit_line === "1e" &&
        source.source_document_reference === required.source_document_reference
      ) ?? [];
      if (
        matched.reduce((sum, source) =>
          sum + source.current_year_credit, 0) !==
          Math.round(required.credit_amount)
      ) {
        throw new Error(
          "Passive Form 8826 credit does not match its Form 8582-CR activity sources",
        );
      }
    }
    for (const required of input.required_form8826_pass_through_credits ?? []) {
      const matched = passive?.credit_sources.filter((source) =>
        source.source_form === "Form 8826" &&
        source.source_origin.kind === required.source_type &&
        source.source_origin.ein === required.source_ein &&
        source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
        source.form3800_credit_line === "1e" &&
        source.source_document_reference === required.source_document_reference
      ) ?? [];
      if (
        matched.reduce((sum, source) =>
          sum + source.current_year_credit, 0) !==
          Math.round(required.credit_amount)
      ) {
        throw new Error(
          "Passive Form 8826 pass-through credit does not match its Form 8582-CR activity sources",
        );
      }
    }
    const passiveIndexes =
      passive?.credit_sources.flatMap((source, index) =>
        source.reporting_route === PassiveCreditReportingRoute.Form3800Line3 &&
          source.form3800_credit_line === "1e" &&
          source.current_year_credit > 0
          ? [index]
          : []
      ) ?? [];
    const allocated = allocateMixedDisabledAccessCredits(
      passiveIndexes.map((index) =>
        passive!.credit_sources[index].current_year_credit
      ),
      entries.map((entry) => entry.credit_amount),
    );
    const cappedByPassiveIndex = new Map(
      passiveIndexes.map((index, position) => [
        index,
        allocated.passive[position],
      ]),
    );
    const cappedEntries = entries.flatMap((entry, index) => {
      const credit = allocated.nonpassive[index];
      return credit > 0 ? [{ ...entry, credit_amount: credit }] : [];
    });
    const outputs: NodeOutput[] = [];
    if (passive) {
      const cappedSources = passive.credit_sources.flatMap((source, index) => {
        const credit = cappedByPassiveIndex.get(index);
        if (credit === undefined) return [source];
        if (credit === 0 && source.prior_unallowed_credits.length === 0) {
          return [];
        }
        return [{ ...source, current_year_credit: credit }];
      });
      const cappedPassive = { ...passive };
      delete cappedPassive.required_disabled_access_k1_credits;
      delete cappedPassive.required_orphan_drug_k1_credits;
      outputs.push(output(form8582cr, {
        ...cappedPassive,
        credit_sources: cappedSources,
      }));
    }
    if (cappedEntries.length > 0) {
      outputs.push(output(f3800, { f8826_credit_entries: cappedEntries }));
    }
    return { outputs };
  }
}

export const disabledAccessLimit = new DisabledAccessLimitNode();
