import { assertEquals, assertThrows } from "@std/assert";
import { eic2026 } from "./2026-eic.ts";
import {
  computeEitcWithConfig,
  type EitcInput,
} from "../intermediate/forms/credits/earned-income/eitc/index.ts";
import { lookupEic2026 } from "../intermediate/forms/credits/earned-income/eitc/table_2026.ts";
import { FilingStatus } from "../types.ts";

const terminal = [
  [0, 19540, 2],
  [4, 26820, 1],
  [1, 51593, 3],
  [2, 58629, 3],
  [5, 58863, 1],
  [3, 62974, 2],
  [6, 65899, 5],
  [7, 70244, 5],
];
Deno.test("2026 EIC lookup preserves every published band and exact-dollar footnote", async () => {
  const csv = await Deno.readTextFile(
    new URL(
      "../../../../docs/ty2026/evidence/eic-table-2026.csv",
      import.meta.url,
    ),
  );
  const rows = csv.trim().split("\n").slice(1).map((line) => line.split(","));
  assertEquals(rows.length, 1405);
  for (const row of rows) {
    const lo = Number(row[0]), hi = Number(row[1]);
    for (let col = 0; col < 8; col++) {
      for (const amount of [lo, hi - 1]) {
        const footnote = terminal.find(([c, cutoff]) =>
          c === col && cutoff > lo && cutoff < hi
        );
        const expected = row[col + 2].includes("*")
          ? amount < footnote![1] ? footnote![2] : 0
          : Number(row[col + 2]);
        assertEquals(
          lookupEic2026(amount, col % 4, col >= 4),
          expected,
          `Published page ${row[10]}, income ${amount}, column ${col}`,
        );
      }
    }
  }
  for (const [col, cutoff, amount] of terminal) {
    assertEquals(lookupEic2026(cutoff - 1, col % 4, col >= 4), amount);
    assertEquals(lookupEic2026(cutoff, col % 4, col >= 4), 0);
  }
  assertEquals(lookupEic2026(0, 3, true), 0);
  assertEquals(lookupEic2026(70250, 3, true), 0);
  assertThrows(() => lookupEic2026(100.5, 1, false));
});
Deno.test("2026 published EIC bands cross-check against statutory percentages away from IRS transition bands", () => {
  // The IRS prints the maximum in eight cells whose $50 band spans a phase-in
  // or phase-out transition. Those published exceptions are asserted explicitly.
  const transitionMax = new Map([
    ["10850:0", 664],
    ["18250:2", 7316],
    ["18250:3", 8231],
    ["18250:6", 7316],
    ["18250:7", 8231],
    ["31150:5", 4427],
    ["31150:6", 7316],
    ["31150:7", 8231],
  ]);
  const phaseIn = [.0765, .34, .4, .45];
  const phaseOut = [.0765, .1598, .2106, .2106];
  const maximum = [664, 4427, 7316, 8231];
  for (let low = 0; low < 70250; low += 50) {
    for (let column = 0; column < 8; column++) {
      if (
        terminal.some(([c, cutoff]) =>
          c === column && Math.floor(cutoff / 50) * 50 === low
        )
      ) continue;
      const child = column % 4, joint = column >= 4, midpoint = low + 25;
      const threshold = child === 0
        ? joint ? 18140 : 10860
        : joint
        ? 31160
        : 23890;
      const formula = Math.round(
        Math.max(
          0,
          Math.min(midpoint * phaseIn[child], maximum[child]) -
            Math.max(0, midpoint - threshold) * phaseOut[child],
        ),
      );
      assertEquals(
        lookupEic2026(midpoint, child, joint),
        transitionMax.get(`${low}:${column}`) ?? formula,
      );
    }
  }
});
function eligible(overrides: Partial<EitcInput> = {}): EitcInput {
  return {
    filing_status: FilingStatus.Single,
    earned_income: 10000,
    agi: 10000,
    qualifying_children: 0,
    filer_has_valid_ssns: true,
    taxpayer_dob: "1980-01-01",
    taxpayer_can_be_claimed_as_dependent: false,
    main_home_in_us_over_half_year: true,
    childless_eic_review: {
      not_qualifying_child_of_another_taxpayer_verified: true,
      qualifying_child_status_record_reference: "synthetic-family-review",
    },
    child_eic_filer_review: {
      not_qualifying_child_of_another_taxpayer_verified: true,
      relationship_age_residence_record_reference: "synthetic-family-review",
    },
    prior_eic_disallowance_review: {
      status: "none",
      irs_account_record_reference: "synthetic-account-review",
      no_nonclerical_disallowance_since_1996_verified: true,
    },
    eic_tax_residency_review: {
      status: "all_year_resident",
      taxpayer_status_record_reference: "synthetic-residence",
      spouse_status_record_reference: "synthetic-spouse-residence",
    },
    ...overrides,
  };
}
Deno.test("2026 EIC reuses eligibility with 2026 birthday boundaries and joint-spouse age", () => {
  const credit = (value: Partial<EitcInput>) =>
    computeEitcWithConfig(eligible(value), eic2026);
  assertEquals(credit({ taxpayer_dob: "2002-01-01" }), 664);
  assertEquals(credit({ taxpayer_dob: "2002-01-02" }), 0);
  assertEquals(credit({ taxpayer_dob: "1962-01-01" }), 664);
  assertEquals(credit({ taxpayer_dob: "1961-12-31" }), 0);
  assertEquals(
    credit({ taxpayer_dob: "2001-02-14", taxpayer_death_date: "2026-02-12" }),
    0,
  );
  assertEquals(
    credit({ taxpayer_dob: "2001-02-14", taxpayer_death_date: "2026-02-13" }),
    664,
  );
  assertEquals(
    credit({
      filing_status: FilingStatus.MFJ,
      taxpayer_dob: "2003-01-01",
      spouse_dob: "1980-01-01",
    }),
    664,
  );
});
Deno.test("2026 EIC applies investment limit and earned-income versus AGI table comparison", () => {
  for (const children of [0, 1, 2, 3]) {
    for (
      const status of [FilingStatus.Single, FilingStatus.MFJ, FilingStatus.QSS]
    ) {
      const base = eligible({
        qualifying_children: children,
        filing_status: status,
        earned_income: 18000,
        agi: 35000,
      });
      assertEquals(
        computeEitcWithConfig(base, eic2026),
        Math.min(
          lookupEic2026(18000, children, status === FilingStatus.MFJ),
          lookupEic2026(35000, children, status === FilingStatus.MFJ),
        ),
      );
      assertEquals(
        computeEitcWithConfig({ ...base, do_not_claim_eic: true }, eic2026),
        0,
      );
    }
  }
  assertEquals(
    computeEitcWithConfig(
      eligible({ investment_income_floor: 12200 }),
      eic2026,
    ),
    664,
  );
  assertEquals(
    computeEitcWithConfig(
      eligible({ investment_income_floor: 12201 }),
      eic2026,
    ),
    0,
  );
});
