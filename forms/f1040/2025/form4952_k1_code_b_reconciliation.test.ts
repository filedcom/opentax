import { assertThrows } from "@std/assert";
import { calculateForm4952 } from "../nodes/intermediate/forms/form4952/index.ts";
import { reconcileForm4952K1CodeBRoyaltyPath } from "./form4952_k1_code_b_reconciliation.ts";

const k1 = {
  partnership_name: "Mineral Partnership",
  partnership_ein: "123456789",
  source_document_reference: "2025-issued-k1",
  investment_property_for_form4952: true,
  box7_royalties: 600,
  box7_royalty_reporting: {
    tsj: "T",
    property_description: "Mineral royalty",
    portfolio_nonpassive: true,
    form_1099_payments_made: false,
  },
  box13_code_h_investment_interest: 300,
  box13_code_i_royalty_deduction: {
    reported_amount: 350,
    allowed_amount: 350,
    statement_reference: "2025 code I statement",
    expense_kind: "depreciation",
    basis_workpaper_reference: "2025 basis workpaper",
    at_risk_workpaper_reference: "2025 at-risk workpaper",
  },
  box20_code_b_investment_expenses: {
    reported_amount: 350,
    allowed_deduction_amount: 350,
    allowed_deduction_kind: "depreciation",
    nonpassive_investment_property: true,
    issuer_crosswalk: {
      issuer_supplement_reference: "2025 issuer supplement",
      issuer_reported_amount: 350,
      same_expense_as_box13_code_i_confirmed: true,
      box13_code_i_statement_reference: "2025 code I statement",
      royalty_property_description: "Mineral royalty",
    },
  },
};
const property = {
  tsj: "T",
  property_description: "Mineral royalty",
  property_type: 6,
  activity_type: "D",
  fair_rental_days: 0,
  personal_use_days: 0,
  rent_income: 0,
  royalties_income: 600,
  form_1099_payments_made: false,
  expense_other_lines: [{
    description: "From Schedule K-1 (Form 1065)",
    amount: 350,
  }],
  k1_royalty_source: {
    partnership_ein: "123456789",
    source_document_reference: "2025-issued-k1",
    box7_gross_royalties: 600,
    box13_code_i_allowed_deduction: 350,
    box13_code_i_statement_reference: "2025 code I statement",
  },
};
const input = {
  source_k1_royalties: 600,
  source_k1_allowed_investment_expenses: 350,
  source_k1_investment_interest: 300,
  investment_interest_expense_excludes_royalty_attributable_interest: true,
  amt_refigure: {
    prior_year_disallowed_interest: 0,
    interest_on_private_activity_bonds: 0,
    other_gross_income_adjustment: 0,
    qualified_dividends_adjustment: 0,
    net_disposition_gain_adjustment: 0,
    net_capital_gain_adjustment: 0,
    investment_expenses_adjustment: 0,
  },
} as const;
const fields = { ...input, ...calculateForm4952(input) };
const pending = {
  k1_partnership: { k1_partnerships: [k1] },
  schedule_e: { schedule_es: [property] },
  schedule1: { line5_schedule_e: 250, line9_total_other_income: 250 },
  schedule_a: { line_9_investment_interest: 250 },
  standard_deduction: { itemized_deductions: 20_000 },
  income_tax_calculation: { taking_standard_deduction: false },
  f1040: {
    line8_additional_income: 250,
    line12e_itemized_deductions: 20_000,
  },
};

Deno.test("Form 4952 code B matches one issuer-linked code I Schedule E deduction and finalized return", () => {
  reconcileForm4952K1CodeBRoyaltyPath(fields, pending);
});

Deno.test("Form 4952 code B rejects a duplicate or tampered Schedule E deduction", () => {
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(fields, {
        ...pending,
        schedule_e: { schedule_es: [property, property] },
      }),
    Error,
    "same allowed code I expense deducted once",
  );
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(fields, {
        ...pending,
        schedule_e: {
          schedule_es: [{
            ...property,
            expense_other_lines: [{
              description: "From Schedule K-1 (Form 1065)",
              amount: 300,
            }],
          }],
        },
      }),
    Error,
    "same allowed code I expense deducted once",
  );
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(fields, {
        ...pending,
        schedule_e: {
          schedule_es: [{ ...property, expense_depreciation: 350 }],
        },
      }),
    Error,
    "same allowed code I expense deducted once",
  );
});

Deno.test("Form 4952 code B rejects a changed K-1 issuer link or source amount", () => {
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(fields, {
        ...pending,
        k1_partnership: {
          k1_partnerships: [{
            ...k1,
            box20_code_b_investment_expenses: {
              ...k1.box20_code_b_investment_expenses,
              issuer_crosswalk: {
                ...k1.box20_code_b_investment_expenses.issuer_crosswalk,
                box13_code_i_statement_reference: "another statement",
              },
            },
          }],
        },
      }),
    Error,
  );
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath({
        ...fields,
        source_k1_allowed_investment_expenses: 300,
      }, pending),
    Error,
    "supports only the identified K-1 royalty",
  );
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath({
        ...fields,
        line5: 300,
      }, pending),
    Error,
    "numbered lines differ",
  );
});

Deno.test("Form 4952 code B rejects missing filed-line and itemization matches", () => {
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(fields, {
        ...pending,
        schedule1: { ...pending.schedule1, line5_schedule_e: 600 },
      }),
    Error,
    "differs from finalized Schedule 1",
  );
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(fields, {
        ...pending,
        f1040: { ...pending.f1040, line8_additional_income: 600 },
      }),
    Error,
    "differs from finalized Schedule 1",
  );
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(fields, {
        ...pending,
        schedule_a: { line_9_investment_interest: 300 },
      }),
    Error,
    "differs from finalized Schedule 1",
  );
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(fields, {
        ...pending,
        income_tax_calculation: { taking_standard_deduction: true },
      }),
    Error,
    "needs the calculated itemization choice",
  );
});
