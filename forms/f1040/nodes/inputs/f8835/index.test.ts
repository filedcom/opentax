import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f3800 } from "../f3800/index.ts";
import { calculateForm8835, EnergyType, f8835 } from "./index.ts";

function item(overrides: Record<string, unknown> = {}) {
  return {
    energy_type: EnergyType.Wind,
    subject_to_passive_activity_limit: false,
    kwh_produced: 1_000_000,
    kwh_sold: 1_000_000,
    facility_placed_in_service_date: "2023-01-01",
    facility_construction_start_date: "2022-12-01",
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none" as const,
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
    ...overrides,
  };
}

function lines(overrides: Record<string, unknown> = {}) {
  return calculateForm8835(
    f8835.inputSchema.parse({ f8835s: [item(overrides)] }).f8835s[0],
  );
}

Deno.test("f8835: 2025 base rate and fivefold increase are separate lines", () => {
  assertEquals(lines().line1, 6_000);
  assertEquals(lines().line9, 6_000);
  assertEquals(
    lines({ increased_credit_reason: "construction_before_2023_01_29" }).line9,
    30_000,
  );
  assertEquals(lines({ energy_type: EnergyType.BiomassOpen }).line1, 3_000);
});

Deno.test("f8835: bonuses apply after the fivefold increase", () => {
  const result = lines({
    increased_credit_reason: "under_one_mw",
    maximum_net_output_mw: 0.9,
    domestic_content_bonus: true,
    energy_community_bonus: true,
  });
  assertEquals(result.line9, 30_000);
  assertEquals(result.line10, 3_000);
  assertEquals(result.line11, 3_000);
  assertEquals(result.line15, 36_000);
});

Deno.test("f8835: bond-financed facility uses the smaller of ratio and 15 percent", () => {
  const result = lines({
    tax_exempt_bond_proceeds: 20_000,
    aggregate_capital_additions: 100_000,
  });
  assertEquals(result.line5b, 1_200);
  assertEquals(result.line5c, 900);
  assertEquals(result.line5d, 900);
  assertEquals(result.line15, 5_100);
});

Deno.test("f8835: bond ratio uses Form 8835's two-decimal filed precision", () => {
  const result = lines({
    tax_exempt_bond_proceeds: 12_500,
    aggregate_capital_additions: 100_000,
  });
  assertEquals(result.line5a, 0.13);
  assertEquals(result.line5b, 780);
});

Deno.test("f8835: sold kilowatt-hours must be whole units", () => {
  assertEquals(
    f8835.inputSchema.safeParse({ f8835s: [item({ kwh_sold: 1.5 })] }).success,
    false,
  );
});

Deno.test("f8835: repeated physical facility cannot double the credit", () => {
  const first = item({
    facility_us_address: {
      line1: "10 Plant Rd",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    facility_latitude: 39.123456,
    facility_longitude: -75.123456,
  });
  assertEquals(
    f8835.inputSchema.safeParse({ f8835s: [first, { ...first }] }).success,
    false,
  );
  assertEquals(
    f8835.inputSchema.safeParse({
      f8835s: [first, { ...first, facility_latitude: 39.223456 }],
    }).success,
    true,
  );
});

Deno.test("f8835: validates increased-credit evidence and transferred credit", () => {
  assertThrows(() => lines({ increased_credit_reason: "under_one_mw" }));
  assertThrows(() =>
    lines({
      increased_credit_reason: "prevailing_wage_and_apprenticeship",
      meets_prevailing_wage: true,
      meets_apprenticeship: false,
    })
  );
  assertThrows(() => lines({ transfer_election_amount: 1_000 }));
  assertThrows(() =>
    lines({
      transfer_election_amount: 7_000,
      registration_number: "CAABC12ABCDE",
    })
  );
  assertThrows(() => lines({ kwh_sold: 1_000_001 }));
});

Deno.test("f8835: routes first four years to Form 3800 line 4e", () => {
  assertEquals(lines().form3800Line, "4e");
  assertEquals(
    lines({
      facility_placed_in_service_date: "2020-01-01",
      production_period_start_date: "2025-01-01",
      production_period_end_date: "2025-12-31",
    }).form3800Line,
    "1f",
  );
});

Deno.test("f8835: rejects periods crossing the Form 3800 four-year boundary", () => {
  assertThrows(() =>
    lines({
      facility_placed_in_service_date: "2021-06-01",
      production_period_start_date: "2025-01-01",
      production_period_end_date: "2025-12-31",
    })
  );
});

Deno.test("f8835: forwards each facility and transfer election to Form 3800", () => {
  const result = f8835.compute({ taxYear: 2025, formType: "f1040" }, {
    f8835s: [
      item({
        transfer_election_amount: 2_000,
        registration_number: "CAABC12ABCDE",
        transfer_election_statement_file_name:
          "Transfer Election Statement.pdf",
      }),
      item({
        energy_type: EnergyType.BiomassOpen,
        kwh_sold: 500_000,
      }),
    ],
  });
  assertEquals(fieldsOf(result.outputs, f3800)?.f8835_credit_entries, [
    {
      form3800_line: "4e",
      credit_amount: 6_000,
      transfer_out_amount: 2_000,
      registration_number: "CAABC12ABCDE",
      subject_to_passive_activity_limit: false,
      transfer_election_statement_file_name: "Transfer Election Statement.pdf",
    },
    {
      form3800_line: "4e",
      credit_amount: 1_500,
      transfer_out_amount: 0,
      registration_number: undefined,
      subject_to_passive_activity_limit: false,
      transfer_election_statement_file_name: undefined,
    },
  ]);
  assertEquals(
    result.outputs.some((output) => output.nodeType === "schedule3"),
    false,
  );
});
