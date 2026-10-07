import { z } from "zod";
import { CONFIG_BY_YEAR } from "../../config/index.ts";
import {
  computeGrossIncome,
  itemSchema as farmSchema,
} from "../../intermediate/forms/schedule_f/model.ts";
import {
  ownedScheduleSE,
  ownerSourcesSchema,
} from "../../intermediate/forms/schedule_se/owner-calculation.ts";
import { independentReviewsSchema, sourceSchema } from "./schema.ts";
import {
  calculateIndependentOwnerHealth,
  independentOwnerHealthSourceSchema,
} from "../../intermediate/forms/form7206/independent-owner.ts";
import { patronSourceAmounts } from "./calculation.ts";
import {
  calculateOwnedSep,
  ownedSepSourceSchema,
} from "../sep_retirement/owned-source.ts";

export const independentPatronSourceSchema = z.object({
  review: independentReviewsSchema,
  businesses: z.array(sourceSchema).length(2),
  owned_se_source: ownerSourcesSchema,
  owned_health_source: independentOwnerHealthSourceSchema.optional(),
  owned_retirement_source: ownedSepSourceSchema.optional(),
}).strict();

/** This route is two independent joint proprietors; generic business routes
 * retain their own cardinality and aggregation contracts. */
export function independentPatronSources(
  reviewRaw: unknown,
  farmsRaw: unknown,
  seRaw: unknown,
  healthRaw?: unknown,
  retirementRaw?: unknown,
) {
  const review = independentReviewsSchema.parse(reviewRaw);
  const farms = z.array(farmSchema).length(2).parse(farmsRaw);
  const se = ownedScheduleSE(seRaw, CONFIG_BY_YEAR[2025].ssWageBase);
  if (
    se.source.businesses.length !== farms.length ||
    se.source.wages.length !== 0 ||
    se.instances.length !== farms.length ||
    se.instances.some((r) =>
      r.farm_optional_method_elected || r.net_profit_schedule_c !== 0
    )
  ) {
    throw new Error(
      "Independent patron farms need separate positive regular owner SE without wages or other businesses",
    );
  }
  const health = healthRaw === undefined
    ? undefined
    : calculateIndependentOwnerHealth(
      healthRaw,
      se.source,
      CONFIG_BY_YEAR[2025].ssWageBase,
      retirementRaw,
    );
  const retirement = retirementRaw === undefined
    ? undefined
    : calculateOwnedSep(
      retirementRaw,
      se.source,
      CONFIG_BY_YEAR[2025].ssWageBase,
    );
  if (retirement) {
    if (
      retirement.source.employer_relationship_review
        .spousal_attribution_exception_reviews.some((r) => {
          const farm = farms.find((f) => f.farm_id === r.business_reference);
          return !farm ||
            Math.abs(computeGrossIncome(farm) - r.section61_gross_income) >
              .005;
        })
    ) {
      throw new Error(
        "Owned SEP spousal attribution gross-income review must match the actual farm source books",
      );
    }
    if (
      farms.some((farm) =>
        Math.abs(
          (farm.line23_pension_plans ?? 0) -
            (retirement.rows.find((r) => r.business_reference === farm.farm_id)
              ?.employee_contribution ?? 0),
        ) > .005
      )
    ) {
      throw new Error(
        "Owned SEP plan inventory must account for every farm employee pension expense",
      );
    }
    for (const plan of retirement.source.plans) {
      const farm = farms.find((f) => f.farm_id === plan.business_reference);
      const payroll = review.independent_farm_reviews.find((r) =>
        r.business.kind === "schedule_f" &&
        r.business.farm_id === plan.business_reference
      )?.employee_w2_records;
      const row = retirement.rows.find((r) =>
        r.business_reference === plan.business_reference
      )!;
      if (
        !farm || farm.line_d_ein?.replace(/-/g, "") !== plan.employer_ein ||
        !payroll ||
        Math.abs((farm.line23_pension_plans ?? 0) - row.employee_contribution) >
          0.005 ||
        payroll.length !== plan.employee_census.length ||
        plan.employee_census.some((e) => {
          const record = payroll.find((w) =>
            w.employee_reference === e.employee_reference
          );
          return !record ||
            record.source_document_reference !==
              e.payroll_source_document_reference ||
            record.box1_wages !== e.compensation ||
            record.employee_ssn !== e.employee_ssn ||
            e.employee_ssn === se.source.identity.primary_ssn ||
            e.employee_ssn === se.source.identity.spouse_ssn;
        })
      ) {
        throw new Error(
          "Owned SEP employee census, compensation and pension expenses must reconcile to its actual farm payroll and employer",
        );
      }
    }
  }
  const references = new Set<string>();
  const owners = new Set<string>();
  const farmIdentifiers = new Set<string>();
  const businesses = review.independent_farm_reviews.map((r) => {
    if (r.business.kind !== "schedule_f") {
      throw new Error("Independent patron route needs cash farm reviews");
    }
    const farmId = r.business.farm_id;
    const farm = farms.find((f) => f.farm_id === farmId);
    const owner = farm?.proprietor_recipient;
    const identity = owner === "T"
      ? se.source.identity.primary_ssn
      : se.source.identity.spouse_ssn;
    const instance = se.instances.find((s) => s.recipient === owner);
    const ownedBusiness = se.source.businesses.find((b) =>
      b.source_reference === farm?.farm_id
    );
    if (
      !farm || !owner || owners.has(owner) || !instance || !ownedBusiness ||
      ownedBusiness.recipient !== owner ||
      ownedBusiness.kind !== "schedule_f" ||
      ownedBusiness.qbi_no_other_adjustments_confirmed !== true ||
      farm.qbi_no_other_adjustments_confirmed !== true ||
      farm.line36_at_risk !== "a" || farm.at_risk_simplified ||
      farm.qbi_wotc_filing_review ||
      farm.donated_natural_resource_property_source ||
      r.source_1099patr.recipient_tin !== identity ||
      (r.box6_written_notice_review &&
        r.box6_written_notice_review.recipient_tin !== identity)
    ) {
      throw new Error(
        "Independent patron source must join each actual proprietor, farm and cooperative recipient",
      );
    }
    owners.add(owner);
    for (
      const reference of [
        farm.farm_id!,
        r.source_1099patr.source_document_reference!,
        r.payroll_source_reference,
        r.allocation_worksheet_reference,
        ...(r.box6_written_notice_review
          ? [r.box6_written_notice_review.notice_reference]
          : []),
        ...r.employee_w2_records.map((w) => w.source_document_reference),
      ]
    ) {
      if (!reference || references.has(reference)) {
        throw new Error(
          "Independent patron source references must be distinct",
        );
      }
      references.add(reference);
    }
    // Distinct proprietors may receive separate issued copies from the same
    // cooperative. Only the owned farm identity must be distinct; payer identity
    // remains reconciled to each actual recipient and source copy.
    const farmEin = farm.line_d_ein?.replace(/\D/g, "");
    if (!farmEin || farmIdentifiers.has(farmEin)) {
      throw new Error("Independent patron farm identities must be distinct");
    }
    farmIdentifiers.add(farmEin);
    const source = sourceSchema.parse({
      review: r,
      business_source: farm,
      se_tax_deduction: instance.line13,
      health_insurance_deduction: health?.rows.filter((h) =>
        h.business_reference === farm.farm_id
      ).reduce((n, h) => n + h.line14, 0) ?? 0,
      retirement_plan_deduction: retirement?.rows.find((r) =>
        r.business_reference === farmId
      )?.raw_deduction ?? 0,
    });
    const amounts = patronSourceAmounts(source);
    if (
      instance.net_profit_schedule_f !== amounts.profit ||
      ownedBusiness.net_profit !== amounts.profit ||
      ownedBusiness.ein !== amounts.ein ||
      ownedBusiness.business_name !== amounts.name
    ) {
      throw new Error(
        "Independent patron filed farm profit differs from actual owner SE source",
      );
    }
    return source;
  });
  const amounts = businesses.map(patronSourceAmounts);
  return {
    source: {
      review,
      businesses,
      owned_se_source: se.source,
      ...(health ? { owned_health_source: health.source } : {}),
      ...(retirement ? { owned_retirement_source: retirement.source } : {}),
    },
    health,
    retirement,
    se,
    amounts,
    profit: amounts.reduce((s, r) => s + r.profit, 0),
    qbi: amounts.reduce((s, r) => s + r.qbi, 0),
    wages: amounts.reduce((s, r) => s + r.wages, 0),
  };
}

export function replayIndependentPatronSources(raw: unknown) {
  const source = independentPatronSourceSchema.parse(raw);
  const result = independentPatronSources(
    source.review,
    source.businesses.map((s) => s.business_source),
    source.owned_se_source,
    source.owned_health_source,
    source.owned_retirement_source,
  );
  if (JSON.stringify(source) !== JSON.stringify(result.source)) {
    throw new Error(
      "Independent patron attributable deductions differ from actual owner SE",
    );
  }
  return result;
}
