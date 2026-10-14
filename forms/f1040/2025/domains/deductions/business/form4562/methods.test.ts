import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import {
  calculateCurrentYearInventory,
  filedCurrentYearSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";
import { DepreciationMethod } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/method-elections.ts";
import { bonusFilerFixture } from "../../../credits/business/form3800/form8911_bonus_fixture.ts";
import { methodCases, methodElectionInput } from "./methods.fixture.ts";

Deno.test("Reviewed MACRS methods join bonus, business credit, Schedule C, SE/QBI and native returns", async () => {
  for (const scenario of methodCases) {
    const input = methodElectionInput(scenario);
    const before = JSON.stringify(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = result.pending;
    const filed = filedCurrentYearSchema.parse(p.form4562);
    assertEquals(
      filed.current_year_activities.map((a) => a.line22_total_depreciation),
      [...scenario.deductions],
    );
    assertEquals(
      filed.current_year_activities.map((a) =>
        a.line14_special_depreciation_allowance
      ),
      [...scenario.bonuses],
    );
    for (const a of filed.current_year_activities) {
      assertEquals(a.gds_rows.map((r) => r.method), [...scenario.methods]);
    }
    assertEquals(p.f3800.allowed_credit, scenario.credit);
    assertEquals(p.f1040.line24_total_tax, scenario.tax);
    assertEquals(
      p.f1040.line13_qbi_deduction,
      scenario.source === "two" ? 5576 : 1859,
    );
    const prepared = await f1040_2025.prepareReturn(p, bonusFilerFixture.filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS4562 /g) ?? []).length,
      scenario.deductions.length,
    );
    for (const method of scenario.methods) {
      assertStringIncludes(
        prepared.bundle.xml,
        `<DepreciationMethodCd>${method}</DepreciationMethodCd>`,
      );
    }
    assertEquals(JSON.stringify(input), before);
  }
});

Deno.test("MACRS method choices require real, authorized, timely and complete class review", () => {
  const inventory =
    methodElectionInput(methodCases[3]).form4562.current_year_inventory;
  const review = inventory.method_election;
  for (
    const patch of [
      { method_election: undefined },
      { method_election: { ...review, classes: [] } },
      {
        method_election: {
          ...review,
          classes: [review.classes[0], review.classes[0]],
        },
      },
      {
        method_election: {
          ...review,
          classes: [{
            recovery_period: 7,
            method: DepreciationMethod.StraightLine,
          }],
        },
      },
      {
        method_election: {
          ...review,
          classes: [{
            recovery_period: 5,
            method: DepreciationMethod.DoubleDeclining,
          }],
        },
      },
      { method_election: { ...review, proprietor_ssn: "999887777" } },
      { method_election: { ...review, reviewed_on: "2026-02-30" } },
      { method_election: { ...review, taxpayer_authorized_confirmed: false } },
      {
        method_election: { ...review, timely_original_return_confirmed: false },
      },
      {
        method_election: { ...review, filing_timeliness_review_reference: "" },
      },
      {
        assets: inventory.assets.map((a, i) =>
          i ? { ...a, no_depreciation_method_election: true } : a
        ),
      },
      {
        assets: inventory.assets.map((a, i) =>
          i ? { ...a, proprietor_ssn: "999887777" } : a
        ),
      },
    ]
  ) {
    assertThrows(() =>
      calculateCurrentYearInventory({ ...inventory, ...patch })
    );
  }
  const six =
    methodElectionInput(methodCases[4]).form4562.current_year_inventory;
  assertThrows(() =>
    calculateCurrentYearInventory({
      ...six,
      method_election: {
        ...six.method_election,
        classes: six.method_election.classes.map((c) => ({
          ...c,
          method: DepreciationMethod.Declining150,
        })),
      },
    })
  );
});

Deno.test("Straight-line GDS covers all six classes and all mid-quarter fractions", () => {
  const source =
    methodElectionInput(methodCases[1]).form4562.current_year_inventory;
  const { form8911_property_reference: _p, ...asset } = source.assets[0];
  for (
    const [period, hy, q1, q2, q3, q4] of [
      [3, 7000, 12250, 8750, 5250, 1750],
      [5, 4200, 7350, 5250, 3150, 1050],
      [7, 3000, 5250, 3750, 2250, 750],
      [10, 2100, 3675, 2625, 1575, 525],
      [15, 1400, 2450, 1750, 1050, 350],
      [20, 1050, 1838, 1313, 788, 263],
    ] as const
  ) {
    const inventory = {
      ...source,
      bonus_election: {
        ...source.bonus_election!,
        elected_out_recovery_periods: [period],
      },
      method_election: {
        ...source.method_election,
        classes: [{
          recovery_period: period,
          method: DepreciationMethod.StraightLine,
        }],
      },
      assets: [{
        ...asset,
        cost: 42000,
        credit_basis_reduction: 0,
        macrs_recovery_period_years: period,
      }],
    };
    assertEquals(
      calculateCurrentYearInventory(inventory).current_year_activities[0]
        .line22_total_depreciation,
      hy,
    );
    for (
      const [date, expected] of [["2025-03-01", q1], ["2025-06-01", q2], [
        "2025-09-01",
        q3,
      ], ["2025-12-01", q4]] as const
    ) {
      const output = calculateCurrentYearInventory({
        ...inventory,
        assets: [
          { ...inventory.assets[0], placed_in_service_date: date },
          {
            ...inventory.assets[0],
            asset_reference: "MQ-trigger",
            business_reference: "other",
            cost: 100000,
            placed_in_service_date: "2025-12-01",
          },
        ],
      });
      assertEquals(output.convention, "MQ");
      assertEquals(
        output.current_year_activities[0].line22_total_depreciation,
        expected,
      );
    }
  }
});

Deno.test("Filed method and deduction tampering rejects before printable return preparation", async () => {
  const result = f1040_2025.executeReturn(methodElectionInput(methodCases[0]));
  assertEquals(result.diagnostics, []);
  const filed = filedCurrentYearSchema.parse(result.pending.form4562);
  for (
    const rowPatch of [{ method: DepreciationMethod.DoubleDeclining }, {
      deduction: 847,
    }]
  ) {
    await assertRejects(() =>
      f1040_2025.prepareReturn({
        ...result.pending,
        form4562: {
          ...filed,
          current_year_activities: filed.current_year_activities.map((a) => ({
            ...a,
            gds_rows: a.gds_rows.map((r) => ({ ...r, ...rowPatch })),
          })),
        },
      }, bonusFilerFixture.filer)
    );
  }
});
