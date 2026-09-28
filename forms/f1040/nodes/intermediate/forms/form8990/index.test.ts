import { assertEquals, assertThrows } from "@std/assert";
import { inputNodes } from "../../../../2025/inputs.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import {
  calculateDirectScheduleCForm8990,
  type DirectScheduleCSource,
  form8990,
  inputSchema,
} from "./index.ts";

const source: DirectScheduleCSource = {
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
};

Deno.test("2025 Form 8990 source remains registered for explicit rejection", () => {
  assertEquals(
    inputNodes.some((entry) => entry.node.nodeType === "form8990"),
    true,
  );
});

Deno.test("2025 Form 8990 rejects unverified ATI even when interest appears fully allowed", () => {
  assertThrows(
    () =>
      calculateDirectScheduleCForm8990(
        source,
        CONFIG_BY_YEAR[2025].smallBizGrossReceipts,
      ),
    Error,
    "ATI components are not reconciled",
  );
  assertThrows(
    () =>
      form8990.compute({ taxYear: 2025, formType: "f1040" }, {
        direct_schedule_c: source,
      }),
    Error,
    "ATI components are not reconciled",
  );
});

Deno.test("2025 Form 8990 rejects old aggregate input", () => {
  assertThrows(
    () => inputSchema.parse({ business_interest_expense: 8_000 }),
    Error,
  );
});
