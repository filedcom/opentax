import { assertEquals, assertThrows } from "@std/assert";
import { f8864 } from "./index.ts";

function compute(input: Parameters<typeof f8864.compute>[1]) {
  return f8864.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("Form 8864 empty source makes no credit claim", () => {
  assertEquals(compute({}).outputs, []);
});

Deno.test("Form 8864 rejects expired biodiesel, renewable-diesel, and SAF gallon routes", () => {
  for (
    const input of [
      { gallons_biodiesel: 1_000 },
      { gallons_renewable_diesel: 1_000 },
      { gallons_saf: 1_000, saf_ghg_reduction_percentage: 75 },
    ]
  ) {
    assertThrows(
      () => compute(input),
      Error,
      "TY2025 Form 8864 fuel credit needs a dated, qualified source",
    );
  }
});

Deno.test("Form 8864 rejects unsourced agri-biodiesel instead of applying the old $1.10 rate", () => {
  assertThrows(
    () => compute({ gallons_agri_biodiesel: 500 }),
    Error,
    "TY2025 Form 8864 fuel credit needs a dated, qualified source",
  );
});

Deno.test("Form 8864 rejects explicit zero fields and incomplete SAF details instead of discarding an asserted source", () => {
  assertThrows(() => compute({ gallons_agri_biodiesel: 0 }), Error);
  assertThrows(() => compute({ saf_ghg_reduction_percentage: 80 }), Error);
});

Deno.test("Form 8864 validates numeric fuel facts and rejects unmodeled source fields", () => {
  assertEquals(
    f8864.inputSchema.safeParse({ gallons_biodiesel: -1 }).success,
    false,
  );
  assertThrows(
    () =>
      compute(
        { small_agri_sale_date: "2025-07-01" } as Parameters<
          typeof f8864.compute
        >[1],
      ),
    Error,
    "Unrecognized key",
  );
});
