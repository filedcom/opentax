import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { FilingStatus as InputFilingStatus } from "../../../../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../../../../mef/header.ts";
import { DependentRelationship } from "../../../../nodes/inputs/general/index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { form8962Pdf } from "../../../pdf/forms/health/f8962.ts";
import { inputSchema as f1095aInputSchema } from "../../../../nodes/inputs/f1095a/index.ts";

const dependent = {
  first_name: "Casey",
  last_name: "Taxpayer",
  name_control: "TAXP",
  ssn: "987654321",
  dob: "2007-06-15",
  relationship: DependentRelationship.Daughter,
  irs_relationship_code: "DAUGHTER",
  months_in_home: 12,
  months_lived_with_you_in_us: 12,
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

const policy = {
  issuer_name: "Texas Marketplace",
  policy_number: "TX-FAMILY-NO-APTC-2025",
  coverage_state: "TX",
  covered_individual_ssns: ["123456789", "987654321"],
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
const positiveAptcPolicy = {
  ...policy,
  monthly_slcsps: Array.from({ length: 12 }, (_, index) =>
    index < 6 ? 700 : 800
  ),
  monthly_aptcs: Array(12).fill(900),
  annual_slcsp: 9_000,
  annual_aptc: 10_800,
  slcsp_corrections: undefined,
  no_aptc_monthly_evidence: undefined,
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
const xsdPath = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

function filedReturn(
  marketplacePolicy: Record<string, unknown> = policy,
  parentWages = 24_880,
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
      dependents: [dependent],
    },
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Parent Employer",
      employer_address_line1: "10 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "123-45-6789",
      box1_wages: parentWages,
      box2_fed_withheld: 3_000,
    }],
    f1095a: [marketplacePolicy],
  });
}

Deno.test("Form 8962 monthly no-APTC policy with a required-filing dependent reaches final credit, native and PDF", async () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8962.dependents_modified_agi, 16_000);
  assertEquals(pending.form8962.household_income, 40_880);
  assertEquals(pending.form8962.federal_poverty_pct, 200);
  assertEquals(pending.form8962.total_premium_tax_credit, 8_184);
  assertEquals(pending.schedule3.line9_premium_tax_credit, 8_184);
  assertEquals(pending.f1040.line31_additional_payments, 8_184);
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(projected.dependents_modified_agi, 16_000);
  assertEquals(projected.pdf_month_1_allowed_credit, "632");
  assertEquals(projected.pdf_month_7_allowed_credit, "732");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS8962 ");
  assertStringIncludes(
    prepared.bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>8184</ReconciledPremiumTaxCreditAmt>",
  );
  await prepared.renderPdf();
});

Deno.test("Form 8962 one family policy caps excess APTC for a single filer with one dependent", async () => {
  const aptcPolicy = positiveAptcPolicy;
  const result = filedReturn(aptcPolicy);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8962.household_income, 40_880);
  assertEquals(pending.form8962.federal_poverty_pct, 200);
  assertEquals(pending.form8962.total_premium_tax_credit, 8_184);
  assertEquals(pending.form8962.total_advance_ptc, 10_800);
  assertEquals(pending.form8962.excess_advance_payment, 2_616);
  assertEquals(pending.form8962.repayment_limitation, 975);
  assertEquals(pending.form8962.excess_advance_premium, 975);
  assertEquals(pending.schedule2.line1a_excess_advance_premium, 975);
  assertEquals(pending.f1040.line17_additional_taxes, 975);
  const projected = form8962Pdf.projectFields?.(pending.form8962, pending) ??
    {};
  assertEquals(projected.pdf_month_1_slcsp, "700");
  assertEquals(projected.pdf_month_7_slcsp, "800");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<AdditionalTaxLimitationAmt>975</AdditionalTaxLimitationAmt>",
  );
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, prepared.bundle.xml);
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validated.code,
      0,
      new TextDecoder().decode(validated.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  await prepared.renderPdf();

  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      form8962: { ...pending.form8962, repayment_limitation: 1_625 },
    }, filer)
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      schedule2: { ...pending.schedule2, line1a_excess_advance_premium: 974 },
    }, filer)
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      f1095a: { f1095as: [{ ...aptcPolicy, monthly_aptcs: Array(12).fill(899), annual_aptc: 10_788 }] },
    }, filer)
  );
});

for (
  const tier of [
    { label: "below 200%", parentWages: 20_000, income: 36_000, pct: 176, cap: 375 },
    { label: "300% to 399%", parentWages: 50_000, income: 66_000, pct: 322, cap: 1_625 },
    { label: "exactly 400%", parentWages: 65_760, income: 81_760, pct: 400, cap: undefined },
  ] as const
) {
  Deno.test(`Form 8962 two-person family policy applies Single Table 5 at ${tier.label}`, async () => {
    const result = filedReturn(positiveAptcPolicy, tier.parentWages);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const fields = pending.form8962;
    assertEquals(fields.household_income, tier.income);
    assertEquals(fields.federal_poverty_pct, tier.pct);
    assertEquals(fields.total_advance_ptc, 10_800);
    assertEquals(fields.repayment_limitation, tier.cap);
    const repayment = tier.cap === undefined
      ? fields.excess_advance_payment
      : tier.cap;
    assertEquals(fields.excess_advance_premium, repayment);
    assertEquals(pending.schedule2.line1a_excess_advance_premium, repayment);
    assertEquals(pending.f1040.line17_additional_taxes, repayment);
    const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
    assertEquals(projected.repayment_limitation, tier.cap);
    assertEquals(projected.excess_advance_premium, repayment);
    assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(
      prepared.bundle.xml.includes("<AdditionalTaxLimitationAmt>"),
      tier.cap !== undefined,
    );
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(xmlPath, prepared.bundle.xml);
      const validated = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsdPath, xmlPath],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(
        validated.code,
        0,
        new TextDecoder().decode(validated.stderr),
      );
    } finally {
      await Deno.remove(xmlPath);
    }
    await prepared.renderPdf();
    await assertRejects(() =>
      f1040_2025.prepareReturn({
        ...result.pending,
        form8962: {
          ...fields,
          repayment_limitation: tier.cap === undefined ? 975 : tier.cap + 1,
        },
      }, filer)
    );
  });
}

Deno.test("Form 8962 dependent no-APTC monthly filing rejects source identity, SLCSP and final credit tampering", async () => {
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
        }],
      },
    }, filer)
  );
  const changedCovered = {
    ...result.pending,
    f1095a: {
      f1095as: [{
        ...source.f1095as[0],
        covered_individual_ssns: ["123456789", "999999999"],
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
      schedule3: { ...pending.schedule3, line9_premium_tax_credit: 8_183 },
    }, filer)
  );
});

const dividendDependent = {
  ...dependent,
  ptc_tax_return: {
    ...dependent.ptc_tax_return,
    filed_form1040: {
      ...dependent.ptc_tax_return.filed_form1040,
      line1z_wages: 0,
      line3b_dividends: 16_000,
      line11b_agi: 16_000,
    },
    interest_forms1099: [],
    wage_forms_w2: undefined,
    dividend_form1099: {
      source_document_id: "casey-issued-2025-1099-div",
      payer_ein: "998877665",
      recipient_ssn: "987654321",
      box1a_ordinary_dividends: 16_000,
      box1b_qualified_dividends: 0,
      box2a_capital_gain_distributions: 0,
      box12_exempt_interest_dividends: 0,
    },
  },
};

function dividendReturn(
  sourceDependent: Record<string, unknown> = dividendDependent,
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
      dependents: [sourceDependent],
    },
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Parent Employer",
      employer_address_line1: "10 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "123-45-6789",
      box1_wages: 24_880,
      box2_fed_withheld: 3_000,
    }],
    f1095a: [policy],
  });
}

const mixedDividendDependent = {
  ...dividendDependent,
  ptc_tax_return: {
    ...dividendDependent.ptc_tax_return,
    filed_form1040: {
      ...dividendDependent.ptc_tax_return.filed_form1040,
      line1z_wages: 15_000,
      line3b_dividends: 1_000,
    },
    wage_forms_w2: [{
      source_document_id: "casey-issued-2025-w2",
      employer_name: "Summer Employer",
      employer_ein: "112233445",
      employee_ssn: "987654321",
      box1_wages: 15_000,
    }],
    dividend_form1099: {
      ...dividendDependent.ptc_tax_return.dividend_form1099,
      box1a_ordinary_dividends: 1_000,
    },
  },
};

const interestDividendDependent = {
  ...dividendDependent,
  ptc_tax_return: {
    ...dividendDependent.ptc_tax_return,
    filed_form1040: {
      ...dividendDependent.ptc_tax_return.filed_form1040,
      line2a_tax_exempt_interest: 200,
      line2b_taxable_interest: 4_800,
      line3b_dividends: 11_000,
      line11b_agi: 15_800,
    },
    interest_forms1099: [{
      source_document_id: "casey-issued-2025-1099-int",
      recipient_ssn: "987654321",
      box1_taxable_interest: 4_800,
      box8_tax_exempt_interest: 200,
    }],
    dividend_form1099: {
      ...dividendDependent.ptc_tax_return.dividend_form1099,
      box1a_ordinary_dividends: 11_000,
    },
  },
};

Deno.test("Form 8962 ordinary-dividend dependent joins monthly policy, final credit, native and PDF", async () => {
  const result = dividendReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8962.dependents_modified_agi, 16_000);
  assertEquals(pending.form8962.household_income, 40_880);
  assertEquals(pending.schedule3.line9_premium_tax_credit, 8_184);
  assertEquals(pending.f1040.line31_additional_payments, 8_184);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>8184</ReconciledPremiumTaxCreditAmt>",
  );
  await prepared.renderPdf();
});

Deno.test("Form 8962 ordinary-dividend dependent rejects threshold, owner, filed-line and document drift", async () => {
  const result = dividendReturn();
  const pending = normalizeAllPending(result.pending);
  const changed = (ptcTaxReturn: typeof dividendDependent.ptc_tax_return) => ({
    ...result.pending,
    general: {
      ...pending.general,
      dependents: [{ ...dividendDependent, ptc_tax_return: ptcTaxReturn }],
    },
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...dividendDependent.ptc_tax_return,
        dividend_form1099: {
          ...dividendDependent.ptc_tax_return.dividend_form1099,
          recipient_ssn: "111223333",
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...dividendDependent.ptc_tax_return,
        filed_form1040: {
          ...dividendDependent.ptc_tax_return.filed_form1040,
          line3b_dividends: 15_999,
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...dividendDependent.ptc_tax_return,
        dividend_form1099: {
          ...dividendDependent.ptc_tax_return.dividend_form1099,
          source_document_id: "casey-filed-2025-form1040",
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...dividendDependent.ptc_tax_return,
        filed_form1040: {
          ...dividendDependent.ptc_tax_return.filed_form1040,
          line3b_dividends: 1_350,
          line11b_agi: 1_350,
        },
        dividend_form1099: {
          ...dividendDependent.ptc_tax_return.dividend_form1099,
          box1a_ordinary_dividends: 1_350,
        },
      }),
      filer,
    )
  );
});

Deno.test("Form 8962 W-2 plus ordinary-dividend dependent reaches monthly native and PDF credit", async () => {
  const result = dividendReturn(mixedDividendDependent);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8962.dependents_modified_agi, 16_000);
  assertEquals(pending.form8962.household_income, 40_880);
  assertEquals(pending.schedule3.line9_premium_tax_credit, 8_184);
  assertEquals(pending.f1040.line31_additional_payments, 8_184);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>8184</ReconciledPremiumTaxCreditAmt>",
  );
  await prepared.renderPdf();
});

Deno.test("Form 8962 mixed W-2 and dividend dependent rejects threshold, owner and filed return drift", async () => {
  const result = dividendReturn(mixedDividendDependent);
  const pending = normalizeAllPending(result.pending);
  const changed = (
    ptcTaxReturn: typeof mixedDividendDependent.ptc_tax_return,
  ) => ({
    ...result.pending,
    general: {
      ...pending.general,
      dependents: [{
        ...mixedDividendDependent,
        ptc_tax_return: ptcTaxReturn,
      }],
    },
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...mixedDividendDependent.ptc_tax_return,
        dividend_form1099: {
          ...mixedDividendDependent.ptc_tax_return.dividend_form1099,
          box1a_ordinary_dividends: 450,
        },
        filed_form1040: {
          ...mixedDividendDependent.ptc_tax_return.filed_form1040,
          line3b_dividends: 450,
          line11b_agi: 15_450,
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...mixedDividendDependent.ptc_tax_return,
        wage_forms_w2: [{
          ...mixedDividendDependent.ptc_tax_return.wage_forms_w2[0],
          employee_ssn: "111223333",
        }],
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...mixedDividendDependent.ptc_tax_return,
        filed_form1040: {
          ...mixedDividendDependent.ptc_tax_return.filed_form1040,
          line1z_wages: 14_999,
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...mixedDividendDependent.ptc_tax_return,
        dividend_form1099: {
          ...mixedDividendDependent.ptc_tax_return.dividend_form1099,
          source_document_id: "casey-issued-2025-w2",
        },
      }),
      filer,
    )
  );
});

Deno.test("Form 8962 taxable and tax-exempt interest plus dividends joins monthly credit, native and PDF", async () => {
  const result = dividendReturn(interestDividendDependent);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8962.dependents_modified_agi, 16_000);
  assertEquals(pending.form8962.household_income, 40_880);
  assertEquals(pending.schedule3.line9_premium_tax_credit, 8_184);
  assertEquals(pending.f1040.line31_additional_payments, 8_184);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<ReconciledPremiumTaxCreditAmt>8184</ReconciledPremiumTaxCreditAmt>",
  );
  await prepared.renderPdf();
});

Deno.test("Form 8962 interest and dividend dependent rejects threshold, source and tax-exempt drift", async () => {
  const result = dividendReturn(interestDividendDependent);
  const pending = normalizeAllPending(result.pending);
  const changed = (
    ptcTaxReturn: typeof interestDividendDependent.ptc_tax_return,
  ) => ({
    ...result.pending,
    general: {
      ...pending.general,
      dependents: [{
        ...interestDividendDependent,
        ptc_tax_return: ptcTaxReturn,
      }],
    },
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...interestDividendDependent.ptc_tax_return,
        filed_form1040: {
          ...interestDividendDependent.ptc_tax_return.filed_form1040,
          line2b_taxable_interest: 500,
          line3b_dividends: 850,
          line11b_agi: 1_350,
        },
        interest_forms1099: [{
          ...interestDividendDependent.ptc_tax_return.interest_forms1099[0],
          box1_taxable_interest: 500,
        }],
        dividend_form1099: {
          ...interestDividendDependent.ptc_tax_return.dividend_form1099,
          box1a_ordinary_dividends: 850,
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...interestDividendDependent.ptc_tax_return,
        interest_forms1099: [{
          ...interestDividendDependent.ptc_tax_return.interest_forms1099[0],
          recipient_ssn: "111223333",
        }],
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...interestDividendDependent.ptc_tax_return,
        filed_form1040: {
          ...interestDividendDependent.ptc_tax_return.filed_form1040,
          line2a_tax_exempt_interest: 199,
        },
      }),
      filer,
    )
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed({
        ...interestDividendDependent.ptc_tax_return,
        dividend_form1099: {
          ...interestDividendDependent.ptc_tax_return.dividend_form1099,
          source_document_id: "casey-issued-2025-1099-int",
        },
      }),
      filer,
    )
  );
});
