import { assertThrows } from "@std/assert";
import { scheduleDPdf } from "./schedule_d.ts";

Deno.test("Schedule D PDF does not omit unsupported section 1202 source facts", () => {
  assertThrows(
    () => scheduleDPdf.projectFields?.({ box2c_qsbs: 500 }, {}),
    Error,
    "Form 6251 line 2h preference",
  );
  assertThrows(
    () => scheduleDPdf.projectFields?.({
      transaction: { adjustment_codes: "Q", gain_loss: 500 },
    }, {}),
    Error,
    "Form 6251 line 2h preference",
  );
});
