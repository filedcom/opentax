import { assertEquals, assertThrows } from "@std/assert";
import {
  form8994DirectEmployer,
  form8994MatchedPending,
} from "../nodes/inputs/f8994/fixture.ts";
import { reconcileForm8994DirectEmployer } from "./form8994_source.ts";

Deno.test("Form 8994 source joins proprietor, employer EIN and Schedule C wage reduction", () => {
  assertEquals(
    reconcileForm8994DirectEmployer(
      form8994DirectEmployer,
      form8994MatchedPending,
    ).lines.line3,
    1_250,
  );
});

Deno.test("Form 8994 rejects prepared-return and wage deduction tampering", () => {
  const business = form8994MatchedPending.schedule_c.schedule_cs[0];
  assertThrows(
    () =>
      reconcileForm8994DirectEmployer(
        form8994DirectEmployer,
        {
          ...form8994MatchedPending,
          f8994: {
            ...form8994DirectEmployer,
            schedule_c_business_reference: "other-business",
          },
        },
      ),
    Error,
    "differs from the prepared return",
  );
  assertThrows(
    () =>
      reconcileForm8994DirectEmployer(
        form8994DirectEmployer,
        {
          ...form8994MatchedPending,
          schedule_c: {
            schedule_cs: [{ ...business, line_d_ein: "111111111" }],
          },
        },
      ),
    Error,
    "same EIN",
  );
  assertThrows(
    () =>
      reconcileForm8994DirectEmployer(
        form8994DirectEmployer,
        {
          ...form8994MatchedPending,
          schedule_c: {
            schedule_cs: [{
              ...business,
              line_26_other_employment_credits: 1_249,
            }],
          },
        },
        form8994MatchedPending.f3800.form8994_applied_credit,
      ),
    Error,
    "deduction reduction",
  );
});
