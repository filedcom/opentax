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

function selfOnlyMedicareCase(medicareOwner: "T" | "S") {
  const monthly = [
    ...Array(6).fill(CoverageType.SelfOnly),
    ...Array(6).fill(null),
  ];
  const ownerFacts = {
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
  };
  const medicareFacts = {
    eligible_hdhp_coverage_by_month: monthly,
    medicare_enrollment: {
      first_ineligible_month: 7,
      source_reference: "2025 Medicare enrollment notice for HSA owner",
    },
    taxpayer_hsa_contributions: 2_000,
  };
  const continuingFacts = {
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
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
  assertEquals(outputs.some((row) => row.nodeType === "form5329"), false);
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Extract<
      Parameters<typeof native.build>[0],
      { forms: unknown }
    >["forms"];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 5_000,
      line26_total_adjustments: 5_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 5_000 },
  };
  return {
    source,
    forms,
    pending,
    medicareIndex: medicareOwner === "T" ? 0 : 1,
  };
}

for (const medicareOwner of ["T", "S"] as const) {
  Deno.test(`paired self-only Medicare onset for ${medicareOwner} stops only that owner's monthly limit`, () => {
    const { source, forms, pending, medicareIndex } = selfOnlyMedicareCase(
      medicareOwner,
    );
    assertEquals(forms[medicareIndex]?.print_line3_limit, 2_150);
    assertEquals(forms[1 - medicareIndex]?.print_line3_limit, 4_300);
    assertEquals(forms[medicareIndex]?.print_line13_deduction, 2_000);
    assertEquals(forms[1 - medicareIndex]?.print_line13_deduction, 3_000);
    const xml = native.build({ forms }, { filer, pending });
    assertEquals(xml.length, 2);
    assertStringIncludes(
      xml[medicareIndex]!,
      "<HSALimitedAnnualDeductibleAmt>2150</HSALimitedAnnualDeductibleAmt>",
    );
    assertEquals(
      form8889Pdf.instances?.({ forms }, filer, pending)?.map((form) =>
        form.print_line3_limit
      ),
      forms.map((form) => form.print_line3_limit),
    );
    assertThrows(
      () =>
        calculator.compute(
          { taxYear: 2025, formType: "f1040" },
          medicareOwner === "T"
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
            },
        ),
      Error,
      "Medicare enrollment needs one sourced onset",
    );
    assertThrows(
      () =>
        inputSchema.parse(
          medicareOwner === "T"
            ? {
              ...source,
              medicare_enrollment: {
                ...source.medicare_enrollment!,
                source_reference: "",
              },
            }
            : {
              ...source,
              spouse_hsa: {
                ...source.spouse_hsa!,
                medicare_enrollment: {
                  ...source.spouse_hsa!.medicare_enrollment!,
                  source_reference: "",
                },
              },
            },
        ),
      Error,
    );
    assertThrows(
      () =>
        native.build({ forms }, {
          filer,
          pending: {
            ...pending,
            f1040: { line10_adjustments: 4_999 },
          },
        }),
      Error,
      "paired owner totals differ",
    );
    assertThrows(
      () =>
        form8889Pdf.instances?.({ forms }, filer, {
          ...pending,
          form8889: {
            ...source,
            ...(medicareOwner === "T"
              ? { taxpayer_hsa_contributions: 2_151 }
              : {
                spouse_hsa: {
                  ...source.spouse_hsa!,
                  taxpayer_hsa_contributions: 2_151,
                },
              }),
            forms,
          },
        }),
      Error,
      "December 31 HSA value for Form 5329",
    );
    assertThrows(
      () =>
        native.build({
          forms: forms.map((form, index) =>
            index === medicareIndex
              ? { ...form, print_line3_limit: 2_151 }
              : form
          ),
        }, { filer, pending }),
      Error,
      "printed lines differ",
    );
  });
}
