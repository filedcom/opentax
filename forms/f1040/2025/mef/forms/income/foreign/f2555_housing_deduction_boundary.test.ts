import { assertThrows } from "@std/assert";
import { schedule1 as schedule1Node } from "../../../../../nodes/outputs/general/return-assembly/schedule1/index.ts";
import { schedule1 } from "../../general/return-assembly/schedule1/schedule1.ts";
import { schedule1Pdf } from "../../../../pdf/forms/general/return-assembly/schedule1/schedule1.ts";

Deno.test("Form 2555 housing deduction cannot be misfiled on Schedule 1 line 8d", () => {
  assertThrows(
    () =>
      schedule1Node.compute(
        { taxYear: 2025, formType: "f1040" },
        { line8d_foreign_housing_deduction: 1_000 } as never,
      ),
  );
  assertThrows(
    () => schedule1.build({ line8d_foreign_housing_deduction: 1_000 }),
    Error,
    "needs sourced Schedule 1 line 24j",
  );
  assertThrows(
    () => schedule1Pdf.instances!({ line8d_foreign_housing_deduction: 1_000 }),
    Error,
    "needs sourced Schedule 1 line 24j",
  );
});
