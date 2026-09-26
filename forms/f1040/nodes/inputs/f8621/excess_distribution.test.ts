import { assertEquals, assertThrows } from "@std/assert";
import { calculateExcessEvent } from "./excess_distribution.ts";
import { ExcessEventKind } from "./excess_distribution.ts";

const event = {
  kind: ExcessEventKind.Distribution,
  amount_usd: 10_000,
  holding_period_explanation:
    "2025 excess distribution allocated by holding-period days",
  allocations: [
    {
      tax_year: 2017,
      allocated_amount: 2_000,
      pfic_year: true,
      foreign_tax_credit: 100,
      interest_charge: 150,
    },
    {
      tax_year: 2022,
      allocated_amount: 3_000,
      pfic_year: true,
      interest_charge: 80,
    },
    { tax_year: 2025, allocated_amount: 5_000, pfic_year: true },
  ],
};

Deno.test("Form 8621 Part V uses the rate for each prior PFIC year, not 2025's rate", () => {
  assertEquals(calculateExcessEvent(event), {
    line16b_current_and_pre_pfic_income: 5_000,
    line16c_prior_year_tax_before_credit: 1_902,
    line16d_prior_year_foreign_tax_credit: 100,
    line16e_additional_tax: 1_802,
    line16f_interest: 230,
  });
});

Deno.test("Form 8621 treats pre-PFIC years as current ordinary income", () => {
  const result = calculateExcessEvent({
    ...event,
    allocations: [
      { tax_year: 2017, allocated_amount: 2_000, pfic_year: false },
      {
        tax_year: 2022,
        allocated_amount: 3_000,
        pfic_year: true,
        interest_charge: 80,
      },
      { tax_year: 2025, allocated_amount: 5_000, pfic_year: true },
    ],
  });
  assertEquals(result.line16b_current_and_pre_pfic_income, 7_000);
  assertEquals(result.line16e_additional_tax, 1_110);
});

Deno.test("Form 8621 rejects incomplete or inconsistent year allocations", () => {
  assertThrows(
    () => calculateExcessEvent({ ...event, amount_usd: 11_000 }),
    Error,
    "allocations must equal",
  );
  assertThrows(
    () =>
      calculateExcessEvent({
        ...event,
        allocations: [
          { tax_year: 2022, allocated_amount: 5_000, pfic_year: true },
          { tax_year: 2025, allocated_amount: 5_000, pfic_year: true },
        ],
      }),
    Error,
    "interest charge",
  );
  assertThrows(
    () =>
      calculateExcessEvent({
        ...event,
        allocations: [
          {
            tax_year: 2022,
            allocated_amount: 5_000,
            pfic_year: true,
            interest_charge: 80,
            foreign_tax_credit: 2_000,
          },
          { tax_year: 2025, allocated_amount: 5_000, pfic_year: true },
        ],
      }),
    Error,
    "credit exceeds",
  );
});

Deno.test("Form 8621 does not apply disposition foreign tax without section 1248 attribution", () => {
  assertThrows(
    () =>
      calculateExcessEvent({
        ...event,
        kind: ExcessEventKind.Disposition,
      }),
    Error,
    "section 1248 dividend attribution",
  );
});
