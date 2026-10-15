import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateForm4137_2026,
  claimInputSchema,
  form4137_2026,
} from "./form4137.ts";
import { syntheticForm4137_2026 } from "./form4137.fixture.ts";
import {
  calculateSchedule1A2026,
  type Schedule1A2026Input,
} from "../nodes/schedule1a.ts";
import {
  scopeReview2026,
  zeroExclusions2026,
} from "../nodes/schedule1a.fixture.ts";

Deno.test("2026 Form 4137 separates income, Medicare tips, SS cap and qualified total tips", () => {
  const input = syntheticForm4137_2026();
  input.w2_tip_sources![0].ss_wages_and_tips = 184_000;
  const result = calculateForm4137_2026(input);
  const form = result.forms[0];
  assertEquals([
    form.unreportedTips,
    form.medicareTips,
    form.ssWageBaseRoom,
    form.ssTips,
  ], [2000, 2000, 500, 500]);
  assertEquals([form.ssTax, form.medicareTax, form.totalTax], [31, 29, 60]);
  assertEquals(result.tip_rows[0].qualified_tips, 20_000);
});
Deno.test("2026 Form 4137 applies the below-$20 exemption per employer/month", () => {
  const input = syntheticForm4137_2026();
  input.forms![0].below_20_tip_months = [{
    employer_index: 1,
    month: 2,
    tips_received: 19,
    tips_reported: 0,
  }];
  const form = calculateForm4137_2026(input).forms[0];
  assertEquals([
    form.unreportedTips,
    form.incidentalTips,
    form.medicareTips,
    form.totalTax,
  ], [2000, 19, 1981, 152]);
  input.forms![0].below_20_tip_months.push(
    input.forms![0].below_20_tip_months[0],
  );
  assertThrows(
    () => calculateForm4137_2026(input),
    Error,
    "duplicate employer/month",
  );
});
Deno.test("2026 Form 4137 uses printed row operands before computing tax", () => {
  const input = syntheticForm4137_2026();
  const row = input.forms![0].employers[0];
  row.tips_received = 22_000.49;
  row.tips_reported = 19_999.51;
  row.qualification_review!.excluded_cash_tips = 2000.49;
  const form = calculateForm4137_2026(input).forms[0];
  assertEquals([
    form.totalTipsReceived,
    form.totalTipsReported,
    form.unreportedTips,
    form.totalTax,
  ], [22_000, 20_000, 2000, 153]);
});
Deno.test("2026 Form 4137 keeps spouse wage bases separate at the same employer", () => {
  const input = syntheticForm4137_2026();
  input.filing_status = FilingStatus.MFJ;
  input.spouse_ssn = "222334444";
  input.w2_tip_sources![0].ss_wages_and_tips = 184_500;
  const spouse = structuredClone(input.forms![0]);
  spouse.recipient = "spouse";
  spouse.employers[0].qualification_review!.employee_ssn = input.spouse_ssn;
  spouse.employers[0].qualification_review!.source_document_reference =
    "spouse-w2";
  input.forms!.push(spouse);
  input.w2_tip_sources!.push({
    ...input.w2_tip_sources![0],
    employee_ssn: input.spouse_ssn,
    source_document_reference: "spouse-w2",
    ss_wages_and_tips: 40_000,
  });
  const result = calculateForm4137_2026(input);
  assertEquals(result.forms.map((row) => row.totalTax), [29, 153]);
  assertEquals(result.tip_rows.map((row) => row.employee_ssn), [
    "111223333",
    "222334444",
  ]);
  input.filing_status = FilingStatus.Single;
  assertThrows(
    () => calculateForm4137_2026(input),
    Error,
    "owner does not belong",
  );
});
Deno.test("2026 Form 4137 requires complete W-2 payroll and allocated-tip records", () => {
  const missing = syntheticForm4137_2026();
  missing.forms = undefined;
  assertThrows(
    () => calculateForm4137_2026(missing),
    Error,
    "allocated tips need employer tip records",
  );
  const wages = syntheticForm4137_2026();
  wages.w2_tip_sources![0].ss_wages_and_tips = undefined;
  assertThrows(
    () => calculateForm4137_2026(wages),
    Error,
    "all W-2 social security wages",
  );
  const allocated = syntheticForm4137_2026();
  allocated.w2_tip_sources![0].allocated_tips = 3000;
  assertThrows(
    () => calculateForm4137_2026(allocated),
    Error,
    "without reconciled daily records",
  );
  const railroad = syntheticForm4137_2026();
  railroad.w2_tip_sources![0].rrta_compensation = 10_000;
  assertThrows(() => calculateForm4137_2026(railroad), Error, "RRTA-covered");
});
Deno.test("2026 Form 4137 reconciles the January 12, 2026 and January 11, 2027 reporting deadlines", () => {
  const input = syntheticForm4137_2026();
  const row = input.forms![0].employers[0];
  row.tips_received = 350;
  row.tips_reported = 300;
  row.qualification_review!.allocations[0].qualified_cash_tips = 350;
  row.qualification_review!.excluded_cash_tips = 0;
  input.forms![0].allocated_tip_records = [{
    employer_index: 1,
    daily_records: [
      {
        date: "2025-12-20",
        cash_charge_tips_received: 100,
        tips_reported_to_employer: 100,
        report_date: "2026-01-12",
        evidence_type: "daily_tip_diary",
        evidence_reference: "prior-dec",
      },
      {
        date: "2026-12-20",
        cash_charge_tips_received: 150,
        tips_reported_to_employer: 100,
        report_date: "2027-01-11",
        evidence_type: "daily_tip_diary",
        evidence_reference: "current-dec",
      },
      {
        date: "2026-12-21",
        cash_charge_tips_received: 200,
        tips_reported_to_employer: 200,
        report_date: "2027-01-12",
        evidence_type: "daily_tip_diary",
        evidence_reference: "late-dec",
      },
    ],
  }];
  assertEquals(calculateForm4137_2026(input).forms[0].unreportedTips, 50);
  input.forms![0].allocated_tip_records[0].daily_records[1].report_date =
    "2027-01-12";
  assertThrows(
    () => calculateForm4137_2026(input),
    Error,
    "daily tip records disagree",
  );
  input.forms![0].allocated_tip_records[0].daily_records[1].date = "2024-12-20";
  assertThrows(
    () => calculateForm4137_2026(input),
    Error,
    "December 2025 or 2026",
  );
});
Deno.test("2026 Form 4137 validates qualification against all tips and source identity", () => {
  for (
    const change of [
      "amount",
      "owner",
      "source",
      "missing",
      "duplicate",
    ] as const
  ) {
    const input = syntheticForm4137_2026();
    const row = input.forms![0].employers[0];
    if (change === "amount") {
      row.qualification_review!.allocations[0].qualified_cash_tips = 2000;
    }
    if (change === "owner") {
      row.qualification_review!.employee_ssn = "999887777";
    }
    if (change === "source") {
      row.qualification_review!.source_document_reference = "unrelated";
    }
    if (change === "missing") row.qualification_review = undefined;
    if (change === "duplicate") {
      input.w2_tip_sources!.push(input.w2_tip_sources![0]);
    }
    assertThrows(() => calculateForm4137_2026(input));
  }
  assertThrows(() =>
    claimInputSchema.parse({
      tax_year: 2026,
      forms: syntheticForm4137_2026().forms,
      totalTax: 0,
    })
  );
});
Deno.test("2026 Form 4137 government coverage changes SS tax but preserves Medicare and income", () => {
  const input = syntheticForm4137_2026();
  input.forms![0].government_employee_review = {
    tips_not_covered_by_social_security: 2000,
    coverage_record_reference: "government-payroll-coverage",
  };
  const form = calculateForm4137_2026(input).forms[0];
  assertEquals([
    form.unreportedTips,
    form.ssTips,
    form.medicareTips,
    form.totalTax,
  ], [2000, 0, 2000, 29]);
});
function deductionInput(): Schedule1A2026Input {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    taxpayer_has_valid_ssn: true,
    taxpayer_ssn_review_complete: true,
    taxpayer_age_65_or_older: false,
    magi: 152_001,
    source_scope_review: { ...scopeReview2026, has_form4137_tips: true },
    part1_zero_exclusions_review: zeroExclusions2026,
    form4137_tips_2026:
      calculateForm4137_2026(syntheticForm4137_2026()).tip_rows,
    w2_2026_sources: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      employer_name: "Cafe",
      source_document_reference: "issued-w2",
      box1_wages: 150_001,
      statutory_employee: false,
      cash_tips: 20_000,
      qualified_overtime: 0,
      occupation_codes: ["102", "000"],
    }],
    employee_tip_reviews: [{
      ...syntheticForm4137_2026().forms![0].employers[0].qualification_review!,
      allocations: [{
        occupation_code: "102",
        qualified_cash_tips: 18_000,
        occupation_and_tip_records_reference: "w2-tip-log",
      }],
    }],
  };
}
Deno.test("2026 Schedule 1-A uses the larger qualified tip amount rather than adding both", () => {
  const input = deductionInput();
  const result = calculateSchedule1A2026(input);
  assertEquals([
    result.employee_rows[0].qualified_w2_tips,
    result.employee_rows[0].form4137_tips,
    result.lines.line5,
    result.lines.line15,
  ], [18_000, 20_000, 20_000, 19_800]);
  input.form4137_tips_2026![0].qualified_tips = 15_000;
  assertEquals(calculateSchedule1A2026(input).lines.line5, 18_000);
});
Deno.test("2026 Schedule 1-A retains Form 4137 tips even without W-2 TP", () => {
  const input = deductionInput();
  input.w2_2026_sources![0].cash_tips = 0;
  input.employee_tip_reviews = [];
  const row = calculateSchedule1A2026(input).employee_rows[0];
  assertEquals([row.qualified_w2_tips, row.form4137_tips, row.line4_tips], [
    0,
    20_000,
    20_000,
  ]);
  input.filing_status = FilingStatus.MFS;
  assertEquals(calculateSchedule1A2026(input).lines.line44, 0);
});
Deno.test("2026 Schedule 1-A rejects missing, duplicate and mismatched Form 4137 handoffs", () => {
  for (const change of ["missing", "scope", "owner", "duplicate"] as const) {
    const input = deductionInput();
    if (change === "missing") input.form4137_tips_2026 = [];
    if (change === "scope") {
      input.source_scope_review!.has_form4137_tips = false;
    }
    if (change === "owner") {
      input.form4137_tips_2026![0].employee_ssn = "999887777";
    }
    if (change === "duplicate") {
      input.form4137_tips_2026!.push(input.form4137_tips_2026![0]);
    }
    assertThrows(() => calculateSchedule1A2026(input));
  }
});
Deno.test("2026 Form 4137 routes income once and keeps payroll, credit and SE handoffs distinct", () => {
  const outputs = form4137_2026.compute(
    { taxYear: 2026, formType: "f1040" },
    syntheticForm4137_2026(),
  ).outputs;
  const fields = (node: string) =>
    outputs.find((o) => o.nodeType === node)!.fields;
  assertEquals(fields("f1040"), { line1c_unreported_tips: 2000 });
  assertEquals(fields("agi_aggregator"), { line1c_unreported_tips: 2000 });
  assertEquals(fields("schedule2"), { line16a_form4137_tip_tax: 153 });
  assertEquals(fields("form8959"), {
    form4137_medicare_sources_2026: [{
      employee_ssn: "111223333",
      source_reference: "form4137:2026:taxpayer",
      amount: 2000,
    }],
  });
  assertEquals(fields("eitc"), { earned_income: 2000 });
  assertEquals(fields("f8812"), { auto_earned_income: 2000 });
  assertEquals(fields("schedule_se"), {
    form4137_sources_2026: [{
      employee_ssn: "111223333",
      line10_ss_tips: 2000,
    }],
  });
});

Deno.test("2026 Schedule 1-A compares spouses separately even at the same employer", () => {
  const input = deductionInput();
  input.filing_status = FilingStatus.MFJ;
  input.spouse_ssn = "222334444";
  input.spouse_has_valid_ssn = true;
  input.spouse_ssn_review_complete = true;
  input.spouse_age_65_or_older = false;
  input.w2_2026_sources!.push({
    ...input.w2_2026_sources![0],
    employee_ssn: input.spouse_ssn,
    source_document_reference: "spouse-w2",
    cash_tips: 5000,
  });
  input.employee_tip_reviews!.push({
    ...input.employee_tip_reviews![0],
    employee_ssn: input.spouse_ssn,
    source_document_reference: "spouse-w2",
    allocations: [{
      occupation_code: "102",
      qualified_cash_tips: 5000,
      occupation_and_tip_records_reference: "spouse-record",
    }],
    excluded_cash_tips: 0,
  });
  input.form4137_tips_2026!.push({
    ...input.form4137_tips_2026![0],
    employee_ssn: input.spouse_ssn,
    source_document_reference: "spouse-w2",
    qualified_tips: 2000,
    total_received: 2000,
  });
  const result = calculateSchedule1A2026(input);
  assertEquals(result.employee_rows.map((row) => row.line4_tips), [
    20_000,
    5000,
  ]);
  assertEquals(result.lines.line15, 25_000);
});
