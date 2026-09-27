import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8820, f8820, inputSchema } from "./index.ts";
import { f3800 } from "../f3800/index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";

const drug = {
  generic_name: "Test Orphan Drug",
  designation_application_number: "FDA-123",
  designation_date: "2024-03-15",
  qualified_clinical_testing_expenses: 100_000,
  qualifying_testing_confirmed: true,
  expenses_exclude_third_party_funding: true,
  expenses_not_used_for_research_credit: true,
};

function source(overrides: Record<string, unknown> = {}) {
  return inputSchema.parse({
    f8820s: [drug],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
    ...overrides,
  });
}

Deno.test("Form 8820 reduced section 280C election uses 19.75%", () => {
  const lines = calculateForm8820(source());
  assertEquals(lines, {
    line1: 100_000,
    line2a: 19_750,
    line2b: 0,
    line2c: 19_750,
    line3: 0,
    line4: 19_750,
  });
});

Deno.test("Form 8820 allocates the aggregate controlled-group credit to members", () => {
  const group = {
    group_classification_document_reference: "Section 41(f)(1)(B) analysis",
    taxpayer_member_ein: "123456789",
    members: [{
      ein: "123456789",
      business_name: "Taxpayer business",
      qualified_clinical_testing_expenses: 1,
    }, {
      ein: "987654321",
      business_name: "Related business",
      qualified_clinical_testing_expenses: 2,
    }],
  };
  const lines = calculateForm8820(source({
    f8820s: [{ ...drug, qualified_clinical_testing_expenses: 1 }],
    controlled_group: group,
  }));
  assertEquals(lines.line1, 1);
  assertEquals(lines.line2a, 0);
  assertEquals(lines.controlledGroup?.totalExpenses, 3);
  assertEquals(lines.controlledGroup?.totalCredit, 1);
  assertEquals(
    lines.controlledGroup?.members.map((member) => member.credit_share),
    [0, 1],
  );
  assertEquals(
    calculateForm8820(source({
      f8820s: [{ ...drug, qualified_clinical_testing_expenses: 2 }],
      controlled_group: {
        ...group,
        taxpayer_member_ein: "987654321",
      },
    })).line2a,
    1,
  );
});

Deno.test("Form 8820 refuses an inconsistent controlled-group allocation", () => {
  const group = {
    group_classification_document_reference: "Section 41(f)(1)(B) analysis",
    taxpayer_member_ein: "123456789",
    members: [{
      ein: "123456789",
      business_name: "Taxpayer business",
      qualified_clinical_testing_expenses: 80_000,
    }, {
      ein: "987654321",
      business_name: "Related business",
      qualified_clinical_testing_expenses: 20_000,
    }],
  };
  assertThrows(
    () => calculateForm8820(source({ controlled_group: group })),
    Error,
    "taxpayer group expenses must equal own line 1",
  );
  assertEquals(
    inputSchema.safeParse({
      ...source(),
      controlled_group: { ...group, taxpayer_member_ein: "111111111" },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source(),
      controlled_group: {
        ...group,
        members: [group.members[0], { ...group.members[1], ein: "123456789" }],
      },
    }).success,
    false,
  );
});

Deno.test("Form 8820 full credit uses 25% and needs the deduction statement", () => {
  assertThrows(() =>
    calculateForm8820(source({
      reduced_section280c_credit_election: false,
    }))
  );
  const lines = calculateForm8820(source({
    reduced_section280c_credit_election: false,
    expense_reduction_statement_file_name: "orphan-drug-deduction.pdf",
    expense_reductions: [{
      treatment: "current_deduction",
      return_form_or_schedule: "Schedule C",
      return_line: "27b",
      return_instance_reference: "BUSINESS-1",
      expense_record_reference: "2025 clinical testing ledger",
      amount_before_reduction: 100_000,
      reduction_amount: 25_000,
      expense_amount_after_reduction: 75_000,
    }],
  }));
  assertEquals(lines.line2a, 25_000);
  assertEquals(lines.line4, 25_000);
  assertThrows(
    () =>
      calculateForm8820(source({
        reduced_section280c_credit_election: false,
        expense_reduction_statement_file_name: "orphan-drug-deduction.pdf",
        expense_reductions: [{
          treatment: "current_deduction",
          return_form_or_schedule: "Schedule C",
          return_line: "27b",
          return_instance_reference: "BUSINESS-1",
          expense_record_reference: "2025 clinical testing ledger",
          amount_before_reduction: 100_000,
          reduction_amount: 24_999,
          expense_amount_after_reduction: 75_001,
        }],
      })),
    Error,
    "must equal the full credit",
  );
});

Deno.test("Form 8820 subtracts overlapping Form 8932 wage credit", () => {
  const lines = calculateForm8820(source({
    form8932_overlapping_wage_credit: 1_250,
  }));
  assertEquals(lines.line2b, 1_250);
  assertEquals(lines.line2c, 18_500);
  assertThrows(() =>
    calculateForm8820(source({
      form8932_overlapping_wage_credit: 20_000,
    }))
  );
});

Deno.test("Form 8820 full-credit reduction can split deductions and capitalized basis", () => {
  const input = source({
    reduced_section280c_credit_election: false,
    expense_reduction_statement_file_name: "orphan-drug-reductions.pdf",
    expense_reductions: [{
      treatment: "current_deduction",
      return_form_or_schedule: "Schedule C",
      return_line: "27b",
      return_instance_reference: "BUSINESS-1",
      expense_record_reference: "CLINICAL-001",
      amount_before_reduction: 60_000,
      reduction_amount: 15_000,
      expense_amount_after_reduction: 45_000,
    }, {
      treatment: "capitalized_basis",
      return_form_or_schedule: "Form 4562",
      return_line: "Part III",
      expense_record_reference: "CLINICAL-002",
      amount_before_reduction: 40_000,
      reduction_amount: 10_000,
      expense_amount_after_reduction: 30_000,
    }],
  });
  assertEquals(calculateForm8820(input).line2a, 25_000);
  assertEquals(
    inputSchema.safeParse({
      ...input,
      expense_reductions: [
        input.expense_reductions![0],
        {
          ...input.expense_reductions![1],
          expense_record_reference: "CLINICAL-001",
        },
      ],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      expense_reductions: [{
        ...input.expense_reductions![0],
        expense_amount_after_reduction: 44_999,
      }, input.expense_reductions![1]],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      expense_reductions: [{
        ...input.expense_reductions![0],
        return_instance_reference: undefined,
      }, input.expense_reductions![1]],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      expense_reductions: [
        input.expense_reductions![0],
        {
          ...input.expense_reductions![1],
          treatment: "current_deduction",
          return_form_or_schedule: "Schedule C",
          return_line: "27b",
          return_instance_reference: "BUSINESS-1",
        },
      ],
    }).success,
    false,
  );
  assertThrows(
    () =>
      calculateForm8820({
        ...input,
        reduced_section280c_credit_election: true,
      }),
    Error,
    "cannot claim an expense reduction",
  );
});

Deno.test("Form 8820 requires identified, qualified drugs", () => {
  assertEquals(
    inputSchema.safeParse({
      ...source(),
      f8820s: [{ ...drug, qualifying_testing_confirmed: false }],
    }).success,
    false,
  );
  assertThrows(() =>
    calculateForm8820(source({
      f8820s: [{ ...drug, designation_date: "2025-02-30" }],
    }))
  );
  assertThrows(() =>
    calculateForm8820(source({
      f8820s: [drug, { ...drug, generic_name: "Other Drug" }],
    }))
  );
});

Deno.test("Form 8820 sends the classified source credit to Form 3800", () => {
  const result = f8820.compute(
    { taxYear: 2025, formType: "f1040" },
    source(),
  );
  assertEquals(result.outputs.length, 1);
  assertEquals(fieldsOf(result.outputs, f3800)?.f8820_credit, {
    credit_amount: 19_750,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(
    result.outputs.some((output) => output.nodeType === "schedule3"),
    false,
  );
});

Deno.test("Form 8820 zero expenses produce no credit", () => {
  const result = f8820.compute(
    { taxYear: 2025, formType: "f1040" },
    source({
      f8820s: [{ ...drug, qualified_clinical_testing_expenses: 0 }],
    }),
  );
  assertEquals(result.outputs, []);
});

Deno.test("Form 8820 accepts identified pass-through credit without own drugs", () => {
  const passThrough = {
    source_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 Schedule K-1 orphan-drug credit",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  const only = source({
    f8820s: [],
    reduced_section280c_credit_election: false,
    pass_through_credits: [passThrough],
  });
  const lines = calculateForm8820(only);
  assertEquals(lines.line2c, 0);
  assertEquals(lines.line3, 1_250);
  assertEquals(lines.line4, 1_250);
  assertEquals(
    fieldsOf(
      f8820.compute({ taxYear: 2025, formType: "f1040" }, only).outputs,
      f3800,
    )
      ?.f8820_credit,
    { credit_amount: 1_250, subject_to_passive_activity_limit: false },
  );
  assertEquals(
    calculateForm8820(source({ pass_through_credits: [passThrough] })).line4,
    21_000,
  );
  assertEquals(
    inputSchema.safeParse({
      ...only,
      pass_through_credits: [passThrough, passThrough],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...only,
      pass_through_credits: [],
    }).success,
    false,
  );
  const passive = source({
    f8820s: [],
    reduced_section280c_credit_election: false,
    pass_through_credits: [{
      ...passThrough,
      subject_to_passive_activity_limit: true,
    }],
  });
  assertEquals(
    fieldsOf(
      f8820.compute({ taxYear: 2025, formType: "f1040" }, passive).outputs,
      f3800,
    )?.f8820_credit,
    { credit_amount: 1_250, subject_to_passive_activity_limit: true },
  );
  assertThrows(() =>
    f3800.compute({ taxYear: 2025, formType: "f1040" }, {
      f8820_credit: {
        credit_amount: 1_250,
        subject_to_passive_activity_limit: true,
      },
    })
  );
});
