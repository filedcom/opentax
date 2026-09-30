import { assertThrows } from "@std/assert";
import { assertEicSource } from "./eic-source.ts";

Deno.test("export rejects a positive EIC attached to a filed Form 2555", () => {
  assertThrows(
    () => assertEicSource("single", 500, true, {
      eitc: { credit_amount: 500, qualifying_children: 0 },
      form2555: { filing_details: { foreign_wages: 1 } },
    }),
    Error,
    "cannot accompany a filed Form 2555",
  );
});

Deno.test("export rejects a positive EIC without its matching calculation", () => {
  assertThrows(
    () => assertEicSource("single", 500, true, {}),
    Error,
    "needs its matching calculation source",
  );
});

Deno.test("export rejects a positive EIC without reviewed prior history", () => {
  assertThrows(
    () => assertEicSource("single", 500, true, {
      general: { filing_status: "single" },
      eitc: { credit_amount: 500, qualifying_children: 0 },
    }),
    Error,
    "reviewed prior-disallowance history",
  );
});
