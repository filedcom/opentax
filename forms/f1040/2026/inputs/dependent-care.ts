import { retirementCreditWages2026 } from "./retirement-earned.ts";
import { retirementSource2026Schema } from "./retirement-source.ts";
import {
  careProvider2026Schema,
  resolveCareProviders2026,
} from "./dependent-care-providers.ts";
import { careMfs2026Schema, resolveCareMfs2026 } from "./dependent-care-mfs.ts";
import {
  calculatePriorCareCredit2026,
  priorCarePayments2026Schema,
} from "./dependent-care-prior.ts";
import {
  calculateCareEarnedIncome2026,
  type CareAnnualEarnings2026,
  careCombatElections2026Schema,
  careEarnedIncomeReview2026Schema,
  type CareOwner2026,
} from "./dependent-care-earned.ts";
import {
  assertCareServiceDates2026,
  carePerson2026Schema,
  resolveCarePeople2026,
} from "./dependent-care-people.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { dependentCare2026 } from "../../nodes/config/2026-dependent-care.ts";
import {
  calculateForm2441BenefitsFromAmounts,
  type Form2441CalculationDetails,
} from "../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";
import { dependent2026Schema } from "./dependents.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { businessReturnSource2026Schema } from "./business-qbi.ts";
import { businessCreditEarnings2026 } from "./business-earned.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";

const money = z.number().finite().nonnegative();
const whole = money.int();
const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const normalize = (s: string) => s.replaceAll("-", "");

/** Reviewed W-2 care sources, including qualifying spouses and nondependents.
 * Expense rows are receipt facts, never calculated credits or AGI. */
export const dependentCareClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    review_reference: reference,
    ordinary_w2_earnings_only: z.literal(true).optional(),
    business_inventory_reference: reference.optional(),
    retirement_inventory_reference: reference.optional(),
    earned_income: careEarnedIncomeReview2026Schema,
    combat_pay_elections: careCombatElections2026Schema,
    prior_year_expenses: priorCarePayments2026Schema,
    mfs_review: careMfs2026Schema,
    no_proprietor_or_partner_benefits: z.literal(true),
    no_foreign_tax_or_form8978_credit: z.literal(true),
    no_spouse_death_during_year: z.literal(true),
    care_enabled_work_or_job_search: z.literal(true),
    eligible_unrelated_providers_reviewed: z.literal(true),
    no_medical_deduction_or_other_reimbursement_for_these_expenses: z.literal(
      true,
    ),
    providers: z.array(careProvider2026Schema).max(25),
    qualifying_people: z.array(carePerson2026Schema).max(25),
    expenses: z.array(
      z.object({
        receipt_reference: reference,
        provider_index: z.number().int().nonnegative(),
        person_tin: tin,
        incurred_start_date: z.string().date(),
        incurred_end_date: z.string().date(),
        paid_date: z.string().date(),
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
  mfs_spouse_lived_with_taxpayer: z.boolean().optional(),
  taxpayer_dob: z.string().date(),
  taxpayer_can_be_claimed_as_dependent: z.boolean(),
  spouse_first_name: reference.optional(),
  spouse_last_name: reference.optional(),
  spouse_dob: z.string().date().optional(),
  spouse_can_be_claimed_as_dependent: z.boolean().optional(),
  dependents: z.array(dependent2026Schema).default([]),
  wage_sources: z.array(w2Item2026Schema).default([]),
  business_sources_2026: businessReturnSource2026Schema.optional(),
  retirement_sources_2026: retirementSource2026Schema.optional(),
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
  if (claim.providers.some((p) => p.household_employee)) {
    throw new Error(
      "Form 2441 household employees need Schedule H reconciliation",
    );
  }
  const retirement = input.retirement_sources_2026
    ? retirementCreditWages2026(
      input.retirement_sources_2026,
      input.filing_status,
      input,
    )
    : undefined;
  const disability = retirement && retirement.wages > 0
    ? retirement
    : undefined;
  if (disability) {
    if (
      claim.ordinary_w2_earnings_only ||
      claim.retirement_inventory_reference !==
        disability.source_input.claim.record_reference
    ) {
      throw new Error(
        "Care disability wages need the actual retirement inventory and no W-2-only declaration",
      );
    }
  } else if (claim.retirement_inventory_reference !== undefined) {
    throw new Error(
      "Care retirement review needs actual disability wage sources",
    );
  }
  const business = input.business_sources_2026
    ? businessCreditEarnings2026(
      input.business_sources_2026,
      input.filing_status,
      input,
    )
    : undefined;
  if (business) {
    if (
      claim.ordinary_w2_earnings_only ||
      claim.business_inventory_reference !==
        business.source_input.record_reference
    ) throw new Error("Care claim needs the actual business inventory review");
    const orderedWages = (wages: typeof input.wage_sources) =>
      [...wages].sort((a, b) =>
        a.source_document_reference.localeCompare(b.source_document_reference)
      );
    if (
      JSON.stringify(orderedWages(input.wage_sources)) !==
        JSON.stringify(orderedWages(business.source_input.w2s))
    ) {
      throw new Error(
        "Care and business calculations need the same issued W-2 inventory",
      );
    }
  } else if (
    (!disability && !claim.ordinary_w2_earnings_only) ||
    claim.business_inventory_reference
  ) {
    throw new Error(
      "Care business review needs an actual business source inventory",
    );
  }
  if (!business && input.wage_sources.some((w) => w.box13_statutory_employee)) {
    throw new Error(
      "Form 2441 statutory employees need the self-employment earned-income worksheet",
    );
  }
  const providers = resolveCareProviders2026(claim.providers, {
    family_tins: [
      input.taxpayer_ssn,
      input.spouse_ssn,
      ...input.dependents.map((d) => d.ssn ?? d.itin ?? d.atin),
    ].filter((s): s is string => !!s),
    wage_sources: input.wage_sources,
  });
  const reviews = claim.benefits?.w2_box10_reviews ?? [];
  const reviewed = new Set<string>();
  let alreadyBox1 = 0;
  const annual: CareAnnualEarnings2026 = {
    taxpayer: { wages: 0, combat: 0, taxable_care: 0 },
    spouse: { wages: 0, combat: 0, taxable_care: 0 },
  };
  for (const row of disability?.owners ?? []) {
    if (row.wages > 0) {
      annual[row.owner].disability_wages_by_month = row.wages_by_month;
    }
  }
  for (const row of business?.owners ?? []) {
    if (
      !business!.source_input.businesses.some((b) =>
        b.owner_tin === row.owner_tin
      )
    ) continue;
    const owner = row.owner_tin === normalize(input.taxpayer_ssn)
      ? "taxpayer"
      : "spouse";
    annual[owner].business = {
      regular_net_profit: row.regular_net_profit,
      statutory_gross_income: row.statutory_gross_income,
      se_deduction: row.se_deduction,
    };
  }
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
    // Statutory gross income comes from the linked Schedule C once.
    if (!w.box13_statutory_employee) annual[owner].wages += w.box1_wages;
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
  const qualification = resolveCarePeople2026(claim.qualifying_people, input);
  const people = qualification.people;
  const mfs = resolveCareMfs2026(
    claim.mfs_review,
    input,
    people.map((p) => p.ssn),
  );
  const separate = input.filing_status === FilingStatus.MFS;
  if (separate && claim.combat_pay_elections.credit.spouse) {
    throw new Error(
      "Separate spouse combat election only applies to the care-benefit worksheet",
    );
  }
  if (mfs.spouse_earnings) annual.spouse = mfs.spouse_earnings;
  const includeSpouseIncome = joint || mfs.spouse_earnings !== null;
  for (const person of people) {
    if (!person.spouse_incapacity_months) continue;
    if (
      separate && (mfs.considered_unmarried ||
        input.mfs_spouse_lived_with_taxpayer === false)
    ) {
      throw new Error(
        "Disabled care spouse's over-half-year home conflicts with the MFS residence review",
      );
    }
    const earned = claim.earned_income;
    if (
      earned.method !== "monthly" || !earned.spouse ||
      earned.spouse.months.some((m) =>
        m.incapable_of_self_care !==
          person.spouse_incapacity_months![m.month - 1]
      )
    ) {
      throw new Error(
        "Disabled care spouse needs monthly earned-income incapacity matching the care records",
      );
    }
  }
  const priorWorksheet = calculatePriorCareCredit2026(
    claim.prior_year_expenses,
    input,
    providers,
  );
  if (
    !people.length && !priorWorksheet && box10 === 0 &&
    !claim.benefits?.carryover_used_in_2026
  ) {
    throw new Error(
      "Care claim needs qualifying people, benefits or prior-year payments",
    );
  }
  if (
    !providers.length &&
    (people.length || priorWorksheet ||
      (box10 === 0 && !claim.benefits?.carryover_used_in_2026))
  ) {
    throw new Error(
      "No-provider care is only for benefits with no qualifying person or care provider",
    );
  }
  const paidByProvider = priorWorksheet
    ? [...priorWorksheet.provider_paid]
    : providers.map(() => 0);
  const receipts = new Set<string>(priorWorksheet?.receipt_references ?? []);
  for (const row of claim.expenses) {
    const person = people.find((p) => p.ssn === normalize(row.person_tin));
    if (!person || !claim.providers[row.provider_index]) {
      throw new Error("Care receipt references an unknown person or provider");
    }
    assertCareServiceDates2026(
      person,
      row.incurred_start_date,
      row.incurred_end_date,
      row.paid_date,
    );
    if (receipts.has(row.receipt_reference)) {
      throw new Error("Duplicate care receipt reference");
    }
    receipts.add(row.receipt_reference);
    person.credit_expenses_paid +=
      row.qualified_amount_incurred_and_paid_in_2026;
    paidByProvider[row.provider_index] +=
      row.qualified_amount_incurred_and_paid_in_2026;
  }
  if (paidByProvider.some((v, i) => v > providers[i].expense_capacity)) {
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
    includeSpouseIncome,
    "benefits",
  );
  const details: Form2441CalculationDetails = {
    filing_status: input.filing_status,
    qualifying_people: people.map((p) => ({
      first_name: p.first_name,
      last_name: p.last_name,
      name_control: p.name_control,
      ssn: p.ssn,
      over_12_and_disabled: p.over_12_and_disabled,
      credit_expenses_paid: 0,
    })),
    taxpayer_earned_income: benefitIncome.taxpayer,
    spouse_earned_income: benefitIncome.spouse,
    tax_liability_limit: 0,
    ...(separate
      ? {
        mfs_eligibility_met: mfs.considered_unmarried,
        mfs_line19_income: mfs.considered_unmarried
          ? benefitIncome.taxpayer
          : benefitIncome.spouse,
      }
      : {}),
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
  const preliminary = calculateForm2441BenefitsFromAmounts(
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
    return {
      first_name: p.first_name,
      last_name: p.last_name,
      name_control: p.name_control,
      ssn: p.ssn,
      over_12_and_disabled: p.over_12_and_disabled,
      credit_expenses_paid: p.credit_expenses_paid - used,
    };
  });
  const lines = calculateForm2441BenefitsFromAmounts(
    details,
    benefits,
    dependentCare2026,
  );
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
    includeSpouseIncome,
    "credit",
  );
  const part3 = box10 > 0 || (details.benefits_carryover_used ?? 0) > 0 ||
    (details.benefits_forfeited_or_carried_forward ?? 0) > 0;
  details.student_or_disabled_deemed_income_used =
    ((!separate || mfs.considered_unmarried) &&
      creditIncome.deemed_income_used) ||
    (part3 && benefitIncome.deemed_income_used);
  const totalWages = roundWholeDollars(
    input.wage_sources.reduce(
      (n, w) => n + (w.box13_statutory_employee ? 0 : w.box1_wages),
      0,
    ),
  );
  return {
    source_input: input,
    details,
    benefits,
    lines,
    expected_wage_income: totalWages + lines.line26 +
      (disability?.filed_wages ?? 0),
    retirement_earned_income_workpaper: disability ?? null,
    prior_year_worksheet: priorWorksheet,
    qualifying_person_workpaper: qualification,
    providers,
    mfs_workpaper: mfs,
    business_earned_income_workpaper: business ?? null,
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
