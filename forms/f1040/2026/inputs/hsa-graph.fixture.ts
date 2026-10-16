import { hsaTestingPeriod2026 } from "./hsa-testing-period.fixture.ts";
import { hsaIraBasis2026 } from "./hsa-ira-basis.fixture.ts";
import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
import { itemizedClaim2026 } from "../schedule-a.fixture.ts";
import { hsaReturnClaim2026Schema } from "./hsa-source.ts";
import { retirementSource2026 } from "./retirement.fixture.ts";
import type { RetirementSource2026 } from "./retirement-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { CoverageType } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
export function hsaGraph2026(funding = false) {
  const s = hsaTestingPeriod2026(funding),
    f = s.excess_returns.contribution_sources;
  const base = childCreditGraphFixture2026(50000, 0);
  const b: typeof base = JSON.parse(
    JSON.stringify(base).replaceAll(base.general.taxpayer_ssn, s.taxpayer_ssn),
  );
  let retirement: RetirementSource2026["claim"] | undefined;
  if (funding) {
    const ira = hsaIraBasis2026(), h = ira.claim.hsa_funding_sources!;
    f.qualified_funding_review = h.qualified_funding_review;
    // Use the same actual issued copy and annual payment ledger, including
    // ordinary withdrawals, instead of a second asserted IRA exclusion.
    const r = retirementSource2026(), review = r.claim.reviews[0];
    review.source_document_reference =
      h.qualified_funding_review!.ira_accounts[0].form1099r
        .source_document_reference;
    review.plan_type = "traditional_ira";
    delete review
      .no_qcd_hsa_funding_pso_exclusion_disaster_or_corrective_treatment_verified;
    review.no_qcd_pso_exclusion_disaster_or_corrective_treatment_verified =
      true;
    delete review.no_ira_basis_or_current_nondeductible_contributions_verified;
    review.ira_basis_owner_review_reference =
      ira.claim.owners[0].record_reference;
    review.early_distribution = {
      record_reference: "ordinary-early-ledger",
      payments: [{
        record_reference: "ordinary-payment",
        payment_date: "2026-09-01",
        gross: 500,
      }],
      complete_payment_inventory_verified: true,
      no_additional_tax_exception_applies_verified: true,
    };
    const { hsa_funding_sources: _hsa, ...basis } = ira.claim;
    retirement = {
      ...r.claim,
      reviewed_on: "2027-05-31",
      copies: ira.current_copies,
      reviews: [review],
      ira_basis: basis,
    };
  }
  const {
    filing_status: _status,
    taxpayer_ssn: _tin,
    spouse_ssn: _spouse,
    taxpayer_dob: _dob,
    spouse_dob: _spouseDob,
    schedule_a_medical_sources: medical,
    excess_returns: excess,
    ...claim
  } = s;
  const {
    filing_status: _fStatus,
    taxpayer_ssn: _fTin,
    spouse_ssn: _fSpouse,
    wage_sources,
    ...contributions
  } = excess.contribution_sources;
  return {
    ...b,
    general: { ...b.general, taxpayer_dob: s.taxpayer_dob },
    w2s: wage_sources.map((w) => ({
      ...w,
      box5_medicare_wages: w.box1_wages,
      box6_medicare_withheld: Math.round(w.box1_wages * .0145 * 100) / 100,
    })),
    schedule_a: { ...itemizedClaim2026, medical_payments: medical },
    hsa_accounts: {
      claim: hsaReturnClaim2026Schema.parse({
        ...claim,
        excess_returns: { ...excess, contribution_sources: contributions },
      }),
    },
    ...(retirement ? { f1099r: { claim: retirement } } : {}),
  };
}

/** Two actual owner inventories, with distinct transaction/document references. */
export function jointHsaGraph2026() {
  const g = hsaGraph2026(), other = hsaGraph2026();
  const mapping = new Map<string, string>([[
    g.general.taxpayer_ssn,
    "400001038",
  ], ["XXX-XX-1037", "XXX-XX-1038"]]);
  function collect(value: unknown, key = "") {
    if (
      typeof value === "string" &&
      /reference|identifier|account_number/.test(key)
    ) mapping.set(value, `spouse-${value}`);
    else if (Array.isArray(value)) value.forEach((v) => collect(v, key));
    else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        collect(v, k);
      }
    }
  }
  collect(other);
  const s: typeof other = JSON.parse(
    JSON.stringify(other),
    (_k, v) => typeof v === "string" ? mapping.get(v) ?? v : v,
  );
  const c = g.hsa_accounts.claim, d = s.hsa_accounts.claim;
  c.claim.copies.push(...d.claim.copies);
  c.claim.accounts.push(...d.claim.accounts);
  c.medical_expenses.push(...d.medical_expenses);
  c.treatment_review.owners.push(...d.treatment_review.owners);
  c.history_review.owners.push(...d.history_review.owners);
  c.testing_review.owners.push(...d.testing_review.owners);
  c.excess_returns.review.owners.push(...d.excess_returns.review.owners);
  c.excess_returns.review.withdrawals.push(
    ...d.excess_returns.review.withdrawals,
  );
  const f = c.excess_returns.contribution_sources,
    sf = d.excess_returns.contribution_sources;
  f.claim.accounts.push(...sf.claim.accounts);
  f.household_eligibility.owners.push(...sf.household_eligibility.owners);
  f.household_eligibility.spouse_tin = s.general.taxpayer_ssn;
  f.household_eligibility.married_at_year_end = true;
  for (const m of f.household_eligibility.months) {
    m.married_to_identified_spouse_on_first_day = true;
  }
  for (const o of f.household_eligibility.owners) {
    const p = o.plans[0];
    if (p.kind !== "ordinary_health_plan") throw Error();
    p.coverage = CoverageType.Family;
    p.annual_deductible = 3400;
    p.annual_out_of_pocket_maximum = 17000;
  }
  f.limit_review.allocation = {
    record_reference: "joint-allocation",
    agreed_by_both_spouses_verified: true,
    taxpayer_share: { numerator: 1, denominator: 2 },
  };
  g.w2s.push(...s.w2s);
  g.schedule_a.medical_payments.push(...s.schedule_a.medical_payments);
  return {
    ...g,
    general: {
      ...g.general,
      filing_status: FilingStatus.MFJ,
      spouse_ssn: s.general.taxpayer_ssn,
      spouse_dob: s.general.taxpayer_dob,
      spouse_first_name: "Synthetic",
      spouse_last_name: "Spouse",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
    },
  };
}

export function inactiveHsaGraph2026() {
  const g = hsaGraph2026(),
    c = g.hsa_accounts.claim,
    f = c.excess_returns.contribution_sources;
  c.claim.copies = [];
  c.claim.accounts[0].payments = [];
  c.medical_expenses = [];
  c.excess_returns.review.withdrawals = [];
  f.claim.accounts[0].receipts = [];
  f.claim.accounts[0].form5498sa.box2_calendar_year_contributions = 0;
  g.w2s[0].box12_entries = [];
  g.schedule_a.medical_payments = [];
  return g;
}
