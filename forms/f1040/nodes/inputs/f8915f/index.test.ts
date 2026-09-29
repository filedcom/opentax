import { assertEquals, assertThrows } from "@std/assert";
import { f8915f } from "./index.ts";

function compute(input: Parameters<typeof f8915f.compute>[1]) {
  return f8915f.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("Form 8915-F absent and empty source make no claim", () => {
  assertEquals(compute({}).outputs, []);
  assertEquals(compute({ f8915fs: [] }).outputs, []);
});

Deno.test("Form 8915-F blocks the old $100,000 universal-cap and Schedule 1 route", () => {
  assertThrows(
    () =>
      compute({
        f8915fs: [{ distribution_year: 2025, total_distribution: 30_000 }],
      }),
    Error,
    "TY2025 Form 8915-F needs disaster-year/source",
  );
});

Deno.test("Form 8915-F blocks a 2020-disaster carryforward without prior-return reconciliation", () => {
  assertThrows(
    () =>
      compute({
        f8915fs: [{
          disaster_type: "2020 disaster",
          distribution_year: 2020,
          total_distribution: 90_000,
          amount_reported_prior_year1: 30_000,
          amount_reported_prior_year2: 30_000,
        }],
      }),
    Error,
    "TY2025 Form 8915-F needs disaster-year/source",
  );
});

Deno.test("Form 8915-F blocks repayment-only and explicit zero items instead of emitting negative income", () => {
  assertThrows(
    () => compute({ f8915fs: [{ repayments_this_year: 15_000 }] }),
    Error,
  );
  assertThrows(() => compute({ f8915fs: [{ total_distribution: 0 }] }), Error);
  assertThrows(() => compute({ f8915fs: [{}] }), Error);
});

Deno.test("Form 8915-F retains numeric validation and rejects unmodeled source facts", () => {
  assertEquals(
    f8915f.inputSchema.safeParse({ f8915fs: [{ total_distribution: -1 }] })
      .success,
    false,
  );
  assertThrows(
    () =>
      compute(
        { f8915fs: [{ fema_number: "DR-1234" }] } as unknown as Parameters<
          typeof f8915f.compute
        >[1],
      ),
    Error,
    "Unrecognized key",
  );
});
