import { assertThrows } from "@std/assert";
import { assertForm3800FinalCreditJoin } from "./form3800_final_credit_join.ts";

const pending = {
  schedule3: { line6a_total: 600, line8_total: 650 },
  f1040: { line20_nonrefundable_credits: 650 },
};

Deno.test("Form 3800 final tax join permits other Schedule 3 credits without duplicating line 6a", () => {
  assertForm3800FinalCreditJoin(600, pending);
});

Deno.test("Form 3800 final tax join rejects changed line 6a, line 8, or Form 1040 line 20", () => {
  assertThrows(
    () => assertForm3800FinalCreditJoin(601, pending),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      assertForm3800FinalCreditJoin(600, {
        ...pending,
        schedule3: { line6a_total: 600, line8_total: 599 },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      assertForm3800FinalCreditJoin(600, {
        ...pending,
        f1040: { line20_nonrefundable_credits: 600 },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(() =>
    assertForm3800FinalCreditJoin(600, {
      ...pending,
      f1040: {},
    }), Error);
});

Deno.test("unused Form 3800 credit accepts omitted or explicit zero final-use lines", () => {
  assertForm3800FinalCreditJoin(0, { f1040: {} });
  assertForm3800FinalCreditJoin(0, {
    schedule3: { line6a_total: 0, line8_total: 0 },
    f1040: { line20_nonrefundable_credits: 0 },
  });
});

Deno.test("unused Form 3800 credit rejects nonzero final-use lines", () => {
  for (
    const changed of [
      { schedule3: { line6a_total: 1 }, f1040: {} },
      { schedule3: { line8_total: 1 }, f1040: {} },
      { schedule3: {}, f1040: { line20_nonrefundable_credits: 1 } },
    ]
  ) {
    assertThrows(
      () => assertForm3800FinalCreditJoin(0, changed),
      Error,
      "do not reconcile",
    );
  }
});

Deno.test("used Form 3800 credit still needs each explicit final-use line", () => {
  for (
    const changed of [
      {
        schedule3: { line8_total: 600 },
        f1040: { line20_nonrefundable_credits: 600 },
      },
      {
        schedule3: { line6a_total: 600 },
        f1040: { line20_nonrefundable_credits: 600 },
      },
      { schedule3: { line6a_total: 600, line8_total: 600 }, f1040: {} },
    ]
  ) {
    assertThrows(
      () => assertForm3800FinalCreditJoin(600, changed),
      Error,
      "needs explicit Schedule 3 lines 6a/8",
    );
  }
});
