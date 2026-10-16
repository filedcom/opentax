import { z } from "zod";
import {
  itemSchema as sharedCopySchema,
  mergeMonthlySlcsps,
  selectCurrent1095AStatements,
} from "../../nodes/inputs/credits/health/f1095a/index.ts";
import {
  aptcMonthlyEvidenceSchemaForYear,
  assertForm8962PolicyEligibility,
} from "../../nodes/inputs/credits/health/f1095a/policy-eligibility.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const date = z.string().date();
const amount = z.number().finite().nonnegative().refine(
  (v) =>
    Number.isSafeInteger(Math.round(v * 100)) &&
    v === Math.round(v * 100) / 100,
  "Marketplace amounts need safe cent precision",
);
const months = z.array(amount).length(12);
const state = z.string().refine(
  (v) =>
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
      .split(" ").includes(v),
  "Marketplace coverage needs a state or DC",
);
const coverage = z.object({
  individual_tin: tin,
  enrolled_from: date,
  enrolled_through: date,
}).strict();

/** Issued copy data; corrections and voids retain their own document identities. */
export const marketplaceCopy2026Schema = sharedCopySchema.pick({
  issuer_name: true,
  corrected_box_checked: true,
}).extend({
  tax_year: z.literal(2026),
  source_document_reference: ref,
  current_copy_review_reference: ref,
  policy_number: ref,
  recipient_ssn: tin,
  coverage_state: state,
  covered_individuals: z.array(coverage).min(1),
  monthly_premiums: months,
  monthly_slcsps: months,
  monthly_aptcs: months,
  annual_premium: amount,
  annual_slcsp: amount,
  annual_aptc: amount,
  supersedes_document_reference: ref.optional(),
  void_box_checked: z.boolean().default(false),
  voids_document_reference: ref.optional(),
}).strict();

const ordinaryEvidence = aptcMonthlyEvidenceSchemaForYear(2026);
const benchmark = z.object({
  tax_year: z.literal(2026),
  amount: amount.refine(
    (v) => v > 0,
    "Covered month needs a positive applicable SLCSP",
  ),
  coverage_family_tins: z.array(tin).min(1),
  basis: z.enum(["issued_copy_reconciled", "marketplace_determination"]),
  record_reference: ref,
  reviewed_on: date,
  // A lookup/correction preserves the exact authority used, not an amount override.
  determination: z.object({
    reason: z.enum(["no_aptc", "marketplace_error", "family_change", "move"]),
    document_reference: ref,
    document_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    determined_on: date,
  }).strict().optional(),
}).strict();

const monthReview = ordinaryEvidence.extend({
  source_document_reference: ref,
  premium_payment: ordinaryEvidence.shape.premium_payment.extend({
    amount,
    payer_tin: tin.optional(),
  })
    .strict(),
  applicable_slcsp: benchmark,
}).strict();

export const marketplaceClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: date,
    reviewer_name: ref,
    complete_marketplace_copy_inventory_verified: z.literal(true),
    no_shared_tax_family_allocation_verified: z.literal(true),
    no_marriage_or_divorce_during_year_verified: z.literal(true),
    no_marriage_alternative_qsehra_or_self_employed_plan_verified: z.literal(
      true,
    ),
    premiums_net_of_refunds_and_nonessential_benefits_verified: z.literal(true),
    payment_allocations_not_reused_verified: z.literal(true),
    copies: z.array(marketplaceCopy2026Schema).min(1),
    month_reviews: z.array(monthReview),
  }).strict(),
}).strict();

/** Tax-family identities must come from general's validated dependent selection.
 * This component prepares policy facts; it does not establish household MAGI.
 */
export const marketplaceSource2026Schema = marketplaceClaim2026Schema.extend({
  tax_family_tins: z.array(tin).min(1),
}).strict();
export type MarketplaceSource2026 = z.input<typeof marketplaceSource2026Schema>;

function total(values: readonly number[]): number {
  const cents = values.reduce((sum, v) => sum + Math.round(v * 100), 0);
  if (!Number.isSafeInteger(cents)) {
    throw new Error("Marketplace total exceeds safe cents");
  }
  return cents / 100;
}
function sameIdentities(a: readonly string[], b: readonly string[]) {
  return new Set(a).size === a.length && new Set(b).size === b.length &&
    a.length === b.length && a.every((v) => b.includes(v));
}
function identity(copy: { issuer_name: string; policy_number: string }) {
  return JSON.stringify([copy.issuer_name, copy.policy_number]);
}

/** Reconcile current issued policies and reviewed person-month facts before PTC.
 * Shared allocations, retroactive enrollment, partial-payment protection and
 * employer-offer affordability still require their dedicated source workpapers.
 */
export function calculateMarketplaceSources2026(raw: MarketplaceSource2026) {
  const input = marketplaceSource2026Schema.parse(raw), c = input.claim;
  if (!sameIdentities(input.tax_family_tins, input.tax_family_tins)) {
    throw new Error("Marketplace tax family needs distinct identities");
  }
  if (c.reviewed_on < "2026-12-31") {
    throw new Error(
      "Marketplace inventory review must cover the complete tax year",
    );
  }
  const byRef = new Map(
    c.copies.map((copy) => [copy.source_document_reference, copy]),
  );
  if (byRef.size !== c.copies.length) {
    throw new Error("Duplicate Marketplace source document");
  }
  const excluded = new Set<string>();
  for (const copy of c.copies) {
    if (copy.void_box_checked) {
      const target = copy.voids_document_reference;
      const original = target ? byRef.get(target) : undefined;
      if (
        !target || target === copy.source_document_reference ||
        excluded.has(target) ||
        copy.corrected_box_checked || copy.supersedes_document_reference ||
        (original &&
          (identity(original) !== identity(copy) || original.void_box_checked))
      ) {
        throw new Error(
          "Marketplace void must identify one original of the same policy",
        );
      }
      excluded.add(target);
      excluded.add(copy.source_document_reference);
    } else if (copy.voids_document_reference) {
      throw new Error("Marketplace void reference needs an issued VOID copy");
    }
    if (
      copy.supersedes_document_reference &&
      (!copy.corrected_box_checked ||
        copy.supersedes_document_reference === copy.source_document_reference)
    ) {
      throw new Error(
        "Marketplace replacement reference needs a corrected copy",
      );
    }
  }
  for (const copy of c.copies.filter((row) => row.void_box_checked)) {
    if (
      c.copies.some((row) =>
        identity(row) === identity(copy) &&
        !excluded.has(row.source_document_reference)
      )
    ) {
      throw new Error(
        "Marketplace void conflicts with another active copy of its policy",
      );
    }
  }
  const candidates = c.copies.filter((copy) =>
    !excluded.has(copy.source_document_reference)
  );
  const current = selectCurrent1095AStatements(candidates);
  if (new Set(current.map(identity)).size !== current.length) {
    throw new Error(
      "Marketplace inventory repeats a current issuer and policy",
    );
  }
  for (const copy of current) {
    for (
      const [annual, monthly, label] of [
        [copy.annual_premium, copy.monthly_premiums, "premium"],
        [copy.annual_slcsp, copy.monthly_slcsps, "SLCSP"],
        [copy.annual_aptc, copy.monthly_aptcs, "APTC"],
      ] as const
    ) {
      if (annual !== total(monthly)) {
        throw new Error(
          `Marketplace copy annual ${label} differs from monthly amounts`,
        );
      }
    }
    if (copy.corrected_box_checked) {
      const originals = candidates.filter((row) =>
        row !== copy && identity(row) === identity(copy)
      );
      const old = copy.supersedes_document_reference;
      if (
        !old ||
        (originals.length && originals[0].source_document_reference !== old) ||
        (byRef.has(old) && identity(byRef.get(old)!) !== identity(copy))
      ) {
        throw new Error(
          "Marketplace corrected copy must name its superseded statement",
        );
      }
    }
  }
  const reviewMap = new Map(
    c.month_reviews.map((
      row,
    ) => [`${row.source_document_reference}:${row.month}`, row]),
  );
  if (reviewMap.size !== c.month_reviews.length) {
    throw new Error("Duplicate Marketplace month review");
  }
  const usedReviews = new Set<string>(), paymentRefs = new Set<string>();
  const stateFamilies = Array.from(
    { length: 12 },
    () => new Map<string, Set<string>>(),
  );
  const personStates = Array.from(
    { length: 12 },
    () => new Map<string, string>(),
  );
  const prepared = current.map((copy) => {
    const allPeople = copy.covered_individuals.map((person) =>
      person.individual_tin
    );
    if (
      !sameIdentities(allPeople, allPeople) ||
      !input.tax_family_tins.includes(copy.recipient_ssn) ||
      allPeople.some((person) => !input.tax_family_tins.includes(person))
    ) {
      throw new Error(
        "Marketplace recipient and covered people must belong to the actual tax family",
      );
    }
    for (const person of copy.covered_individuals) {
      if (
        !person.enrolled_from.startsWith("2026-") ||
        !person.enrolled_through.startsWith("2026-") ||
        person.enrolled_from > person.enrolled_through
      ) {
        throw new Error(
          "Marketplace coverage dates must be ordered within 2026",
        );
      }
    }
    const coveredByMonth = new Map<number, string[]>();
    const evidence: z.input<typeof ordinaryEvidence>[] = [];
    const slcsps = Array(12).fill(0) as number[];
    for (let i = 0; i < 12; i++) {
      const month = i + 1, first = `2026-${String(month).padStart(2, "0")}-01`;
      const last = new Date(Date.UTC(2026, month, 0)).toISOString().slice(
        0,
        10,
      );
      const people = copy.covered_individuals.filter((p) =>
        p.enrolled_from <= first && p.enrolled_through >= first
      )
        .map((p) => p.individual_tin);
      const anyEnrollment = copy.covered_individuals.some((p) =>
        p.enrolled_from <= last && p.enrolled_through >= first
      );
      const premium = copy.monthly_premiums[i];
      if (premium === 0) {
        if (
          copy.monthly_aptcs[i] > 0 || copy.monthly_slcsps[i] > 0 ||
          anyEnrollment
        ) {
          throw new Error(
            "Marketplace unpaid/zero-premium coverage needs its special reconciliation route",
          );
        }
        continue;
      }
      if (
        !people.length ||
        copy.covered_individuals.some((p) =>
          p.enrolled_from > first && p.enrolled_from <= last
        )
      ) {
        throw new Error(
          "Marketplace mid-month or retroactive enrollment needs its special eligibility route",
        );
      }
      coveredByMonth.set(month, people);
      const key = `${copy.source_document_reference}:${month}`,
        review = reviewMap.get(key);
      if (!review) {
        throw new Error(
          "Marketplace coverage needs a review for each current-copy month",
        );
      }
      usedReviews.add(key);
      if (paymentRefs.has(review.premium_payment.reference)) {
        throw new Error("Marketplace premium payment allocation is reused");
      }
      paymentRefs.add(review.premium_payment.reference);
      const b = review.applicable_slcsp;
      if (
        b.reviewed_on < last || b.reviewed_on > c.reviewed_on ||
        review.coverage_eligibility_review.reviewed_on > c.reviewed_on
      ) {
        throw new Error(
          "Marketplace month reviews must precede the complete inventory review",
        );
      }
      if (b.basis === "issued_copy_reconciled") {
        if (b.determination || b.amount !== copy.monthly_slcsps[i]) {
          throw new Error(
            "Marketplace issued SLCSP must equal column B of the current copy",
          );
        }
      } else if (
        !b.determination || b.determination.determined_on > b.reviewed_on
      ) {
        throw new Error(
          "Marketplace SLCSP correction needs a dated determination document",
        );
      }
      slcsps[i] = b.amount;
      evidence.push({
        month,
        premium_payment: review.premium_payment,
        coverage_eligibility_review: review.coverage_eligibility_review,
      });
      const family = stateFamilies[i].get(copy.coverage_state) ??
        new Set<string>();
      for (const person of people) {
        const otherState = personStates[i].get(person);
        if (otherState && otherState !== copy.coverage_state) {
          throw new Error(
            "Marketplace same-person interstate overlap needs an allocation review",
          );
        }
        personStates[i].set(person, copy.coverage_state);
        family.add(person);
      }
      stateFamilies[i].set(copy.coverage_state, family);
    }
    assertForm8962PolicyEligibility(
      {
        ...copy,
        covered_individual_ssns: allPeople,
        aptc_monthly_evidence: evidence.map((row) => ({
          ...row,
          premium_payment: ordinaryEvidence.shape.premium_payment.strip().parse(
            row.premium_payment,
          ),
        })),
      },
      undefined,
      true,
      {
        taxYear: 2026,
        paymentDeadline: "2027-04-15",
        allowZeroAdvanceMonths: true,
        coveredByMonth,
      },
    );
    return { ...copy, monthly_slcsps: slcsps, coveredByMonth };
  });
  if (usedReviews.size !== reviewMap.size) {
    throw new Error(
      "Marketplace review names a superseded, void, or uncovered month",
    );
  }
  for (const copy of prepared) {
    for (const month of copy.coveredByMonth.keys()) {
      const review = reviewMap.get(
        `${copy.source_document_reference}:${month}`,
      )!;
      if (
        !sameIdentities(review.applicable_slcsp.coverage_family_tins, [
          ...stateFamilies[month - 1].get(copy.coverage_state)!,
        ])
      ) {
        throw new Error(
          "Marketplace SLCSP must cover the complete eligible family in its state",
        );
      }
    }
  }
  const monthly_premiums = Array.from(
    { length: 12 },
    (_, i) => total(prepared.map((copy) => copy.monthly_premiums[i])),
  );
  const monthly_aptcs = Array.from(
    { length: 12 },
    (_, i) => total(prepared.map((copy) => copy.monthly_aptcs[i])),
  );
  // Use the shared state/family grouping with integer cents for exact sums.
  const monthly_slcsps = (mergeMonthlySlcsps(prepared.map((copy) => ({
    ...copy,
    monthly_slcsps: copy.monthly_slcsps.map((v) => Math.round(v * 100)),
  }))) ?? Array(12).fill(0)).map((cents) => {
    z.number().safe().int().parse(cents);
    return amount.parse(cents / 100);
  });
  const signatures = stateFamilies.map((states) =>
    JSON.stringify(
      [...states].sort(([a], [b]) => a.localeCompare(b)).map((
        [s, people],
      ) => [s, [...people].sort()]),
    )
  );
  return {
    source_input: input,
    current_document_references: current.map((copy) =>
      copy.source_document_reference
    ),
    excluded_document_references: c.copies.filter((copy) =>
      !current.includes(copy)
    ).map((copy) => copy.source_document_reference),
    monthly_premiums,
    monthly_slcsps,
    monthly_aptcs,
    annual_premium: total(monthly_premiums),
    annual_slcsp: total(monthly_slcsps),
    annual_aptc: total(monthly_aptcs),
    annual_line11_eligible:
      monthly_premiums.every((v) => v > 0 && v === monthly_premiums[0]) &&
      monthly_slcsps.every((v) => v > 0 && v === monthly_slcsps[0]) &&
      signatures.every((s) => s === signatures[0]),
  };
}
