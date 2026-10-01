import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f8288, WithholdingRate } from "../nodes/inputs/f8288/index.ts";
import { f1040 } from "../nodes/outputs/f1040/index.ts";
import { fieldsOf } from "../../../core/test-utils/output.ts";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";

const source = {
  f8288s: [{
    property_address: "123 Main St, Anytown, CA 90210",
    gross_sales_price: 500_000,
    withholding_rate: WithholdingRate.RATE_15,
    amount_withheld: 75_000,
    buyer_name: "Buyer LLC",
    buyer_tin: "12-3456789",
    disposition_date: "2025-06-15",
  }],
};
const pending = { f8288: source };

Deno.test("Form 8288-A withholding is other-forms line 25c, not 1099 line 25b", () => {
  const result = f8288.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  const deposit = fieldsOf(result.outputs, f1040)!;
  assertEquals(deposit.line25b_withheld_1099, undefined);
  assertEquals(deposit.line25c_other_withheld, 75_000);
  const fields = { line25c_total: 75_000 };
  assertStringIncludes(
    irs1040.build(fields, { pending }),
    "<TaxWithheldOtherAmt>75000</TaxWithheldOtherAmt>",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(fields, pending)?.line25c_total,
    75_000,
  );
});

Deno.test("Form 8288-A source must fit inside filed line 25c in native and PDF", () => {
  for (
    const fields of [
      { line25b_withheld_1099: 75_000 },
      { line25c_total: 74_999, line25b_withheld_1099: 1 },
    ]
  ) {
    assertThrows(
      () => irs1040.build(fields, { pending }),
      Error,
      "line 25c is less than sourced Form 8288-A",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(fields, pending),
      Error,
      "line 25c is less than sourced Form 8288-A",
    );
  }
});
