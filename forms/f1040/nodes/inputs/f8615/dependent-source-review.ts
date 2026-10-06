import { educationIncomeSources } from "../education_income/sources.ts";
import {
  assertDependentScholarshipIncome,
  assertDependentScholarshipReturn,
  dependentKiddieTaxFamilyReviewSchema,
  type DependentScholarshipReview,
  dependentScholarshipReviewSchema,
} from "../education_income/dependent-scholarship-review.ts";
import { FilingStatus } from "../../types.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";
import { ordinaryTax2025 } from "../../intermediate/worksheets/tax_table_2025.ts";
import { calculateForm8615 } from "../../intermediate/forms/form8615/calculation.ts";
import { inputSchema } from "./schema.ts";
const tin = (v: unknown) => String(v ?? "").replaceAll("-", "");
const object = (v: unknown): Record<string, unknown> =>
  (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
export const PARENT_TAX_SOURCE_KEYS = [
  "general",
  "w2",
  "f1040",
  "standard_deduction",
  "income_tax_calculation",
  "schedule3",
  "f8812",
] as const;
export function parentTaxProjection(
  pending: Readonly<Record<string, unknown>>,
) {
  const result = Object.fromEntries(
    PARENT_TAX_SOURCE_KEYS.filter((k) => pending[k] !== undefined).map(
      (k) => [k, structuredClone(pending[k])],
    ),
  );
  delete object(result.general).dependent_kiddie_tax_family_review;
  // PDF normalization adds display aliases from the retained dependent_details
  // and print indicators. The actual filed amounts and dependency rows remain
  // in the comparison; these generated display fields are not tax sources.
  for (const key of Object.keys(object(result.f1040))) {
    if (key.startsWith("print_") || /^dependent_\d+_/.test(key)) {
      delete object(result.f1040)[key];
    }
  }
  return result;
}
export function siblingTaxProjection(
  pending: Readonly<Record<string, unknown>>,
) {
  const result = structuredClone(pending);
  // The execution start row is a duplicate input envelope, not a filed tax or
  // source row. Exclude it to keep sibling projections finite and independent.
  delete object(result).start;
  delete object(object(result.general).dependent_education_income_review)
    .kiddie_tax_review;
  return result;
}
function same(a: unknown, b: unknown): boolean {
  const normalize = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(normalize)
      : v && typeof v === "object"
      ? Object.fromEntries(
        Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) =>
          a.localeCompare(b)
        ).map(([k, x]) => [k, normalize(x)]),
      )
      : v;
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}
function childIncomeFacts(
  review: DependentScholarshipReview,
  deductionEarned: number,
  costJoin = false,
) {
  const wages = review.student_w2_sources.reduce((s, r) => s + r.box1_wages, 0);
  const unearned = deductionEarned - wages;
  const supportEarned = wages +
    review.student_income_sources.reduce(
      (s, r) =>
        s +
        (r.kind === "scholarship_for_required_services" &&
            r.reporting.kind === "schedule1_line8r"
          ? r.taxable_amount
          : 0),
      0,
    );
  if (costJoin) {
    const costs = review.student_income_sources.flatMap((r) =>
      r.kind === "scholarship_not_on_w2"
        ? r.nonqualified_expense_payment_sources ?? []
        : []
    );
    const excluded = review.support_sources.filter((r) =>
      r.kind === "scholarship_support"
    );
    if (
      excluded.length !== costs.length ||
      excluded.some((r) =>
        !costs.some((c) =>
          c.payment_record_id === r.source_document_reference &&
          tin(c.student_ssn) === tin(r.student_ssn) && c.amount === r.amount
        )
      )
    ) {
      throw new Error(
        "Excluded dependent scholarship support must reconcile actual owned nonqualified scholarship costs",
      );
    }
  }
  const support = review.support_sources.reduce(
    (s, r) => s + (r.kind === "ordinary_support" ? r.amount : 0),
    0,
  );
  const birthday = new Date(`${review.student_dob}T00:00:00Z`);
  const age = 2025 - birthday.getUTCFullYear() +
    (birthday.getUTCMonth() === 0 && birthday.getUTCDate() === 1 ? 1 : 0);
  const requiredToFile = deductionEarned > 15750;
  const ageApplies = age < 18 ||
    (age === 18 ||
        age >= 19 && age < 24 && review.full_time_student_months.length >= 5) &&
      supportEarned * 2 <= support;
  const taxable = Math.max(
    0,
    deductionEarned - Math.min(15750, Math.max(1350, deductionEarned + 450)),
  );
  const line5 = Math.min(Math.max(0, unearned - 2700), taxable);
  return {
    unearned,
    supportEarned,
    support,
    age,
    requiredToFile,
    ageApplies,
    taxable,
    line5,
  };
}
type ParentReturn = NonNullable<
  DependentScholarshipReview["kiddie_tax_review"]
>["settled_parent_return"];
function parentIncomeFacts(record: ParentReturn) {
  const pending = record.pending;
  const general = object(pending.general),
    final = object(pending.f1040),
    deduction = object(pending.standard_deduction),
    taxInput = object(pending.income_tax_calculation);
  const filer = record.filer;
  const owner = tin(general.taxpayer_ssn);
  const rawWages = object(pending.w2).w2s;
  const wages = Array.isArray(rawWages) ? rawWages.map(object) : [];
  if (
    !wages.length ||
    wages.some((w) =>
      !w.source_document_reference || tin(w.employee_ssn) !== owner ||
      !Number.isInteger(w.box1_wages) || Number(w.box1_wages) < 0
    ) ||
    new Set(wages.map((w) => w.source_document_reference)).size !== wages.length
  ) {
    throw new Error(
      "Form 8615 parent wages need distinct issued parent-owned sources",
    );
  }
  const income = wages.reduce((s, w) => s + Number(w.box1_wages), 0);
  const taxable = Math.max(0, income - 15750),
    tax = ordinaryTax2025(taxable, FilingStatus.Single);
  const name = [filer.firstName, filer.middleInitial, filer.lastName].filter(
    Boolean,
  ).join(" ");
  if (
    !owner || tin(filer.primarySSN) !== owner ||
    typeof filer.firstName !== "string" || typeof filer.lastName !== "string" ||
    !filer.lastName || general.taxpayer_first_name !== filer.firstName ||
    general.taxpayer_last_name !== filer.lastName ||
    final.taxpayer_first_name !== filer.firstName ||
    final.taxpayer_last_name !== filer.lastName ||
    general.filing_status !== "single" ||
    general.taxpayer_can_be_claimed_as_dependent === true ||
    general.taxpayer_blind === true ||
    typeof general.taxpayer_dob !== "string" ||
    general.taxpayer_dob < "1961-01-02" || final.line1a_wages !== income ||
    final.line9_total_income !== income || final.line11_agi !== income ||
    Number(final.line8_additional_income ?? 0) !== 0 ||
    final.line12a_standard_deduction !== 15750 ||
    final.line14_deductions_qbi_total !== 15750 ||
    final.line15_taxable_income !== taxable ||
    final.line16_income_tax !== tax || deduction.agi !== income ||
    deduction.filing_status !== "single" ||
    taxInput.form8615_source !== undefined ||
    taxInput.form8615_reviewed_source !== undefined ||
    taxInput.taxable_income !== taxable ||
    taxInput.filing_status !== "single" ||
    taxInput.taking_standard_deduction !== true
  ) {
    throw new Error(
      "Form 8615 must reconcile the actual selected parent's ordinary-income return",
    );
  }
  return { record, owner, general, final, filer, income, taxable, tax, name };
}
function familySourceIds(review: DependentScholarshipReview) {
  const ids = new Set<string>();
  for (const w of review.student_w2_sources) {
    ids.add(w.source_document_reference);
  }
  for (const r of review.student_income_sources) {
    ids.add(r.source_document_reference);
    if (r.kind === "scholarship_for_required_services") {
      for (const p of r.payment_sources) ids.add(p.source_document_reference);
      for (const p of r.required_service_sources) {
        ids.add(p.source_document_reference);
        ids.add(p.performance_record_reference);
      }
    } else if (r.kind === "scholarship_not_on_w2") {
      for (const p of r.scholarship_disbursement_sources ?? []) {
        ids.add(p.source_document_reference);
      }
      for (const p of r.nonqualified_expense_payment_sources ?? []) {
        ids.add(p.payment_record_id);
      }
    }
  }
  for (const school of review.school_sources) {
    const source = object(school.workpaper.issued_form1098t_source);
    ids.add(String(source.document_id));
    for (
      const p of (school.workpaper.payment_sources ?? []) as Record<
        string,
        unknown
      >[]
    ) ids.add(String(p.payment_record_id));
  }
  return ids;
}
function ordinarySource(
  parent: ReturnType<typeof parentIncomeFacts>,
  unearned: number,
  others: number[],
) {
  return inputSchema.parse({
    eligibility_confirmed: true,
    parent_name: parent.name,
    parent_name_control: String(parent.filer.lastName).slice(0, 4)
      .toUpperCase(),
    parent_ssn: parent.general.taxpayer_ssn,
    parent_filing_status: "single",
    parent_taxable_income: parent.taxable,
    parent_income_tax: parent.tax,
    parent_tax_method: "ordinary",
    child_unearned_income: unearned,
    other_children_line5: others,
    other_children_qualified_dividends_line5: others.map(() => 0),
    other_children_net_capital_gain_line5: others.map(() => 0),
    other_children_schedule_d_tax_worksheet_used: others.map(() => false),
    other_children_form2555_used: others.map(() => false),
    parent_qualified_dividends: 0,
    parent_net_capital_gain: 0,
  });
}
function expectedTax(
  source: ReturnType<typeof ordinarySource>,
  facts: ReturnType<typeof childIncomeFacts>,
  earned: number,
) {
  return calculateForm8615(source, {
    childTaxableIncome: facts.taxable,
    childFilingStatus: FilingStatus.Single,
    childRegularTax: ordinaryTax2025(facts.taxable, FilingStatus.Single),
    takingStandardDeduction: true,
    childHasPreferentialIncome: false,
    childForeignEarnedIncomeExclusion: 0,
    childAdjustedGrossIncome: earned,
    childDeduction: earned - facts.taxable,
    brackets: CONFIG_BY_YEAR[2025],
  });
}
export function dependentKiddieTaxFacts(
  review: DependentScholarshipReview,
  deductionEarned: number,
  verifySiblingFiledTax = false,
) {
  const facts = childIncomeFacts(
    review,
    deductionEarned,
    review.kiddie_tax_review !== undefined,
  );
  const r = review.kiddie_tax_review;
  if (!r) {
    if (facts.taxable > 0) {
      throw new Error(
        "Positive-tax dependent scholarship return needs source-backed Form 8615 eligibility and parent-return review",
      );
    }
    return { ...facts, required: false, source: undefined };
  }
  const parent = parentIncomeFacts(r.settled_parent_return);
  const siblings = (r.other_child_returns ?? []).map((slot) => {
    const child = dependentScholarshipReviewSchema.parse(
      slot.student_claim_review,
    );
    if (
      child.kiddie_tax_review !== undefined ||
      !same(
        object(slot.pending.general).dependent_education_income_review,
        child,
      )
    ) {
      throw new Error(
        "Sibling tax projections must retain the exact owned source review without recursive family snapshots",
      );
    }
    const earned = assertDependentScholarshipIncome(
      slot.pending,
      educationIncomeSources(slot.pending.education_income),
    );
    if (earned === undefined) {
      throw new Error(
        "Sibling allocation needs an actual source-derived child return",
      );
    }
    const siblingFacts = childIncomeFacts(child, earned, true);
    if (
      siblingFacts.unearned <= 2700 || !siblingFacts.requiredToFile ||
      !siblingFacts.ageApplies || !r.parent_alive_on_2025_12_31
    ) {
      throw new Error(
        "Form 8615 sibling inventory must derive actual required filing eligibility",
      );
    }
    if (
      object(slot.pending.form8615).line5_child_net_unearned_income !==
        siblingFacts.line5
    ) {
      throw new Error(
        "Sibling line 5 must match its actual source-derived filed income and deduction",
      );
    }
    return { slot, review: child, earned, facts: siblingFacts };
  });
  const family = [review, ...siblings.map((s) => s.review)];
  const familyTins = family.map((s) => tin(s.student_ssn));
  const inventory = r.other_children_requiring_form8615.map(tin).sort();
  if (
    new Set(familyTins).size !== family.length ||
    !same(inventory, siblings.map((s) => tin(s.review.student_ssn)).sort())
  ) {
    throw new Error(
      "Form 8615 sibling inventory must exactly join distinct actual child returns",
    );
  }
  const sourceIds = new Set<string>();
  for (const member of family) {
    for (const id of familySourceIds(member)) {
      if (sourceIds.has(id)) {
        throw new Error(
          "Sibling wages, grants, school documents and payments cannot reuse another child's owned source identity",
        );
      }
      sourceIds.add(id);
    }
  }
  const selection = r.parent_selection;
  let parents: ReturnType<typeof parentIncomeFacts>[];
  if (selection.kind === "divorced_custodial_unremarried") {
    if (
      tin(selection.student_ssn) !== tin(review.student_ssn) ||
      tin(selection.custodial_parent_ssn) !== parent.owner ||
      parent.owner !== tin(review.education_claimant_ssn) ||
      tin(selection.other_parent_ssn) === parent.owner ||
      familyTins.includes(tin(selection.other_parent_ssn)) ||
      selection.custodial_parent_nights + selection.other_parent_nights !==
        365 ||
      selection.custodial_parent_nights <= selection.other_parent_nights
    ) {
      throw new Error(
        "Form 8615 custodial parent selection must match actual residence, marital status and identity sources",
      );
    }
    parents = [parent];
  } else {
    parents = selection.eligible_parent_returns.map(parentIncomeFacts);
    if (
      tin(selection.student_ssn) !== tin(review.student_ssn) ||
      new Set(parents.map((p) => p.owner)).size !== 2 || parents.some((p) =>
        familyTins.includes(p.owner)
      ) ||
      !parents.some((p) => p.owner === tin(review.education_claimant_ssn)) ||
      !parents.some((p) => same(p.record, r.settled_parent_return))
    ) {
      throw new Error(
        "Form 8615 cohabiting-parent selection requires two distinct actual parents and the education claimant",
      );
    }
    const greatest = [...parents].sort((a, b) => b.taxable - a.taxable);
    if (
      greatest[0].taxable === greatest[1].taxable ||
      greatest[0].owner !== parent.owner
    ) {
      throw new Error(
        "Form 8615 must use the actual cohabiting parent's greater taxable income, independently of education ownership",
      );
    }
  }
  const extended = siblings.length > 0 ||
    selection.kind !== "divorced_custodial_unremarried";
  for (const candidate of parents) {
    if (
      extended &&
      candidate.general.dependent_kiddie_tax_family_record_reference !==
        r.family_children_record_reference
    ) {
      throw new Error(
        "Extended parent/child tax sources must retain the same declared family export review",
      );
    }
    const owned = family.filter((c) =>
      tin(c.education_claimant_ssn) === candidate.owner
    );
    const deps = Array.isArray(candidate.general.dependents)
      ? candidate.general.dependents.map(object)
      : [];
    if (
      !same(
        deps.map((d) => tin(d.ssn)).sort(),
        owned.map((c) => tin(c.student_ssn)).sort(),
      ) || owned.some((c) =>
        !deps.some((d) =>
          tin(d.ssn) === tin(c.student_ssn) && d.dob === c.student_dob &&
          d.full_time_student === true
        )
      )
    ) {
      throw new Error(
        "Parent dependency inventory must bind every reviewed child's actual education claimant without a duplicate claim",
      );
    }
  }
  const required = facts.unearned > 2700 && facts.requiredToFile &&
    facts.ageApplies && r.parent_alive_on_2025_12_31;
  const source = required
    ? ordinarySource(parent, facts.unearned, siblings.map((s) => s.facts.line5))
    : undefined;
  for (const sibling of verifySiblingFiledTax ? siblings : []) {
    const others = [
      facts.line5,
      ...siblings.filter((s) => s !== sibling).map((s) => s.facts.line5),
    ];
    const siblingSource = ordinarySource(
      parent,
      sibling.facts.unearned,
      others,
    );
    const expected = expectedTax(siblingSource, sibling.facts, sibling.earned);
    const filed = object(sibling.slot.pending.f1040),
      taxInput = object(sibling.slot.pending.income_tax_calculation);
    if (
      !same(taxInput.form8615_reviewed_source, siblingSource) ||
      taxInput.form8615_computed_unearned_income !== sibling.facts.unearned ||
      !same(sibling.slot.pending.form8615, expected.fields) ||
      filed.line16_income_tax !== expected.line18Tax ||
      filed.line24_total_tax !== expected.line18Tax
    ) {
      throw new Error(
        "Reciprocal sibling line 5, family allocation and actual filed tax must reconcile from owned return sources",
      );
    }
  }
  return { ...facts, required, source };
}
export function assertDependentKiddieTaxReturn(
  pending: Readonly<Record<string, unknown>>,
  review: DependentScholarshipReview,
  earned: number,
) {
  const facts = dependentKiddieTaxFacts(review, earned, true);
  if (!review.kiddie_tax_review && facts.taxable === 0) return;
  const final = object(pending.f1040);
  const taxInput = object(pending.income_tax_calculation);
  const regular = ordinaryTax2025(facts.taxable, FilingStatus.Single);
  if (!facts.required) {
    if (
      pending.form8615 !== undefined ||
      taxInput.form8615_source !== undefined ||
      final.line16_income_tax !== regular
    ) {
      throw new Error(
        "Dependent child ordinary tax must match source-derived Form 8615 eligibility",
      );
    }
    return;
  }
  const expected = calculateForm8615(facts.source!, {
    childTaxableIncome: facts.taxable,
    childFilingStatus: FilingStatus.Single,
    childRegularTax: regular,
    takingStandardDeduction: true,
    childHasPreferentialIncome: false,
    childForeignEarnedIncomeExclusion: 0,
    childAdjustedGrossIncome: earned,
    childDeduction: earned - facts.taxable,
    brackets: CONFIG_BY_YEAR[2025],
  });
  if (
    !same(taxInput.form8615_reviewed_source, facts.source) ||
    (taxInput.form8615_source !== undefined &&
      !same(taxInput.form8615_source, facts.source)) ||
    !same(pending.form8615, expected.fields) ||
    taxInput.form8615_computed_unearned_income !== facts.unearned ||
    final.line16_income_tax !== expected.line18Tax ||
    final.line24_total_tax !== expected.line18Tax
  ) {
    throw new Error(
      "Dependent Form 8615, selected parent source, child unearned income and filed tax must reconcile",
    );
  }
}
export function assertSettledParentTaxSource(
  review: DependentScholarshipReview,
  parent: Readonly<Record<string, unknown>>,
  filer?: unknown,
) {
  const r = review.kiddie_tax_review;
  if (!r) return;
  const candidates =
    r.parent_selection.kind === "divorced_custodial_unremarried"
      ? [r.settled_parent_return]
      : r.parent_selection.eligible_parent_returns;
  const claimant = candidates.find((p) =>
    tin(object(p.pending.general).taxpayer_ssn) ===
      tin(review.education_claimant_ssn)
  );
  if (
    !claimant || !same(claimant.pending, parentTaxProjection(parent)) ||
    !same(claimant.filer, filer)
  ) {
    throw new Error(
      "Child Form 8615 must retain this exact settled education-claimant parent source separately from its selected tax parent",
    );
  }
  if (
    (r.other_child_returns?.length ||
      r.parent_selection.kind !== "divorced_custodial_unremarried") &&
    object(parent.general).dependent_kiddie_tax_family_review === undefined
  ) {
    throw new Error(
      "Sibling/selected-parent education filing must retain its complete family return review",
    );
  }
}
export function assertDependentKiddieTaxFamilyReturn(
  pending: Readonly<Record<string, unknown>> | undefined,
  filer?: unknown,
) {
  const general = object(pending?.general);
  const ref = general.dependent_kiddie_tax_family_record_reference,
    raw = general.dependent_kiddie_tax_family_review;
  if (ref === undefined && raw === undefined) return;
  const family = dependentKiddieTaxFamilyReviewSchema.parse(raw);
  if (family.source_document_reference !== ref) {
    throw new Error(
      "Parent family tax export must retain its declared complete source review",
    );
  }
  const parents = family.parent_returns.map(parentIncomeFacts);
  const own = parents.find((p) => p.owner === tin(general.taxpayer_ssn));
  if (
    !own || !same(own.record.pending, parentTaxProjection(pending!)) ||
    !same(own.filer, filer) ||
    new Set(parents.map((p) => p.owner)).size !== parents.length
  ) {
    throw new Error(
      "Family review must bind this actual exported parent return and identity",
    );
  }
  const children = family.child_returns;
  if (
    new Set(children.map((c) => tin(c.student_claim_review.student_ssn)))
      .size !== children.length
  ) {
    throw new Error(
      "Family review cannot duplicate or omit source-owned children",
    );
  }
  for (const child of children) {
    const review = child.student_claim_review, r = review.kiddie_tax_review;
    if (
      !r || r.family_children_record_reference !== ref ||
      !same(
        object(child.pending.general).dependent_education_income_review,
        review,
      )
    ) {
      throw new Error(
        "Family child source, finalized return and retained tax review must match",
      );
    }
    assertDependentScholarshipReturn(
      child.pending,
      educationIncomeSources(child.pending.education_income),
    );
    const expectedOthers = children.filter((c) => c !== child);
    const retained = r.other_child_returns ?? [];
    if (
      retained.length !== expectedOthers.length ||
      expectedOthers.some((c) =>
        !retained.some((s) =>
          tin(object(s.student_claim_review).student_ssn) ===
            tin(c.student_claim_review.student_ssn) &&
          same(
            s.student_claim_review,
            object(
              object(siblingTaxProjection(c.pending).general)
                .dependent_education_income_review,
            ),
          ) && same(s.pending, siblingTaxProjection(c.pending))
        )
      )
    ) {
      throw new Error(
        "Family child returns must retain reciprocal exact sibling source projections",
      );
    }
    const candidates =
      r.parent_selection.kind === "divorced_custodial_unremarried"
        ? [r.settled_parent_return]
        : r.parent_selection.eligible_parent_returns;
    if (
      candidates.length !== parents.length ||
      candidates.some((c) => !family.parent_returns.some((p) => same(p, c)))
    ) {
      throw new Error(
        "Family parent-selection candidates must bind the actual independent exported parent sources",
      );
    }
  }
}
export function assertReviewedDependentForm8615(
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  if (
    object(pending?.general).dependent_education_income_review === undefined
  ) return;
  assertDependentScholarshipReturn(
    pending!,
    educationIncomeSources(pending?.education_income),
  );
}
