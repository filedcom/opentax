import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateInvestment1245Disposition,
  investment1245DispositionSchema,
} from "./investment_1245.ts";

const sale = {
  property_id: "investment-asset-1",
  property_description: "Investment equipment",
  acquired_on: "2022-05-01",
  sold_on: "2025-06-01",
  gross_sales_price: 10_000,
  cost_or_other_basis_plus_sale_expense: 12_000,
  depreciation_allowed_or_allowable: 5_000,
  property_held_for_investment_not_business: true as const,
  section_1245_classification_reviewed: true as const,
  direct_cash_sale_no_special_recapture_exception: true as const,
  sale_document_reference: "SALE-2025-1",
  basis_document_reference: "BASIS-2022-1",
  depreciation_schedule_reference: "DEPR-2025-1",
};

Deno.test("investment section 1245 property separates ordinary recapture and excess gain", () => {
  const result = calculateInvestment1245Disposition(sale);
  assertEquals(result.adjustedBasis, 7_000);
  assertEquals(result.totalGain, 3_000);
  assertEquals(result.ordinaryRecapture, 3_000);
  assertEquals(result.excessCapitalGain, 0);
  const excess = calculateInvestment1245Disposition({
    ...sale,
    gross_sales_price: 15_000,
  });
  assertEquals(excess.totalGain, 8_000);
  assertEquals(excess.ordinaryRecapture, 5_000);
  assertEquals(excess.excessCapitalGain, 3_000);
});

Deno.test("investment section 1245 source rejects short holding and impossible depreciation", () => {
  assertThrows(
    () => investment1245DispositionSchema.parse({
      ...sale,
      acquired_on: "2025-01-01",
    }),
    Error,
    "over-one-year",
  );
  assertThrows(
    () => investment1245DispositionSchema.parse({
      ...sale,
      depreciation_allowed_or_allowable: 13_000,
    }),
    Error,
    "supported basis and depreciation",
  );
  assertThrows(
    () => investment1245DispositionSchema.parse({
      ...sale,
      depreciation_schedule_reference: "",
    }),
    Error,
  );
});
