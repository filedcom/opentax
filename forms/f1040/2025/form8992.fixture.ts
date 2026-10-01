import { FilingStatus } from "../mef/header.ts";
import { type F5471Item, FilingCategory } from "../nodes/inputs/f5471/index.ts";

export const form8992Cfc: F5471Item = {
  foreign_corp_name: "Example Foreign Corp",
  foreign_corp_reference_id: "FC001",
  country_of_incorporation: "Ireland",
  functional_currency: "EUR",
  filing_category: FilingCategory.Category5a,
  shareholder_tin: "111223333",
  ownership_percent: 100,
  section_962_election: false,
  reviewed_form5471_source_reference: "Reviewed Form 5471",
  schedule_i: {
    line1a: 2_000,
    line1b: 0,
    line1c: 0,
    line1d: 0,
    line1e: 8_000,
    line1f: 0,
    line1g: 0,
    line1h: 0,
    line2_us_property: 1_000,
    line4_factoring: 0,
    worksheet_a_reference: "Reviewed Worksheet A",
    worksheet_b_reference: "Reviewed Worksheet B",
  },
  schedule_i1: {
    tested_income: 50_000,
    pro_rata_tested_income: 50_000,
    pro_rata_qbai: 100_000,
    pro_rata_tested_interest_income: 1_000,
    pro_rata_tested_interest_expense: 3_000,
    schedule_i1_source_reference: "Reviewed Schedule I-1",
  },
};

export const form8992Filer = {
  primarySSN: "111223333",
  firstName: "Alex",
  lastName: "Taxpayer",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
} as const;

export const form8992Pending = {
  f5471: { f5471s: [form8992Cfc] },
  schedule1: {
    line8n_section951a_inclusion: 11_000,
    line8o_section951aa_inclusion: 42_000,
  },
} as const;
