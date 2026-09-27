import { assertEquals, assertThrows } from "@std/assert";
import { form8815, type Form8815Input, inputSchema } from "./index.ts";
import { FilingStatus } from "../../../types.ts";
import { form8815 as mef8815 } from "../../../../2025/mef/forms/f8815.ts";
import { form8815Pdf } from "../../../../2025/pdf/forms/f8815.ts";
import { FilingStatus as MefFilingStatus } from "../../../../mef/header.ts";

const source: Form8815Input = {
  eligible_students: [{
    person_name: "Alex Example",
    institution_name: "Example University",
    institution_address: {
      line1: "1 College Ave",
      city: "Boston",
      state: "MA",
      zip: "02108",
    },
  }],
  qualified_bond_facts: {
    series_ee_or_i: true,
    issued_after_1989: true,
    owned_by_taxpayer_or_spouse: true,
    owner_age_at_issue_at_least_24: true,
    redemption_records_retained: true,
  },
  education_facts: {
    all_students_are_taxpayer_spouse_or_claimed_dependents: true,
    all_institutions_eligible: true,
    expenses_are_eligible_2025_tuition_or_fees: true,
    expenses_not_used_for_education_credit_or_tax_free_distribution: true,
    no_coverdell_or_qtp_contributions_in_claim: true,
    nontaxable_benefits_paid_directly_by_institution_excluded: true,
  },
  line2_qualified_education_expenses: 15_000,
  line3_nontaxable_education_benefits: 0,
  bond_proceeds: 12_000,
  line6_worksheet: {
    paper_ee_face_value: 20_000,
    electronic_ee_and_i_face_value: 0,
    interest_reported_in_prior_years: 0,
  },
  line9_worksheet: {
    schedule_b_line2_interest: 2_000,
    other_1040_and_schedule1_income: 70_000,
    schedule1_adjustments: 0,
    foreign_adoption_and_puerto_rico_addbacks: 0,
    finalized_2025_income_lines_reviewed: true,
    no_royalty_interest_special_computation: true,
  },
  filing_status: FilingStatus.Single,
};

function compute(changes: Record<string, unknown> = {}) {
  return form8815.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ ...source, ...changes }),
  );
}

function lines(changes: Record<string, unknown> = {}) {
  const result = compute(changes);
  return {
    form: result.outputs.find((item) => item.nodeType === "form8815")?.fields,
    scheduleB: result.outputs.find((item) => item.nodeType === "schedule_b")
      ?.fields,
  };
}

for (
  const filingStatus of [
    FilingStatus.Single,
    FilingStatus.HOH,
    FilingStatus.QSS,
  ]
) {
  Deno.test(`2025 ${filingStatus} $99,500 start and $114,500 end`, () => {
    const atStart = lines({
      filing_status: filingStatus,
      line9_worksheet: {
        ...source.line9_worksheet,
        other_1040_and_schedule1_income: 97_500,
      },
    });
    assertEquals(atStart.form?.line10, 99_500);
    assertEquals(atStart.form?.line14, 2_000);
    assertEquals(atStart.scheduleB?.ee_bond_exclusion, atStart.form?.line14);
    const midpoint = lines({
      filing_status: filingStatus,
      line9_worksheet: {
        ...source.line9_worksheet,
        other_1040_and_schedule1_income: 105_000,
      },
    });
    assertEquals(midpoint.form?.line9, 107_000);
    assertEquals(midpoint.form?.line14, 1_000);
    assertThrows(
      () =>
        compute({
          filing_status: filingStatus,
          line9_worksheet: {
            ...source.line9_worksheet,
            other_1040_and_schedule1_income: 112_500,
          },
        }),
      Error,
      "ceiling",
    );
  });
}

Deno.test("2025 MFJ $149,250 start and $179,250 end", () => {
  const start = lines({
    filing_status: FilingStatus.MFJ,
    line9_worksheet: {
      ...source.line9_worksheet,
      other_1040_and_schedule1_income: 147_250,
    },
  });
  assertEquals(start.form?.line10, 149_250);
  assertEquals(start.form?.line14, 2_000);
  const midpoint = lines({
    filing_status: FilingStatus.MFJ,
    line9_worksheet: {
      ...source.line9_worksheet,
      other_1040_and_schedule1_income: 162_250,
    },
  });
  assertEquals(midpoint.form?.line14, 1_000);
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.MFJ,
        line9_worksheet: {
          ...source.line9_worksheet,
          other_1040_and_schedule1_income: 177_250,
        },
      }),
    Error,
    "ceiling",
  );
});

Deno.test("education benefit and proceeds calculate lines 2-8", () => {
  const result = lines({
    line2_qualified_education_expenses: 10_000,
    line3_nontaxable_education_benefits: 2_000,
  });
  assertEquals(result.form?.line2, 10_000);
  assertEquals(result.form?.line3, 2_000);
  assertEquals(result.form?.line4, 8_000);
  assertEquals(result.form?.line5, 12_000);
  assertEquals(result.form?.line6, 2_000);
  assertEquals(result.form?.line7, 0.667);
  assertEquals(result.form?.line8, 1_334);
  assertEquals(result.scheduleB?.ee_bond_exclusion, result.form?.line14);
});

Deno.test("line 4 equal to proceeds gives the full line 6 interest", () => {
  const result = lines({
    line2_qualified_education_expenses: 14_000,
    line3_nontaxable_education_benefits: 2_000,
  });
  assertEquals(result.form?.line4, 12_000);
  assertEquals(result.form?.line7, 1);
  assertEquals(result.form?.line14, 2_000);
});

Deno.test("line 6 worksheet removes interest already reported in earlier years", () => {
  const result = lines({
    line6_worksheet: {
      ...source.line6_worksheet,
      interest_reported_in_prior_years: 500,
    },
  });
  assertEquals(result.form?.line6, 1_500);
  assertEquals(result.form?.line14, 1_500);
});

Deno.test("MFS, exhausted expenses, and unqualified bonds fail closed", () => {
  assertThrows(
    () => compute({ filing_status: FilingStatus.MFS }),
    Error,
    "separately",
  );
  assertThrows(
    () => compute({ line3_nontaxable_education_benefits: 15_000 }),
    Error,
    "line 4",
  );
  assertThrows(() =>
    compute({
      qualified_bond_facts: {
        ...source.qualified_bond_facts,
        issued_after_1989: false,
      },
    })
  );
});

Deno.test("omitted proceeds, MAGI worksheet, and old guessed fields are rejected", () => {
  const { bond_proceeds: _proceeds, ...withoutProceeds } = source;
  const { line9_worksheet: _worksheet, ...withoutMagi } = source;
  assertThrows(() => inputSchema.parse(withoutProceeds));
  assertThrows(() => inputSchema.parse(withoutMagi));
  assertThrows(() =>
    inputSchema.parse({
      ...source,
      line6_worksheet: {
        ...source.line6_worksheet,
        interest_reported_in_prior_years: -1,
      },
    })
  );
  assertThrows(() => inputSchema.parse({ ...source, ee_bond_interest: 2_000 }));
  assertThrows(() => inputSchema.parse({ ...source, modified_agi: 72_000 }));
  assertThrows(() =>
    inputSchema.parse({ ...source, qualified_expenses: 15_000 })
  );
});

Deno.test("native MeF lines and Schedule B line 3 reconcile", () => {
  const result = lines({
    line2_qualified_education_expenses: 10_000,
    line3_nontaxable_education_benefits: 2_000,
  });
  const fields = {
    ...source,
    line2_qualified_education_expenses: 10_000,
    line3_nontaxable_education_benefits: 2_000,
    ...result.form,
  };
  const xml = mef8815.build(fields, {
    pending: {
      schedule_b: {
        ee_bond_exclusion: result.scheduleB?.ee_bond_exclusion,
        print_line2_total: 2_000,
      },
    },
  });
  assertEquals(
    xml.includes("<EligiblePersonNm>Alex Example</EligiblePersonNm>"),
    true,
  );
  assertEquals(
    xml.includes(
      "<ExclBondIntTxblEducBenefitAmt>8000</ExclBondIntTxblEducBenefitAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes(
      "<ExclBondIntTxblExpnsBondProcRt>0.667</ExclBondIntTxblExpnsBondProcRt>",
    ),
    true,
  );
  assertEquals(
    xml.includes(
      "<ExcludableSavingsBondIntAmt>1334</ExcludableSavingsBondIntAmt>",
    ),
    true,
  );
  assertEquals(xml.includes("ExclBondIntExcessAGIRt"), false);
  assertEquals(xml.includes("SavingsBondInterestAmt"), false);
  assertThrows(() => mef8815.build({ ...fields, line14: 1 }), Error, "line14");
  assertThrows(() => mef8815.build(source), Error, "computed 2025 lines");
  assertThrows(() => mef8815.build(fields), Error, "Schedule B pending");
  assertThrows(
    () =>
      mef8815.build(fields, {
        filer: {
          primarySSN: "123456789",
          nameLine1: "ALEX EXAMPLE",
          nameControl: "EXAM",
          address: {
            line1: "1 Main St",
            city: "Boston",
            state: "MA",
            zip: "02108",
          },
          filingStatus: MefFilingStatus.MarriedFilingJointly,
        },
        pending: {
          schedule_b: {
            ee_bond_exclusion: result.scheduleB?.ee_bond_exclusion,
            print_line2_total: 2_000,
          },
        },
      }),
    Error,
    "filing status differs",
  );
});

Deno.test("PDF projection uses computed lines and beneficiary fields", () => {
  const result = lines();
  const fields = { ...source, ...result.form };
  const projected = form8815Pdf.projectFields?.(fields, {});
  assertEquals(projected?.student_1_name, "Alex Example");
  assertEquals(projected?.student_1_institution, "Example University");
  assertEquals(projected?.student_1_address, "1 College Ave, Boston, MA 02108");
  assertEquals(projected?.line7_whole, "1");
  assertEquals(projected?.line7_fraction, "000");
  assertEquals(projected?.line14, 2_000);
  assertEquals(form8815Pdf.pageIndices?.(fields), [0]);
});
