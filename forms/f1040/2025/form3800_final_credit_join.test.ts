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
  assertThrows(() => assertForm3800FinalCreditJoin(601, pending), Error,
    "do not reconcile");
  assertThrows(() => assertForm3800FinalCreditJoin(600, {
    ...pending,
    schedule3: { line6a_total: 600, line8_total: 599 },
  }), Error, "do not reconcile");
  assertThrows(() => assertForm3800FinalCreditJoin(600, {
    ...pending,
    f1040: { line20_nonrefundable_credits: 600 },
  }), Error, "do not reconcile");
  assertThrows(() => assertForm3800FinalCreditJoin(600, {
    ...pending,
    f1040: {},
  }), Error);
});
