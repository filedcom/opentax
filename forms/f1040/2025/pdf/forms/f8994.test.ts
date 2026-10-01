import { assertEquals, assertThrows } from "@std/assert";
import {
  form8994DirectEmployer,
  form8994MatchedPending,
} from "../../../nodes/inputs/f8994/fixture.ts";
import { form8994Pdf } from "./f8994.ts";

Deno.test("Form 8994 PDF maps official yes boxes and the direct credit", () => {
  const fields = Object.fromEntries(
    form8994Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(fields.line_a_yes, "topmostSubform[0].Page1[0].c1_1[0]");
  assertEquals(fields.line_d_yes, "topmostSubform[0].Page1[0].c1_4[0]");
  assertEquals(fields.line1, "topmostSubform[0].Page1[0].f1_03[0]");
  assertEquals(fields.line3, "topmostSubform[0].Page1[0].f1_05[0]");
  const projected = form8994Pdf.projectFields?.(
    form8994DirectEmployer,
    form8994MatchedPending,
  );
  assertEquals(projected?.line_a_yes, true);
  assertEquals(projected?.line_d_yes, true);
  assertEquals(projected?.line1, 1_250);
  assertEquals(projected?.line2, undefined);
  assertEquals(projected?.line3, 1_250);
});

Deno.test("Form 8994 PDF rejects a mismatched Schedule C wage reduction", () => {
  const business = form8994MatchedPending.schedule_c.schedule_cs[0];
  assertThrows(
    () =>
      form8994Pdf.projectFields?.(form8994DirectEmployer, {
        ...form8994MatchedPending,
        schedule_c: {
          schedule_cs: [{
            ...business,
            line_26_other_employment_credits: 0,
          }],
        },
      }),
    Error,
    "deduction reduction",
  );
});
