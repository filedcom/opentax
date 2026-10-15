import {
  calculateCareEarnedIncome2026,
  type CareAnnualEarnings2026,
  careCombatElections2026Schema,
  careEarnedIncomeReview2026Schema,
  type CareOwner2026,
} from "./dependent-care-earned.ts";
import { passesRelationshipTest } from "../../nodes/inputs/general/filing/general/index.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { dependentCare2026 } from "../../nodes/config/2026-dependent-care.ts";
import {
  calculateForm2441Benefits,
  careProviderSchema,
  type Form2441FilingDetails,
} from "../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";
import { dependent2026Schema } from "./dependents.ts";
import { w2Item2026Schema } from "./w2.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";

const money = z.number().finite().nonnegative();
const whole = money.int();
const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const normalize = (s: string) => s.replaceAll("-", "");

/** First source slice: ordinary W-2 earnings and care for dependent children.
 * Expense rows are receipt facts, never calculated credits or AGI. */
export const dependentCareClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    review_reference: reference,
    ordinary_w2_earnings_only: z.literal(true),
    earned_income: careEarnedIncomeReview2026Schema,
    combat_pay_elections: careCombatElections2026Schema,
    no_prior_year_expenses_paid: z.literal(true),
    no_proprietor_or_partner_benefits: z.literal(true),
    no_foreign_tax_or_form8978_credit: z.literal(true),
    no_spouse_death_during_year: z.literal(true),
    care_enabled_work_or_job_search: z.literal(true),
    eligible_unrelated_providers_reviewed: z.literal(true),
    no_medical_deduction_or_other_reimbursement_for_these_expenses: z.literal(
      true,
    ),
    providers: z.array(careProviderSchema).min(1).max(25),
    children: z.array(
      z.object({
        ssn: tin,
        care_only_while_under_13: z.literal(true),
        custodial_parent_and_dependency_requirements_met: z.literal(true),
      }).strict(),
    ).min(1).max(25),
    expenses: z.array(
      z.object({
        receipt_reference: reference,
        provider_index: z.number().int().nonnegative(),
        child_ssn: tin,
        // This slice excludes deferred, prepaid and prior-year care.
        qualified_amount_incurred_and_paid_in_2026: whole,
      }).strict(),
    ).max(500),
    benefits: z.object({
      plan_record_reference: reference,
      plan_maximum_exclusion: whole,
      carryover_used_in_2026: whole,
      carryover_owner: z.enum(["taxpayer", "spouse"]).optional(),
      forfeited_or_carried_to_2027: whole,
      w2_box10_reviews: z.array(
        z.object({
          source_document_reference: reference,
          amount_already_in_box1: money,
        }).strict(),
      ),
    }).strict().optional(),
  }).strict(),
}).strict();
export const inputSchema = dependentCareClaim2026Schema.partial().extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
  dependents: z.array(dependent2026Schema).default([]),
  wage_sources: z.array(w2Item2026Schema).default([]),
  dep_care_benefits: money.optional(),
}).strict();
export type DependentCareInput2026 = z.input<typeof inputSchema>;

export function calculateDependentCareBenefits2026(
  raw: DependentCareInput2026,
) {
  const input = inputSchema.parse(raw);
  const claim = input.claim;
  const box10 = input.wage_sources.reduce(
    (sum, w) => sum + (w.box10_dep_care ?? 0),
    0,
  );
  if (Math.abs(box10 - (input.dep_care_benefits ?? 0)) > .000001) {
    throw new Error("Form 2441 benefits disagree with original W-2 sources");
  }
  if (!claim) {
    if (box10 > 0) {
      throw new Error(
        "W-2 dependent-care benefits need Form 2441 source review",
      );
    }
    return {
      source_input: input,
      details: null,
      benefits: 0,
      lines: null,
      credit_income: null,
    };
  }
  if (input.filing_status === FilingStatus.MFS) {
    throw new Error(
      "Form 2441 separate returns need the considered-unmarried and spouse-income source owner",
    );
  }
  if (claim.providers.some((p) => p.household_employee)) {
    throw new Error(
      "Form 2441 household employees need Schedule H reconciliation",
    );
  }
  if (input.wage_sources.some((w) => w.box13_statutory_employee)) {
    throw new Error(
      "Form 2441 statutory employees need the self-employment earned-income worksheet",
    );
  }
  const familyTins = new Set(
    [
      input.taxpayer_ssn,
      input.spouse_ssn,
      ...input.dependents.map((d) => d.ssn),
    ].filter((s): s is string => !!s).map(normalize),
  );
  const providerTins = new Set<string>();
  for (const p of claim.providers) {
    const tin = p.kind === "person" ? p.ssn : p.ein;
    const key = `${p.kind}:${tin}`;
    if (providerTins.has(key)) {
      throw new Error("Duplicate care provider identity");
    }
    providerTins.add(key);
    if (p.kind === "person" && familyTins.has(tin)) {
      throw new Error(
        "Care provider cannot be the filer, spouse or a listed dependent",
      );
    }
  }
  const reviews = claim.benefits?.w2_box10_reviews ?? [];
  const reviewed = new Set<string>();
  let alreadyBox1 = 0;
  const annual: CareAnnualEarnings2026 = {
    taxpayer: { wages: 0, combat: 0, taxable_care: 0 },
    spouse: { wages: 0, combat: 0, taxable_care: 0 },
  };
  const benefitOwners = new Set<CareOwner2026>();
  for (const w of input.wage_sources) {
    const owner = normalize(w.employee_ssn) === normalize(input.taxpayer_ssn)
      ? "taxpayer"
      : input.spouse_ssn &&
          normalize(w.employee_ssn) === normalize(input.spouse_ssn)
      ? "spouse"
      : undefined;
    if (!owner) throw new Error("Care earned income has an unknown W-2 owner");
    const rows = reviews.filter((r) =>
      r.source_document_reference === w.source_document_reference
    );
    if ((w.box10_dep_care ?? 0) > 0 && rows.length !== 1) {
      throw new Error(
        "Each W-2 box 10 needs exactly one already-in-box-1 review",
      );
    }
    if (rows.length > 1) throw new Error("Duplicate care benefit W-2 review");
    const included = rows[0]?.amount_already_in_box1 ?? 0;
    if (included > Math.min(w.box1_wages, w.box10_dep_care ?? 0)) {
      throw new Error("Care benefits already in box 1 exceed W-2 amounts");
    }
    if (rows.length) reviewed.add(w.source_document_reference);
    alreadyBox1 += included;
    annual[owner].wages += w.box1_wages;
    annual[owner].combat += (w.box12_entries ?? []).filter((e) =>
      e.code === "Q"
    ).reduce((n, e) => n + e.amount, 0);
    if ((w.box10_dep_care ?? 0) > included) benefitOwners.add(owner);
  }
  if (reviewed.size !== reviews.length) {
    throw new Error("Care benefit review references an unknown W-2");
  }
  const benefits = roundWholeDollars(box10 - alreadyBox1);
  const joint = input.filing_status === FilingStatus.MFJ;
  if ((claim.benefits?.carryover_used_in_2026 ?? 0) > 0) {
    const owner = claim.benefits?.carryover_owner;
    if (joint && !owner) {
      throw new Error("Joint care carryover needs the source plan owner");
    }
    if (!joint && owner === "spouse") {
      throw new Error("Spouse care carryover needs a joint return");
    }
    benefitOwners.add(owner ?? "taxpayer");
  }
  if (box10 > 0 && !claim.benefits) {
    throw new Error("Care benefits need employer plan records");
  }
  const people = claim.children.map((c) => {
    const matches = input.dependents.filter((d) =>
      normalize(d.ssn ?? "") === normalize(c.ssn)
    );
    const d = matches[0];
    if (
      matches.length !== 1 || !d || d.claim_as_dependent === false ||
      !passesRelationshipTest(d) || d.dependent_on_another_return === true ||
      d.provided_over_half_own_support !== false ||
      d.filed_joint_return_except_refund_only !== false ||
      !d.dob || d.dob <= "2013-01-01" || d.dob > "2026-12-31" ||
      (d.months_in_home ?? 0) <= 6
    ) {
      throw new Error(
        "Care child needs matching dependent, under-13 age and over-half-year residence facts",
      );
    }
    return {
      first_name: d.first_name,
      last_name: d.last_name,
      name_control: d.last_name.replace(/[^A-Za-z]/g, "").slice(0, 4)
        .toUpperCase(),
      ssn: normalize(c.ssn),
      credit_expenses_paid: 0,
    };
  });
  if (new Set(people.map((p) => p.ssn)).size !== people.length) {
    throw new Error("Duplicate care child");
  }
  const paidByProvider = claim.providers.map(() => 0);
  const receipts = new Set<string>();
  for (const row of claim.expenses) {
    const person = people.find((p) => p.ssn === normalize(row.child_ssn));
    if (!person || !claim.providers[row.provider_index]) {
      throw new Error("Care receipt references an unknown child or provider");
    }
    if (receipts.has(row.receipt_reference)) {
      throw new Error("Duplicate care receipt reference");
    }
    receipts.add(row.receipt_reference);
    person.credit_expenses_paid +=
      row.qualified_amount_incurred_and_paid_in_2026;
    paidByProvider[row.provider_index] +=
      row.qualified_amount_incurred_and_paid_in_2026;
  }
  if (paidByProvider.some((v, i) => v > claim.providers[i].amount_paid)) {
    throw new Error(
      "Qualified care receipts exceed the amount paid to the provider",
    );
  }
  const expenses = people.reduce((n, p) => n + p.credit_expenses_paid, 0);
  const benefitIncome = calculateCareEarnedIncome2026(
    claim.earned_income,
    claim.combat_pay_elections,
    annual,
    people.length,
    joint,
    "benefits",
  );
  const details: Form2441FilingDetails = {
    filing_status: input.filing_status,
    care_providers: claim.providers,
    qualifying_people: people.map((p) => ({ ...p, credit_expenses_paid: 0 })),
    taxpayer_earned_income: benefitIncome.taxpayer,
    spouse_earned_income: benefitIncome.spouse,
    tax_liability_limit: 0,
    total_qualified_expenses_incurred: expenses,
    benefits_carryover_used: claim.benefits?.carryover_used_in_2026 ?? 0,
    benefits_forfeited_or_carried_forward:
      claim.benefits?.forfeited_or_carried_to_2027 ?? 0,
    dependent_care_plan_limit: claim.benefits?.plan_maximum_exclusion,
  };
  if ((details.benefits_forfeited_or_carried_forward ?? 0) > benefits) {
    throw new Error(
      "Forfeited or carried-forward care benefits must be included on line 12",
    );
  }
  const preliminary = calculateForm2441Benefits(
    details,
    benefits,
    dependentCare2026,
  );
  // Allocate the exclusion to receipt-backed expenses once. The allocation
  // changes printed per-child amounts, never the credit's overall cap.
  let remaining = preliminary.line25;
  details.qualifying_people = people.map((p) => {
    const used = Math.min(remaining, p.credit_expenses_paid);
    remaining -= used;
    return { ...p, credit_expenses_paid: p.credit_expenses_paid - used };
  });
  const lines = calculateForm2441Benefits(details, benefits, dependentCare2026);
  if (lines.line26 > 0) {
    if (benefitOwners.size !== 1) {
      throw new Error(
        "Taxable benefits from multiple spouses need per-spouse exclusion allocation",
      );
    }
    annual[[...benefitOwners][0]].taxable_care = lines.line26;
  }
  const creditIncome = calculateCareEarnedIncome2026(
    claim.earned_income,
    claim.combat_pay_elections,
    annual,
    people.length,
    joint,
    "credit",
  );
  const part3 = box10 > 0 || (details.benefits_carryover_used ?? 0) > 0 ||
    (details.benefits_forfeited_or_carried_forward ?? 0) > 0;
  details.student_or_disabled_deemed_income_used =
    creditIncome.deemed_income_used ||
    (part3 && benefitIncome.deemed_income_used);
  const totalWages = roundWholeDollars(
    input.wage_sources.reduce((n, w) => n + w.box1_wages, 0),
  );
  return {
    source_input: input,
    details,
    benefits,
    lines,
    expected_wage_income: totalWages + lines.line26,
    earned_income_worksheets: { benefits: benefitIncome, credit: creditIncome },
    credit_income: {
      taxpayer: creditIncome.taxpayer,
      spouse: creditIncome.spouse,
    },
  };
}

class DependentCareBenefitsNode2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form2441";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["f1040", "agi_aggregator", "f2441"];
  }
  compute(ctx: NodeContext, raw: DependentCareInput2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Care benefits need f1040:2026 context");
    }
    const result = calculateDependentCareBenefits2026(raw);
    return {
      outputs: [
        { nodeType: "form2441", fields: { calculation_2026: result } },
        { nodeType: "f2441", fields: { benefit_source: result.source_input } },
        {
          nodeType: "f1040",
          fields: { line1e_taxable_dep_care: result.lines?.line26 ?? 0 },
        },
        {
          nodeType: "agi_aggregator",
          fields: { line1e_taxable_dep_care: result.lines?.line26 ?? 0 },
        },
      ],
    };
  }
}
export const form2441_2026 = new DependentCareBenefitsNode2026();
