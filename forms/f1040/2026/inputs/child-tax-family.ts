import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { incomeWorksheet2026 } from "../../nodes/config/2026-tax-worksheets.ts";
import {
  ordinaryTaxWithConfig,
  qualifiedDividendTaxWithConfig,
} from "../../nodes/intermediate/worksheets/taxes/calculation/tax_worksheets.ts";
import { line5PreferentialIncome } from "../../nodes/intermediate/forms/taxes/investments/form8615/calculation.ts";
import type { F8615Input } from "../../nodes/inputs/taxes/investments/f8615/schema.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).transform((s) =>
  s.replaceAll("-", "")
);
const whole = z.number().int().nonnegative().max(1_000_000_000);
const person = z.object({ tin, name: ref.max(50), name_control: ref.max(4) })
  .strict();
const flags = {
  schedule_d_tax_worksheet_used: z.boolean(),
  schedule_j_used: z.boolean(),
  form2555_used: z.boolean(),
};
/** Reviewed external return lines; parent tax is independently recomputed below.
 * These documents belong to other taxpayers and cannot be inferred from this child. */
export const childTaxParentReturn2026Schema = z.object({
  return_reference: ref,
  document_reference: ref,
  tax_period_start: z.literal("2026-01-01"),
  tax_period_end: z.literal("2026-12-31"),
  primary: person,
  spouse: person.optional(),
  filing_status: z.nativeEnum(FilingStatus),
  adjusted_gross_income: z.number().int().min(-1_000_000_000).max(
    1_000_000_000,
  ),
  taxable_income: whole,
  line16_income_tax: whole,
  form4972_tax: whole,
  form8814_tax: whole,
  education_recapture_tax: whole,
  qualified_dividends: whole,
  net_capital_gain: whole,
  ...flags,
  form8615_used: z.boolean(),
}).strict();
const pair = z.tuple([tin, tin]);
const custody = z.object({
  record_reference: ref,
  // Nights include temporary absences and the post-separation period, as
  // applicable. Day-equivalents apply to the parent's night-work exception.
  residence_records: z.tuple([
    z.object({
      parent_tin: tin,
      credited_nights: z.number().int().min(0).max(365),
    }).strict(),
    z.object({
      parent_tin: tin,
      credited_nights: z.number().int().min(0).max(365),
    }).strict(),
  ]),
}).strict();
const apart = z.object({
  record_reference: ref,
  spouse_lived_in_home_last_six_months_including_temporary_absences: z
    .boolean(),
  annual_home_cost: z.number().finite().positive(),
  custodial_parent_paid: z.number().finite().nonnegative(),
  qualifying_child_tin: tin,
  child_home_days_including_temporary_absences: z.number().int().min(0).max(
    365,
  ),
  dependency_treatment: z.enum([
    "claimed",
    "released_to_non_custodial",
    "not_eligible",
  ]),
}).strict();
const remarriage = z.object({
  record_reference: ref,
  spouse_tin: tin,
  shared_home_all_year: z.boolean(),
  custody: custody.optional(),
  living_apart_review: apart.optional(),
}).strict();
const selection = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("parents_married"),
    shared_home_all_year: z.boolean(),
    record_reference: ref,
    parent_tins: pair,
    custody: custody.optional(),
    living_apart_review: apart.optional(),
  }).strict(),
  z.object({
    kind: z.literal("never_married_lived_together_all_year"),
    record_reference: ref,
    parent_tins: pair,
  }).strict(),
  z.object({
    kind: z.literal("custodial_parent"),
    record_reference: ref,
    relationship: z.enum([
      "divorced_or_legally_separated",
      "never_married_not_together_all_year",
    ]),
    parent_tins: pair,
    custody,
    remarriage: remarriage.optional(),
  }).strict(),
  z.object({
    kind: z.literal("surviving_parent"),
    record_reference: ref,
    parent_tin: tin,
    deceased_parent_tin: tin,
    remarriage: remarriage.optional(),
  }).strict(),
]);
const sibling = z.object({
  document_reference: ref,
  child_tin: tin,
  selected_parent_return_reference: ref,
  tax_year: z.literal(2026),
  line1_unearned_income: whole,
  line4_taxable_income: whole,
  line5_net_unearned_income: whole,
  qualified_dividends: whole,
  net_capital_gain: whole,
  adjusted_gross_income: z.number().int(),
  deduction: whole,
  additional_deductions: whole,
  taking_standard_deduction: z.boolean(),
  directly_connected_itemized_deductions: whole,
  directly_connected_preferential_deductions: whole,
  ...flags,
}).strict();
export const childTaxFamily2026Schema = z.object({
  record_reference: ref,
  selection,
  parent_returns: z.array(childTaxParentReturn2026Schema).min(1).max(4),
  all_other_children_for_selected_parent_included: z.literal(true),
  other_children: z.array(sibling).max(50),
}).strict();
export type ChildTaxFamily2026 = z.input<typeof childTaxFamily2026Schema>;
type Parent = z.output<typeof childTaxParentReturn2026Schema>;

export function resolveChildTaxFamily2026(
  raw: ChildTaxFamily2026,
  childTin: string,
  options: { requireFamilyTax?: boolean } = {},
) {
  const requireFamilyTax = options.requireFamilyTax ?? true;
  const family = childTaxFamily2026Schema.parse(raw),
    child = childTin.replaceAll("-", "");
  const references = new Set<string>(), owners = new Map<string, Parent>();
  for (const p of family.parent_returns) {
    if (references.has(p.return_reference)) {
      throw new Error("Child-tax parent return references must be unique");
    }
    references.add(p.return_reference);
    if (p.taxable_income > Math.max(0, p.adjusted_gross_income)) {
      throw new Error(
        "Parent taxable income cannot exceed adjusted gross income",
      );
    }
    if ((p.filing_status === FilingStatus.MFJ) !== Boolean(p.spouse)) {
      throw new Error(
        "Child-tax parent joint filing status must match its two owners",
      );
    }
    for (const owner of [p.primary, ...(p.spouse ? [p.spouse] : [])]) {
      if (owners.has(owner.tin) || owner.tin === child) {
        throw new Error(
          "Child-tax parent returns need distinct owners separate from the child",
        );
      }
      owners.set(owner.tin, p);
    }
  }
  const get = (owner: string) => {
    const p = owners.get(owner);
    if (!p) {
      throw new Error(
        "Child-tax parent selection needs every candidate's return",
      );
    }
    return p;
  };
  const greatest = (
    a: Parent,
    b: Parent,
    field: "taxable_income" | "adjusted_gross_income",
  ) => {
    if (a === b) return a;
    if (a[field] === b[field]) {
      throw new Error(
        `Child-tax parent selection needs review of tied ${field}`,
      );
    }
    return a[field] > b[field] ? a : b;
  };
  const chooseCustodian = (
    tins: [string, string],
    c: z.output<typeof custody>,
  ) => {
    const rows = c.residence_records;
    if (
      new Set(tins).size !== 2 ||
      new Set(rows.map((r) => r.parent_tin)).size !== 2 ||
      rows.some((r) => !tins.includes(r.parent_tin))
    ) {
      throw new Error(
        "Child-tax custody records must bind both distinct parents",
      );
    }
    if (rows[0].credited_nights + rows[1].credited_nights > 365) {
      throw new Error(
        "Child-tax separated residence cannot count a night twice",
      );
    }
    if (rows[0].credited_nights === rows[1].credited_nights) {
      const p = greatest(get(tins[0]), get(tins[1]), "adjusted_gross_income");
      return tins.find((t) => get(t) === p)!;
    }
    return rows[0].credited_nights > rows[1].credited_nights
      ? rows[0].parent_tin
      : rows[1].parent_tin;
  };
  const consideredUnmarried = (r: z.output<typeof apart>) => {
    if (r.custodial_parent_paid > r.annual_home_cost) {
      throw new Error(
        "Parent's home payments cannot exceed the annual home cost",
      );
    }
    return !r
      .spouse_lived_in_home_last_six_months_including_temporary_absences &&
      r.custodial_parent_paid * 2 > r.annual_home_cost &&
      r.child_home_days_including_temporary_absences > 182 &&
      r.dependency_treatment !== "not_eligible";
  };
  const married = (
    first: string,
    second: string,
    custodial?: string,
    review?: z.output<typeof apart>,
  ) => {
    if (first === second) {
      throw new Error("Child-tax parent pair must contain distinct people");
    }
    const a = get(first), b = get(second);
    if (a === b) {
      if (a.filing_status !== FilingStatus.MFJ || review) {
        throw new Error(
          "Joint parents cannot use the separate-return living-apart exception",
        );
      }
      return { parent: a, reason: "joint_return_first_listed_owner" };
    }
    if (
      a.filing_status === FilingStatus.MFJ ||
      b.filing_status === FilingStatus.MFJ
    ) {
      throw new Error(
        "Married child-tax candidates cannot file jointly with different spouses",
      );
    }
    if (
      !review &&
      (a.filing_status !== FilingStatus.MFS ||
        b.filing_status !== FilingStatus.MFS)
    ) {
      throw new Error(
        "Married separate parent returns need MFS or a living-apart review",
      );
    }
    if (review && [first, second].includes(review.qualifying_child_tin)) {
      throw new Error(
        "Living-apart qualifying child must be distinct from the parents",
      );
    }
    if (review && !custodial) {
      throw new Error("Living-apart parent selection needs custody records");
    }
    if (review && consideredUnmarried(review)) {
      return {
        parent: get(custodial!),
        reason: "custodial_parent_considered_unmarried",
      };
    }
    return {
      parent: greatest(a, b, "taxable_income"),
      reason: "greater_taxable_income",
    };
  };
  const s = family.selection;
  let selected: { parent: Parent; reason: string };
  let candidateTins: string[];
  if (s.kind === "parents_married") {
    candidateTins = [...s.parent_tins];
    if (
      s.shared_home_all_year
        ? Boolean(s.custody || s.living_apart_review)
        : !s.custody || !s.living_apart_review
    ) {
      throw new Error(
        "Married parent residence must reconcile a complete living-apart review",
      );
    }
    const custodial = s.custody
      ? chooseCustodian(s.parent_tins, s.custody)
      : undefined;
    selected = married(...s.parent_tins, custodial, s.living_apart_review);
  } else if (s.kind === "never_married_lived_together_all_year") {
    candidateTins = [...s.parent_tins];
    if (
      s.parent_tins[0] === s.parent_tins[1] ||
      get(s.parent_tins[0]) === get(s.parent_tins[1])
    ) throw new Error("Never-married parents need distinct returns");
    selected = {
      parent: greatest(
        get(s.parent_tins[0]),
        get(s.parent_tins[1]),
        "taxable_income",
      ),
      reason: "greater_taxable_income",
    };
  } else {
    const custodial = s.kind === "surviving_parent"
      ? s.parent_tin
      : chooseCustodian(s.parent_tins, s.custody);
    candidateTins = s.kind === "surviving_parent"
      ? [s.parent_tin, s.deceased_parent_tin]
      : [...s.parent_tins];
    if (s.remarriage) {
      if (candidateTins.includes(s.remarriage.spouse_tin)) {
        throw new Error(
          "Remarried child-tax stepparent must be a distinct person",
        );
      }
      candidateTins.push(s.remarriage.spouse_tin);
      if (
        s.remarriage.shared_home_all_year
          ? Boolean(s.remarriage.custody || s.remarriage.living_apart_review)
          : !s.remarriage.custody || !s.remarriage.living_apart_review
      ) {
        throw new Error(
          "Remarried parent residence must reconcile a complete living-apart review",
        );
      }
      const remarriedCustodian = s.remarriage.custody
        ? chooseCustodian(
          [custodial, s.remarriage.spouse_tin],
          s.remarriage.custody,
        )
        : undefined;
      selected = married(
        custodial,
        s.remarriage.spouse_tin,
        remarriedCustodian,
        s.remarriage.living_apart_review,
      );
    } else {
      selected = {
        parent: get(custodial),
        reason: s.kind === "surviving_parent"
          ? "surviving_parent"
          : "custodial_parent",
      };
      if (
        selected.parent.spouse &&
        !(s.kind === "surviving_parent" &&
          [selected.parent.primary.tin, selected.parent.spouse.tin].includes(
            s.deceased_parent_tin,
          ))
      ) {
        throw new Error(
          "Child-tax custodial joint return needs the remarriage facts",
        );
      }
    }
  }
  if ([...owners.keys()].some((t) => !candidateTins.includes(t))) {
    throw new Error(
      "Child-tax family contains a return outside the reviewed parent candidates",
    );
  }
  const p = selected.parent;
  if (
    requireFamilyTax &&
    (p.schedule_d_tax_worksheet_used || p.schedule_j_used || p.form2555_used ||
      p.form8615_used)
  ) {
    throw new Error(
      "Selected parent needs an advanced child-tax family worksheet",
    );
  }
  const parentTax = !requireFamilyTax
    ? p.line16_income_tax - p.form4972_tax - p.form8814_tax -
      p.education_recapture_tax
    : p.qualified_dividends + p.net_capital_gain > 0
    ? qualifiedDividendTaxWithConfig(
      p.taxable_income,
      p.qualified_dividends,
      p.net_capital_gain,
      p.filing_status,
      incomeWorksheet2026,
    )
    : ordinaryTaxWithConfig(
      p.taxable_income,
      p.filing_status,
      incomeWorksheet2026,
    );
  if (
    p.line16_income_tax - p.form4972_tax - p.form8814_tax -
        p.education_recapture_tax !== parentTax
  ) {
    throw new Error(
      "Selected parent line 16 and excluded taxes do not reconcile to its 2026 worksheet",
    );
  }
  const source: F8615Input = {
    eligibility_confirmed: true,
    parent_name: p.primary.name,
    parent_name_control: p.primary.name_control,
    parent_ssn: p.primary.tin,
    parent_filing_status: p.filing_status,
    parent_taxable_income: p.taxable_income,
    parent_income_tax: parentTax,
    parent_tax_method: p.schedule_d_tax_worksheet_used
      ? "schedule_d"
      : p.schedule_j_used
      ? "schedule_j"
      : p.form2555_used
      ? "foreign_earned_income"
      : p.qualified_dividends + p.net_capital_gain > 0
      ? "qualified_dividend"
      : "ordinary",
    parent_qualified_dividends: p.qualified_dividends,
    parent_net_capital_gain: p.net_capital_gain,
    child_unearned_income: 0,
    other_children_line5: [],
    other_children_qualified_dividends_line5: [],
    other_children_net_capital_gain_line5: [],
    other_children_schedule_d_tax_worksheet_used: [],
    other_children_form2555_used: [],
  };
  const children = new Set([child, ...owners.keys()]);
  const siblings = family.other_children.map((r) => {
    if (children.has(r.child_tin)) {
      throw new Error(
        "Child-tax sibling records need distinct children separate from the parents",
      );
    }
    children.add(r.child_tin);
    if (r.selected_parent_return_reference !== p.return_reference) {
      throw new Error(
        "Sibling Form 8615 must use this same selected parent return",
      );
    }
    if (
      requireFamilyTax &&
      (r.schedule_d_tax_worksheet_used || r.schedule_j_used || r.form2555_used)
    ) throw new Error("Sibling needs an advanced child-tax family worksheet");
    if (
      r.taking_standard_deduction &&
      (r.directly_connected_itemized_deductions ||
        r.directly_connected_preferential_deductions)
    ) {
      throw new Error(
        "Sibling standard deduction cannot include directly connected itemized costs",
      );
    }
    if (
      r.directly_connected_preferential_deductions >
        r.directly_connected_itemized_deductions ||
      r.directly_connected_itemized_deductions > r.deduction
    ) {
      throw new Error(
        "Sibling directly connected costs exceed its selected deductions",
      );
    }
    if (
      r.line4_taxable_income !==
        Math.max(
          0,
          r.adjusted_gross_income - r.deduction - r.additional_deductions,
        )
    ) {
      throw new Error(
        "Sibling taxable income must reconcile its AGI and deductions",
      );
    }
    const line2 = r.taking_standard_deduction
      ? 2700
      : Math.max(2700, 1350 + r.directly_connected_itemized_deductions);
    const line3 = Math.max(0, r.line1_unearned_income - line2),
      line5 = Math.min(line3, r.line4_taxable_income);
    if (line5 !== r.line5_net_unearned_income) {
      throw new Error(
        "Sibling Form 8615 line 5 disagrees with its income and deduction worksheet",
      );
    }
    const pref = line5 === 0 ||
        !requireFamilyTax &&
          (r.schedule_d_tax_worksheet_used || r.schedule_j_used ||
            r.form2555_used)
      ? { qualifiedDividends: 0, netCapitalGain: 0 }
      : line5PreferentialIncome(
        {
          ...source,
          itemized_deductions_directly_connected:
            r.directly_connected_itemized_deductions,
          itemized_deductions_directly_connected_to_preferential_income:
            r.directly_connected_preferential_deductions,
        },
        {
          childTaxableIncome: r.line4_taxable_income,
          childFilingStatus: FilingStatus.Single,
          childRegularTax: 0,
          childHasPreferentialIncome:
            r.qualified_dividends + r.net_capital_gain > 0,
          childQualifiedDividends: r.qualified_dividends,
          childNetCapitalGain: r.net_capital_gain,
          takingStandardDeduction: r.taking_standard_deduction,
          childAdjustedGrossIncome: r.adjusted_gross_income,
          childDeduction: r.deduction,
          childForeignEarnedIncomeExclusion: 0,
          brackets: incomeWorksheet2026,
        },
        r.line1_unearned_income,
        line2,
        line3,
        line5,
      );
    source.other_children_line5.push(line5);
    source.other_children_qualified_dividends_line5.push(
      pref.qualifiedDividends,
    );
    source.other_children_net_capital_gain_line5.push(pref.netCapitalGain);
    source.other_children_schedule_d_tax_worksheet_used.push(
      r.schedule_d_tax_worksheet_used,
    );
    source.other_children_form2555_used.push(r.form2555_used);
    return { source: r, line2, line5, preferential_income_on_line5: pref };
  });
  return {
    family,
    selected_parent: p,
    selection_reason: selected.reason,
    candidate_tins: candidateTins,
    siblings,
    source,
  };
}
