import { hsaEligibility2026 } from "./hsa-eligibility.fixture.ts";
import type { HsaLastMonth2025History } from "./hsa-testing-history.ts";
/** Synthetic 2025 evidence, with that year's dated contract and annual terms. */
export function hsaLastMonth2025History(): HsaLastMonth2025History {
  const base = hsaEligibility2026();
  const plan = base.plans[0];
  if (plan.kind !== "ordinary_health_plan") throw Error();
  const eligibility = {
    ...base,
    tax_year: 2025 as const,
    reviewed_on: "2026-05-31",
    plans: [{
      ...plan,
      effective_from: "2025-12-01",
      effective_through: "2025-12-31",
      plan_year_begins: "2025-01-01",
      annual_deductible: 1650,
      annual_out_of_pocket_maximum: 8300,
    }],
    direct_primary_care_arrangements: [],
    months: base.months.map((m) => ({
      ...m,
      plan_references: m.month === 12 ? [plan.source_document_reference] : [],
    })),
  };
  return {
    tax_year: 2025,
    record_reference: "prior-last-month",
    reviewed_on: "2026-05-31",
    taxpayer_tin: base.owner_tin,
    married_at_year_end: false,
    marriage_record_reference: "2025-marriage-history",
    same_identified_spouse_and_marital_status_throughout_2025_verified: true,
    complete_prior_household_hsa_accounts_and_contribution_inventory_verified:
      true,
    last_month_rule_elected: true,
    election_reference: "2025-last-month-election",
    no_archer_msa_or_qualified_ira_funding_contributions_verified: true,
    no_contribution_returns_recoveries_or_prior_excess_deduction_adjustments_verified:
      true,
    latest_original_or_amended_return_verified: true,
    no_pending_prior_year_corrections_verified: true,
    owners: [{ eligibility, has_hsa: true }],
    filed_forms: [{
      owner_tin: base.owner_tin,
      form8889_source_reference: "filed-2025-8889",
      filed_return_reference: "filed-2025-return",
      filed_on: "2026-05-31",
      lines: {
        line2: 3800,
        line3: 4300,
        line4: 0,
        line5: 4300,
        line6: 4300,
        line7: 0,
        line8: 4300,
        line9: 500,
        line10: 0,
        line11: 500,
        line12: 3800,
        line13: 3800,
      },
      contributions: [{
        record_reference: "2025-personal",
        trustee_tin: "987654321",
        account_number: "hsa-account",
        owner_tin: base.owner_tin,
        custodian_transaction_identifier: "2025-personal-txn",
        custodian_statement_reference: "2025-trustee-ledger",
        received_on: "2025-12-15",
        contribution_tax_year: 2025,
        tax_year_designation_reference: "2025-personal-designation",
        payment_source_reference: "2025-bank-payment",
        kind: "personal_cash",
        amount: 3800,
      }, {
        record_reference: "2026-employer-for-2025",
        trustee_tin: "987654321",
        account_number: "hsa-account",
        owner_tin: base.owner_tin,
        custodian_transaction_identifier: "tx-1",
        custodian_statement_reference: "2026-trustee-ledger",
        received_on: "2026-03-01",
        contribution_tax_year: 2025,
        tax_year_designation_reference: "2025-employer-designation",
        payment_source_reference: "payroll-deposit-1",
        kind: "employer_cash",
        amount: 500,
        employer_payroll_reference: "payroll-prior-record",
      }],
    }],
  };
}
