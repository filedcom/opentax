import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { schedule3 } from "../../mef/forms/credits/schedule3.ts";
import { schedule3Pdf } from "../../pdf/forms/credits/schedule3.ts";

const foreignTaxCredit = {
  line1_foreign_tax_1099: 75,
  line1_total: 75,
  line8_total: 75,
  line9_premium_tax_credit: 100,
  line15_total: 100,
};
const pending = {
  schedule3: foreignTaxCredit,
  form8962: { net_premium_tax_credit: 100 },
  f1040: {
    line20_nonrefundable_credits: 75,
    line31_additional_payments: 100,
  },
};

Deno.test("Schedule 3 native and PDF carry nonrefundable line 8 to Form 1040 line 20", () => {
  const xml = schedule3.build(foreignTaxCredit, { pending });
  assertStringIncludes(
    xml,
    "<TotalNonrefundableCreditsAmt>75</TotalNonrefundableCreditsAmt>",
  );
  assertEquals(
    schedule3Pdf.projectFields?.(foreignTaxCredit, pending),
    foreignTaxCredit,
  );
});

Deno.test("Schedule 3 native and PDF reject changed or missing Form 1040 line 20", () => {
  for (const line20 of [74, undefined]) {
    const changed = {
      ...pending,
      f1040: { ...pending.f1040, line20_nonrefundable_credits: line20 },
    };
    assertThrows(
      () => schedule3.build(foreignTaxCredit, { pending: changed }),
      Error,
      "line 8 does not reconcile to Form 1040 line 20",
    );
    assertThrows(
      () => schedule3Pdf.projectFields?.(foreignTaxCredit, changed),
      Error,
      "line 8 does not reconcile to Form 1040 line 20",
    );
  }
  const changedSchedule = { ...foreignTaxCredit, line8_total: 74 };
  assertThrows(
    () => schedule3.build(changedSchedule, { pending }),
    Error,
    "line 8 does not reconcile to Form 1040 line 20",
  );
});

Deno.test("Schedule 3 line 8 join leaves a Part II only payment unchanged", () => {
  const partII = { line9_premium_tax_credit: 100, line15_total: 100 };
  const paymentPending = {
    f1040: { line31_additional_payments: 100 },
    form8962: { net_premium_tax_credit: 100 },
  };
  assertStringIncludes(
    schedule3.build(partII, { pending: paymentPending }),
    "<TotalOtherPaymentsRfdblCrAmt>100</TotalOtherPaymentsRfdblCrAmt>",
  );
  assertEquals(schedule3Pdf.projectFields?.(partII, paymentPending), partII);
});
