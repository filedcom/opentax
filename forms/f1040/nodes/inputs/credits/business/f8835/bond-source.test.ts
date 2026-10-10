import { assertEquals, assertThrows } from "@std/assert";
import { assertForm8835BondSource } from "./bond-source.ts";
import { calculateForm8835, EnergyType, itemSchema } from "./index.ts";
import { bondFields } from "../../../../../2025/domains/credits/business/form3800/form3800_bonds.fixture.ts";

function fixture(proceeds = 12500) {
  return itemSchema.parse({
    energy_type: EnergyType.Wind,
    subject_to_passive_activity_limit: false,
    kwh_produced: 1000000,
    kwh_sold: 1000000,
    facility_description: "Synthetic production facility 1",
    facility_us_address: {
      line1: "10 Plant Road",
      city: "Dover",
      state: "DE",
      zip: "19901",
    },
    facility_latitude: 39.123456,
    facility_longitude: -75.123456,
    facility_owned_by_filer: true,
    facility_placed_in_service_date: "2024-01-01",
    facility_construction_start_date: "2023-06-01",
    maximum_net_output_mw: 1.5,
    ac_nameplate_kw: 1500,
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none",
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
    ...bondFields(0, proceeds),
  });
}
Deno.test("f8835 bond review: cumulative financing, filed ratio and reduction cap", () => {
  for (
    const [proceeds, ratio, reduction] of [
      [10000, .10, 600],
      [12500, .13, 780],
      [40000, .40, 900],
      [400, .00, 0],
    ]
  ) {
    const f = fixture(proceeds);
    assertForm8835BondSource(f, true);
    const l = calculateForm8835(f);
    assertEquals([l.line5a, l.line5d, l.line15], [
      ratio,
      reduction,
      6000 - reduction,
    ]);
  }
});
Deno.test("f8835 bond review rejects incomplete, conflicting or misdated inventories", () => {
  const mutations: Array<(f: ReturnType<typeof fixture>) => void> = [
    (f) => {
      f.tax_exempt_bond_proceeds = 12500.001;
    },
    (f) => {
      f.tax_exempt_bond_proceeds = 200000;
      f.tax_exempt_bond_source!.financing = [{
        ...f.tax_exempt_bond_source!.financing[0],
        proceeds_used: 200000,
      }];
    },
    (f) => {
      f.facility_construction_start_date = "2025-01-01";
      f.facility_placed_in_service_date = "2025-01-01";
      f.tax_exempt_bond_source!.construction_began_on = "2025-01-01";
    },
    (f) => {
      f.aggregate_capital_additions = 100000.001;
    },
    (f) => {
      f.facility_owned_by_filer = false;
    },
    (f) => {
      f.facility_construction_start_date = "2022-08-16";
      f.tax_exempt_bond_source!.construction_began_on = "2022-08-16";
    },
    (f) => {
      f.tax_exempt_bond_source!.facility_address_line1 = "Other plant";
    },
    (f) => {
      f.tax_exempt_bond_source!.financing.pop();
    },
    (f) => {
      f.tax_exempt_bond_source!.capital_additions.pop();
    },
    (f) => {
      f.tax_exempt_bond_source!.capital_additions[0].added_on = "2026-01-01";
    },
    (f) => {
      f.tax_exempt_bond_source!.capital_additions[0].added_on = "2025-02-30";
    },
    (f) => {
      f.tax_exempt_bond_source!.financing[0].issued_on = "2025-01-01";
    },
    (f) => {
      f.tax_exempt_bond_source!.financing[0].proceeds_used = 0.001;
    },
    (f) => {
      f.tax_exempt_bond_source!.financing[0].record_reference =
        f.tax_exempt_bond_source!.capital_additions[0].record_reference;
    },
    (f) => {
      f.tax_exempt_bond_source!.review_reference =
        f.tax_exempt_bond_source!.construction_record_reference;
    },
  ];
  for (const change of mutations) {
    const f = fixture();
    change(f);
    assertThrows(() => calculateForm8835(itemSchema.parse(f)));
  }
  const unsourced = fixture();
  delete unsourced.tax_exempt_bond_source;
  assertThrows(
    () => assertForm8835BondSource(unsourced, true),
    Error,
    "source review",
  );
});
