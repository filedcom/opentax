import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema as generalInputSchema } from "../../../../nodes/inputs/general/filing/general/index.ts";
import { assertLine36EstimatedTaxSource } from "./line36-estimated-tax-source.ts";

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  apply_overpayment_to_2026_estimated_tax_amount: 500,
};
const filed = {
  line34_overpayment: 2_000,
  line35a_refund: 1_250,
  line36_applied_to_2026_estimated_tax: 500,
  line38_underpayment_penalty: 250,
};

Deno.test("line 36 final export accepts only a reconciled filer-owned election", () => {
  assertLine36EstimatedTaxSource(filed, { general });
  for (
    const changed of [
      { ...filed, line36_applied_to_2026_estimated_tax: 501 },
      { ...filed, line35a_refund: 1_251 },
      { ...filed, line34_overpayment: 1_500 },
      { ...filed, line37_amount_owed: 1 },
    ]
  ) {
    assertThrows(
      () => assertLine36EstimatedTaxSource(changed, { general }),
      Error,
    );
  }
  assertThrows(
    () => assertLine36EstimatedTaxSource(filed, undefined),
    Error,
    "needs retained",
  );
  assertEquals(
    generalInputSchema.safeParse({
      ...general,
      apply_overpayment_to_2026_estimated_tax_amount: 0,
    }).success,
    false,
  );
  assertEquals(
    generalInputSchema.safeParse({
      ...general,
      apply_overpayment_to_2026_estimated_tax_amount: 500.5,
    }).success,
    false,
  );
});
