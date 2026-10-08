import { assertEquals, assertThrows } from "@std/assert";
import { form8978_reporting_year } from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" };

function compute(input: Parameters<typeof form8978_reporting_year.compute>[1]) {
  return form8978_reporting_year.compute(ctx, input);
}

Deno.test("Form 8978 negative route caps Schedule 3 line 6l at line 18", () => {
  const result = compute({
    regular_tax: 1_000,
    schedule2_part1_tax: 100,
    negative_form8978_line14: 900,
  });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "schedule3")
      ?.fields.line6l_form8978_credit,
    900,
  );
  assertEquals(
    result.outputs.find((output) =>
      output.nodeType === "form8978_reporting_year"
    )
      ?.fields.schedule2_line17z_reduction,
    0,
  );
});

Deno.test("Form 8978 negative route offsets only eligible Chapter 1 Part II tax", () => {
  const result = compute({
    regular_tax: 1_000,
    schedule2_part2_tax: 400,
    schedule2_chapter1_part2_tax: 250,
    negative_form8978_line14: 1_500,
  });
  const worksheet = result.outputs.find((output) =>
    output.nodeType === "form8978_reporting_year"
  )?.fields;
  assertEquals(worksheet?.schedule3_line6l, 1_000);
  assertEquals(worksheet?.schedule2_line17z_reduction, 250);
  assertEquals(worksheet?.schedule2_line21, 150);
  assertEquals(worksheet?.remaining_unapplied, 250);
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f1040")
      ?.fields.form8978_schedule2_line17z_reduction,
    250,
  );
});

Deno.test("Form 8978 negative route does not offset non-Chapter-1 Part II tax", () => {
  const result = compute({
    regular_tax: 1_000,
    schedule2_part2_tax: 300,
    schedule2_chapter1_part2_tax: 0,
    negative_form8978_line14: 1_500,
  });
  assertEquals(
    result.outputs.find((output) =>
      output.nodeType === "form8978_reporting_year"
    )
      ?.fields.schedule2_line17z_reduction,
    0,
  );
  assertEquals(
    result.outputs.some((output) => output.nodeType === "f1040"),
    false,
  );
});

Deno.test("Form 8978 negative route rejects unclassified taxes before an offset", () => {
  assertThrows(
    () =>
      compute({
        regular_tax: 100,
        schedule2_part2_tax: 200,
        schedule2_unclassified_part2_tax: 200,
        negative_form8978_line14: 500,
      }),
    Error,
    "chapter 1 classification",
  );
});

Deno.test("Form 8978 can use known chapter 1 tax despite unrelated unclassified tax", () => {
  const result = compute({
    regular_tax: 0,
    schedule2_part2_tax: 300,
    schedule2_chapter1_part2_tax: 200,
    schedule2_unclassified_part2_tax: 100,
    negative_form8978_line14: 150,
  });
  const worksheet = result.outputs.find((output) =>
    output.nodeType === "form8978_reporting_year"
  )?.fields;
  assertEquals(worksheet?.schedule2_line17z_reduction, 150);
  assertEquals(worksheet?.schedule2_line21, 150);
  assertEquals(worksheet?.remaining_unapplied, 0);
});
