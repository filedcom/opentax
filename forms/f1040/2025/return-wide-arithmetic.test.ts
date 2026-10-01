import { assertStringIncludes, assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";

const filed = {
  filing_status: "single",
  line16_income_tax: 1_000,
  line17_additional_taxes: 100,
  line18_total_tax_before_credits: 1_100,
  line19_child_tax_credit: 100,
  line20_nonrefundable_credits: 50,
  line21_credits_total: 150,
  line22_tax_after_credits: 950,
  line23_other_taxes: 50,
  line24_total_tax: 1_000,
  line25a_w2_withheld: 1_500,
  line25b_withheld_1099: 200,
  line25c_total: 20,
  line25d_total_withholding: 1_720,
  line26_estimated_tax: 100,
  line28_actc: 20,
  line29_refundable_aoc: 10,
  line31_additional_payments: 40,
  line32_refundable_credits_total: 70,
  line33_total_payments: 1_890,
};

Deno.test("Form 1040 native and PDF replay final tax and payment totals", () => {
  assertStringIncludes(
    irs1040.build(filed),
    "<TotalPaymentsAmt>1890</TotalPaymentsAmt>",
  );
  irs1040Pdf.projectFields?.(filed, {});

  for (
    const [change, reason] of [
      [{ line18_total_tax_before_credits: 1_101 }, "line 18"],
      [{ line21_credits_total: 151 }, "line 21"],
      [{ line22_tax_after_credits: 951 }, "line 22"],
      [{ line24_total_tax: 1_001 }, "line 24"],
      [{ line25d_total_withholding: 1_721 }, "line 25d"],
      [{ line32_refundable_credits_total: 71 }, "line 32"],
      [{ line33_total_payments: 1_891 }, "line 33"],
    ] as const
  ) {
    const changed = { ...filed, ...change };
    assertThrows(() => irs1040.build(changed), Error, reason);
    assertThrows(
      () => irs1040Pdf.projectFields?.(changed, {}),
      Error,
      reason,
    );
  }
});
