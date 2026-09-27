import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateExcessEvents as calculateForYear,
  ExcessEventKind,
} from "./excess_distribution.ts";
import type { ExcessEvent } from "./excess_distribution.ts";

const calculateExcessEvents = (event: ExcessEvent) => calculateForYear(event, 2025);

const distribution = {
  kind: ExcessEventKind.Distribution as const,
  holding_period_start: "2024-01-01",
  first_pfic_tax_year: 2024,
  shares_in_block: 100,
  prior_year_distributions: [{ tax_year: 2024, amount_usd: 0 }],
  current_year_distributions: [{
    date: "2025-12-31",
    amount_usd: 10_000,
    year_charges: [{
      tax_year: 2024,
      foreign_tax_credit: 100,
      interest_charge: 150,
    }],
  }],
  taxable_nonexcess_dividend_usd: 0,
};

Deno.test("Form 8621 derives excess and allocates it by actual days including leap day", () => {
  const [result] = calculateExcessEvents(distribution);
  assertEquals(result.amount_usd, 10_000);
  assertEquals(
    result.allocations.map((year) => ({
      year: year.tax_year,
      days: year.holding_days,
      amount: year.allocated_amount,
    })),
    [
      { year: 2024, days: 366, amount: 5_006.84 },
      { year: 2025, days: 365, amount: 4_993.16 },
    ],
  );
  assertEquals(result.line16b_current_and_pre_pfic_income, 4_993);
  assertEquals(result.line16c_prior_year_tax_before_credit, 1_853);
  assertEquals(result.line16d_prior_year_foreign_tax_credit, 100);
  assertEquals(result.line16e_additional_tax, 1_753);
  assertEquals(result.line16f_interest, 150);
});

Deno.test("Form 8621 applies 125% of prior average per share", () => {
  const [result] = calculateExcessEvents({
    ...distribution,
    prior_year_distributions: [{ tax_year: 2024, amount_usd: 4_000 }],
    current_year_distributions: [{
      date: "2025-12-31",
      amount_usd: 10_000,
      year_charges: [{ tax_year: 2024, interest_charge: 100 }],
    }],
    taxable_nonexcess_dividend_usd: 5_000,
  });
  assertEquals(result.line15a_current_distributions, 10_000);
  assertEquals(result.line15b_prior_distributions, 4_000);
  assertEquals(result.line15c_prior_average, 4_000);
  assertEquals(result.line15d_threshold, 5_000);
  assertEquals(result.amount_usd, 5_000);
  assertEquals(result.nonexcess_distribution, 5_000);
});

Deno.test("Form 8621 apportions annual excess among actual distribution dates", () => {
  const results = calculateExcessEvents({
    ...distribution,
    prior_year_distributions: [{ tax_year: 2024, amount_usd: 4_000 }],
    current_year_distributions: [
      {
        date: "2025-06-30",
        amount_usd: 2_000,
        year_charges: [{ tax_year: 2024, interest_charge: 10 }],
      },
      {
        date: "2025-12-31",
        amount_usd: 8_000,
        year_charges: [{ tax_year: 2024, interest_charge: 40 }],
      },
    ],
    taxable_nonexcess_dividend_usd: 5_000,
  });
  assertEquals(results.map((result) => result.amount_usd), [1_000, 4_000]);
  assertEquals(results.map((result) => result.event_date), [
    "2025-06-30",
    "2025-12-31",
  ]);
  assertEquals(results[0].allocations[0].holding_days, 366);
  assertEquals(results[1].allocations[0].holding_days, 366);
  assertEquals(results[0].allocations[1].holding_days, 181);
  assertEquals(results[1].allocations[1].holding_days, 365);
});

Deno.test("Form 8621 has no excess distribution in the first holding year", () => {
  const [result] = calculateExcessEvents({
    ...distribution,
    holding_period_start: "2025-01-01",
    first_pfic_tax_year: 2025,
    prior_year_distributions: [],
    current_year_distributions: [{
      date: "2025-12-31",
      amount_usd: 10_000,
      year_charges: [],
    }],
    taxable_nonexcess_dividend_usd: 10_000,
  });
  assertEquals(result.amount_usd, 0);
  assertEquals(result.nonexcess_distribution, 10_000);
  assertEquals(result.allocations, []);
});

Deno.test("Form 8621 keeps pre-PFIC years in current ordinary income", () => {
  const [result] = calculateExcessEvents({
    ...distribution,
    first_pfic_tax_year: 2025,
    current_year_distributions: [{
      date: "2025-12-31",
      amount_usd: 10_000,
      year_charges: [],
    }],
  });
  assertEquals(result.line16b_current_and_pre_pfic_income, 10_000);
  assertEquals(result.line16e_additional_tax, 0);
});

Deno.test("Form 8621 rejects incomplete history and excess section 301 dividends", () => {
  assertThrows(
    () =>
      calculateExcessEvents({ ...distribution, prior_year_distributions: [] }),
    Error,
    "every prior holding year",
  );
  assertThrows(
    () =>
      calculateExcessEvents({
        ...distribution,
        taxable_nonexcess_dividend_usd: 1,
      }),
    Error,
    "exceeds nonexcess",
  );
  assertThrows(
    () =>
      calculateExcessEvents({
        ...distribution,
        holding_period_start: "2024-02-30",
      }),
    Error,
    "invalid holding-period date",
  );
  assertThrows(
    () =>
      calculateExcessEvents({
        ...distribution,
        current_year_distributions: [{
          date: "2025-12-31",
          amount_usd: 10_000,
          year_charges: [],
        }],
      }),
    Error,
    "interest charge",
  );
});

Deno.test("Form 8621 disposition needs section 1248 attribution for foreign tax credit", () => {
  assertThrows(
    () =>
      calculateExcessEvents({
        kind: ExcessEventKind.Disposition,
        amount_usd: 10_000,
        holding_period_start: "2024-01-01",
        event_date: "2025-12-31",
        first_pfic_tax_year: 2024,
        year_charges: [{
          tax_year: 2024,
          foreign_tax_credit: 100,
          interest_charge: 150,
        }],
      }),
    Error,
    "section 1248 dividend attribution",
  );
});

Deno.test("Form 8621 uses 2026 as current year and 2025 as prior PFIC year", () => {
  const event: ExcessEvent = {
    kind: ExcessEventKind.Distribution,
    holding_period_start: "2025-01-01",
    first_pfic_tax_year: 2025,
    shares_in_block: 100,
    prior_year_distributions: [{ tax_year: 2025, amount_usd: 0 }],
    current_year_distributions: [{
      date: "2026-12-31",
      amount_usd: 10_000,
      year_charges: [{ tax_year: 2025, interest_charge: 150 }],
    }],
    taxable_nonexcess_dividend_usd: 0,
  };
  const [result] = calculateForYear(event, 2026);
  assertEquals(result.allocations.map((year) => year.tax_year), [2025, 2026]);
  assertEquals(result.line16b_current_and_pre_pfic_income, 5_000);
  assertEquals(result.line16e_additional_tax, 1_850);
  assertEquals(result.line16f_interest, 150);
  assertThrows(() => calculateForYear(event, 2025), Error);
  assertThrows(() => calculateForYear({
    ...event,
    prior_year_distributions: [{ tax_year: 2024, amount_usd: 0 }],
  }, 2026), Error, "every prior holding year");
});
