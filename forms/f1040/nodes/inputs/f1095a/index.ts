import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  allocationPctSchema,
  form8962,
  sharedPolicyAllocationSchema,
} from "../../intermediate/forms/form8962/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 1095-A — Health Insurance Marketplace Statement
// IRS Form 1095-A, Parts I–III
// Data source: Health Insurance Marketplace (exchange)
//
// This node is a pure aggregation pass-through: it collects all 1095-A items
// (one per insurance policy), aggregates the premium data, and emits a single
// output to form8962 for Premium Tax Credit reconciliation.
//
// IRS Form 8962 Instructions (2025): https://www.irs.gov/instructions/i8962

// Per-item schema — one 1095-A from one Marketplace policy
const sharedPolicySchema = z.discriminatedUnion("basis", [
  z.object({
    basis: z.literal("family_only"),
    only_tax_family_covered: z.literal(true),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
    monthly_family_slcsps: z.array(z.number().nonnegative()).length(12),
  }).strict(),
  z.object({
    basis: z.literal("mfs_exception"),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
    monthly_family_slcsps: z.array(z.number().nonnegative()).length(12),
  }).strict(),
  z.object({
    basis: z.literal("mfs_no_exception"),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
  }).strict(),
  z.object({
    basis: z.literal("divorce_agreed"),
    divorced_or_legally_separated_in_tax_year: z.literal(true),
    shared_during_marriage: z.literal(true),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
    allocation_pct: allocationPctSchema,
  }).strict(),
  z.object({
    basis: z.literal("divorce_no_agreement"),
    divorced_or_legally_separated_in_tax_year: z.literal(true),
    shared_during_marriage: z.literal(true),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
  }).strict(),
  z.object({
    basis: z.literal("other_agreed"),
    situations_1_to_3_reviewed_and_inapplicable: z.literal(true),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
    allocation_pct: allocationPctSchema,
  }).strict(),
  z.object({
    basis: z.literal("no_aptc"),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
    monthly_family_slcsps: z.array(z.number().nonnegative()).length(12),
    monthly_other_family_slcsps: z.array(z.number().nonnegative()).length(12),
  }).strict(),
  z.object({
    basis: z.literal("other_no_agreement"),
    situations_1_to_3_reviewed_and_inapplicable: z.literal(true),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
    allocated_enrollees_in_tax_family: z.number().int().min(0),
    total_enrollees: z.number().int().positive(),
  }).strict(),
]);

export const itemSchema = z.object({
  // Part I — Issuer / Marketplace information
  issuer_name: z.string().trim().min(1),
  policy_number: z.string().trim().min(1).optional(),
  // The Marketplace checked CORRECTED on this source statement. When both
  // versions are retained, only this statement supplies Form 8962 amounts.
  corrected_box_checked: z.literal(true).optional(),
  // Part II covered individuals. Required by the bounded two-policy annual
  // filing route to prove both policies belong to this tax family.
  covered_individual_ssns: z.array(
    z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  ).min(1).optional(),
  // Identify which spouse's Pub. 974 pre-marriage worksheet receives this
  // 1095-A policy. A policy may continue after the marriage month.
  alternative_marriage_owner: z.enum(["primary", "spouse"]).optional(),
  // State of Marketplace coverage, needed to combine SLCSP across policies.
  coverage_state: z.string().regex(/^[A-Z]{2}$/).optional(),

  // Part III, Column A — Monthly enrollment premiums (12 elements, 0=Jan…11=Dec)
  monthly_premiums: z.array(z.number().nonnegative()).length(12).optional(),

  // Part III, Column B — Monthly applicable SLCSP premiums
  monthly_slcsps: z.array(z.number().nonnegative()).length(12).optional(),

  // Part III, Column C — Monthly advance payments of PTC (APTC)
  monthly_aptcs: z.array(z.number().nonnegative()).length(12).optional(),

  // Part III, Line 33 — Annual totals (used when monthly detail is absent)
  annual_premium: z.number().nonnegative().optional(),
  annual_slcsp: z.number().nonnegative().optional(),
  annual_aptc: z.number().nonnegative().optional(),
  // Form 8962 instructions, line 10: column B may not describe the actual
  // coverage family after an unreported change, a move, or a no-APTC month.
  // These are independently determined applicable SLCSP amounts, not amended
  // values on the Marketplace statement.
  slcsp_corrections: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      basis: z.enum([
        "coverage_family_change",
        "move",
        "no_aptc",
        "marketplace_error",
      ]),
      corrected_slcsp: z.number().nonnegative(),
      determination_source: z.enum([
        "marketplace_tool",
        "marketplace_contact",
      ]),
    }).strict(),
  ).min(1).optional(),
  // Separate source records for a no-APTC positive PTC claim. The Marketplace
  // determination and premium-payment record must each be reviewed outside
  // this calculation; their facts are reconciled at filing projection.
  no_aptc_monthly_evidence: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      marketplace_slcsp: z.number().positive(),
      marketplace_method: z.enum(["marketplace_tool", "marketplace_contact"]),
      marketplace_reference: z.string().trim().min(1),
      marketplace_determined_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      marketplace_record_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      premium_paid: z.number().nonnegative(),
      premium_paid_in_full_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      premium_payment_reference: z.string().trim().min(1),
      premium_payment_record_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }).strict(),
  ).min(1).max(12).optional(),
  // Known changes that can make reported column B inaccurate. A change not
  // reported to the Marketplace needs a month-by-month determination.
  slcsp_review_periods: z.array(
    z.object({
      start_month: z.number().int().min(1).max(12),
      end_month: z.number().int().min(1).max(12),
      reason: z.enum(["coverage_family_change", "move"]),
      reported_to_marketplace: z.boolean(),
    }).strict(),
  ).min(1).optional(),
  shared_policy_periods: z.array(sharedPolicySchema).min(1).refine(
    (periods) => periods.some((period) => period.basis !== "family_only"),
    "Shared policy periods need at least one allocation period",
  ).optional(),
});

// Node inputSchema — all 1095-A forms for this return
export const inputSchema = z.object({
  f1095as: z.array(itemSchema).min(1),
  // Include the wedding month. It is the final pre-marriage month in Pub. 974.
  alternative_marriage_month: z.number().int().min(1).max(12).optional(),
});

type F1095AItem = z.infer<typeof itemSchema>;
type F1095AItems = F1095AItem[];

export function current1095AStatements(items: F1095AItems): F1095AItems {
  for (const corrected of items.filter((item) => item.corrected_box_checked)) {
    if (!corrected.policy_number) {
      throw new Error(
        "Corrected Form 1095-A needs a policy number to identify the superseded statement",
      );
    }
    if (
      items.some((item) =>
        item !== corrected &&
        ((item.policy_number === corrected.policy_number &&
          item.issuer_name !== corrected.issuer_name) ||
          (!item.policy_number && item.issuer_name === corrected.issuer_name))
      )
    ) {
      throw new Error(
        "Corrected Form 1095-A has ambiguous issuer and policy identity",
      );
    }
  }
  return items.filter((item) => {
    if (!item.policy_number) {
      return true;
    }
    const samePolicy = items.filter((candidate) =>
      candidate.issuer_name === item.issuer_name &&
      candidate.policy_number === item.policy_number
    );
    const corrected = samePolicy.filter((candidate) =>
      candidate.corrected_box_checked === true
    );
    if (
      corrected.length > 1 || (corrected.length === 1 && samePolicy.length > 2)
    ) {
      throw new Error(
        "Form 1095-A policy has ambiguous corrected statement versions",
      );
    }
    if (corrected.length === 1) return item === corrected[0];
    return true;
  });
}

function verifyPolicyCoverageIdentities(items: F1095AItems): void {
  const identified = items.filter((item) => item.policy_number !== undefined);
  const byIdentity = new Map<string, F1095AItems>();
  for (const item of identified) {
    const identity = `${item.issuer_name}\u0000${item.policy_number}`;
    byIdentity.set(identity, [...(byIdentity.get(identity) ?? []), item]);
  }
  for (const statements of byIdentity.values()) {
    if (statements.length < 2) continue;
    if (
      statements.some((item) =>
        item.monthly_premiums === undefined || item.monthly_aptcs === undefined
      )
    ) {
      throw new Error(
        "Form 1095-A repeated issuer and policy needs monthly coverage for every statement",
      );
    }
    for (let month = 0; month < 12; month++) {
      const coveredStatements = statements.filter((item) =>
        item.monthly_premiums![month] > 0 || item.monthly_aptcs![month] > 0
      );
      if (coveredStatements.length > 1) {
        throw new Error(
          "Form 1095-A repeats coverage for the same issuer, policy, and month; use the current statement",
        );
      }
    }
  }
}

// Sum a scalar field across all items (used for annual totals aggregation)
function sumField(items: F1095AItems, field: keyof F1095AItem): number {
  return items.reduce((sum, item) => sum + ((item[field] as number) ?? 0), 0);
}

// Merge monthly arrays from all items by adding element-wise.
// Returns null if no item has the field populated.
function mergeMonthlyArrays(
  items: F1095AItems,
  field: "monthly_premiums" | "monthly_slcsps" | "monthly_aptcs",
): number[] | null {
  const arrays = items.map((item) => item[field]).filter((
    arr,
  ): arr is number[] => arr !== undefined);
  if (arrays.length === 0) return null;
  // Element-wise sum across all policies
  const merged = new Array<number>(12).fill(0);
  for (const arr of arrays) {
    for (let i = 0; i < 12; i++) {
      merged[i] += arr[i];
    }
  }
  return merged;
}

function mergeMonthlySlcsps(
  items: F1095AItems,
  marriageMonth?: number,
): number[] | null {
  if (items.length === 1) return items[0].monthly_slcsps ?? null;
  if (!items.some((item) => item.monthly_slcsps !== undefined)) return null;
  const merged = new Array<number>(12).fill(0);
  for (let month = 0; month < 12; month++) {
    const byState = new Map<string, number>();
    for (const item of items) {
      const slcsp = item.monthly_slcsps?.[month] ?? 0;
      if (slcsp <= 0) continue;
      if (!item.coverage_state) {
        throw new Error(
          "Form 1095-A multiple policies need coverage_state to combine SLCSP",
        );
      }
      // The two spouses have separate pre-marriage coverage families, even
      // when their Marketplace plans are in the same state. The wedding month
      // is included; the first full married month uses the joint family.
      const key = marriageMonth !== undefined && month < marriageMonth
        ? `${item.coverage_state}:${item.alternative_marriage_owner}`
        : item.coverage_state;
      const existing = byState.get(key);
      if (existing !== undefined && existing !== slcsp) {
        throw new Error(
          "Form 1095-A same-state policies disagree on monthly SLCSP",
        );
      }
      byState.set(key, slcsp);
    }
    merged[month] = [...byState.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
  }
  return merged;
}

// Returns true if the array has at least one non-zero element
function hasNonZero(arr: number[]): boolean {
  return arr.some((v) => v > 0);
}

class F1095ANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1095a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8962]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const {
      f1095as: sourceStatements,
      alternative_marriage_month: marriageMonth,
    } = inputSchema
      .parse(input);
    const f1095as = current1095AStatements(sourceStatements);
    verifyPolicyCoverageIdentities(f1095as);
    const hasMarriageOwner = f1095as.some((item) =>
      item.alternative_marriage_owner !== undefined
    );
    if (hasMarriageOwner !== (marriageMonth !== undefined)) {
      throw new Error(
        "Form 1095-A marriage policy owners and marriage month must be supplied together",
      );
    }
    if (marriageMonth !== undefined) {
      for (const item of f1095as) {
        if (
          !item.monthly_premiums || !item.monthly_aptcs
        ) {
          throw new Error(
            "Form 1095-A marriage calculation needs complete monthly columns for every policy",
          );
        }
        if (
          !item.alternative_marriage_owner &&
          item.monthly_premiums.some((amount, month) =>
            month < marriageMonth &&
            (amount > 0 || item.monthly_aptcs![month] > 0)
          )
        ) {
          throw new Error(
            "Form 1095-A pre-marriage coverage needs a spouse owner for every policy",
          );
        }
      }
    }
    for (const item of f1095as) {
      for (
        const [monthlyKey, annualKey] of [
          ["monthly_premiums", "annual_premium"],
          ["monthly_slcsps", "annual_slcsp"],
          ["monthly_aptcs", "annual_aptc"],
        ] as const
      ) {
        const months = item[monthlyKey];
        const annual = item[annualKey];
        if (
          months !== undefined && annual !== undefined &&
          Math.abs(months.reduce((sum, amount) => sum + amount, 0) - annual) >
            0.01
        ) {
          throw new Error(
            `Form 1095-A ${annualKey} must equal its twelve monthly amounts`,
          );
        }
      }
    }
    const correctedItems = f1095as.map((item) => {
      const corrections = item.slcsp_corrections;
      const reviews = item.slcsp_review_periods ?? [];
      if (
        (corrections || reviews.length > 0) &&
        (!item.monthly_premiums || !item.monthly_aptcs)
      ) {
        throw new Error(
          "Form 1095-A SLCSP review needs monthly premiums and APTC",
        );
      }
      const correctedMonths = new Set<number>();
      for (const review of reviews) {
        if (review.start_month > review.end_month) {
          throw new Error("Form 1095-A SLCSP review months are reversed");
        }
      }
      for (let month = 0; month < 12; month++) {
        const activeReviews = reviews.filter((review) =>
          month + 1 >= review.start_month && month + 1 <= review.end_month
        );
        if (activeReviews.length > 1) {
          throw new Error("Form 1095-A SLCSP review periods overlap");
        }
      }
      if (!corrections) {
        if (
          item.monthly_premiums?.some((premium, month) =>
            (premium > 0 || (item.monthly_aptcs?.[month] ?? 0) > 0) &&
            item.monthly_aptcs?.[month] === 0
          ) || reviews.some((review) =>
            !review.reported_to_marketplace &&
            item.monthly_premiums?.some((premium, index) =>
              index + 1 >= review.start_month &&
              index + 1 <= review.end_month &&
              (premium > 0 || (item.monthly_aptcs?.[index] ?? 0) > 0)
            )
          )
        ) {
          throw new Error(
            "Form 1095-A no-APTC or unreported-change months need Marketplace SLCSP determinations",
          );
        }
        return item;
      }
      if (!item.monthly_premiums || !item.monthly_aptcs) {
        throw new Error(
          "Form 1095-A SLCSP determinations need monthly premiums and APTC",
        );
      }
      const slcsps = item.monthly_slcsps
        ? [...item.monthly_slcsps]
        : Array<number>(12).fill(0);
      for (const correction of corrections) {
        const month = correction.month - 1;
        if (correctedMonths.has(month)) {
          throw new Error("Form 1095-A SLCSP corrections repeat a month");
        }
        correctedMonths.add(month);
        if (
          item.monthly_premiums[month] === 0 &&
          item.monthly_aptcs[month] === 0
        ) {
          throw new Error(
            "Form 1095-A SLCSP correction has no coverage in its month",
          );
        }
        if (
          correction.basis === "no_aptc" && item.monthly_aptcs[month] > 0
        ) {
          throw new Error(
            "Form 1095-A no-APTC SLCSP correction conflicts with paid APTC",
          );
        }
        if (
          (correction.basis === "coverage_family_change" ||
            correction.basis === "move") &&
          !reviews.some((review) =>
            review.reason === correction.basis &&
            correction.month >= review.start_month &&
            correction.month <= review.end_month &&
            !review.reported_to_marketplace
          )
        ) {
          throw new Error(
            "Form 1095-A coverage-family or move correction needs an unreported review period",
          );
        }
        const unreportedReview = reviews.find((review) =>
          !review.reported_to_marketplace &&
          correction.month >= review.start_month &&
          correction.month <= review.end_month
        );
        if (
          unreportedReview && correction.basis !== unreportedReview.reason
        ) {
          throw new Error(
            "Form 1095-A SLCSP determination basis must match the unreported change",
          );
        }
        slcsps[month] = correction.corrected_slcsp;
      }
      for (let month = 0; month < 12; month++) {
        const covered = item.monthly_premiums[month] > 0 ||
          item.monthly_aptcs[month] > 0;
        if (!covered) continue;
        const unreportedChange = reviews.some((review) =>
          !review.reported_to_marketplace &&
          month + 1 >= review.start_month &&
          month + 1 <= review.end_month
        );
        if (
          (item.monthly_aptcs[month] === 0 || unreportedChange) &&
          !correctedMonths.has(month)
        ) {
          throw new Error(
            "Form 1095-A no-APTC or unreported-change months need Marketplace SLCSP determinations",
          );
        }
      }
      if (
        !item.monthly_slcsps &&
        item.monthly_premiums.some((premium, month) =>
          (premium > 0 || item.monthly_aptcs![month] > 0) &&
          !correctedMonths.has(month)
        )
      ) {
        throw new Error(
          "Form 1095-A missing column B needs corrected SLCSP for every covered month",
        );
      }
      return {
        ...item,
        monthly_slcsps: slcsps,
        // The reported annual column B was checked against the reported
        // monthly column above; it does not total the corrected SLCSP series.
        annual_slcsp: undefined,
      };
    });
    const sharedAllocations: Array<
      z.infer<typeof sharedPolicyAllocationSchema>
    > = [];
    const allocatedItems = correctedItems.map((item) => {
      const periods = item.shared_policy_periods;
      if (!periods) return item;
      if (
        !item.policy_number || !item.monthly_premiums ||
        !item.monthly_aptcs
      ) {
        throw new Error(
          "Shared Form 1095-A needs policy number and monthly premiums and APTC",
        );
      }
      const allocatedPremiums = Array<number>(12).fill(0);
      const allocatedSlcsps = Array<number>(12).fill(0);
      const allocatedAptcs = Array<number>(12).fill(0);
      const coveredByPeriod = Array<boolean>(12).fill(false);
      for (const shared of periods) {
        if (shared.start_month > shared.end_month) {
          throw new Error("Shared policy allocation months are reversed");
        }
        if (shared.basis === "family_only") {
          for (
            let index = shared.start_month - 1;
            index < shared.end_month;
            index++
          ) {
            if (coveredByPeriod[index]) {
              throw new Error("Shared policy allocation periods overlap");
            }
            coveredByPeriod[index] = true;
            allocatedPremiums[index] = item.monthly_premiums[index];
            allocatedSlcsps[index] = shared.monthly_family_slcsps[index];
            allocatedAptcs[index] = item.monthly_aptcs[index];
          }
          continue;
        }
        const allocatesReportedSlcsp = shared.basis === "divorce_agreed" ||
          shared.basis === "divorce_no_agreement" ||
          shared.basis === "other_agreed" ||
          shared.basis === "other_no_agreement";
        if (allocatesReportedSlcsp && !item.monthly_slcsps) {
          throw new Error(
            "Divorce and other shared policies need monthly SLCSP amounts",
          );
        }
        if (
          (shared.basis === "other_agreed" ||
            shared.basis === "other_no_agreement") &&
          !item.monthly_aptcs.some((amount, index) =>
            index + 1 >= shared.start_month &&
            index + 1 <= shared.end_month && amount > 0
          )
        ) {
          throw new Error(
            "Shared policy without APTC must use Situation 3 allocation",
          );
        }
        if (
          shared.basis === "other_no_agreement" &&
          shared.allocated_enrollees_in_tax_family > shared.total_enrollees
        ) {
          throw new Error(
            "Shared policy allocated enrollees cannot exceed total enrollees",
          );
        }
        if (
          shared.basis === "no_aptc" &&
          item.monthly_aptcs.some((amount, index) =>
            index + 1 >= shared.start_month &&
            index + 1 <= shared.end_month && amount > 0
          )
        ) {
          throw new Error("Situation 3 shared policy cannot have APTC");
        }
        const premiumRatios = Array<number>(12).fill(0.5);
        if (
          shared.basis === "divorce_agreed" || shared.basis === "other_agreed"
        ) {
          premiumRatios.fill(shared.allocation_pct);
        } else if (shared.basis === "other_no_agreement") {
          premiumRatios.fill(
            shared.allocated_enrollees_in_tax_family / shared.total_enrollees,
          );
        }
        let noAptcDisplayPct: number | undefined;
        for (let index = 0; index < 12; index++) {
          const month = index + 1;
          if (month < shared.start_month || month > shared.end_month) continue;
          if (coveredByPeriod[index]) {
            throw new Error("Shared policy allocation periods overlap");
          }
          coveredByPeriod[index] = true;
          if (
            shared.basis === "mfs_exception" &&
            item.monthly_premiums[index] > 0 &&
            shared.monthly_family_slcsps[index] <= 0
          ) {
            throw new Error(
              "Shared MFS exception needs the coverage-family SLCSP for each covered month",
            );
          }
          if (
            allocatesReportedSlcsp && item.monthly_premiums[index] > 0 &&
            item.monthly_slcsps![index] <= 0
          ) {
            throw new Error(
              "Divorce and other shared policies need SLCSP for each covered month",
            );
          }
          if (shared.basis === "no_aptc" && item.monthly_premiums[index] > 0) {
            const familySlcsp = shared.monthly_family_slcsps[index];
            const otherSlcsp = shared.monthly_other_family_slcsps[index];
            if (familySlcsp + otherSlcsp <= 0) {
              throw new Error(
                "Situation 3 needs both coverage-family SLCSP amounts to allocate premiums",
              );
            }
            premiumRatios[index] = familySlcsp / (familySlcsp + otherSlcsp);
            const displayPct = Math.round(premiumRatios[index] * 100) / 100;
            if (
              noAptcDisplayPct !== undefined &&
              displayPct !== noAptcDisplayPct
            ) {
              throw new Error(
                "Situation 3 changing percentages need separate Part IV periods",
              );
            }
            noAptcDisplayPct = displayPct;
          }
        }
        if (shared.basis === "no_aptc" && noAptcDisplayPct === undefined) {
          throw new Error("Situation 3 needs a covered month to allocate");
        }
        const pct = shared.basis === "no_aptc"
          ? noAptcDisplayPct!
          : Math.round(premiumRatios[0] * 100) / 100;
        const allocatesPremium = shared.basis !== "mfs_no_exception";
        const allocatesSlcsp = allocatesReportedSlcsp;
        const allocatesAptc = shared.basis !== "no_aptc";
        sharedAllocations.push(sharedPolicyAllocationSchema.parse({
          basis: shared.basis,
          policy_number: item.policy_number.slice(-15),
          other_taxpayer_ssn: shared.other_taxpayer_ssn.replaceAll("-", ""),
          start_month: shared.start_month,
          end_month: shared.end_month,
          ...(allocatesPremium ? { premium_pct: pct } : {}),
          ...(allocatesSlcsp ? { slcsp_pct: pct } : {}),
          ...(allocatesAptc ? { aptc_pct: pct } : {}),
        }));
        for (
          let index = shared.start_month - 1;
          index < shared.end_month;
          index++
        ) {
          allocatedPremiums[index] = allocatesPremium
            ? Math.round(item.monthly_premiums[index] * premiumRatios[index])
            : 0;
          allocatedSlcsps[index] = shared.basis === "mfs_exception" ||
              shared.basis === "no_aptc"
            ? shared.monthly_family_slcsps[index]
            : allocatesSlcsp
            ? Math.round(item.monthly_slcsps![index] * premiumRatios[index])
            : 0;
          allocatedAptcs[index] = allocatesAptc
            ? Math.round(item.monthly_aptcs[index] * premiumRatios[index])
            : 0;
        }
      }
      if (
        item.monthly_premiums.some((amount, index) =>
          (amount > 0 || item.monthly_aptcs![index] > 0) &&
          !coveredByPeriod[index]
        )
      ) {
        throw new Error(
          "Shared policy has coverage outside its allocation months",
        );
      }
      return {
        ...item,
        monthly_premiums: allocatedPremiums,
        monthly_slcsps: allocatedSlcsps,
        monthly_aptcs: allocatedAptcs,
        annual_premium: undefined,
        annual_slcsp: undefined,
        annual_aptc: undefined,
      };
    });
    const hasMonthlyPolicy = allocatedItems.some((item) =>
      item.monthly_premiums !== undefined ||
      item.monthly_slcsps !== undefined || item.monthly_aptcs !== undefined
    );
    const hasAnnualOnlyPolicy = allocatedItems.some((item) =>
      item.monthly_premiums === undefined &&
      item.monthly_slcsps === undefined && item.monthly_aptcs === undefined &&
      ((item.annual_premium ?? 0) > 0 || (item.annual_slcsp ?? 0) > 0 ||
        (item.annual_aptc ?? 0) > 0)
    );
    if (hasMonthlyPolicy && hasAnnualOnlyPolicy) {
      throw new Error(
        "Form 1095-A policies need monthly columns for every policy when calculating Form 8962 monthly credit",
      );
    }
    if (hasMonthlyPolicy && allocatedItems.length > 1) {
      for (const item of allocatedItems) {
        const hasCoverage = item.monthly_premiums?.some((value) => value > 0) ||
          item.monthly_aptcs?.some((value) => value > 0);
        if (hasCoverage && (!item.monthly_slcsps || !item.coverage_state)) {
          throw new Error(
            "Form 1095-A multiple covered policies need monthly SLCSP and coverage_state for each policy",
          );
        }
      }
    }

    // Aggregate annual totals across all policies
    const totalAnnualPremium = sumField(allocatedItems, "annual_premium");
    const totalAnnualSlcsp = sumField(allocatedItems, "annual_slcsp");
    const totalAnnualAptc = sumField(allocatedItems, "annual_aptc");

    // Merge monthly arrays across all policies
    const mergedPremiums = mergeMonthlyArrays(
      allocatedItems,
      "monthly_premiums",
    );
    const mergedSlcsps = mergeMonthlySlcsps(allocatedItems, marriageMonth);
    const mergedAptcs = mergeMonthlyArrays(allocatedItems, "monthly_aptcs");

    // Preserve an explicit all-zero column C. It is still a real 1095-A monthly
    // column when the premium and SLCSP columns contain coverage amounts.
    const activePremiums = mergedPremiums;
    const activeSlcsps = mergedSlcsps;
    const activeAptcs = mergedAptcs;

    // Determine if there is any data to pass to form8962
    const hasMonthlyData = [activePremiums, activeSlcsps, activeAptcs]
      .some((column) => column !== null && hasNonZero(column));
    const hasAnnualData = totalAnnualPremium > 0 || totalAnnualSlcsp > 0 ||
      totalAnnualAptc > 0;

    if (!hasMonthlyData && !hasAnnualData && sharedAllocations.length === 0) {
      return { outputs: [] };
    }

    // Build form8962 fields — pass whatever data is available
    const form8962Fields: Record<string, unknown> = {};

    if (totalAnnualPremium > 0) {
      form8962Fields.annual_premium = totalAnnualPremium;
    }
    if (
      mergedSlcsps !== null &&
      (allocatedItems.length > 1 ||
        allocatedItems.some((item) => item.slcsp_corrections?.length))
    ) {
      form8962Fields.annual_slcsp = mergedSlcsps.reduce(
        (sum, amount) => sum + amount,
        0,
      );
    } else if (totalAnnualSlcsp > 0) {
      form8962Fields.annual_slcsp = totalAnnualSlcsp;
    }
    if (totalAnnualAptc > 0) form8962Fields.annual_aptc = totalAnnualAptc;
    if (activePremiums !== null) {
      form8962Fields.monthly_premiums = activePremiums;
    }
    if (activeSlcsps !== null) form8962Fields.monthly_slcsps = activeSlcsps;
    if (activeAptcs !== null) form8962Fields.monthly_aptcs = activeAptcs;
    const pub974PolicyMonths = allocatedItems.flatMap((item) =>
      item.policy_number && item.monthly_premiums && item.monthly_aptcs
        ? item.monthly_premiums.flatMap((premium, index) =>
          premium > 0 || item.monthly_aptcs![index] > 0
            ? [{
              form1095a_policy_number: item.policy_number!,
              month: index + 1,
              premium,
              aptc: item.monthly_aptcs![index],
            }]
            : []
        )
        : []
    );
    if (pub974PolicyMonths.length > 0) {
      form8962Fields.pub974_form1095a_policy_months = pub974PolicyMonths;
    }
    if (
      activePremiums !== null && activeSlcsps !== null &&
      activePremiums[0] > 0 && activeSlcsps[0] > 0 &&
      activePremiums.every((amount) => amount === activePremiums[0]) &&
      activeSlcsps.every((amount) => amount === activeSlcsps[0]) &&
      allocatedItems.every((item) =>
        !item.shared_policy_periods &&
        item.monthly_premiums && item.monthly_slcsps && item.monthly_aptcs &&
        item.monthly_premiums[0] > 0 && item.monthly_slcsps[0] > 0 &&
        item.monthly_premiums.every((amount) =>
          amount === item.monthly_premiums![0]
        ) &&
        item.monthly_slcsps.every((amount) =>
          amount === item.monthly_slcsps![0]
        )
      )
    ) {
      form8962Fields.annual_line11_eligible = true;
    }
    if (sharedAllocations.length > 0) {
      form8962Fields.shared_policy_allocations = sharedAllocations;
    }
    if (marriageMonth !== undefined) {
      form8962Fields.alternative_marriage_source_month = marriageMonth;
    }
    const marriagePolicies = allocatedItems.filter((item) =>
      item.alternative_marriage_owner !== undefined
    );
    if (marriagePolicies.length > 0) {
      const policyNumbers = marriagePolicies.map((item) => item.policy_number);
      if (
        marriagePolicies.some((item) =>
          !item.policy_number || !item.monthly_premiums ||
          !item.monthly_slcsps || !item.monthly_aptcs
        ) || new Set(policyNumbers).size !== policyNumbers.length
      ) {
        throw new Error(
          "Form 1095-A marriage policies need unique policy numbers and complete monthly columns",
        );
      }
      form8962Fields.alternative_marriage_policies = marriagePolicies.map(
        (item) => ({
          policy_number: item.policy_number!,
          owner: item.alternative_marriage_owner!,
          ...(item.coverage_state
            ? { coverage_state: item.coverage_state }
            : {}),
          monthly_premiums: item.monthly_premiums!,
          monthly_slcsps: item.monthly_slcsps!,
          monthly_aptcs: item.monthly_aptcs!,
        }),
      );
    }

    return {
      outputs: [
        output(
          form8962,
          form8962Fields as Parameters<typeof output<typeof form8962>>[1],
        ),
      ],
    };
  }
}

export const f1095a = new F1095ANode();
