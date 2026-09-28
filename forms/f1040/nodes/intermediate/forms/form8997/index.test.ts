import { assertThrows } from "@std/assert";
import { form8997 } from "./index.ts";

Deno.test("legacy form8997 cannot report asserted QOF inclusion as Form 2439 gain", () => {
  assertThrows(
    () =>
      form8997.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          investments: [{
            qof_ein: "12-3456789",
            deferred_gain: 10_000,
            investment_date: "2020-01-15",
            inclusion_amount: 5_000,
          }],
        },
      ),
    Error,
    "Legacy form8997 investment input is unsupported",
  );
});

Deno.test("legacy form8997 cannot silently omit a holding-only annual attachment", () => {
  assertThrows(
    () =>
      form8997.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          investments: [{
            qof_ein: "12-3456789",
            deferred_gain: 10_000,
            investment_date: "2020-01-15",
          }],
        },
      ),
    Error,
    "Legacy form8997 investment input is unsupported",
  );
});
