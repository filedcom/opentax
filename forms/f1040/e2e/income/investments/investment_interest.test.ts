import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { buildMefXml } from "../../../2025/mef/builder.ts";
import { form8960 as nativeForm8960 } from "../../../2025/mef/forms/taxes/investments/f8960.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
  type MefFormsPending,
} from "../../../2025/mef/types.ts";

const plan = buildExecutionPlan(registry);
const ctx = { taxYear: 2025, formType: "f1040" };
const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: MefFilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};
const amtRefigure = {
  prior_year_disallowed_interest: 0,
  interest_on_private_activity_bonds: 0,
  other_gross_income_adjustment: 0,
  qualified_dividends_adjustment: 0,
  net_disposition_gain_adjustment: 0,
  net_capital_gain_adjustment: 0,
  investment_expenses_adjustment: 0,
};
const mortgage1098 = {
  lender_name: "Example Home Lender",
  recipient_tin: "123456789",
  source_document_reference: "2025 lender copy",
  box1_mortgage_interest: 20_000,
  box1_current_year_deductible_interest: 20_000,
  box1_deduction_workpaper_reference: "2025 Pub. 936 workpaper",
  issuer_copy: {
    file_name: "Test1098.pdf",
    pdf_sha256: "0".repeat(64),
    bytes: new Uint8Array(),
  },
};

function run(inputs: Record<string, unknown>) {
  return execute(plan, registry, {
    general: {
      filing_status: "single",
      taxpayer_ssn: "123456789",
      digital_assets: false,
    },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      employee_ssn: "123456789",
      employer_ein: "123456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
    }],
    ...inputs,
  }, ctx);
}

Deno.test("Form 4952 limits the reported Schedule A deduction and carries excess", () => {
  const result = run({
    f1099int: [{
      payer_name: "Example Bank",
      recipient_tin: "123456789",
      box1: 2_000,
      investment_property_for_form4952: true,
    }],
    form4952: {
      investment_interest_expense: 50_000,
      amt_refigure: amtRefigure,
    },
    f1098: [mortgage1098],
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_9_investment_interest, 2_000);
  assertEquals(result.pending.f1040.line12c_deduction_total, 22_000);
  assertEquals(result.pending.form4952.line8, 2_000);
  assertEquals(result.carryforwards.investment_interest_excess_4952, 48_000);
  const xml = buildMefXml(
    result.pending as unknown as MefFormsPending,
    filer,
  );
  assertStringIncludes(xml, "<IRS4952");
  assertStringIncludes(
    xml,
    "<InvestmentInterestExpenseAmt>50000</InvestmentInterestExpenseAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetInvestmentIncomeAmt>2000</NetInvestmentIncomeAmt>",
  );
});

Deno.test("Form 8960 receives allowed interest and taxpayer-allocated state tax", () => {
  const result = run({
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      employee_ssn: "123456789",
      box15_state: "CA",
      box17_state_withheld: 25_000,
    }],
    f1099div: [{
      payerName: "Broker",
      box1a: 50_000,
      investment_property_for_form4952: true,
      box1b: 0,
      box11: false,
      isNominee: false,
    }],
    f1099m: [{
      payer_name: "Broker",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box3_other_income: 1_000,
      box3_other_income_routing: "other_income",
      box3_other_income_description: "Brokerage termination payment",
      box3_niit_applicable: true,
    }],
    form4952: {
      investment_interest_expense: 5_000,
      amt_refigure: amtRefigure,
    },
    f1098: [mortgage1098],
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
      niit_allocable_state_local_tax: 3_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8960.line7_other_modifications, 1_000);
  assertEquals(
    result.pending.form8960.line9a_investment_interest_expense,
    5_000,
  );
  assertEquals(result.pending.form8960.line9b_state_local_tax, 3_000);
  assertEquals(result.pending.form8960.line12_net_investment_income, 43_000);
  assertEquals(result.pending.form8960.line17_niit, 1_634);
  const xml = nativeForm8960.build(result.pending.form8960);
  assertStringIncludes(
    xml,
    "<InvestmentInterestAmt>5000</InvestmentInterestAmt>",
  );
  assertStringIncludes(
    xml,
    "<StateLocalForeignIncomeTaxAmt>3000</StateLocalForeignIncomeTaxAmt>",
  );
});

Deno.test("Form 8960 does not deduct investment interest when standard deduction wins", () => {
  const result = run({
    f1099int: [{
      payer_name: "Example Bank",
      box1: 2_000,
      investment_property_for_form4952: true,
    }],
    schedule_a: { line_9_investment_interest: 1_000 },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8960.line9a_investment_interest_expense, 0);
  assertEquals(result.pending.form8960.line17_niit, 76);
});

Deno.test("Form 4952 uses prior carryforward and an explicit qualified-dividend election", () => {
  const result = run({
    f1099div: [{
      payerName: "Broker",
      box1a: 10_000,
      investment_property_for_form4952: true,
      box1b: 10_000,
      box11: false,
      isNominee: false,
    }],
    form4952: {
      investment_interest_expense: 3_000,
      prior_year_carryforward: 2_000,
      prior_year_carryforward_source: {
        tax_year: 2024,
        filed_return_reference: "filed-2024-return",
        completed_form_reference: "filed-2024-form4952",
        filed_primary_ssn: "123456789",
        reviewed_by: "Tax Reviewer",
        reviewed_on: "2026-09-30",
        filed_2024_form4952: {
          line1: 2_500,
          line2: 0,
          line3: 2_500,
          line6: 500,
          line7: 2_000,
          line8: 500,
        },
        filed_2024_schedule_a_line9: 500,
        prior_interest_entirely_schedule_a_confirmed: true,
        prior_no_form6198_allocation_confirmed: true,
        reviewed_2024_amt_form4952_line7: 0,
        accepted_2024_filing: {
          filed_return_pdf: {
            source_document_reference: "filed-2024-return",
            file_name: "filed-2024-return.pdf",
            sha256: "a".repeat(64),
          },
          completed_form4952_pdf: {
            source_document_reference: "filed-2024-form4952",
            file_name: "filed-2024-form4952.pdf",
            sha256: "b".repeat(64),
          },
          amt_form4952_workpaper_pdf: {
            source_document_reference: "2024-amt-workpaper",
            file_name: "amt-2024-form4952.pdf",
            sha256: "c".repeat(64),
          },
          acknowledgment_xml: {
            source_document_reference: "2024-acknowledgment",
            file_name: "accepted-2024.xml",
            sha256: "d".repeat(64),
          },
          filed_tax_year: 2024 as const,
          filed_primary_ssn: "123456789",
          submission_id: "2024-submission-1",
          accepted_status_reviewed: true as const,
          regular_line7_reviewed: 2_000,
          amt_line7_reviewed: 0,
        },
      },
      investment_income_election: 5_000,
      amt_refigure: amtRefigure,
    },
    f1098: [mortgage1098],
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952.line8, 5_000);
  assertEquals(result.pending.form4952.line4g, 5_000);
  assertEquals(result.pending.schedule_a.line_9_investment_interest, 5_000);
  assertEquals(result.carryforwards.investment_interest_excess_4952, undefined);
  assertEquals(result.pending.form6251.qualified_dividends, 10_000);
});

Deno.test("Form 4952 subtracts investment expenses before limiting interest", () => {
  const result = run({
    f1099int: [{
      payer_name: "Example Bank",
      box1: 2_000,
      investment_property_for_form4952: true,
    }],
    form4952: {
      investment_interest_expense: 5_000,
      investment_expenses: 1_500,
      amt_refigure: amtRefigure,
    },
    f1098: [mortgage1098],
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952.line4h, 2_000);
  assertEquals(result.pending.form4952.line6, 500);
  assertEquals(result.pending.form4952.line8, 500);
  assertEquals(result.carryforwards.investment_interest_excess_4952, 4_500);
});

Deno.test("Form 4952 pools interest and nonqualified dividends without counting qualified amounts", () => {
  const result = run({
    f1099int: [{
      payer_name: "Bank",
      box1: 1_000,
      investment_property_for_form4952: true,
    }],
    f1099div: [{
      payerName: "Broker",
      box1a: 2_000,
      investment_property_for_form4952: true,
      box1b: 500,
      box11: false,
      isNominee: false,
    }],
    k1_partnership: [{
      partnership_name: "Partnership",
      investment_property_for_form4952: true,
      box5_interest: 1_000,
      box6a_ordinary_dividends: 1_000,
      box6b_qualified_dividends: 500,
    }],
    form4952: {
      investment_interest_expense: 5_000,
      amt_refigure: amtRefigure,
    },
    f1098: [mortgage1098],
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952.line6, 4_000);
  assertEquals(result.pending.form4952.line8, 4_000);
  assertEquals(result.carryforwards.investment_interest_excess_4952, 1_000);
});

Deno.test("Form 8960 rejects a tax allocation above the deductible tax", () => {
  const result = run({
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      box15_state: "CA",
      box17_state_withheld: 5_000,
    }],
    schedule_a: { niit_allocable_state_local_tax: 6_000 },
  });
  assertEquals(
    result.diagnostics.some((d) =>
      d.nodeType === "schedule_a" &&
      d.message.includes("allocation exceeds deductible")
    ),
    true,
  );
});

Deno.test("Form 8960 line 9b cannot be backed by property tax", () => {
  const result = run({
    schedule_a: {
      line_5b_real_estate_tax: 10_000,
      niit_allocable_state_local_tax: 1_000,
    },
  });
  assertEquals(
    result.diagnostics.some((d) =>
      d.nodeType === "schedule_a" &&
      d.message.includes("allocation exceeds deductible")
    ),
    true,
  );
});
