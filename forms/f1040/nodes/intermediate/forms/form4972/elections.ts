import { isSourceMoney } from "./source-rounding.ts";
import { reconcileSharedParticipantElections } from "./participant-inventory.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import {
  form4972 as calculateOneForm4972,
  inputSchema as singleFormSchema,
  publicElectionSchema as singleElectionSchema,
} from "./index.ts";

const sourceReferences = z.array(z.string().trim().min(1)).min(1)
  .refine((refs) => new Set(refs).size === refs.length);
const sameReferences = (left: unknown, right: readonly string[]) =>
  Array.isArray(left) && left.length === right.length &&
  new Set(left).size === left.length &&
  left.every((value) => typeof value === "string" && right.includes(value));
const electionSchema = singleElectionSchema.extend({
  source_document_references: sourceReferences,
  participant_name: z.string().trim().min(1).optional(),
  participant_ssn: z.string().regex(/^\d{9}$/).optional(),
  plan_reference: z.string().trim().min(1).optional(),
});
export const publicElectionCollectionSchema = z.object({
  elections: z.array(electionSchema).min(1).max(2),
}).strict();
export const inputSchema = publicElectionCollectionSchema.extend({
  source_forms: z.array(z.record(z.string(), z.unknown())).min(1).max(2),
});

class Form4972ElectionsNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4972";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    income_tax_calculation,
    agi_aggregator,
    f1040,
    scheduleA,
  ]);

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const elections = input.elections;
    const sources = input.source_forms;
    if (elections.length !== sources.length) {
      throw new Error(
        "Form 4972 needs one elected source group per participant",
      );
    }
    const used = new Set<number>();
    const forms: Record<string, unknown>[] = [];
    let tax = 0;
    let ordinary = 0;
    let estateDeduction = 0;
    for (const election of elections) {
      const matching = sources.findIndex((source, index) =>
        !used.has(index) &&
        sameReferences(
          source.source_document_references,
          election.source_document_references,
        )
      );
      if (matching < 0) {
        throw new Error(
          "Form 4972 election lacks its exact Form 1099-R source group",
        );
      }
      used.add(matching);
      const source = sources[matching];
      if (source.multiple_1099r && election.death_benefit_allocation) {
        const plan = source.form4972_plan as
          | Record<string, unknown>
          | undefined;
        if (
          election.death_benefit_allocation.participant_ssn !==
            plan?.participant_ssn ||
          election.death_benefit_allocation.elected_recipient_ssn !==
            source.recipient_ssn
        ) {
          throw new Error(
            "Form 4972 multiple-copy death allocation must identify the issued plan participant and recipient",
          );
        }
      }
      const owner = source.recipient;
      if (owner !== "T" && owner !== "S") {
        throw new Error("Form 4972 source needs a taxpayer or spouse owner");
      }
      const parsed = singleFormSchema.parse({
        ...source,
        ...election,
        recipient: owner,
      });
      const computed = calculateOneForm4972.compute(ctx, parsed).outputs;
      const printed = computed.find((row) => row.nodeType === "form4972")
        ?.fields;
      const ownTax = computed.find((row) =>
        row.nodeType === "income_tax_calculation"
      )
        ?.fields.form4972_tax;
      if (!printed || typeof ownTax !== "number") {
        throw new Error(
          "Form 4972 elected participant did not calculate a form and tax",
        );
      }
      forms.push({
        ...printed,
        source_document_references: election.source_document_references,
      });
      tax += ownTax;
      const ownOrdinary = computed.find((row) => row.nodeType === "f1040")
        ?.fields.line5b_form4972_ordinary;
      const ownEstateDeduction = computed.find((row) =>
        row.nodeType === "schedule_a"
      )?.fields.line_16_other_deductions;
      if (
        (ownOrdinary !== undefined && typeof ownOrdinary !== "number") ||
        (ownEstateDeduction !== undefined &&
          typeof ownEstateDeduction !== "number")
      ) {
        throw new Error(
          "Form 4972 per-participant return amounts must be numeric",
        );
      }
      ordinary += typeof ownOrdinary === "number" ? ownOrdinary : 0;
      estateDeduction += typeof ownEstateDeduction === "number"
        ? ownEstateDeduction
        : 0;
    }
    const pairedBeneficiaries = forms.length === 2 &&
      forms.some((form) =>
        typeof form.recipient_share_pct === "number" &&
        form.recipient_share_pct < 100
      );
    if (pairedBeneficiaries) {
      const recipients = forms.map((form) => form.recipient);
      if (
        new Set(recipients).size !== 2 || !recipients.includes("T") ||
        !recipients.includes("S")
      ) {
        throw new Error(
          "Form 4972 paired beneficiary elections need separate taxpayer and spouse sources",
        );
      }
      for (const [index, form] of forms.entries()) {
        const source = sources.find((source) =>
          sameReferences(
            source.source_document_references,
            elections[index].source_document_references,
          )
        );
        const plan = source?.form4972_plan as
          | Record<string, unknown>
          | undefined;
        const election = elections[index];
        if (
          !plan || !election.participant_name || !election.participant_ssn ||
          !election.plan_reference ||
          election.participant_name !== plan.participant_name ||
          election.participant_ssn !== plan.participant_ssn ||
          election.plan_reference !== plan.plan_reference ||
          (typeof form.recipient_share_pct === "number" &&
            form.recipient_share_pct < 100 &&
            form.beneficiary_distribution !== true)
        ) {
          throw new Error(
            "Form 4972 paired beneficiary election must retain its identified participant, plan and beneficiary status",
          );
        }
      }
      reconcileSharedParticipantElections(sources, elections);
    }
    if (forms.length === 2 && !pairedBeneficiaries) {
      const recipients = forms.map((form) => form.recipient);
      const plans = sources.map((source) => source.form4972_plan);
      const sourceByElection = elections.map((election) =>
        sources.find((source) =>
          sameReferences(
            source.source_document_references,
            election.source_document_references,
          )
        )!
      );
      if (
        recipients[0] === recipients[1] ||
        !recipients.includes("T") || !recipients.includes("S") ||
        forms.some((form, index) =>
          (form.elect_10yr_averaging !== true &&
            (form.elect_capital_gain !== true ||
              typeof form.capital_gain_amount !== "number" ||
              form.capital_gain_amount <= 0 ||
              elections[index].source_document_references.length !== 1)) ||
          form.beneficiary_distribution !== false ||
          (form.federal_estate_tax ?? 0) !== 0 ||
          (form.death_benefit_exclusion ?? 0) !== 0
        ) ||
        forms.some((form, index) =>
          typeof form.box6_nua === "number" && form.box6_nua > 0 &&
          (sourceByElection[index].box6_nua !== form.box6_nua ||
            form.elect_include_nua !== true ||
            form.elect_10yr_averaging !== true ||
            (form.elect_capital_gain === true &&
              (typeof form.capital_gain_amount !== "number" ||
                form.capital_gain_amount <= 0 ||
                typeof form.lump_sum_amount !== "number" ||
                typeof form.box6_nua !== "number" ||
                ![form.lump_sum_amount, form.capital_gain_amount, form.box6_nua]
                  .every((amount) =>
                    typeof amount === "number" && isSourceMoney(amount)
                  ))))
        ) ||
        forms.some((form, index) =>
          !isSourceMoney(Number(form.annuity_actuarial_value ?? 0)) ||
          ((form.annuity_actuarial_value ?? 0) !== 0 &&
            (sourceByElection[index].annuity_actuarial_value !==
                form.annuity_actuarial_value ||
              form.elect_10yr_averaging !== true))
        ) ||
        plans.some((plan) => !plan || typeof plan !== "object") ||
        elections.some((election, index) => {
          const plan = sourceByElection[index].form4972_plan as Record<
            string,
            unknown
          >;
          return !election.participant_name || !election.participant_ssn ||
            !election.plan_reference ||
            election.participant_name !== plan.participant_name ||
            election.participant_ssn !== plan.participant_ssn ||
            election.plan_reference !== plan.plan_reference;
        }) ||
        sources.some((source) =>
          !Array.isArray(source.source_document_references) ||
          source.source_document_references.length < 1 ||
          source.beneficiary_distribution === true ||
          source.recipient_share_pct !== undefined ||
          (source.source_document_references.length > 1 &&
            source.multiple_1099r === undefined) ||
          (source.source_document_references.length === 1 &&
            source.multiple_1099r !== undefined)
        )
      ) {
        throw new Error(
          "Form 4972 paired election needs distinct taxpayer and spouse full-share plans",
        );
      }
      const [first, second] = plans as Record<string, unknown>[];
      if (
        first.participant_ssn === second.participant_ssn ||
        first.plan_reference === second.plan_reference
      ) {
        throw new Error(
          "Form 4972 spouse elections need distinct source-matched participants and plans",
        );
      }
    }
    const outputs: NodeOutput[] = [
      { nodeType: this.nodeType, fields: { forms } },
      this.outputNodes.output(income_tax_calculation, { form4972_tax: tax }),
      ...(ordinary > 0
        ? [
          this.outputNodes.output(agi_aggregator, {
            line5b_form4972_ordinary: ordinary,
          }),
          this.outputNodes.output(f1040, {
            line5b_form4972_ordinary: ordinary,
          }),
        ]
        : []),
      ...(estateDeduction > 0
        ? [
          this.outputNodes.output(scheduleA, {
            line_16_other_deductions: estateDeduction,
          }),
        ]
        : []),
    ];
    return { outputs };
  }
}

export const form4972Elections = new Form4972ElectionsNode();
