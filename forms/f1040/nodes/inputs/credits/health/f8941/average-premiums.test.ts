import { assertEquals, assertThrows } from "@std/assert";
import { form8941AveragePremiums } from "./average-premiums.ts";
import { form8941DirectFixture } from "./fixture.ts";
import { calculateForm8941 } from "./index.ts";
import table from "./average-premiums-2025.json" with { type: "json" };

Deno.test("2025 SHOP table preserves county-specific and statewide premium pairs", () => {
  assertEquals(Object.keys(table).length, 51);
  assertEquals(
    Object.values(table).reduce((n, rows) => n + Object.keys(rows).length, 0),
    3091,
  );
  for (
    const [state, county, employeeOnly, family] of [
      ["NY", "Albany", 9358, 24527],
      ["WY", "Albany", 9933, 26086],
      ["NY", "Bronx", 11671, 32726],
      ["TX", "Travis", 8000, 21482],
      ["AK", "Anchorage", 11682, 31718],
      ["NJ", "Essex", 9236, 27428],
      ["DC", "District of Columbia", 9368, 29790],
    ] as const
  ) {
    assertEquals(form8941AveragePremiums(state, county), {
      employeeOnly,
      family,
    });
  }
  for (
    const [state, county] of [
      ["HI", "Honolulu"],
      ["NY", "Unknown"],
      ["XX", "All"],
      ["NJ", ""],
      ["__proto__", "All"],
      ["NY", "constructor"],
    ]
  ) {
    assertThrows(() => form8941AveragePremiums(state, county));
  }
});

Deno.test("every eligible IRS table row reaches the owned employee-only premium cap", () => {
  let count = 0;
  for (const [state, counties] of Object.entries(table)) {
    if (state === "HI") continue;
    for (const [county, [employeeOnly]] of Object.entries(counties)) {
      const source = form8941DirectFixture();
      Object.assign(source.shop_review, {
        irs_table_state: state,
        irs_table_county: county,
        irs_table_employee_only_average_premium: employeeOnly,
      });
      for (const e of source.employees) {
        Object.assign(e, {
          rating_area_state: state,
          rating_area_county: county,
          irs_2025_rating_area_average_premium: employeeOnly,
        });
      }
      const lines = calculateForm8941(source);
      const cap = Math.round(employeeOnly * 5 / 2);
      assertEquals(lines.line5, cap, `${state}/${county}`);
      assertEquals(
        lines.line16,
        Math.round(Math.min(25000, cap) / 2),
        `${state}/${county}`,
      );
      count++;
    }
  }
  assertEquals(count, 3090);
});

Deno.test("SHOP table review rejects another county's values and Hawaii at calculation entry", () => {
  for (const [state, county] of [["NY", "Bronx"], ["HI", "All"]]) {
    const source = form8941DirectFixture();
    source.shop_review.irs_table_state = state;
    source.shop_review.irs_table_county = county;
    for (const e of source.employees) {
      e.rating_area_state = state;
      e.rating_area_county = county;
    }
    assertThrows(() => calculateForm8941(source));
  }
});
