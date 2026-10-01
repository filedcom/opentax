import { assertThrows } from "@std/assert";
import { assertForm4972AmtJoin } from "./form4972_amt_reconciliation.ts";
import { ordinaryTax2025 } from "../nodes/intermediate/worksheets/tax_table_2025.ts";
import { FilingStatus } from "../nodes/types.ts";

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
  const scheduleJ = {
    line1: 50_000,
    line2a: 15_000,
    line2b: 0,
    line2c: 0,
    line3: 35_000,
    line4: 3_965,
    line5: 10_000,
    line6: 5_000,
    line7: 15_000,
    line8: 1_595,
    line9: 10_000,
    line10: 5_000,
    line11: 15_000,
    line12: 1_580,
    line13: 10_000,
    line14: 5_000,
    line15: 15_000,
    line16: 1_568,
    line17: 8_708,
    line18: 8_708,
    line19: 1_000,
    line20: 1_000,
    line21: 1_000,
    line22: 3_000,
    line23: 5_708,
  };
  const joint = {
    f1040: {
      filing_status: FilingStatus.Single,
      line15_taxable_income: 50_000,
      line16_income_tax: 6_208,
      form4972_tax: 500,
    },
    schedule_j: scheduleJ,
    form6251: {
      form4972_tax: 500,
      regular_tax: ordinaryTax2025(50_000, FilingStatus.Single),
    },
  };
  assertForm4972AmtJoin(500, joint);
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...joint,
      form6251: {
        ...joint.form6251,
        regular_tax: joint.form6251.regular_tax + 500,
      },
    })
  );
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...joint,
      schedule_j: { ...scheduleJ, line23: 5_709 },
    })
  );
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...joint,
      f1040: { ...joint.f1040, filing_status: FilingStatus.MFJ },
    })
  );
  assertThrows(() =>
    assertForm4972AmtJoin(500, {
      ...joint,
      f1040: { ...joint.f1040, line15_taxable_income: 50_001 },
    })
  );
});
