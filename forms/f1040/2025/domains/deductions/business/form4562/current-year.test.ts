import { assertEquals, assertThrows } from "@std/assert";
import { calculateCurrentYearInventory } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";
import { currentYearInput } from "./current-year.fixture.ts";

Deno.test("Current-year depreciation applies credit basis before 40% bonus and residual HY/MQ", () => {
  for (
    const [late, construction, bonus, basis, depreciation, total] of [
      [false, false, 3760, 5640, 1128, 4888],
      [true, false, 3760, 5640, 282, 4042],
      [false, true, 2800, 4200, 840, 3640],
    ] as const
  ) {
    const input =
      currentYearInput(late, construction).form4562.current_year_inventory;
    const before = JSON.stringify(input);
    const output = calculateCurrentYearInventory(input);
    const a = output.current_year_activities[0];
    assertEquals(output.convention, late ? "MQ" : "HY");
    assertEquals(a.line14_special_depreciation_allowance, bonus);
    assertEquals(a.gds_rows[0].basis, basis);
    assertEquals(a.gds_rows[0].deduction, depreciation);
    assertEquals(a.line22_total_depreciation, total);
    assertEquals(JSON.stringify(input), before);
  }
});

Deno.test("Mid-quarter threshold is strictly above 40%, across businesses, before bonus", () => {
  const input = currentYearInput().form4562.current_year_inventory;
  const { form8911_property_reference: _p, ...asset } = input.assets[0];
  for (
    const [lateCost, convention] of [[40000, "HY"], [40001, "MQ"]] as const
  ) {
    const output = calculateCurrentYearInventory({
      ...input,
      assets: [
        { ...asset, cost: 60000, credit_basis_reduction: 0 },
        {
          ...asset,
          asset_reference: "late",
          business_reference: "another-business",
          cost: lateCost,
          credit_basis_reduction: 0,
          acquired_date: "2025-02-01",
          placed_in_service_date: "2025-10-01",
        },
      ],
    });
    assertEquals(output.convention, convention);
    assertEquals(
      output.current_year_activities[0].gds_rows[0].deduction,
      convention === "HY" ? 7200 : 9000,
    );
    assertEquals(
      output.current_year_activities[1].line14_special_depreciation_allowance,
      lateCost,
    );
    assertEquals(output.current_year_activities[1].gds_rows, []);
  }
});

Deno.test("All six GDS classes use the correct declining-balance rate and quarter", () => {
  const input = currentYearInput().form4562.current_year_inventory;
  const { form8911_property_reference: _p, ...asset } = input.assets[0];
  // $42,000 residual basis. Exact rates, rather than rounded percentage tables.
  for (
    const [period, hy, q1, q2, q3, q4] of [
      [3, 14000, 24500, 17500, 10500, 3500],
      [5, 8400, 14700, 10500, 6300, 2100],
      [7, 6000, 10500, 7500, 4500, 1500],
      [10, 4200, 7350, 5250, 3150, 1050],
      [15, 2100, 3675, 2625, 1575, 525],
      [20, 1575, 2756, 1969, 1181, 394],
    ] as const
  ) {
    const subject = {
      ...asset,
      cost: 70000,
      credit_basis_reduction: 0,
      macrs_recovery_period_years: period,
    };
    assertEquals(
      calculateCurrentYearInventory({ ...input, assets: [subject] })
        .current_year_activities[0].gds_rows[0].deduction,
      hy,
    );
    for (
      const [date, expected] of [["2025-02-01", q1], ["2025-05-01", q2], [
        "2025-08-01",
        q3,
      ], ["2025-11-01", q4]] as const
    ) {
      const result = calculateCurrentYearInventory({
        ...input,
        assets: [
          { ...subject, placed_in_service_date: date },
          {
            ...asset,
            asset_reference: "convention-trigger",
            business_reference: "second",
            acquired_date: "2025-02-01",
            placed_in_service_date: "2025-12-01",
            cost: 100000,
            credit_basis_reduction: 0,
          },
        ],
      });
      assertEquals(result.convention, "MQ");
      assertEquals(
        result.current_year_activities[0].gds_rows[0].deduction,
        expected,
      );
    }
  }
});

Deno.test("Current-year inventory rejects unreviewed eligibility, dates, elections and duplicates", () => {
  const input = currentYearInput().form4562.current_year_inventory;
  const asset = input.assets[0];
  for (
    const patch of [
      { acquired_date: "2025-02-30" },
      { acquired_date: "2026-01-01" },
      { acquired_date: "2017-09-27" },
      { placed_in_service_date: "2025-02-30" },
      { placed_in_service_date: "2024-06-01" },
      { acquisition_review_reference: "" },
      {
        tax_acquisition_date_includes_binding_contract_review_confirmed: false,
      },
      { not_self_constructed: false },
      { not_certain_aircraft: false },
      { not_long_production_period_property: false },
      { no_depreciation_method_election: false },
      { no_disposition_or_other_basis_adjustment: false },
      { bonus_elected_out: true },
      { reduced_bonus_election: true },
      { required_to_use_ads: true },
      { business_use_pct: 50 },
      { section179_deduction: 1 },
      { is_listed_property: true },
      { credit_basis_reduction: 10000 },
      { form8911_property_reference: undefined },
    ]
  ) {
    assertThrows(() =>
      calculateCurrentYearInventory({
        ...input,
        assets: [{ ...asset, ...patch }],
      })
    );
  }
  assertThrows(() =>
    calculateCurrentYearInventory({ ...input, assets: [asset, asset] })
  );
  assertThrows(() =>
    calculateCurrentYearInventory({ ...input, full_calendar_tax_year: false })
  );
  assertThrows(() =>
    calculateCurrentYearInventory({
      ...input,
      no_other_depreciation_assets_on_return: false,
    })
  );
});

Deno.test("Bonus acquisition cutoff and filed-line rounding preserve exact residual basis", () => {
  const input = currentYearInput().form4562.current_year_inventory;
  const { form8911_property_reference: _p, ...asset } = input.assets[0];
  for (
    const [date, bonus, depreciation] of [["2025-01-19", 4000, 1200], [
      "2025-01-20",
      10000,
      0,
    ]] as const
  ) {
    const output = calculateCurrentYearInventory({
      ...input,
      assets: [{
        ...asset,
        acquired_date: date,
        cost: 10000,
        credit_basis_reduction: 0,
      }],
    }).current_year_activities[0];
    assertEquals(output.line14_special_depreciation_allowance, bonus);
    assertEquals(output.gds_rows[0]?.deduction ?? 0, depreciation);
  }
  const output = calculateCurrentYearInventory({
    ...input,
    assets: [1, 2, 3].map((i) => ({
      ...asset,
      asset_reference: `rounding-${i}`,
      cost: 101,
      credit_basis_reduction: 0,
    })),
  }).current_year_activities[0];
  assertEquals(output.line14_special_depreciation_allowance, 121);
  assertEquals(output.gds_rows[0].basis, 182);
  assertEquals(output.gds_rows[0].deduction, 36);
  assertEquals(output.line22_total_depreciation, 157);
});
