import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import {
  calculateForm8582CR,
  inputSchema as form8582crInputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../intermediate/forms/form8582cr/index.ts";
import {
  allocateForm3800CreditUse,
  allocateForm3800SourceTaxUse,
  calculateForm3800Nonpassive,
  classifyForm3800PassiveCredits,
  classifyForm8835Credits,
  deriveForm3800NonpassiveInput,
  form3800NonpassiveCreditUseRows,
  groupForm3800PassiveCreditVintages,
  splitForm3800PassiveCreditVintages,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "./calculation.ts";

Deno.test("Form 3800 source-use rows retain each nonpassive form and cent amount", () => {
  assertEquals(
    form3800NonpassiveCreditUseRows({
      form8826Credit: 100.25,
      form8820Credit: 200,
      form5884Credit: 50,
      form8936NewVehicleCredit: 75,
      form8936CommercialVehicleCredit: 25,
      facilities: [{
        form3800_line: "1f",
        credit_amount: 400,
        transfer_out_amount: 100,
        registration_number: "CAABC12ABCDE",
        transfer_election_statement_file_name: "Transfer statement.pdf",
        subject_to_passive_activity_limit: false,
      }],
    }),
    [
      {
        sourceKey: "nonpassive:8826",
        form3800CreditLine: "1e",
        originatingTaxYear: 2025,
        availableAfterPassiveLimit: 100.25,
      },
      {
        sourceKey: "nonpassive:8820",
        form3800CreditLine: "1h",
        originatingTaxYear: 2025,
        availableAfterPassiveLimit: 200,
      },
      {
        sourceKey: "nonpassive:8936-new",
        form3800CreditLine: "1y",
        originatingTaxYear: 2025,
        availableAfterPassiveLimit: 75,
      },
      {
        sourceKey: "nonpassive:8936-commercial",
        form3800CreditLine: "1aa",
        originatingTaxYear: 2025,
        availableAfterPassiveLimit: 25,
      },
      {
        sourceKey: "nonpassive:5884",
        form3800CreditLine: "4b",
        originatingTaxYear: 2025,
        availableAfterPassiveLimit: 50,
      },
      {
        sourceKey: "nonpassive:8835:1f",
        form3800CreditLine: "1f",
        originatingTaxYear: 2025,
        availableAfterPassiveLimit: 300,
      },
    ],
  );
  assertThrows(
    () =>
      form3800NonpassiveCreditUseRows({
        form8826Credit: 100.001,
        facilities: [],
      }),
    Error,
    "cent precision",
  );
});

Deno.test("Form 3800 retains the Form 8874 line 1i source before tax allocation", () => {
  assertEquals(
    form3800NonpassiveCreditUseRows({
      form8874Credit: 50_000,
      facilities: [],
    }),
    [{
      sourceKey: "nonpassive:8874",
      form3800CreditLine: "1i",
      originatingTaxYear: 2025,
      availableAfterPassiveLimit: 50_000,
    }],
  );
});
import { sourceAllocationSchema } from "../../intermediate/forms/form8582cr/source.ts";

Deno.test("Form 3800: classifies allowed passive credit into lines 3, 24, and 33", () => {
  const source = (
    activity: string,
    amount: number,
    route: PassiveCreditReportingRoute,
  ) => ({
    activity_reference: activity,
    source_form: "Form 3800 source form",
    source_origin: { kind: PassiveCreditSourceOrigin.Self },
    source_document_reference: `2025 ${activity} credit statement`,
    category: PassiveCreditCategory.Other,
    reporting_route: route,
    form3800_credit_line: route === PassiveCreditReportingRoute.Form3800Line3
      ? "1h"
      : route === PassiveCreditReportingRoute.Form3800Line24
      ? "3"
      : "4d",
    current_year_credit: amount,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  });
  const pac = calculateForm8582CR(form8582crInputSchema.parse({
    credit_sources: [
      source("Standard", 200, PassiveCreditReportingRoute.Form3800Line3),
      source("Empowerment", 300, PassiveCreditReportingRoute.Form3800Line24),
      source("Specified", 500, PassiveCreditReportingRoute.Form3800Line33),
    ],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_500,
  }));
  assertEquals(classifyForm3800PassiveCredits(pac.sourceAllocations), {
    line2: 200,
    line3: 100,
    line23: 300,
    line24: 150,
    line32: 500,
    line33: 250,
  });
});

Deno.test("Form 3800: passive line classification rejects nonbusiness and overallowed sources", () => {
  assertThrows(
    () =>
      classifyForm3800PassiveCredits([{
        reporting_route: PassiveCreditReportingRoute.Form8834,
        total_credit: 100,
        allowed_credit: 50,
      }]),
    Error,
    "does not belong",
  );
  assertThrows(
    () =>
      classifyForm3800PassiveCredits([{
        reporting_route: PassiveCreditReportingRoute.Form3800Line3,
        total_credit: 100,
        allowed_credit: 101,
      }]),
    Error,
    "whole-dollar",
  );
  assertThrows(
    () =>
      classifyForm3800PassiveCredits([{
        reporting_route: PassiveCreditReportingRoute.Form3800Line33,
        total_credit: 100.5,
        allowed_credit: 50,
      }]),
    Error,
    "whole-dollar",
  );
});

Deno.test("Form 3800: line 2 includes prior passive credit before limitation", () => {
  const pac = calculateForm8582CR(form8582crInputSchema.parse({
    credit_sources: [{
      activity_reference: "Clinical activity",
      source_form: "Form 8820",
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      source_document_reference: "2025 clinical credit statement",
      category: PassiveCreditCategory.Other,
      reporting_route: PassiveCreditReportingRoute.Form3800Line3,
      form3800_credit_line: "1h",
      current_year_credit: 100,
      prior_unallowed_credits: [{
        originating_tax_year: 2023,
        credit_amount: 400,
        source_document_reference: "2023 clinical credit carryover",
      }],
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_800,
  }));
  assertEquals(classifyForm3800PassiveCredits(pac.sourceAllocations), {
    line2: 500,
    line3: 200,
    line23: 0,
    line24: 0,
    line32: 0,
    line33: 0,
  });
  assertEquals(splitForm3800PassiveCreditVintages(pac.sourceAllocations[0]), [
    {
      activityReference: "Clinical activity",
      sourceForm: "Form 8820",
      sourceOrigin: { kind: PassiveCreditSourceOrigin.Self },
      sourceDocumentReference: "2023 clinical credit carryover",
      reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
      form3800CreditLine: "1h",
      originatingTaxYear: 2023,
      beforePassiveLimit: 400,
      afterPassiveLimit: 200,
    },
    {
      activityReference: "Clinical activity",
      sourceForm: "Form 8820",
      sourceOrigin: { kind: PassiveCreditSourceOrigin.Self },
      sourceDocumentReference: "2025 clinical credit statement",
      reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
      form3800CreditLine: "1h",
      originatingTaxYear: 2025,
      beforePassiveLimit: 100,
      afterPassiveLimit: 0,
    },
  ]);
});

Deno.test("Form 3800: passive source vintages keep oldest carryovers first", () => {
  const pac = calculateForm8582CR(form8582crInputSchema.parse({
    credit_sources: [{
      activity_reference: "Rental",
      source_form: "Form 3468",
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      source_document_reference: "2025 rehabilitation statement",
      category: PassiveCreditCategory.Other,
      reporting_route: PassiveCreditReportingRoute.Form3800Line33,
      form3800_credit_line: "4a",
      current_year_credit: 300,
      prior_unallowed_credits: [
        {
          originating_tax_year: 2024,
          credit_amount: 200,
          source_document_reference: "2024 carryover",
        },
        {
          originating_tax_year: 2022,
          credit_amount: 100,
          source_document_reference: "2022 carryover",
        },
      ],
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_750,
  }));
  assertEquals(
    splitForm3800PassiveCreditVintages(pac.sourceAllocations[0]).map(
      ({ originatingTaxYear, beforePassiveLimit, afterPassiveLimit }) => ({
        originatingTaxYear,
        beforePassiveLimit,
        afterPassiveLimit,
      }),
    ),
    [
      {
        originatingTaxYear: 2022,
        beforePassiveLimit: 100,
        afterPassiveLimit: 100,
      },
      {
        originatingTaxYear: 2024,
        beforePassiveLimit: 200,
        afterPassiveLimit: 150,
      },
      {
        originatingTaxYear: 2025,
        beforePassiveLimit: 300,
        afterPassiveLimit: 0,
      },
    ],
  );
});

Deno.test("Form 3800: Form 8834 vintage cannot enter the general business credit", () => {
  const pac = calculateForm8582CR(form8582crInputSchema.parse({
    credit_sources: [{
      activity_reference: "Legacy vehicle",
      source_form: "Form 8834",
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      source_document_reference: "2024 Form 8834 credit statement",
      category: PassiveCreditCategory.Other,
      reporting_route: PassiveCreditReportingRoute.Form8834,
      current_year_credit: 0,
      prior_unallowed_credits: [{
        originating_tax_year: 2024,
        credit_amount: 100,
        source_document_reference: "2024 Form 8834 carryover",
      }],
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_900,
  }));
  assertThrows(
    () => splitForm3800PassiveCreditVintages(pac.sourceAllocations[0]),
    Error,
    "does not belong",
  );
});

Deno.test("Form 3800: groups same-line passive sources without losing activity or vintage", () => {
  const source = (
    activityReference: string,
    originatingTaxYear: number,
    beforePassiveLimit: number,
    afterPassiveLimit: number,
  ) => ({
    activityReference,
    sourceForm: "Form 8820",
    sourceOrigin: { kind: PassiveCreditSourceOrigin.Self } as const,
    sourceDocumentReference:
      `${originatingTaxYear} ${activityReference} statement`,
    form3800CreditLine: "1h" as const,
    reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
    originatingTaxYear,
    beforePassiveLimit,
    afterPassiveLimit,
  });
  const rows = groupForm3800PassiveCreditVintages([
    source("B", 2025, 300, 200),
    source("A", 2023, 100, 100),
    source("A", 2025, 200, 100),
  ]);
  assertEquals(
    rows.map((row) => ({
      line: row.form3800CreditLine,
      year: row.originatingTaxYear,
      before: row.beforePassiveLimit,
      after: row.afterPassiveLimit,
      activities: row.sources.map((entry) => entry.activityReference),
    })),
    [
      { line: "1h", year: 2023, before: 100, after: 100, activities: ["A"] },
      {
        line: "1h",
        year: 2025,
        before: 500,
        after: 300,
        activities: ["B", "A"],
      },
    ],
  );
});

Deno.test("Form 3800 tax use applies oldest carryovers before current-year credit", () => {
  const sources = [
    {
      sourceKey: "current",
      form3800CreditLine: "1h" as const,
      originatingTaxYear: 2025,
      availableAfterPassiveLimit: 300,
    },
    {
      sourceKey: "oldest",
      form3800CreditLine: "1h" as const,
      originatingTaxYear: 2022,
      availableAfterPassiveLimit: 100,
    },
    {
      sourceKey: "prior",
      form3800CreditLine: "1h" as const,
      originatingTaxYear: 2024,
      availableAfterPassiveLimit: 200,
    },
  ];
  const allocated = allocateForm3800CreditUse(sources, {
    line6: 600,
    line17: 250,
    line25: 0,
    line26: 0,
    line36: 0,
    line37: 0,
  });
  assertEquals(
    allocated.map(({ sourceKey, appliedAgainstTax, unusedAfterTaxLimit }) => ({
      sourceKey,
      appliedAgainstTax,
      unusedAfterTaxLimit,
    })),
    [
      { sourceKey: "current", appliedAgainstTax: 0, unusedAfterTaxLimit: 300 },
      { sourceKey: "oldest", appliedAgainstTax: 100, unusedAfterTaxLimit: 0 },
      { sourceKey: "prior", appliedAgainstTax: 150, unusedAfterTaxLimit: 50 },
    ],
  );
});

Deno.test("Form 3800 tax use keeps Form 8826 cents after an older passive carryover", () => {
  const allocated = allocateForm3800CreditUse([
    {
      sourceKey: "access",
      form3800CreditLine: "1e",
      originatingTaxYear: 2025,
      availableAfterPassiveLimit: 100.25,
    },
    {
      sourceKey: "passive-prior",
      form3800CreditLine: "1h",
      originatingTaxYear: 2023,
      availableAfterPassiveLimit: 100,
    },
  ], {
    line6: 200.25,
    line17: 100.10,
    line25: 0,
    line26: 0,
    line36: 0,
    line37: 0,
  });
  assertEquals(allocated.map((row) => row.appliedAgainstTax), [0.10, 100]);
  assertEquals(allocated.map((row) => row.unusedAfterTaxLimit), [100.15, 0]);
});

Deno.test("Form 3800 source-use bridge handles nonpassive-only credits", () => {
  const lines = calculateForm3800Nonpassive({
    filingStatus: FilingStatus.Single,
    regularTax: 50,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 0,
    standardCredit: 100.25,
    specifiedCredit: 0,
  }, ZERO_FORM3800_PASSIVE_ACTIVITY);
  const result = allocateForm3800SourceTaxUse([], [{
    sourceKey: "nonpassive:8826",
    form3800CreditLine: "1e",
    originatingTaxYear: 2025,
    availableAfterPassiveLimit: 100.25,
  }], lines);
  assertEquals(result.passiveVintages, []);
  assertEquals(result.nonpassiveSources[0].appliedAgainstTax, 50);
  assertEquals(result.nonpassiveSources[0].unusedAfterTaxLimit, 50.25);
});

Deno.test("Form 3800 tax use follows the named same-year credit-type order", () => {
  const sources = [
    {
      sourceKey: "orphan",
      form3800CreditLine: "1h" as const,
      originatingTaxYear: 2025,
      availableAfterPassiveLimit: 200,
    },
    {
      sourceKey: "access",
      form3800CreditLine: "1e" as const,
      originatingTaxYear: 2025,
      availableAfterPassiveLimit: 300,
    },
  ];
  const lines = {
    line6: 500,
    line17: 250,
    line25: 0,
    line26: 0,
    line36: 0,
    line37: 0,
  };
  assertEquals(
    allocateForm3800CreditUse(sources, lines).map((row) =>
      row.appliedAgainstTax
    ),
    [0, 250],
  );
  assertEquals(
    allocateForm3800CreditUse(sources, {
      ...lines,
      line17: 500,
    }).map((row) => row.appliedAgainstTax),
    [200, 300],
  );
  assertThrows(
    () => allocateForm3800CreditUse(sources, { ...lines, line6: 499 }),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 3800 tax use stops an ambiguous partial same-year source order", () => {
  const sources = [
    {
      sourceKey: "other",
      form3800CreditLine: "1zz" as const,
      originatingTaxYear: 2025,
      availableAfterPassiveLimit: 200,
    },
    {
      sourceKey: "access",
      form3800CreditLine: "1e" as const,
      originatingTaxYear: 2025,
      availableAfterPassiveLimit: 300,
    },
  ];
  assertThrows(
    () =>
      allocateForm3800CreditUse(sources, {
        line6: 500,
        line17: 250,
        line25: 0,
        line26: 0,
        line36: 0,
        line37: 0,
      }),
    Error,
    "need the IRS credit-type order",
  );
});

Deno.test("Form 3800 passive source years reconcile with nonpassive credit ordering", () => {
  const source = sourceAllocationSchema.parse({
    activity_reference: "Clinical activity",
    source_form: "Form 8820",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership",
      ein: "123456789",
    },
    source_document_reference: "2025 clinical statement",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1h",
    current_year_credit: 300,
    prior_unallowed_credits: [{
      originating_tax_year: 2023,
      credit_amount: 200,
      source_document_reference: "2023 clinical statement",
    }],
    publicly_traded_partnership: false,
    total_credit: 500,
    special_allowed_credit: 0,
    unallowed_credit: 200,
    allowed_credit: 300,
  });
  const reconciledSource = {
    ...source,
    source_statement_reference: source.source_statement_reference,
  } as Parameters<typeof allocateForm3800SourceTaxUse>[0][number];
  const lines = calculateForm3800Nonpassive({
    filingStatus: FilingStatus.Single,
    regularTax: 250,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 0,
    standardCredit: 100,
    specifiedCredit: 0,
  }, classifyForm3800PassiveCredits([source]));
  const otherSources = [{
    sourceKey: "disabled-access",
    form3800CreditLine: "1e" as const,
    originatingTaxYear: 2025,
    availableAfterPassiveLimit: 100,
  }];
  assertEquals(
    allocateForm3800SourceTaxUse([reconciledSource], otherSources, lines)
      .passiveVintages
      .map(
        (row) => ({
          year: row.originatingTaxYear,
          before: row.beforePassiveLimit,
          after: row.afterPassiveLimit,
          applied: row.appliedAgainstTax,
          unused: row.unusedAfterTaxLimit,
          sourceOrigin: row.sourceOrigin,
        }),
      ),
    [
      {
        year: 2023,
        before: 200,
        after: 200,
        applied: 200,
        unused: 0,
        sourceOrigin: {
          kind: PassiveCreditSourceOrigin.Partnership,
          entity_reference: "Clinical partnership",
          ein: "123456789",
        },
      },
      {
        year: 2025,
        before: 300,
        after: 100,
        applied: 0,
        unused: 100,
        sourceOrigin: {
          kind: PassiveCreditSourceOrigin.Partnership,
          entity_reference: "Clinical partnership",
          ein: "123456789",
        },
      },
    ],
  );
  assertEquals(
    allocateForm3800SourceTaxUse([reconciledSource], otherSources, lines)
      .nonpassiveSources.map((row) => row.appliedAgainstTax),
    [50],
  );
  assertThrows(
    () => allocateForm3800SourceTaxUse([reconciledSource], [], lines),
    Error,
    "does not reconcile",
  );
  const centLines = calculateForm3800Nonpassive({
    filingStatus: FilingStatus.Single,
    regularTax: 250.10,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 0,
    standardCredit: 100.25,
    specifiedCredit: 0,
  }, classifyForm3800PassiveCredits([source]));
  assertEquals(
    allocateForm3800SourceTaxUse([reconciledSource], [{
      ...otherSources[0],
      availableAfterPassiveLimit: 100.25,
    }], centLines).passiveVintages.map((row) => row.appliedAgainstTax),
    [200, 0],
  );
  assertEquals(
    allocateForm3800SourceTaxUse([reconciledSource], [{
      ...otherSources[0],
      availableAfterPassiveLimit: 100.25,
    }], centLines).nonpassiveSources[0].appliedAgainstTax,
    50.10,
  );
});

function input(overrides: Record<string, number> = {}) {
  return {
    filingStatus: FilingStatus.Single as const,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 0,
    specifiedCredit: 0,
    ...overrides,
  };
}

const returnLines = {
  filingStatus: FilingStatus.Single,
  form1040Line16: 42_000,
  schedule2Line1z: 3_000,
  educationCreditRecaptureTaxIncludedInLine7Sources: 500,
  form8621TaxIncludedInLine7Sources: 1_000,
  deferred965TaxIncludedInLine7Sources: 0,
  triggering965TaxIncludedInLine7Sources: 0,
  form6251Line11: 2_000,
  form6251Line9: 18_000,
  form1040Line19: 2_000,
  schedule3Line1: 1_000,
  schedule3Line2: 300,
  schedule3Line3: 400,
  schedule3Line4: 500,
  schedule3Line5a: 600,
  schedule3Line5b: 700,
  schedule3Line7: 5_000,
  schedule3Line6aGbc: 3_000,
  schedule3Line6bPriorMinimumTax: 1_000,
  form8912CreditInSchedule3Line7: 200,
};

Deno.test("Form 3800: derives Part II tax and prior credits from finalized return lines", () => {
  const credits = classifyForm8835Credits([{
    form3800_line: "1f",
    credit_amount: 5_000,
    transfer_out_amount: 0,
    subject_to_passive_activity_limit: false,
  }]);
  const derived = deriveForm3800NonpassiveInput(returnLines, credits);
  assertEquals(derived.regularTax, 43_500);
  assertEquals(derived.alternativeMinimumTax, 2_000);
  assertEquals(derived.foreignTaxCredit, 1_000);
  assertEquals(derived.priorAllowableCredits, 5_300);
  assertEquals(derived.tentativeMinimumTax, 18_000);
  assertEquals(derived.standardCredit, 5_000);
});

Deno.test("Form 3800: rejects exclusions that exceed their source lines", () => {
  const credits = classifyForm8835Credits([{
    form3800_line: "1f",
    credit_amount: 100,
    transfer_out_amount: 0,
    subject_to_passive_activity_limit: false,
  }]);
  assertThrows(
    () =>
      deriveForm3800NonpassiveInput({
        ...returnLines,
        schedule3Line6aGbc: 6_000,
      }, credits),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      deriveForm3800NonpassiveInput({
        ...returnLines,
        filingStatus: FilingStatus.MFS,
      }, credits),
    Error,
    "spouse business-credit answer",
  );
});

Deno.test("Form 3800 Part II: MFS threshold depends on spouse business credit", () => {
  const base = input({ regularTax: 20_000 });
  const withSpouseCredit = calculateForm3800Nonpassive({
    ...base,
    filingStatus: FilingStatus.MFS,
    spouseHasBusinessCredit: true,
  }, ZERO_FORM3800_PASSIVE_ACTIVITY);
  const withoutSpouseCredit = calculateForm3800Nonpassive({
    ...base,
    filingStatus: FilingStatus.MFS,
    spouseHasBusinessCredit: false,
  }, ZERO_FORM3800_PASSIVE_ACTIVITY);
  assertEquals(withSpouseCredit.line13, 1_875);
  assertEquals(withoutSpouseCredit.line13, 0);
});

Deno.test("Form 3800 Part II: ordinary credit cannot exceed tax above TMT", () => {
  const result = calculateForm3800Nonpassive(
    input({ standardCredit: 30_000 }),
    ZERO_FORM3800_PASSIVE_ACTIVITY,
  );
  assertEquals(result.line13, 3_750);
  assertEquals(result.line15, 20_000);
  assertEquals(result.line16, 20_000);
  assertEquals(result.line17, 20_000);
  assertEquals(result.line38, 20_000);
  assertEquals(result.unusedStandardCredit, 10_000);
});

Deno.test("Form 3800 Part II: specified credit reaches section C after ordinary credit", () => {
  const result = calculateForm3800Nonpassive(
    input({
      standardCredit: 30_000,
      specifiedCredit: 15_000,
    }),
    ZERO_FORM3800_PASSIVE_ACTIVITY,
  );
  assertEquals(result.line17, 20_000);
  assertEquals(result.line27, 36_250);
  assertEquals(result.line29, 16_250);
  assertEquals(result.line37, 15_000);
  assertEquals(result.line38, 35_000);
});

Deno.test("Form 3800 Part II: foreign and prior credits reduce net income tax", () => {
  const result = calculateForm3800Nonpassive(
    input({
      foreignTaxCredit: 3_000,
      priorAllowableCredits: 10_000,
      tentativeMinimumTax: 5_000,
      standardCredit: 30_000,
    }),
    ZERO_FORM3800_PASSIVE_ACTIVITY,
  );
  assertEquals(result.line10c, 13_000);
  assertEquals(result.line11, 27_000);
  assertEquals(result.line12, 27_000);
  assertEquals(result.line13, 500);
  assertEquals(result.line17, 22_000);
});

Deno.test("Form 3800 Part II: no net income tax allows no business credit", () => {
  const result = calculateForm3800Nonpassive(
    input({
      regularTax: 5_000,
      foreignTaxCredit: 5_000,
      tentativeMinimumTax: 0,
      standardCredit: 4_000,
      specifiedCredit: 3_000,
    }),
    ZERO_FORM3800_PASSIVE_ACTIVITY,
  );
  assertEquals(result.line11, 0);
  assertEquals(result.line38, 0);
  assertEquals(result.unusedStandardCredit, 4_000);
  assertEquals(result.unusedSpecifiedCredit, 3_000);
});

Deno.test("Form 3800 Part II: AMT and TMT are distinct inputs", () => {
  const result = calculateForm3800Nonpassive(
    input({
      regularTax: 20_000,
      alternativeMinimumTax: 5_000,
      tentativeMinimumTax: 25_000,
      standardCredit: 1_000,
      specifiedCredit: 1_000,
    }),
    ZERO_FORM3800_PASSIVE_ACTIVITY,
  );
  assertEquals(result.line8, 5_000);
  assertEquals(result.line14, 25_000);
  assertEquals(result.line17, 0);
  assertEquals(result.line37, 1_000);
});

Deno.test("Form 3800 Part II: passive standard, empowerment, and specified credits use their separate limits", () => {
  const result = calculateForm3800Nonpassive(
    input({
      standardCredit: 1_000,
      specifiedCredit: 3_000,
    }),
    {
      line2: 4_000,
      line3: 2_000,
      line23: 9_000,
      line24: 5_000,
      line32: 12_000,
      line33: 7_000,
    },
  );
  assertEquals(result.line6, 3_000);
  assertEquals(result.line17, 3_000);
  assertEquals(result.line18, 15_000);
  assertEquals(result.line21, 22_000);
  assertEquals(result.line25, 5_000);
  assertEquals(result.line26, 5_000);
  assertEquals(result.line28, 8_000);
  assertEquals(result.line29, 28_250);
  assertEquals(result.line36, 10_000);
  assertEquals(result.line37, 10_000);
  assertEquals(result.line38, 18_000);
});

Deno.test("Form 3800 Part II: empowerment credit is limited after standard credit", () => {
  const result = calculateForm3800Nonpassive(
    input({
      standardCredit: 20_000,
    }),
    {
      ...ZERO_FORM3800_PASSIVE_ACTIVITY,
      line23: 10_000,
      line24: 10_000,
    },
  );
  assertEquals(result.line17, 20_000);
  assertEquals(result.line21, 5_000);
  assertEquals(result.line26, 5_000);
  assertEquals(result.line38, 25_000);
});

Deno.test("Form 3800 Part II: rejects passive credit exceeding its before-limit line", () => {
  assertThrows(
    () =>
      calculateForm3800Nonpassive(input(), {
        ...ZERO_FORM3800_PASSIVE_ACTIVITY,
        line23: 99,
        line24: 100,
      }),
    Error,
    "exceeds credit before limitation",
  );
});

Deno.test("Form 3800 Part II: rejects negative and nonfinite source amounts", () => {
  assertThrows(() =>
    calculateForm3800Nonpassive(
      input({ standardCredit: -1 }),
      ZERO_FORM3800_PASSIVE_ACTIVITY,
    )
  );
  assertThrows(() =>
    calculateForm3800Nonpassive(
      input({ regularTax: Number.NaN }),
      ZERO_FORM3800_PASSIVE_ACTIVITY,
    )
  );
});

Deno.test("Form 3800: separates Form 8835 Part III lines 1f and 4e after transfer", () => {
  const result = classifyForm8835Credits([
    {
      form3800_line: "1f",
      credit_amount: 4_000,
      transfer_out_amount: 0,
      subject_to_passive_activity_limit: false,
    },
    {
      form3800_line: "4e",
      credit_amount: 13_200,
      transfer_out_amount: 5_000,
      registration_number: "CAABC12ABCDE",
      subject_to_passive_activity_limit: false,
      transfer_election_statement_file_name: "Transfer Election Statement.pdf",
    },
  ]);
  assertEquals(result.standardCredit, 4_000);
  assertEquals(result.specifiedCredit, 8_200);
  assertEquals(result.rows.map((row) => row.line), ["1f", "4e"]);
  assertEquals(result.rows[1].transferOutAmount, 5_000);
  assertEquals(result.transferStatementFileNames, [
    "Transfer Election Statement.pdf",
  ]);
});

Deno.test("Form 3800: no Form 8835 facilities leave its credit classification empty", () => {
  const result = classifyForm8835Credits([]);
  assertEquals(result.standardCredit, 0);
  assertEquals(result.specifiedCredit, 0);
  assertEquals(result.rows, []);
});

Deno.test("Form 3800: multiple same-line facilities require Part V detail", () => {
  const result = classifyForm8835Credits([
    {
      form3800_line: "4e",
      credit_amount: 3_000,
      transfer_out_amount: 0,
      subject_to_passive_activity_limit: false,
    },
    {
      form3800_line: "4e",
      credit_amount: 6_000,
      transfer_out_amount: 0,
      subject_to_passive_activity_limit: false,
    },
  ]);
  assertEquals(result.rows[0].facilityCount, 2);
  assertEquals(result.rows[0].availableCredit, 9_000);
  assertEquals(result.rows[0].facilities.length, 2);
});

Deno.test("Form 3800: transfer cannot omit the signed statement file", () => {
  assertThrows(() =>
    classifyForm8835Credits([{
      form3800_line: "4e",
      credit_amount: 1_000,
      transfer_out_amount: 500,
      registration_number: "CAABC12ABCDE",
      subject_to_passive_activity_limit: false,
    }])
  );
});

Deno.test("Form 3800: passive Form 8835 credit cannot enter nonpassive limits", () => {
  assertThrows(
    () =>
      classifyForm8835Credits([{
        form3800_line: "4e",
        credit_amount: 1_000,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: true,
      }]),
    Error,
    "8582-CR",
  );
});
