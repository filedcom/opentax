import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { calculateForm8959_2026, form8959_2026 } from "./form8959.ts";
import { syntheticMedicare2026 } from "./form8959.fixture.ts";
import { schedule2_2026 } from "./schedule2.ts";
const context = { formType: "f1040", taxYear: 2026 };
const owned = (amount: number, source_reference = "schedule-se") => ({
  employee_ssn: "111223333",
  source_reference,
  amount,
});
Deno.test("2026 Medicare separates wage/RRTA tax from self-employment tax and withholding", () => {
  const input = syntheticMedicare2026();
  input.w2_medicare_sources_2026!.push({
    ...input.w2_medicare_sources_2026![0],
    employer_ein: "987654321",
    source_document_reference: "w2-rrta",
    box5_medicare_wages: 0,
    box6_medicare_withheld: 0,
    rrta_compensation: 300_000,
    rrta_additional_withheld: 900,
  });
  input.schedule_se_medicare_sources_2026 = [owned(50_000)];
  const result = calculateForm8959_2026(input);
  assertEquals([
    result.lines.line7,
    result.lines.line11,
    result.lines.line12,
    result.lines.line18,
  ], [450, 900, 1350, 450]);
  assertEquals([
    result.lines.line19,
    result.lines.line21,
    result.lines.line22,
    result.lines.line23,
    result.lines.line24,
  ], [4075, 3625, 450, 900, 1350]);
  const output = form8959_2026.compute(context, input).outputs;
  const taxes = output.find((o) => o.nodeType === "schedule2")!.fields;
  assertEquals(taxes, {
    line17b_medicare_wage_tax: 1350,
    line11_medicare_self_employment_tax: 450,
  });
  const settled =
    schedule2_2026.compute(context, taxes).outputs.find((o) =>
      o.nodeType === "f1040"
    )!.fields;
  assertEquals(settled, { line23_other_taxes: 1800, schedule2_line20: 1350 });
  assertEquals(output.find((o) => o.nodeType === "f1040")!.fields, {
    line25c_other_withheld: 1350,
  });
});
Deno.test("2026 Medicare uses filing-status thresholds and exact half-dollar rounding", () => {
  for (
    const [status, threshold] of [
      [FilingStatus.Single, 200_000],
      [FilingStatus.HOH, 200_000],
      [FilingStatus.QSS, 200_000],
      [FilingStatus.MFS, 125_000],
      [FilingStatus.MFJ, 250_000],
    ] as const
  ) {
    const input = syntheticMedicare2026();
    input.filing_status = status;
    if (status === FilingStatus.MFJ) input.spouse_ssn = "222334444";
    input.w2_medicare_sources_2026![0].box5_medicare_wages = threshold +
      103_500;
    assertEquals(calculateForm8959_2026(input).lines.line7, 932);
    input.w2_medicare_sources_2026![0].box5_medicare_wages = threshold;
    assertEquals(calculateForm8959_2026(input).lines.line7, 0);
  }
});
Deno.test("2026 Medicare filing survives zero rounded liability and joint withholding refunds", () => {
  const edge = syntheticMedicare2026();
  edge.w2_medicare_sources_2026![0].box5_medicare_wages = 200_000.01;
  edge.w2_medicare_sources_2026![0].box6_medicare_withheld = 2900;
  assertEquals(calculateForm8959_2026(edge).lines.line12, 0);
  assertEquals(calculateForm8959_2026(edge).file_form8959, true);
  const joint = syntheticMedicare2026();
  joint.filing_status = FilingStatus.MFJ;
  joint.spouse_ssn = "222334444";
  const result = calculateForm8959_2026(joint);
  assertEquals(
    [result.lines.line12, result.lines.line24, result.file_form8959],
    [0, 450, true],
  );
});
Deno.test("2026 Medicare tips and misclassified wages reduce the SE threshold; RRTA does not", () => {
  const input = syntheticMedicare2026();
  input.w2_medicare_sources_2026![0].box5_medicare_wages = 130_000;
  input.w2_medicare_sources_2026![0].box6_medicare_withheld = 1885;
  input.form4137_medicare_sources_2026 = [owned(10_000, "form4137")];
  input.form8919_medicare_sources_2026 = [owned(5000, "form8919")];
  input.schedule_se_medicare_sources_2026 = [owned(145_000)];
  const result = calculateForm8959_2026(input);
  assertEquals([
    result.lines.line4,
    result.lines.line16,
    result.lines.line17,
    result.lines.line18,
  ], [145_000, 55_000, 90_000, 810]);
  input.w2_medicare_sources_2026![0].rrta_compensation = 400_000;
  assertEquals(calculateForm8959_2026(input).lines.line18, 810);
});
Deno.test("2026 Medicare does not net one spouse's SE loss against the other", () => {
  const input = syntheticMedicare2026();
  input.w2_medicare_sources_2026 = [];
  input.filing_status = FilingStatus.MFJ;
  input.spouse_ssn = "222334444";
  input.schedule_se_medicare_sources_2026 = [owned(300_000), {
    employee_ssn: "222334444",
    source_reference: "spouse-se",
    amount: -100_000,
  }];
  const result = calculateForm8959_2026(input);
  assertEquals([result.lines.line13, result.lines.line18], [300_000, 450]);
});
Deno.test("2026 Medicare sums source cents before printing and retains uncollected FICA", () => {
  const input = syntheticMedicare2026();
  const a = input.w2_medicare_sources_2026![0];
  a.box5_medicare_wages = 100_000.25;
  a.box6_medicare_withheld = 1400.25;
  a.uncollected_fica_medicare = 50;
  input.w2_medicare_sources_2026!.push({
    ...a,
    employer_ein: "987654321",
    source_document_reference: "other-w2",
    box5_medicare_wages: 100_000.25,
    box6_medicare_withheld: 1450.25,
    uncollected_fica_medicare: 0,
  });
  const result = calculateForm8959_2026(input);
  assertEquals([
    result.lines.line1,
    result.lines.line19,
    result.lines.line21,
    result.lines.line24,
  ], [200_001, 2901, 2900, 1]);
});
Deno.test("2026 Medicare rejects missing wage boxes, unrelated owners, duplicate copies and old totals", () => {
  const input = syntheticMedicare2026();
  assertThrows(() =>
    calculateForm8959_2026(
      { ...input, w2_medicare_wages: 250_000 } as unknown as typeof input,
    )
  );
  for (
    const change of ["missing", "owner", "duplicate", "spouse", "form"] as const
  ) {
    const item = syntheticMedicare2026();
    if (change === "missing") {
      delete (item.w2_medicare_sources_2026![0] as Partial<
        NonNullable<typeof item.w2_medicare_sources_2026>[number]
      >).box5_medicare_wages;
    }
    if (change === "owner") {
      item.w2_medicare_sources_2026![0].employee_ssn = "999887777";
    }
    if (change === "duplicate") {
      item.w2_medicare_sources_2026!.push(item.w2_medicare_sources_2026![0]);
    }
    if (change === "spouse") item.filing_status = FilingStatus.MFJ;
    if (change === "form") {
      item.form4137_medicare_sources_2026 = [
        owned(100, "tips1"),
        owned(100, "tips2"),
      ];
    }
    assertThrows(() => calculateForm8959_2026(item));
  }
});

Deno.test("2026 Medicare keeps Form 4137 wages and zero withholding reconciliation without W-2 wages", () => {
  const input = syntheticMedicare2026();
  input.w2_medicare_sources_2026 = [];
  input.form4137_medicare_sources_2026 = [owned(250_000, "form4137")];
  const result = calculateForm8959_2026(input);
  assertEquals([
    result.file_form8959,
    result.has_medicare_wages,
    result.has_withholding,
  ], [true, true, true]);
  assertEquals([
    result.lines.line1,
    result.lines.line2,
    result.lines.line12,
    result.lines.line24,
  ], [0, 250_000, 450, 0]);
});
