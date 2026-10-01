import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import {
  CoverageType,
  form8889 as calculator,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import { form8889 as native } from "./mef/forms/f8889.ts";
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

function pairedMedicareAge65Case(medicareOwner: "T" | "S") {
  const ssn = medicareOwner === "T" ? "123456789" : "987654321";
  const ownerFacts = {
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
  };
  const medicareFacts = {
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.SelfOnly),
      ...Array(6).fill(null),
    ],
    age_55_or_older: true,
    medicare_enrollment: {
      first_ineligible_month: 7,
      source_reference: `${medicareOwner}-Medicare-enrollment-notice`,
    },
    taxpayer_hsa_contributions: 2_500,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: ssn,
      box1_gross_distribution: 1_000,
      box3_distribution_code: "1",
      source_reference: `${medicareOwner}-1099-SA`,
    }],
    qualified_medical_expenses: 300,
    qualified_medical_expense_evidence: [{
      amount: 300,
      source_reference: `${medicareOwner}-medical-receipt`,
      incurred_after_hsa_established: true,
      not_reimbursed_by_other_coverage: true,
      eligible_person: "owner",
    }],
    exception_qualified_taxable_amount: 500,
    age_65_exception_evidence: {
      date_of_birth: "1960-07-02",
      birth_date_source_reference: `${medicareOwner}-birth-record`,
      distributions: [{
        distribution_date: "2025-06-15",
        gross_amount: 400,
        qualified_medical_amount: 200,
        source_reference: `${medicareOwner}-before-65`,
        form1099_sa_source_reference: `${medicareOwner}-1099-SA`,
      }, {
        distribution_date: "2025-08-15",
        gross_amount: 600,
        qualified_medical_amount: 100,
        source_reference: `${medicareOwner}-after-65`,
        form1099_sa_source_reference: `${medicareOwner}-1099-SA`,
      }],
    },
  };
  const continuingFacts = {
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    taxpayer_hsa_contributions: 3_000,
  };
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    ...ownerFacts,
    ...(medicareOwner === "T" ? medicareFacts : continuingFacts),
    spouse_hsa: {
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      ...ownerFacts,
      ...(medicareOwner === "S" ? medicareFacts : continuingFacts),
    },
  });
  const outputs = calculator.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Extract<
      Parameters<typeof native.build>[0],
      { forms: unknown }
    >["forms"];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 5_500,
      line8f_hsa_income: 700,
      line10_total_additional_income: 700,
      line26_total_adjustments: 5_500,
    },
    schedule2: { line17c_hsa_penalty: 40 },
    f1040: {
      line8_additional_income: 700,
      line10_adjustments: 5_500,
      line23_other_taxes: 40,
    },
  };
  return {
    source,
    forms,
    pending,
    medicareIndex: medicareOwner === "T" ? 0 : 1,
  };
}

for (const medicareOwner of ["T", "S"] as const) {
  Deno.test(`paired ${medicareOwner} Medicare onset and age-65 distributions reach separate Forms 8889 and Form 1040`, () => {
    const { source, forms, pending, medicareIndex } = pairedMedicareAge65Case(
      medicareOwner,
    );
    assertEquals(forms[medicareIndex]?.print_line3_limit, 2_650);
    assertEquals(forms[medicareIndex]?.print_line13_deduction, 2_500);
    assertEquals(forms[medicareIndex]?.print_line16_taxable, 700);
    assertEquals(forms[medicareIndex]?.print_line17a_exception, true);
    assertEquals(forms[medicareIndex]?.print_line17b_penalty, 40);
    assertEquals(forms[1 - medicareIndex]?.print_line13_deduction, 3_000);
    const xml = native.build({ forms }, { filer, pending });
    assertEquals(xml.length, 2);
    assertStringIncludes(
      xml[medicareIndex]!,
      "<HSALimitedAnnualDeductibleAmt>2650</HSALimitedAnnualDeductibleAmt>",
    );
    assertStringIncludes(
      xml[medicareIndex]!,
      "<HSADistriAddnlPercentTaxAmt>40</HSADistriAddnlPercentTaxAmt>",
    );
    const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
    assertEquals(pdf?.length, 2);
    assertEquals(pdf?.[medicareIndex]?.print_line3_limit, 2_650);
    assertEquals(pdf?.[medicareIndex]?.print_line17b_penalty, 40);

    const changedMedicare = medicareOwner === "T"
      ? {
        ...source,
        medicare_enrollment: {
          ...source.medicare_enrollment!,
          first_ineligible_month: 8,
        },
      }
      : {
        ...source,
        spouse_hsa: {
          ...source.spouse_hsa!,
          medicare_enrollment: {
            ...source.spouse_hsa!.medicare_enrollment!,
            first_ineligible_month: 8,
          },
        },
      };
    const changedSource = {
      ...pending,
      form8889: { ...changedMedicare, forms },
    };
    assertThrows(() =>
      native.build({ forms }, { filer, pending: changedSource })
    );
    assertThrows(() =>
      form8889Pdf.instances?.({ forms }, filer, changedSource)
    );

    const changedStatementOwner = medicareOwner === "T"
      ? {
        ...source,
        form1099_sa_distributions: [{
          ...source.form1099_sa_distributions![0]!,
          box1_gross_distribution: 999,
        }],
      }
      : {
        ...source,
        spouse_hsa: {
          ...source.spouse_hsa!,
          form1099_sa_distributions: [{
            ...source.spouse_hsa!.form1099_sa_distributions![0]!,
            box1_gross_distribution: 999,
          }],
        },
      };
    const changedStatement = {
      ...pending,
      form8889: { ...changedStatementOwner, forms },
    };
    assertThrows(() =>
      native.build({ forms }, { filer, pending: changedStatement })
    );
    assertThrows(() =>
      form8889Pdf.instances?.({ forms }, filer, changedStatement)
    );

    const changedPrint = forms.map((form, index) =>
      index === medicareIndex ? { ...form, print_line3_limit: 2_649 } : form
    );
    assertThrows(() =>
      native.build({ forms: changedPrint }, { filer, pending })
    );
    assertThrows(() =>
      form8889Pdf.instances?.({ forms: changedPrint }, filer, pending)
    );

    const changedReturn = {
      ...pending,
      f1040: { ...pending.f1040, line23_other_taxes: 39 },
    };
    assertThrows(() =>
      native.build({ forms }, { filer, pending: changedReturn })
    );
    assertThrows(() =>
      form8889Pdf.instances?.({ forms }, filer, changedReturn)
    );
  });
}
