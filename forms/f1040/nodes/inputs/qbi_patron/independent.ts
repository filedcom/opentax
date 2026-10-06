import { z } from "zod";
import { CONFIG_BY_YEAR } from "../../config/index.ts";
import { itemSchema as farmSchema } from "../../intermediate/forms/schedule_f/model.ts";
import {
  ownedScheduleSE,
  ownerSourcesSchema,
} from "../../intermediate/forms/schedule_se/owner-calculation.ts";
import { independentReviewsSchema, sourceSchema } from "./schema.ts";
import { patronSourceAmounts } from "./calculation.ts";

export const independentPatronSourceSchema = z.object({
  review: independentReviewsSchema,
  businesses: z.array(sourceSchema).length(2),
  owned_se_source: ownerSourcesSchema,
}).strict();

/** This route is two independent joint proprietors; generic business routes
 * retain their own cardinality and aggregation contracts. */
export function independentPatronSources(
  reviewRaw: unknown,
  farmsRaw: unknown,
  seRaw: unknown,
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
  const references = new Set<string>();
  const owners = new Set<string>();
  const identifiers = new Set<string>();
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
    for (
      const id of [
        farm.line_d_ein?.replace(/\D/g, ""),
        r.source_1099patr.payer_tin,
      ]
    ) {
      if (!id || identifiers.has(id)) {
        throw new Error(
          "Independent patron businesses and cooperative identities must be distinct",
        );
      }
      identifiers.add(id);
    }
    const source = sourceSchema.parse({
      review: r,
      business_source: farm,
      se_tax_deduction: instance.line13,
      health_insurance_deduction: 0,
      retirement_plan_deduction: 0,
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
    source: { review, businesses, owned_se_source: se.source },
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
  );
  if (JSON.stringify(source) !== JSON.stringify(result.source)) {
    throw new Error(
      "Independent patron attributable deductions differ from actual owner SE",
    );
  }
  return result;
}
