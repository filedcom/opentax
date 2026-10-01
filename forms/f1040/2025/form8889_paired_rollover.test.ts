import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import type { MefBuildContext } from "./mef/form-descriptor.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import { form8889 } from "./mef/forms/f8889.ts";
import { form8889Pdf } from "./pdf/forms/f8889.ts";

type Form8889Owner = Extract<
  Parameters<typeof form8889.build>[0],
  { forms: unknown }
>["forms"][number];

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

function pairedRolloverCase() {
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    taxpayer_hsa_contributions: 2_000,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 1_000,
      box3_distribution_code: "1",
      source_reference: "alex-1099-sa",
    }],
    hsa_excluded_distributions: {
      rollover: {
        amount: 600,
        distribution_date: "2025-05-01",
        contribution_date: "2025-05-30",
        distribution_source_reference: "alex-trustee-withdrawal",
        form1099_sa_source_reference: "alex-1099-sa",
        contribution_source_reference: "alex-hsa-redeposit",
        same_beneficiary: true,
        receiving_hsa_no_other_rollover_in_preceding_12_months: true,
        not_direct_trustee_transfer: true,
      },
    },
    exception_qualified_taxable_amount: 0,
    spouse_hsa: {
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
      age_55_or_older: false,
      married_at_year_end: true,
      spouse_has_separate_hsa: true,
      last_month_rule_elected: false,
      taxpayer_hsa_contributions: 2_000,
    },
  });
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 4_000,
      line8f_hsa_income: 400,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 80 },
    f1040: { line10_adjustments: 4_000 },
  };
  const context: MefBuildContext = { filer, pending };
  return { source, forms, pending, context };
}

Deno.test("paired Form 8889 links one owner's rollover through MeF, PDF, and return totals", () => {
  const { forms, pending, context } = pairedRolloverCase();
  assertEquals(forms[0]?.print_line14b_excluded_distributions, 600);
  assertEquals(forms[0]?.print_line16_taxable, 400);
  assertEquals(forms[1]?.print_line14b_excluded_distributions, undefined);
  const xml = form8889.build({ forms }, context);
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[0],
    "<HSADistributionRolloverAmt>600</HSADistributionRolloverAmt>",
  );
  assertEquals(xml[1].includes("HSADistributionRolloverAmt"), false);
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[0]?.print_line14b_excluded_distributions, 600);
  assertEquals(pdf?.[1]?.print_line14b_excluded_distributions, undefined);
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...pending,
          schedule2: { line17c_hsa_penalty: 79 },
        },
      }),
    Error,
    "paired owner totals differ from the filed return",
  );
});

Deno.test("paired Form 8889 rejects an unlinked or unsupported second rollover", () => {
  const { source, forms, pending, context } = pairedRolloverCase();
  assertThrows(
    () =>
      form8889Pdf.instances?.({ forms }, filer, {
        ...pending,
        form8889: {
          ...source,
          hsa_excluded_distributions: {
            rollover: {
              ...source.hsa_excluded_distributions!.rollover!,
              form1099_sa_source_reference: "unknown-1099-sa",
            },
          },
          forms,
        },
      }),
    Error,
    "linked code-1 Form 1099-SA",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...pending,
          form8889: {
            ...source,
            spouse_hsa: {
              ...source.spouse_hsa!,
              hsa_distributions: 100,
              form1099_sa_distributions: [{
                tax_year: 2025,
                recipient_ssn: "987654321",
                box1_gross_distribution: 100,
                box3_distribution_code: "1",
                source_reference: "sam-1099-sa",
              }],
              hsa_excluded_distributions: {
                rollover: {
                  ...source.hsa_excluded_distributions!.rollover!,
                  amount: 100,
                  distribution_source_reference: "sam-trustee-withdrawal",
                  form1099_sa_source_reference: "sam-1099-sa",
                  contribution_source_reference: "sam-hsa-redeposit",
                },
              },
            },
            forms,
          },
        },
      }),
    Error,
    "printed lines differ from owner source calculation",
  );
});

Deno.test("paired Form 8889 reconciles distinct rollovers for both HSA owners", () => {
  const { source } = pairedRolloverCase();
  const pairedSource = inputSchema.parse({
    ...source,
    spouse_hsa: {
      ...source.spouse_hsa!,
      hsa_distributions: 800,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 800,
        box3_distribution_code: "1",
        source_reference: "sam-1099-sa",
      }],
      hsa_excluded_distributions: {
        rollover: {
          amount: 500,
          distribution_date: "2025-08-01",
          contribution_date: "2025-08-25",
          distribution_source_reference: "sam-trustee-withdrawal",
          form1099_sa_source_reference: "sam-1099-sa",
          contribution_source_reference: "sam-hsa-redeposit",
          same_beneficiary: true,
          receiving_hsa_no_other_rollover_in_preceding_12_months: true,
          not_direct_trustee_transfer: true,
        },
      },
      exception_qualified_taxable_amount: 0,
    },
  });
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    pairedSource,
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  assertEquals(forms[0]?.print_line14b_excluded_distributions, 600);
  assertEquals(forms[1]?.print_line14b_excluded_distributions, 500);
  assertEquals(forms[0]?.print_line16_taxable, 400);
  assertEquals(forms[1]?.print_line16_taxable, 300);
  const pending = {
    form8889: { ...pairedSource, forms },
    schedule1: {
      line13_hsa_deduction: 4_000,
      line8f_hsa_income: 700,
      line10_total_additional_income: 700,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 140 },
    f1040: {
      line8_additional_income: 700,
      line10_adjustments: 4_000,
      line23_other_taxes: 140,
    },
  };
  const xml = form8889.build({ forms }, { filer, pending });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[0],
    "<HSADistributionRolloverAmt>600</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    xml[1],
    "<HSADistributionRolloverAmt>500</HSADistributionRolloverAmt>",
  );
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[0]?.print_line14b_excluded_distributions, 600);
  assertEquals(pdf?.[1]?.print_line14b_excluded_distributions, 500);
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line23_other_taxes: 139 },
        },
      }),
    Error,
    "two-owner rollover needs",
  );
  assertThrows(
    () =>
      form8889Pdf.instances?.({ forms }, filer, {
        ...pending,
        form8889: {
          ...pairedSource,
          spouse_hsa: {
            ...pairedSource.spouse_hsa!,
            hsa_excluded_distributions: {
              rollover: {
                ...pairedSource.spouse_hsa!.hsa_excluded_distributions!
                  .rollover!,
                contribution_source_reference: "alex-hsa-redeposit",
              },
            },
          },
          forms,
        },
      }),
    Error,
    "paired owners cannot reuse",
  );
});
