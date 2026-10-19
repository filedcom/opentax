import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { amendment_request } from "./index.ts";

const request = (affected_tax_year: number) => ({
  requests: [{
    affected_tax_year,
    correction_summary: "Reviewed correction",
    request_reference: `amend-${affected_tax_year}`,
    prior_return_reference: `accepted-${affected_tax_year}-return`,
    request_confirmed: true as const,
  }],
});

test("a TY2026 return keeps amendment intent for 2026 and earlier years", () => {
  const ctx = { taxYear: 2026, formType: "f1040" };
  assertEquals(amendment_request.compute(ctx, request(2025)).outputs, []);
  assertEquals(amendment_request.compute(ctx, request(2026)).outputs, []);
});

test("an amendment cannot affect a year after the return year", () => {
  assertThrows(
    () =>
      amendment_request.compute(
        { taxYear: 2025, formType: "f1040" },
        request(2026),
      ),
    Error,
    "Amendment requests must affect tax year 2025 or earlier",
  );
});
