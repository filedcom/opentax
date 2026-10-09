import { TS } from "../../../../../nodes/types.ts";
import { assertThrows } from "@std/assert";
import { assertForm6251CirculationSource } from "./form6251_circulation_source.ts";
import {
  ExpenditureType,
  itemSchema,
} from "../../../../../nodes/inputs/deductions/business/f59e/index.ts";

const item = itemSchema.parse({
  expenditure_type: ExpenditureType.Circulation,
  amortization_period_start: "2025-01-01",
  original_amount: 30_000,
  remaining_unamortized: 20_000,
  regular_tax_deduction: 8_000,
  amt_deduction: 10_000,
  regular_three_year_writeoff_elected: false,
  circulation_reviewed_workpaper_reference: "circulation-2025",
  circulation_no_unamortized_property_loss: true,
  circulation_schedule_c_expense: {
    business_reference: "periodical-a",
    expense_description: "Reviewed circulation expense A",
    owner_tin: "123456789",
  },
});
const general = { filing_status: "single", taxpayer_ssn: "123-45-6789" };
function retained(items = [item]) {
  return {
    f59e: { f59es: items },
    general,
    f1040: general,
    schedule1: { line3_schedule_c: 0 },
    schedule_c: {
      schedule_cs: items.map((source) => ({
        business_reference:
          source.circulation_schedule_c_expense!.business_reference,
        line_a_principal_business: "Periodical publishing",
        line_b_business_code: "513120",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        line_1_gross_receipts: source.regular_tax_deduction,
        part_v_other_expenses: [{
          description:
            source.circulation_schedule_c_expense!.expense_description,
          amount: source.regular_tax_deduction,
        }],
      })),
    },
  };
}
Deno.test("Form 6251 line 2o replays reviewed deductions and their regular expense", () => {
  const fields = { line2o_circulation_costs: -2_000 };
  const base = retained();
  assertForm6251CirculationSource(fields, base);
  for (
    const altered of [
      { ...item, amt_deduction: 9_000 },
      { ...item, circulation_reviewed_workpaper_reference: undefined },
      { ...item, regular_three_year_writeoff_elected: true },
    ]
  ) {
    assertThrows(() =>
      assertForm6251CirculationSource(fields, {
        ...base,
        f59e: { f59es: [altered] },
      })
    );
  }
  assertThrows(() => assertForm6251CirculationSource(fields, undefined));
  assertThrows(() => assertForm6251CirculationSource({}, base));
});
Deno.test("Form 6251 circulation cannot claim an unjoined, reused or changed expense", () => {
  const base = retained(), fields = { line2o_circulation_costs: -2_000 };
  for (
    const changed of [
      { ...base, schedule_c: undefined },
      { ...base, general: undefined },
      { ...base, f1040: { ...general, taxpayer_ssn: "999999999" } },
      { ...base, schedule1: { line3_schedule_c: 1 } },
      {
        ...base,
        f59e: {
          f59es: [{ ...item, circulation_schedule_c_expense: undefined }],
        },
      },
      {
        ...base,
        f59e: {
          f59es: [{
            ...item,
            circulation_schedule_c_expense: {
              ...item.circulation_schedule_c_expense!,
              owner_tin: "999999999",
            },
          }],
        },
      },
      {
        ...base,
        schedule_c: {
          schedule_cs: [{
            ...base.schedule_c.schedule_cs[0],
            part_v_other_expenses: [{
              description: "Another expense",
              amount: 8000,
            }],
          }],
        },
      },
      {
        ...base,
        schedule_c: {
          schedule_cs: [{
            ...base.schedule_c.schedule_cs[0],
            part_v_other_expenses: [{
              description:
                item.circulation_schedule_c_expense!.expense_description,
              amount: 7999,
            }],
          }],
        },
      },
      {
        ...base,
        schedule_c: {
          schedule_cs: [{
            ...base.schedule_c.schedule_cs[0],
            line_g_material_participation: false,
          }],
        },
      },
      {
        ...base,
        schedule_c: {
          schedule_cs: [
            base.schedule_c.schedule_cs[0],
            base.schedule_c.schedule_cs[0],
          ],
        },
      },
    ]
  ) {
    assertThrows(
      () => assertForm6251CirculationSource(fields, changed),
      Error,
      "distinct owned Schedule C expenses",
    );
  }
  const repeated = {
    ...item,
    circulation_reviewed_workpaper_reference: "different pool",
  };
  assertThrows(() =>
    assertForm6251CirculationSource({ line2o_circulation_costs: -4000 }, {
      ...base,
      f59e: { f59es: [item, repeated] },
    })
  );
});
Deno.test("Form 6251 zero-net circulation still validates every regular expense", () => {
  assertForm6251CirculationSource({}, undefined);
  const offsetting = {
    ...item,
    regular_tax_deduction: 10000,
    amt_deduction: 8000,
    circulation_reviewed_workpaper_reference: "circulation-offset-2025",
    circulation_schedule_c_expense: {
      ...item.circulation_schedule_c_expense!,
      business_reference: "periodical-b",
      expense_description: "Reviewed circulation expense B",
    },
  };
  const base = retained([item, offsetting]);
  assertForm6251CirculationSource({}, base);
  for (
    const changed of [
      {
        ...offsetting,
        circulation_reviewed_workpaper_reference:
          item.circulation_reviewed_workpaper_reference,
      },
      { ...offsetting, regular_three_year_writeoff_elected: true },
      { ...offsetting, circulation_no_unamortized_property_loss: undefined },
      { ...offsetting, circulation_schedule_c_expense: undefined },
    ]
  ) {
    assertThrows(() =>
      assertForm6251CirculationSource({}, {
        ...base,
        f59e: { f59es: [item, changed] },
      })
    );
  }
  assertThrows(() =>
    assertForm6251CirculationSource({}, { f59e: { f59es: [] } })
  );
});

Deno.test("circulation expense follows the spouse proprietor on a joint return", () => {
  const base = retained();
  const identity = {
    ...general,
    filing_status: "mfj",
    spouse_ssn: "444-55-6666",
  };
  const source = {
    ...item,
    circulation_schedule_c_expense: {
      ...item.circulation_schedule_c_expense!,
      owner_tin: "444556666",
    },
  };
  const joint = {
    ...base,
    general: identity,
    f1040: identity,
    f59e: { f59es: [source] },
    schedule_c: {
      schedule_cs: [{
        ...base.schedule_c.schedule_cs[0],
        proprietor_recipient: TS.S,
      }],
    },
  };
  assertForm6251CirculationSource({ line2o_circulation_costs: -2000 }, joint);
  assertThrows(() =>
    assertForm6251CirculationSource({ line2o_circulation_costs: -2000 }, {
      ...joint,
      general: { ...identity, filing_status: "mfs" },
    })
  );
  assertThrows(() =>
    assertForm6251CirculationSource({ line2o_circulation_costs: -2000 }, {
      ...joint,
      f1040: { ...identity, spouse_ssn: "999999999" },
    })
  );
});
