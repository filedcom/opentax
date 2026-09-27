import { assertEquals } from "@std/assert";
import { form8889Pdf } from "./f8889.ts";
import { schedule1Pdf } from "./schedule1.ts";

Deno.test("2025 Form 8889 PDF projects every modeled line to its AcroForm field", () => {
  const expected = new Map<string, string>([
    ["print_line2_taxpayer_contributions", "f1_3[0]"],
    ["print_line3_limit", "f1_4[0]"],
    ["print_line4_archer", "f1_5[0]"],
    ["print_line5", "f1_6[0]"],
    ["print_line6", "f1_7[0]"],
    ["print_line7_catchup", "f1_8[0]"],
    ["print_line8", "f1_9[0]"],
    ["print_line9_employer", "f1_10[0]"],
    ["print_line10", "f1_11[0]"],
    ["print_line11", "f1_12[0]"],
    ["print_line12", "f1_13[0]"],
    ["print_line13_deduction", "f1_14[0]"],
    ["print_line14a_distributions", "f1_15[0]"],
    ["print_line14b_excluded_distributions", "f1_16[0]"],
    ["print_line14c", "f1_17[0]"],
    ["print_line15_qualified", "f1_18[0]"],
    ["print_line16_taxable", "f1_19[0]"],
    ["print_line17a_exception", "c1_2[0]"],
    ["print_line17b_penalty", "f1_20[0]"],
    ["print_line18", "f1_21[0]"],
    ["print_line19", "f1_22[0]"],
    ["print_line20", "f1_23[0]"],
    ["print_line21", "f1_24[0]"],
  ]);
  const coverage = form8889Pdf.fields.filter((entry) =>
    entry.domainKey === "print_line1_coverage"
  );
  assertEquals(coverage.length, 2);
  assertEquals(coverage.map((entry) => entry.pdfField.split(".").at(-1)), [
    "c1_1[0]",
    "c1_1[1]",
  ]);
  const nonCoverage = form8889Pdf.fields.filter((entry) =>
    entry.domainKey !== "print_line1_coverage"
  );
  const actual = new Map(nonCoverage.map((entry) => [
    entry.domainKey,
    entry.pdfField.split(".").at(-1)!,
  ]));
  assertEquals(actual.size, nonCoverage.length);
  for (const [key, field] of expected) assertEquals(actual.get(key), field);
  assertEquals(actual.size, expected.size);
});

Deno.test("Schedule 1 PDF identifies HSA excess-withdrawal earnings on line 8z", () => {
  const [hsaOnly] = schedule1Pdf.instances?.({
    line8z_hsa_excess_earnings: 100,
  }) ?? [];
  assertEquals(hsaOnly.line8z_other, 100);
  assertEquals(hsaOnly.line8z_description, "HSA excess earnings");

  const [combined] = schedule1Pdf.instances?.({
    line8z_hsa_excess_earnings: 100,
    line8z_form8814: 50,
    line8z_other: 25,
  }) ?? [];
  assertEquals(combined.line8z_other, 175);
  assertEquals(
    combined.line8z_description,
    "Form 8814, HSA excess earnings, other income",
  );
});

Deno.test("Schedule 1 PDF identifies employer HSA excess on line 8z", () => {
  const [projected] = schedule1Pdf.instances?.({
    line8z_hsa_excess_employer: 700,
    line8z_hsa_excess_earnings: 100,
  }) ?? [];
  assertEquals(projected.line8z_other, 800);
  assertEquals(
    projected.line8z_description,
    "HSA excess earnings, HSA excess employer contributions",
  );
});
