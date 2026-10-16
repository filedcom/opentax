import {
  ableSource2026Schema,
  calculateAbleSources2026,
} from "./able-source.ts";
import { z } from "zod";
import { investmentOwner2026 } from "./investment-source.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { w2_2026 } from "./w2.ts";
import {
  calculateRetirementSources2026,
  retirementSource2026Schema,
} from "./retirement-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import {
  isSourceMoney,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import { eligibleW2DeferralAmount } from "../../nodes/intermediate/forms/credits/individual/form8880/calculation.ts";
import {
  saverContributionColumn,
  saverCreditRate,
} from "../../nodes/intermediate/forms/credits/individual/form8880/amounts.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const date = z.string().date();
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
);
const whole = z.number().int().nonnegative().max(1_000_000_000);
const month = z.number().int().min(1).max(12);
const electiveCodes = ["D", "E", "F", "G", "H", "S", "AA", "BB", "EE"] as const;
const codeSchema = z.enum(electiveCodes);
const plan = z.enum([
  "traditional_ira",
  "roth_ira",
  "sep_ira",
  "simple_ira",
  "qualified_employer_plan",
  "governmental_457b",
  "section501c18d",
  "able",
  "military_retirement",
]);

/** Internal workpaper. The graph must bind wages, retirement inventory and tax
 * capacity before exposing a claim; none of these amounts is public intake. */
export const saversCreditSource2026Schema = investmentOwner2026.extend({
  taxpayer_dob: date,
  spouse_dob: date.optional(),
  wage_sources: z.array(w2Item2026Schema).max(100),
  retirement_sources_2026: retirementSource2026Schema.optional(),
  able_sources_2026: ableSource2026Schema.optional(),
  finalized_tax: z.object({
    line18: whole,
    schedule3_line1: whole,
    schedule3_line2: whole,
    schedule3_line3: whole,
    schedule3_line6d: whole,
    schedule3_line6l: whole,
  }).strict(),
  agi: z.number().int().finite(),
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: date,
    complete_contribution_and_distribution_inventory_verified: z.literal(true),
    no_foreign_or_territory_income_exclusions_or_housing_deduction: z.literal(
      true,
    ),
    no_ira_contributions_outside_retained_annual_workpaper: z.literal(true),
    no_able_contributions_or_current_able_distributions: z.literal(true)
      .optional(),
    able_inventory_reference: ref.optional(),
    no_other_plan_contributions_or_distributions: z.literal(true),
    no_returned_excess_or_prior_year_deferrals_in_current_wages: z.literal(
      true,
    ),
    retirement_inventory_reference: ref.optional(),
    current_inherited_ira_relationships: z.array(
      z.object({
        source_document_reference: ref,
        record_reference: ref,
        decedent_tin: tin,
        beneficiary_relationship: z.enum(["spouse", "nonspouse"]),
        beneficiary_entitlement_and_relationship_verified: z.literal(true),
      }).strict(),
    ).max(100).default([]),
    filing_due_date: z.enum(["2027-04-15", "2027-10-15"]),
    standard_calendar_year_deadline_and_no_special_postponement_verified: z
      .literal(true),
    extension_confirmation_reference: ref.optional(),
    distribution_inventory_reviewed_through: date,
    owners: z.array(
      z.object({
        owner_tin: tin,
        record_reference: ref,
        claimed_as_dependent_on_another_2026_return: z.boolean(),
        full_time_student_calendar_months: z.array(month).max(12),
        statutory_school_or_on_farm_training_definition_reviewed: z.literal(
          true,
        ),
      }).strict(),
    ).min(1).max(2),
    // Independently reconciled employee payments, never employer or 414(h)(2) amounts.
    voluntary_employee_contributions: z.array(
      z.object({
        payroll: z.object({
          source_document_reference: ref,
          employee_tin: tin,
          employer_tin: tin,
          tax_year: z.literal(2026),
          employee_after_tax_paid: money.refine((v) => v > 0),
          not_reported_in_box12_verified: z.literal(true),
          not_employer_contribution_or_section414h2_pickup_verified: z.literal(
            true,
          ),
        }).strict(),
        plan_statement: z.object({
          source_document_reference: ref,
          participant_tin: tin,
          sponsoring_employer_tin: tin,
          account_number: ref,
          tax_year: z.literal(2026),
          qualified_under_section4974c_verified: z.literal(true),
          not_ira_or_able_verified: z.literal(true),
          voluntary_employee_contributions: money.refine((v) => v > 0),
          no_returned_contributions_verified: z.literal(true),
        }).strict(),
      }).strict(),
    ).max(100),
    // Actual 2026 distributions are derived from the retained retirement source.
    other_year_distributions: z.array(
      z.object({
        source_document_reference: ref,
        classification_review_reference: ref,
        owner_tin: tin,
        received_on: date,
        payer_tin: tin,
        account_number: ref,
        plan_type: plan,
        gross: money.refine((v) => v > 0),
        treatment: z.enum([
          "included",
          "nontaxable_rollover",
          "roth_conversion",
          "deemed_plan_loan",
          "returned_excess_contributions",
          "timely_returned_ira_contribution",
          "section404k_esop_dividend",
          "military_retirement",
          "nonspousal_inherited_ira",
        ]),
        entire_amount_treatment_supported_by_source_verified: z.literal(true),
      }).strict(),
    ).max(1000),
    // Even an empty year needs its joint-filing answer; current 2026 is derived.
    other_year_joint_status: z.array(
      z.object({
        year: z.union([z.literal(2024), z.literal(2025), z.literal(2027)]),
        filed_or_plans_jointly_with_current_spouse: z.boolean(),
        filed_return_or_filing_plan_reference: ref,
      }).strict(),
    ).max(3),
  }).strict(),
}).strict();
export type SaversCreditSource2026 = z.input<
  typeof saversCreditSource2026Schema
>;

// Form 8880 (2026), embedded table and credit-limit worksheet. Draft source:
// https://www.irs.gov/pub/irs-dft/f8880--dft.pdf (rechecked 2026-10-16).
// Ordinary filing dates: 2026 Form4868 pp2, April15/October15,2027.
// https://www.irs.gov/pub/irs-dft/f4868--dft.pdf (rechecked 2026-10-16).
export const saverRules2026 = {
  cap: 2000,
  single: { rate50: 24250, rate20: 26250, rate10: 40250 },
  hoh: { rate50: 36375, rate20: 39375, rate10: 60375 },
  joint: { rate50: 48500, rate20: 52500, rate10: 80500 },
} as const;

export function calculateSaversCredit2026(raw: SaversCreditSource2026) {
  const input = saversCreditSource2026Schema.parse(raw), c = input.claim;
  const joint = input.filing_status === FilingStatus.MFJ;
  const ownerIds = [input.taxpayer_ssn, ...(joint ? [input.spouse_ssn] : [])];
  if (
    ownerIds.some((id) => !id) || new Set(ownerIds).size !== ownerIds.length ||
    joint && !input.spouse_dob
  ) {
    throw Error(
      "Saver credit needs distinct actual return owners and birth dates",
    );
  }
  const owners = ownerIds as string[];
  if (
    new Set(c.owners.map((o) => o.owner_tin)).size !== owners.length ||
    c.owners.length !== owners.length ||
    c.owners.some((o) => !owners.includes(o.owner_tin))
  ) {
    throw Error(
      "Saver eligibility review must include every actual return owner once",
    );
  }
  const priorDay = new Date(`${c.filing_due_date}T00:00:00Z`);
  priorDay.setUTCDate(priorDay.getUTCDate() - 1);
  if (
    (c.filing_due_date === "2027-10-15") !==
      !!c.extension_confirmation_reference ||
    c.distribution_inventory_reviewed_through !==
      priorDay.toISOString().slice(0, 10) ||
    c.reviewed_on < c.distribution_inventory_reviewed_through
  ) {
    throw Error(
      "Saver distribution review must cover the due-date window and actual extension",
    );
  }
  const references = new Set<string>();
  function document(reference: string) {
    if (references.has(reference)) {
      throw Error("Saver source and review references must be distinct");
    }
    references.add(reference);
  }
  document(c.record_reference);
  const eligibility = c.owners.map((o) => {
    document(o.record_reference);
    if (
      new Set(o.full_time_student_calendar_months).size !==
        o.full_time_student_calendar_months.length
    ) {
      throw Error("Saver student review cannot repeat a calendar month");
    }
    const dob = o.owner_tin === input.taxpayer_ssn
      ? input.taxpayer_dob
      : input.spouse_dob!;
    if (dob > "2026-12-31") {
      throw Error("Saver contributor cannot be born after the tax year");
    }
    return {
      owner_tin: o.owner_tin,
      eligible: dob <= "2009-01-01" &&
        !o.claimed_as_dependent_on_another_2026_return &&
        o.full_time_student_calendar_months.length < 5,
    };
  });
  const wages = input.wage_sources;
  w2_2026.compute({ taxYear: 2026, formType: "f1040" }, {
    w2s: wages,
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    spouse_ssn: input.spouse_ssn,
  });
  const line2Sources: {
    owner_tin: string;
    source_document_reference: string;
    amount: number;
  }[] = [];
  for (const w of wages) {
    document(w.source_document_reference);
    const owner = w.employee_ssn.replaceAll("-", "");
    if (!owners.includes(owner)) {
      throw Error("Saver W-2 does not belong to this return");
    }
    for (const e of w.box12_entries ?? []) {
      if (!codeSchema.safeParse(e.code).success) continue;
      money.parse(e.amount);
      const amount = eligibleW2DeferralAmount({
        employee_ssn: w.employee_ssn,
        code: codeSchema.parse(e.code),
        amount: e.amount,
        governmental_457b: e.code_g_governmental_457b,
        employee_elective_amount: e.code_g_employee_elective_amount,
        employee_split_review_ref: e.code_g_employee_split_review_ref,
      });
      money.parse(amount);
      line2Sources.push({
        owner_tin: owner,
        source_document_reference: w.source_document_reference,
        amount,
      });
    }
  }
  const accounts = new Set<string>();
  for (const e of c.voluntary_employee_contributions) {
    const p = e.payroll, s = e.plan_statement;
    document(p.source_document_reference);
    document(s.source_document_reference);
    const account =
      `${s.participant_tin}/${s.sponsoring_employer_tin}/${s.account_number}`;
    if (
      !owners.includes(p.employee_tin) ||
      p.employee_tin !== s.participant_tin ||
      p.employer_tin !== s.sponsoring_employer_tin ||
      p.employee_after_tax_paid !== s.voluntary_employee_contributions ||
      accounts.has(account)
    ) {
      throw Error(
        "Saver voluntary payroll and plan sources must reconcile by owner and account",
      );
    }
    accounts.add(account);
    line2Sources.push({
      owner_tin: p.employee_tin,
      source_document_reference: p.source_document_reference,
      amount: p.employee_after_tax_paid,
    });
  }
  const rs = input.retirement_sources_2026;
  if (
    !!rs !== !!c.retirement_inventory_reference || rs && (
        rs.claim.record_reference !== c.retirement_inventory_reference ||
        rs.filing_status !== input.filing_status ||
        rs.taxpayer_ssn !== input.taxpayer_ssn ||
        rs.spouse_ssn !== input.spouse_ssn ||
        rs.taxpayer_dob !== input.taxpayer_dob ||
        rs.spouse_dob !== input.spouse_dob ||
        rs.claim.reviewed_on > c.reviewed_on ||
        JSON.stringify(
            [...rs.wage_sources].sort((a, b) =>
              a.source_document_reference.localeCompare(
                b.source_document_reference,
              )
            ),
          ) !==
          JSON.stringify(
            [...wages].sort((a, b) =>
              a.source_document_reference.localeCompare(
                b.source_document_reference,
              )
            ),
          )
      )
  ) {
    throw Error(
      "Saver and retirement workpapers must retain the same owners, wages and source inventory",
    );
  }
  const ab = input.able_sources_2026;
  if (
    ab
      ? (c.no_able_contributions_or_current_able_distributions !== undefined ||
        c.able_inventory_reference !== ab.claim.record_reference ||
        ab.filing_status !== input.filing_status ||
        ab.taxpayer_ssn !== input.taxpayer_ssn ||
        ab.spouse_ssn !== input.spouse_ssn ||
        ab.taxpayer_dob !== input.taxpayer_dob ||
        ab.spouse_dob !== input.spouse_dob ||
        ab.claim.reviewed_on > c.reviewed_on ||
        JSON.stringify([...ab.wage_sources].sort((a, b) =>
            a.source_document_reference.localeCompare(
              b.source_document_reference,
            )
          )) !== JSON.stringify([...wages].sort((a, b) =>
            a.source_document_reference.localeCompare(
              b.source_document_reference,
            )
          )))
      : (c.no_able_contributions_or_current_able_distributions !== true ||
        c.able_inventory_reference !== undefined)
  ) {
    throw Error(
      "Saver ABLE review must match actual owners, wages and retained inventory, including absence",
    );
  }
  const able = ab ? calculateAbleSources2026(ab) : undefined;
  for (const account of able?.accounts ?? []) {
    if (
      account.source.employed_beneficiary_review &&
      c.voluntary_employee_contributions.some((e) =>
        e.payroll.employee_tin === account.owner_tin
      )
    ) {
      throw Error(
        "ABLE employment review conflicts with actual voluntary employee plan contributions",
      );
    }
  }
  const retirement = rs ? calculateRetirementSources2026(rs) : undefined;
  const line1Sources =
    retirement?.ira_basis?.calculation.forms.flatMap((f) =>
      f.source.contributions.map((v) => ({
        owner_tin: f.owner_tin,
        source_document_reference: v.form5498.source_document_reference,
        amount: v.form5498.box1_ira_contributions,
      }))
    ) ?? [];
  for (const a of able?.accounts ?? []) {
    for (const p of a.source.beneficiary_payments) {
      line1Sources.push({
        owner_tin: a.owner_tin,
        source_document_reference: p.source_document_ref,
        amount: p.amount,
      });
    }
  }
  for (const s of line1Sources) document(s.source_document_reference);
  const inherited = new Map(
    c.current_inherited_ira_relationships.map((
      r,
    ) => [r.source_document_reference, r]),
  );
  const inheritedRows =
    retirement?.rows.filter((r) =>
      r.copy.box7b_ira_sep_simple && r.review.death_benefit
    ) ?? [];
  if (
    inherited.size !== c.current_inherited_ira_relationships.length ||
    inherited.size !== inheritedRows.length ||
    inheritedRows.some((r) => !inherited.has(r.copy.source_document_reference))
  ) {
    throw Error(
      "Saver inherited IRA inventory needs each current beneficiary relationship once",
    );
  }
  for (const relationship of inherited.values()) {
    document(relationship.record_reference);
  }
  const distributionSources = retirement?.rows.map((row) => {
    document(row.copy.source_document_reference);
    const relationship = inherited.get(row.copy.source_document_reference);
    if (
      relationship &&
      relationship.decedent_tin !== row.review.death_benefit?.decedent_tin
    ) {
      throw Error(
        "Saver beneficiary relationship differs from the actual inherited IRA",
      );
    }
    // Form8880 reduces by the gross distribution, including after-tax basis.
    // A supported Roth conversion or direct rollover is excluded before basis.
    const amount = row.review.direct_rollover ||
        relationship?.beneficiary_relationship === "nonspouse"
      ? 0
      : row.ira_nonconversion_before_basis ??
        row.copy.box1_gross_distribution;
    return {
      owner_tin: row.owner_tin,
      source_document_reference: row.copy.source_document_reference,
      year: 2026,
      amount,
    };
  }) ?? [];
  for (const a of able?.accounts ?? []) {
    const q = a.source.current_year_distributions?.form1099qa;
    if (q) {
      document(q.source_document_ref);
      distributionSources.push({
        owner_tin: a.owner_tin,
        source_document_reference: q.source_document_ref,
        year: 2026,
        amount: q.box1_gross_distribution,
      });
    }
  }
  const years = new Map(c.other_year_joint_status.map((s) => [s.year, s]));
  if (
    joint
      ? years.size !== 3 || c.other_year_joint_status.length !== 3
      : years.size !== 0
  ) {
    throw Error(
      "Saver joint lookback needs one joint-filing record for 2024, 2025 and 2027 only",
    );
  }
  for (const status of c.other_year_joint_status) {
    document(status.filed_return_or_filing_plan_reference);
  }
  for (const d of c.other_year_distributions) {
    document(d.source_document_reference);
    document(d.classification_review_reference);
    const year = Number(d.received_on.slice(0, 4));
    if (
      !owners.includes(d.owner_tin) || d.received_on < "2024-01-01" ||
      d.received_on >= c.filing_due_date || year === 2026
    ) {
      throw Error(
        "Saver historical/prefiling distributions need an owned date in the 2026 lookback window",
      );
    }
    const ira = ["traditional_ira", "roth_ira", "sep_ira", "simple_ira"]
      .includes(d.plan_type);
    if (
      (d.plan_type === "military_retirement") !==
        (d.treatment === "military_retirement") ||
      d.treatment === "nonspousal_inherited_ira" && !ira ||
      d.treatment === "timely_returned_ira_contribution" && !ira ||
      d.treatment === "roth_conversion" &&
        ["roth_ira", "able", "military_retirement"].includes(d.plan_type) ||
      ["deemed_plan_loan", "section404k_esop_dividend"].includes(d.treatment) &&
        d.plan_type !== "qualified_employer_plan" ||
      d.plan_type === "able" && d.treatment !== "included"
    ) {
      throw Error(
        "Saver distribution exclusion conflicts with the documented plan type",
      );
    }
    distributionSources.push({
      owner_tin: d.owner_tin,
      source_document_reference: d.source_document_reference,
      year,
      amount: d.treatment === "included" ? d.gross : 0,
    });
  }
  const columns = owners.map((owner) => {
    const eligible = eligibility.find((o) => o.owner_tin === owner)!.eligible;
    const distributions = distributionSources.filter((d) =>
      d.owner_tin === owner || joint &&
        (d.year === 2026 ||
          years.get(d.year as 2024 | 2025 | 2027)
            ?.filed_or_plans_jointly_with_current_spouse)
    );
    const line1 = roundWholeDollars(
      sumSourceMoney(
        line1Sources.filter((s) => s.owner_tin === owner).map((s) => s.amount),
      ),
    );
    const line2 = roundWholeDollars(
      sumSourceMoney(
        line2Sources.filter((s) => s.owner_tin === owner).map((s) => s.amount),
      ),
    );
    const line4 = roundWholeDollars(
      sumSourceMoney(distributions.map((s) => s.amount)),
    );
    return {
      owner_tin: owner,
      eligible,
      source_line1: line1,
      source_line2: line2,
      source_line4: line4,
      ...saverContributionColumn(
        eligible ? line1 : 0,
        eligible ? line2 : 0,
        eligible ? line4 : 0,
        saverRules2026.cap,
      ),
    };
  });
  const line7 = columns.reduce((sum, c) => sum + c.line6, 0);
  const rate = saverCreditRate(
    input.agi,
    input.filing_status,
    saverRules2026.single,
    saverRules2026.hoh,
    saverRules2026.joint,
  );
  const line10 = roundWholeDollars(line7 * rate);
  const tax = input.finalized_tax;
  const earlier = tax.schedule3_line1 + tax.schedule3_line2 +
    tax.schedule3_line3 + tax.schedule3_line6d + tax.schedule3_line6l;
  const line11 = Math.max(0, tax.line18 - earlier);
  const line12 = Math.min(line10, line11);
  return {
    source_input: input,
    columns,
    line1_sources: line1Sources,
    line2_sources: line2Sources,
    distribution_sources: distributionSources,
    tax_limit_worksheet: { line1: tax.line18, line2: earlier, line3: line11 },
    lines: { line7, line8: input.agi, line9: rate, line10, line11, line12 },
    file_form8880: line12 > 0,
  };
}
