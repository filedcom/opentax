import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import type { CareMfs2026 } from "./dependent-care-mfs.ts";

export function separateCareFixture2026(
  consideredUnmarried = true,
  benefits = 2000,
  expenses = 6000,
  spouseWages = 50000,
) {
  const base = dependentCareFixture2026(50000, benefits, expenses);
  const spouseSsn = "444556666";
  const mfs: CareMfs2026 = consideredUnmarried
    ? {
      kind: "considered_unmarried",
      review_reference: "separate-care-status",
      no_community_property_income_allocation: true,
      qualifying_person_tin: base.general.dependents[0].ssn,
      home_cost_record_reference: "home-cost-ledger",
      total_home_costs: 20000,
      taxpayer_paid_home_costs: 15000,
      complete_spouse_home_calendar_reviewed: true,
      spouse_home_record_reference: "spouse-residence-calendar",
      spouse_home_periods: [{ from: "2026-01-01", through: "2026-06-30" }],
    }
    : {
      kind: "not_considered_unmarried",
      review_reference: "separate-care-status",
      no_community_property_income_allocation: true,
      reason: {
        kind: "spouse_home_last_six_months",
        record_reference: "spouse-home-record",
        home_date: "2026-07-01",
      },
      spouse_income_inventory_reference: "separate-spouse-earned-income",
      all_spouse_w2_copies_reconciled: true,
      no_spouse_other_earned_income_or_care_benefits: true,
      spouse_w2s: spouseWages
        ? [{
          ...base.w2s[0],
          employee_ssn: spouseSsn,
          source_document_reference: "external-spouse-w2",
          box1_wages: spouseWages,
          box10_dep_care: 0,
          box2_fed_withheld: 1234,
          box3_ss_wages: spouseWages,
          box5_medicare_wages: spouseWages,
          box6_medicare_withheld: spouseWages * .0145,
        }]
        : [],
    };
  base.form2441.claim.mfs_review = mfs;
  return {
    ...base,
    general: {
      ...base.general,
      filing_status: FilingStatus.MFS,
      spouse_ssn: spouseSsn,
      spouse_first_name: "Separate",
      spouse_last_name: "Investor",
      spouse_dob: "1982-01-01",
      mfs_spouse_itemizing: false,
      mfs_spouse_lived_with_taxpayer: true,
    },
  };
}

export async function separateDisabledSpouseFixture2026() {
  const { disabledCareSpouseFixture2026 } = await import(
    "./dependent-care-people.fixture.ts"
  );
  const f = separateCareFixture2026(false, 6000, 6000, 800);
  const disabled = disabledCareSpouseFixture2026();
  f.form2441.claim.qualifying_people =
    disabled.form2441.claim.qualifying_people;
  f.form2441.claim.earned_income = disabled.form2441.claim.earned_income;
  if (f.form2441.claim.earned_income.method !== "monthly") {
    throw new Error("Expected monthly fixture");
  }
  f.form2441.claim.earned_income.taxpayer.months[11].taxable_care_benefits =
    2700;
  f.form2441.claim.expenses[0].person_tin = f.general.spouse_ssn;
  f.general.dependents = [];
  return f;
}

export async function separatePriorOnlyCareFixture2026() {
  const { priorCareFixture2026 } = await import(
    "./dependent-care-prior.fixture.ts"
  );
  const f = separateCareFixture2026(false, 0);
  const prior = priorCareFixture2026(true).form2441.claim.prior_year_expenses;
  prior.prior_return.filing_status = FilingStatus.MFS;
  prior.prior_return.form2441_line_a_considered_unmarried = true;
  f.form2441.claim.prior_year_expenses = prior;
  f.form2441.claim.qualifying_people = [];
  f.form2441.claim.expenses = [];
  f.form2441.claim.providers[0].amount_paid = 600;
  f.general.dependents = [];
  return f;
}
