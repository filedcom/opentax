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
import { bonusFilerFixture } from "../../../credits/business/form3800/form8911_bonus_fixture.ts";
import {
  section179Cases,
  section179InventoryInput,
} from "./section179-inventory.fixture.ts";

Deno.test("Section 179 inventories join credit reduction, bonus, MACRS, business allocations and final tax", async () => {
  for (const scenario of section179Cases) {
    const input = section179InventoryInput(scenario);
    const before = JSON.stringify(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const filed = filedCurrentYearSchema.parse(result.pending.form4562);
    const total179 = scenario.allocations.reduce<number>(
      (sum, a) => sum + a,
      0,
    );
    assertEquals(
      filed.section179_summary?.line12_section179_expense_deduction,
      total179,
    );
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
    assertEquals(result.pending.f1040.line24_total_tax, scenario.tax);
    assertEquals(
      result.pending.f1040.line13_qbi_deduction,
      scenario.source === "two" ? 5576 : 1859,
    );
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      bonusFilerFixture.filer,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS4562 /g) ?? []).length,
      scenario.source === "two" ? 3 : 1,
    );
    assertEquals(
      (prepared.bundle.xml.match(/section179ExpnsDedSummaryCd="SUMMARY"/g) ??
        []).length,
      scenario.source === "two" ? 1 : 0,
    );
    if (scenario.source === "six") {
      assertStringIncludes(
        prepared.bundle.xml,
        "<TotalCostOfSection179PropAmt>30000</TotalCostOfSection179PropAmt>",
      );
    }
    assertEquals(JSON.stringify(input), before);
  }
});

Deno.test("Section 179 inventory limits use all eligible costs and reject unreviewed or excess allocations", () => {
  const inventory = section179InventoryInput(section179Cases[0]).form4562
    .current_year_inventory;
  const review = inventory.section179_election;
  for (
    const patch of [
      { section179_election: undefined },
      {
        section179_election: {
          ...review,
          taxpayer_active_business_income: 1999,
        },
      },
      { section179_election: { ...review, proprietor_ssn: "999887777" } },
      { section179_election: { ...review, reviewed_on: "2026-02-30" } },
      {
        section179_election: {
          ...review,
          taxpayer_authorized_confirmed: false,
        },
      },
      { section179_election: { ...review, no_prior_year_carryover: false } },
      { section179_election: { ...review, no_pass_through_section179: false } },
      {
        assets: inventory.assets.map((a) => ({
          ...a,
          section179_eligibility: undefined,
        })),
      },
      {
        assets: inventory.assets.map((a) => ({
          ...a,
          section179_eligibility: {
            ...a.section179_eligibility,
            eligible: false,
          },
        })),
      },
      {
        assets: inventory.assets.map((a) => ({
          ...a,
          section179_deduction: 10001,
        })),
      },
    ]
  ) {
    assertThrows(() =>
      calculateCurrentYearInventory({ ...inventory, ...patch })
    );
  }
  const large = {
    ...inventory,
    section179_election: {
      ...review,
      taxpayer_active_business_income: 3000000,
    },
    assets: inventory.assets.map((a) => ({
      ...a,
      cost: 4050000,
      section179_deduction: 2450000,
      credit_basis_reduction: 0,
      form8911_property_reference: undefined,
    })),
  };
  const filed = calculateCurrentYearInventory(large);
  assertEquals(filed.section179_summary?.line4_reduction, 50000);
  assertEquals(filed.section179_summary?.line5_dollar_limitation, 2450000);
  assertThrows(() =>
    calculateCurrentYearInventory({
      ...large,
      assets: large.assets.map((a) => ({
        ...a,
        section179_deduction: 2450001,
      })),
    })
  );
});

Deno.test("Section 179 election changes the mid-quarter basis before bonus", () => {
  const source = section179InventoryInput(section179Cases[0]).form4562
    .current_year_inventory;
  const { form8911_property_reference: _p, ...asset } = source.assets[0];
  const inventory = {
    ...source,
    section179_election: {
      ...source.section179_election,
      taxpayer_active_business_income: 100000,
    },
    assets: [
      {
        ...asset,
        cost: 60000,
        credit_basis_reduction: 0,
        section179_deduction: 0,
      },
      {
        ...asset,
        asset_reference: "last-quarter",
        cost: 50000,
        credit_basis_reduction: 0,
        section179_deduction: 10000,
        placed_in_service_date: "2025-12-01",
      },
    ],
  };
  assertEquals(calculateCurrentYearInventory(inventory).convention, "HY");
  assertEquals(
    calculateCurrentYearInventory({
      ...inventory,
      assets: inventory.assets.map((a, i) =>
        i ? { ...a, section179_deduction: 9999 } : a
      ),
    }).convention,
    "MQ",
  );
});

Deno.test("Section 179 income, property credit, and filed allocation conflicts reject", async () => {
  const input = section179InventoryInput(section179Cases[2]);
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const p = result.pending;
  const filed = filedCurrentYearSchema.parse(p.form4562);
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...p,
      form4562: {
        ...filed,
        section179_summary: {
          ...filed.section179_summary!,
          line12_section179_expense_deduction: 7001,
        },
      },
    }, bonusFilerFixture.filer)
  );
  const income = section179InventoryInput(section179Cases[0]);
  const changed = {
    ...income,
    form4562: {
      current_year_inventory: {
        ...income.form4562.current_year_inventory,
        section179_election: {
          ...income.form4562.current_year_inventory.section179_election,
          taxpayer_active_business_income: 62001,
        },
      },
    },
  };
  const mismatch = f1040_2025.executeReturn(changed);
  assertEquals(mismatch.diagnostics, []);
  await assertRejects(() =>
    f1040_2025.prepareReturn(mismatch.pending, bonusFilerFixture.filer)
  );
  const badCredit = f1040_2025.executeReturn({
    ...income,
    f8911: {
      properties: income.f8911!.properties.map((p) => ({
        ...p,
        business_source: { ...p.business_source, section179_deduction: 1999 },
      })),
    },
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(badCredit.pending, bonusFilerFixture.filer)
  );
});
