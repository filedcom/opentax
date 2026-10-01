import { assertEquals, assertThrows } from "@std/assert";
import {
  personal_property_rental,
  personalPropertyRentalTotals,
} from "./index.ts";

const rental = {
  property_description: "Camera rental",
  recipient_tin: "111223333",
  rental_agreement_reference: "Synthetic rental agreement",
  payment_record_reference: "Synthetic payment ledger",
  gross_rent: 9_000,
  deductible_expenses: 50,
  expense_workpaper_reference: "Synthetic expense ledger",
  engaged_for_profit_reviewed: true,
  not_trade_or_business_reviewed: true,
  expenses_not_claimed_elsewhere: true,
};

Deno.test("personal-property rental routes reviewed income and expense once", () => {
  const source = { personal_property_rentals: [rental] };
  assertEquals(personalPropertyRentalTotals(source), {
    income: 9_000,
    expenses: 50,
  });
  const result = personal_property_rental.compute(
    { taxYear: 2025, formType: "f1040" },
    personal_property_rental.inputSchema.parse(source),
  );
  for (const output of result.outputs) {
    assertEquals(output.fields.line8l_personal_property_rent, 9_000);
    assertEquals(output.fields.line24b_personal_property_expenses, 50);
  }
  assertThrows(
    () =>
      personalPropertyRentalTotals({
        personal_property_rentals: [rental, rental],
      }),
    Error,
    "cannot be counted twice",
  );
  assertEquals(
    personal_property_rental.inputSchema.safeParse({
      personal_property_rentals: [{
        ...rental,
        expense_workpaper_reference: undefined,
      }],
    }).success,
    false,
  );
});
