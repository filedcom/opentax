import { test } from "bun:test";
import { assertThrows } from "@std/assert";
import { irs1040Pdf } from "../../general/return-assembly/f1040.ts";

test("Form 1040 PDF rejects positive line 13b without a reconciled Schedule 1-A page", () => {
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({
        line13b_additional_deductions: 6_000,
      }, {}),
    Error,
    "needs a reconciled Schedule 1-A page",
  );
});
