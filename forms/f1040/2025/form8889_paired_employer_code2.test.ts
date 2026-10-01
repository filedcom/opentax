import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import { form8889 } from "./mef/forms/f8889.ts";
import { form8889Pdf } from "./pdf/forms/f8889.ts";

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

function pairedEmployerCode2Case(employerOwner: "T" | "S" = "T") {
  const employerSsn = employerOwner === "T" ? "123456789" : "987654321";
  const employerFacts = {
    employer_excess_treatment: {
      amount_included_in_w2_box1: 0,
      timely_withdrawal: {
        principal: 700,
        earnings: 50,
        withdrawal_tax_year: 2025,
        withdrawn_by_return_due_date: true,
        form1099_sa_source_reference: "employer-owner-code2",
      },
    },
    hsa_distributions: 750,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: employerSsn,
      box1_gross_distribution: 750,
      box2_earnings_on_excess: 50,
      box3_distribution_code: "2",
      source_reference: "employer-owner-code2",
    }],
  };
  const ownerFacts = {
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    employer_contribution_years: {
      made_in_2025_for_2024_in_w2: 0,
      made_in_2026_for_2025: 0,
    },
  };
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    ...ownerFacts,
    ...(employerOwner === "T"
      ? employerFacts
      : { taxpayer_hsa_contributions: 2_000 }),
    w2_code_w_entries: [{ employee_ssn: employerSsn, amount: 5_000 }],
    spouse_hsa: {
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      ...ownerFacts,
      ...(employerOwner === "S"
        ? employerFacts
        : { taxpayer_hsa_contributions: 2_000 }),
    },
  });
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Extract<
      Parameters<typeof form8889.build>[0],
      { forms: unknown }
    >["forms"];
  const pending = {
    form8889: { ...source, forms },
    w2: {
      w2s: [{
        employee_ssn: employerSsn,
        box1_wages: 60_000,
        box2_fed_withheld: 5_000,
        box12_entries: [{ code: "W" as const, amount: 5_000 }],
      }],
    },
    schedule1: {
      line13_hsa_deduction: 2_000,
      line8z_hsa_excess_employer: 700,
      line8z_hsa_excess_earnings: 50,
      line10_total_additional_income: 750,
      line26_total_adjustments: 2_000,
    },
    schedule2: {},
    f1040: {
      line1a_wages: 60_000,
      line8_additional_income: 750,
      line10_adjustments: 2_000,
    },
  };
  return {
    source,
    forms,
    pending,
    employerIndex: employerOwner === "T" ? 0 : 1,
  };
}

for (const employerOwner of ["T", "S"] as const) {
  Deno.test(`paired ${employerOwner} employer excess code-2 reaches its Form 8889 and the filed return`, () => {
    const { forms, pending, employerIndex } = pairedEmployerCode2Case(
      employerOwner,
    );
    assertEquals(
      forms[employerIndex]?.print_line14b_excluded_distributions,
      750,
    );
    assertEquals(forms[1 - employerIndex]?.print_line13_deduction, 2_000);
    const xml = form8889.build({ forms }, { filer, pending });
    assertEquals(xml.length, 2);
    assertStringIncludes(
      xml[employerIndex]!,
      "<HSADistributionRolloverAmt>750</HSADistributionRolloverAmt>",
    );
    assertEquals(
      xml[1 - employerIndex]!.includes("HSADistributionRolloverAmt"),
      false,
    );
    const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
    assertEquals(
      pdf?.[employerIndex]?.print_line14b_excluded_distributions,
      750,
    );
    assertThrows(
      () =>
        form8889.build({ forms }, {
          filer,
          pending: {
            ...pending,
            w2: {
              w2s: [{
                ...pending.w2.w2s[0],
                box12_entries: [{ code: "W" as const, amount: 4_999 }],
              }],
            },
          },
        }),
      Error,
      "one owner W-2 code W",
    );
    assertThrows(
      () =>
        form8889Pdf.instances?.({ forms }, filer, {
          ...pending,
          schedule1: { ...pending.schedule1, line8z_hsa_excess_employer: 699 },
        }),
      Error,
      "paired owner totals differ",
    );
    assertThrows(
      () =>
        form8889.build({ forms }, {
          filer,
          pending: {
            ...pending,
            f1040: { ...pending.f1040, line8_additional_income: 749 },
          },
        }),
      Error,
      "paired owner totals differ",
    );
    const alteredOwner = employerIndex === 0
      ? {
        ...pending.form8889,
        form1099_sa_distributions: [{
          ...pending.form8889.form1099_sa_distributions![0],
          box2_earnings_on_excess: 49,
        }],
      }
      : {
        ...pending.form8889,
        spouse_hsa: {
          ...pending.form8889.spouse_hsa!,
          form1099_sa_distributions: [{
            ...pending.form8889.spouse_hsa!.form1099_sa_distributions![0],
            box2_earnings_on_excess: 49,
          }],
        },
      };
    assertThrows(
      () =>
        form8889.build({ forms }, {
          filer,
          pending: {
            ...pending,
            form8889: alteredOwner,
          },
        }),
      Error,
      "matching code-2 Form 1099-SA",
    );
  });
}
