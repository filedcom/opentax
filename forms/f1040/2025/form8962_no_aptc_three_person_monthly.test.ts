import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus as InputFilingStatus } from "../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../mef/header.ts";
import { DependentRelationship } from "../nodes/inputs/general/index.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8962Pdf } from "./pdf/forms/f8962.ts";
import { inputSchema as f1095aInputSchema } from "../nodes/inputs/f1095a/index.ts";

const dependent = {
  first_name: "Casey",
  last_name: "Taxpayer",
  name_control: "TAXP",
  ssn: "987654321",
  dob: "2007-06-15",
  relationship: DependentRelationship.Daughter,
  irs_relationship_code: "DAUGHTER",
  months_in_home: 12,
  lived_in_us_over_half_year: true,
  us_citizen_national_or_resident: true,
  filed_joint_return_except_refund_only: false,
  provided_over_half_own_support: false,
  ptc_tax_return: {
    filing: "required" as const,
    filed_form1040: {
      source_document_id: "casey-filed-2025-form1040",
      taxpayer_ssn: "987654321",
      tax_year: 2025 as const,
      filing_status: "single" as const,
      blind: false,
      line1z_wages: 16_000,
      line2a_tax_exempt_interest: 0,
      line2b_taxable_interest: 0,
      line3b_dividends: 0 as const,
      line4b_ira: 0 as const,
      line5b_pensions: 0 as const,
      line6b_social_security: 0 as const,
      line7a_capital_gain: 0 as const,
      line8_additional_income: 0 as const,
      line10_adjustments: 0 as const,
      line11b_agi: 16_000,
    },
    interest_forms1099: [],
    wage_forms_w2: [{
      source_document_id: "casey-issued-2025-w2",
      employer_name: "Summer Employer",
      employer_ein: "112233445",
      employee_ssn: "987654321",
      box1_wages: 16_000,
    }],
  },
};

const secondDependent = {
  first_name: "Jordan",
  last_name: "Taxpayer",
  name_control: "TAXP",
  ssn: "111223333",
  dob: "2008-04-15",
  relationship: DependentRelationship.Son,
  irs_relationship_code: "SON",
  months_in_home: 12,
  lived_in_us_over_half_year: true,
  us_citizen_national_or_resident: true,
  filed_joint_return_except_refund_only: false,
  provided_over_half_own_support: false,
  ptc_tax_return: {
    filing: "required" as const,
    filed_form1040: {
      source_document_id: "jordan-filed-2025-form1040",
      taxpayer_ssn: "111223333",
      tax_year: 2025 as const,
      filing_status: "single" as const,
      blind: false,
      line1z_wages: 0,
      line2a_tax_exempt_interest: 0,
      line2b_taxable_interest: 2_000,
      line3b_dividends: 0 as const,
      line4b_ira: 0 as const,
      line5b_pensions: 0 as const,
      line6b_social_security: 0 as const,
      line7a_capital_gain: 0 as const,
      line8_additional_income: 0 as const,
      line10_adjustments: 0 as const,
      line11b_agi: 2_000,
    },
    interest_forms1099: [{
      source_document_id: "jordan-issued-2025-1099int",
      recipient_ssn: "111223333",
      box1_taxable_interest: 2_000,
      box8_tax_exempt_interest: 0,
    }],
  },
};

const belowThresholdWageDependent = {
  ...dependent,
  ptc_tax_return: {
    filing: "not_required" as const,
    wage_form_w2: {
      source_document_id: "casey-below-threshold-2025-w2",
      employer_name: "Summer Employer",
      employer_ein: "112233445",
      employee_ssn: "987654321",
      box1_wages: 15_750,
    },
    filing_requirement_review: {
      source_document_id: "casey-2025-filing-review",
      dependent_ssn: "987654321",
      tax_year: 2025 as const,
      filing_status: "single" as const,
      blind: false as const,
      wage_source_document_id: "casey-below-threshold-2025-w2",
      other_income_reviewed_absent: true as const,
      other_filing_triggers_reviewed_absent: true as const,
      return_filed: false as const,
      reviewed_on: "2026-03-01",
      reviewer_name: "Tax reviewer",
    },
  },
};

const belowThresholdInterestDependent = {
  ...secondDependent,
  ptc_tax_return: {
    filing: "not_required" as const,
    interest_form1099: {
      source_document_id: "jordan-below-threshold-2025-1099int",
      recipient_ssn: "111223333",
      box1_taxable_interest: 1_350,
      box8_tax_exempt_interest: 100,
    },
    filing_requirement_review: {
      source_document_id: "jordan-2025-filing-review",
      dependent_ssn: "111223333",
      tax_year: 2025 as const,
      filing_status: "single" as const,
      blind: false as const,
      interest_source_document_id: "jordan-below-threshold-2025-1099int",
      other_income_reviewed_absent: true as const,
      other_filing_triggers_reviewed_absent: true as const,
      return_filed: false as const,
      reviewed_on: "2026-03-01",
      reviewer_name: "Tax reviewer",
    },
  },
};

const policy = {
  issuer_name: "Texas Marketplace",
  policy_number: "TX-THREE-FAMILY-NO-APTC-2025",
  coverage_state: "TX",
  covered_individual_ssns: ["123456789", "987654321", "111223333"],
  monthly_premiums: Array(12).fill(900),
  monthly_slcsps: Array(12).fill(0),
  monthly_aptcs: Array(12).fill(0),
  annual_premium: 10_800,
  annual_slcsp: 0,
  annual_aptc: 0,
  slcsp_corrections: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    basis: "no_aptc" as const,
    corrected_slcsp: index < 6 ? 700 : 800,
    determination_source: "marketplace_tool" as const,
  })),
  no_aptc_monthly_evidence: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    marketplace_slcsp: index < 6 ? 700 : 800,
    marketplace_method: "marketplace_tool" as const,
    marketplace_reference: `TX-FAMILY-SLCSP-${index + 1}`,
    marketplace_determined_on: "2026-02-01",
    marketplace_record_sha256: (index + 1).toString(16).padStart(2, "0")
      .repeat(32),
    premium_payment: {
      status: "paid_in_full" as const,
      amount: 900,
      paid_on: "2026-03-01",
      reference: `TX-FAMILY-PAID-${index + 1}`,
      record_sha256: "a".repeat(64),
    },
  })),
};

const filer = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  firstNameWithInitial: "Alex",
  lastName: "Taxpayer",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  filingStatus: MefFilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function filedReturn(
  route: "both_required" | "both_not_required" | "mixed" = "both_required",
) {
  return f1040_2025.executeReturn({
    general: {
      filing_status: InputFilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      taxpayer_can_be_claimed_as_dependent: false,
      digital_assets: false,
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      dependents: route === "both_not_required"
        ? [belowThresholdWageDependent, belowThresholdInterestDependent]
        : route === "mixed"
        ? [dependent, belowThresholdInterestDependent]
        : [dependent, secondDependent],
    },
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Parent Employer",
      employer_address_line1: "10 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "123-45-6789",
      box1_wages: route === "both_not_required"
        ? 51_640
        : route === "mixed"
        ? 35_640
        : 33_640,
      box2_fed_withheld: 3_000,
    }],
    f1095a: [policy],
  });
}

Deno.test("Form 8962 three-person monthly policy combines one required-filing W-2 and one excluded reviewed interest dependent", async () => {
  const result = filedReturn("mixed");
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8962.dependents_modified_agi, 16_000);
  assertEquals(pending.form8962.household_income, 51_640);
  assertEquals(pending.form8962.federal_poverty_pct, 200);
  assertEquals(pending.form8962.total_premium_tax_credit, 7_968);
  assertEquals(pending.schedule3.line9_premium_tax_credit, 7_968);
  assertEquals(pending.f1040.line31_additional_payments, 7_968);
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(projected.dependents_modified_agi, 16_000);
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS8962 ");
  assertStringIncludes(
    prepared.bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>7968</ReconciledPremiumTaxCreditAmt>",
  );
  await prepared.renderPdf();
});

Deno.test("Form 8962 required-W-2 and excluded-interest dependent rejects source and final-return tampering", async () => {
  const result = filedReturn("mixed");
  const pending = normalizeAllPending(result.pending);
  const changed = (first: unknown, second: unknown) => ({
    ...result.pending,
    general: {
      ...pending.general,
      dependents: [{ ...dependent, ptc_tax_return: first }, {
        ...belowThresholdInterestDependent,
        ptc_tax_return: second,
      }],
    },
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...dependent.ptc_tax_return,
        wage_forms_w2: [{
          ...dependent.ptc_tax_return.wage_forms_w2[0],
          box1_wages: 16_001,
        }],
      }, belowThresholdInterestDependent.ptc_tax_return),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed(dependent.ptc_tax_return, {
        ...belowThresholdInterestDependent.ptc_tax_return,
        interest_form1099: {
          ...belowThresholdInterestDependent.ptc_tax_return.interest_form1099,
          box1_taxable_interest: 1_351,
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed(dependent.ptc_tax_return, {
        ...belowThresholdInterestDependent.ptc_tax_return,
        filing_requirement_review: {
          ...belowThresholdInterestDependent.ptc_tax_return
            .filing_requirement_review,
          interest_source_document_id: "casey-issued-2025-w2",
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      schedule3: { ...pending.schedule3, line9_premium_tax_credit: 7_967 },
    }, filer)
  );
});

Deno.test("Form 8962 three-person monthly policy excludes two reviewed not-required dependents through native and PDF", async () => {
  const result = filedReturn("both_not_required");
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8962.dependents_modified_agi, 0);
  assertEquals(pending.form8962.household_income, 51_640);
  assertEquals(pending.form8962.federal_poverty_pct, 200);
  assertEquals(pending.form8962.total_premium_tax_credit, 7_968);
  assertEquals(pending.schedule3.line9_premium_tax_credit, 7_968);
  assertEquals(pending.f1040.line31_additional_payments, 7_968);
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(projected.dependents_modified_agi, 0);
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS8962 ");
  assertStringIncludes(
    prepared.bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>7968</ReconciledPremiumTaxCreditAmt>",
  );
  await prepared.renderPdf();
});

Deno.test("Form 8962 two reviewed not-required dependents reject threshold, borrowed source, coverage, and final-credit tampering", async () => {
  const result = filedReturn("both_not_required");
  const pending = normalizeAllPending(result.pending);
  const changed = (first: unknown, second: unknown) => ({
    ...result.pending,
    general: {
      ...pending.general,
      dependents: [{
        ...belowThresholdWageDependent,
        ptc_tax_return: first,
      }, {
        ...belowThresholdInterestDependent,
        ptc_tax_return: second,
      }],
    },
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...belowThresholdWageDependent.ptc_tax_return,
        wage_form_w2: {
          ...belowThresholdWageDependent.ptc_tax_return.wage_form_w2,
          box1_wages: 15_751,
        },
      }, belowThresholdInterestDependent.ptc_tax_return),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed(
        belowThresholdWageDependent.ptc_tax_return,
        {
          ...belowThresholdInterestDependent.ptc_tax_return,
          interest_form1099: {
            ...belowThresholdInterestDependent.ptc_tax_return.interest_form1099,
            source_document_id: "casey-below-threshold-2025-w2",
          },
          filing_requirement_review: {
            ...belowThresholdInterestDependent.ptc_tax_return
              .filing_requirement_review,
            interest_source_document_id: "casey-below-threshold-2025-w2",
          },
        },
      ),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed(belowThresholdWageDependent.ptc_tax_return, {
        ...belowThresholdWageDependent.ptc_tax_return,
        wage_form_w2: {
          ...belowThresholdWageDependent.ptc_tax_return.wage_form_w2,
          source_document_id: "jordan-below-threshold-2025-w2",
          employee_ssn: "111223333",
        },
        filing_requirement_review: {
          ...belowThresholdWageDependent.ptc_tax_return
            .filing_requirement_review,
          source_document_id: "jordan-wage-filing-review",
          dependent_ssn: "111223333",
          wage_source_document_id: "jordan-below-threshold-2025-w2",
        },
      }),
      filer,
    )
  );
  const source = f1095aInputSchema.parse(pending.f1095a);
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      f1095a: {
        f1095as: [{
          ...source.f1095as[0],
          covered_individual_ssns: ["123456789", "987654321", "999999999"],
        }],
      },
    }, filer)
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      schedule3: { ...pending.schedule3, line9_premium_tax_credit: 7_967 },
    }, filer)
  );
});

Deno.test("Form 8962 monthly no-APTC policy with two required-filing dependents reaches final credit, native and PDF", async () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8962.dependents_modified_agi, 18_000);
  assertEquals(pending.form8962.household_income, 51_640);
  assertEquals(pending.form8962.federal_poverty_pct, 200);
  assertEquals(pending.form8962.total_premium_tax_credit, 7_968);
  assertEquals(pending.schedule3.line9_premium_tax_credit, 7_968);
  assertEquals(pending.f1040.line31_additional_payments, 7_968);
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(projected.dependents_modified_agi, 18_000);
  assertEquals(projected.pdf_month_1_allowed_credit, "614");
  assertEquals(projected.pdf_month_7_allowed_credit, "714");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS8962 ");
  assertStringIncludes(
    prepared.bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>7968</ReconciledPremiumTaxCreditAmt>",
  );
  await prepared.renderPdf();
});

Deno.test("Form 8962 two-dependent no-APTC filing rejects dependent source, coverage, SLCSP and return tampering", async () => {
  const result = filedReturn();
  const pending = normalizeAllPending(result.pending);
  const source = f1095aInputSchema.parse(pending.f1095a);
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      general: {
        ...pending.general,
        dependents: [{
          ...dependent,
          ptc_tax_return: {
            ...dependent.ptc_tax_return,
            wage_forms_w2: [{
              ...dependent.ptc_tax_return.wage_forms_w2[0],
              box1_wages: 16_001,
            }],
          },
        }, secondDependent],
      },
    }, filer)
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      general: {
        ...pending.general,
        dependents: [dependent, {
          ...secondDependent,
          ptc_tax_return: {
            ...secondDependent.ptc_tax_return,
            interest_forms1099: [{
              ...secondDependent.ptc_tax_return.interest_forms1099[0],
              box1_taxable_interest: 2_001,
            }],
          },
        }],
      },
    }, filer)
  );
  const changedCovered = {
    ...result.pending,
    f1095a: {
      f1095as: [{
        ...source.f1095as[0],
        covered_individual_ssns: ["123456789", "987654321", "999999999"],
      }],
    },
  };
  await assertRejects(() => f1040_2025.prepareReturn(changedCovered, filer));
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      f1095a: {
        f1095as: [{
          ...source.f1095as[0],
          no_aptc_monthly_evidence: [{
            ...source.f1095as[0].no_aptc_monthly_evidence![0],
            marketplace_slcsp: 701,
          }, ...source.f1095as[0].no_aptc_monthly_evidence!.slice(1)],
        }],
      },
    }, filer)
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      schedule3: { ...pending.schedule3, line9_premium_tax_credit: 7_967 },
    }, filer)
  );
});
