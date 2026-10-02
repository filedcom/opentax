import { assertStringIncludes, assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
import { assertSchedule2Line23 } from "./schedule2-line23-reconciliation.ts";

const schedule2 = {
  line4_se_tax: 500,
  line8_form5329_tax: 100,
  line17c_hsa_penalty: 40,
  line17z_other_additional_taxes: 50,
  line20_965_tax_installment: 900,
};
const pending = {
  schedule2,
  form8978_reporting_year: {
    schedule2_line17z_reduction: 30,
    schedule2_line21: 660,
  },
};
const filed = { line23_other_taxes: 660 };

Deno.test("Schedule 2 Part II less Form 8978 equals filed Form 1040 line 23 in native and PDF", () => {
  assertSchedule2Line23(filed, pending);
  assertStringIncludes(
    irs1040.build(filed, { pending }),
    "<TotalOtherTaxesAmt>660</TotalOtherTaxesAmt>",
  );
  irs1040Pdf.projectFields?.(filed, pending);
});

Deno.test("Schedule 2 line 23 replay rejects changed sources, worksheet, or filed amount", () => {
  for (
    const changed of [
      { ...pending, schedule2: { ...schedule2, line4_se_tax: 501 } },
      {
        ...pending,
        form8978_reporting_year: {
          ...pending.form8978_reporting_year,
          schedule2_line21: 661,
        },
      },
    ]
  ) {
    assertThrows(
      () => irs1040.build(filed, { pending: changed }),
      Error,
      "Schedule 2 line 21",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(filed, changed),
      Error,
      "Schedule 2 line 21",
    );
  }
  assertThrows(
    () => irs1040.build({ line23_other_taxes: 661 }, { pending }),
    Error,
    "line 23 differs",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.({ line23_other_taxes: 661 }, pending),
    Error,
    "line 23 differs",
  );
  assertThrows(
    () =>
      assertSchedule2Line23(filed, {
        form8978_reporting_year: pending.form8978_reporting_year,
      }),
    Error,
    "needs Schedule 2",
  );
});
