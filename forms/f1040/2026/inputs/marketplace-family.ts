import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateDependentPtcMagi,
  type DependentPtcAnnualRules,
  dependentPtcReturnSchemaForYear,
  ptcDependentDividendSources,
} from "../../nodes/inputs/general/filing/general/dependent-ptc-income.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const date = z.string().date();
const amount = z.number().finite().nonnegative().refine(
  (v) =>
    Number.isSafeInteger(Math.round(v * 100)) &&
    v === Math.round(v * 100) / 100,
  "Dependent income needs safe cent precision",
);
function sumCents(values: readonly number[]): number {
  const cents = values.reduce(
    (total, value) => total + Math.round(amount.parse(value) * 100),
    0,
  );
  z.number().safe().int().parse(cents);
  return cents / 100;
}

/** Rev. Proc. 2025-32 §4.14; filing tests use source cents, Form 1040 uses dollars. */
export const dependentPtcRules2026: DependentPtcAnnualRules<2026> = {
  taxYear: 2026,
  singleStandardDeduction: 16_100,
  dependentMinimum: 1_350,
  earnedIncomeAddition: 450,
  ageOrBlindAddition: 2_050,
  sumSourceAmounts: sumCents,
  formEntry: Math.round,
};
const sharedReturn = dependentPtcReturnSchemaForYear(dependentPtcRules2026);
const incomeReturn = z.union([
  sharedReturn.options[0],
  sharedReturn.options[1],
  sharedReturn.options[3],
  z.object({
    filing: z.literal("no_income"),
    income_inventory_record_reference: ref,
    no_taxable_or_nontaxable_income_verified: z.literal(true),
    no_other_filing_trigger_verified: z.literal(true),
    return_filed: z.literal(false),
  }).strict(),
]);

/** Internal projection emitted only after the general node validates dependency. */
export const marketplaceTaxFamily2026Schema = z.object({
  tax_year: z.literal(2026),
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_tin: tin,
  spouse_tin: tin.optional(),
  taxpayer_claimable: z.boolean(),
  spouse_claimable: z.boolean().optional(),
  claimed_dependents: z.array(
    z.object({
      tin,
      dob: date,
      gross_income: amount.optional(),
    }).strict(),
  ),
}).strict();
export type MarketplaceTaxFamily2026 = z.infer<
  typeof marketplaceTaxFamily2026Schema
>;

/** No family-size, FPL-region or MAGI overrides are accepted here. */
export const marketplaceFamilyReview2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  reviewed_on: date,
  reviewer_name: ref,
  complete_dependent_income_inventory_verified: z.literal(true),
  complete_filer_residence_inventory_verified: z.literal(true),
  dependent_returns: z.array(
    z.object({
      dependent_tin: tin,
      record_reference: ref,
      reviewed_on: date,
      reviewer_name: ref,
      all_income_sources_reconciled_verified: z.literal(true),
      source: incomeReturn,
    }).strict(),
  ),
  filer_residences: z.array(
    z.object({
      filer_tin: tin,
      record_reference: ref,
      from: date,
      through: date,
      state: z.string().refine(
        (v) =>
          "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
            .split(" ").includes(v),
        "Marketplace FPL residence needs a state or DC",
      ),
    }).strict(),
  ).min(1),
}).strict();
export type MarketplaceFamilyReview2026 = z.input<
  typeof marketplaceFamilyReview2026Schema
>;

export function calculateMarketplaceFamily2026(
  rawFamily: MarketplaceTaxFamily2026,
  rawReview: MarketplaceFamilyReview2026,
) {
  const family = marketplaceTaxFamily2026Schema.parse(rawFamily);
  const review = marketplaceFamilyReview2026Schema.parse(rawReview);
  const joint = family.filing_status === FilingStatus.MFJ;
  if (family.filing_status === FilingStatus.MFS) {
    throw new Error(
      "2026 Marketplace MFS eligibility needs a separate exception route",
    );
  }
  if (
    family.taxpayer_claimable || (joint && family.spouse_claimable !== false)
  ) {
    throw new Error(
      "2026 Marketplace tax filers must not be claimable as dependents",
    );
  }
  if (joint !== (family.spouse_tin !== undefined)) {
    throw new Error(
      "2026 Marketplace joint tax family needs exactly one identified spouse",
    );
  }
  const owners = [family.taxpayer_tin, ...(joint ? [family.spouse_tin!] : [])];
  const taxFamilyTins = [
    ...owners,
    ...family.claimed_dependents.map((d) => d.tin),
  ];
  if (new Set(taxFamilyTins).size !== taxFamilyTins.length) {
    throw new Error("2026 Marketplace tax family needs distinct TINs");
  }
  if (review.reviewed_on < "2027-01-01") {
    throw new Error(
      "2026 Marketplace family review needs the complete tax year",
    );
  }
  // A mailing address or policy's coverage state does not establish FPL residence.
  for (const owner of owners) {
    const residences = review.filer_residences.filter((r) =>
      r.filer_tin === owner
    )
      .sort((a, b) => a.from.localeCompare(b.from));
    let next = "2026-01-01";
    for (const residence of residences) {
      if (
        residence.from !== next || residence.through < residence.from ||
        residence.through > "2026-12-31"
      ) {
        throw new Error(
          "2026 Marketplace residence records must cover the year without gaps or overlaps",
        );
      }
      next = new Date(Date.parse(`${residence.through}T00:00:00Z`) + 86400000)
        .toISOString().slice(0, 10);
    }
    if (next !== "2027-01-01") {
      throw new Error(
        "2026 Marketplace residence records must cover each filer's complete year",
      );
    }
  }
  if (review.filer_residences.some((r) => !owners.includes(r.filer_tin))) {
    throw new Error("2026 Marketplace FPL residence must name a tax filer");
  }
  const region = review.filer_residences.some((r) => r.state === "AK")
    ? "alaska" as const
    : review.filer_residences.some((r) => r.state === "HI")
    ? "hawaii" as const
    : "contiguous" as const;
  const byTin = new Map(
    review.dependent_returns.map((d) => [d.dependent_tin, d]),
  );
  if (
    byTin.size !== review.dependent_returns.length ||
    byTin.size !== family.claimed_dependents.length ||
    family.claimed_dependents.some((d) => !byTin.has(d.tin))
  ) {
    throw new Error(
      "2026 Marketplace income inventory must classify every claimed dependent exactly once",
    );
  }
  const documents = [
    review.record_reference,
    ...review.filer_residences.map((r) => r.record_reference),
  ];
  const incomes = family.claimed_dependents.flatMap((dependent) => {
    if (dependent.dob > "2026-12-31") {
      throw new Error(
        "2026 Marketplace dependent birth date must fall on or before year end",
      );
    }
    const row = byTin.get(dependent.tin)!;
    if (
      row.reviewed_on < "2027-01-01" || row.reviewed_on > review.reviewed_on
    ) {
      throw new Error(
        "2026 Marketplace dependent income review must precede the complete family review",
      );
    }
    documents.push(row.record_reference);
    const source = row.source;
    if (source.filing === "no_income") {
      documents.push(source.income_inventory_record_reference);
      if ((dependent.gross_income ?? 0) !== 0) {
        throw new Error(
          "2026 Marketplace no-income review conflicts with dependency gross income",
        );
      }
      return [];
    }
    let gross: number;
    if (source.filing === "not_required") {
      const filingReview = source.filing_requirement_review;
      if (filingReview.reviewed_on > row.reviewed_on) {
        throw new Error(
          "2026 Marketplace filing review must precede the dependent income review",
        );
      }
      const form = "wage_form_w2" in source
        ? source.wage_form_w2
        : source.interest_form1099;
      const owner = "employee_ssn" in form
        ? form.employee_ssn
        : form.recipient_ssn;
      if (owner.replaceAll("-", "") !== dependent.tin) {
        throw new Error(
          "2026 Marketplace dependent source must name the claimed person",
        );
      }
      documents.push(filingReview.source_document_id, form.source_document_id);
      if ("box1_wages" in form) gross = amount.parse(form.box1_wages);
      else {
        gross = amount.parse(form.box1_taxable_interest);
        amount.parse(form.box8_tax_exempt_interest);
      }
    } else {
      const filed = source.filed_form1040;
      if (filed.taxpayer_ssn?.replaceAll("-", "") !== dependent.tin) {
        throw new Error(
          "2026 Marketplace filed dependent return must name the claimed person",
        );
      }
      documents.push(filed.source_document_id);
      const forms = [
        ...source.interest_forms1099,
        ...(source.wage_forms_w2 ?? []),
        ...ptcDependentDividendSources(source),
      ];
      for (const form of forms) {
        const owner = "employee_ssn" in form
          ? form.employee_ssn
          : form.recipient_ssn;
        if (owner?.replaceAll("-", "") !== dependent.tin) {
          throw new Error(
            "2026 Marketplace dependent income form must name the claimed person",
          );
        }
        documents.push(form.source_document_id);
        for (const [key, value] of Object.entries(form)) {
          if (key.startsWith("box") && typeof value === "number") {
            amount.parse(value);
          }
        }
      }
      for (const [key, value] of Object.entries(filed)) {
        if (key.startsWith("line") && typeof value === "number") {
          z.number().int().safe().parse(value);
        }
      }
      gross = sumCents([
        ...source.interest_forms1099.map((f) => f.box1_taxable_interest),
        ...(source.wage_forms_w2 ?? []).map((f) => f.box1_wages),
        ...ptcDependentDividendSources(source).map((f) =>
          f.box1a_ordinary_dividends
        ),
      ]);
    }
    if (
      dependent.gross_income !== undefined && dependent.gross_income !== gross
    ) {
      throw new Error(
        "2026 Marketplace sourced gross income conflicts with dependency facts",
      );
    }
    return [{ ssn: dependent.tin, dob: dependent.dob, ptc_tax_return: source }];
  });
  if (new Set(documents).size !== documents.length) {
    throw new Error(
      "2026 Marketplace family reviews and income sources need distinct document references",
    );
  }
  const magi = calculateDependentPtcMagi(incomes, dependentPtcRules2026);
  z.number().int().safe().parse(magi);
  return {
    tax_family_tins: taxFamilyTins,
    filing_status: family.filing_status,
    household_size: taxFamilyTins.length,
    fpl_region: region,
    dependents_modified_agi: magi,
    dependent_income_complete: true as const,
    source_review: review,
  };
}
