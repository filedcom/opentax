import { assertEquals, assertThrows } from "@std/assert";
import { general_2026, inputSchema as generalSchema } from "./general.ts";
import { DependentRelationship } from "../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateMarketplaceFamily2026,
  type MarketplaceFamilyReview2026,
  type MarketplaceTaxFamily2026,
  marketplaceTaxFamily2026Schema,
} from "./marketplace-family.ts";
import { prepareMarketplace2026 } from "./marketplace-preparation.ts";
import { marketplaceSource2026 } from "./marketplace.fixture.ts";
import { calculateForm8962_2026 } from "../form8962.ts";
import { refundAllocationGraph2026 } from "./refund-allocation.fixture.ts";

const context = { taxYear: 2026, formType: "f1040" };
function general(
  dependents: Parameters<typeof general_2026.compute>[1]["dependents"] = [],
) {
  return generalSchema.parse({
    ...refundAllocationGraph2026().general,
    dependents,
  });
}
function child(tin = "222334444") {
  return {
    first_name: "Alex",
    last_name: "Wheat",
    ssn: tin,
    dob: "2010-06-01",
    relationship: DependentRelationship.Son,
    months_in_home: 12,
    lived_in_us_over_half_year: true,
    months_lived_with_you_in_us: 12,
    ssn_valid_for_employment: true,
    ssn_issued_before_due_date: true,
    tin_issued_by_due_date: true,
    us_citizen_national_or_resident: true,
    provided_over_half_own_support: false,
    filed_joint_return_except_refund_only: false,
  };
}
function family(input = general()) {
  return marketplaceTaxFamily2026Schema.parse(
    general_2026.compute(context, input).outputs.find((r) =>
      r.nodeType === "f1095a"
    )!.fields.tax_family,
  );
}
function review(f = family()): MarketplaceFamilyReview2026 {
  return {
    tax_year: 2026,
    record_reference: "complete-family-review",
    reviewed_on: "2027-02-28",
    reviewer_name: "Example Reviewer",
    complete_dependent_income_inventory_verified: true,
    complete_filer_residence_inventory_verified: true,
    dependent_returns: f.claimed_dependents.map((d) => ({
      dependent_tin: d.tin,
      record_reference: `${d.tin}-income-review`,
      reviewed_on: "2027-02-28",
      reviewer_name: "Example Reviewer",
      all_income_sources_reconciled_verified: true,
      source: {
        filing: "no_income",
        income_inventory_record_reference: `${d.tin}-income-inventory`,
        no_taxable_or_nontaxable_income_verified: true,
        no_other_filing_trigger_verified: true,
        return_filed: false,
      },
    })),
    filer_residences: [f.taxpayer_tin, ...(f.spouse_tin ? [f.spouse_tin] : [])]
      .map((filer_tin) => ({
        filer_tin,
        record_reference: `${filer_tin}-residence`,
        from: "2026-01-01",
        through: "2026-12-31",
        state: "TX",
      })),
  };
}
function required(
  tin: string,
  wage = 16101,
  interest = 0,
  exempt = 0,
  blind = false,
) {
  return {
    filing: "required" as const,
    filed_form1040: {
      source_document_id: `${tin}-1040`,
      taxpayer_ssn: tin,
      tax_year: 2026 as const,
      filing_status: "single" as const,
      blind,
      line1z_wages: Math.round(wage),
      line2a_tax_exempt_interest: Math.round(exempt),
      line2b_taxable_interest: Math.round(interest),
      line3b_dividends: 0,
      line4b_ira: 0 as const,
      line5b_pensions: 0 as const,
      line6b_social_security: 0 as const,
      line7a_capital_gain: 0 as const,
      line8_additional_income: 0 as const,
      line10_adjustments: 0 as const,
      line11b_agi: Math.round(wage) + Math.round(interest),
    },
    interest_forms1099: [{
      source_document_id: `${tin}-1099`,
      recipient_ssn: tin,
      box1_taxable_interest: interest,
      box8_tax_exempt_interest: exempt,
    }],
    ...(wage > 0
      ? {
        wage_forms_w2: [{
          source_document_id: `${tin}-w2`,
          employer_name: "Example Employer",
          employer_ein: "000000057",
          employee_ssn: tin,
          box1_wages: wage,
        }],
      }
      : {}),
  };
}
function notRequired(tin: string, wage = 16100) {
  return {
    filing: "not_required" as const,
    wage_form_w2: {
      source_document_id: `${tin}-w2`,
      employer_name: "Example Employer",
      employer_ein: "000000057",
      employee_ssn: tin,
      box1_wages: wage,
    },
    filing_requirement_review: {
      source_document_id: `${tin}-filing-review`,
      dependent_ssn: tin,
      tax_year: 2026 as const,
      filing_status: "single" as const,
      blind: false as const,
      wage_source_document_id: `${tin}-w2`,
      other_income_reviewed_absent: true as const,
      other_filing_triggers_reviewed_absent: true as const,
      return_filed: false as const,
      reviewed_on: "2027-02-27",
      reviewer_name: "Example Reviewer",
    },
  };
}
function calculate(f: MarketplaceTaxFamily2026, r = review(f)) {
  return calculateMarketplaceFamily2026(f, r);
}

Deno.test("2026 Marketplace family uses validated claimed dependents and preserves source data", () => {
  const f = family(
    general([child(), { ...child("333445555"), claim_as_dependent: false }]),
  );
  const r = review(f), held = structuredClone(r), result = calculate(f, r);
  assertEquals(result.tax_family_tins, ["400001037", "222334444"]);
  assertEquals(result.household_size, 2);
  assertEquals(result.dependents_modified_agi, 0);
  assertEquals(r, held);
  assertThrows(
    () =>
      family(general([{ ...child(), provided_over_half_own_support: true }])),
    Error,
    "Claimed dependent",
  );
});

Deno.test("2026 Marketplace dependent wage threshold includes all required income only above 16100", () => {
  const f = family(general([child()])), r = review(f);
  r.dependent_returns[0].source = notRequired("222334444");
  assertEquals(calculate(f, r).dependents_modified_agi, 0);
  r.dependent_returns[0].source = notRequired("222334444", 16100.01);
  assertThrows(() => calculate(f, r), Error, "filing threshold");
  r.dependent_returns[0].source = required("222334444", 16100);
  assertThrows(() => calculate(f, r), Error, "does not establish the 2026");
  r.dependent_returns[0].source = required("222334444", 16100.01, 0, 100.55);
  assertEquals(calculate(f, r).dependents_modified_agi, 16201);
  r.dependent_returns[0].source = required("222334444", 16101, 0, 100);
  assertEquals(calculate(f, r).dependents_modified_agi, 16201);
});

Deno.test("2026 Marketplace dependent filing tests include unearned and combined income", () => {
  const f = family(general([child()])), r = review(f);
  for (
    const [wage, interest, expected] of [[0, 1350, null], [0, 1350.01, 1350], [
      5000,
      450,
      null,
    ], [5000, 450.01, 5450]] as const
  ) {
    r.dependent_returns[0].source = required("222334444", wage, interest, 0);
    if (expected === null) {
      assertThrows(() => calculate(f, r), Error, "does not establish");
    } else assertEquals(calculate(f, r).dependents_modified_agi, expected);
  }
});

Deno.test("2026 Marketplace dependent age and blindness use 2050 and the January 2 birthday boundary", () => {
  const f = family(general([child()])), r = review(f);
  // Test the income component independently of relative dependency gross-income limits.
  f.claimed_dependents[0].dob = "1962-01-01";
  r.dependent_returns[0].source = required("222334444", 0, 3400);
  assertThrows(() => calculate(f, r), Error, "does not establish");
  r.dependent_returns[0].source = required("222334444", 0, 3401);
  assertEquals(calculate(f, r).dependents_modified_agi, 3401);
  f.claimed_dependents[0].dob = "1962-01-02";
  r.dependent_returns[0].source = required("222334444", 0, 3400);
  assertEquals(calculate(f, r).dependents_modified_agi, 3400);
  r.dependent_returns[0].source = required("222334444", 0, 3400, 0, true);
  assertThrows(() => calculate(f, r), Error, "does not establish");
  f.claimed_dependents[0].dob = "1962-01-01";
  r.dependent_returns[0].source = required("222334444", 0, 5451, 0, true);
  assertEquals(calculate(f, r).dependents_modified_agi, 5451);
});

Deno.test("2026 Marketplace rounds aggregated source entries once but tests filing against source cents", () => {
  const f = family(general([child()])), r = review(f);
  const source = required("222334444", 0, 1350.4, 10.4);
  source.interest_forms1099.push({
    source_document_id: "second-interest",
    recipient_ssn: "222334444",
    box1_taxable_interest: 0.4,
    box8_tax_exempt_interest: 0.4,
  });
  source.filed_form1040.line2b_taxable_interest = 1351;
  source.filed_form1040.line2a_tax_exempt_interest = 11;
  source.filed_form1040.line11b_agi = 1351;
  r.dependent_returns[0].source = source;
  assertEquals(calculate(f, r).dependents_modified_agi, 1362);
  source.filed_form1040.line2b_taxable_interest = 1350;
  assertThrows(() => calculate(f, r), Error, "must reconcile");
});

Deno.test("2026 Marketplace rejects missing, repeated, foreign-owned or stale dependent income evidence", () => {
  const f = family(general([child(), child("333445555")])), base = review(f);
  base.dependent_returns[0].source = required("222334444");
  base.dependent_returns[1].source = required("333445555");
  assertEquals(calculate(f, base).dependents_modified_agi, 32202);
  for (
    const mutate of [
      (r: MarketplaceFamilyReview2026) => {
        r.dependent_returns.pop();
      },
      (r: MarketplaceFamilyReview2026) => {
        r.dependent_returns.push(r.dependent_returns[0]);
      },
      (r: MarketplaceFamilyReview2026) => {
        r.dependent_returns[1].source = required("222334444");
      },
      (r: MarketplaceFamilyReview2026) => {
        r.dependent_returns[0].reviewed_on = "2026-12-31";
      },
      (r: MarketplaceFamilyReview2026) => {
        r.dependent_returns[0].reviewed_on = "2027-03-01";
      },
      (r: MarketplaceFamilyReview2026) => {
        r.dependent_returns[0].record_reference = r.record_reference;
      },
    ]
  ) {
    const r = structuredClone(base);
    mutate(r);
    assertThrows(() => calculate(f, r));
  }
  const source = required("333445555");
  source.filed_form1040.source_document_id = "222334444-1040";
  base.dependent_returns[1].source = source;
  assertThrows(() => calculate(f, base), Error, "distinct document");
});

Deno.test("2026 Marketplace rejects unsupported returns, wrong years, fractional cents and dependency conflicts", () => {
  const f = family(general([child()])), r = review(f);
  assertThrows(() =>
    calculate(
      f,
      {
        ...r,
        dependent_returns: [{
          ...r.dependent_returns[0],
          source: { filing: "form8814" },
        }],
      } as never,
    )
  );
  const source = required("222334444");
  r.dependent_returns[0].source = source;
  source.interest_forms1099[0].box8_tax_exempt_interest = 0.001;
  assertThrows(() => calculate(f, r), Error, "cent precision");
  source.interest_forms1099[0].box8_tax_exempt_interest = 0;
  assertThrows(() =>
    calculate(
      f,
      {
        ...r,
        dependent_returns: [{
          ...r.dependent_returns[0],
          source: {
            ...source,
            filed_form1040: { ...source.filed_form1040, tax_year: 2025 },
          },
        }],
      } as never,
    )
  );
  f.claimed_dependents[0].gross_income = 0;
  assertThrows(() => calculate(f, r), Error, "conflicts with dependency facts");
  r.dependent_returns[0].source = review(f).dependent_returns[0].source;
  f.claimed_dependents[0].gross_income = 10;
  assertThrows(() => calculate(f, r), Error, "no-income review conflicts");
});

Deno.test("2026 Marketplace FPL uses highest filer residence region including joint filers and moves", () => {
  const f = family();
  f.filing_status = FilingStatus.MFJ;
  f.spouse_tin = "555667777";
  f.spouse_claimable = false;
  const r = review(f);
  r.filer_residences[1].state = "HI";
  assertEquals(calculate(f, r).fpl_region, "hawaii");
  r.filer_residences[0].through = "2026-12-30";
  r.filer_residences.push({
    filer_tin: f.taxpayer_tin,
    from: "2026-12-31",
    through: "2026-12-31",
    state: "AK",
    record_reference: "alaska-move",
  });
  assertEquals(calculate(f, r).fpl_region, "alaska");
  assertEquals(calculate(f, r).household_size, 2);
  r.filer_residences[2].from = "2026-12-30";
  assertThrows(() => calculate(f, r), Error, "gaps or overlaps");
  r.filer_residences[2].from = "2026-12-31";
  r.filer_residences[0].through = "2026-12-29";
  assertThrows(() => calculate(f, r), Error, "gaps or overlaps");
});

Deno.test("2026 Marketplace FPL requires complete filer residence and excludes a dependent's residence", () => {
  const f = family(general([child()])), r = review(f);
  r.filer_residences[0].filer_tin = "222334444";
  assertThrows(() => calculate(f, r), Error, "each filer's complete year");
  r.filer_residences = review(f).filer_residences;
  r.filer_residences.push({
    ...r.filer_residences[0],
    filer_tin: "222334444",
    record_reference: "child-alaska",
    state: "AK",
  });
  assertThrows(() => calculate(f, r), Error, "must name a tax filer");
  assertThrows(
    () => calculate({ ...f, taxpayer_claimable: true }),
    Error,
    "must not be claimable",
  );
  assertThrows(
    () => calculate({ ...f, filing_status: FilingStatus.MFS }),
    Error,
    "exception route",
  );
});

Deno.test("2026 Marketplace source preparation binds coverage to general family without total overrides", () => {
  const f = family(),
    r = review(f),
    input = { claim: marketplaceSource2026().claim, family_review: r };
  const prepared = prepareMarketplace2026(f, input);
  assertEquals(
    calculateForm8962_2026({
      ...prepared.calculation_input,
      taxpayer_modified_agi: 62600,
    }).schedule3.line9_premium_tax_credit,
    765,
  );
  assertEquals(
    calculateForm8962_2026({
      ...prepared.calculation_input,
      taxpayer_modified_agi: 62601,
    }).schedule2.line1a_excess_advance_premium,
    3000,
  );
  assertThrows(() =>
    prepareMarketplace2026(f, { ...input, household_size: 2 } as never)
  );
  assertThrows(
    () =>
      prepareMarketplace2026(f, {
        ...input,
        family_review: { ...r, reviewed_on: "2027-03-02" },
      }),
    Error,
    "precede the complete claim",
  );
  input.claim.copies[0].covered_individuals.push({
    individual_tin: "222334444",
    enrolled_from: "2026-01-01",
    enrolled_through: "2026-12-31",
  });
  assertThrows(() => prepareMarketplace2026(f, input), Error, "tax family");
});

Deno.test("2026 Marketplace excludes reviewed interest-only non-filers and checks the review owner", () => {
  const f = family(general([child()])), r = review(f);
  const source = {
    filing: "not_required" as const,
    interest_form1099: {
      source_document_id: "child-1099",
      recipient_ssn: "222334444",
      box1_taxable_interest: 1350,
      box8_tax_exempt_interest: 500,
    },
    filing_requirement_review: {
      source_document_id: "child-filing-review",
      dependent_ssn: "222334444",
      tax_year: 2026 as const,
      filing_status: "single" as const,
      blind: false as const,
      interest_source_document_id: "child-1099",
      other_income_reviewed_absent: true as const,
      other_filing_triggers_reviewed_absent: true as const,
      return_filed: false as const,
      reviewed_on: "2027-02-27",
      reviewer_name: "Example Reviewer",
    },
  };
  r.dependent_returns[0].source = source;
  assertEquals(calculate(f, r).dependents_modified_agi, 0);
  source.interest_form1099.box1_taxable_interest = 1350.01;
  assertThrows(() => calculate(f, r));
  source.interest_form1099.box1_taxable_interest = 1350;
  source.filing_requirement_review.dependent_ssn = "333445555";
  assertThrows(
    () => calculate(f, r),
    Error,
    "must match the under-65 dependent",
  );
  source.filing_requirement_review.dependent_ssn = "222334444";
  source.filing_requirement_review.reviewed_on = "2027-02-30";
  assertThrows(() => calculate(f, r));
});

Deno.test("2026 Marketplace sourced dependent MAGI changes the two-person 400-percent cliff", () => {
  const f = family(general([child()])), r = review(f);
  r.dependent_returns[0].source = required("222334444", 0, 1351);
  const prepared = prepareMarketplace2026(f, {
    claim: marketplaceSource2026().claim,
    family_review: r,
  });
  assertEquals(prepared.calculation_input.household_size, 2);
  assertEquals(prepared.calculation_input.dependents_modified_agi, 1351);
  assertEquals(
    calculateForm8962_2026({
      ...prepared.calculation_input,
      taxpayer_modified_agi: 83249,
    }).schedule2.line1a_excess_advance_premium,
    1426,
  );
  assertEquals(
    calculateForm8962_2026({
      ...prepared.calculation_input,
      taxpayer_modified_agi: 83250,
    }).schedule2.line1a_excess_advance_premium,
    3000,
  );
});

Deno.test("2026 general projects the verified joint spouse into the Marketplace family", () => {
  const input = {
    ...general(),
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Morgan",
    spouse_last_name: "Wheat",
    spouse_ssn: "555667777",
    spouse_dob: "1988-01-02",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  };
  const f = family(input);
  assertEquals(calculate(f).tax_family_tins, ["400001037", "555667777"]);
  assertThrows(
    () => family({ ...input, spouse_ssn: "400001037" }),
    Error,
    "distinct TINs",
  );
});
