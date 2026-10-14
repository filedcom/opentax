import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { z } from "zod";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8889/index.ts";
import {
  calculateOwnerForms,
  inputSchema as form5329InputSchema,
} from "../../../../../nodes/intermediate/forms/taxes/retirement/form5329/index.ts";
import { form5329 } from "../../../../mef/forms/taxes/retirement/f5329.ts";
import { form8889 } from "../../../../mef/forms/adjustments/health/f8889.ts";
import { form5329Pdf } from "../../../../pdf/forms/taxes/retirement/f5329.ts";
import { form8889Pdf } from "../../../../pdf/forms/adjustments/health/f8889.ts";

type OwnerForms = Extract<
  Parameters<typeof form8889.build>[0],
  { forms: unknown }
>["forms"];

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

function priorAndCode2Case() {
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
    hsa_december_31_value: 10_000,
    prior_year_hsa_excess: {
      tax_year: 2024,
      filed_form5329_reference: "Alex filed 2024 Form 5329 page 3",
      filed_return_reviewed: true,
      owner_ssn: "123456789",
      form5329_line48: 3_000,
      form5329_line49: 180,
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
      taxpayer_hsa_contributions: 5_200,
      hsa_distributions: 1_000,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 1_000,
        box2_earnings_on_excess: 100,
        box3_distribution_code: "2",
        source_reference: "sam-2025-code2-1099-sa",
      }],
      hsa_excluded_distributions: {
        timely_excess_withdrawal: {
          source: "current_year_personal",
          amount_including_earnings: 1_000,
          included_earnings: 100,
          form1099_sa_source_reference: "sam-2025-code2-1099-sa",
          withdrawn_by_return_due_date: true,
        },
      },
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")?.fields
    .forms as OwnerForms;
  const ownerEntries = outputs.filter((row) => row.nodeType === "form5329")
    .flatMap((row) => row.fields.owner_entries as unknown[]);
  const ownerForms = calculateOwnerForms({
    owner_entries: ownerEntries as z.infer<
      typeof form5329InputSchema
    >["owner_entries"],
  }).forms;
  const pending = {
    form8889: { ...source, forms },
    form5329: { owner_entries: ownerEntries, owner_forms: ownerForms },
    schedule1: {
      line13_hsa_deduction: 8_600,
      line8z_hsa_excess_earnings: 100,
      line10_total_additional_income: 100,
      line26_total_adjustments: 8_600,
    },
    schedule2: { line8_form5329_tax: 42 },
    f1040: {
      line8_additional_income: 100,
      line10_adjustments: 8_600,
      line23_other_taxes: 42,
    },
  };
  return { source, forms, pending };
}

Deno.test("paired 2024 HSA excess and other owner's 2025 code-2 return reach separate Forms 8889/5329 and final return", () => {
  const { forms, pending } = priorAndCode2Case();
  assertEquals(forms.map((form) => form.owner), ["primary", "spouse"]);
  assertEquals(forms[0]?.print_line13_deduction, 4_300);
  assertEquals(forms[1]?.print_line13_deduction, 4_300);
  assertEquals(forms[1]?.print_line14b_excluded_distributions, 1_000);
  assertEquals(pending.form5329.owner_forms[0]?.owner, "T");
  assertEquals(pending.form5329.owner_forms[0]?.print_hsa_line49, 42);
  const xml = form8889.build({ forms }, { filer, pending });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[1],
    "<HSADistributionRolloverAmt>1000</HSADistributionRolloverAmt>",
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  assertEquals(
    form5329.build(pending.form5329 as never, { filer, pending }).length,
    1,
  );
  assertEquals(
    form5329Pdf.instances?.(pending.form5329, filer, pending)?.length,
    1,
  );
  assertEquals(pending.schedule1.line10_total_additional_income, 100);
  assertEquals(pending.f1040.line23_other_taxes, 42);
});

Deno.test("paired prior excess plus code-2 rejects changed source, owner, and final return", () => {
  const { source, forms, pending } = priorAndCode2Case();
  const changedBox = {
    ...pending,
    form8889: {
      ...pending.form8889,
      spouse_hsa: {
        ...source.spouse_hsa!,
        form1099_sa_distributions: [{
          ...source.spouse_hsa!.form1099_sa_distributions![0],
          box2_earnings_on_excess: 99,
        }],
      },
    },
  };
  assertThrows(() => form8889.build({ forms }, { filer, pending: changedBox }));
  assertThrows(() => form8889Pdf.instances?.({ forms }, filer, changedBox));
  const changedOwner = {
    ...pending,
    form8889: {
      ...pending.form8889,
      prior_year_hsa_excess: {
        ...source.prior_year_hsa_excess!,
        owner_ssn: "987654321",
      },
    },
  };
  assertThrows(() =>
    form8889.build({ forms }, { filer, pending: changedOwner })
  );
  assertThrows(() => form8889Pdf.instances?.({ forms }, filer, changedOwner));
  assertThrows(() =>
    form8889.build({ forms }, {
      filer,
      pending: {
        ...pending,
        schedule1: {
          ...pending.schedule1,
          line8z_hsa_excess_earnings: 99,
        },
      },
    })
  );
  assertThrows(() =>
    form8889Pdf.instances?.({ forms }, filer, {
      ...pending,
      f1040: { ...pending.f1040, line23_other_taxes: 41 },
    })
  );
});
