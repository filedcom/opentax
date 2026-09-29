// Black-box tests for intermediate node: form8880
// Sources: nodes/2025/f1040/intermediate/form8880/research/context.md
// These tests define IRS-correct behavior. If a test fails, fix the implementation — not the test.
//
// Design notes:
//   - Credit rate is determined by AGI and filing status.
//   - TY2025 AGI limits: Single/MFS/QSS <=$23,750=50%, <=$25,500=20%, <=$39,500=10%.
//   - TY2025 AGI limits: HOH <=$35,625=50%, <=$38,250=20%, <=$59,250=10%.
//   - TY2025 AGI limits: MFJ <=$47,500=50%, <=$51,000=20%, <=$79,000=10%.
//   - Contribution cap per person: $2,000.
//   - Credit = total_eligible × rate; routed to schedule3 line4_retirement_savings_credit.
//   - Nonrefundable; a positive claim requires a sourced tax-liability limit.

import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8880,
  eligibleW2DeferralAmount,
  form8880,
  inputSchema,
} from "./index.ts";
import type { NodeOutput } from "../../../../../../core/types/tax-node.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { FilingStatus } from "../../../types.ts";

const noJointDistributions = {
  filing_due_date: "2026-04-15" as const,
  reviewed_distribution_sources_ref:
    "Reviewed 2023 through prefiling 2026 IRA and plan distributions",
  entries: [],
  no_other_qualifying_distributions_in_lookback: true as const,
};

function compute(input: Record<string, unknown>) {
  // Unit-test projection of the pure calculation. The production graph obtains
  // capacity only at Form 1040 finalization, covered by form8880_finalization.test.ts.
  const { income_tax_liability, ...facts } = input;
  const source = inputSchema.parse({
    taxpayer_dob: "1980-01-01",
    spouse_dob: "1981-01-01",
    taxpayer_student_five_months: false,
    spouse_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
    spouse_claimed_as_dependent: false,
    ...facts,
  });
  const capacity = typeof income_tax_liability === "number"
    ? income_tax_liability
    : 1_000_000;
  const calculated = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    capacity,
  );
  const contributions = (source.ira_contributions_taxpayer ?? 0) +
    (source.ira_contributions_spouse ?? 0) +
    (source.elective_deferrals_taxpayer ?? 0) +
    (source.elective_deferrals_spouse ?? 0) +
    (source.w2_deferral_entries ?? []).reduce(
      (sum, entry) => sum + eligibleW2DeferralAmount(entry),
      0,
    );
  const outputs: NodeOutput[] = contributions === 0
    ? []
    : calculated.calculatedZero
    ? [{ nodeType: "form8880", fields: { calculated_zero_credit: true } }]
    : [
      {
        nodeType: "schedule3",
        fields: { line4_retirement_savings_credit: calculated.credit },
      },
      { nodeType: "form8880", fields: calculated.printFields },
    ];
  return { outputs };
}

function assertCalculatedZero(result: ReturnType<typeof compute>) {
  assertEquals(result.outputs, [{
    nodeType: "form8880",
    fields: { calculated_zero_credit: true },
  }]);
}

Deno.test("form8880: early node carries source without claiming Schedule 3 line 4", () => {
  const result = form8880.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      ira_contributions_taxpayer: 2_000,
      agi: 20_000,
      filing_status: FilingStatus.Single,
    },
  );
  assertEquals(result.outputs[0].fields.form8880_source !== undefined, true);
  assertEquals(
    result.outputs[0].fields.line4_retirement_savings_credit,
    undefined,
  );
});

Deno.test("form8880: a manual tax-capacity source rejects", () => {
  assertThrows(
    () =>
      form8880.inputSchema.parse({
        ira_contributions_taxpayer: 2_000,
        agi: 20_000,
        filing_status: FilingStatus.Single,
        income_tax_liability: 1_000,
      }),
    Error,
  );
});

Deno.test("form8880: pre-tax and designated Roth W-2 deferrals share line 2 without losing ownership", () => {
  const result = compute({
    taxpayer_ssn: "123456789",
    spouse_ssn: "987654321",
    filing_status: FilingStatus.MFJ,
    agi: 40_000,
    joint_distribution_review: {
      filing_due_date: "2026-04-15",
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [],
      no_other_qualifying_distributions_in_lookback: true,
    },
    w2_deferral_entries: [
      { employee_ssn: "123456789", code: "D", amount: 600 },
      { employee_ssn: "123456789", code: "AA", amount: 400 },
      { employee_ssn: "987654321", code: "BB", amount: 300 },
      { employee_ssn: "987654321", code: "EE", amount: 200 },
    ],
  });
  const lines = fieldsOf(result.outputs, form8880) as Record<string, unknown>;
  assertEquals(lines.print_line2a_deferrals, 1_000);
  assertEquals(lines.print_line2b_deferrals, 500);
  assertEquals(lines.print_line12_credit, 750);
  assertEquals(
    fieldsOf(result.outputs, schedule3)!.line4_retirement_savings_credit,
    750,
  );
});

Deno.test("form8880: positive claim requires contributor eligibility facts", () => {
  assertThrows(
    () =>
      calculateForm8880(
        { taxYear: 2025, formType: "f1040" },
        {
          ira_contributions_taxpayer: 1_000,
          agi: 20_000,
          filing_status: FilingStatus.Single,
        },
        1_000,
      ),
    Error,
    "needs birth date, five-month student answer, and dependent-claim answer",
  );
});

Deno.test("form8880: joint distribution cannot be subtracted from only one spouse column", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.MFJ,
        ira_contributions_taxpayer: 2_000,
        distributions_spouse: 1_000,
        agi: 40_000,
      }),
    Error,
    "need distribution-year joint-filing facts for both columns",
  );
});

Deno.test("form8880: positive joint credit requires a complete reviewed distribution ledger", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.MFJ,
        ira_contributions_taxpayer: 2_000,
        agi: 40_000,
      }),
    Error,
    "needs one reviewed 2023-through-prefiling-2026 distribution ledger",
  );
});

Deno.test("form8880: reviewed 2025 spouse distribution reduces both joint columns", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    ira_contributions_taxpayer: 2_000,
    agi: 40_000,
    joint_distribution_review: {
      filing_due_date: "2026-04-15",
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [{
        recipient: "S",
        received_date: "2025-07-01",
        qualifying_amount: 1_000,
        source_document_ref: "2025-1099-R-spouse-1",
      }],
      no_other_qualifying_distributions_in_lookback: true,
    },
  });
  const lines = fieldsOf(result.outputs, form8880) as Record<string, unknown>;
  assertEquals(lines.print_line4a_distributions, 1_000);
  assertEquals(lines.print_line4b_distributions, 1_000);
  assertEquals(lines.print_line6a_eligible, 1_000);
  assertEquals(lines.print_line6b_eligible, 0);
  assertEquals(lines.print_line12_credit, 500);
});

Deno.test("form8880: 2023 nonjoint spouse distribution reduces only spouse column", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    ira_contributions_taxpayer: 2_000,
    ira_contributions_spouse: 2_000,
    agi: 40_000,
    joint_distribution_review: {
      filing_due_date: "2026-04-15",
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [{
        recipient: "S",
        received_date: "2023-07-01",
        qualifying_amount: 1_000,
        source_document_ref: "2023-1099-R-spouse-1",
        filed_jointly_in_distribution_year: false,
        distribution_year_return_ref: "2023-spouse-filed-return",
      }],
      no_other_qualifying_distributions_in_lookback: true,
    },
  });
  const lines = fieldsOf(result.outputs, form8880) as Record<string, unknown>;
  assertEquals(lines.print_line4a_distributions, 0);
  assertEquals(lines.print_line4b_distributions, 1_000);
  assertEquals(lines.print_line6a_eligible, 2_000);
  assertEquals(lines.print_line6b_eligible, 1_000);
  assertEquals(lines.print_line12_credit, 1_500);
});

Deno.test("form8880: 2024 joint distribution reduces both columns", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    ira_contributions_taxpayer: 2_000,
    ira_contributions_spouse: 2_000,
    agi: 40_000,
    joint_distribution_review: {
      filing_due_date: "2026-04-15",
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [{
        recipient: "T",
        received_date: "2024-06-01",
        qualifying_amount: 500,
        source_document_ref: "2024-1099-R-taxpayer-1",
        filed_jointly_in_distribution_year: true,
        distribution_year_return_ref: "2024-joint-filed-return",
      }],
      no_other_qualifying_distributions_in_lookback: true,
    },
  });
  const lines = fieldsOf(result.outputs, form8880) as Record<string, unknown>;
  assertEquals(lines.print_line4a_distributions, 500);
  assertEquals(lines.print_line4b_distributions, 500);
  assertEquals(lines.print_line12_credit, 1_500);
});

Deno.test("form8880: combined review rejects conflicting joint status", () => {
  const prior = {
    filing_due_date: "2026-04-15" as const,
    reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
    entries: [
      {
        recipient: "T",
        received_date: "2023-01-01",
        qualifying_amount: 100,
        source_document_ref: "A",
        filed_jointly_in_distribution_year: true,
        distribution_year_return_ref: "2023-joint-return",
      },
      {
        recipient: "S",
        received_date: "2023-12-01",
        qualifying_amount: 100,
        source_document_ref: "B",
        filed_jointly_in_distribution_year: false,
        distribution_year_return_ref: "2023-separate-return",
      },
    ],
    no_other_qualifying_distributions_in_lookback: true,
  };
  const base = {
    filing_status: FilingStatus.MFJ,
    ira_contributions_taxpayer: 2_000,
    agi: 40_000,
  };
  assertThrows(
    () => compute({ ...base, joint_distribution_review: prior }),
    Error,
    "joint filing status conflicts",
  );
  const combined = compute({
    ...base,
    joint_distribution_review: {
      ...prior,
      entries: [prior.entries[0], {
        recipient: "T",
        received_date: "2025-01-01",
        qualifying_amount: 100,
        source_document_ref: "C",
      }],
    },
  });
  const lines = fieldsOf(combined.outputs, form8880) as Record<string, unknown>;
  assertEquals(lines.print_line4a_distributions, 200);
  assertEquals(lines.print_line4b_distributions, 200);
});

Deno.test("form8880: prefiling 2026 distributions use the documented joint-return plan", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    ira_contributions_taxpayer: 2_000,
    ira_contributions_spouse: 2_000,
    agi: 40_000,
    joint_distribution_review: {
      filing_due_date: "2026-10-15",
      extension_confirmation_ref: "2025-return-extension",
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [{
        recipient: "S",
        received_date: "2026-05-01",
        qualifying_amount: 500,
        source_document_ref: "2026-IRA-spouse-1",
        plans_joint_2026: false,
        plan_reference_2026: "2026-separate-filing-plan",
      }],
      no_other_qualifying_distributions_in_lookback: true,
    },
  });
  const lines = fieldsOf(result.outputs, form8880) as Record<string, unknown>;
  assertEquals(lines.print_line4a_distributions, 0);
  assertEquals(lines.print_line4b_distributions, 500);
});

Deno.test("form8880: combined distribution review rejects outside-due-date entries", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.MFJ,
      ira_contributions_taxpayer: 2_000,
      agi: 40_000,
      joint_distribution_review: {
        filing_due_date: "2026-04-15",
        reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
        entries: [{
          recipient: "T",
          received_date: "2026-04-15",
          qualifying_amount: 500,
          source_document_ref: "2026-IRA-taxpayer-1",
          plans_joint_2026: true,
          plan_reference_2026: "2026-joint-filing-plan",
        }],
        no_other_qualifying_distributions_in_lookback: true,
      },
    })
  );
});

Deno.test("form8880: extended distribution window needs an extension reference", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.MFJ,
      ira_contributions_taxpayer: 2_000,
      agi: 40_000,
      joint_distribution_review: {
        filing_due_date: "2026-10-15",
        reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
        entries: [],
        no_other_qualifying_distributions_in_lookback: true,
      },
    })
  );
});

Deno.test("form8880: old partial joint-distribution shapes explicitly reject", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.MFJ,
      ira_contributions_taxpayer: 2_000,
      agi: 40_000,
      joint_2025_distribution_review: {
        entries: [],
        no_other_qualifying_distributions_in_lookback: true,
      },
    })
  );
});

Deno.test("form8880: prior-year distribution needs its filed-return source", () => {
  assertThrows(
    () =>
      compute({
        filing_status: FilingStatus.MFJ,
        ira_contributions_taxpayer: 2_000,
        agi: 40_000,
        joint_distribution_review: {
          filing_due_date: "2026-04-15",
          reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
          entries: [{
            recipient: "T",
            received_date: "2024-06-01",
            qualifying_amount: 500,
            source_document_ref: "2024-1099-R-taxpayer-1",
            filed_jointly_in_distribution_year: true,
          }],
          no_other_qualifying_distributions_in_lookback: true,
        },
      }),
    Error,
  );
});

for (
  const facts of [
    { taxpayer_dob: "2008-01-02" },
    { taxpayer_student_five_months: true },
    { taxpayer_claimed_as_dependent: true },
  ]
) {
  Deno.test(`form8880: ineligible contributor cannot claim with ${JSON.stringify(facts)}`, () => {
    assertThrows(
      () =>
        compute({
          ira_contributions_taxpayer: 1_000,
          agi: 20_000,
          filing_status: FilingStatus.Single,
          ...facts,
        }),
      Error,
      "is not eligible for the 2025 credit",
    );
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input validation
// ---------------------------------------------------------------------------

Deno.test("form8880: negative ira_contributions_taxpayer throws", () => {
  assertThrows(
    () =>
      compute({
        ira_contributions_taxpayer: -1,
        agi: 20000,
        filing_status: "single",
      }),
    Error,
  );
});

Deno.test("form8880: negative AGI is accepted but zero tax liability permits no credit", () => {
  assertCalculatedZero(compute({
    ira_contributions_taxpayer: 1000,
    agi: -1,
    filing_status: FilingStatus.Single,
    income_tax_liability: 0,
  }));
});

Deno.test("form8880: no contributions produces no output", () => {
  const result = compute({ agi: 20000, filing_status: "single" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8880: zero contributions produces no output", () => {
  const result = compute({
    ira_contributions_taxpayer: 0,
    agi: 20000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 2. Credit rate — Single / 50%
// ---------------------------------------------------------------------------

Deno.test("form8880: single AGI=$20,000 receives the 50% credit rate", () => {
  // $2,000 contribution × 50% = $1,000
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
  });
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: single AGI=$23,750 is the 50% ceiling", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 23750,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 3. Credit rate — Single / 20%
// ---------------------------------------------------------------------------

Deno.test("form8880: single AGI=$23,751 enters the 20% bracket", () => {
  // $2,000 × 20% = $400
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 23751,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 400);
});

Deno.test("form8880: single AGI=$25,500 is the 20% ceiling", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 25500,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 400);
});

// ---------------------------------------------------------------------------
// 4. Credit rate — Single / 10%
// ---------------------------------------------------------------------------

Deno.test("form8880: single AGI=$25,501 enters the 10% bracket", () => {
  // $2,000 × 10% = $200
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 25501,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

Deno.test("form8880: single AGI=$39,500 is the 10% ceiling", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 39500,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

// ---------------------------------------------------------------------------
// 5. Credit rate — Single / 0% (above limit)
// ---------------------------------------------------------------------------

Deno.test("form8880: single AGI=$39,501 is above the credit limit", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 39501,
    filing_status: "single",
  });
  assertCalculatedZero(result);
});

Deno.test("form8880: single AGI=$50,000 (well above limit) → no output", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 50000,
    filing_status: "single",
  });
  assertCalculatedZero(result);
});

// ---------------------------------------------------------------------------
// 6. Credit rate — HOH filing status
// ---------------------------------------------------------------------------

Deno.test("form8880: HOH AGI=$35,625 is the 50% ceiling", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 35625,
    filing_status: "hoh",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: HOH AGI=$35,626 enters the 20% bracket", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 35626,
    filing_status: "hoh",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 400);
});

Deno.test("form8880: HOH AGI=$38,251 enters the 10% bracket", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 38251,
    filing_status: "hoh",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

Deno.test("form8880: HOH AGI=$59,251 is above the credit limit", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 59251,
    filing_status: "hoh",
  });
  assertCalculatedZero(result);
});

Deno.test("form8880: HOH AGI=$59,250 is still in the 10% bracket", () => {
  const result = compute({
    ira_contributions_taxpayer: 2_000,
    agi: 59_250,
    filing_status: FilingStatus.HOH,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line4_retirement_savings_credit,
    200,
  );
});

// ---------------------------------------------------------------------------
// 7. Credit rate — MFJ filing status
// ---------------------------------------------------------------------------

Deno.test("form8880: MFJ AGI=$47,500 is the 50% ceiling", () => {
  // Only taxpayer contributes $2,000 → $2,000 × 50% = $1,000
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 47500,
    filing_status: "mfj",
    joint_distribution_review: noJointDistributions,
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: MFJ AGI=$47,501 enters the 20% bracket", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 47501,
    filing_status: "mfj",
    joint_distribution_review: noJointDistributions,
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 400);
});

Deno.test("form8880: MFJ AGI=$51,001 enters the 10% bracket", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 51001,
    filing_status: "mfj",
    joint_distribution_review: {
      filing_due_date: "2026-04-15",
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [],
      no_other_qualifying_distributions_in_lookback: true,
    },
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

Deno.test("form8880: MFJ AGI=$79,001 is above the credit limit", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 79001,
    filing_status: "mfj",
  });
  assertCalculatedZero(result);
});

Deno.test("form8880: sourced foreign exclusion is added back for line 8 and the credit rate", () => {
  const result = compute({
    ira_contributions_taxpayer: 2_000,
    agi: 20_000,
    foreign_agi_addback: 5_000,
    filing_status: FilingStatus.Single,
  });
  const lines = fieldsOf(result.outputs, form8880) as Record<string, unknown>;
  assertEquals(lines.print_line8_agi, 25_000);
  assertEquals(lines.print_line9_rate, "0.2");
  assertEquals(lines.print_line12_credit, 400);
});

Deno.test("form8880: foreign addback can remove an otherwise positive credit", () => {
  const result = compute({
    ira_contributions_taxpayer: 2_000,
    agi: 20_000,
    foreign_agi_addback: 20_000,
    filing_status: FilingStatus.Single,
  });
  assertCalculatedZero(result);
});

Deno.test("form8880: MFJ AGI=$79,000 is still in the 10% bracket", () => {
  const result = compute({
    ira_contributions_taxpayer: 2_000,
    agi: 79_000,
    filing_status: FilingStatus.MFJ,
    joint_distribution_review: {
      filing_due_date: "2026-04-15",
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [],
      no_other_qualifying_distributions_in_lookback: true,
    },
  });
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line4_retirement_savings_credit,
    200,
  );
});

Deno.test("form8880: qualifying surviving spouse uses single rate table", () => {
  const result = compute({
    ira_contributions_taxpayer: 2_000,
    agi: 40_000,
    filing_status: FilingStatus.QSS,
  });
  assertCalculatedZero(result);
  const eligible = compute({
    ira_contributions_taxpayer: 2_000,
    agi: 25_500,
    filing_status: FilingStatus.QSS,
  });
  assertEquals(
    fieldsOf(eligible.outputs, schedule3)?.line4_retirement_savings_credit,
    400,
  );
});

// ---------------------------------------------------------------------------
// 8. $2,000 per-person contribution cap
// ---------------------------------------------------------------------------

Deno.test("form8880: contributions above $2,000 are capped at $2,000", () => {
  // $5,000 contribution capped to $2,000; at 50% → $1,000
  const result = compute({
    ira_contributions_taxpayer: 5000,
    agi: 20000,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: exactly $2,000 contribution at 50% → $1,000 credit", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: $1,000 contribution at 50% → $500 credit", () => {
  const result = compute({
    ira_contributions_taxpayer: 1000,
    agi: 20000,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 500);
});

// ---------------------------------------------------------------------------
// 9. MFJ both spouses contributing
// ---------------------------------------------------------------------------

Deno.test("form8880: MFJ both spouses $2,000 each at 50% → $2,000 credit", () => {
  // taxpayer: $2,000 + spouse: $2,000 = $4,000 × 50% = $2,000
  const result = compute({
    ira_contributions_taxpayer: 2000,
    ira_contributions_spouse: 2000,
    agi: 40000,
    filing_status: "mfj",
    joint_distribution_review: noJointDistributions,
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 2000);
});

Deno.test("form8880: MFJ both spouses, contributions capped individually at $2,000", () => {
  // taxpayer: $3,000 capped to $2,000 + spouse: $3,000 capped to $2,000 = $4,000 × 50%
  const result = compute({
    ira_contributions_taxpayer: 3000,
    ira_contributions_spouse: 3000,
    agi: 40000,
    filing_status: "mfj",
    joint_distribution_review: noJointDistributions,
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 2000);
});

Deno.test("form8880: MFJ spouse only contributes, taxpayer does not", () => {
  const result = compute({
    ira_contributions_spouse: 2000,
    agi: 40000,
    filing_status: "mfj",
    joint_distribution_review: noJointDistributions,
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 10. Elective deferrals from W-2 (Box 12 D/E; G needs an employee-only split)
// ---------------------------------------------------------------------------

Deno.test("form8880: taxpayer W-2 deferral belongs in taxpayer line 2", () => {
  const result = compute({
    taxpayer_ssn: "123-45-6789",
    w2_deferral_entries: [{
      employee_ssn: "123456789",
      code: "D",
      amount: 2000,
    }],
    agi: 20000,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
  assertEquals(
    findOutput(result, "form8880")?.fields.print_line2a_deferrals,
    2000,
  );
});

Deno.test("form8880: MFJ W-2 deferrals remain with each spouse across multiple employers", () => {
  const result = compute({
    taxpayer_ssn: "123-45-6789",
    spouse_ssn: "987654321",
    w2_deferral_entries: [
      { employee_ssn: "123456789", code: "D", amount: 500 },
      { employee_ssn: "987-65-4321", code: "E", amount: 800 },
      { employee_ssn: "987654321", code: "E", amount: 400 },
    ],
    agi: 30_000,
    filing_status: FilingStatus.MFJ,
    joint_distribution_review: {
      filing_due_date: "2026-04-15",
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [],
      no_other_qualifying_distributions_in_lookback: true,
    },
  });
  assertEquals(
    findOutput(result, "form8880")?.fields.print_line2a_deferrals,
    500,
  );
  assertEquals(
    findOutput(result, "form8880")?.fields.print_line2b_deferrals,
    1_200,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line4_retirement_savings_credit,
    850,
  );
});

Deno.test("form8880: combined legacy W-2 deferrals are rejected", () => {
  assertThrows(
    () =>
      compute({
        elective_deferrals: 2_000,
        agi: 20_000,
        filing_status: FilingStatus.Single,
      }),
    Error,
  );
});

Deno.test("form8880: raw code G source entry is rejected", () => {
  assertThrows(() =>
    compute({
      taxpayer_ssn: "123456789",
      w2_deferral_entries: [{
        employee_ssn: "123456789",
        code: "G",
        amount: 800,
      }],
      agi: 20_000,
      filing_status: FilingStatus.Single,
    }), Error);
});

Deno.test("form8880: reviewed governmental code G counts employee election, not employer amount", () => {
  const result = compute({
    taxpayer_ssn: "123456789",
    w2_deferral_entries: [{
      employee_ssn: "123456789",
      code: "G",
      amount: 1_800,
      governmental_457b: true,
      employee_elective_amount: 600,
      employee_split_review_ref: "2025 payroll 457b allocation",
    }],
    agi: 20_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(
    findOutput(result, "form8880")?.fields.print_line2a_deferrals,
    600,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line4_retirement_savings_credit,
    300,
  );
});

Deno.test("form8880: nongovernmental code G is not a qualified employee deferral", () => {
  assertThrows(() =>
    compute({
      taxpayer_ssn: "123456789",
      w2_deferral_entries: [{
        employee_ssn: "123456789",
        code: "G",
        amount: 1_800,
        employee_elective_amount: 600,
        employee_split_review_ref: "payroll allocation",
      }],
      agi: 20_000,
      filing_status: FilingStatus.Single,
    }), Error);
});

Deno.test("form8880: W-2 deferral without return identity is rejected", () => {
  assertThrows(
    () =>
      compute({
        w2_deferral_entries: [{
          employee_ssn: "123456789",
          code: "D",
          amount: 800,
        }],
        agi: 20_000,
        filing_status: FilingStatus.Single,
      }),
    Error,
    "need the taxpayer's nine-digit SSN",
  );
});

Deno.test("form8880: unrelated W-2 employee SSN is rejected", () => {
  assertThrows(
    () =>
      compute({
        taxpayer_ssn: "123456789",
        spouse_ssn: "987654321",
        w2_deferral_entries: [{
          employee_ssn: "111223333",
          code: "D",
          amount: 800,
        }],
        agi: 20_000,
        filing_status: FilingStatus.MFJ,
      }),
    Error,
    "does not match",
  );
});

Deno.test("form8880: spouse W-2 deferral cannot claim a nonjoint spouse column", () => {
  assertThrows(
    () =>
      compute({
        taxpayer_ssn: "123456789",
        spouse_ssn: "987654321",
        w2_deferral_entries: [{
          employee_ssn: "987654321",
          code: "E",
          amount: 800,
        }],
        agi: 20_000,
        filing_status: FilingStatus.MFS,
      }),
    Error,
    "require a joint return",
  );
});

Deno.test("form8880: direct taxpayer amount cannot duplicate W-2-owned amount", () => {
  assertThrows(
    () =>
      compute({
        taxpayer_ssn: "123456789",
        elective_deferrals_taxpayer: 800,
        w2_deferral_entries: [{
          employee_ssn: "123456789",
          code: "D",
          amount: 800,
        }],
        agi: 20_000,
        filing_status: FilingStatus.Single,
      }),
    Error,
    "conflict with W-2 source",
  );
});

Deno.test("form8880: elective_deferrals_taxpayer and ira_contributions_taxpayer combine (capped at $2,000)", () => {
  // $1,500 deferrals + $1,000 IRA = $2,500, capped to $2,000 × 50% = $1,000
  const result = compute({
    elective_deferrals_taxpayer: 1500,
    ira_contributions_taxpayer: 1000,
    agi: 20000,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 11. Distributions reduce eligible contributions
// ---------------------------------------------------------------------------

Deno.test("form8880: distributions offset contributions — partial reduction", () => {
  // $2,000 contribution - $500 distributions = $1,500 eligible × 50% = $750
  const result = compute({
    ira_contributions_taxpayer: 2000,
    distributions_taxpayer: 500,
    agi: 20000,
    filing_status: "single",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 750);
});

Deno.test("form8880: distributions >= contributions → eligible = 0, no output", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    distributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
  });
  assertCalculatedZero(result);
});

Deno.test("form8880: distributions exceed contributions → eligible = 0, no output", () => {
  const result = compute({
    ira_contributions_taxpayer: 1000,
    distributions_taxpayer: 1500,
    agi: 20000,
    filing_status: "single",
  });
  assertCalculatedZero(result);
});

// ---------------------------------------------------------------------------
// 12. Income tax liability limit
// ---------------------------------------------------------------------------

Deno.test("form8880: credit limited by income_tax_liability", () => {
  // $2,000 × 50% = $1,000 credit, but only $600 tax liability → credit = $600
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
    income_tax_liability: 600,
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 600);
});

Deno.test("form8880: income_tax_liability = 0 → no output", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
    income_tax_liability: 0,
  });
  assertCalculatedZero(result);
});

Deno.test("form8880: income_tax_liability >= credit → full credit passes through", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
    income_tax_liability: 5000,
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 13. Output routing — field names and nodeTypes
// ---------------------------------------------------------------------------

Deno.test("form8880: early source routes to Schedule 3 without a credit amount", () => {
  const result = form8880.compute({ taxYear: 2025, formType: "f1040" }, {
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(
    result.outputs[0].fields.line4_retirement_savings_credit,
    undefined,
  );
});

Deno.test("form8880: output field is typed source, not asserted capacity", () => {
  const result = form8880.compute({ taxYear: 2025, formType: "f1040" }, {
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(Object.keys(result.outputs[0].fields), ["form8880_source"]);
});

Deno.test("form8880: no f1040 output is emitted", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ---------------------------------------------------------------------------
// 14. MFS filing status (same thresholds as single)
// ---------------------------------------------------------------------------

Deno.test("form8880: MFS AGI=$22,000 uses the single 50% band", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 22000,
    filing_status: "mfs",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 15. QSS filing status (2025 form places QSS with Single/MFS)
// ---------------------------------------------------------------------------

Deno.test("form8880: QSS AGI=$20,000 receives the 50% rate", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "qss",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: QSS AGI=$39,500 is at the single/QSS 10% ceiling", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 39500,
    filing_status: "qss",
  });
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

// ---------------------------------------------------------------------------
// 16. Smoke test
// ---------------------------------------------------------------------------

Deno.test("form8880 smoke test: MFJ both contributing, 50% rate → $2,000 credit", () => {
  // Taxpayer: $2,000 IRA + $500 deferrals = $2,500 → capped to $2,000
  // Spouse: $1,500 IRA → $1,500 eligible
  // Total eligible: $2,000 + $1,500 = $3,500
  // Rate: MFJ AGI=$44,000 is below the $47,500 ceiling for 50%.
  // Credit: $3,500 × 50% = $1,750
  const result = compute({
    ira_contributions_taxpayer: 2000,
    elective_deferrals_taxpayer: 500,
    ira_contributions_spouse: 1500,
    agi: 44000,
    filing_status: "mfj",
    joint_distribution_review: noJointDistributions,
  });

  // schedule3 routing output + self-emitted print-line output for the PDF builder
  assertEquals(result.outputs.length, 2);

  const s3Out = findOutput(result, "schedule3");
  assertEquals(s3Out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1750);

  assertEquals(findOutput(result, "f1040"), undefined);
});
