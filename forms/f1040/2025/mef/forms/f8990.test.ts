import { assertEquals, assertThrows } from "@std/assert";
import { form8990 } from "./f8990.ts";

Deno.test("2025 Form 8990 empty pending slice emits no document", () => {
  assertEquals(form8990.build({}), "");
});

Deno.test("2025 Form 8990 MeF rejects asserted ATI filing", () => {
  assertThrows(
    () =>
      form8990.build({
        direct_schedule_c: {
          business_reference: "C-1",
          current_year_business_interest_expense: 8_000,
          tentative_taxable_income: 100_000,
          section172_nol_deduction: 0,
          section199a_qbi_deduction: 5_000,
          business_depreciation_amortization_depletion: 2_000,
          current_year_business_interest_income: 500,
          average_prior_three_year_gross_receipts: 32_000_000,
          not_a_tax_shelter_verified: true,
          sole_direct_non_passthrough_business_verified: true,
          no_prior_disallowed_interest: true,
          no_floor_plan_financing_interest: true,
          no_other_ati_additions_or_reductions: true,
          no_nonbusiness_items_in_tentative_income: true,
          no_pass_through_excess_items: true,
        },
      }),
    Error,
    "ATI components are not reconciled",
  );
});
