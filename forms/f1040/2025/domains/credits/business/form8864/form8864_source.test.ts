import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import {
  directAgriBiodieselPending,
  directAgriBiodieselSource,
} from "../../../../../nodes/inputs/credits/business/f8864/fixture.ts";
import {
  reconcileForm8864DirectProducer,
  reconcileForm8864DocumentSource,
} from "./form8864_source.ts";
import { assertForm6251Form8864Source } from "../../../taxes/amt/form6251/form6251_form8864_source.ts";

test("Form 8864 direct producer joins Schedule C and its line 9 income", () => {
  assertEquals(
    reconcileForm8864DirectProducer(
      directAgriBiodieselSource,
      directAgriBiodieselPending, 2025,
    ).lines.line9,
    500,
  );
});

test("Form 8864 refuses mismatched producer, EIN and income inclusion", () => {
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
        }, 2025,
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
        }, 2025,
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
        }, 2025,
      ),
    Error,
    "line 6 other-income inclusion",
  );
});

test("Form 8864 direct credit joins Form 3800 and signed AMT income exclusion", () => {
  assertEquals(
    reconcileForm8864DocumentSource(
      directAgriBiodieselSource,
      directAgriBiodieselPending, 2025,
    ).lines.line11,
    500,
  );
  assertForm6251Form8864Source(
    directAgriBiodieselPending.form6251,
    directAgriBiodieselPending, 2025,
  );
});

test("Form 8864 rejects an altered credit or missing AMT exclusion", () => {
  assertThrows(
    () =>
      reconcileForm8864DocumentSource(directAgriBiodieselSource, {
        ...directAgriBiodieselPending,
        f3800: {
          ...directAgriBiodieselPending.f3800,
          f8864_direct_producer_credit: {
            ...directAgriBiodieselPending.f3800.f8864_direct_producer_credit,
            credit_amount: 499,
          },
        },
      }, 2025),
    Error,
    "source credit differs",
  );
  assertThrows(
    () =>
      reconcileForm8864DocumentSource(directAgriBiodieselSource, {
        ...directAgriBiodieselPending,
        form6251: { line3_form8864_income_exclusion: -499 },
      }, 2025),
    Error,
    "AMT line 3 exclusion",
  );
  assertThrows(
    () =>
      assertForm6251Form8864Source(
        { line3_form8864_income_exclusion: -499 },
        directAgriBiodieselPending, 2025,
      ),
    Error,
    "line 3 differs",
  );
});
