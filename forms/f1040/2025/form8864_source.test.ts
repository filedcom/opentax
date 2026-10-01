import { assertEquals, assertThrows } from "@std/assert";
import {
  directAgriBiodieselPending,
  directAgriBiodieselSource,
} from "../nodes/inputs/f8864/fixture.ts";
import { reconcileForm8864DirectProducer } from "./form8864_source.ts";

Deno.test("Form 8864 direct producer joins Schedule C and its line 9 income", () => {
  assertEquals(
    reconcileForm8864DirectProducer(
      directAgriBiodieselSource,
      directAgriBiodieselPending,
    ).lines.line9,
    500,
  );
});

Deno.test("Form 8864 refuses mismatched producer, EIN and income inclusion", () => {
  const business = directAgriBiodieselPending.schedule_c.schedule_cs[0];
  assertThrows(
    () =>
      reconcileForm8864DirectProducer(
        directAgriBiodieselSource,
        {
          ...directAgriBiodieselPending,
          f8864: {
            ...directAgriBiodieselSource,
            producer_ein: "111111111",
          },
        },
      ),
    Error,
    "differs from the prepared return",
  );
  assertThrows(
    () =>
      reconcileForm8864DirectProducer(
        directAgriBiodieselSource,
        {
          ...directAgriBiodieselPending,
          schedule_c: {
            schedule_cs: [{
              ...business,
              line_d_ein: "111111111",
            }],
          },
        },
      ),
    Error,
    "same EIN",
  );
  assertThrows(
    () =>
      reconcileForm8864DirectProducer(
        directAgriBiodieselSource,
        {
          ...directAgriBiodieselPending,
          schedule_c: {
            schedule_cs: [{
              ...business,
              line_6_other_income: 499,
            }],
          },
        },
      ),
    Error,
    "line 6 other-income inclusion",
  );
});
