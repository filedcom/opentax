import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8889/index.ts";
import { form8889 } from "../../../../mef/forms/adjustments/health/f8889.ts";
import { form8889Pdf } from "../../../../pdf/forms/adjustments/health/f8889.ts";

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

const source = inputSchema.parse({
  beneficiary_identity: {
    owner: "T",
    name: "Alex Taxpayer",
    ssn: "123456789",
  },
  eligible_hdhp_coverage_by_month: Array(12).fill(null),
  age_55_or_older: true,
  married_at_year_end: true,
  spouse_has_separate_hsa: false,
  testing_period_failure: {
    last_month_rule_evidence: {
      contribution_year: 2024,
      eligible_hdhp_coverage_by_month: [
        CoverageType.Family,
        CoverageType.Family,
        ...Array(9).fill(null),
        CoverageType.SelfOnly,
      ],
      age_55_or_older: true,
      married_at_year_end: true,
      spouse_has_separate_hsa: false,
      last_month_rule_elected: true,
      filed_form8889_line2: 4_317,
      filed_form8889_line3: 4_150,
      filed_form8889_line4_archer: 0,
      filed_form8889_line5: 4_150,
      filed_form8889_line6: 4_150,
      filed_form8889_line7: 167,
      filed_form8889_line8: 4_317,
      filed_form8889_line9: 0,
      filed_form8889_line10: 0,
      filed_form8889_line13: 4_317,
    },
    qualified_funding_distribution_amount: 0,
    not_death_or_disability: true,
    prior_year_source: "Reviewed filed 2024 Form 8889 and monthly HDHP facts",
  },
});
const eligibilityTax = 2_337 * 0.1;

function priorAge55Case() {
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")?.fields
    .forms as Extract<
      Parameters<typeof form8889.build>[0],
      { forms: unknown }
    >["forms"];
  const filed = forms[0]!;
  assertEquals(
    outputs.find((row) => row.nodeType === "schedule1")?.fields
      .line8f_hsa_income,
    2_337,
  );
  assertEquals(
    outputs.find((row) => row.nodeType === "schedule2")?.fields
      .line17d_hsa_eligibility_tax,
    eligibilityTax,
  );
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line8f_hsa_income: 2_337,
      line10_total_additional_income: 2_337,
    },
    schedule2: { line17d_hsa_eligibility_tax: eligibilityTax },
    f1040: {
      line8_additional_income: 2_337,
      line23_other_taxes: eligibilityTax,
    },
  };
  return { filed, forms, pending };
}

Deno.test("married age-55 prior mixed coverage recaptures into Form 8889 and the final return", () => {
  const { filed, forms, pending } = priorAge55Case();
  assertEquals(filed.print_line18, 2_337);
  assertEquals(filed.print_line20, 2_337);
  assertEquals(filed.print_line21, eligibilityTax);
  assertStringIncludes(
    form8889.build({ forms }, { filer, pending })[0]!,
    "<HDHPCoverageFailPartialYrAmt>2337</HDHPCoverageFailPartialYrAmt>",
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 1);
});

Deno.test("married age-55 prior mixed coverage rejects altered source, print, and return", () => {
  const { filed, forms, pending } = priorAge55Case();
  const altered = [
    {
      ...pending,
      form8889: { ...pending.form8889, testing_period_failure: undefined },
    },
    {
      ...pending,
      form8889: {
        ...pending.form8889,
        testing_period_failure: {
          ...source.testing_period_failure!,
          last_month_rule_evidence: {
            ...source.testing_period_failure!.last_month_rule_evidence!,
            filed_form8889_line7: 0,
          },
        },
      },
    },
    {
      ...pending,
      schedule1: { ...pending.schedule1, line8f_hsa_income: 2_336 },
    },
    { ...pending, schedule2: { line17d_hsa_eligibility_tax: 0 } },
    { ...pending, f1040: { ...pending.f1040, line8_additional_income: 0 } },
    { ...pending, f1040: { ...pending.f1040, line23_other_taxes: 0 } },
  ];
  for (const changed of altered) {
    assertThrows(() => form8889.build({ forms }, { filer, pending: changed }));
    assertThrows(() => form8889Pdf.instances?.({ forms }, filer, changed));
  }
  const tampered = [{ ...filed, print_line18: 2_336 }];
  assertThrows(() => form8889.build({ forms: tampered }, { filer, pending }));
  assertThrows(() =>
    form8889Pdf.instances?.({ forms: tampered }, filer, pending)
  );
  const omitted = [{ ...filed, print_line18: undefined }];
  assertThrows(() => form8889.build({ forms: omitted }, { filer, pending }));
  assertThrows(() =>
    form8889Pdf.instances?.({ forms: omitted }, filer, pending)
  );
});
