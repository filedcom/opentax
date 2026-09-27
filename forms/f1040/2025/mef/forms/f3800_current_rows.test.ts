import { assertEquals, assertThrows } from "@std/assert";
import { combineForm3800CurrentCreditAmounts } from "./f3800_current_rows.ts";

Deno.test("Form 3800 current-year rows combine passive and nonpassive credit on one line", () => {
  assertEquals(
    combineForm3800CurrentCreditAmounts(
      [
        { line: "1h", availableCredit: 900, appliedCredit: 500 },
        { line: "4b", availableCredit: 200, appliedCredit: 200 },
      ],
      [
        {
          line: "1h",
          beforePassiveLimit: 400,
          afterPassiveLimit: 300,
          appliedCredit: 100,
        },
        {
          line: "1e",
          beforePassiveLimit: 150,
          afterPassiveLimit: 120,
          appliedCredit: 120,
        },
      ],
    ),
    [
      {
        line: "1e",
        nonpassiveCredit: 0,
        passiveBeforeLimit: 150,
        passiveAfterLimit: 120,
        totalCredit: 120,
        appliedCredit: 120,
      },
      {
        line: "1h",
        nonpassiveCredit: 900,
        passiveBeforeLimit: 400,
        passiveAfterLimit: 300,
        totalCredit: 1_200,
        appliedCredit: 600,
      },
      {
        line: "4b",
        nonpassiveCredit: 200,
        passiveBeforeLimit: 0,
        passiveAfterLimit: 0,
        totalCredit: 200,
        appliedCredit: 200,
      },
    ],
  );
});

Deno.test("Form 3800 current-year rows reject duplicate and unreconciled source amounts", () => {
  assertThrows(
    () =>
      combineForm3800CurrentCreditAmounts([
        { line: "1h", availableCredit: 100, appliedCredit: 50 },
        { line: "1h", availableCredit: 100, appliedCredit: 50 },
      ], []),
    Error,
    "nonpassive row is invalid",
  );
  assertThrows(
    () =>
      combineForm3800CurrentCreditAmounts([], [{
        line: "1h",
        beforePassiveLimit: 100,
        afterPassiveLimit: 80,
        appliedCredit: 90,
      }]),
    Error,
    "passive row is invalid",
  );
  assertThrows(
    () =>
      combineForm3800CurrentCreditAmounts([
        { line: "1h", availableCredit: 100, appliedCredit: 101 },
      ], []),
    Error,
    "nonpassive row is invalid",
  );
});
