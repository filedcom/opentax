import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8396 } from "../../../../nodes/intermediate/forms/form8396/calculation.ts";
import { reissuedMccSource } from "../../../../nodes/intermediate/forms/form8396/reissued_mcc.fixture.ts";
import { form8396Pdf } from "./f8396.ts";

const fields = {
  ...reissuedMccSource,
  ...calculateForm8396(reissuedMccSource, 1_000),
  credit_limit_worksheet_line1: 1_000,
  credit_limit_worksheet_line2: 0,
};

Deno.test("Form 8396 PDF projects the ceiling-limited reissued certificate", () => {
  const projected = form8396Pdf.projectFields?.(fields, {});
  assertEquals(projected?.line2_percent, "18");
  assertEquals(projected?.line3, 800);
  assertEquals(projected?.line9, 800);
});

Deno.test("Form 8396 PDF rejects a reissued credit above its source ceiling", () => {
  assertThrows(
    () => form8396Pdf.projectFields?.({ ...fields, line3: 900 }, {}),
    Error,
    "line3 differs from its source calculation",
  );
  assertThrows(
    () => form8396Pdf.projectFields?.({ ...fields, line2: 0.20 }, {}),
    Error,
    "line2 differs from its source calculation",
  );
});
