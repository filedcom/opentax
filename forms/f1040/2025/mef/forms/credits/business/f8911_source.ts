import { assertConstructionReview } from "../../../../../nodes/inputs/credits/business/f8911/construction-review.ts";
import {
  reconcileBonus4562,
  reconcileBonusInventory,
} from "../../deductions/business/f4562_bonus.ts";
import { z } from "zod";
import {
  computeForm8911Amounts,
  computePersonalCreditAmounts,
  inputSchema,
  personalCreditProperties,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import { inputSchema as scheduleCInputSchema } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as form3800InputSchema } from "../../../../../nodes/inputs/credits/business/f3800/index.ts";

const returnOwnerSchema = z.object({
  taxpayer_ssn: z.string().regex(/^(?:\d{9}|\d{3}-\d{2}-\d{4})$/),
});

/** Ownership and amount joins only; does not authenticate property or PWA evidence. */
export function reconcileForm8911BusinessSources(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const source = inputSchema.parse(raw);
  if (
    JSON.stringify(source) !== JSON.stringify(inputSchema.parse(pending.f8911))
  ) {
    throw new Error(
      "Form 8911 property-source reconciliation differs from the prepared return",
    );
  }
  computePersonalCreditAmounts(source, true);
  const properties = personalCreditProperties(source).filter((property) =>
    (property.business_use_pct ?? 0) > 0
  );
  if (properties.length === 0) {
    throw new Error(
      "Form 8911 property-source reconciliation needs business properties",
    );
  }
  const owner = returnOwnerSchema.parse(pending.f1040);
  const businesses = scheduleCInputSchema.safeParse(pending.schedule_c);
  if (!businesses.success) {
    throw new Error(
      "Form 8911 property-source reconciliation needs Schedule C sources",
    );
  }
  for (const property of properties) {
    const review = property.business_source;
    if (
      !review ||
      review.proprietor_ssn !== owner.taxpayer_ssn.replaceAll("-", "")
    ) {
      throw new Error(
        "Form 8911 property proprietor differs from finalized Form 1040",
      );
    }
    const matches = businesses.data.schedule_cs.filter((business) =>
      business.business_reference === review.schedule_c_business_reference
    );
    if (
      matches.length !== 1 || matches[0].proprietor_recipient !== "T" ||
      matches[0].line_g_material_participation !== true ||
      matches[0].statutory_employee === true ||
      matches[0].disposed_of_business === true ||
      review.subject_to_passive_activity_limit
    ) {
      throw new Error(
        "Form 8911 property needs one participating taxpayer-owned Schedule C business",
      );
    }
  }
  const { businessCredit } = computeForm8911Amounts(source);
  const filedCredit = form3800InputSchema.parse(pending.f3800).f8911_credit;
  if (
    !filedCredit || filedCredit.credit_amount !== businessCredit ||
    filedCredit.subject_to_passive_activity_limit
  ) {
    throw new Error(
      "Form 8911 business property credit differs from Form 3800 line 1s source",
    );
  }
  return { source, properties, businessCredit };
}

/** Filing route for the reconciled new, fully business-use bonus-depreciation asset. */
export function reconcileForm8911BusinessFiling(
  raw: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const joined = reconcileForm8911BusinessSources(raw, pending);
  if (
    joined.properties.some((p) =>
      p.business_use_pct !== 1 || !p.business_source ||
      p.business_source.rate_basis === "pwa" ||
      p.business_source.section179_deduction !== 0
    )
  ) {
    throw new Error(
      "Form 8911 business filing requires reconciled full-business property and zero section 179; mixed/PWA sources remain guarded",
    );
  }
  const reviews = joined.properties.flatMap((property) => {
    if (
      property.business_source?.rate_basis !== "construction_before_2023_01_29"
    ) {
      if (property.business_source?.construction_review) {
        throw new Error(
          "Form 8911 construction review needs the construction-exception rate",
        );
      }
      return [];
    }
    return [assertConstructionReview(
      property.business_source.construction_review,
      "property_reference" in property &&
        typeof property.property_reference === "string"
        ? property.property_reference
        : undefined,
      property.construction_began,
      property.placed_in_service,
    )];
  });
  for (const review of reviews) {
    const sameProject = reviews.filter((r) =>
      r.project_reference === review.project_reference
    );
    const claimedProjectCost = joined.properties.filter((p) =>
      p.business_source?.construction_review?.project_reference ===
        review.project_reference
    ).reduce((sum, p) => sum + p.cost, 0);
    if (
      review.start.method === "five_percent_safe_harbor" &&
      review.start.project_total_cost < claimedProjectCost
    ) {
      throw new Error(
        "Form 8911 reviewed project cost is less than its claimed properties",
      );
    }
    if (sameProject.some((r) => JSON.stringify(r) !== JSON.stringify(review))) {
      throw new Error(
        "Form 8911 properties disagree on the shared construction project review",
      );
    }
  }
  if (!pending.form4562) {
    throw new Error(
      "Form 8911 business export needs property-source reconciliation to Form 4562",
    );
  }
  const rawDepreciation = z.record(z.unknown()).parse(pending.form4562);
  const inventory = "bonus_inventory" in rawDepreciation
    ? reconcileBonusInventory(rawDepreciation, pending)
    : undefined;
  const reductions = inventory
    ? inventory.bonus_inventory.assets.reduce(
      (sum, a) => sum + a.credit_basis_reduction,
      0,
    )
    : reconcileBonus4562(rawDepreciation, pending).bonus_asset
      .credit_basis_reduction;
  if (reductions !== joined.businessCredit) {
    throw new Error(
      "Form 8911 credit differs from filed depreciation basis reduction",
    );
  }
  return {
    ...joined,
    depreciationDocumentCount: inventory?.bonus_activities.length ?? 1,
  };
}
