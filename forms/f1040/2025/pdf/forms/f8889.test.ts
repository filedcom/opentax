import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema as form8889InputSchema,
} from "../../../nodes/intermediate/forms/form8889/index.ts";
import { form8889Pdf } from "./f8889.ts";
import { schedule1Pdf } from "./schedule1.ts";

Deno.test("2025 Form 8889 PDF projects every modeled line to its AcroForm field", () => {
  const expected = new Map<string, string>([
    ["beneficiary_name", "f1_1[0]"],
    ["beneficiary_ssn", "f1_2[0]"],
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

Deno.test("Form 8889 PDF retains separate rollover and age-65 exception print lines", () => {
  const [owner] = form8889Pdf.instances?.({
    forms: [{
      owner: "primary",
      beneficiary_name: "Alex Taxpayer",
      beneficiary_ssn: "123456789",
      print_line14a_distributions: 2000,
      print_line14b_excluded_distributions: 1000,
      print_line14c: 1000,
      print_line15_qualified: 100,
      print_line16_taxable: 900,
      print_line17a_exception: true,
      print_line17b_penalty: 80,
    }],
  }) ?? [];
  assertEquals(owner?.print_line14b_excluded_distributions, 1000);
  assertEquals(owner?.print_line16_taxable, 900);
  assertEquals(owner?.print_line17a_exception, true);
  assertEquals(owner?.print_line17b_penalty, 80);
  for (
    const [key, expected] of [
      ["print_line14b_excluded_distributions", "f1_16[0]"],
      ["print_line16_taxable", "f1_19[0]"],
      ["print_line17a_exception", "c1_2[0]"],
      ["print_line17b_penalty", "f1_20[0]"],
    ]
  ) {
    assertEquals(
      form8889Pdf.fields.find((field) => field.domainKey === key)?.pdfField
        .split(".").at(-1),
      expected,
    );
  }
});

Deno.test("Form 8889 PDF creates one correctly identified page per HSA beneficiary", () => {
  const source = {
    beneficiary_identity: { owner: "T" as const, name: "Alex Taxpayer", ssn: "123456789" },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    allocated_family_limit: 4_275,
    family_allocation_source_reference: "2025 HSA allocation agreement",
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    taxpayer_hsa_contributions: 4_000,
    spouse_hsa: {
      beneficiary_identity: { owner: "S" as const, name: "Sam Taxpayer", ssn: "987654321" },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
      allocated_family_limit: 4_275,
      family_allocation_source_reference: "2025 HSA allocation agreement",
      age_55_or_older: false,
      last_month_rule_elected: false,
      married_at_year_end: true,
      spouse_has_separate_hsa: true,
      taxpayer_hsa_contributions: 2_000,
    },
  };
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse(source),
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  const filer: FilerIdentity = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    filingStatus: FilingStatus.MarriedFilingJointly,
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
    spouse: { ssn: "987654321", firstName: "Sam", lastName: "Taxpayer", nameControl: "TAXP" },
  };
  const instances = form8889Pdf.instances?.({ forms }, filer, {
    form8889: { ...source, forms },
    schedule1: { line13_hsa_deduction: 6_000, line26_total_adjustments: 6_000 },
    schedule2: {},
    f1040: { line10_adjustments: 6_000 },
  }) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances.map((instance) => instance.beneficiary_ssn), [
    "123456789",
    "987654321",
  ]);
  assertEquals(form8889Pdf.filerFields, undefined);
  assertEquals(
    form8889Pdf.fields.find((entry) => entry.domainKey === "beneficiary_ssn")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_2[0]",
  );
});

Deno.test("Form 8889 PDF accepts one sourced spouse account and rejects changed lines", () => {
  const source = {
    beneficiary_identity: {
      owner: "S" as const,
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: false,
    taxpayer_hsa_contributions: 2_000,
  };
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse(source),
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  const allPending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 2_000,
      line26_total_adjustments: 2_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 2_000 },
  };
  const filer: FilerIdentity = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    filingStatus: FilingStatus.MarriedFilingJointly,
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
    spouse: {
      ssn: "987654321",
      firstName: "Sam",
      lastName: "Taxpayer",
      nameControl: "TAXP",
    },
  };
  const instances = form8889Pdf.instances?.({ forms }, filer, allPending);
  assertEquals(instances?.length, 1);
  assertEquals(instances?.[0]?.owner, "spouse");
  assertEquals(instances?.[0]?.beneficiary_ssn, "987654321");
  assertThrows(
    () =>
      form8889Pdf.instances?.(
        {
          forms: [{ ...forms[0], print_line13_deduction: 1_999 }],
        },
        filer,
        allPending,
      ),
    Error,
    "printed lines differ",
  );
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
  }) ?? [];
  assertEquals(combined.line8z_other, 150);
  assertEquals(
    combined.line8z_description,
    "Form 8814, HSA excess earnings",
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
