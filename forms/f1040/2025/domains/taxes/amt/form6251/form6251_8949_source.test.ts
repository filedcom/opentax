import { test } from "bun:test";
import { assertThrows } from "@std/assert";
import { assertForm6251Form8949Source } from "./form6251_8949_source.ts";

const basis = {
  source_transaction_id: "sale-1",
  part: "D",
  proceeds: 5_000,
  regular_basis: 2_000,
  amt_basis: 2_500,
  regular_gain: 3_000,
  amt_gain: 2_500,
};

const transaction = {
  source_transaction_id: "sale-1",
  part: "D",
  description: "Shares",
  date_acquired: "2022-01-10",
  date_sold: "2025-06-20",
  proceeds: 5_000,
  cost_basis: 2_000,
  amt_cost_basis: 2_500,
};

test("Form 6251 line 2k replays exact Form 8949 source rows", () => {
  const fields = {
    line2k_8949_basis_dispositions: basis,
    line2k_disposition: -500,
  };
  const pending = { f8949: { f8949s: [transaction] } };
  assertForm6251Form8949Source(fields, pending, 2025);
  for (
    const altered of [
      { ...transaction, amt_cost_basis: 2_400 },
      { ...transaction, adjustment_codes: "B" },
      { ...transaction, source_transaction_id: "other-sale" },
    ]
  ) {
    assertThrows(
      () =>
        assertForm6251Form8949Source(fields, {
          f8949: { f8949s: [altered] },
        }, 2025),
      Error,
      "retained, unadjusted Form 8949 source",
    );
  }
  assertThrows(
    () =>
      assertForm6251Form8949Source(fields, {
        f8949: {
          f8949s: [transaction, {
            ...transaction,
            source_transaction_id: "sale-2",
          }],
        },
      }, 2025),
    Error,
    "retained, unadjusted Form 8949 source",
  );
  assertThrows(
    () => assertForm6251Form8949Source(fields, undefined, 2025),
    Error,
    "retained, unadjusted Form 8949 source",
  );
  assertThrows(
    () => assertForm6251Form8949Source({ line2k_disposition: 500 }, pending, 2025),
    Error,
    "needs retained Form 8949",
  );
  assertThrows(
    () => assertForm6251Form8949Source({}, pending, 2025),
    Error,
    "needs retained Form 8949",
  );
  assertThrows(
    () =>
      assertForm6251Form8949Source({
        ...fields,
        line2k_disposition: -499,
      }, pending, 2025),
    Error,
    "retained, unadjusted Form 8949 source",
  );
});

test("Form 6251 line 2k holding period follows the return's year", () => {
  const fields = {
    line2k_8949_basis_dispositions: basis,
    line2k_disposition: -500,
  };
  const sold2026 = { ...transaction, date_sold: "2026-06-20" };
  assertForm6251Form8949Source(fields, { f8949: { f8949s: [sold2026] } }, 2026);
  assertThrows(
    () =>
      assertForm6251Form8949Source(fields, {
        f8949: { f8949s: [transaction] },
      }, 2026),
    Error,
    "tax-year holding period",
  );
});
