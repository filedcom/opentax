import { assertEquals, assertThrows } from "@std/assert";
import { BiofuelType, f6478 } from "./index.ts";

function compute(input: Parameters<typeof f6478.compute>[1]) {
  return f6478.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("Form 6478 empty source makes no claim", () => {
  assertEquals(compute({}).outputs, []);
  assertEquals(compute({ fuel_entries: [] }).outputs, []);
});

Deno.test("Form 6478 rejects 2025 production gallons rather than creating a credit", () => {
  for (const fuel_type of Object.values(BiofuelType)) {
    assertThrows(
      () => compute({ fuel_entries: [{ fuel_type, gallons: 1_000 }] }),
      Error,
      "TY2025 Form 6478 production gallons are not eligible",
    );
  }
});

Deno.test("Form 6478 rejects zero-gallon and overridden-rate entries instead of implying eligibility", () => {
  assertThrows(
    () =>
      compute({
        fuel_entries: [{
          fuel_type: BiofuelType.SecondGenerationBiofuel,
          gallons: 0,
        }],
      }),
    Error,
    "TY2025 Form 6478 production gallons are not eligible",
  );
  assertThrows(
    () =>
      compute({
        fuel_entries: [{
          fuel_type: BiofuelType.SecondGenerationBiofuel,
          gallons: 100,
          credit_rate_override: 2,
        }],
      }),
    Error,
    "TY2025 Form 6478 production gallons are not eligible",
  );
});

Deno.test("Form 6478 still rejects malformed gallons", () => {
  assertEquals(
    f6478.inputSchema.safeParse({
      fuel_entries: [{
        fuel_type: BiofuelType.SecondGenerationBiofuel,
        gallons: -1,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 6478 rejects an unmodeled pass-through line 3 instead of stripping it", () => {
  assertThrows(
    () =>
      compute(
        { line3_pass_through_credit: 2_000 } as Parameters<
          typeof f6478.compute
        >[1],
      ),
    Error,
    "Unrecognized key",
  );
});
