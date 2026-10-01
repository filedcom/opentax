import { assertThrows } from "@std/assert";
import { assertForm4972AmtJoin } from "./form4972_amt_reconciliation.ts";

const filed = {
  f1040: { form4972_tax: 500, line16_income_tax: 4_500 },
  form6251: {
    form4972_tax: 500,
    regular_tax: 3_900,
    schedule2_line1z_tax: 100,
    schedule3_line1_foreign_tax_credit: 200,
    form8978_negative_line14: 0,
  },
};

Deno.test("Form 4972 special tax is excluded exactly once from Form 6251 line 10", () => {
  assertForm4972AmtJoin(500, filed);
});

Deno.test("Form 4972 AMT join rejects altered Form 1040 and Form 6251 sources", () => {
  assertThrows(() => assertForm4972AmtJoin(501, filed));
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...filed,
      f1040: { ...filed.f1040, line16_income_tax: 499 },
    })
  );
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...filed,
      form6251: { ...filed.form6251, form4972_tax: 0 },
    })
  );
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...filed,
      form6251: { ...filed.form6251, regular_tax: 4_400 },
    })
  );
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...filed,
      form6251: { ...filed.form6251, schedule3_line1_foreign_tax_credit: 0 },
    })
  );
});

Deno.test("Form 4972 special tax remains exact with Schedule J refigured AMT tax", () => {
  assertForm4972AmtJoin(500, {
    ...filed,
    schedule_j: { line23_tax: 4_300 },
    form6251: { ...filed.form6251, regular_tax: 3_700 },
  });
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...filed,
      schedule_j: { line23_tax: 4_300 },
      form6251: { ...filed.form6251, form4972_tax: 499 },
    })
  );
});
