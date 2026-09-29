// Black-box tests for the General node (Drake Screen 1/2).
// Written from context.md only — implementation does NOT exist yet.
//
// Assumptions verified against context.md:
//   - nodeType: "general"
//   - inputSchema is a SINGLE OBJECT (not an array)
//   - filing_status uses FilingStatus enum from types.ts: "single","mfj","mfs","hoh","qss"
//   - DependentRelationship enum: "son","daughter","stepchild","foster","sibling",etc.
//   - Qualifying child for CTC: ssn present + no itin + under 17 at Dec 31 2025 + months_in_home > 6
//   - disability does not waive the under-17 CTC age test
//   - qualifying_child_for_ctc can account for a residency exception only
//   - Routing: all outputs go to nodeType "f1040"
//   - f1040 output fields: filing_status, dependent_count,
//     qualifying_child_tax_credit_count, other_dependent_count
//   - Informational fields (names, address) do NOT affect computed counts
//
// If a test fails, fix the implementation — not the test.

import { assertEquals, assertThrows } from "@std/assert";
import { general } from "./index.ts";
import { FilingStatus } from "../../types.ts";
import { DependentRelationship } from "./index.ts";

function compute(input: Record<string, unknown>) {
  const filer = {
    taxpayer_ssn: "111-22-3333",
    taxpayer_ssn_valid_for_employment: true,
    taxpayer_ssn_issued_before_due_date: true,
    taxpayer_tin_issued_by_due_date: true,
    spouse_ssn: "222-33-4444",
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
  };
  return general.compute(
    { taxYear: 2025, formType: "f1040" },
    general.inputSchema.parse({ ...filer, ...input }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("general gives Form 8880 filing status and both return SSNs", () => {
  const result = compute({ filing_status: FilingStatus.MFJ });
  assertEquals(findOutput(result, "form8880")?.fields, {
    filing_status: FilingStatus.MFJ,
    taxpayer_ssn: "111-22-3333",
    spouse_ssn: "222-33-4444",
  });
});

Deno.test("general sends each Form 8880 contributor's eligibility facts", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_dob: "1980-01-01",
    spouse_dob: "1981-01-01",
    taxpayer_form8880_student_five_months: false,
    spouse_form8880_student_five_months: true,
    taxpayer_form8880_claimed_as_dependent: false,
    spouse_form8880_claimed_as_dependent: false,
  });
  assertEquals(findOutput(result, "form8880")?.fields, {
    filing_status: FilingStatus.MFJ,
    taxpayer_ssn: "111-22-3333",
    spouse_ssn: "222-33-4444",
    taxpayer_dob: "1980-01-01",
    spouse_dob: "1981-01-01",
    taxpayer_student_five_months: false,
    spouse_student_five_months: true,
    taxpayer_claimed_as_dependent: false,
    spouse_claimed_as_dependent: false,
  });
});

Deno.test("general forwards one complete Form 8880 joint distribution review", () => {
  const review = {
    filing_due_date: "2026-04-15" as const,
    reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
    entries: [
      {
        recipient: "S" as const,
        received_date: "2023-07-01",
        qualifying_amount: 1_000,
        source_document_ref: "2023-1099-R-spouse-1",
        filed_jointly_in_distribution_year: false,
        distribution_year_return_ref: "2023-spouse-filed-return",
      },
      {
        recipient: "S" as const,
        received_date: "2025-07-01",
        qualifying_amount: 500,
        source_document_ref: "2025-1099-R-spouse-1",
      },
    ],
    no_other_qualifying_distributions_in_lookback: true as const,
  };
  const result = compute({
    filing_status: FilingStatus.MFJ,
    form8880_joint_distribution_review: review,
  });
  assertEquals(
    findOutput(result, "form8880")?.fields.joint_distribution_review,
    review,
  );
});

Deno.test("general rejects the removed partial Form 8880 distribution input", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.MFJ,
      form8880_joint_2025_distribution_review: {
        entries: [],
        no_other_qualifying_distributions_in_lookback: true,
      },
    })
  );
});

Deno.test("general passes Form 461 filing status and documented C/F scope review", () => {
  const review = {
    only_schedule_c_and_f_business_items: true,
    other_part_i_lines_zero: true,
    part_ii_adjustments_zero: true,
    post_at_risk_and_passive_limits_confirmed: true,
    source_document_refs: ["return-wide business income workpaper"],
  };
  const result = compute({
    filing_status: FilingStatus.MFJ,
    form461_scope_review: review,
  });
  assertEquals(findOutput(result, "form461")?.fields, {
    filing_status: FilingStatus.MFJ,
    scope_review: review,
  });
});

Deno.test("general passes MFS lived-apart proof to Form 8582", () => {
  const apart = compute({
    filing_status: FilingStatus.MFS,
    mfs_spouse_lived_with_taxpayer: false,
  });
  assertEquals(
    findOutput(apart, "form8582")?.fields.mfs_lived_apart_all_year,
    true,
  );
  const together = compute({
    filing_status: FilingStatus.MFS,
    mfs_spouse_lived_with_taxpayer: true,
  });
  assertEquals(
    findOutput(together, "form8582")?.fields.mfs_lived_apart_all_year,
    false,
  );
});

// A minimal dependent who qualifies for CTC:
// - has SSN, no ITIN, DOB puts them under 17 at Dec 31 2025, >6 months in home
function qualifyingChildDep(overrides: Record<string, unknown> = {}) {
  return {
    first_name: "Alice",
    last_name: "Doe",
    ssn: "123-45-6789",
    ssn_valid_for_employment: true,
    ssn_issued_before_due_date: true,
    tin_issued_by_due_date: true,
    dob: "2010-06-15", // age 15 at Dec 31 2025 → under 17
    relationship: DependentRelationship.Daughter,
    months_in_home: 12,
    lived_in_us_over_half_year: true,
    us_citizen_national_or_resident: true,
    provided_over_half_own_support: false,
    filed_joint_return_except_refund_only: false,
    ...overrides,
  };
}

Deno.test("general routes required-filing dependent modified AGI to Form 8962", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({
      ptc_tax_return: {
        filing: "required",
        filed_form1040: {
          source_document_id: "dependent-2025-1040",
          tax_year: 2025,
          filing_status: "single",
          blind: false,
          line1z_wages: 0,
          line2a_tax_exempt_interest: 500,
          line2b_taxable_interest: 12_000,
          line3b_dividends: 0,
          line4b_ira: 0,
          line5b_pensions: 0,
          line6b_social_security: 0,
          line7a_capital_gain: 0,
          line8_additional_income: 0,
          line10_adjustments: 0,
          line11b_agi: 12_000,
        },
        interest_forms1099: [{
          source_document_id: "dependent-2025-1099-int",
          box1_taxable_interest: 12_000,
          box8_tax_exempt_interest: 500,
        }],
      },
    })],
  });
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.dependent_income_complete, true);
  assertEquals(fields?.dependents_modified_agi, 12_500);
});

Deno.test("general routes below-100%-FPL Marketplace eligibility to Form 8962", () => {
  const eligibility = {
    basis: "marketplace_estimate",
    no_one_can_claim_taxpayer: true,
    marketplace_coverage: true,
    marketplace_estimated_at_least_100_fpl: true,
    marketplace_information_provided_in_good_faith: true,
    otherwise_applicable_taxpayer: true,
  };
  const result = compute({
    filing_status: FilingStatus.Single,
    ptc_below_100_fpl_status: eligibility,
  });
  assertEquals(
    findOutput(result, "form8962")?.fields.below_100_fpl_status,
    eligibility,
  );
});

Deno.test("general routes reviewed MFS Marketplace status to Form 8962", () => {
  const status = {
    basis: "no_exception",
    exception_reviewed: true,
    no_one_can_claim_taxpayer: true,
    policy_scope: "family_only",
    all_covered_individuals_lawfully_present: true,
    no_self_employed_health_insurance_deduction: true,
  };
  const result = compute({
    filing_status: FilingStatus.MFS,
    ptc_mfs_status: status,
  });
  assertEquals(findOutput(result, "form8962")?.fields.mfs_ptc_status, status);
});

Deno.test("general excludes refund-only dependents and flags missing filing facts", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({ ptc_tax_return: { filing: "not_required" } }),
      qualifyingChildDep({ first_name: "Bob", ssn: "123-45-6790" }),
    ],
  });
  const fields = findOutput(result, "form8962")?.fields;
  assertEquals(fields?.dependents_modified_agi, 0);
  assertEquals(fields?.dependent_income_complete, false);
});

// A minimal dependent who does NOT qualify for CTC:
// - uses ITIN only (no SSN)
function nonCtcDep(overrides: Record<string, unknown> = {}) {
  return {
    first_name: "Bob",
    last_name: "Doe",
    itin: "900-70-0001",
    tin_issued_by_due_date: true,
    dob: "2010-01-01",
    relationship: DependentRelationship.Son,
    months_in_home: 12,
    lived_in_us_over_half_year: true,
    us_citizen_national_or_resident: true,
    provided_over_half_own_support: false,
    filed_joint_return_except_refund_only: false,
    ...overrides,
  };
}

Deno.test("filer ID facts are required before claiming CTC, ODC, or EITC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_ssn_valid_for_employment: undefined,
    taxpayer_ssn_issued_before_due_date: undefined,
    taxpayer_tin_issued_by_due_date: undefined,
    dependents: [qualifyingChildDep()],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 0);
  assertEquals(findOutput(result, "eitc")?.fields.filer_has_valid_ssns, false);
});

Deno.test("MFJ CTC needs one valid SSN and the other filer's timely TIN", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "900-70-0001",
    spouse_ssn_valid_for_employment: false,
    dependents: [qualifyingChildDep()],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    1,
  );
  assertEquals(findOutput(result, "eitc")?.fields.filer_has_valid_ssns, false);
});

Deno.test("a timely TIN without a valid filer SSN supports ODC, not CTC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_ssn_valid_for_employment: false,
    dependents: [qualifyingChildDep()],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 1);
  assertEquals(findOutput(result, "eitc")?.fields.filer_has_valid_ssns, false);
});

Deno.test("a late second MFJ TIN blocks both dependent credits", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    spouse_tin_issued_by_due_date: false,
    dependents: [qualifyingChildDep()],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 0);
});

Deno.test("a filer SSN issued on the due date can qualify for EITC but not CTC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_ssn_issued_before_due_date: false,
    dependents: [qualifyingChildDep()],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 1);
  assertEquals(findOutput(result, "eitc")?.fields.filer_has_valid_ssns, true);
  assertEquals(
    findOutput(result, "schedule1a")?.fields.taxpayer_has_valid_ssn,
    false,
  );
});

Deno.test("Schedule 1-A receives each spouse's verified SSN eligibility", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_ssn_valid_for_employment: false,
  });
  const fields = findOutput(result, "schedule1a")?.fields;
  assertEquals(fields?.taxpayer_has_valid_ssn, false);
  assertEquals(fields?.spouse_has_valid_ssn, true);
});

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema: invalid filing_status throws", () => {
  assertThrows(() => compute({ filing_status: "invalid_status" }));
});

Deno.test("schema: missing filing_status throws", () => {
  assertThrows(() => compute({}));
});

Deno.test("schema: invalid dependent relationship throws", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      dependents: [
        {
          first_name: "X",
          last_name: "Y",
          dob: "2010-01-01",
          relationship: "alien_species", // invalid
          months_in_home: 6,
        },
      ],
    })
  );
});

Deno.test("schema: months_in_home out of range (>12) throws", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      dependents: [qualifyingChildDep({ months_in_home: 13 })],
    })
  );
});

Deno.test("schema: months_in_home negative throws", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      dependents: [qualifyingChildDep({ months_in_home: -1 })],
    })
  );
});

// ============================================================
// 2. Filing Status Routing — one test per status
// ============================================================

Deno.test("routing: Single filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  const out = findOutput(result, "f1040");
  assertEquals(
    (out?.fields as Record<string, unknown>)?.filing_status,
    FilingStatus.Single,
  );
});

Deno.test("routing: MFJ filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.MFJ });
  const out = findOutput(result, "f1040");
  assertEquals(
    (out?.fields as Record<string, unknown>)?.filing_status,
    FilingStatus.MFJ,
  );
});

Deno.test("routing: MFS filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.MFS });
  const out = findOutput(result, "f1040");
  assertEquals(
    (out?.fields as Record<string, unknown>)?.filing_status,
    FilingStatus.MFS,
  );
});

Deno.test("routing: HOH filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.HOH });
  const out = findOutput(result, "f1040");
  assertEquals(
    (out?.fields as Record<string, unknown>)?.filing_status,
    FilingStatus.HOH,
  );
});

Deno.test("routing: QSS filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.QSS });
  const out = findOutput(result, "f1040");
  assertEquals(
    (out?.fields as Record<string, unknown>)?.filing_status,
    FilingStatus.QSS,
  );
});

// ============================================================
// 3. No Dependents
// ============================================================

Deno.test("dependents: empty array → qualifying_child_tax_credit_count is 0", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
});

Deno.test("dependents: absent dependents field → other_dependent_count is 0", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.other_dependent_count ?? 0, 0);
});

Deno.test("dependents: absent dependents field → dependent_count is 0", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.dependent_count ?? 0, 0);
});

Deno.test("no dependents sends verified zero credit counts to Schedule 8812", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  const fields = findOutput(result, "f8812")?.fields;
  assertEquals(fields?.auto_qualifying_children, 0);
  assertEquals(fields?.auto_other_dependents, 0);
});

// ============================================================
// 4. Qualifying Child for CTC
// ============================================================

Deno.test("ctc: child with SSN, under 17, >6 months → qualifying_child_tax_credit_count = 1", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep()],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
  assertEquals(input?.other_dependent_count ?? 0, 0);
});

Deno.test("ctc: child exactly age 16 at Dec 31 2025 qualifies (under 17)", () => {
  // DOB: Jan 1 2009 → turns 16 in 2025, still under 17
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ dob: "2009-01-01" })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

Deno.test("ctc: child who turns 17 on Dec 31 2025 does NOT qualify (not under 17)", () => {
  // DOB: Dec 31 2008 → turns exactly 17 on Dec 31 2025 → age is 17, not under 17
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ dob: "2008-12-31" })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("ctc: child with ITIN (no SSN) does not qualify for CTC → other_dependent_count = 1", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ ssn: undefined, itin: "900-70-1234" })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("six months of residency cannot claim CTC or an unverified relative ODC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ months_in_home: 6 })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 0);
});

Deno.test("ctc: child with months_in_home = 7 qualifies (> 6)", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ months_in_home: 7 })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

// ============================================================
// 5. Non-Qualifying Dependent (over 17 or ITIN)
// ============================================================

Deno.test("odc: adult child (age 20) with SSN → other_dependent_count = 1, ctc = 0", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        dob: "2005-01-01", // age 20 at Dec 31 2025
        taxpayer_provided_over_half_support: true,
        gross_income: 0,
      }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("odc: parent as dependent → other_dependent_count = 1, ctc = 0", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      {
        first_name: "Mom",
        last_name: "Doe",
        ssn: "999-88-7777",
        tin_issued_by_due_date: true,
        dob: "1955-03-01", // age 70
        relationship: DependentRelationship.Parent,
        months_in_home: 12,
        us_citizen_national_or_resident: true,
        filed_joint_return_except_refund_only: false,
        taxpayer_provided_over_half_support: true,
        gross_income: 0,
      },
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("qualifying relative ODC requires support and income facts, with the 2025 $5,200 limit", () => {
  const parent = {
    first_name: "Mom",
    last_name: "Doe",
    ssn: "999-88-7777",
    tin_issued_by_due_date: true,
    dob: "1955-03-01",
    relationship: DependentRelationship.Parent,
    months_in_home: 0,
    us_citizen_national_or_resident: true,
    filed_joint_return_except_refund_only: false,
  };
  const count = (overrides: Record<string, unknown>) => {
    const result = compute({
      filing_status: FilingStatus.Single,
      dependents: [{ ...parent, ...overrides }],
    });
    return findOutput(result, "f1040")?.fields.other_dependent_count;
  };
  assertEquals(count({}), 0);
  assertEquals(count({ gross_income: 0 }), 0);
  assertEquals(count({ taxpayer_provided_over_half_support: true }), 0);
  assertEquals(
    count({ taxpayer_provided_over_half_support: false, gross_income: 0 }),
    0,
  );
  assertEquals(
    count({ taxpayer_provided_over_half_support: true, gross_income: 5_199 }),
    1,
  );
  assertEquals(
    count({ taxpayer_provided_over_half_support: true, gross_income: 5_200 }),
    0,
  );
});

Deno.test("qualifying-relative ODC requires family relationship or full-year household membership", () => {
  const other = {
    first_name: "Pat",
    last_name: "Doe",
    itin: "900-70-0001",
    tin_issued_by_due_date: true,
    dob: "1960-01-01",
    relationship: DependentRelationship.Other,
    months_in_home: 0,
    us_citizen_national_or_resident: true,
    filed_joint_return_except_refund_only: false,
    taxpayer_provided_over_half_support: true,
    gross_income: 0,
  };
  const category = (overrides: Record<string, unknown>) => {
    const result = compute({
      filing_status: FilingStatus.Single,
      dependents: [{ ...other, ...overrides }],
    });
    return findOutput(result, "f1040")?.fields.other_dependent_count;
  };
  assertEquals(category({}), 0);
  assertEquals(category({ months_in_home: 11 }), 0);
  assertEquals(category({ months_in_home: 12 }), 1);
  assertEquals(
    category({ relationship: DependentRelationship.Grandparent }),
    1,
  );
  assertEquals(
    category({ relationship: DependentRelationship.ParentInLaw }),
    1,
  );
});

// ============================================================
// 6. Multiple Dependents — mixed
// ============================================================

Deno.test("multiple: 2 qualifying children + 1 other → ctc=2, odc=1, total=3", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    dependents: [
      qualifyingChildDep({ first_name: "Child1" }),
      qualifyingChildDep({ first_name: "Child2", dob: "2012-03-01" }),
      nonCtcDep({ first_name: "OtherDep" }), // ITIN only
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 2);
  assertEquals(input?.other_dependent_count, 1);
  assertEquals(input?.dependent_count, 3);
});

Deno.test("multiple: 3 qualifying children → ctc=3, odc=0, total=3", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    dependents: [
      qualifyingChildDep({ first_name: "C1" }),
      qualifyingChildDep({ first_name: "C2", dob: "2011-01-01" }),
      qualifyingChildDep({ first_name: "C3", dob: "2014-06-15" }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 3);
  assertEquals(input?.other_dependent_count ?? 0, 0);
  assertEquals(input?.dependent_count, 3);
});

// ============================================================
// 7. Informational Fields — do NOT affect computed counts
// ============================================================

Deno.test("informational: taxpayer name fields do not change ctc count", () => {
  const withName = compute({
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Jane",
    taxpayer_last_name: "Smith",
    dependents: [qualifyingChildDep()],
  });
  const withoutName = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep()],
  });
  const outWith = findOutput(withName, "f1040")?.fields as Record<
    string,
    unknown
  >;
  const outWithout = findOutput(withoutName, "f1040")?.fields as Record<
    string,
    unknown
  >;
  assertEquals(outWith?.qualifying_child_tax_credit_count, 1);
  assertEquals(outWithout?.qualifying_child_tax_credit_count, 1);
});

Deno.test("informational: address fields do not change ctc count", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    address_line1: "123 Main St",
    address_city: "Anytown",
    address_state: "CA",
    address_zip: "90210",
    dependents: [qualifyingChildDep()],
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

// ============================================================
// 8. HOH requires qualifying person (but node accepts it without validation)
// ============================================================

Deno.test("hoh: HOH with no dependents is still valid (node does not block)", () => {
  const result = compute({ filing_status: FilingStatus.HOH });
  const out = findOutput(result, "f1040");
  assertEquals(
    (out?.fields as Record<string, unknown>)?.filing_status,
    FilingStatus.HOH,
  );
});

// ============================================================
// 9. Disability does not waive the CTC age limit
// ============================================================

Deno.test("disabled adult child qualifies for ODC, not CTC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        dob: "1990-01-01", // age 35
        disabled: true,
      }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("dependent without qualifying U.S. status receives neither CTC nor ODC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({ us_citizen_national_or_resident: false }),
      nonCtcDep({ us_citizen_national_or_resident: false }),
    ],
  });
  const fields = findOutput(result, "f1040")?.fields;
  assertEquals(fields?.qualifying_child_tax_credit_count, 0);
  assertEquals(fields?.other_dependent_count, 0);
  assertEquals(fields?.dependent_count, 2);
});

Deno.test("child support answer is required for CTC and ODC, but not the EITC child test", () => {
  for (const answer of [undefined, true]) {
    const result = compute({
      filing_status: FilingStatus.Single,
      dependents: [
        qualifyingChildDep({ provided_over_half_own_support: answer }),
      ],
    });
    assertEquals(
      findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
      0,
    );
    assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 0);
    assertEquals(findOutput(result, "eitc")?.fields.qualifying_children, 1);
  }
});

Deno.test("a disqualifying joint return prevents dependent credits and EITC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({ filed_joint_return_except_refund_only: true }),
    ],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 0);
  assertEquals(findOutput(result, "eitc")?.fields.qualifying_children, 0);
});

Deno.test("EITC child needs an SSN and more than half-year U.S. residence", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      nonCtcDep({ first_name: "ITIN" }),
      qualifyingChildDep({
        first_name: "Abroad",
        ssn: "123-45-6790",
        lived_in_us_over_half_year: false,
      }),
    ],
  });
  assertEquals(findOutput(result, "eitc")?.fields.qualifying_children, 0);
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    1,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 1);
});

Deno.test("employment-invalid child SSN can qualify for ODC but not CTC or EITC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ ssn_valid_for_employment: false })],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 1);
  assertEquals(findOutput(result, "eitc")?.fields.qualifying_children, 0);
});

Deno.test("an unanswered SSN employment-validity question cannot claim CTC or EITC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ ssn_valid_for_employment: undefined })],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 1);
  assertEquals(findOutput(result, "eitc")?.fields.qualifying_children, 0);
});

Deno.test("SSN issued on the due date fails CTC but can meet EITC and ODC timing", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ ssn_issued_before_due_date: false })],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 1);
  assertEquals(findOutput(result, "eitc")?.fields.qualifying_children, 1);
});

Deno.test("late dependent TIN cannot support ODC or EITC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({
      ssn_issued_before_due_date: false,
      tin_issued_by_due_date: false,
    })],
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.qualifying_child_tax_credit_count,
    0,
  );
  assertEquals(findOutput(result, "f1040")?.fields.other_dependent_count, 0);
  assertEquals(findOutput(result, "eitc")?.fields.qualifying_children, 0);
});

Deno.test("qualifying EITC child identity reaches the Schedule EIC input", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({
      name_control: "DOE",
      irs_relationship_code: "DAUGHTER",
      ip_pin: "123456",
    })],
  });
  const fields = findOutput(result, "eitc")?.fields;
  assertEquals(fields?.qualifying_children, 1);
  assertEquals(fields?.qualifying_child_details, [{
    first_name: "Alice",
    last_name: "Doe",
    name_control: "DOE",
    ssn: "123-45-6789",
    ssn_valid_for_employment: true,
    tin_issued_by_due_date: true,
    dob: "2010-06-15",
    irs_relationship_code: "DAUGHTER",
    months_in_home: 12,
    full_time_student: undefined,
    disabled: undefined,
    ip_pin: "123456",
  }]);
});

// ============================================================
// 10. qualifying_child_for_ctc override flag
// ============================================================

Deno.test("override: qualifying_child_for_ctc=true forces CTC even if residency fails", () => {
  // months_in_home = 3 would normally disqualify, but override says yes
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        months_in_home: 3,
        qualifying_child_for_ctc: true,
      }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

Deno.test("override: qualifying_child_for_ctc=false forces ODC even if child would normally qualify", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        qualifying_child_for_ctc: false,
      }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

// ============================================================
// 11. Smoke Test — MFJ return, 2 qualifying children, 1 qualifying relative
// ============================================================

Deno.test("date of birth derives age-65 eligibility for standard and senior deductions", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1955-06-01",
  });

  assertEquals(
    findOutput(result, "f1040")?.fields.taxpayer_age_65_or_older,
    true,
  );
  assertEquals(
    findOutput(result, "standard_deduction")?.fields.taxpayer_age_65_or_older,
    true,
  );
  assertEquals(
    findOutput(result, "schedule1a")?.fields.taxpayer_age_65_or_older,
    true,
  );
});

Deno.test("explicit age-65 flag takes precedence over the derived date-of-birth value", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1955-06-01",
    taxpayer_age_65_or_older: false,
  });

  assertEquals(
    findOutput(result, "standard_deduction")?.fields.taxpayer_age_65_or_older,
    false,
  );
  assertEquals(
    findOutput(result, "schedule1a")?.fields.taxpayer_age_65_or_older,
    false,
  );
});

Deno.test("smoke: MFJ + 2 qualifying children + 1 qualifying relative → all outputs correct", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_first_name: "John",
    taxpayer_last_name: "Doe",
    taxpayer_ssn: "111-22-3333",
    taxpayer_age_65_or_older: false,
    taxpayer_blind: false,
    spouse_first_name: "Jane",
    spouse_last_name: "Doe",
    spouse_ssn: "222-33-4444",
    spouse_age_65_or_older: false,
    spouse_blind: false,
    address_line1: "100 Oak St",
    address_city: "Springfield",
    address_state: "IL",
    address_zip: "62701",
    dependents: [
      // Qualifying child 1 — age 10
      {
        first_name: "Emma",
        last_name: "Doe",
        ssn: "333-44-5555",
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        dob: "2015-04-01",
        relationship: DependentRelationship.Daughter,
        months_in_home: 12,
        lived_in_us_over_half_year: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
      },
      // Qualifying child 2 — age 8
      {
        first_name: "Ethan",
        last_name: "Doe",
        ssn: "444-55-6666",
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        dob: "2017-08-20",
        relationship: DependentRelationship.Son,
        months_in_home: 12,
        lived_in_us_over_half_year: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
      },
      // Qualifying relative — elderly parent (no SSN for simplicity: uses ITIN)
      {
        first_name: "Grandma",
        last_name: "Doe",
        itin: "900-80-1234",
        tin_issued_by_due_date: true,
        dob: "1950-01-01",
        relationship: DependentRelationship.Parent,
        months_in_home: 12,
        us_citizen_national_or_resident: true,
        filed_joint_return_except_refund_only: false,
        taxpayer_provided_over_half_support: true,
        gross_income: 0,
      },
    ],
  });

  assertEquals(
    result.outputs.length,
    16,
    "sixteen outputs including Forms 4137 and 8919 identity and Form 8962 family context",
  );
  assertEquals(findOutput(result, "form4137")?.fields, {
    taxpayer_ssn: "111-22-3333",
    spouse_ssn: "222-33-4444",
  });
  assertEquals(findOutput(result, "form8919")?.fields, {
    taxpayer_ssn: "111-22-3333",
    spouse_ssn: "222-33-4444",
  });
  assertEquals(findOutput(result, "form8962")?.fields.household_size, 5);
  assertEquals(
    findOutput(result, "form8962")?.fields.filing_status,
    FilingStatus.MFJ,
  );

  const out = findOutput(result, "f1040");
  const input = out?.fields as Record<string, unknown>;

  // Filing status passes through
  assertEquals(input?.filing_status, FilingStatus.MFJ);

  // Dependent counts
  assertEquals(input?.dependent_count, 3);
  assertEquals(input?.qualifying_child_tax_credit_count, 2); // 2 children with SSN, under 17
  assertEquals(input?.other_dependent_count, 1); // grandma has ITIN only

  // Personal info pass-through
  assertEquals(input?.taxpayer_first_name, "John");
  assertEquals(input?.spouse_first_name, "Jane");
  assertEquals(input?.address_city, "Springfield");
});

// ============================================================
// 12. New fields — digital_assets
// ============================================================

Deno.test("digital_assets: true → routes to f1040 with digital_assets: true", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    digital_assets: true,
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  assertEquals(input?.digital_assets, true);
});

Deno.test("digital_assets: false → routes to f1040 with digital_assets: false", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    digital_assets: false,
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  assertEquals(input?.digital_assets, false);
});

// ============================================================
// 13. dependent_on_another_return — excluded from counts
// ============================================================

Deno.test("dependent_on_another_return: true → excluded from dependent_count", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({ dependent_on_another_return: true }),
      qualifyingChildDep({ first_name: "Kept" }),
    ],
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  // Only the one without dependent_on_another_return counts
  assertEquals(input?.dependent_count, 1);
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

// ============================================================
// 14. ATIN disqualifies CTC
// ============================================================

Deno.test("atin: dependent with atin set → NOT counted as CTC qualifying child", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({ atin: "123456789" }), // has SSN + ATIN → ATIN disqualifies
    ],
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

// ============================================================
// 15. full_time_student — qualifying child for ODC but NOT CTC
// ============================================================

Deno.test("full_time_student: age 21 full-time student → qualifying child (ODC), NOT CTC", () => {
  // Age 21 at Dec 31 2025 → dob 2004
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        dob: "2004-06-15", // age 21 — over 17, so fails CTC age test
        full_time_student: true,
      }),
    ],
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  // Fails CTC because the child is not under 17.
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  // Counts as ODC — is a qualifying child via full_time_student path
  assertEquals(input?.other_dependent_count, 1);
});

// ============================================================
// 16. mfs_spouse_itemizing routed to f1040
// ============================================================

Deno.test("mfs: mfs_spouse_itemizing: true → routed to f1040", () => {
  const result = compute({
    filing_status: FilingStatus.MFS,
    mfs_spouse_itemizing: true,
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  assertEquals(input?.mfs_spouse_itemizing, true);
});

// ============================================================
// 17. taxpayer deceased fields routed to f1040
// ============================================================

Deno.test("deceased: taxpayer_deceased + taxpayer_death_date → routed to f1040", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    taxpayer_deceased: true,
    taxpayer_death_date: "2025-06-01",
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  assertEquals(input?.taxpayer_deceased, true);
  assertEquals(input?.taxpayer_death_date, "2025-06-01");
});

// ============================================================
// 18. Dependent IP PIN accepted
// ============================================================

Deno.test("dependent ip_pin: '123456' → accepted (valid 6-digit IP PIN)", () => {
  // Should not throw — confirms schema accepts 6-digit ip_pin
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({ ip_pin: "123456" }),
    ],
  });
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

// ============================================================
// 19. Smoke test — all new major fields populated
// ============================================================

Deno.test("smoke: all new major fields populated → routes correctly to f1040", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_first_name: "Jane",
    taxpayer_last_name: "Smith",
    taxpayer_middle_initial: "A",
    taxpayer_suffix: "Jr.",
    taxpayer_ssn: "111-22-3333",
    taxpayer_occupation: "Engineer",
    taxpayer_deceased: false,
    taxpayer_ip_pin: "123456",
    taxpayer_prior_year_agi: 75000,
    spouse_first_name: "John",
    spouse_last_name: "Smith",
    spouse_occupation: "Teacher",
    spouse_deceased: false,
    spouse_ip_pin: "654321",
    address_line1: "100 Oak St",
    address_line2: "Apt 2B",
    address_city: "Springfield",
    address_state: "IL",
    address_zip: "62701",
    digital_assets: false,
    presidential_campaign_fund_taxpayer: false,
    presidential_campaign_fund_spouse: false,
    extension_filed: false,
    mfs_spouse_itemizing: false,
    qss_spouse_death_year: 2023,
    hoh_paid_more_than_half_home_costs: true,
    dependents: [
      qualifyingChildDep({ ip_pin: "111222" }),
      qualifyingChildDep({
        first_name: "StudentChild",
        dob: "2002-01-01", // age 23 in 2025
        full_time_student: true,
      }),
    ],
  });

  assertEquals(result.outputs.length, 16);
  assertEquals(findOutput(result, "form8962")?.fields.household_size, 4);
  const input = findOutput(result, "f1040")?.fields as Record<string, unknown>;
  assertEquals(input?.filing_status, FilingStatus.MFJ);
  // First child (age 15) qualifies for CTC; second (age 23, student) does not
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
  assertEquals(input?.other_dependent_count, 1);
  assertEquals(input?.dependent_count, 2);
  assertEquals(input?.digital_assets, false);
  assertEquals(input?.taxpayer_occupation, "Engineer");
  assertEquals(input?.spouse_occupation, "Teacher");
  assertEquals(input?.address_line2, "Apt 2B");
  assertEquals(input?.extension_filed, false);
  assertEquals(input?.qss_spouse_death_year, 2023);
  assertEquals(input?.hoh_paid_more_than_half_home_costs, true);
  assertEquals(input?.taxpayer_ip_pin, "123456");
  assertEquals(input?.spouse_ip_pin, "654321");
});
