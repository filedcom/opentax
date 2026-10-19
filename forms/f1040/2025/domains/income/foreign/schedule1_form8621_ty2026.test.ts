import { test } from "bun:test";
import { assertThrows } from "@std/assert";
import { assertSchedule1Form8621Source } from "./schedule1-form8621-source.ts";
import { f8621, itemSchema, PficRegime } from "../../../../nodes/inputs/income/foreign/f8621/index.ts";

const ty2026 = { taxYear: 2026, formType: "f1040" } as const;

test("TY2026 Schedule 1 Form 8621 source replays under the return's year", () => {
  for (
    const item of [
      { regime: PficRegime.QEF, qef_ordinary_income: 2_000, qef_capital_gain: 0 },
      { regime: PficRegime.MTM, mtm_adjusted_basis_at_year_end: 9_000 },
    ]
  ) {
    const result = f8621.compute(ty2026, {
      f8621s: [itemSchema.parse({
        company_name: "Offshore Fund Ltd",
        company_ein_or_ref: "FUND001",
        country_of_incorporation: "Ireland",
        shares_owned: 100,
        fmv_at_year_end: 10_000,
        ...item,
      })],
    });
    const pending = {
      form8621: result.outputs.find((o) => o.nodeType === "form8621")?.fields,
      schedule1: result.outputs.find((o) => o.nodeType === "schedule1")
        ?.fields,
    };
    assertSchedule1Form8621Source(pending, ty2026);
    assertThrows(() =>
      assertSchedule1Form8621Source({ ...pending, schedule1: {} }, ty2026)
    );
  }
});
