import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import { form8889 as form8889Mef } from "./mef/forms/f8889.ts";
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

function selfOnlyPair() {
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    taxpayer_hsa_contributions: 4_000,
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S" as const,
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      age_55_or_older: true,
      taxpayer_hsa_contributions: 5_000,
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 9_000,
      line26_total_adjustments: 9_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 9_000 },
  };
  return { forms, pending };
}

Deno.test("paired self-only Form 8889 MeF/PDF reconcile each source and owner", () => {
  const { forms, pending } = selfOnlyPair();
  const xml = form8889Mef.build(
    { forms } as Parameters<typeof form8889Mef.build>[0],
    { filer, pending },
  );
  assertEquals(xml.length, 2);
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);

  const tampered = [forms[0], { ...forms[1], print_line6: 5_200 }];
  assertThrows(
    () =>
      form8889Mef.build(
        { forms: tampered } as Parameters<typeof form8889Mef.build>[0],
        { filer, pending },
      ),
    Error,
    "printed lines differ from owner source",
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms: tampered }, filer, pending),
    Error,
    "printed lines differ from owner source",
  );
  const swappedLimits = [
    { ...forms[0], print_line3_limit: 5_300, print_line6: 5_300 },
    { ...forms[1], print_line3_limit: 4_300, print_line6: 4_300 },
  ];
  assertThrows(
    () =>
      form8889Mef.build(
        { forms: swappedLimits } as unknown as Parameters<
          typeof form8889Mef.build
        >[0],
        { filer, pending },
      ),
    Error,
    "printed lines differ from owner source",
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms: swappedLimits }, filer, pending),
    Error,
    "printed lines differ from owner source",
  );
  const disguisedAsFamily = forms.map((form) => ({
    ...form,
    print_line1_coverage: "family",
  }));
  assertThrows(
    () => form8889Pdf.instances?.({ forms: disguisedAsFamily }, filer, pending),
    Error,
    "printed lines differ from owner source",
  );
  assertThrows(
    () =>
      form8889Pdf.instances?.(
        { forms },
        filer,
        Object.fromEntries(
          Object.entries(pending).filter(([key]) => key !== "form8889"),
        ),
      ),
    Error,
    "needs both owner sources",
  );
});

Deno.test("paired partial-year self-only Forms 8889 reconcile distinct owner months", () => {
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.SelfOnly),
      ...Array(6).fill(null),
    ],
    age_55_or_older: true,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    taxpayer_hsa_contributions: 2_000,
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S" as const,
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      eligible_hdhp_coverage_by_month: [
        ...Array(3).fill(null),
        ...Array(9).fill(CoverageType.SelfOnly),
      ],
      age_55_or_older: false,
      taxpayer_hsa_contributions: 3_000,
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 5_000,
      line26_total_adjustments: 5_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 5_000 },
  };
  assertEquals(forms.map((form) => form.print_line3_limit), [2_650, 3_225]);
  assertEquals(forms.map((form) => form.print_line6), [2_650, 3_225]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [
    2_000,
    3_000,
  ]);
  assertEquals(
    form8889Mef.build(
      { forms } as Parameters<typeof form8889Mef.build>[0],
      { filer, pending },
    ).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  assertThrows(
    () =>
      form8889Pdf.instances?.({ forms }, filer, {
        ...pending,
        form8889: {
          ...pending.form8889,
          spouse_hsa: {
            ...source.spouse_hsa!,
            hsa_december_31_value: 0,
            eligible_hdhp_coverage_by_month: [
              ...Array(4).fill(null),
              ...Array(8).fill(CoverageType.SelfOnly),
            ],
          },
        },
      }),
    Error,
    "printed lines differ from owner source",
  );
  assertThrows(
    () =>
      form8889Mef.build(
        {
          forms: [forms[0], { ...forms[1], print_line6: 2_650 }],
        } as Parameters<typeof form8889Mef.build>[0],
        { filer, pending },
      ),
    Error,
    "printed lines differ from owner source",
  );
  assertThrows(
    () =>
      form8889Pdf.instances?.({ forms }, filer, {
        ...pending,
        form8889: {
          ...pending.form8889,
          spouse_hsa: {
            ...source.spouse_hsa!,
            allocated_family_limit: 1_000,
          },
        },
      }),
    Error,
    "paired export needs sourced self-only",
  );
});

Deno.test("paired Medicare mixed-month Forms 8889 reconcile MeF and PDF", () => {
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.Family),
      ...Array(6).fill(null),
    ],
    medicare_enrollment: {
      first_ineligible_month: 7,
      source_reference: "Alex Medicare enrollment notice",
    },
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 2_137,
    family_allocation_source_reference: "Signed 2025 family allocation",
    taxpayer_hsa_contributions: 2_000,
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S" as const,
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
      medicare_enrollment: undefined,
      allocated_family_limit: 2_138,
      taxpayer_hsa_contributions: 6_000,
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 8_000,
      line26_total_adjustments: 8_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 8_000 },
  };
  assertEquals(
    form8889Mef.build(
      { forms } as Parameters<typeof form8889Mef.build>[0],
      { filer, pending },
    ).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  assertThrows(
    () =>
      form8889Pdf.instances?.(
        {
          forms: [forms[0], { ...forms[1], print_line6: 6_412 }],
        },
        filer,
        pending,
      ),
    Error,
    "printed lines differ from owner source",
  );
});

Deno.test("paired other-coverage loss allocates family months and reconciles MeF/PDF", () => {
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.Family),
      ...Array(6).fill(null),
    ],
    other_disqualifying_coverage: {
      first_ineligible_month: 7,
      source_reference: "Alex non-HDHP coverage notice",
      continuing_spouse_not_covered_by_other_plan: true,
    },
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 2_137,
    family_allocation_source_reference: "Signed 2025 family allocation",
    taxpayer_hsa_contributions: 2_000,
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S" as const,
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
      other_disqualifying_coverage: undefined,
      allocated_family_limit: 2_138,
      taxpayer_hsa_contributions: 6_000,
    },
  });
  const forms = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs.find((row) => row.nodeType === "form8889")?.fields.forms as Record<
    string,
    unknown
  >[];
  assertEquals(forms.map((form) => form.print_line6), [2_137, 6_413]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [
    2_000,
    6_000,
  ]);
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 8_000,
      line26_total_adjustments: 8_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 8_000 },
  };
  assertEquals(
    form8889Mef.build(
      { forms } as Parameters<typeof form8889Mef.build>[0],
      { filer, pending },
    ).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  assertThrows(
    () =>
      form8889Node.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          ...source,
          other_disqualifying_coverage: {
            ...source.other_disqualifying_coverage!,
            first_ineligible_month: 8,
          },
        },
      ),
    Error,
    "needs one sourced onset",
  );
  assertThrows(() =>
    inputSchema.parse({
      ...source,
      other_disqualifying_coverage: {
        ...source.other_disqualifying_coverage!,
        continuing_spouse_not_covered_by_other_plan: false,
      },
    }), Error);
  assertThrows(
    () =>
      form8889Node.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          ...source,
          spouse_hsa: {
            ...source.spouse_hsa!,
            medicare_enrollment: {
              first_ineligible_month: 7,
              source_reference: "Conflicting Medicare record",
            },
          },
        },
      ),
    Error,
    "Medicare enrollment needs",
  );
  assertThrows(
    () =>
      form8889Mef.build(
        { forms } as Parameters<typeof form8889Mef.build>[0],
        {
          filer,
          pending: {
            ...pending,
            form8889: {
              ...source,
              spouse_hsa: {
                ...source.spouse_hsa!,
                eligible_hdhp_coverage_by_month: [
                  ...Array(11).fill(CoverageType.Family),
                  null,
                ],
              },
              forms,
            },
          },
        },
      ),
    Error,
    "paired export needs",
  );
  assertThrows(
    () =>
      form8889Pdf.instances?.(
        {
          forms: [forms[0], { ...forms[1], print_line6: 6_412 }],
        },
        filer,
        pending,
      ),
    Error,
    "printed lines differ from owner source",
  );
});

Deno.test("paired family Form 8889 reconciles the sourced 2025 allocation through MeF and PDF", () => {
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    taxpayer_hsa_contributions: 4_000,
    allocated_family_limit: 4_000,
    family_allocation_source_reference: "2025-spouse-agreement",
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      taxpayer_hsa_contributions: 4_500,
      allocated_family_limit: 4_550,
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  assertEquals(forms.map((form) => form.print_line6), [4_000, 4_550]);
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 8_500,
      line26_total_adjustments: 8_500,
    },
    schedule2: {},
    f1040: { line10_adjustments: 8_500 },
  };
  assertEquals(
    form8889Mef.build(
      { forms } as Parameters<typeof form8889Mef.build>[0],
      { filer, pending },
    ).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  const wrongSpouse = [forms[0], { ...forms[1], print_line6: 4_600 }];
  assertThrows(
    () => form8889Pdf.instances?.({ forms: wrongSpouse }, filer, pending),
    Error,
    "paired printed lines differ",
  );
  assertThrows(
    () =>
      form8889Mef.build(
        { forms } as Parameters<typeof form8889Mef.build>[0],
        {
          filer,
          pending: {
            ...pending,
            form8889: {
              ...source,
              spouse_hsa: {
                ...source.spouse_hsa,
                allocated_family_limit: 4_600,
              },
              forms,
            },
          },
        },
      ),
    Error,
    "paired export needs sourced",
  );
});

Deno.test("paired mixed-coverage Form 8889 reconciles both owner forms through MeF and PDF", () => {
  const coverage = [
    ...Array(5).fill(CoverageType.Family),
    ...Array(7).fill(CoverageType.SelfOnly),
  ];
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: coverage,
    age_55_or_older: true,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    taxpayer_hsa_contributions: 5_000,
    allocated_family_limit: 1_781,
    family_allocation_source_reference: "Signed 2025 family-month allocation",
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      age_55_or_older: false,
      taxpayer_hsa_contributions: 4_000,
      allocated_family_limit: 1_782,
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  assertEquals(forms.map((form) => form.print_line6), [4_289, 4_290]);
  assertEquals(forms.map((form) => form.print_line7_catchup), [1_000, 0]);
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 9_000,
      line26_total_adjustments: 9_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 9_000 },
  };
  assertEquals(
    form8889Mef.build(
      { forms } as Parameters<typeof form8889Mef.build>[0],
      { filer, pending },
    ).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  const tampered = [forms[0], { ...forms[1], print_line6: 4_291 }];
  assertThrows(
    () => form8889Pdf.instances?.({ forms: tampered }, filer, pending),
    Error,
    "paired printed lines differ",
  );
  assertThrows(
    () =>
      form8889Mef.build(
        { forms } as Parameters<typeof form8889Mef.build>[0],
        {
          filer,
          pending: {
            ...pending,
            form8889: {
              ...source,
              spouse_hsa: {
                ...source.spouse_hsa,
                family_allocation_source_reference: "Different agreement",
              },
              forms,
            },
          },
        },
      ),
    Error,
    "paired export needs sourced",
  );
});

Deno.test("paired mismatched HDHP plans reconcile deemed family months through MeF and PDF", () => {
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: [
      ...Array(3).fill(CoverageType.Family),
      ...Array(9).fill(CoverageType.SelfOnly),
    ],
    age_55_or_older: true,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 1_781,
    family_allocation_source_reference: "Signed union-month allocation",
    taxpayer_hsa_contributions: 5_000,
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      eligible_hdhp_coverage_by_month: [
        ...Array(2).fill(CoverageType.SelfOnly),
        ...Array(3).fill(CoverageType.Family),
        ...Array(7).fill(CoverageType.SelfOnly),
      ],
      age_55_or_older: false,
      allocated_family_limit: 1_782,
      taxpayer_hsa_contributions: 4_000,
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  assertEquals(forms.map((form) => form.print_line3_limit), [6_071, 6_071]);
  assertEquals(forms.map((form) => form.print_line6), [4_289, 4_290]);
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 9_000,
      line26_total_adjustments: 9_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 9_000 },
  };
  assertEquals(
    form8889Mef.build(
      { forms } as Parameters<typeof form8889Mef.build>[0],
      { filer, pending },
    ).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  assertThrows(
    () =>
      form8889Pdf.instances?.(
        {
          forms: [forms[0], { ...forms[1], print_line6: 4_291 }],
        },
        filer,
        pending,
      ),
    Error,
    "paired printed lines differ",
  );
  assertThrows(
    () =>
      form8889Mef.build(
        { forms } as Parameters<typeof form8889Mef.build>[0],
        {
          filer,
          pending: {
            ...pending,
            form8889: {
              ...source,
              spouse_hsa: {
                ...source.spouse_hsa,
                eligible_hdhp_coverage_by_month: [
                  null,
                  ...source.spouse_hsa!.eligible_hdhp_coverage_by_month!.slice(
                    1,
                  ),
                ],
              },
              forms,
            },
          },
        },
      ),
    Error,
    "paired export needs",
  );
});

Deno.test("paired 2024 last-month recapture reaches two MeF and PDF owner forms", () => {
  const prior = {
    contribution_year: 2024 as const,
    eligible_hdhp_coverage_by_month: [
      ...Array(11).fill(null),
      CoverageType.Family,
    ],
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: true,
    filed_form8889_line2: 4_006,
    filed_form8889_line3: 8_300,
    filed_form8889_line4_archer: 0,
    filed_form8889_line5: 8_300,
    filed_form8889_line6: 4_150,
    filed_form8889_line7: 0,
    filed_form8889_line8: 4_150,
    filed_form8889_line9: 0,
    filed_form8889_line10: 0,
    filed_form8889_line13: 4_006,
  };
  const owner = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: [
      null,
      ...Array(11).fill(CoverageType.Family),
    ],
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 3_919,
    family_allocation_source_reference: "2025 family allocation",
    taxpayer_hsa_contributions: 2_000,
    testing_period_failure: {
      last_month_rule_evidence: prior,
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true as const,
      prior_year_source: "2024 taxpayer Form 8889",
    },
  };
  const source = inputSchema.parse({
    ...owner,
    spouse_hsa: {
      ...owner,
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      taxpayer_hsa_contributions: 1_000,
      testing_period_failure: {
        ...owner.testing_period_failure,
        prior_year_source: "2024 spouse Form 8889",
      },
    },
    prior_year_paired_family_allocation: {
      contribution_year: 2024,
      equal_allocation_agreed: true,
      allocation_source_reference: "2024 signed equal family allocation",
      primary_filed_form8889_source_reference: "2024 taxpayer Form 8889",
      spouse_filed_form8889_source_reference: "2024 spouse Form 8889",
    },
  });
  const forms = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs.find((row) => row.nodeType === "form8889")?.fields.forms as Record<
    string,
    unknown
  >[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 3_000,
      line8f_hsa_income: 7_320,
      line26_total_adjustments: 3_000,
    },
    schedule2: { line17d_hsa_eligibility_tax: 732 },
    f1040: { line10_adjustments: 3_000 },
  };
  assertEquals(forms.map((form) => form.print_line18), [3_660, 3_660]);
  assertEquals(
    form8889Mef.build(
      { forms } as Parameters<typeof form8889Mef.build>[0],
      { filer, pending },
    ).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
});

function pairedDistributions() {
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    taxpayer_hsa_contributions: 4_000,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 1_000,
      box3_distribution_code: "1" as const,
      source_reference: "primary-1099-sa",
    }],
    qualified_medical_expenses: 1_000,
    qualified_medical_expense_evidence: [{
      amount: 1_000,
      source_reference: "primary-medical-receipt",
      incurred_after_hsa_established: true as const,
      not_reimbursed_by_other_coverage: true as const,
      eligible_person: "owner" as const,
    }],
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      age_55_or_older: true,
      taxpayer_hsa_contributions: 5_000,
      hsa_distributions: 750,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 750,
        box3_distribution_code: "1",
        source_reference: "spouse-1099-sa",
      }],
      qualified_medical_expenses: 250,
      qualified_medical_expense_evidence: [{
        amount: 250,
        source_reference: "spouse-medical-receipt",
        incurred_after_hsa_established: true,
        not_reimbursed_by_other_coverage: true,
        eligible_person: "spouse",
      }],
      exception_qualified_taxable_amount: 0,
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Record<string, unknown>[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 9_000,
      line8f_hsa_income: 500,
      line26_total_adjustments: 9_000,
    },
    schedule2: { line17c_hsa_penalty: 100 },
    f1040: { line10_adjustments: 9_000 },
  };
  return { source, forms, pending };
}

Deno.test("paired 1099-SA and medical receipt sources reconcile normal distributions through MeF and PDF", () => {
  const { forms, pending } = pairedDistributions();
  assertEquals(forms.map((form) => form.print_line14a_distributions), [
    1_000,
    750,
  ]);
  assertEquals(forms.map((form) => form.print_line16_taxable), [0, 500]);
  assertEquals(forms.map((form) => form.print_line17b_penalty), [0, 100]);
  assertEquals(
    form8889Mef.build(
      { forms } as Parameters<typeof form8889Mef.build>[0],
      { filer, pending },
    ).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
});

Deno.test("paired Form 8889 rejects missing or mismatched 1099-SA evidence", () => {
  const { source, forms, pending } = pairedDistributions();
  const missing = {
    ...source,
    spouse_hsa: {
      ...source.spouse_hsa,
      form1099_sa_distributions: undefined,
    },
  };
  assertThrows(
    () =>
      form8889Pdf.instances?.({ forms }, filer, {
        ...pending,
        form8889: { ...missing, forms },
      }),
    Error,
    "needs sourced normal distributions",
  );
  for (
    const changed of [
      { box1_gross_distribution: 700 },
      { tax_year: 2024 },
      { recipient_ssn: "123456789" },
    ]
  ) {
    assertThrows(() =>
      form8889Node.compute(
        { taxYear: 2025, formType: "f1040" },
        {
          ...source,
          spouse_hsa: {
            ...source.spouse_hsa,
            form1099_sa_distributions: [{
              ...source.spouse_hsa!.form1099_sa_distributions![0],
              ...changed,
            }],
          } as NonNullable<typeof source.spouse_hsa>,
        },
      )
    );
  }
});

Deno.test("paired Form 8889 rejects reused receipts and return totals that omit taxable HSA income", () => {
  const { source, forms, pending } = pairedDistributions();
  assertThrows(
    () =>
      form8889Pdf.instances?.({ forms }, filer, {
        ...pending,
        form8889: {
          ...source,
          spouse_hsa: {
            ...source.spouse_hsa,
            qualified_medical_expense_evidence: [{
              ...source.spouse_hsa!.qualified_medical_expense_evidence![0],
              source_reference: "primary-medical-receipt",
            }],
          },
          forms,
        },
      }),
    Error,
    "cannot reuse a Form 1099-SA, qualified medical expense, or dated distribution reference",
  );
  assertThrows(
    () =>
      form8889Mef.build(
        { forms } as Parameters<typeof form8889Mef.build>[0],
        {
          filer,
          pending: {
            ...pending,
            schedule1: { ...pending.schedule1, line8f_hsa_income: 0 },
          },
        },
      ),
    Error,
    "owner totals differ",
  );
});

Deno.test("paired Form 8889 prints both W-2-funded HSAs without inventing Schedule 1 income or deduction", () => {
  const employerYear = {
    made_in_2025_for_2024_in_w2: 0,
    made_in_2026_for_2025: 0,
  };
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    employer_contribution_years: employerYear,
  };
  const source = inputSchema.parse({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
    },
    w2_code_w_entries: [
      { employee_ssn: "123456789", amount: 1_000 },
      { employee_ssn: "987654321", amount: 1_200 },
    ],
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  assertEquals(outputs.map((row) => row.nodeType), ["form8889"]);
  const forms = outputs[0]?.fields.forms as Array<{
    owner: "primary" | "spouse";
    beneficiary_name: string;
    beneficiary_ssn: string;
    print_line9_employer: number;
    print_line13_deduction: number;
  }>;
  assertEquals(forms.map((form) => form.print_line9_employer), [1_000, 1_200]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [0, 0]);
  const pending = {
    form8889: { ...source, forms },
    f1040: { line10_adjustments: 0 },
  };
  assertEquals(
    form8889Mef.build({ forms }, { filer, pending }).length,
    2,
  );
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);

  const changedSource = {
    ...pending,
    form8889: {
      ...source,
      w2_code_w_entries: [
        { employee_ssn: "123456789", amount: 1_001 },
        { employee_ssn: "987654321", amount: 1_200 },
      ],
      forms,
    },
  };
  assertThrows(
    () => form8889Mef.build({ forms }, { filer, pending: changedSource }),
    Error,
    "printed lines differ from owner source",
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, filer, changedSource),
    Error,
    "printed lines differ from owner source",
  );
  assertThrows(
    () =>
      form8889Mef.build({ forms }, {
        filer,
        pending: {
          ...pending,
          schedule1: { line13_hsa_deduction: 100 },
        },
      }),
    Error,
    "owner totals differ",
  );
});
