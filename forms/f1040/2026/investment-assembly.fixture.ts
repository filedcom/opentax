import { syntheticInvestmentClaim2026 } from "./inputs/investment.fixture.ts";
import { itemizedClaim2026 } from "./schedule-a.fixture.ts";
import { FilingStatus } from "../nodes/types.ts";
export function investmentGraphInput2026(wages: number) {
  return {
    general: {
      tax_year: 2026,
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "123456789",
      taxpayer_first_name: "Synthetic",
      taxpayer_last_name: "Investor",
      taxpayer_dob: "1980-06-01",
      taxpayer_blind: false,
      taxpayer_can_be_claimed_as_dependent: false,
      taxpayer_citizen_national_or_work_authorized: true,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      digital_assets: false,
      tax_residency: "full_year_citizen_or_resident",
      short_tax_year_due_to_accounting_change: false,
    },
    investment_income: syntheticInvestmentClaim2026(),
    schedule_a: itemizedClaim2026,
    ...(wages
      ? {
        w2s: [{
          tax_year: 2026,
          employee_ssn: "123456789",
          employer_ein: "120000003",
          employer_name: "Synthetic Employer",
          source_document_reference: "synthetic-w2",
          box1_wages: wages,
          box3_ss_wages: Math.min(wages, 184500),
          box5_medicare_wages: wages,
          box6_medicare_withheld: Math.round(wages * .0145 * 100) / 100,
          box2_fed_withheld: 30000,
        }],
      }
      : {}),
  };
}
