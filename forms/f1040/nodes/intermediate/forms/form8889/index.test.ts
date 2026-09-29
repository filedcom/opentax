import { assertAlmostEquals, assertEquals, assertThrows } from "@std/assert";
import { z } from "zod";
import { CoverageType, form8889, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { form5329 } from "../form5329/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";

const uniformSelfOnly = {
  eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
  age_55_or_older: false,
  last_month_rule_elected: false,
  employer_contribution_years: {
    made_in_2025_for_2024_in_w2: 0,
    made_in_2026_for_2025: 0,
  },
};
const uniformFamily = {
  ...uniformSelfOnly,
  eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
  married_at_year_end: false,
};
const prior2024LastMonth = {
  contribution_year: 2024,
  eligible_hdhp_coverage_by_month: [
    ...Array(11).fill(null),
    CoverageType.SelfOnly,
  ],
  age_55_or_older: false,
  married_at_year_end: false,
  last_month_rule_elected: true,
  filed_form8889_line2: 1_546,
  filed_form8889_line4_archer: 0,
  filed_form8889_line8: 4_150,
  filed_form8889_line9: 0,
  filed_form8889_line10: 0,
  filed_form8889_line13: 1_546,
};
const prior2024MarriedFamily = {
  contribution_year: 2024,
  eligible_hdhp_coverage_by_month: [
    ...Array(11).fill(null),
    CoverageType.Family,
  ],
  age_55_or_older: true,
  married_at_year_end: true,
  spouse_has_separate_hsa: false,
  last_month_rule_elected: true,
  filed_form8889_line2: 1_025,
  filed_form8889_line3: 8_300,
  filed_form8889_line4_archer: 0,
  filed_form8889_line5: 8_300,
  filed_form8889_line6: 8_300,
  filed_form8889_line7: 1_000,
  filed_form8889_line8: 9_300,
  filed_form8889_line9: 0,
  filed_form8889_line10: 0,
  filed_form8889_line13: 1_025,
};

type HsaInput = z.input<typeof inputSchema>;

function compute(input: Record<string, unknown>) {
  return form8889.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({
      beneficiary_identity: {
        owner: "T",
        name: "Alex Taxpayer",
        ssn: "123456789",
      },
      ...input,
    }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function firstForm(result: ReturnType<typeof compute>) {
  const forms = findOutput(result, "form8889")?.fields.forms;
  return Array.isArray(forms)
    ? forms[0] as Record<string, unknown> | undefined
    : undefined;
}

function hsaPartVII(result: ReturnType<typeof compute>) {
  const entries = fieldsOf(result.outputs, form5329)?.owner_entries;
  return entries?.[0]?.hsa_part_vii;
}

function ordinary1099Sa(amount: number) {
  return {
    hsa_distributions: amount,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: amount,
      box3_distribution_code: "1" as const,
      source_reference: `2025 ordinary HSA distribution ${amount}`,
    }],
  };
}

function employerCode2Sa(principal: number, earnings: number) {
  return {
    hsa_distributions: principal + earnings,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: principal + earnings,
      box2_earnings_on_excess: earnings,
      box3_distribution_code: "2" as const,
      source_reference: `2025 employer excess returned to owner ${principal}`,
    }],
  };
}

function rolloverEvidence(amount: number) {
  return {
    amount,
    distribution_date: "2025-05-01",
    contribution_date: "2025-05-30",
    distribution_source_reference: "2025 HSA 1099-SA distribution A",
    contribution_source_reference: "2025 destination HSA receipt B",
    same_beneficiary: true as const,
    receiving_hsa_no_other_rollover_in_preceding_12_months: true as const,
    not_direct_trustee_transfer: true as const,
  };
}

Deno.test("Form 8889 spouse-only account retains beneficiary and Form 5329 owner", () => {
  const result = compute({
    beneficiary_identity: {
      owner: "S",
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: false,
    taxpayer_hsa_contributions: 5_000,
    hsa_december_31_value: 500,
  });
  assertEquals(firstForm(result)?.owner, "spouse");
  assertEquals(firstForm(result)?.beneficiary_ssn, "987654321");
  assertEquals(firstForm(result)?.print_line13_deduction, 4_300);
  const entries = fieldsOf(result.outputs, form5329)?.owner_entries;
  assertEquals(entries?.[0]?.owner, "S");
  assertEquals(entries?.[0]?.hsa_part_vii?.line47_current_year_excess, 700);
});

Deno.test("Form 8889 two spouse HSAs allocate the family limit and combine Schedule 1", () => {
  const primary = {
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 4_275,
    family_allocation_source_reference:
      "Both spouses' signed 2025 HSA allocation",
    employer_contribution_years: {
      made_in_2025_for_2024_in_w2: 0,
      made_in_2026_for_2025: 0,
    },
    taxpayer_hsa_contributions: 4_000,
  };
  const result = compute({
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      taxpayer_hsa_contributions: 2_000,
    },
    w2_code_w_entries: [{ employee_ssn: "987654321", amount: 1_000 }],
  });
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    6_000,
  );
  const forms = findOutput(result, "form8889")?.fields.forms as Array<
    Record<string, unknown>
  >;
  assertEquals(forms.length, 2);
  assertEquals(forms.map((form) => form.beneficiary_ssn), [
    "123456789",
    "987654321",
  ]);
  assertEquals(forms.map((form) => form.print_line6), [4_275, 4_275]);
  assertEquals(forms.map((form) => form.print_line9_employer), [0, 1_000]);
  assertEquals(fieldsOf(result.outputs, form5329), undefined);
});

const paired2024Recapture = {
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
  filed_form8889_line4_archer: 0 as const,
  filed_form8889_line5: 8_300,
  filed_form8889_line6: 4_150,
  filed_form8889_line7: 0,
  filed_form8889_line8: 4_150,
  filed_form8889_line9: 0,
  filed_form8889_line10: 0 as const,
  filed_form8889_line13: 4_006,
};

function paired2024RecaptureInput() {
  const currentCoverage = [null, ...Array(11).fill(CoverageType.Family)];
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: currentCoverage,
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 3_919,
    family_allocation_source_reference: "Signed 2025 joint allocation",
    taxpayer_hsa_contributions: 2_000,
    testing_period_failure: {
      last_month_rule_evidence: paired2024Recapture,
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true as const,
      prior_year_source: "Filed 2024 taxpayer Form 8889",
    },
  };
  return {
    ...primary,
    spouse_hsa: {
      ...primary,
      beneficiary_identity: {
        owner: "S" as const,
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      taxpayer_hsa_contributions: 1_000,
      testing_period_failure: {
        ...primary.testing_period_failure,
        prior_year_source: "Filed 2024 spouse Form 8889",
        last_month_rule_evidence: {
          ...paired2024Recapture,
          filed_form8889_line2: 3_006,
          filed_form8889_line13: 3_006,
        },
      },
    },
    prior_year_paired_family_allocation: {
      contribution_year: 2024 as const,
      equal_allocation_agreed: true as const,
      allocation_source_reference: "Signed 2024 joint allocation",
      primary_filed_form8889_source_reference: "Filed 2024 taxpayer Form 8889",
      spouse_filed_form8889_source_reference: "Filed 2024 spouse Form 8889",
    },
  };
}

Deno.test("Form 8889 paired 2024 family election redetermines each owner's 2025 recapture", () => {
  const result = compute(paired2024RecaptureInput());
  const forms = findOutput(result, "form8889")?.fields.forms as Array<
    Record<string, unknown>
  >;
  assertEquals(forms.map((form) => form.print_line18), [3_660, 2_660]);
  assertEquals(forms.map((form) => form.print_line21), [366, 266]);
  assertEquals(forms.map((form) => form.print_line6), [3_919, 3_919]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 6_320);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    3_000,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax,
    632,
  );
});

Deno.test("Form 8889 paired 2024 recapture requires both filed forms and equal allocation", () => {
  const source = paired2024RecaptureInput();
  assertThrows(
    () =>
      compute({ ...source, prior_year_paired_family_allocation: undefined }),
    Error,
    "both distinct filed owner forms",
  );
  assertThrows(
    () =>
      compute({
        ...source,
        spouse_hsa: {
          ...source.spouse_hsa,
          testing_period_failure: undefined,
        },
      }),
    Error,
    "both distinct filed owner forms",
  );
  assertThrows(
    () =>
      compute({
        ...source,
        prior_year_paired_family_allocation: {
          ...source.prior_year_paired_family_allocation,
          spouse_filed_form8889_source_reference:
            "Unrelated 2024 spouse Form 8889",
        },
      }),
    Error,
    "both distinct filed owner forms",
  );
  assertThrows(
    () =>
      compute({
        ...source,
        spouse_hsa: {
          ...source.spouse_hsa,
          testing_period_failure: {
            ...source.spouse_hsa.testing_period_failure,
            last_month_rule_evidence: {
              ...source.spouse_hsa.testing_period_failure
                .last_month_rule_evidence,
              filed_form8889_line6: 3_000,
            },
          },
        },
      }),
    Error,
    "both distinct filed owner forms",
  );
  assertThrows(
    () =>
      compute({
        ...source,
        spouse_hsa: {
          ...source.spouse_hsa,
          testing_period_failure: {
            ...source.spouse_hsa.testing_period_failure,
            last_month_rule_evidence: {
              ...source.spouse_hsa.testing_period_failure
                .last_month_rule_evidence,
              eligible_hdhp_coverage_by_month: [
                ...Array(10).fill(null),
                CoverageType.Family,
                CoverageType.Family,
              ],
            },
          },
        },
      }),
    Error,
    "December-only eligibility",
  );
});

Deno.test("Form 8889 two full-year self-only HSAs keep separate owner limits", () => {
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
  const spouse = {
    ...primary,
    beneficiary_identity: {
      owner: "S" as const,
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    age_55_or_older: true,
    taxpayer_hsa_contributions: 5_000,
    hsa_december_31_value: 0,
  };
  const result = compute({ ...primary, spouse_hsa: spouse });
  const forms = findOutput(result, "form8889")?.fields.forms as Array<
    Record<string, unknown>
  >;
  assertEquals(forms.map((form) => form.owner), ["primary", "spouse"]);
  assertEquals(forms.map((form) => form.print_line1_coverage), [
    CoverageType.SelfOnly,
    CoverageType.SelfOnly,
  ]);
  assertEquals(forms.map((form) => form.print_line3_limit), [4_300, 5_300]);
  assertEquals(forms.map((form) => form.print_line6), [4_300, 5_300]);
  assertEquals(forms.map((form) => form.print_line7_catchup), [0, 0]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [
    4_000,
    5_000,
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    9_000,
  );
  assertEquals(fieldsOf(result.outputs, form5329), undefined);

  const partialSpouse = compute({
    ...primary,
    spouse_hsa: {
      ...spouse,
      eligible_hdhp_coverage_by_month: [
        ...Array(11).fill(CoverageType.SelfOnly),
        null,
      ],
    },
  });
  const partialForms = findOutput(partialSpouse, "form8889")?.fields
    .forms as Array<Record<string, unknown>>;
  assertEquals(partialForms.map((form) => form.print_line3_limit), [
    4_300,
    4_858,
  ]);
  assertThrows(
    () =>
      compute({
        ...primary,
        allocated_family_limit: 4_300,
        spouse_hsa: spouse,
      }),
    Error,
    "matching monthly family eligibility",
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: {
          ...spouse,
          eligible_hdhp_coverage_by_month: [
            CoverageType.Family,
            ...Array(11).fill(CoverageType.SelfOnly),
          ],
        },
      }),
    Error,
    "matching monthly family eligibility",
  );
});

Deno.test("Form 8889 paired self-only HSAs prorate each owner's distinct eligible months", () => {
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
  const spouse = {
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
  };
  const result = compute({ ...primary, spouse_hsa: spouse });
  const forms = findOutput(result, "form8889")?.fields.forms as Array<
    Record<string, unknown>
  >;
  assertEquals(forms.map((form) => form.owner), ["primary", "spouse"]);
  assertEquals(forms.map((form) => form.print_line1_coverage), [
    CoverageType.SelfOnly,
    CoverageType.SelfOnly,
  ]);
  assertEquals(forms.map((form) => form.print_line3_limit), [2_650, 3_225]);
  assertEquals(forms.map((form) => form.print_line6), [2_650, 3_225]);
  assertEquals(forms.map((form) => form.print_line7_catchup), [0, 0]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [
    2_000,
    3_000,
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    5_000,
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: {
          ...spouse,
          allocated_family_limit: 1_000,
        },
      }),
    Error,
    "matching monthly family eligibility",
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: {
          ...spouse,
          eligible_hdhp_coverage_by_month: Array(12).fill(null),
        },
      }),
    Error,
    "matching monthly family eligibility",
  );
});

Deno.test("Form 8889 two spouse HSAs prorate matching partial-year family coverage", () => {
  const coverage = Array.from(
    { length: 12 },
    (_, month) => month < 6 ? CoverageType.Family : null,
  );
  const primary = {
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: coverage,
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 2_137,
    family_allocation_source_reference:
      "Both spouses' signed 2025 HSA allocation",
    taxpayer_hsa_contributions: 2_000,
  };
  const spouse = {
    ...primary,
    beneficiary_identity: {
      owner: "S",
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    allocated_family_limit: 2_138,
  };
  const result = compute({ ...primary, spouse_hsa: spouse });
  const forms = findOutput(result, "form8889")?.fields.forms as Array<
    Record<string, unknown>
  >;
  assertEquals(forms.map((form) => form.print_line3_limit), [4_275, 4_275]);
  assertEquals(forms.map((form) => form.print_line6), [2_137, 2_138]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [
    2_000,
    2_000,
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    4_000,
  );
  assertEquals(fieldsOf(result.outputs, form5329), undefined);
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: {
          ...spouse,
          eligible_hdhp_coverage_by_month: coverage.map((month, index) =>
            index === 5 ? null : month
          ),
        },
      }),
    Error,
    "matching monthly family eligibility",
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: { ...spouse, allocated_family_limit: 2_139 },
      }),
    Error,
    "matching monthly family eligibility",
  );
});

Deno.test("Form 8889 allocates shared family months when one spouse enters Medicare", () => {
  const primary = {
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.Family),
      ...Array(6).fill(null),
    ],
    medicare_enrollment: {
      first_ineligible_month: 7,
      source_reference: "2025 Medicare enrollment notice for Alex",
    },
    age_55_or_older: true,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 2_137,
    family_allocation_source_reference: "2025 signed HSA family allocation",
    taxpayer_hsa_contributions: 2_000,
  };
  const spouse = {
    ...primary,
    beneficiary_identity: {
      owner: "S",
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    medicare_enrollment: undefined,
    age_55_or_older: false,
    allocated_family_limit: 2_138,
    taxpayer_hsa_contributions: 6_000,
  };
  const result = compute({ ...primary, spouse_hsa: spouse });
  const forms = findOutput(result, "form8889")?.fields.forms as Array<
    Record<string, unknown>
  >;
  assertEquals(forms.map((form) => form.print_line3_limit), [4_275, 8_550]);
  assertEquals(forms.map((form) => form.print_line6), [2_137, 6_413]);
  assertEquals(forms.map((form) => form.print_line7_catchup), [500, 0]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [
    2_000,
    6_000,
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    8_000,
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: { ...spouse, allocated_family_limit: 2_139 },
      }),
    Error,
    "Medicare enrollment needs one sourced onset",
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        eligible_hdhp_coverage_by_month: [
          ...Array(7).fill(CoverageType.Family),
          ...Array(5).fill(null),
        ],
        spouse_hsa: spouse,
      }),
    Error,
    "Medicare enrollment needs one sourced onset",
  );
});

Deno.test("Form 8889 paired mixed coverage adds each owner's self-only limit and age-55 catch-up", () => {
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
    allocated_family_limit: 1_781,
    family_allocation_source_reference: "Signed 2025 family-month allocation",
    taxpayer_hsa_contributions: 5_000,
  };
  const spouse = {
    ...primary,
    beneficiary_identity: {
      owner: "S" as const,
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    age_55_or_older: false,
    allocated_family_limit: 1_782,
    taxpayer_hsa_contributions: 4_000,
  };
  const result = compute({ ...primary, spouse_hsa: spouse });
  const forms = findOutput(result, "form8889")?.fields.forms as Array<
    Record<string, unknown>
  >;
  assertEquals(forms.map((form) => form.print_line1_coverage), [
    "self_only",
    "self_only",
  ]);
  assertEquals(forms.map((form) => form.print_line3_limit), [6_071, 6_071]);
  assertEquals(forms.map((form) => form.print_line6), [4_289, 4_290]);
  assertEquals(forms.map((form) => form.print_line7_catchup), [1_000, 0]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [
    5_000,
    4_000,
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    9_000,
  );

  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: { ...spouse, allocated_family_limit: 1_783 },
      }),
    Error,
    "matching monthly family eligibility",
  );
});

Deno.test("Form 8889 deems both eligible spouses family-covered when either has family HDHP", () => {
  const primaryCoverage = [
    ...Array(3).fill(CoverageType.Family),
    ...Array(9).fill(CoverageType.SelfOnly),
  ];
  const spouseCoverage = [
    ...Array(2).fill(CoverageType.SelfOnly),
    ...Array(3).fill(CoverageType.Family),
    ...Array(7).fill(CoverageType.SelfOnly),
  ];
  const primary = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: primaryCoverage,
    age_55_or_older: true,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 1_781,
    family_allocation_source_reference: "Signed union-month allocation",
    taxpayer_hsa_contributions: 5_000,
  };
  const spouse = {
    ...primary,
    beneficiary_identity: {
      owner: "S" as const,
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    eligible_hdhp_coverage_by_month: spouseCoverage,
    age_55_or_older: false,
    allocated_family_limit: 1_782,
    taxpayer_hsa_contributions: 4_000,
  };
  const result = compute({ ...primary, spouse_hsa: spouse });
  const forms = findOutput(result, "form8889")?.fields.forms as Array<
    Record<string, unknown>
  >;
  assertEquals(forms.map((form) => form.print_line3_limit), [6_071, 6_071]);
  assertEquals(forms.map((form) => form.print_line6), [4_289, 4_290]);
  assertEquals(forms.map((form) => form.print_line7_catchup), [1_000, 0]);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    9_000,
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: { ...spouse, allocated_family_limit: 1_783 },
      }),
    Error,
    "sourced deemed-family months",
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: {
          ...spouse,
          eligible_hdhp_coverage_by_month: [null, ...spouseCoverage.slice(1)],
        },
      }),
    Error,
    "matching monthly family eligibility",
  );
});

Deno.test("Form 8889 two spouse HSAs reject unsupported excess and missing allocation", () => {
  const account = {
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 4_275,
    family_allocation_source_reference: "Agreed family allocation",
    employer_contribution_years: {
      made_in_2025_for_2024_in_w2: 0,
      made_in_2026_for_2025: 0,
    },
    taxpayer_hsa_contributions: 4_000,
    hsa_december_31_value: 0,
  };
  const spouse = {
    ...account,
    beneficiary_identity: {
      owner: "S",
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
  };
  assertThrows(
    () =>
      compute({
        ...account,
        spouse_hsa: { ...spouse, allocated_family_limit: 4_000 },
      }),
    Error,
    "matching monthly family eligibility",
  );
  const spouseExcess = compute({
    ...account,
    spouse_hsa: { ...spouse, taxpayer_hsa_contributions: 5_000 },
  });
  assertEquals(
    (findOutput(spouseExcess, "form5329")?.fields.owner_entries as Array<
      Record<string, unknown>
    >)[0]?.owner,
    "S",
  );
});

Deno.test("Form 8889 paired partial-year family coverage cannot elect the last-month rule without owner recapture provenance", () => {
  const coverage = [
    ...Array(6).fill(null),
    ...Array(6).fill(CoverageType.Family),
  ];
  const primary = {
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: coverage,
    age_55_or_older: false,
    last_month_rule_elected: true,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 4_275,
    family_allocation_source_reference: "Agreed 2025 family allocation",
    taxpayer_hsa_contributions: 4_000,
  };
  const spouse = {
    ...primary,
    beneficiary_identity: {
      owner: "S",
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
  };
  assertThrows(
    () => compute({ ...primary, spouse_hsa: spouse }),
    Error,
    "matching monthly family eligibility",
  );
  assertThrows(
    () =>
      compute({
        ...primary,
        spouse_hsa: { ...spouse, last_month_rule_elected: false },
      }),
    Error,
    "matching monthly family eligibility",
  );
});

Deno.test("Form 8889 paired HSA excess preserves each owner's Part VII source", () => {
  const primary = {
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    allocated_family_limit: 4_275,
    family_allocation_source_reference: "Agreed family allocation",
    employer_contribution_years: {
      made_in_2025_for_2024_in_w2: 0,
      made_in_2026_for_2025: 0,
    },
    taxpayer_hsa_contributions: 4_000,
    hsa_december_31_value: 10_000,
  };
  const spouse = {
    ...primary,
    beneficiary_identity: {
      owner: "S",
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    hsa_december_31_value: 2_000,
  };
  const excessCases = [
    { ...primary, taxpayer_hsa_contributions: 5_000, spouse_hsa: spouse },
    {
      ...primary,
      spouse_hsa: { ...spouse, taxpayer_hsa_contributions: 5_000 },
    },
    {
      ...primary,
      taxpayer_hsa_contributions: 5_000,
      spouse_hsa: { ...spouse, taxpayer_hsa_contributions: 5_000 },
    },
    {
      ...primary,
      spouse_hsa: spouse,
      w2_code_w_entries: [{ employee_ssn: "987654321", amount: 500 }],
    },
  ];
  const expectedOwners = [["T"], ["S"], ["T", "S"], ["S"]];
  for (const [index, ownerFacts] of excessCases.entries()) {
    const result = compute(ownerFacts);
    const owned = result.outputs.filter((output) =>
      output.nodeType === "form5329"
    ).flatMap((output) =>
      output.fields.owner_entries as Array<Record<string, unknown>>
    );
    assertEquals(owned.map((entry) => entry.owner), expectedOwners[index]);
    assertEquals(
      owned.every((entry) =>
        typeof (entry.hsa_part_vii as Record<string, unknown>)
          .december_31_value === "number"
      ),
      true,
    );
  }
  const prior = compute({
    ...primary,
    prior_year_hsa_excess: { form5329_line48: 1_000, form5329_line49: 60 },
    spouse_hsa: spouse,
  });
  assertEquals(
    (findOutput(prior, "form5329")?.fields.owner_entries as Array<
      Record<string, unknown>
    >)[0]?.owner,
    "T",
  );
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: no contributions, no distributions → no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Part I: Contribution Deduction ──────────────────────────────────────────

Deno.test("part1: self_only personal contribution → schedule1 line13_hsa_deduction", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 3000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 3000);
});

Deno.test("part1: family personal contribution → schedule1 line13_hsa_deduction", () => {
  const result = compute({
    ...uniformFamily,
    taxpayer_hsa_contributions: 5000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 5000);
});

Deno.test("part1: total contributions capped at annual limit (self_only 4300)", () => {
  // employer 2000 + taxpayer 2500 = total 4500 > limit 4300 → excess = 200.
  // Line 13 deduction covers only the taxpayer's own contributions, capped at
  // the limit remaining after employer contributions: min(2500, 4300-2000) = 2300.
  // (IRC §223(a); employer contributions are already excluded from W-2 box 1.)
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 2500,
    employer_hsa_contributions: 2000,
    hsa_december_31_value: 4500,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 2300);
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    200,
  );
});

Deno.test("part1: employer fills entire limit → no taxpayer deduction, taxpayer excess to form5329", () => {
  // employer 4300 fills the self_only limit entirely; taxpayer adds 500 on top → excess = 500.
  // No limit remains for the taxpayer's own contributions → line 13 deduction = 0.
  // (Employer contributions are excluded from W-2 box 1, not deducted again.)
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 500,
    employer_hsa_contributions: 4300,
    hsa_december_31_value: 4800,
  });
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    500,
  );
});

Deno.test("part1: age 55+ catch-up adds $1000 to self_only limit", () => {
  // limit = 4300 + 1000 = 5300; contribute 5300 → fully deductible
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 5300,
    age_55_or_older: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 5300);
});

Deno.test("part1: age 55+ catch-up adds $1000 to family limit", () => {
  // limit = 8550 + 1000 = 9550; contribute 9550 → fully deductible
  const result = compute({
    ...uniformFamily,
    taxpayer_hsa_contributions: 9550,
    age_55_or_older: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 9550);
});

Deno.test("part1: contribution at exact limit → fully deductible, no excess", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 4300,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 4300);
  const f5329 = findOutput(result, "form5329");
  assertEquals(f5329, undefined);
});

Deno.test("part1: filed prior-year HSA excess uses current unused room on Form 8889 line 13", () => {
  const result = compute({
    ...uniformSelfOnly,
    prior_year_hsa_excess: {
      form5329_line48: 2_000,
      form5329_line49: 120,
    },
    taxpayer_hsa_contributions: 3_800,
    hsa_december_31_value: 4_000,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    4_300,
  );
  assertEquals(
    firstForm(result)?.print_line13_deduction,
    4_300,
  );
  assertEquals(hsaPartVII(result), {
    line42_prior_excess: 2_000,
    line43_unused_contribution_room: 500,
    line44_taxable_distributions: 0,
    line47_current_year_excess: 0,
    december_31_value: 4_000,
  });
});

Deno.test("part1: prior excess can supply line 13 without a current contribution", () => {
  const result = compute({
    ...uniformSelfOnly,
    prior_year_hsa_excess: {
      form5329_line48: 1_000,
      form5329_line49: 60,
    },
    hsa_december_31_value: 1_000,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    1_000,
  );
  assertEquals(
    firstForm(result)?.print_line13_deduction,
    1_000,
  );
  assertEquals(
    hsaPartVII(result)?.line42_prior_excess,
    1_000,
  );
});

Deno.test("part1: zero 2024 Form 5329 line 49 does not carry line 48 forward", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 3_800,
    prior_year_hsa_excess: {
      form5329_line48: 1_000,
      form5329_line49: 0,
    },
  });
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction,
    3_800,
  );
  assertEquals(fieldsOf(result.outputs, form5329), undefined);
});

// ─── Part I: Excess Contributions → form5329 ─────────────────────────────────

Deno.test("part1: excess contributions route to form5329 line 47", () => {
  // self_only limit 4300; taxpayer contributes 5000 → excess = 700
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 5000,
    hsa_december_31_value: 5000,
  });
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    700,
  );
  assertEquals(
    (fieldsOf(result.outputs, form5329)!.owner_entries as Array<
      Record<string, unknown>
    >)[0]?.owner,
    "T",
  );
});

Deno.test("part1: combined employer+taxpayer excess routes to form5329", () => {
  // family limit 8550; employer 4000, taxpayer 5000 → total 9000, excess = 450
  const result = compute({
    ...uniformFamily,
    taxpayer_hsa_contributions: 5000,
    employer_hsa_contributions: 4000,
    hsa_december_31_value: 9000,
  });
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    450,
  );
});

Deno.test("part1: direct IRA-to-HSA funding transfer reduces line 12 contribution room", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 2500,
    employer_hsa_contributions: 1000,
    hsa_december_31_value: 4500,
    qualified_hsa_funding_distributions: {
      no_prior_qualified_funding_distribution: true,
      transfers: [{
        amount: 1000,
        transfer_month: 6,
        ira_type: "traditional",
        direct_trustee_transfer: true,
        source_reference: "2025 IRA trustee transfer confirmation",
      }],
    },
  });
  const printed = firstForm(result);
  assertEquals(printed?.print_line10, 1000);
  assertEquals(printed?.print_line11, 2000);
  assertEquals(printed?.print_line12, 2300);
  assertEquals(printed?.print_line13_deduction, 2300);
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    200,
  );
});

Deno.test("part1: a funding transfer needs eligible coverage in its transfer month", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        eligible_hdhp_coverage_by_month: [
          ...Array(5).fill(CoverageType.SelfOnly),
          null,
          ...Array(6).fill(CoverageType.SelfOnly),
        ],
        qualified_hsa_funding_distributions: {
          no_prior_qualified_funding_distribution: true,
          transfers: [{
            amount: 1000,
            transfer_month: 6,
            ira_type: "roth",
            direct_trustee_transfer: true,
            source_reference: "Roth IRA trustee transfer confirmation",
          }],
        },
      }),
    Error,
    "needs HDHP eligibility in its transfer month",
  );
});

Deno.test("part1: a funding-only Form 8889 prints line 10 without a deduction", () => {
  const result = compute({
    ...uniformSelfOnly,
    qualified_hsa_funding_distributions: {
      no_prior_qualified_funding_distribution: true,
      transfers: [{
        amount: 1000,
        transfer_month: 3,
        ira_type: "roth",
        direct_trustee_transfer: true,
        source_reference: "Roth IRA trustee transfer confirmation",
      }],
    },
  });
  assertEquals(
    firstForm(result)?.print_line10,
    1000,
  );
  assertEquals(
    firstForm(result)?.print_line12,
    3300,
  );
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
});

Deno.test("part1: later family coverage permits a second sourced IRA-to-HSA transfer", () => {
  const result = compute({
    ...uniformSelfOnly,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.SelfOnly),
      ...Array(6).fill(CoverageType.Family),
    ],
    married_at_year_end: false,
    qualified_hsa_funding_distributions: {
      no_prior_qualified_funding_distribution: true,
      transfers: [
        {
          amount: 3000,
          transfer_month: 3,
          ira_type: "traditional",
          direct_trustee_transfer: true,
          source_reference: "March trustee transfer",
        },
        {
          amount: 5000,
          transfer_month: 8,
          ira_type: "roth",
          direct_trustee_transfer: true,
          source_reference: "August trustee transfer",
        },
      ],
    },
  });
  const printed = firstForm(result);
  assertEquals(printed?.print_line10, 8000);
  assertEquals(printed?.print_line11, 8000);
  assertEquals(printed?.print_line12, 550);
});

Deno.test("part1: second IRA-to-HSA transfer must follow self-only coverage in a later family month", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        qualified_hsa_funding_distributions: {
          no_prior_qualified_funding_distribution: true,
          transfers: [
            {
              amount: 1000,
              transfer_month: 3,
              ira_type: "traditional",
              direct_trustee_transfer: true,
              source_reference: "first",
            },
            {
              amount: 1000,
              transfer_month: 8,
              ira_type: "roth",
              direct_trustee_transfer: true,
              source_reference: "second",
            },
          ],
        },
      }),
    Error,
    "later family-coverage month",
  );
});

Deno.test("part1: two IRA-to-HSA transfers cannot exceed the family contribution limit", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        eligible_hdhp_coverage_by_month: [
          ...Array(6).fill(CoverageType.SelfOnly),
          ...Array(6).fill(CoverageType.Family),
        ],
        married_at_year_end: false,
        qualified_hsa_funding_distributions: {
          no_prior_qualified_funding_distribution: true,
          transfers: [
            {
              amount: 4300,
              transfer_month: 3,
              ira_type: "traditional",
              direct_trustee_transfer: true,
              source_reference: "March trustee transfer",
            },
            {
              amount: 4300,
              transfer_month: 8,
              ira_type: "roth",
              direct_trustee_transfer: true,
              source_reference: "August trustee transfer",
            },
          ],
        },
      }),
    Error,
    "exceeds its eligible contribution limit",
  );
});

Deno.test("part1: employer funding above the contribution limit needs income treatment", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        employer_hsa_contributions: 5000,
      }),
    Error,
    "employer HSA contributions above the limit",
  );
});

Deno.test("part1: employer contribution worksheet removes prior-year W-2 amounts and adds next-year deposits", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 3000,
    employer_contribution_years: {
      made_in_2025_for_2024_in_w2: 500,
      made_in_2026_for_2025: 1000,
    },
    taxpayer_hsa_contributions: 500,
  });
  const printed = firstForm(result);
  assertEquals(printed?.print_line9_employer, 3500);
  assertEquals(printed?.print_line12, 800);
  assertEquals(printed?.print_line13_deduction, 500);
});

Deno.test("part1: a 2026 deposit designated for 2025 reaches Form 8889 line 9 without 2025 W-2 code W", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_contribution_years: {
      made_in_2025_for_2024_in_w2: 0,
      made_in_2026_for_2025: 1000,
    },
  });
  assertEquals(
    firstForm(result)?.print_line9_employer,
    1000,
  );
  assertEquals(
    firstForm(result)?.print_line12,
    3300,
  );
});

Deno.test("part1: employer year worksheet cannot subtract more prior-year deposits than W-2 code W", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        employer_hsa_contributions: 500,
        employer_contribution_years: {
          made_in_2025_for_2024_in_w2: 501,
          made_in_2026_for_2025: 0,
        },
      }),
    Error,
    "exceed W-2 box 12 code W",
  );
});

Deno.test("part1: W-2 code W requires year-allocation facts", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        employer_hsa_contributions: 1000,
        employer_contribution_years: undefined,
      }),
    Error,
    "Employer Contribution Worksheet year facts",
  );
});

Deno.test("part1: retained employer excess omitted from W-2 box 1 reaches other income and Form 5329", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 5000,
    employer_excess_treatment: {
      amount_included_in_w2_box1: 0,
      timely_withdrawal: null,
    },
    hsa_december_31_value: 300,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_employer,
    700,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line8z_hsa_excess_employer,
    700,
  );
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    700,
  );
  assertEquals(
    hsaPartVII(result)?.december_31_value,
    300,
  );
  assertEquals(
    firstForm(result)?.print_line9_employer,
    5000,
  );
});

Deno.test("part1: retained employer excess already in W-2 box 1 is not other income again", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 5000,
    employer_excess_treatment: {
      amount_included_in_w2_box1: 700,
      timely_withdrawal: null,
    },
    hsa_december_31_value: 700,
  });
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    700,
  );
});

Deno.test("part1: employer excess only partly included in W-2 box 1 reports the remainder", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 5000,
    employer_excess_treatment: {
      amount_included_in_w2_box1: 300,
      timely_withdrawal: null,
    },
    hsa_december_31_value: 700,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_employer,
    400,
  );
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    700,
  );
});

Deno.test("part1: W-2 box 1 inclusion cannot exceed employer excess", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        employer_hsa_contributions: 5000,
        employer_excess_treatment: {
          amount_included_in_w2_box1: 701,
          timely_withdrawal: null,
        },
        hsa_december_31_value: 700,
      }),
    Error,
    "inclusion cannot exceed employer excess",
  );
});

Deno.test("part1: no eligible HDHP month leaves a zero limit and routes employer excess", () => {
  const result = compute({
    ...uniformSelfOnly,
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    employer_hsa_contributions: 1000,
    employer_excess_treatment: {
      amount_included_in_w2_box1: 0,
      timely_withdrawal: null,
    },
    hsa_december_31_value: 600,
  });
  const printed = firstForm(result);
  assertEquals(printed?.print_line1_coverage, undefined);
  assertEquals(printed?.print_line3_limit, 0);
  assertEquals(printed?.print_line8, 0);
  assertEquals(printed?.print_line9_employer, 1000);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_employer,
    1000,
  );
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    1000,
  );
});

Deno.test("part1: an excess HSA needs its December 31 value", () => {
  assertThrows(
    () => compute({ ...uniformSelfOnly, taxpayer_hsa_contributions: 5000 }),
    Error,
    "December 31 HSA value",
  );
});

Deno.test("part1: timely 2025 employer-excess withdrawal excludes principal from Form 5329 and includes earnings", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 5000,
    employer_excess_treatment: {
      amount_included_in_w2_box1: 0,
      timely_withdrawal: {
        principal: 700,
        earnings: 50,
        withdrawal_tax_year: 2025,
        withdrawn_by_return_due_date: true,
        form1099_sa_source_reference:
          "2025 employer excess returned to owner 700",
      },
    },
    ...employerCode2Sa(700, 50),
  });
  assertEquals(fieldsOf(result.outputs, form5329), undefined);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_employer,
    700,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_earnings,
    50,
  );
  assertEquals(
    firstForm(result)?.print_line14b_excluded_distributions,
    750,
  );
  assertEquals(
    firstForm(result)?.print_line16_taxable,
    0,
  );
});

Deno.test("part1: employer excess paid to owner needs its exact code-2 source", () => {
  const source = {
    ...uniformSelfOnly,
    employer_hsa_contributions: 5_000,
    employer_excess_treatment: {
      amount_included_in_w2_box1: 0,
      timely_withdrawal: {
        principal: 700,
        earnings: 50,
        withdrawal_tax_year: 2025 as const,
        withdrawn_by_return_due_date: true as const,
        form1099_sa_source_reference:
          "2025 employer excess returned to owner 700",
      },
    },
    ...employerCode2Sa(700, 50),
  };
  for (
    const change of [
      { form1099_sa_distributions: undefined },
      {
        form1099_sa_distributions: [
          {
            ...source.form1099_sa_distributions[0],
            box2_earnings_on_excess: 49,
          },
        ],
      },
      {
        form1099_sa_distributions: [
          {
            ...source.form1099_sa_distributions[0],
            box3_distribution_code: "1" as const,
          },
        ],
      },
    ]
  ) {
    assertThrows(() => compute({ ...source, ...change }), Error);
  }
  assertThrows(
    () =>
      compute({
        ...source,
        employer_excess_treatment: {
          ...source.employer_excess_treatment,
          timely_withdrawal: {
            ...source.employer_excess_treatment.timely_withdrawal,
            form1099_sa_source_reference: "wrong document",
          },
        },
      }),
    Error,
    "matching code-2 Form 1099-SA",
  );
});

Deno.test("part1: timely 2026 employer-excess withdrawal stays off 2025 distribution and earnings lines", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 5000,
    employer_excess_treatment: {
      amount_included_in_w2_box1: 0,
      timely_withdrawal: {
        principal: 700,
        earnings: 50,
        withdrawal_tax_year: 2026,
        withdrawn_by_return_due_date: true,
      },
    },
  });
  assertEquals(fieldsOf(result.outputs, form5329), undefined);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_employer,
    700,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_earnings,
    undefined,
  );
  assertEquals(
    firstForm(result)?.print_line14b_excluded_distributions,
    undefined,
  );
});

Deno.test("part1: partial timely employer withdrawal leaves only the retained excess on Form 5329", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 5000,
    employer_excess_treatment: {
      amount_included_in_w2_box1: 700,
      timely_withdrawal: {
        principal: 300,
        earnings: 10,
        withdrawal_tax_year: 2025,
        withdrawn_by_return_due_date: true,
        form1099_sa_source_reference:
          "2025 employer excess returned to owner 300",
      },
    },
    ...employerCode2Sa(300, 10),
    hsa_december_31_value: 100,
  });
  assertEquals(
    hsaPartVII(result)
      ?.line47_current_year_excess,
    400,
  );
  assertEquals(
    hsaPartVII(result)?.december_31_value,
    100,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_earnings,
    10,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_employer,
    undefined,
  );
});

Deno.test("part1: timely employer withdrawal cannot exceed employer excess", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        employer_hsa_contributions: 5000,
        employer_excess_treatment: {
          amount_included_in_w2_box1: 0,
          timely_withdrawal: {
            principal: 701,
            earnings: 0,
            withdrawal_tax_year: 2026,
            withdrawn_by_return_due_date: true,
          },
        },
      }),
    Error,
    "exceeds excess employer contributions",
  );
});

// ─── Part II: Distributions ───────────────────────────────────────────────────

Deno.test("part2: fully qualified distribution → no income, no penalty", () => {
  const result = compute({
    ...ordinary1099Sa(2000),
    qualified_medical_expenses: 2000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2, undefined);
});

Deno.test("part2: positive line 14a needs owner-matched Form 1099-SA sources", () => {
  assertThrows(
    () =>
      compute({
        hsa_distributions: 300,
        qualified_medical_expenses: 300,
      }),
    Error,
    "needs owner-matched Form 1099-SA box 1 sources",
  );
  assertThrows(
    () =>
      compute({
        ...ordinary1099Sa(300),
        form1099_sa_distributions: [{
          ...ordinary1099Sa(300).form1099_sa_distributions[0],
          recipient_ssn: "987654321",
        }],
      }),
    Error,
    "year and recipient must match",
  );
  assertThrows(
    () =>
      compute({
        ...ordinary1099Sa(300),
        form1099_sa_distributions: [{
          ...ordinary1099Sa(300).form1099_sa_distributions[0],
          box1_gross_distribution: 299,
        }],
      }),
    Error,
    "line 14a must reconcile",
  );
});

Deno.test("part2: two distinct Forms 1099-SA sum to one owner line 14a", () => {
  const result = compute({
    hsa_distributions: 500,
    form1099_sa_distributions: [
      {
        ...ordinary1099Sa(200).form1099_sa_distributions[0],
        source_reference: "first trustee Form 1099-SA",
      },
      {
        ...ordinary1099Sa(300).form1099_sa_distributions[0],
        source_reference: "second trustee Form 1099-SA",
      },
    ],
    qualified_medical_expenses: 500,
  });
  assertEquals(firstForm(result)?.print_line14a_distributions, 500);
  assertEquals(firstForm(result)?.print_line16_taxable, 0);
});

Deno.test("part2: non-qualified distribution → schedule1 line8f HSA income", () => {
  // distribute 3000, qualified 1000 → taxable 2000
  const result = compute({
    ...ordinary1099Sa(3000),
    qualified_medical_expenses: 1000,
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8f_hsa_income, 2000);
});

Deno.test("part2: taxable distribution needs an explicit penalty exception amount", () => {
  assertThrows(
    () =>
      compute({
        ...ordinary1099Sa(3000),
        qualified_medical_expenses: 1000,
      }),
    Error,
    "needs an explicit additional-tax exception amount",
  );
});

Deno.test("part2: non-qualified distribution → 20% penalty on schedule2 line17c_hsa_penalty", () => {
  // distribute 3000, qualified 1000 → taxable 2000 → penalty 400
  const result = compute({
    ...ordinary1099Sa(3000),
    qualified_medical_expenses: 1000,
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17c_hsa_penalty, 400);
});

Deno.test("part2: fully non-qualified distribution → income + 20% penalty", () => {
  // distribute 1000, no qualified expenses → taxable 1000 → penalty 200
  const result = compute({
    ...ordinary1099Sa(1000),
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8f_hsa_income, 1000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17c_hsa_penalty, 200);
});

Deno.test("part2: line 14b rollover reduces taxable net distributions", () => {
  const result = compute({
    ...ordinary1099Sa(5000),
    hsa_excluded_distributions: { rollover: rolloverEvidence(3000) },
    qualified_medical_expenses: 1500,
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 500);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17c_hsa_penalty, 100);
  assertEquals(
    firstForm(result)?.print_line14b_excluded_distributions,
    3000,
  );
  assertEquals(
    firstForm(result)?.print_line14c,
    2000,
  );
  const nextYearRedeposit = compute({
    ...ordinary1099Sa(500),
    hsa_excluded_distributions: {
      rollover: {
        ...rolloverEvidence(500),
        distribution_date: "2025-12-15",
        contribution_date: "2026-02-13",
      },
    },
  });
  assertEquals(
    firstForm(nextYearRedeposit)?.print_line14b_excluded_distributions,
    500,
  );
});

Deno.test("part2: HSA rollover line 14b needs supported redeposit evidence", () => {
  const base = rolloverEvidence(500);
  const source = (rollover: Record<string, unknown>) =>
    inputSchema.parse({
      beneficiary_identity: {
        owner: "T",
        name: "Alex Taxpayer",
        ssn: "123456789",
      },
      ...ordinary1099Sa(500),
      hsa_excluded_distributions: { rollover },
    });
  assertThrows(
    () => compute(source({ ...base, contribution_date: "2025-07-01" })),
    Error,
    "within 60 days",
  );
  assertThrows(
    () => compute(source({ ...base, contribution_date: "2025-02-30" })),
    Error,
    "valid calendar dates",
  );
  assertThrows(
    () => compute(source({ ...base, distribution_date: "2024-12-01" })),
    Error,
    "tax-year distribution",
  );
  assertThrows(
    () =>
      compute(source({
        ...base,
        contribution_source_reference: base.distribution_source_reference,
      })),
    Error,
    "distinct distribution and redeposit sources",
  );
  for (
    const field of [
      "same_beneficiary",
      "receiving_hsa_no_other_rollover_in_preceding_12_months",
      "not_direct_trustee_transfer",
    ]
  ) {
    assertThrows(() => compute(source({ ...base, [field]: false })));
  }
  assertThrows(() =>
    inputSchema.parse({
      beneficiary_identity: {
        owner: "T",
        name: "Alex Taxpayer",
        ssn: "123456789",
      },
      hsa_distributions: 500,
      hsa_excluded_distributions: { rollover_amount: 500 },
    })
  );
});

Deno.test("part2: line 14b and line 15 cannot exceed their source distribution", () => {
  assertThrows(
    () =>
      compute({
        ...ordinary1099Sa(1000),
        hsa_excluded_distributions: { rollover: rolloverEvidence(1001) },
      }),
    Error,
    "line 14b cannot exceed",
  );
  assertThrows(
    () =>
      compute({
        ...ordinary1099Sa(1000),
        hsa_excluded_distributions: { rollover: rolloverEvidence(600) },
        qualified_medical_expenses: 500,
      }),
    Error,
    "line 15 qualified expenses cannot exceed",
  );
});

Deno.test("part2: timely excess-withdrawal earnings reach Schedule 1 other income", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 5200,
    hsa_distributions: 1000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 1000,
      box2_earnings_on_excess: 100,
      box3_distribution_code: "2",
      source_reference: "2025 Form 1099-SA code 2",
    }],
    hsa_excluded_distributions: {
      timely_excess_withdrawal: {
        source: "current_year_personal",
        amount_including_earnings: 1000,
        included_earnings: 100,
        form1099_sa_source_reference: "2025 Form 1099-SA code 2",
        withdrawn_by_return_due_date: true,
      },
    },
  });
  assertEquals(
    firstForm(result)?.print_line14b_excluded_distributions,
    1000,
  );
  assertEquals(
    firstForm(result)?.print_line14c,
    0,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_earnings,
    100,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line8z_hsa_excess_earnings,
    100,
  );
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
  assertEquals(fieldsOf(result.outputs, form5329), undefined);
});

Deno.test("part2: code-2 timely excess requires exact box 1, box 2, and document identity", () => {
  const record = {
    tax_year: 2025,
    recipient_ssn: "123456789",
    box1_gross_distribution: 1000,
    box2_earnings_on_excess: 100,
    box3_distribution_code: "2" as const,
    source_reference: "2025 Form 1099-SA code 2",
  };
  const timely = {
    source: "current_year_personal" as const,
    amount_including_earnings: 1000,
    included_earnings: 100,
    form1099_sa_source_reference: record.source_reference,
    withdrawn_by_return_due_date: true as const,
  };
  const source = {
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 5200,
    hsa_distributions: 1000,
    form1099_sa_distributions: [record],
    hsa_excluded_distributions: { timely_excess_withdrawal: timely },
  };
  for (
    const changed of [
      { form1099_sa_distributions: undefined },
      {
        form1099_sa_distributions: [{
          ...record,
          box3_distribution_code: "1" as const,
        }],
      },
      {
        form1099_sa_distributions: [{
          ...record,
          box1_gross_distribution: 999,
        }],
      },
      {
        form1099_sa_distributions: [{ ...record, box2_earnings_on_excess: 99 }],
      },
      {
        hsa_excluded_distributions: {
          timely_excess_withdrawal: {
            ...timely,
            form1099_sa_source_reference: "different-document",
          },
        },
      },
    ]
  ) {
    assertThrows(() => compute({ ...source, ...changed }), Error);
  }
});

Deno.test("part2: timely personal withdrawal cannot exceed its 2025 contribution excess", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        taxpayer_hsa_contributions: 5000,
        hsa_distributions: 900,
        form1099_sa_distributions: [{
          tax_year: 2025,
          recipient_ssn: "123456789",
          box1_gross_distribution: 900,
          box2_earnings_on_excess: 0,
          box3_distribution_code: "2",
          source_reference: "2025 Form 1099-SA code 2",
        }],
        hsa_excluded_distributions: {
          timely_excess_withdrawal: {
            source: "current_year_personal",
            amount_including_earnings: 900,
            included_earnings: 0,
            form1099_sa_source_reference: "2025 Form 1099-SA code 2",
            withdrawn_by_return_due_date: true,
          },
        },
      }),
    Error,
    "full current-year personal excess returned",
  );
});

Deno.test("part2: timely 2026 personal excess withdrawal reduces 2025 Form 5329 without 2025 distribution income", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 5000,
    post_year_personal_excess_withdrawal: {
      principal: 700,
      earnings: 30,
      withdrawal_tax_year: 2026,
      withdrawn_by_return_due_date: true,
    },
  });
  assertEquals(fieldsOf(result.outputs, form5329), undefined);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction, 4300);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_earnings,
    undefined,
  );
  assertEquals(
    firstForm(result)?.print_line14b_excluded_distributions,
    undefined,
  );
});

Deno.test("part2: excluded withdrawal earnings cannot exceed its distribution", () => {
  assertThrows(
    () =>
      compute({
        hsa_distributions: 1000,
        form1099_sa_distributions: [{
          tax_year: 2025,
          recipient_ssn: "123456789",
          box1_gross_distribution: 1000,
          box2_earnings_on_excess: 501,
          box3_distribution_code: "2",
          source_reference: "2025 Form 1099-SA code 2",
        }],
        hsa_excluded_distributions: {
          timely_excess_withdrawal: {
            source: "current_year_personal",
            amount_including_earnings: 500,
            included_earnings: 501,
            form1099_sa_source_reference: "2025 Form 1099-SA code 2",
            withdrawn_by_return_due_date: true,
          },
        },
      }),
    Error,
    "matching code-2 Form 1099-SA",
  );
});

Deno.test("part2: fully excepted distribution keeps income but has no 20% tax", () => {
  // distribute 2000, qualified 500 → taxable 1500; exception → no penalty
  const result = compute({
    hsa_distributions: 2000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 2000,
      box3_distribution_code: "1",
      source_reference: "Form 1099-SA A",
    }],
    qualified_medical_expenses: 500,
    exception_qualified_taxable_amount: 1500,
    age_65_exception_evidence: {
      date_of_birth: "1955-06-01",
      birth_date_source_reference: "Beneficiary identity record",
      distributions: [{
        distribution_date: "2025-07-01",
        gross_amount: 2000,
        qualified_medical_amount: 500,
        source_reference: "July HSA trustee transaction",
        form1099_sa_source_reference: "Form 1099-SA A",
      }],
    },
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8f_hsa_income, 1500);
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2, undefined); // no penalty
});

Deno.test("part2: a partly excepted distribution taxes only the remaining amount", () => {
  const result = compute({
    hsa_distributions: 3000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 3000,
      box3_distribution_code: "1",
      source_reference: "Form 1099-SA B",
    }],
    qualified_medical_expenses: 1000,
    exception_qualified_taxable_amount: 750,
    age_65_exception_evidence: {
      date_of_birth: "1960-07-01",
      birth_date_source_reference: "Beneficiary identity record",
      distributions: [{
        distribution_date: "2025-06-15",
        gross_amount: 1250,
        qualified_medical_amount: 0,
        source_reference: "June HSA trustee transaction",
        form1099_sa_source_reference: "Form 1099-SA B",
      }, {
        distribution_date: "2025-07-15",
        gross_amount: 1750,
        qualified_medical_amount: 1000,
        source_reference: "July HSA trustee transaction",
        form1099_sa_source_reference: "Form 1099-SA B",
      }],
    },
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 2000);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17c_hsa_penalty, 250);
  assertEquals(
    firstForm(result)?.print_line17a_exception,
    true,
  );
  assertEquals(
    firstForm(result)?.print_line17b_penalty,
    250,
  );
});

Deno.test("part2: a leap-day beneficiary attains age 65 on February 28, 2025", () => {
  const result = compute({
    hsa_distributions: 2000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 2000,
      box3_distribution_code: "1",
      source_reference: "Form 1099-SA C",
    }],
    qualified_medical_expenses: 0,
    exception_qualified_taxable_amount: 1000,
    age_65_exception_evidence: {
      date_of_birth: "1960-02-29",
      birth_date_source_reference: "Beneficiary birth record",
      distributions: [{
        distribution_date: "2025-02-27",
        gross_amount: 1000,
        qualified_medical_amount: 0,
        source_reference: "Pre-attainment trustee transaction",
        form1099_sa_source_reference: "Form 1099-SA C",
      }, {
        distribution_date: "2025-02-28",
        gross_amount: 1000,
        qualified_medical_amount: 0,
        source_reference: "Attainment-day trustee transaction",
        form1099_sa_source_reference: "Form 1099-SA C",
      }],
    },
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 2000);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17c_hsa_penalty, 200);
  assertEquals(firstForm(result)?.print_line17a_exception, true);
  assertEquals(firstForm(result)?.print_line17b_penalty, 200);
});

Deno.test("part2: age-65 exception rejects bare, early, or unreconciled distribution claims", () => {
  const base = {
    hsa_distributions: 2000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 2000,
      box3_distribution_code: "1" as const,
      source_reference: "Form 1099-SA D",
    }],
    qualified_medical_expenses: 500,
    exception_qualified_taxable_amount: 1500,
  };
  assertThrows(
    () => compute(base),
    Error,
    "dated age-65 or disability evidence",
  );
  const evidence = {
    date_of_birth: "1960-07-01",
    birth_date_source_reference: "Beneficiary identity record",
    distributions: [{
      distribution_date: "2025-07-01",
      gross_amount: 2000,
      qualified_medical_amount: 500,
      source_reference: "HSA trustee transaction",
      form1099_sa_source_reference: "Form 1099-SA D",
    }],
  };
  assertEquals(
    fieldsOf(
      compute({
        ...base,
        age_65_exception_evidence: evidence,
      }).outputs,
      schedule1,
    )?.line8f_hsa_income,
    1500,
  );
  for (
    const invalid of [
      {
        ...evidence,
        distributions: [{
          ...evidence.distributions[0],
          distribution_date: "2025-06-29",
        }],
      },
      {
        ...evidence,
        distributions: [{
          ...evidence.distributions[0],
          gross_amount: 1999,
        }],
      },
      { ...evidence, date_of_birth: "1960-02-30" },
      {
        ...evidence,
        distributions: [{
          ...evidence.distributions[0],
          form1099_sa_source_reference: "unknown 1099-SA",
        }],
      },
    ]
  ) {
    assertThrows(
      () =>
        compute({
          ...base,
          age_65_exception_evidence: invalid,
        }),
      Error,
      "does not reconcile",
    );
  }
});

Deno.test("part2: age-65 transactions reconcile by Form 1099-SA, not just annual total", () => {
  const source = {
    hsa_distributions: 2000,
    form1099_sa_distributions: [
      {
        tax_year: 2025,
        recipient_ssn: "123456789",
        box1_gross_distribution: 800,
        box3_distribution_code: "1" as const,
        source_reference: "1099-SA first",
      },
      {
        tax_year: 2025,
        recipient_ssn: "123456789",
        box1_gross_distribution: 1200,
        box3_distribution_code: "1" as const,
        source_reference: "1099-SA second",
      },
    ],
    qualified_medical_expenses: 0,
    exception_qualified_taxable_amount: 1200,
    age_65_exception_evidence: {
      date_of_birth: "1960-06-01",
      birth_date_source_reference: "birth record",
      distributions: [
        {
          distribution_date: "2025-01-01",
          gross_amount: 800,
          qualified_medical_amount: 0,
          source_reference: "first withdrawal",
          form1099_sa_source_reference: "1099-SA first",
        },
        {
          distribution_date: "2025-06-01",
          gross_amount: 1200,
          qualified_medical_amount: 0,
          source_reference: "second withdrawal",
          form1099_sa_source_reference: "1099-SA second",
        },
      ],
    },
  };
  assertEquals(
    fieldsOf(compute(source).outputs, schedule2)?.line17c_hsa_penalty,
    160,
  );
  assertThrows(
    () =>
      compute({
        ...source,
        age_65_exception_evidence: {
          ...source.age_65_exception_evidence,
          distributions: source.age_65_exception_evidence.distributions.map(
            (row) => ({
              ...row,
              form1099_sa_source_reference: "1099-SA first",
            }),
          ),
        },
      }),
    Error,
    "does not reconcile to dated taxable distributions",
  );
});

Deno.test("part2: sourced rollover and age-65 exception allocate separate dollars", () => {
  const rollover = {
    ...rolloverEvidence(1000),
    distribution_source_reference: "May trustee transaction",
  };
  const source = {
    hsa_distributions: 2000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 2000,
      box3_distribution_code: "1" as const,
      source_reference: "2025 Form 1099-SA",
    }],
    hsa_excluded_distributions: { rollover },
    qualified_medical_expenses: 100,
    exception_qualified_taxable_amount: 500,
    age_65_exception_evidence: {
      date_of_birth: "1960-04-01",
      birth_date_source_reference: "Beneficiary birth record",
      distributions: [{
        distribution_date: "2025-01-10",
        gross_amount: 400,
        qualified_medical_amount: 0,
        rollover_excluded_amount: 0,
        source_reference: "January trustee transaction",
        form1099_sa_source_reference: "2025 Form 1099-SA",
      }, {
        distribution_date: "2025-05-01",
        gross_amount: 1600,
        qualified_medical_amount: 100,
        rollover_excluded_amount: 1000,
        source_reference: "May trustee transaction",
        form1099_sa_source_reference: "2025 Form 1099-SA",
      }],
    },
  };
  const result = compute(source);
  assertEquals(firstForm(result)?.print_line14a_distributions, 2000);
  assertEquals(firstForm(result)?.print_line14b_excluded_distributions, 1000);
  assertEquals(firstForm(result)?.print_line16_taxable, 900);
  assertEquals(firstForm(result)?.print_line17a_exception, true);
  assertEquals(firstForm(result)?.print_line17b_penalty, 80);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 900);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17c_hsa_penalty, 80);
  const rows = source.age_65_exception_evidence.distributions;
  for (
    const invalid of [
      [rows[0], { ...rows[1], rollover_excluded_amount: 900 }],
      [rows[0], { ...rows[1], source_reference: "wrong transaction" }],
      [rows[0], { ...rows[1], distribution_date: "2025-05-02" }],
      [{ ...rows[0], rollover_excluded_amount: undefined }, rows[1]],
    ]
  ) {
    assertThrows(
      () =>
        compute({
          ...source,
          age_65_exception_evidence: {
            ...source.age_65_exception_evidence,
            distributions: invalid,
          },
        }),
      Error,
      "rollover needs one dated transaction",
    );
  }
  assertThrows(
    () =>
      compute({
        ...source,
        age_65_exception_evidence: {
          ...source.age_65_exception_evidence,
          distributions: [
            rows[0],
            { ...rows[1], qualified_medical_amount: 700 },
          ],
        },
      }),
    Error,
    "does not reconcile",
  );
});

Deno.test("part2: the excepted portion cannot exceed taxable distributions", () => {
  assertThrows(
    () =>
      compute({
        ...ordinary1099Sa(1000),
        qualified_medical_expenses: 400,
        exception_qualified_taxable_amount: 601,
      }),
    Error,
    "exception amount cannot exceed taxable distributions",
  );
});

// ─── Combined: contributions + distributions ──────────────────────────────────

Deno.test("combined: deduction + non-qualified distribution both present", () => {
  // self_only, contribute 3000, distribute 1000 non-qualified
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 3000,
    ...ordinary1099Sa(1000),
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 3000);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8f_hsa_income, 1000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17c_hsa_penalty, 200);
});

Deno.test("part3: 2024 last-month-rule coverage and filed contributions reconstruct 2025 line 18", () => {
  const result = compute({
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    testing_period_failure: {
      last_month_rule_evidence: prior2024LastMonth,
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true,
      prior_year_source: "Filed 2024 Form 8889 and monthly HDHP records",
    },
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 1200);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax,
    120,
  );
  assertEquals(
    firstForm(result)?.print_line18,
    1200,
  );
  assertEquals(
    firstForm(result)?.print_line19,
    0,
  );
  assertEquals(
    firstForm(result)?.print_line20,
    1200,
  );
  assertEquals(
    firstForm(result)?.print_line21,
    120,
  );
});

Deno.test("part3: married 2024 family last-month rule includes own age-55 catch-up", () => {
  const result = compute({
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    testing_period_failure: {
      last_month_rule_evidence: prior2024MarriedFamily,
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true,
      prior_year_source: "Filed 2024 Form 8889 and monthly HDHP records",
    },
  });
  // A single eligible family month would allow $9,300 / 12 = $775 without
  // the 2024 last-month rule, so $1,025 - $775 = $250 is recaptured in 2025.
  assertEquals(
    firstForm(result)?.print_line18,
    250,
  );
  assertEquals(
    firstForm(result)?.print_line20,
    250,
  );
  assertEquals(
    firstForm(result)?.print_line21,
    25,
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 250);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax,
    25,
  );
});

Deno.test("part3: married one-HSA 2024 self-only last-month rule uses filed self-only lines", () => {
  const evidence = {
    ...prior2024MarriedFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(11).fill(null),
      CoverageType.SelfOnly,
    ],
    filed_form8889_line2: 1_629,
    filed_form8889_line3: 5_150,
    filed_form8889_line5: 5_150,
    filed_form8889_line6: 5_150,
    filed_form8889_line7: 0,
    filed_form8889_line8: 5_150,
    filed_form8889_line13: 1_629,
  };
  const failure = {
    last_month_rule_evidence: evidence,
    qualified_funding_distribution_amount: 0,
    not_death_or_disability: true as const,
    prior_year_source: "Filed 2024 Form 8889 and monthly HDHP records",
  };
  const result = compute({
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    testing_period_failure: failure,
  });
  // $5,150 / 12 rounds to $429 without the election; $1,629 - $429 = $1,200.
  assertEquals(firstForm(result)?.print_line18, 1_200);
  assertEquals(firstForm(result)?.print_line21, 120);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 1_200);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax,
    120,
  );

  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(null),
        testing_period_failure: {
          ...failure,
          last_month_rule_evidence: {
            ...evidence,
            filed_form8889_line7: 1_000,
          },
        },
      }),
    Error,
    "filed lines 3-8",
  );
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(null),
        testing_period_failure: {
          ...failure,
          last_month_rule_evidence: {
            ...evidence,
            eligible_hdhp_coverage_by_month: [
              CoverageType.Family,
              ...Array(10).fill(null),
              CoverageType.SelfOnly,
            ],
          },
        },
      }),
    Error,
    "age-55 mixed-coverage recapture needs the filed additional-contribution worksheet",
  );
});

Deno.test("part3: married one-HSA 2024 family-to-self-only election uses the greater filed limit", () => {
  const evidence = {
    ...prior2024MarriedFamily,
    eligible_hdhp_coverage_by_month: [
      CoverageType.Family,
      ...Array(10).fill(null),
      CoverageType.SelfOnly,
    ],
    age_55_or_older: false,
    filed_form8889_line2: 3_000,
    filed_form8889_line3: 4_150,
    filed_form8889_line5: 4_150,
    filed_form8889_line6: 4_150,
    filed_form8889_line7: 0,
    filed_form8889_line8: 4_150,
    filed_form8889_line13: 3_000,
  };
  const failure = {
    last_month_rule_evidence: evidence,
    qualified_funding_distribution_amount: 0,
    not_death_or_disability: true as const,
    prior_year_source: "Filed 2024 Form 8889 and monthly HDHP records",
  };
  const result = compute({
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    testing_period_failure: failure,
  });
  // ($8,300 family + $4,150 self-only) / 12 rounds to $1,038.
  assertEquals(firstForm(result)?.print_line18, 1_962);
  assertAlmostEquals(firstForm(result)?.print_line21 as number, 196.2);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 1_962);
  assertAlmostEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax as number,
    196.2,
  );

  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(null),
        testing_period_failure: {
          ...failure,
          last_month_rule_evidence: {
            ...evidence,
            filed_form8889_line3: 4_151,
          },
        },
      }),
    Error,
    "filed lines 3-8",
  );
});

Deno.test("part3: married one-HSA 2024 family-to-self-only worksheet can exceed December limit", () => {
  const result = compute({
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    testing_period_failure: {
      last_month_rule_evidence: {
        ...prior2024MarriedFamily,
        eligible_hdhp_coverage_by_month: [
          ...Array(7).fill(CoverageType.Family),
          ...Array(4).fill(null),
          CoverageType.SelfOnly,
        ],
        age_55_or_older: false,
        filed_form8889_line2: 5_000,
        filed_form8889_line3: 5_188,
        filed_form8889_line5: 5_188,
        filed_form8889_line6: 5_188,
        filed_form8889_line7: 0,
        filed_form8889_line8: 5_188,
        filed_form8889_line13: 5_000,
      },
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true,
      prior_year_source: "Filed 2024 Form 8889 and monthly HDHP records",
    },
  });
  // The monthly worksheet is $5,187.50, greater than the $4,150 December limit.
  assertEquals(firstForm(result), undefined);
});

Deno.test("part3: married 2024 family months redetermine the no-catch-up limit", () => {
  const result = compute({
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    testing_period_failure: {
      last_month_rule_evidence: {
        ...prior2024MarriedFamily,
        eligible_hdhp_coverage_by_month: [
          ...Array(6).fill(null),
          ...Array(6).fill(CoverageType.Family),
        ],
        age_55_or_older: false,
        filed_form8889_line2: 5_000,
        filed_form8889_line7: 0,
        filed_form8889_line8: 8_300,
        filed_form8889_line13: 5_000,
      },
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true,
      prior_year_source: "Filed 2024 Form 8889 and monthly HDHP records",
    },
  });
  assertEquals(
    firstForm(result)?.print_line18,
    850,
  );
  assertEquals(
    firstForm(result)?.print_line21,
    85,
  );
});

Deno.test("part3: married 2024 last-month evidence cannot guess spouse allocation", () => {
  const failure = {
    last_month_rule_evidence: prior2024MarriedFamily,
    qualified_funding_distribution_amount: 0,
    not_death_or_disability: true,
    prior_year_source: "Filed 2024 Form 8889",
  };
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(null),
        testing_period_failure: {
          ...failure,
          last_month_rule_evidence: {
            ...prior2024MarriedFamily,
            spouse_has_separate_hsa: undefined,
          },
        },
      }),
    Error,
    "both spouse-HSA status and filed-form reconciliation",
  );
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(null),
        testing_period_failure: {
          ...failure,
          last_month_rule_evidence: {
            ...prior2024MarriedFamily,
            filed_form8889_line7: 0,
          },
        },
      }),
    Error,
    "filed lines 3-8",
  );
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(null),
        testing_period_failure: {
          ...failure,
          last_month_rule_evidence: {
            ...prior2024MarriedFamily,
            spouse_has_separate_hsa: true,
          },
        },
      }),
    Error,
  );
});

Deno.test("part3: married one-HSA 2024 mixed coverage uses each actual month for recapture", () => {
  const result = compute({
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    testing_period_failure: {
      last_month_rule_evidence: {
        ...prior2024MarriedFamily,
        eligible_hdhp_coverage_by_month: [
          ...Array(6).fill(CoverageType.SelfOnly),
          ...Array(5).fill(null),
          CoverageType.Family,
        ],
        filed_form8889_line2: 5_000,
        filed_form8889_line13: 5_000,
      },
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true,
      prior_year_source: "Filed 2024 Form 8889 and monthly HDHP records",
    },
  });
  // $5,150 for six self-only months plus $9,300 for December: $3,350
  // redetermined 2024 limit. The other five months had no eligibility.
  assertEquals(
    firstForm(result)?.print_line18,
    1_650,
  );
  assertEquals(
    firstForm(result)?.print_line21,
    165,
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 1_650);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax,
    165,
  );
});

Deno.test("part3: mixed 2024 coverage rejects a filed limit inconsistent with December family HDHP", () => {
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(null),
        testing_period_failure: {
          last_month_rule_evidence: {
            ...prior2024MarriedFamily,
            eligible_hdhp_coverage_by_month: [
              CoverageType.SelfOnly,
              ...Array(10).fill(null),
              CoverageType.Family,
            ],
            filed_form8889_line3: 4_150,
          },
          qualified_funding_distribution_amount: 0,
          not_death_or_disability: true,
          prior_year_source: "Filed 2024 Form 8889 and monthly HDHP records",
        },
      }),
    Error,
    "filed lines 3-8",
  );
});

Deno.test("part3: last-month rule produces no recapture when 2024 contributions fit the monthly limit", () => {
  const result = compute({
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    testing_period_failure: {
      last_month_rule_evidence: {
        ...prior2024LastMonth,
        filed_form8889_line2: 300,
        filed_form8889_line13: 300,
      },
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true,
      prior_year_source: "Filed 2024 Form 8889",
    },
  });
  assertEquals(findOutput(result, "form8889"), undefined);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8f_hsa_income,
    undefined,
  );
});

Deno.test("part3: unsupported or contradictory 2024 last-month-rule records stop", () => {
  const failure = {
    last_month_rule_evidence: prior2024LastMonth,
    qualified_funding_distribution_amount: 0,
    not_death_or_disability: true,
    prior_year_source: "Filed 2024 Form 8889",
  };
  const current = Array(12).fill(null);
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: current,
        testing_period_failure: {
          ...failure,
          last_month_rule_evidence: {
            ...prior2024LastMonth,
            filed_form8889_line8: 4_000,
          },
        },
      }),
    Error,
    "filed 2024 contribution lines that reconcile",
  );
  assertThrows(() =>
    compute({
      eligible_hdhp_coverage_by_month: current,
      testing_period_failure: {
        ...failure,
        last_month_rule_evidence: {
          ...prior2024LastMonth,
          married_at_year_end: true,
        },
      },
    })
  );
  assertThrows(() =>
    compute({
      eligible_hdhp_coverage_by_month: current,
      testing_period_failure: {
        ...failure,
        last_month_rule_excess_amount: 1_200,
      },
    })
  );
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
        testing_period_failure: failure,
      }),
    Error,
    "showing a testing-period failure",
  );
});

Deno.test("part3: 2024 last-month rule and prior-year IRA funding need separate reconciliation", () => {
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: Array(12).fill(null),
        testing_period_failure: {
          last_month_rule_evidence: prior2024LastMonth,
          qualified_funding_distribution_amount: 800,
          not_death_or_disability: true,
          prior_year_source: "Filed 2024 Form 8889",
          qualified_funding_transfer_evidence: {
            transfer_year: 2024,
            transfers: [{
              amount: 800,
              transfer_month: 6,
              source_reference: "2024 IRA trustee confirmation",
            }],
            filed_prior_year_form8889_line10: 800,
            prior_year_eligible_hdhp_coverage_by_month: Array(12).fill(
              CoverageType.SelfOnly,
            ),
            prior_year_eligibility_source_reference:
              "Filed 2024 HDHP eligibility worksheet",
          },
        },
      }),
    Error,
    "combined 2024 last-month-rule and IRA funding recapture",
  );
});

Deno.test("part3: only prior-year transfers still in testing on first ineligible month reach line 19", () => {
  const result = compute({
    eligible_hdhp_coverage_by_month: [
      ...Array(5).fill(CoverageType.Family),
      null,
      ...Array(6).fill(null),
    ],
    testing_period_failure: {
      qualified_funding_distribution_amount: 1_000,
      not_death_or_disability: true,
      prior_year_source: "Filed 2024 Form 8889 line 10",
      qualified_funding_transfer_evidence: {
        transfer_year: 2024,
        transfers: [
          {
            amount: 500,
            transfer_month: 3,
            source_reference: "March 2024 IRA trustee confirmation",
          },
          {
            amount: 1_000,
            transfer_month: 8,
            source_reference: "August 2024 IRA trustee confirmation",
          },
        ],
        filed_prior_year_form8889_line10: 1_500,
        prior_year_eligible_hdhp_coverage_by_month: Array(12).fill(
          CoverageType.Family,
        ),
        prior_year_eligibility_source_reference:
          "Filed 2024 HDHP eligibility worksheet",
      },
    },
  });
  assertEquals(
    firstForm(result)?.print_line19,
    1_000,
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 1_000);
});

Deno.test("part3: expired prior-year transfer cannot be recaptured on line 19", () => {
  assertThrows(
    () =>
      compute({
        eligible_hdhp_coverage_by_month: [
          ...Array(6).fill(CoverageType.SelfOnly),
          ...Array(6).fill(null),
        ],
        testing_period_failure: {
          qualified_funding_distribution_amount: 800,
          not_death_or_disability: true,
          prior_year_source: "Filed 2024 Form 8889 line 10",
          qualified_funding_transfer_evidence: {
            transfer_year: 2024,
            transfers: [{
              amount: 800,
              transfer_month: 3,
              source_reference: "March 2024 IRA trustee confirmation",
            }],
            filed_prior_year_form8889_line10: 800,
            prior_year_eligible_hdhp_coverage_by_month: Array(12).fill(
              CoverageType.SelfOnly,
            ),
            prior_year_eligibility_source_reference:
              "Filed 2024 HDHP eligibility worksheet",
          },
        },
      }),
    Error,
    "must equal transfers whose testing periods failed",
  );
});

Deno.test("part3: prior-year funding transfer requires sourced monthly eligibility", () => {
  const transferEvidence = {
    transfer_year: 2024,
    transfers: [{
      amount: 800,
      transfer_month: 6,
      source_reference: "June 2024 IRA trustee confirmation",
    }],
    filed_prior_year_form8889_line10: 800,
    prior_year_eligible_hdhp_coverage_by_month: Array(12).fill(
      CoverageType.SelfOnly,
    ),
    prior_year_eligibility_source_reference:
      "Filed 2024 HDHP eligibility worksheet",
  };
  const failure = {
    qualified_funding_distribution_amount: 800,
    not_death_or_disability: true as const,
    prior_year_source: "Filed 2024 Form 8889 line 10",
  };
  const currentCoverage = [null, ...Array(11).fill(CoverageType.SelfOnly)];
  const computeWithEvidence = (
    evidence: NonNullable<
      NonNullable<HsaInput["testing_period_failure"]>[
        "qualified_funding_transfer_evidence"
      ]
    >,
  ) =>
    compute({
      eligible_hdhp_coverage_by_month: currentCoverage,
      testing_period_failure: {
        ...failure,
        qualified_funding_transfer_evidence: evidence,
      },
    });

  assertThrows(
    () =>
      computeWithEvidence({
        ...transferEvidence,
        prior_year_eligible_hdhp_coverage_by_month: undefined,
      }),
    Error,
    "sourced monthly prior-year eligibility",
  );
  assertThrows(
    () =>
      computeWithEvidence({
        ...transferEvidence,
        prior_year_eligibility_source_reference: undefined,
      }),
    Error,
    "sourced monthly prior-year eligibility",
  );
  assertThrows(
    () =>
      computeWithEvidence({
        ...transferEvidence,
        prior_year_eligible_hdhp_coverage_by_month: [
          ...Array(8).fill(CoverageType.SelfOnly),
          null,
          ...Array(3).fill(CoverageType.SelfOnly),
        ],
      }),
    Error,
    "uninterrupted HDHP eligibility",
  );
  const result = computeWithEvidence({
    ...transferEvidence,
    prior_year_eligible_hdhp_coverage_by_month: [
      null,
      ...Array(11).fill(CoverageType.SelfOnly),
    ],
  });
  assertEquals(firstForm(result)?.print_line19, 800);
});

Deno.test("part3: a positive line 19 cannot use only a free-text source", () => {
  assertThrows(
    () =>
      compute({
        testing_period_failure: {
          qualified_funding_distribution_amount: 800,
          not_death_or_disability: true,
          prior_year_source: "IRA transfer",
        },
      }),
    Error,
    "needs transfer evidence and twelve months of HDHP eligibility",
  );
});

Deno.test("part3: current-year line 19 must match the Part I funding transfer", () => {
  const sourceReference = "March 2025 Roth IRA trustee confirmation";
  const result = compute({
    ...uniformSelfOnly,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.SelfOnly),
      ...Array(6).fill(null),
    ],
    qualified_hsa_funding_distributions: {
      no_prior_qualified_funding_distribution: true,
      transfers: [{
        amount: 1_000,
        transfer_month: 3,
        ira_type: "roth",
        direct_trustee_transfer: true,
        source_reference: sourceReference,
      }],
    },
    testing_period_failure: {
      qualified_funding_distribution_amount: 1_000,
      not_death_or_disability: true,
      prior_year_source: sourceReference,
      qualified_funding_transfer_evidence: {
        transfer_year: 2025,
        transfers: [{
          amount: 1_000,
          transfer_month: 3,
          source_reference: sourceReference,
        }],
      },
    },
  });
  assertEquals(
    firstForm(result)?.print_line10,
    1_000,
  );
  assertEquals(
    firstForm(result)?.print_line19,
    1_000,
  );
});

Deno.test("part3: distribution and testing-period income share line 8f but keep both taxes", () => {
  const result = compute({
    ...ordinary1099Sa(1000),
    qualified_medical_expenses: 400,
    exception_qualified_taxable_amount: 0,
    testing_period_failure: {
      last_month_rule_evidence: {
        ...prior2024LastMonth,
        filed_form8889_line2: 846,
        filed_form8889_line13: 846,
      },
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true,
      prior_year_source: "2024 HSA contribution worksheet",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 1100);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17c_hsa_penalty, 120);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax,
    50,
  );
});

Deno.test("part1: married family catch-up prints on line 7, not line 3", () => {
  const result = compute({
    ...uniformFamily,
    married_at_year_end: true,
    spouse_has_separate_hsa: false,
    age_55_or_older: true,
    taxpayer_hsa_contributions: 9550,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction, 9550);
  assertEquals(
    firstForm(result)?.print_line3_limit,
    8550,
  );
  assertEquals(
    firstForm(result)?.print_line7_catchup,
    1000,
  );
});

Deno.test("part1: separate spouse HSA answer needs both owner sources", () => {
  assertThrows(
    () =>
      compute({
        ...uniformFamily,
        married_at_year_end: true,
        spouse_has_separate_hsa: true,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "must match the two beneficiary sources",
  );
  assertThrows(
    () =>
      compute({
        ...uniformFamily,
        married_at_year_end: true,
        spouse_has_separate_hsa: true,
        spouse_allocated_family_limit: 8551,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
  );
  assertThrows(
    () =>
      compute({
        ...ordinary1099Sa(100),
        qualified_medical_expenses: 100,
        spouse_has_separate_hsa: true,
      }),
    Error,
    "must match the two beneficiary sources",
  );
  assertThrows(
    () =>
      compute({
        ...uniformFamily,
        married_at_year_end: true,
        spouse_has_separate_hsa: false,
        spouse_allocated_family_limit: 100,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
  );
});

Deno.test("part1: missing monthly coverage and last-month-rule answers stop", () => {
  assertThrows(
    () =>
      compute({
        age_55_or_older: false,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "twelve monthly HDHP eligibility/coverage facts",
  );
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        last_month_rule_elected: undefined,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "last-month-rule answer",
  );
});

Deno.test("part1: mixed full-year coverage uses the larger worksheet or December limit", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.SelfOnly),
      ...Array(6).fill(CoverageType.Family),
    ],
    taxpayer_hsa_contributions: 8000,
  });
  assertEquals(
    firstForm(result)?.print_line3_limit,
    8550,
  );
  assertEquals(
    firstForm(result)?.print_line1_coverage,
    "family",
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction, 8000);
});

Deno.test("part1: mixed coverage with December self-only keeps the larger worksheet", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(7).fill(CoverageType.Family),
      ...Array(5).fill(CoverageType.SelfOnly),
    ],
    taxpayer_hsa_contributions: 6500,
  });
  assertEquals(
    firstForm(result)?.print_line3_limit,
    6779,
  );
  assertEquals(
    firstForm(result)?.print_line1_coverage,
    "family",
  );
});

Deno.test("part1: partial-year coverage uses the twelve-month worksheet", () => {
  const result = compute({
    ...uniformSelfOnly,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.SelfOnly),
      ...Array(6).fill(null),
    ],
    taxpayer_hsa_contributions: 2000,
  });
  assertEquals(
    firstForm(result)?.print_line3_limit,
    2150,
  );
});

Deno.test("part1: elected last-month rule uses December family coverage for the year", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(11).fill(null),
      CoverageType.Family,
    ],
    last_month_rule_elected: true,
    taxpayer_hsa_contributions: 8000,
  });
  assertEquals(
    firstForm(result)?.print_line3_limit,
    8550,
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction, 8000);
});

Deno.test("part1: elected last-month rule prints December self-only coverage", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(10).fill(CoverageType.Family),
      null,
      CoverageType.SelfOnly,
    ],
    last_month_rule_elected: true,
    taxpayer_hsa_contributions: 4000,
  });
  assertEquals(
    firstForm(result)?.print_line1_coverage,
    "self_only",
  );
  assertEquals(
    firstForm(result)?.print_line3_limit,
    4300,
  );
});

Deno.test("part1: married age-55 family catch-up uses eligible months on line 7", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.Family),
      ...Array(6).fill(null),
    ],
    married_at_year_end: true,
    spouse_has_separate_hsa: false,
    age_55_or_older: true,
    taxpayer_hsa_contributions: 4700,
  });
  assertEquals(
    firstForm(result)?.print_line3_limit,
    4275,
  );
  assertEquals(
    firstForm(result)?.print_line7_catchup,
    500,
  );
});

Deno.test("part1: last-month rule requires December eligibility", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        eligible_hdhp_coverage_by_month: [
          ...Array(11).fill(CoverageType.SelfOnly),
          null,
        ],
        last_month_rule_elected: true,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "requires December 1 HDHP eligibility",
  );
});

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("validation: obsolete singular IRA-to-HSA transfer key is rejected", () => {
  assertEquals(
    inputSchema.safeParse({
      ...uniformSelfOnly,
      beneficiary_identity: {
        owner: "T",
        name: "Alex Taxpayer",
        ssn: "123456789",
      },
      qualified_hsa_funding_distribution: { amount: 1_000 },
    }).success,
    false,
  );
});

Deno.test("validation: a W-2 HSA contribution does not imply self-only coverage", () => {
  assertThrows(
    () =>
      compute({
        employer_hsa_contributions: 1000,
        employer_contribution_years: {
          made_in_2025_for_2024_in_w2: 0,
          made_in_2026_for_2025: 0,
        },
      }),
    Error,
    "twelve monthly HDHP eligibility/coverage facts",
  );
});

Deno.test("validation: negative contributions throw", () => {
  assertThrows(() =>
    compute({
      taxpayer_hsa_contributions: -100,
    })
  );
});

Deno.test("validation: negative distributions throw", () => {
  assertThrows(() =>
    compute({
      hsa_distributions: -500,
    })
  );
});
