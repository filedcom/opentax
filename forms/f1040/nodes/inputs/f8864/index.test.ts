import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8864, f8864, inputSchema } from "./index.ts";
import { directAgriBiodieselSource } from "./fixture.ts";

Deno.test("Form 8864 computes the dated 2025 small producer credit", () => {
  assertEquals(calculateForm8864(directAgriBiodieselSource), {
    line7_gallons: 1_000,
    line7_rate: 0.10,
    line7: 100,
    line8_gallons: 2_000,
    line8_rate: 0.20,
    line8: 400,
    line9: 500,
    line10: 0,
    line11: 500,
  });
  assertThrows(
    () =>
      f8864.compute(
        { taxYear: 2025, formType: "f1040" },
        directAgriBiodieselSource,
      ),
    Error,
    "native attachment and Form 3800 linkage",
  );
});

Deno.test("Form 8864 rejects old gallon shortcuts, missing registration and ineligible fuel", () => {
  const lot = directAgriBiodieselSource.lots[0];
  for (
    const candidate of [
      { gallons_biodiesel: 1_000 },
      { gallons_saf: 1_000 },
      { ...directAgriBiodieselSource, form637_registration_number: "" },
      { ...directAgriBiodieselSource, no_transfer_election_confirmed: false },
      {
        ...directAgriBiodieselSource,
        lots: [{ ...lot, sale_date: "2024-12-31" }],
      },
      {
        ...directAgriBiodieselSource,
        lots: [{ ...lot, feedstock_origin: "BR" }],
      },
      {
        ...directAgriBiodieselSource,
        lots: [{ ...lot, gallons_sold: 15_000_001 }],
      },
      {
        ...directAgriBiodieselSource,
        lots: [{
          ...lot,
          no_renewable_diesel_or_saf_included_confirmed: false,
        }],
      },
      { ...directAgriBiodieselSource, lots: [lot, lot] },
    ]
  ) {
    assertEquals(inputSchema.safeParse(candidate).success, false);
  }
});
