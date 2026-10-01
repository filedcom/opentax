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

function pairedCode2Case() {
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
    taxpayer_hsa_contributions: 5_200,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 1_000,
      box2_earnings_on_excess: 100,
      box3_distribution_code: "2",
      source_reference: "alex-code2-1099-sa",
    }],
    hsa_excluded_distributions: {
      timely_excess_withdrawal: {
        source: "current_year_personal",
        amount_including_earnings: 1_000,
        included_earnings: 100,
        form1099_sa_source_reference: "alex-code2-1099-sa",
        withdrawn_by_return_due_date: true,
      },
    },
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
      line13_hsa_deduction: 6_300,
      line8z_hsa_excess_earnings: 100,
      line10_total_additional_income: 100,
      line26_total_adjustments: 6_300,
    },
    schedule2: {},
    f1040: { line8_additional_income: 100, line10_adjustments: 6_300 },
  };
  const context: MefBuildContext = { filer, pending };
  return { source, forms, pending, context };
}

Deno.test("paired Form 8889 carries one owner's code-2 return and earnings once", () => {
  const { forms, pending, context } = pairedCode2Case();
  assertEquals(forms[0]?.print_line14b_excluded_distributions, 1_000);
  assertEquals(forms[0]?.print_line13_deduction, 4_300);
  assertEquals(forms[1]?.print_line13_deduction, 2_000);
  const xml = form8889.build({ forms }, context);
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], "<HSADistributionRolloverAmt>1000</HSADistributionRolloverAmt>");
  assertEquals(xml[1].includes("HSADistributionRolloverAmt"), false);
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[0]?.print_line14b_excluded_distributions, 1_000);
  assertEquals(pdf?.[1]?.print_line14b_excluded_distributions, undefined);
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, filer, {
      ...pending,
      f1040: { ...pending.f1040, line8_additional_income: 99 },
    }),
    Error,
    "paired owner totals differ from the filed return",
  );
});

Deno.test("paired Form 8889 rejects changed code-2 earnings and another owner's distribution", () => {
  const { source, forms, pending, context } = pairedCode2Case();
  assertThrows(
    () => form8889.build({ forms }, {
      ...context,
      pending: {
        ...pending,
        form8889: {
          ...source,
          hsa_excluded_distributions: {
            timely_excess_withdrawal: {
              ...source.hsa_excluded_distributions!
                .timely_excess_withdrawal!,
              included_earnings: 99,
            },
          },
          forms,
        },
      },
    }),
    Error,
    "matching code-2 Form 1099-SA",
  );
  assertThrows(
    () => form8889.build({ forms }, {
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
            exception_qualified_taxable_amount: 0,
          },
          forms,
        },
      },
    }),
    Error,
    "sourced normal distributions",
  );
});

Deno.test("paired Form 8889 attributes a spouse-owned code-2 return to the spouse copy", () => {
  const original = pairedCode2Case().source;
  const source = inputSchema.parse({
    ...original,
    taxpayer_hsa_contributions: 2_000,
    hsa_distributions: undefined,
    form1099_sa_distributions: undefined,
    hsa_excluded_distributions: undefined,
    spouse_hsa: {
      ...original.spouse_hsa!,
      taxpayer_hsa_contributions: 5_200,
      hsa_distributions: 1_000,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 1_000,
        box2_earnings_on_excess: 100,
        box3_distribution_code: "2",
        source_reference: "sam-code2-1099-sa",
      }],
      hsa_excluded_distributions: {
        timely_excess_withdrawal: {
          source: "current_year_personal",
          amount_including_earnings: 1_000,
          included_earnings: 100,
          form1099_sa_source_reference: "sam-code2-1099-sa",
          withdrawn_by_return_due_date: true,
        },
      },
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
      line13_hsa_deduction: 6_300,
      line8z_hsa_excess_earnings: 100,
      line10_total_additional_income: 100,
      line26_total_adjustments: 6_300,
    },
    schedule2: {},
    f1040: { line8_additional_income: 100, line10_adjustments: 6_300 },
  };
  const xml = form8889.build({ forms }, { filer, pending });
  assertEquals(xml.length, 2);
  assertEquals(xml[0].includes("HSADistributionRolloverAmt"), false);
  assertStringIncludes(xml[1], "<HSADistributionRolloverAmt>1000</HSADistributionRolloverAmt>");
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[0]?.print_line14b_excluded_distributions, undefined);
  assertEquals(pdf?.[1]?.print_line14b_excluded_distributions, 1_000);
});
