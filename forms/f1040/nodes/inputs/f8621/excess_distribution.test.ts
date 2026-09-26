import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateExcessEvent,
  ExcessEventKind,
} from "./excess_distribution.ts";

const event = {
  kind: ExcessEventKind.Distribution,
  amount_usd: 10_000,
  holding_period_start: "2024-01-01",
  event_date: "2025-12-31",
  first_pfic_tax_year: 2024,
  year_charges: [{
    tax_year: 2024,
    foreign_tax_credit: 100,
    interest_charge: 150,
  }],
};

Deno.test("Form 8621 allocates excess by actual holding days, including leap day", () => {
  const result = calculateExcessEvent(event);
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

Deno.test("Form 8621 keeps pre-PFIC years in current ordinary income", () => {
  const result = calculateExcessEvent({
    ...event,
    first_pfic_tax_year: 2025,
    year_charges: [],
  });
  assertEquals(result.line16b_current_and_pre_pfic_income, 10_000);
  assertEquals(result.line16e_additional_tax, 0);
});

Deno.test("Form 8621 accepts a PFIC year before share acquisition", () => {
  const result = calculateExcessEvent({
    ...event,
    first_pfic_tax_year: 2018,
  });
  assertEquals(result.allocations.map((year) => year.pfic_year), [true, true]);
});

Deno.test("Form 8621 treats pre-1987 holding years as pre-PFIC", () => {
  const result = calculateExcessEvent({
    ...event,
    amount_usd: 365,
    holding_period_start: "1986-12-31",
    event_date: "2025-01-01",
    first_pfic_tax_year: 2025,
    year_charges: [],
  });
  assertEquals(result.allocations[0].tax_year, 1986);
  assertEquals(result.allocations[0].pfic_year, false);
  assertEquals(result.line16b_current_and_pre_pfic_income, 365);
});

Deno.test("Form 8621 allocates short holding periods and tiny amounts without losing cents", () => {
  const result = calculateExcessEvent({
    ...event,
    amount_usd: 0.03,
    holding_period_start: "2024-12-31",
    event_date: "2025-01-02",
    year_charges: [{ tax_year: 2024, interest_charge: 0 }],
  });
  assertEquals(result.allocations.map((year) => year.allocated_amount), [
    0.01,
    0.02,
  ]);
});

Deno.test("Form 8621 rejects invalid dates and unsupported prior-year charges", () => {
  assertThrows(
    () =>
      calculateExcessEvent({ ...event, holding_period_start: "2024-02-30" }),
    Error,
    "invalid holding-period date",
  );
  assertThrows(
    () => calculateExcessEvent({ ...event, event_date: "2024-12-31" }),
    Error,
    "ending on a 2025 event date",
  );
  assertThrows(
    () =>
      calculateExcessEvent({ ...event, holding_period_start: "2025-01-01" }),
    Error,
    "first tax year",
  );
  assertThrows(
    () => calculateExcessEvent({ ...event, year_charges: [] }),
    Error,
    "interest charge",
  );
  assertThrows(
    () =>
      calculateExcessEvent({
        ...event,
        year_charges: [{
          tax_year: 2024,
          foreign_tax_credit: 2_000,
          interest_charge: 0,
        }],
      }),
    Error,
    "credit exceeds",
  );
  assertThrows(
    () =>
      calculateExcessEvent({
        ...event,
        year_charges: [{ tax_year: 2023, interest_charge: 0 }, {
          tax_year: 2024,
          interest_charge: 0,
        }],
      }),
    Error,
    "outside the holding period",
  );
});

Deno.test("Form 8621 does not apply disposition foreign tax without section 1248 attribution", () => {
  assertThrows(
    () => calculateExcessEvent({ ...event, kind: ExcessEventKind.Disposition }),
    Error,
    "section 1248 dividend attribution",
  );
});
