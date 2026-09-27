import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateExcessEvents,
  calculateSection1291Interest,
  ExcessEventKind,
} from "./excess_distribution.ts";

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
    }],
  }],
  taxable_nonexcess_dividend_usd: 0,
};

Deno.test("Form 8621 compounds published section 6621 rates over dated periods", () => {
  const netTax = 1_000;
  // 2024 return due 2025-04-15; 2025 return due 2026-04-15.
  // 351 days at 7% and 14 days at 6%, each with a 365-day divisor.
  const expected2024 = Math.round(
    (netTax * Math.pow(1 + 0.07 / 365, 351) *
        Math.pow(1 + 0.06 / 365, 14) - netTax) * 100,
  ) / 100;
  assertEquals(calculateSection1291Interest(2024, netTax), expected2024);

  // 2023 return due 2024-04-15; 2024 is leap, so its 261 interest
  // days use 366. The remaining periods are 365-day years.
  const expected2023 = Math.round(
    (netTax * Math.pow(1 + 0.08 / 366, 261) *
        Math.pow(1 + 0.07 / 365, 365 + 90) *
        Math.pow(1 + 0.06 / 365, 14) - netTax) * 100,
  ) / 100;
  assertEquals(calculateSection1291Interest(2023, netTax), expected2023);
});

Deno.test("Form 8621 rejects supplied interest and unverified prior-year periods", () => {
  assertThrows(
    () =>
      calculateExcessEvents({
        ...distribution,
        current_year_distributions: [{
          date: "2025-12-31",
          amount_usd: 10_000,
          year_charges: [{ tax_year: 2024, interest_charge: 150 }],
        }],
      } as never),
    Error,
    "Unrecognized key",
  );
  assertThrows(
    () => calculateSection1291Interest(2019, 1_000),
    Error,
    "COVID-postponement analysis",
  );
  assertThrows(
    () => calculateSection1291Interest(2020, 1_000),
    Error,
    "COVID-postponement analysis",
  );
});

Deno.test("Form 8621 interest starts on statutory April 15 despite section 7503", () => {
  const netTax = 1_000;
  // TY2021 filing was timely through April 18, 2022, but section 7503
  // does not move the April 15 statutory date used for interest.
  // IRS IRM 20.2.5.5: https://www.irs.gov/irm/part20/irm_20-002-005r
  const factor = Math.pow(1 + 0.04 / 365, 77) *
    Math.pow(1 + 0.05 / 365, 92) *
    Math.pow(1 + 0.06 / 365, 92) *
    Math.pow(1 + 0.07 / 365, 90 + 91 + 92) *
    Math.pow(1 + 0.08 / 365, 92) *
    Math.pow(1 + 0.08 / 366, 366) *
    Math.pow(1 + 0.07 / 365, 365 + 90) *
    Math.pow(1 + 0.06 / 365, 14);
  const expected = Math.round((netTax * factor - netTax) * 100) / 100;
  assertEquals(calculateSection1291Interest(2021, netTax), expected);
});

Deno.test("Form 8621 uses the published historical quarterly rates back to 1987", () => {
  const from1987 = calculateSection1291Interest(1987, 1_000);
  const from1988 = calculateSection1291Interest(1988, 1_000);
  const from2008 = calculateSection1291Interest(2008, 1_000);
  const from2024 = calculateSection1291Interest(2024, 1_000);
  assertEquals(from1987 > from1988, true);
  assertEquals(from1988 > from2008, true);
  assertEquals(from2008 > from2024, true);
  assertThrows(
    () => calculateSection1291Interest(1986, 1_000),
    Error,
    "lacks a statutory Form 1040 due date",
  );
});

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
  assertEquals(
    result.allocations[0].interest_charge,
    calculateSection1291Interest(2024, 5_006.84 * 0.37 - 100),
  );
  assertEquals(
    result.line16f_interest,
    Math.round(result.allocations[0].interest_charge),
  );
});

Deno.test("Form 8621 calculates each prior PFIC year's interest separately", () => {
  const [result] = calculateExcessEvents({
    ...distribution,
    holding_period_start: "2023-01-01",
    first_pfic_tax_year: 2023,
    prior_year_distributions: [
      { tax_year: 2024, amount_usd: 0 },
      { tax_year: 2023, amount_usd: 0 },
    ],
    current_year_distributions: [{
      date: "2025-12-31",
      amount_usd: 10_000,
      year_charges: [],
    }],
  });
  const [year2023, year2024] = result.allocations;
  assertEquals(
    year2023.interest_charge,
    calculateSection1291Interest(2023, year2023.allocated_amount * 0.37),
  );
  assertEquals(
    year2024.interest_charge,
    calculateSection1291Interest(2024, year2024.allocated_amount * 0.37),
  );
  assertEquals(
    result.line16f_interest,
    Math.round(year2023.interest_charge + year2024.interest_charge),
  );
});

Deno.test("Form 8621 applies 125% of prior average per share", () => {
  const [result] = calculateExcessEvents({
    ...distribution,
    prior_year_distributions: [{ tax_year: 2024, amount_usd: 4_000 }],
    current_year_distributions: [{
      date: "2025-12-31",
      amount_usd: 10_000,
      year_charges: [],
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
        year_charges: [],
      },
      {
        date: "2025-12-31",
        amount_usd: 8_000,
        year_charges: [],
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

Deno.test("Form 8621 determines same-currency excess before converting each distribution at its spot rate", () => {
  const results = calculateExcessEvents({
    kind: ExcessEventKind.Distribution,
    holding_period_start: "2024-01-01",
    first_pfic_tax_year: 2024,
    shares_in_block: 100,
    currency_code: "EUR",
    prior_year_distributions: [{ tax_year: 2024, amount_foreign: 4_000 }],
    current_year_distributions: [
      {
        date: "2025-06-30",
        amount_foreign: 2_000,
        spot_usd_per_unit: 1.1,
        spot_rate_source: "Test spot quote, 2025-06-30",
        year_charges: [],
      },
      {
        date: "2025-12-31",
        amount_foreign: 8_000,
        spot_usd_per_unit: 1.25,
        spot_rate_source: "Test spot quote, 2025-12-31",
        year_charges: [],
      },
    ],
    taxable_nonexcess_dividend_usd: 6_100,
  });
  assertEquals(results.map((result) => result.currency_code), ["EUR", "EUR"]);
  assertEquals(results.map((result) => result.line15a_current_distributions), [
    10_000,
    10_000,
  ]);
  assertEquals(results.map((result) => result.line15d_threshold), [
    5_000,
    5_000,
  ]);
  assertEquals(results.map((result) => result.amount_form_currency), [
    1_000,
    4_000,
  ]);
  assertEquals(results.map((result) => result.amount_usd), [1_100, 5_000]);
  assertEquals(results.map((result) => result.nonexcess_distribution), [
    6_100,
    6_100,
  ]);
});

Deno.test("Form 8621 rejects a foreign taxable dividend above the translated nonexcess amount", () => {
  assertThrows(
    () =>
      calculateExcessEvents({
        kind: ExcessEventKind.Distribution,
        holding_period_start: "2024-01-01",
        first_pfic_tax_year: 2024,
        shares_in_block: 100,
        currency_code: "EUR",
        prior_year_distributions: [{ tax_year: 2024, amount_foreign: 4_000 }],
        current_year_distributions: [{
          date: "2025-12-31",
          amount_foreign: 10_000,
          spot_usd_per_unit: 1.2,
          spot_rate_source: "Test spot quote, 2025-12-31",
          year_charges: [],
        }],
        taxable_nonexcess_dividend_usd: 6_001,
      }),
    Error,
    "exceeds nonexcess",
  );
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
    () => calculateSection1291Interest(2019, 100),
    Error,
    "COVID-postponement analysis",
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
        }],
      }),
    Error,
    "section 1248 dividend attribution",
  );
});

Deno.test("Form 8621 translates foreign net proceeds before subtracting USD adjusted basis", () => {
  const [result] = calculateExcessEvents({
    kind: ExcessEventKind.Disposition,
    currency_code: "EUR",
    net_proceeds_foreign: 10_000,
    spot_usd_per_unit: 1.2,
    spot_rate_source: "Test spot quote, 2025-12-31",
    adjusted_basis_usd: 2_000,
    holding_period_start: "2024-01-01",
    event_date: "2025-12-31",
    first_pfic_tax_year: 2024,
    year_charges: [],
  });
  assertEquals(result.amount_usd, 10_000);
  assertEquals(result.currency_code, "USD");
  assertEquals(result.line16c_prior_year_tax_before_credit, 1_853);
});

Deno.test("Form 8621 does not route a translated foreign disposition loss as section 1291 gain", () => {
  assertThrows(
    () =>
      calculateExcessEvents({
        kind: ExcessEventKind.Disposition,
        currency_code: "EUR",
        net_proceeds_foreign: 1_000,
        spot_usd_per_unit: 1.2,
        spot_rate_source: "Test spot quote, 2025-12-31",
        adjusted_basis_usd: 2_000,
        holding_period_start: "2024-01-01",
        event_date: "2025-12-31",
        first_pfic_tax_year: 2024,
        year_charges: [],
      }),
    Error,
    "positive USD gain",
  );
});
