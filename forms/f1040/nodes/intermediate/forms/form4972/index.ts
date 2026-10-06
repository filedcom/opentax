import {
  allocatedSourceCents,
  filedDollars,
  grossedSourceCents,
  grossedSourceDollars,
  isSourceMoney,
  partialNuaWorksheet,
  roundRecipientTax,
  sourceCents,
  worksheetRatio,
} from "./source-rounding.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { tsSchema } from "../../../types.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

// Part II: flat 20% rate on pre-1974 capital gain portion
const CAPITAL_GAIN_RATE = 0.20;

// 2025 Form 4972 instructions, Tax Rate Schedule for lines 24 and 27.
const TAX_RATE_SCHEDULE: ReadonlyArray<{
  over: number;
  upTo: number;
  base: number;
  rate: number;
}> = [
  { over: 0, upTo: 1_190, base: 0, rate: 0.11 },
  { over: 1_190, upTo: 2_270, base: 130.90, rate: 0.12 },
  { over: 2_270, upTo: 4_530, base: 260.50, rate: 0.14 },
  { over: 4_530, upTo: 6_690, base: 576.90, rate: 0.15 },
  { over: 6_690, upTo: 9_170, base: 900.90, rate: 0.16 },
  { over: 9_170, upTo: 11_440, base: 1_297.70, rate: 0.18 },
  { over: 11_440, upTo: 13_710, base: 1_706.30, rate: 0.20 },
  { over: 13_710, upTo: 17_160, base: 2_160.30, rate: 0.23 },
  { over: 17_160, upTo: 22_880, base: 2_953.80, rate: 0.26 },
  { over: 22_880, upTo: 28_600, base: 4_441, rate: 0.30 },
  { over: 28_600, upTo: 34_320, base: 6_157, rate: 0.34 },
  { over: 34_320, upTo: 42_300, base: 8_101.80, rate: 0.38 },
  { over: 42_300, upTo: 57_190, base: 11_134.20, rate: 0.42 },
  { over: 57_190, upTo: 85_790, base: 17_388, rate: 0.48 },
  { over: 85_790, upTo: Infinity, base: 31_116, rate: 0.50 },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Taxable distribution (Form 1099-R box 2a, not gross box 1).
  lump_sum_amount: z.number().nonnegative(),

  // Pre-1974 capital gain portion (from f1099r, box3_capital_gain)
  capital_gain_amount: z.number().nonnegative().optional(),
  // Employer-security net unrealized appreciation (Form 1099-R box 6).
  box6_nua: z.number().nonnegative().optional(),
  elect_include_nua: z.boolean().optional(),

  // Eligibility: participant was born before January 2, 1936
  born_before_1936: z.boolean().optional(),
  entire_balance_distributed: z.boolean().optional(),
  rolled_over_any: z.boolean().optional(),
  beneficiary_distribution: z.boolean().optional(),
  alternate_payee_distribution: z.boolean().optional(),
  participant_five_year_member: z.boolean().optional(),
  prior_election_after_1986: z.boolean().optional(),
  prior_beneficiary_election_after_1986: z.boolean().optional(),
  participant_died_before_1996_08_21: z.boolean().optional(),

  // Part II election: apply 20% capital gain rate to pre-1974 portion
  elect_capital_gain: z.boolean().optional(),

  // Part III election: apply 10-year averaging using 1986 rate schedule
  elect_10yr_averaging: z.boolean().optional(),

  // Part III, line 9: death benefit exclusion (participant died before August 21, 1996).
  death_benefit_exclusion: z.number().nonnegative().optional(),
  // For a partial-share beneficiary, line 9 uses the full allowable ordinary
  // exclusion; Part II first removes this recipient's capital allocation.
  death_benefit_exclusion_source_reference: z.string().trim().min(1).optional(),
  death_benefit_recipient_allocated_amount: z.number().nonnegative().refine(
    isSourceMoney,
    "source amount must retain exact cents",
  )
    .optional(),
  // The plan administrator's participant-wide allocation. One row identifies
  // the elected recipient; the other rows account for the rest of the benefit.
  death_benefit_allocation: z.object({
    participant_ssn: z.string().regex(/^\d{9}$/),
    elected_recipient_ssn: z.string().regex(/^\d{9}$/),
    recipients: z.array(
      z.object({
        recipient_ssn: z.string().regex(/^\d{9}$/),
        share_pct: z.number().positive().max(100),
        excluded_amount: z.number().nonnegative().refine(
          isSourceMoney,
          "source amount must retain exact cents",
        ),
      }).strict(),
    ).min(2),
  }).strict().optional(),
  // Form 4972 lines 11 and 18.
  annuity_actuarial_value: z.number().nonnegative().optional(),
  // Form 1099-R box 8 percentage, distinct from the box 9a distribution share.
  annuity_share_pct: z.number().positive().max(100).optional(),
  federal_estate_tax: z.number().nonnegative().optional(),
  partial_estate_tax_source: z.object({
    administrator_statement_reference: z.string().trim().min(1),
    estate_tax_return_reference: z.string().trim().min(1),
    full_distribution_taxable_amount: z.number().positive().refine(
      isSourceMoney,
      "source amount must retain exact cents",
    ),
    full_distribution_federal_estate_tax: z.number().positive().refine(
      isSourceMoney,
      "source amount must retain exact cents",
    ),
    recipient_allocated_federal_estate_tax: z.number().nonnegative().refine(
      isSourceMoney,
      "source amount must retain exact cents",
    ),
  }).strict().optional(),
  // Recipient's Form 1099-R box 9a percentage. Part III grosses up the
  // ordinary amount; Part-II-only uses the recipient's own distribution.
  recipient_share_pct: z.number().positive().max(100).optional(),
  recipient: tsSchema.optional(),
  multiple_1099r: z.object({
    participant_name: z.string().trim().min(1),
    participant_ssn: z.string().regex(/^\d{9}$/),
    plan_reference: z.string().trim().min(1),
    full_balance_statement_reference: z.string().trim().min(1),
    all_qualified_distributions_included: z.literal(true),
    source_document_references: z.array(z.string().trim().min(1)).min(2),
  }).strict().optional(),
});

// The public election supplies only facts not printed in the elected 1099-R.
// Distribution amounts, box 8/9a shares, and recipient identity must arrive
// through that document, so an election cannot replace or override them.
export const publicElectionSchema = inputSchema.omit({
  lump_sum_amount: true,
  capital_gain_amount: true,
  box6_nua: true,
  annuity_actuarial_value: true,
  annuity_share_pct: true,
  recipient_share_pct: true,
  recipient: true,
  multiple_1099r: true,
}).strict();

type Form4972Input = z.infer<typeof inputSchema>;

// ─── Cross-field validation ────────────────────────────────────────────────────

function validateInput(input: Form4972Input, deathBenefitMax: number): void {
  const partialSource = (input.recipient_share_pct ?? 100) < 100;
  if (
    partialSource &&
    [
      input.lump_sum_amount,
      input.capital_gain_amount ?? 0,
      input.box6_nua ?? 0,
      input.annuity_actuarial_value ?? 0,
      input.death_benefit_exclusion ?? 0,
      input.federal_estate_tax ?? 0,
    ]
      .some((value) => !isSourceMoney(value))
  ) {
    throw new Error(
      "form4972: partial-share issued and administrator amounts must retain exact source cents",
    );
  }
  if (input.multiple_1099r) {
    const refs = input.multiple_1099r.source_document_references;
    const partialMultiple = (input.recipient_share_pct ?? 100) < 100;
    if (
      new Set(refs).size !== refs.length ||
      (input.recipient !== "T" && input.recipient !== "S") ||
      (partialMultiple
        ? input.beneficiary_distribution !== true ||
          input.participant_five_year_member !== false
        : input.beneficiary_distribution !== false ||
          input.participant_five_year_member !== true) ||
      input.elect_10yr_averaging !== true ||
      (input.elect_capital_gain === true &&
        (input.capital_gain_amount ?? 0) <= 0) ||
      ((input.box6_nua ?? 0) > 0 &&
        (input.elect_include_nua !== true ||
          [
            input.lump_sum_amount,
            input.capital_gain_amount ?? 0,
            input.box6_nua ?? 0,
          ].some((amount) => !isSourceMoney(amount)))) ||
      ((input.box6_nua ?? 0) === 0 &&
        input.elect_include_nua === true) ||
      (!partialMultiple &&
        !isSourceMoney(input.annuity_actuarial_value ?? 0)) ||
      (partialMultiple && (input.annuity_actuarial_value ?? 0) > 0 &&
        input.annuity_share_pct === undefined) ||
      (!partialMultiple &&
        ((input.death_benefit_exclusion ?? 0) !== 0 ||
          (input.federal_estate_tax ?? 0) !== 0))
    ) {
      throw new Error(
        "form4972: multiple Form 1099-R sources require one identified participant and a sourced Part-III recipient share, with matching Part II capital gain if elected",
      );
    }
  }
  if (!input.recipient) {
    throw new Error(
      "form4972: elected distribution needs a taxpayer or spouse recipient",
    );
  }
  const partialShare = (input.recipient_share_pct ?? 100) < 100;
  const deathBenefit = input.death_benefit_exclusion ?? 0;
  const partialDeathBenefit = partialShare && deathBenefit > 0;
  const recipientShare = (input.recipient_share_pct ?? 100) / 100;
  const partialNuaEstateCombination = partialShare &&
    input.elect_10yr_averaging === true &&
    input.elect_include_nua === true && (input.box6_nua ?? 0) > 0 &&
    (input.federal_estate_tax ?? 0) > 0 &&
    input.partial_estate_tax_source !== undefined &&
    (input.elect_capital_gain !== true ||
      (input.capital_gain_amount ?? 0) > 0) &&
    ((input.annuity_actuarial_value ?? 0) === 0 ||
      input.annuity_share_pct !== undefined);
  const partialDeathAndEstatePartIII = partialDeathBenefit &&
    (input.federal_estate_tax ?? 0) > 0 &&
    input.elect_10yr_averaging === true &&
    input.elect_capital_gain !== true &&
    (input.capital_gain_amount ?? 0) === 0 &&
    input.elect_include_nua !== true &&
    (input.box6_nua ?? 0) === 0 &&
    (input.annuity_actuarial_value ?? 0) === 0;
  const partialNuaDeathEstatePartIII = partialDeathBenefit &&
    (input.federal_estate_tax ?? 0) > 0 &&
    input.elect_10yr_averaging === true &&
    input.elect_capital_gain === true &&
    (input.capital_gain_amount ?? 0) > 0 &&
    input.elect_include_nua === true &&
    (input.box6_nua ?? 0) > 0 &&
    (input.annuity_actuarial_value ?? 0) === 0;
  const partialNuaDeathAnnuityEstatePartIII = partialDeathBenefit &&
    (input.federal_estate_tax ?? 0) > 0 &&
    (input.annuity_actuarial_value ?? 0) > 0 &&
    input.elect_10yr_averaging === true &&
    input.elect_capital_gain === true &&
    (input.capital_gain_amount ?? 0) > 0 &&
    input.elect_include_nua === true &&
    (input.box6_nua ?? 0) > 0 &&
    input.annuity_share_pct !== undefined;
  const partialAnnuityAndEstatePartIII = partialShare &&
    (input.annuity_actuarial_value ?? 0) > 0 &&
    (input.federal_estate_tax ?? 0) > 0 &&
    input.elect_10yr_averaging === true &&
    input.elect_capital_gain !== true &&
    (input.capital_gain_amount ?? 0) === 0 &&
    input.elect_include_nua !== true &&
    (input.box6_nua ?? 0) === 0 &&
    deathBenefit === 0;
  const partialNuaAnnuityEstatePartIII = partialShare &&
    (input.annuity_actuarial_value ?? 0) > 0 &&
    (input.federal_estate_tax ?? 0) > 0 &&
    input.elect_10yr_averaging === true &&
    input.elect_capital_gain !== true &&
    (input.capital_gain_amount ?? 0) === 0 &&
    input.elect_include_nua === true &&
    (input.box6_nua ?? 0) > 0 &&
    deathBenefit === 0;
  const partialDeathAndAnnuityPartIII = partialDeathBenefit &&
    (input.annuity_actuarial_value ?? 0) > 0 &&
    input.elect_10yr_averaging === true &&
    input.elect_capital_gain !== true &&
    (input.capital_gain_amount ?? 0) === 0 &&
    input.elect_include_nua !== true &&
    (input.box6_nua ?? 0) === 0 &&
    (input.federal_estate_tax ?? 0) === 0;
  const partialDeathAnnuityEstatePartIII = partialDeathBenefit &&
    (input.annuity_actuarial_value ?? 0) > 0 &&
    (input.federal_estate_tax ?? 0) > 0 &&
    input.elect_10yr_averaging === true &&
    input.elect_capital_gain !== true &&
    (input.capital_gain_amount ?? 0) === 0 &&
    input.elect_include_nua !== true &&
    (input.box6_nua ?? 0) === 0;
  if (
    !partialDeathBenefit &&
    (input.death_benefit_exclusion_source_reference !== undefined ||
      input.death_benefit_recipient_allocated_amount !== undefined ||
      input.death_benefit_allocation !== undefined)
  ) {
    throw new Error(
      "form4972: partial-share death-benefit source facts need a positive full allowable exclusion",
    );
  }
  if (
    partialDeathBenefit &&
    ((input.elect_10yr_averaging !== true &&
      input.elect_capital_gain !== true) ||
      ((input.annuity_actuarial_value ?? 0) > 0 &&
        !partialDeathAndAnnuityPartIII &&
        !partialDeathAnnuityEstatePartIII &&
        !partialNuaDeathAnnuityEstatePartIII && !partialNuaEstateCombination) ||
      ((input.federal_estate_tax ?? 0) > 0 &&
        !partialDeathAndEstatePartIII &&
        !partialDeathAnnuityEstatePartIII &&
        !partialNuaDeathEstatePartIII &&
        !partialNuaDeathAnnuityEstatePartIII && !partialNuaEstateCombination) ||
      !input.death_benefit_exclusion_source_reference ||
      sourceCents(input.death_benefit_recipient_allocated_amount!) !==
        allocatedSourceCents(deathBenefit, input.recipient_share_pct!))
  ) {
    throw new Error(
      "form4972: partial-share death benefit needs Part II or III and an administrator source matching the full exclusion and recipient allocation; combined estate tax requires a reviewed Part III allocation",
    );
  }
  if (partialDeathBenefit) {
    const allocation = input.death_benefit_allocation;
    const rows = allocation?.recipients ?? [];
    const elected = rows.filter((row) =>
      row.recipient_ssn === allocation?.elected_recipient_ssn
    );
    if (
      !allocation || new Set(rows.map((row) => row.recipient_ssn)).size !==
        rows.length ||
      Math.abs(rows.reduce((sum, row) => sum + row.share_pct, 0) - 100) >
        0.000000001 ||
      rows.reduce((sum, row) => sum + sourceCents(row.excluded_amount), 0) !==
        sourceCents(deathBenefit) ||
      rows.some((row) =>
        sourceCents(row.excluded_amount) !==
          allocatedSourceCents(deathBenefit, row.share_pct)
      ) ||
      elected.length !== 1 || elected[0].share_pct !==
        input.recipient_share_pct ||
      elected[0].excluded_amount !==
        input.death_benefit_recipient_allocated_amount
    ) {
      throw new Error(
        "form4972: partial-share death benefit needs a complete participant-wide recipient percentage and exclusion allocation",
      );
    }
  }
  if (
    partialShare &&
    ((input.elect_10yr_averaging !== true &&
      input.elect_capital_gain !== true) ||
      ((input.elect_include_nua === true || (input.box6_nua ?? 0) > 0) &&
        !(input.elect_include_nua === true &&
          (input.box6_nua ?? 0) > 0)) ||
      ((input.annuity_actuarial_value ?? 0) > 0 &&
        (input.elect_10yr_averaging !== true ||
          input.annuity_share_pct === undefined)) ||
      ((input.federal_estate_tax ?? 0) > 0 &&
        ((input.elect_10yr_averaging !== true &&
          input.elect_capital_gain !== true) ||
          (input.elect_10yr_averaging === true &&
            input.elect_capital_gain === true &&
            !(input.elect_include_nua === true &&
              (input.box6_nua ?? 0) > 0 &&
              (input.capital_gain_amount ?? 0) > 0)) ||
          ((input.annuity_actuarial_value ?? 0) > 0 &&
            !partialAnnuityAndEstatePartIII &&
            !partialNuaAnnuityEstatePartIII &&
            !partialDeathAnnuityEstatePartIII &&
            !partialNuaDeathAnnuityEstatePartIII &&
            !partialNuaEstateCombination) ||
          (deathBenefit > 0 && !partialDeathAndEstatePartIII &&
            !partialDeathAnnuityEstatePartIII &&
            !partialNuaDeathEstatePartIII &&
            !partialNuaDeathAnnuityEstatePartIII &&
            !partialNuaEstateCombination))))
  ) {
    throw new Error(
      "form4972: partial box 9a share supports Part II or III with optional elected NUA, Part III with an annuity and its separate box 8 percentage, or bounded sourced beneficiary death benefit and estate tax; other combinations remain unsupported",
    );
  }
  const estateSource = input.partial_estate_tax_source;
  if (partialShare && (input.federal_estate_tax ?? 0) > 0) {
    if (
      !estateSource ||
      estateSource.administrator_statement_reference ===
        estateSource.estate_tax_return_reference ||
      sourceCents(estateSource.full_distribution_taxable_amount) !==
        grossedSourceCents(
          input.lump_sum_amount +
            (input.elect_include_nua === true ? (input.box6_nua ?? 0) : 0),
          input.recipient_share_pct!,
        ) ||
      estateSource.full_distribution_federal_estate_tax !==
        input.federal_estate_tax ||
      (partialDeathBenefit &&
        (estateSource.administrator_statement_reference ===
            input.death_benefit_exclusion_source_reference ||
          estateSource.estate_tax_return_reference ===
            input.death_benefit_exclusion_source_reference)) ||
      sourceCents(estateSource.recipient_allocated_federal_estate_tax) !==
        allocatedSourceCents(
          input.federal_estate_tax!,
          input.recipient_share_pct!,
        )
    ) {
      throw new Error(
        "form4972: partial-share estate tax needs distinct administrator and estate-return sources matching the full distribution, tax, and recipient allocation",
      );
    }
  } else if (estateSource !== undefined) {
    throw new Error(
      "form4972: partial-share estate source requires a positive shared estate-tax adjustment",
    );
  }
  if (input.alternate_payee_distribution === true) {
    throw new Error(
      "form4972: qualified alternate-payee election needs separate Form 4972 review",
    );
  }
  if (
    input.born_before_1936 !== true ||
    input.entire_balance_distributed !== true ||
    input.rolled_over_any !== false ||
    typeof input.beneficiary_distribution !== "boolean" ||
    typeof input.participant_five_year_member !== "boolean" ||
    (input.beneficiary_distribution === true &&
      input.participant_five_year_member === true) ||
    !(
      input.beneficiary_distribution === true ||
      input.participant_five_year_member === true
    ) ||
    (input.beneficiary_distribution === true
      ? input.prior_beneficiary_election_after_1986 !== false
      : input.prior_election_after_1986 !== false)
  ) {
    throw new Error(
      "form4972: elected distribution lacks qualifying plan, rollover, participant, or prior-election facts",
    );
  }
  const capGain = input.capital_gain_amount ?? 0;
  if (capGain > input.lump_sum_amount) {
    throw new Error(
      `form4972: capital_gain_amount (${capGain}) cannot exceed lump_sum_amount (${input.lump_sum_amount})`,
    );
  }
  if (deathBenefit > deathBenefitMax) {
    throw new Error(
      `form4972: death_benefit_exclusion (${deathBenefit}) cannot exceed ${deathBenefitMax}`,
    );
  }
  const taxableDistributionForDeathBenefit = partialDeathBenefit
    ? (input.lump_sum_amount +
      (input.elect_include_nua === true ? input.box6_nua ?? 0 : 0)) /
      recipientShare
    : input.lump_sum_amount +
      (input.elect_include_nua === true ? input.box6_nua ?? 0 : 0);
  if (deathBenefit > taxableDistributionForDeathBenefit) {
    throw new Error(
      "form4972: death benefit exclusion cannot exceed the taxable distribution",
    );
  }
  if (
    deathBenefit > 0 &&
    (input.beneficiary_distribution !== true ||
      input.participant_died_before_1996_08_21 !== true)
  ) {
    throw new Error(
      "form4972: death benefit exclusion requires a pre-August-21-1996 beneficiary distribution",
    );
  }
  if (
    (input.federal_estate_tax ?? 0) > 0 &&
    input.beneficiary_distribution !== true
  ) {
    throw new Error(
      "form4972: federal estate tax adjustment requires a beneficiary distribution",
    );
  }
  if (
    input.elect_include_nua === true &&
    !(input.box6_nua !== undefined && input.box6_nua > 0)
  ) {
    throw new Error(
      "form4972: NUA inclusion election needs a positive Form 1099-R box 6 amount",
    );
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function taxOnSchedule(amount: number): number {
  if (amount <= 0) return 0;
  const bracket = TAX_RATE_SCHEDULE.find(({ upTo }) => amount <= upTo)!;
  return bracket.base + (amount - bracket.over) * bracket.rate;
}

// Part II tax: 20% on the capital gain portion (Line 7)
function partIITax(capitalGain: number): number {
  return Math.round(capitalGain * CAPITAL_GAIN_RATE);
}

function partIIILines(
  ordinaryIncome: number,
  deathBenefit: number,
  annuityValue: number,
  federalEstateTax: number,
) {
  const line10 = Math.max(0, filedDollars(ordinaryIncome - deathBenefit));
  const line12 = filedDollars(line10 + annuityValue);
  const line13 = line12 < 70_000
    ? filedDollars(Math.min(10_000, line12 * 0.5))
    : 0;
  const line14 = line12 < 70_000 ? Math.max(0, line12 - 20_000) : 0;
  const line15 = filedDollars(line14 * 0.2);
  const line16 = Math.max(0, line13 - line15);
  const line17 = line12 - line16;
  const line19 = Math.max(0, filedDollars(line17 - federalEstateTax));
  const line20 = annuityValue > 0 && line12 > 0
    ? worksheetRatio(annuityValue, line12)
    : 0;
  const line21 = filedDollars(line16 * line20);
  const line22 = Math.max(0, filedDollars(annuityValue - line21));
  const line23 = filedDollars(line19 * 0.1);
  const line24 = filedDollars(taxOnSchedule(line23));
  const line25 = line24 * 10;
  const line26 = filedDollars(line22 * 0.1);
  const line27 = filedDollars(taxOnSchedule(line26));
  const line28 = line27 * 10;
  const line29 = Math.max(0, line25 - line28);
  return {
    line10,
    line12,
    line13,
    line14,
    line15,
    line16,
    line17,
    line19,
    line20,
    line21,
    line22,
    line23,
    line24,
    line25,
    line26,
    line27,
    line28,
    line29,
  };
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form4972Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4972";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    income_tax_calculation,
    agi_aggregator,
    f1040,
    scheduleA,
  ]);

  compute(ctx: NodeContext, rawInput: Form4972Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    // Require at least one election
    const electCapGain = input.elect_capital_gain === true;
    const elect10yr = input.elect_10yr_averaging === true;
    if (!electCapGain && !elect10yr) {
      throw new Error(
        "form4972: taxable distribution has no 20% or ten-year election",
      );
    }

    validateInput(input, cfg.deathBenefitMax);

    const partialShare = (input.recipient_share_pct ?? 100) < 100;
    const box2aTaxable = partialShare
      ? input.lump_sum_amount
      : Math.round(input.lump_sum_amount);
    const box3CapitalGain = partialShare
      ? (input.capital_gain_amount ?? 0)
      : Math.round(input.capital_gain_amount ?? 0);
    const includedNua = input.elect_include_nua === true
      ? (partialShare ? (input.box6_nua ?? 0) : Math.round(input.box6_nua ?? 0))
      : 0;
    const nuaCapitalGain = includedNua > 0 && box2aTaxable > 0
      ? (partialShare
        ? partialNuaWorksheet(box2aTaxable, box3CapitalGain, includedNua)
          .capital
        : Math.round(includedNua * box3CapitalGain / box2aTaxable))
      : 0;
    const recipientShare = (input.recipient_share_pct ?? 100) / 100;
    const annuityValue = partialShare
      ? grossedSourceDollars(
        input.annuity_actuarial_value ?? 0,
        input.annuity_share_pct ?? 100,
      )
      : Math.round(input.annuity_actuarial_value ?? 0);
    const taxableAmount = partialShare
      ? grossedSourceDollars(
        box2aTaxable + includedNua,
        input.recipient_share_pct!,
      )
      : box2aTaxable + includedNua;
    const capitalGain = box3CapitalGain + nuaCapitalGain;
    const deathBenefit = partialShare
      ? (input.death_benefit_exclusion ?? 0)
      : Math.round(input.death_benefit_exclusion ?? 0);
    if (electCapGain && capitalGain === 0) {
      throw new Error(
        "form4972: Part II election needs a positive box 3 capital gain",
      );
    }
    const allocationRatio = partialShare && electCapGain
      ? worksheetRatio(capitalGain, box2aTaxable + includedNua)
      : 0;
    const deathBenefitCapitalShare = electCapGain && taxableAmount > 0
      ? (partialShare
        ? (input.death_benefit_recipient_allocated_amount ?? 0) *
          allocationRatio
        : Math.round(deathBenefit * capitalGain / taxableAmount))
      : 0;
    // The Death Benefit Worksheet reduces the recipient's Part II capital
    // amount by their allocated exclusion. For multiple recipients, line 9
    // instead starts with the full allowable exclusion before line 29 prorates
    // Part III tax. Its capital fraction uses this recipient's box 3 / box 2a.
    const fullDeathBenefitCapitalShare = partialShare && electCapGain &&
        box2aTaxable + includedNua > 0
      ? deathBenefit * allocationRatio
      : deathBenefitCapitalShare;
    const ordinaryDeathBenefit = (partialShare ? filedDollars : Math.round)(
      deathBenefit - fullDeathBenefitCapitalShare,
    );
    const federalEstateTax = partialShare
      ? (input.federal_estate_tax ?? 0)
      : Math.round(input.federal_estate_tax ?? 0);
    const partialCapitalEstate = partialShare && electCapGain &&
      federalEstateTax > 0;
    const estateTaxForCapital = partialCapitalEstate
      ? input.partial_estate_tax_source!.recipient_allocated_federal_estate_tax
      : federalEstateTax;
    const estateTaxCapitalShare = electCapGain && taxableAmount > 0
      ? (partialCapitalEstate
        ? estateTaxForCapital * allocationRatio
        : Math.round(
          estateTaxForCapital * capitalGain / taxableAmount,
        ))
      : 0;
    const fullEstateCapitalShare = partialCapitalEstate && elect10yr
      ? federalEstateTax * allocationRatio
      : estateTaxCapitalShare;
    const ordinaryEstateTax = (partialShare ? filedDollars : Math.round)(
      (partialCapitalEstate && !elect10yr
        ? estateTaxForCapital
        : federalEstateTax) - fullEstateCapitalShare,
    );
    if (
      deathBenefitCapitalShare + estateTaxCapitalShare > capitalGain ||
      ordinaryDeathBenefit + ordinaryEstateTax >
        (partialCapitalEstate && !elect10yr
            ? box2aTaxable + includedNua
            : taxableAmount) -
          (electCapGain ? capitalGain : 0)
    ) {
      throw new Error(
        "form4972: death benefit and estate tax exceed their allocated distribution portions",
      );
    }

    // Part II: 20% tax on pre-1974 capital gain (only if elected and > 0)
    const capitalGainElected = electCapGain
      ? (partialShare ? filedDollars : Math.round)(
        capitalGain - deathBenefitCapitalShare - estateTaxCapitalShare,
      )
      : 0;
    const partIITaxAmt = electCapGain ? partIITax(capitalGainElected) : 0;

    // 2025 multiple-recipient Steps 2-3 gross up the ordinary portion for
    // Part III. A Part-II-only election instead reports the recipient's own
    // ordinary portion on Form 1040 line 5b; line 6/7 remain their own share.
    const ordinaryIncome = partialShare && elect10yr && electCapGain
      ? grossedSourceDollars(
        box2aTaxable - box3CapitalGain + includedNua - nuaCapitalGain,
        input.recipient_share_pct!,
      )
      : partialShare && !elect10yr
      ? box2aTaxable - (electCapGain ? box3CapitalGain : 0) +
        includedNua - (electCapGain ? nuaCapitalGain : 0)
      : taxableAmount - (electCapGain ? capitalGain : 0);
    const recipientOrdinaryDeathBenefit = partialShare && !elect10yr
      ? deathBenefit * recipientShare - deathBenefitCapitalShare
      : ordinaryDeathBenefit;
    const ordinaryIncomeOn1040 = Math.max(
      0,
      Math.round(ordinaryIncome - recipientOrdinaryDeathBenefit),
    );
    const partIII = elect10yr
      ? partIIILines(
        ordinaryIncome,
        ordinaryDeathBenefit,
        annuityValue,
        ordinaryEstateTax,
      )
      : undefined;
    const recipientPartIIITax = partialShare
      ? roundRecipientTax(partIII?.line29 ?? 0, input.recipient_share_pct!)
      : partIII?.line29 ?? 0;
    const totalTax = Math.round(partIITaxAmt + recipientPartIIITax);

    // A zero-tax election cannot silently suppress a 1099-R distribution.
    // The Part-II-only shape may also lack every nonzero line required by
    // IRS business rule F4972-006 after rounding.
    if (totalTax === 0) {
      throw new Error(
        "form4972: elected distribution has zero special tax; review ordinary-income treatment before filing",
      );
    }

    const outputs: NodeOutput[] = [
      {
        nodeType: this.nodeType,
        fields: {
          ...input,
          ...(electCapGain
            ? {
              line6: capitalGainElected,
              line7: partIITaxAmt,
              ...(nuaCapitalGain > 0
                ? {
                  line6_nua_capital_gain:
                    (partialShare ? filedDollars : Math.round)(nuaCapitalGain),
                }
                : {}),
            }
            : {}),
          ...(partIII
            ? {
              line8: ordinaryIncome,
              ...(includedNua > 0
                ? {
                  line8_nua_included: Math.round(
                    (electCapGain
                      ? includedNua - nuaCapitalGain
                      : includedNua) /
                      recipientShare,
                  ),
                }
                : {}),
              line9: ordinaryDeathBenefit,
              line10: partIII.line10,
              line11: annuityValue,
              line12: partIII.line12,
              ...(partIII.line12 < 70_000
                ? {
                  line13: partIII.line13,
                  line14: partIII.line14,
                  line15: partIII.line15,
                  line16: partIII.line16,
                }
                : {}),
              line17: partIII.line17,
              line18: ordinaryEstateTax,
              line19: partIII.line19,
              ...(partIII.line20 > 0
                ? { line20: partIII.line20, line21: partIII.line21 }
                : {}),
              ...(partIII.line20 > 0 ? { line22: partIII.line22 } : {}),
              line23: partIII.line23,
              line24: partIII.line24,
              line25: partIII.line25,
              ...(partIII.line20 > 0
                ? { line26: partIII.line26, line27: partIII.line27 }
                : {}),
              ...(partIII.line20 > 0 ? { line28: partIII.line28 } : {}),
              line29: recipientPartIIITax,
              line30: totalTax,
            }
            : {}),
        },
      },
      this.outputNodes.output(income_tax_calculation, {
        form4972_tax: totalTax,
      }),
      ...(electCapGain && !elect10yr
        ? [
          this.outputNodes.output(agi_aggregator, {
            line5b_form4972_ordinary: ordinaryIncomeOn1040,
          }),
          this.outputNodes.output(f1040, {
            line5b_form4972_ordinary: ordinaryIncomeOn1040,
          }),
          ...(ordinaryEstateTax > 0
            ? [
              // Unlike the 10-year option's line 18 adjustment, the ordinary
              // portion is IRD taxed on Form 1040 line 5b. Its estate-tax
              // deduction is a Schedule A line 16 item, not an AGI reduction.
              this.outputNodes.output(scheduleA, {
                line_16_other_deductions: ordinaryEstateTax,
              }),
            ]
            : []),
        ]
        : []),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form4972 = new Form4972Node();
