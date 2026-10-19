import { test } from "bun:test";
import { assertThrows } from "@std/assert";
import { assertForm982AbsentSource, projectQpriForm982 } from "./form982-qpri.ts";

const ty2026 = { taxYear: 2026, formType: "f1040" } as const;
const taxable = {
  f1099c: {
    f1099cs: [{
      creditor_name: "Lender",
      box2_cod_amount: 4_000,
      routing: "taxable" as const,
    }],
  },
};

test("TY2026 Form 982 QPRI is refused without a pre-2026 written arrangement", () => {
  assertThrows(
    () => projectQpriForm982({}, taxable, ty2026),
    Error,
    "Form 982 QPRI for TY2026 needs a written arrangement entered into before 2026",
  );
});

test("TY2026 absent Form 982 replays its 1099-C source under the return's year", () => {
  assertForm982AbsentSource(undefined, ty2026);
  assertForm982AbsentSource(taxable, ty2026);
});
