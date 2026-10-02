import { assertEquals, assertThrows } from "@std/assert";
import { calculateSection453aInterest, f453a_interest } from "./index.ts";
import { twoObligation453aFixture } from "./fixture.ts";

Deno.test("section 453A two-obligation workpaper fixes origin percentage and deposits Schedule 2 line 15", () => {
  const amount = calculateSection453aInterest(twoObligation453aFixture);
  assertEquals(amount, 11_317);
  const result = f453a_interest.compute(
    { taxYear: 2025, formType: "f1040" },
    twoObligation453aFixture,
  );
  assertEquals(result.outputs, [{
    nodeType: "schedule2",
    fields: { line15_section453a_interest: 11_317 },
  }]);
});

Deno.test("section 453A later-year obligation keeps the origin percentage after payments", () => {
  const prior = {
    ...twoObligation453aFixture,
    origin_year_workpapers: [{
      ...twoObligation453aFixture.origin_year_workpapers[0],
      origin_year: 2024,
      origin_year_inventory_reference: "accepted 2024 origin workpaper",
    }],
    obligations: twoObligation453aFixture.obligations.map((row, index) => ({
      ...row,
      origin_year: 2024,
      year_end_unpaid_face_amount: index === 0 ? 3_000_000 : 0,
      year_end_unrecognized_gain: index === 0 ? 2_250_000 : 0,
    })),
  };
  assertEquals(calculateSection453aInterest(prior), 5_250);
});

Deno.test("section 453A excludes dealer, farm, and individual personal-use rows from the origin aggregate", () => {
  const excluded = {
    ...twoObligation453aFixture,
    obligations: [
      ...twoObligation453aFixture.obligations,
      ...(["farm_property", "individual_personal_use"] as const).map(
        (property_kind, index) => ({
          ...twoObligation453aFixture.obligations[0],
          obligation_id: `excluded-${index}`,
          transaction_id: `excluded-sale-${index}`,
          property_kind,
        }),
      ),
      {
        ...twoObligation453aFixture.obligations[0],
        obligation_id: "dealer-note",
        transaction_id: "dealer-sale",
        seller_is_dealer: true,
      },
    ],
  };
  assertEquals(calculateSection453aInterest(excluded), 11_317);
});

Deno.test("section 453A excludes 1988 personal property but retains 1988 real property", () => {
  const old = {
    ...twoObligation453aFixture,
    origin_year_workpapers: [{
      ...twoObligation453aFixture.origin_year_workpapers[0],
      origin_year: 1988,
      origin_year_inventory_reference:
        "accepted 1988 real-property origin workpaper",
    }],
    obligations: [
      ...twoObligation453aFixture.obligations.map((row) => ({
        ...row,
        origin_year: 1988,
        property_kind: "nonfarm_real_property" as const,
      })),
      {
        ...twoObligation453aFixture.obligations[1],
        obligation_id: "1988-personal-note",
        transaction_id: "1988-personal-sale",
        origin_year: 1988,
      },
    ],
  };
  assertEquals(calculateSection453aInterest(old), 11_317);
});

Deno.test("section 453A rejects altered origin face, percentage, and unrecognized gain", () => {
  assertThrows(
    () =>
      calculateSection453aInterest({
        ...twoObligation453aFixture,
        origin_year_workpapers: [{
          ...twoObligation453aFixture.origin_year_workpapers[0],
          aggregate_qualifying_face_amount: 5_999_999,
        }],
      }),
    Error,
    "aggregate face differs",
  );
  assertThrows(
    () =>
      calculateSection453aInterest({
        ...twoObligation453aFixture,
        origin_year_workpapers: [{
          ...twoObligation453aFixture.origin_year_workpapers[0],
          applicable_percentage: 0.5,
        }],
      }),
    Error,
    "applicable percentage differs",
  );
  assertThrows(
    () =>
      calculateSection453aInterest({
        ...twoObligation453aFixture,
        obligations: [{
          ...twoObligation453aFixture.obligations[0],
          year_end_unrecognized_gain: 3_000_001,
        }, twoObligation453aFixture.obligations[1]],
      }),
    Error,
    "unrecognized gain differs",
  );
  assertThrows(
    () =>
      calculateSection453aInterest({
        ...twoObligation453aFixture,
        obligations: [{
          ...twoObligation453aFixture.obligations[0],
          year_end_unpaid_face_amount: 3_000_000,
          year_end_unrecognized_gain: 2_250_000,
        }, twoObligation453aFixture.obligations[1]],
      }),
    Error,
    "2025 origin face must equal",
  );
});
