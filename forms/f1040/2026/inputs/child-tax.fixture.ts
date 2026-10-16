import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { incomeWorksheet2026 } from "../../nodes/config/2026-tax-worksheets.ts";
import { ordinaryTaxWithConfig } from "../../nodes/intermediate/worksheets/taxes/calculation/tax_worksheets.ts";
import type { childTaxClaim2026Schema } from "./child-tax.ts";
import type { childTaxParentReturn2026Schema } from "./child-tax-family.ts";
import type { z } from "zod";
export function parentReturn2026(
  owner = "987654321",
  status = FilingStatus.MFJ,
  income = 80000,
): z.input<typeof childTaxParentReturn2026Schema> {
  return {
    return_reference: `return-${owner}`,
    document_reference: `return-pdf-${owner}`,
    tax_period_start: "2026-01-01",
    tax_period_end: "2026-12-31",
    primary: { tin: owner, name: "Synthetic Parent", name_control: "PARE" },
    ...(status === FilingStatus.MFJ
      ? {
        spouse: {
          tin: "987654322",
          name: "Other Parent",
          name_control: "PARE",
        },
      }
      : {}),
    filing_status: status,
    adjusted_gross_income: income + 32200,
    taxable_income: income,
    line16_income_tax: ordinaryTaxWithConfig(
      income,
      status,
      incomeWorksheet2026,
    ),
    form4972_tax: 0,
    form8814_tax: 0,
    education_recapture_tax: 0,
    qualified_dividends: 0,
    net_capital_gain: 0,
    schedule_d_tax_worksheet_used: false,
    schedule_j_used: false,
    form2555_used: false,
    form8615_used: false,
  };
}
export function childTaxFixture2026(wages = 0, interest = 5000) {
  const base = investmentGraphInput2026(wages);
  base.investment_income.f1099ints[0].box1 = interest;
  base.investment_income.f1099divs = [];
  const f8615: z.input<typeof childTaxClaim2026Schema> = {
    claim: {
      tax_year: 2026,
      record_reference: "child-tax-review",
      child_tin: base.general.taxpayer_ssn,
      parent_form8814_election_for_this_child: false,
      all_child_income_sources_included: true,
      no_nonw2_scholarship_or_qualified_disability_trust_income: true,
      school_record_reference: "school-record",
      full_time_student_months: [1, 2, 3, 4, 5],
      complete_support_inventory: true,
      all_parents_included: true,
      support_records: [{
        record_reference: "support-ledger",
        amount: 20000,
        kind: "ordinary_support",
      }],
      parent_life_records: [
        {
          record_reference: "parent-life-1",
          parent_tin: "987654321",
          alive_on_2026_12_31: true,
        },
        {
          record_reference: "parent-life-2",
          parent_tin: "987654322",
          alive_on_2026_12_31: true,
        },
      ],
      no_directly_connected_itemized_deductions: true,
      family: {
        record_reference: "family-inventory",
        selection: {
          kind: "parents_married",
          shared_home_all_year: true,
          record_reference: "parent-marriage",
          parent_tins: ["987654321", "987654322"],
        },
        parent_returns: [parentReturn2026()],
        all_other_children_for_selected_parent_included: true,
        other_children: [],
      },
    },
  };
  return {
    ...base,
    general: {
      ...base.general,
      taxpayer_dob: "2011-06-01",
      taxpayer_can_be_claimed_as_dependent: true,
      do_not_claim_eic: true,
      wants_federal_public_benefit: true,
      eligible_for_federal_public_benefit: true,
    },
    f8615,
  };
}
