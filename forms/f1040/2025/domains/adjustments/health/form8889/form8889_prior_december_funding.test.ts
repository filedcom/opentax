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
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};
const priorCoverage = [...Array(11).fill(null), CoverageType.SelfOnly];
const source = inputSchema.parse({
  beneficiary_identity: { owner: "T", name: "Alex Taxpayer", ssn: "123456789" },
  eligible_hdhp_coverage_by_month: Array(12).fill(null),
  age_55_or_older: false,
  married_at_year_end: false,
  last_month_rule_elected: false,
  testing_period_failure: {
    last_month_rule_evidence: {
      contribution_year: 2024,
      eligible_hdhp_coverage_by_month: priorCoverage,
      age_55_or_older: false,
      married_at_year_end: false,
      last_month_rule_elected: true,
      filed_form8889_line2: 0,
      filed_form8889_line3: 4_150,
      filed_form8889_line4_archer: 0,
      filed_form8889_line5: 4_150,
      filed_form8889_line6: 4_150,
      filed_form8889_line7: 0,
      filed_form8889_line8: 4_150,
      filed_form8889_line9: 0,
      filed_form8889_line10: 1_000,
      filed_form8889_line13: 0,
    },
    qualified_funding_distribution_amount: 1_000,
    qualified_funding_transfer_evidence: {
      transfer_year: 2024,
      transfers: [{
        amount: 1_000,
        transfer_month: 12,
        source_reference: "December 2024 IRA trustee transfer",
      }],
      filed_prior_year_form8889_line10: 1_000,
      prior_year_eligible_hdhp_coverage_by_month: priorCoverage,
      prior_year_eligibility_source_reference:
        "Reviewed 2024 HDHP month record",
    },
    not_death_or_disability: true,
    prior_year_source: "Reviewed filed 2024 Form 8889",
  },
});

function caseData() {
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")?.fields
    .forms as Extract<
      Parameters<typeof form8889.build>[0],
      { forms: unknown }
    >["forms"];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line8f_hsa_income: 1_000,
      line10_total_additional_income: 1_000,
    },
    schedule2: { line17d_hsa_eligibility_tax: 100 },
    f1040: {
      line8_additional_income: 1_000,
      line9_total_income: 51_000,
      line10_adjustments: 0,
      line11_agi: 51_000,
      line23_other_taxes: 100,
    },
  };
  return { outputs, forms, pending };
}

Deno.test("one December 2024 IRA funding transfer recaptures on 2025 Form 8889 line 19", () => {
  const { outputs, forms, pending } = caseData();
  assertEquals(forms[0]?.print_line18, 0);
  assertEquals(forms[0]?.print_line19, 1_000);
  assertEquals(forms[0]?.print_line20, 1_000);
  assertEquals(forms[0]?.print_line21, 100);
  assertEquals(outputs.some((row) => row.nodeType === "form5329"), false);
  assertStringIncludes(
    form8889.build({ forms }, { filer, pending })[0]!,
    "<HDHPCoverageFailFundDistriAmt>1000</HDHPCoverageFailFundDistriAmt>",
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 1);
});

Deno.test("December funding route rejects changed trustee, filed line, printed line, and final return", () => {
  const { forms, pending } = caseData();
  const changed = [
    {
      ...pending,
      form8889: {
        ...pending.form8889,
        testing_period_failure: {
          ...source.testing_period_failure!,
          qualified_funding_transfer_evidence: {
            ...source.testing_period_failure!
              .qualified_funding_transfer_evidence!,
            transfers: [{
              amount: 1_000,
              transfer_month: 11,
              source_reference: "December 2024 IRA trustee transfer",
            }],
          },
        },
      },
    },
    {
      ...pending,
      form8889: {
        ...pending.form8889,
        testing_period_failure: {
          ...source.testing_period_failure!,
          qualified_funding_transfer_evidence: {
            ...source.testing_period_failure!
              .qualified_funding_transfer_evidence!,
            prior_year_eligible_hdhp_coverage_by_month: Array(12).fill(
              CoverageType.SelfOnly,
            ),
          },
        },
      },
    },
    {
      ...pending,
      form8889: {
        ...pending.form8889,
        testing_period_failure: {
          ...source.testing_period_failure!,
          last_month_rule_evidence: {
            ...source.testing_period_failure!.last_month_rule_evidence!,
            filed_form8889_line10: 900,
          },
        },
      },
    },
    { ...pending, form5329: { owner_entries: [] } },
    { ...pending, schedule1: { ...pending.schedule1, line8f_hsa_income: 999 } },
    { ...pending, schedule2: { line17d_hsa_eligibility_tax: 99 } },
    { ...pending, f1040: { ...pending.f1040, line11_agi: 50_999 } },
  ];
  for (const altered of changed) {
    assertThrows(() => form8889.build({ forms }, { filer, pending: altered }));
    assertThrows(() => form8889Pdf.instances?.({ forms }, filer, altered));
  }
  const printed = [{ ...forms[0], print_line19: 999 }];
  assertThrows(() => form8889.build({ forms: printed }, { filer, pending }));
  assertThrows(() =>
    form8889Pdf.instances?.({ forms: printed }, filer, pending)
  );
  assertThrows(() => form8889.build({ forms }, { filer }));
});
