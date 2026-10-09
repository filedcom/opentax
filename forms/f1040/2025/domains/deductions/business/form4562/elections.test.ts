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
import { bonusElectionInput, electionCases } from "./elections.fixture.ts";

Deno.test("Bonus elections reconcile class-wide and return-wide choices through complete returns", async () => {
  for (const scenario of electionCases) {
    const input = bonusElectionInput(scenario);
    const before = JSON.stringify(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = result.pending;
    const filed = filedCurrentYearSchema.parse(p.form4562);
    assertEquals(
      filed.current_year_activities.map((a) =>
        a.line14_special_depreciation_allowance
      ),
      [...scenario.bonuses],
    );
    assertEquals(
      filed.current_year_activities.map((a) => a.line22_total_depreciation),
      [...scenario.deductions],
    );
    assertEquals(p.f3800.allowed_credit, scenario.credit);
    assertEquals(p.f1040.line24_total_tax, scenario.tax);
    assertEquals(
      p.f1040.line13_qbi_deduction,
      scenario.deductions.length === 2 ? 5576 : 1859,
    );
    const prepared = await f1040_2025.prepareReturn(p, bonusFilerFixture.filer);
    const xml = prepared.bundle.xml;
    assertEquals(
      (xml.match(/<SpclDeprecAllwncElectOutStmt /g) ?? []).length,
      scenario.out.length ? 1 : 0,
    );
    assertEquals(
      (xml.match(/<GeneralDependencyMedium /g) ?? []).length,
      scenario.reduced ? 1 : 0,
    );
    assertEquals(
      (xml.match(/<IRS4562 /g) ?? []).length,
      scenario.deductions.length,
    );
    if (scenario.out.length) {
      for (const period of scenario.out) {
        assertStringIncludes(xml, `${period}-year property`);
      }
    }
    if (scenario.reduced) assertStringIncludes(xml, "IRC section 168(k)(10)");
    assertEquals(JSON.stringify(input), before);
  }
});

Deno.test("Bonus election inventory rejects partial class choices, partial reduced rates and unreviewed elections", () => {
  const inventory =
    bonusElectionInput(electionCases[2]).form4562.current_year_inventory;
  for (
    const patch of [
      { bonus_election: undefined },
      {
        bonus_election: {
          ...inventory.bonus_election,
          elected_out_recovery_periods: [5, 5],
        },
      },
      {
        bonus_election: {
          ...inventory.bonus_election,
          elected_out_recovery_periods: [7],
        },
      },
      {
        bonus_election: {
          ...inventory.bonus_election,
          proprietor_ssn: "999887777",
        },
      },
      {
        bonus_election: {
          ...inventory.bonus_election,
          reviewed_on: "2026-02-30",
        },
      },
      {
        bonus_election: {
          ...inventory.bonus_election,
          timely_original_return_confirmed: false,
        },
      },
      {
        bonus_election: {
          ...inventory.bonus_election,
          taxpayer_authorized_confirmed: false,
        },
      },
      {
        bonus_election: {
          ...inventory.bonus_election,
          filing_timeliness_review_reference: "",
        },
      },
      {
        assets: inventory.assets.map((a, i) => ({
          ...a,
          bonus_elected_out: i === 0,
        })),
      },
    ]
  ) {
    assertThrows(() =>
      calculateCurrentYearInventory({ ...inventory, ...patch })
    );
  }
  const reduced =
    bonusElectionInput(electionCases[3]).form4562.current_year_inventory;
  assertThrows(() =>
    calculateCurrentYearInventory({
      ...reduced,
      assets: reduced.assets.map((a, i) => ({
        ...a,
        reduced_bonus_election: i === 0,
      })),
    })
  );
  assertThrows(() =>
    calculateCurrentYearInventory({
      ...reduced,
      assets: reduced.assets.map((a) => ({
        ...a,
        acquired_date: "2025-01-19",
      })),
    })
  );
});

Deno.test("Election source and native statements reject stale filed rows and owner changes", async () => {
  const result = f1040_2025.executeReturn(bonusElectionInput(electionCases[0]));
  const p = result.pending;
  const filed = filedCurrentYearSchema.parse(p.form4562);
  const withoutElection = {
    ...filed,
    current_year_inventory: {
      ...filed.current_year_inventory,
      bonus_election: undefined,
    },
  };
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      { ...p, form4562: withoutElection },
      bonusFilerFixture.filer,
    )
  );
  const wrongOwner = {
    ...filed,
    current_year_inventory: {
      ...filed.current_year_inventory,
      bonus_election: {
        ...filed.current_year_inventory.bonus_election,
        proprietor_ssn: "999887777",
      },
    },
  };
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      { ...p, form4562: wrongOwner },
      bonusFilerFixture.filer,
    )
  );
  const wrongDeduction = {
    ...filed,
    current_year_activities: filed.current_year_activities.map((a) => ({
      ...a,
      line22_total_depreciation: 1881,
    })),
  };
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      { ...p, form4562: wrongDeduction },
      bonusFilerFixture.filer,
    )
  );
});
