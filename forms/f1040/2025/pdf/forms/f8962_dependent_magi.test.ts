import { assertEquals, assertThrows } from "@std/assert";
import { DependentRelationship } from "../../../nodes/inputs/general/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { form8962Pdf } from "./f8962.ts";

const dependentSource = {
  filing_status: FilingStatus.Single,
  dependents: [{
    first_name: "Casey",
    last_name: "Test",
    ssn: "987654321",
    dob: "2010-06-15",
    relationship: DependentRelationship.Daughter,
    months_in_home: 12,
    ptc_tax_return: {
      filing: "required",
      filed_form1040: {
        source_document_id: "casey-2025-1040",
        taxpayer_ssn: "987654321",
        tax_year: 2025,
        filing_status: "single",
        blind: false,
        line1z_wages: 0,
        line2a_tax_exempt_interest: 500,
        line2b_taxable_interest: 12_800,
        line3b_dividends: 0,
        line4b_ira: 0,
        line5b_pensions: 0,
        line6b_social_security: 0,
        line7a_capital_gain: 0,
        line8_additional_income: 0,
        line10_adjustments: 0,
        line11b_agi: 12_800,
      },
      interest_forms1099: [{
        source_document_id: "casey-2025-1099-int",
        recipient_ssn: "987654321",
        box1_taxable_interest: 12_800,
        box8_tax_exempt_interest: 500,
      }],
    },
  }],
};

Deno.test("Form 8962 PDF line 2b uses the same verified dependent source as MeF", () => {
  const projected = form8962Pdf.projectFields?.({
    household_size: 2,
    taxpayer_modified_agi: 75_300,
    dependents_modified_agi: 13_300,
    household_income: 88_600,
    annual_premium: 6_000,
  }, { general: dependentSource }) ?? {};
  assertEquals(projected.dependents_modified_agi, 13_300);
  assertThrows(
    () => form8962Pdf.projectFields?.({
      household_size: 2,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 13_300,
      household_income: 88_600,
      annual_premium: 6_000,
    }, {
      general: {
        ...dependentSource,
        dependents: [{
          ...dependentSource.dependents[0],
          ptc_tax_return: {
            ...dependentSource.dependents[0].ptc_tax_return,
            filed_form1040: {
              ...dependentSource.dependents[0].ptc_tax_return.filed_form1040,
              taxpayer_ssn: "111223333",
            },
          },
        }],
      },
    }),
    Error,
    "filed return and interest forms naming the covered person",
  );
  assertThrows(
    () =>
      form8962Pdf.projectFields?.({
        household_size: 2,
        taxpayer_modified_agi: 75_300,
        dependents_modified_agi: 13_299,
        household_income: 88_599,
        annual_premium: 6_000,
      }, { general: dependentSource }),
    Error,
    "dependent MAGI differs from Worksheet 1-2 source facts",
  );
});

Deno.test("Form 8962 dependent filing threshold cannot be asserted from a below-limit interest return", () => {
  const dependent = dependentSource.dependents[0];
  const belowLimit = {
    ...dependentSource,
    dependents: [{
      ...dependent,
      ptc_tax_return: {
        ...dependent.ptc_tax_return,
        filed_form1040: {
          ...dependent.ptc_tax_return.filed_form1040,
          blind: true,
          line2b_taxable_interest: 3_350,
          line11b_agi: 3_350,
        },
        interest_forms1099: [{
          ...dependent.ptc_tax_return.interest_forms1099[0],
          box1_taxable_interest: 3_350,
        }],
      },
    }],
  };
  assertThrows(
    () =>
      form8962Pdf.projectFields?.({
        household_size: 2,
        taxpayer_modified_agi: 75_300,
        dependents_modified_agi: 3_850,
        household_income: 79_150,
        annual_premium: 6_000,
      }, { general: belowLimit }),
    Error,
    "does not establish the 2025 filing requirement",
  );
});

Deno.test("Form 8962 dependent threshold rejects a normalized impossible birth date", () => {
  const general = {
    ...dependentSource,
    dependents: [{ ...dependentSource.dependents[0], dob: "2025-02-30" }],
  };
  assertThrows(
    () =>
      form8962Pdf.projectFields?.({
        household_size: 2,
        taxpayer_modified_agi: 75_300,
        dependents_modified_agi: 13_300,
        household_income: 88_600,
        annual_premium: 6_000,
      }, { general }),
    Error,
    "dependent needs a valid birth date",
  );
});

Deno.test("Form 8962 PDF closes an unproved not-required dependent even with zero line 2b", () => {
  const general = {
    ...dependentSource,
    dependents: [{
      ...dependentSource.dependents[0],
      ptc_tax_return: { filing: "not_required" },
    }],
  };
  assertThrows(
    () =>
      form8962Pdf.projectFields?.({
        household_size: 2,
        taxpayer_modified_agi: 75_300,
        dependents_modified_agi: 0,
        household_income: 75_300,
        annual_premium: 6_000,
      }, { general }),
    Error,
    "source-backed not-required filing-threshold workpaper",
  );
});

Deno.test("Form 8962 PDF does not demand dependent tax-return facts when there is no policy", () => {
  const projected = form8962Pdf.projectFields?.({
    household_size: 2,
    dependents_modified_agi: 0,
  }, {}) ?? {};
  assertEquals(projected.household_size, 2);
});
