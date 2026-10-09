import { ExpenditureType, f59e } from "./index.ts";
import { assertEquals, assertThrows } from "@std/assert";
import {
  circulationDeductionSchema,
  resolveCirculationDeductions,
} from "./circulation.ts";

function schedule(year = 2025, elected = false) {
  return circulationDeductionSchema.parse({
    original_amount: 30000,
    remaining_unamortized: 30000 - Math.min(2025 - year, 3) * 10000,
    amortization_period_start: `${year}-01-01`,
    regular_three_year_writeoff_elected: elected,
    circulation_cost_schedule: {
      owner_tin: "123456789",
      calendar_year_taxpayer_confirmed: true,
      section173_eligible_costs_confirmed: true,
      no_section173_capitalization_election_confirmed: true,
      costs_paid_or_incurred_year: year,
      cost_records: [{ source_reference: "invoice-A", amount: 18000 }, {
        source_reference: "invoice-B",
        amount: 12000,
      }],
      prior_years: Array.from(
        { length: Math.min(2025 - year, 3) },
        (_, offset) => ({
          tax_year: year + offset,
          regular_deduction: elected ? 10000 : offset === 0 ? 30000 : 0,
          amt_deduction: 10000,
          reviewed_return_reference: `reviewed-${year + offset}`,
        }),
      ),
    },
  });
}

Deno.test("circulation amortizes all three tax years and stops after recovery", () => {
  for (const year of [2025, 2024, 2023, 2022, 2021]) {
    const source = schedule(year), held = structuredClone(source);
    assertEquals(resolveCirculationDeductions(source, 2025), {
      regular_tax_deduction: year === 2025 ? 30000 : 0,
      amt_deduction: year >= 2023 ? 10000 : 0,
    });
    assertEquals(source, held);
    assertEquals(resolveCirculationDeductions(schedule(year, true), 2025), {
      regular_tax_deduction: year >= 2023 ? 10000 : 0,
      amt_deduction: year >= 2023 ? 10000 : 0,
    });
  }
});

Deno.test("circulation schedule reconciles source totals, opening basis and prior returns", () => {
  const base = schedule(2023);
  for (
    const change of [
      (x: typeof base) => {
        x.circulation_cost_schedule!.cost_records[0].amount++;
      },
      (x: typeof base) => {
        x.circulation_cost_schedule!.cost_records[1].source_reference =
          "invoice-A";
      },
      (x: typeof base) => {
        x.remaining_unamortized++;
      },
      (x: typeof base) => {
        x.circulation_cost_schedule!.prior_years.pop();
      },
      (x: typeof base) => {
        x.circulation_cost_schedule!.prior_years[0].amt_deduction++;
      },
      (x: typeof base) => {
        x.circulation_cost_schedule!.prior_years[0].regular_deduction++;
      },
      (x: typeof base) => {
        x.circulation_cost_schedule!.prior_years[1].tax_year = 2023;
      },
      (x: typeof base) => {
        x.circulation_cost_schedule!.prior_years[1].reviewed_return_reference =
          "reviewed-2023";
      },
      (x: typeof base) => {
        x.amortization_period_start = "2023-07-01";
      },
      (x: typeof base) => {
        x.regular_tax_deduction = 1;
      },
      (x: typeof base) => {
        x.amt_deduction = 9999;
      },
    ]
  ) {
    const changed = structuredClone(base);
    change(changed);
    assertThrows(() => resolveCirculationDeductions(changed, 2025));
  }
  assertThrows(() => resolveCirculationDeductions(schedule(), 2024));
});

Deno.test("circulation cent allocation conserves the cost through final recovery", () => {
  const source = schedule(2023);
  source.original_amount = 100;
  source.remaining_unamortized = 33.34;
  source.circulation_cost_schedule!.cost_records = [{
    source_reference: "invoice",
    amount: 100,
  }];
  source.circulation_cost_schedule!.prior_years = [
    {
      tax_year: 2023,
      regular_deduction: 100,
      amt_deduction: 33.33,
      reviewed_return_reference: "2023",
    },
    {
      tax_year: 2024,
      regular_deduction: 0,
      amt_deduction: 33.33,
      reviewed_return_reference: "2024",
    },
  ];
  assertEquals(resolveCirculationDeductions(source, 2025), {
    regular_tax_deduction: 0,
    amt_deduction: 33.34,
  });
});

Deno.test("circulation pools reject reuse of a prior-year invoice before aggregation", () => {
  const source = {
    ...schedule(2023),
    expenditure_type: ExpenditureType.Circulation,
    circulation_no_unamortized_property_loss: true as const,
    circulation_reviewed_workpaper_reference: "pool-A",
  };
  assertThrows(
    () =>
      f59e.compute({ taxYear: 2025, formType: "f1040" }, {
        f59es: [source, {
          ...source,
          circulation_reviewed_workpaper_reference: "pool-B",
        }],
      }),
    Error,
    "cannot reuse the same source cost record",
  );
});
