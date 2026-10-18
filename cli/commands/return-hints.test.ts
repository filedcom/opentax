import { test } from "bun:test";
import { join } from "node:path";
import { assertEquals, assertMatch } from "@std/assert";
import * as sys from "../../scripts/support/sys.ts";
import { appendInput } from "../store/store.ts";
import { formAddCommand } from "./form.ts";
import { createReturnCommand, getReturnCommand } from "./return.ts";
import { nodeTemplateCommand } from "./template.ts";
import { validateReturnCommand } from "./validate.ts";

type Inputs = Readonly<Record<string, readonly Record<string, unknown>[]>>;

// TaxCalcBench ty25-us-010 as entered in run 3: a code 3 disability pension of
// a filer under 65 with no schedule_r.
const disabilityUnder65: Inputs = {
  "general": [
    {
      "filing_status": "qss",
      "child_eic_filer_review": {
        "not_qualifying_child_of_another_taxpayer_verified": true,
        "relationship_age_residence_record_reference": "taxpayer interview"
      },
      "prior_eic_disallowance_review": {
        "status": "none",
        "irs_account_record_reference": "taxpayer interview",
        "no_nonclerical_disallowance_since_1996_verified": true
      },
      "eic_tax_residency_review": {
        "status": "all_year_resident",
        "taxpayer_status_record_reference": "taxpayer interview"
      },
      "taxpayer_first_name": "Elderly",
      "taxpayer_last_name": "Household",
      "taxpayer_middle_initial": "A",
      "taxpayer_ssn": "900456789",
      "taxpayer_ssn_valid_for_employment": true,
      "taxpayer_ssn_issued_before_due_date": true,
      "taxpayer_dob": "1975-10-06",
      "taxpayer_blind": false,
      "taxpayer_age_65_or_older": false,
      "taxpayer_can_be_claimed_as_dependent": false,
      "address_line1": "101 Forest Drive",
      "address_city": "Maitland",
      "address_state": "FL",
      "address_zip": "32701",
      "digital_assets": false,
      "main_home_in_us_over_half_year": true,
      "taxpayer_signature_pin": "23424",
      "taxpayer_signature_date": "2026-07-09",
      "qss_spouse_death_year": 2023,
      "dependents": [
        {
          "first_name": "Jason",
          "last_name": "TEST",
          "middle_initial": "T",
          "ssn": "900456788",
          "ssn_valid_for_employment": true,
          "ssn_issued_before_due_date": true,
          "tin_issued_by_due_date": true,
          "dob": "1988-09-14",
          "relationship": "son",
          "irs_relationship_code": "SON",
          "months_in_home": 12,
          "lived_in_us_over_half_year": true,
          "months_lived_with_you_in_us": 12,
          "us_citizen_national_or_resident": true,
          "provided_over_half_own_support": false,
          "filed_joint_return_except_refund_only": false,
          "qualifying_child_for_ctc": false,
          "disabled": true,
          "full_time_student": false,
          "gross_income": 0,
          "taxpayer_provided_over_half_support": true,
          "dependent_on_another_return": false,
          "child_care_months": 12
        }
      ]
    }
  ],
  "w2": [
    {
      "employer_ein": "123456789",
      "employer_name": "Employer",
      "box1_wages": 1000,
      "box2_fed_withheld": 0,
      "box3_ss_wages": 1000,
      "box4_ss_withheld": 62,
      "box5_medicare_wages": 1000,
      "box6_medicare_withheld": 15,
      "box13_statutory_employee": false,
      "box13_retirement_plan": false,
      "box13_third_party_sick": false
    }
  ],
  "f1099int": [
    {
      "payer_name": "Ally",
      "payer_tin": "123456789",
      "box1": 4000
    }
  ],
  "f1099r": [
    {
      "payer_name": "Test",
      "payer_ein": "123456789",
      "box1_gross_distribution": 11000,
      "box2a_taxable_amount": 11000,
      "box2b_not_determined": false,
      "box2b_total_dist": false,
      "box4_federal_withheld": 1100,
      "box7_distribution_code": "3",
      "box7_ira_simple_indicator": false,
      "disability_flag": true,
      "disability_as_wages": true
    }
  ],
  "schedule_a": [
    {
      "force_itemized": true,
      "line_5a_sales_tax": 426,
      "cash_contributions_to_50_percent_organizations": 8000
    }
  ],
  "f2441": [
    {
      "qualifying_person_count": 1,
      "qualifying_expenses_paid": 800
    }
  ],
  "schedule_b_part_iii": [
    {
      "foreign_accounts_question": false,
      "foreign_trust_question": false
    }
  ]
};

// TaxCalcBench ty25-us-004, run 3: the 2024 disallowed investment interest
// typed on Schedule A line 9 with no Form 4952.
const scheduleALine9: Inputs = {
  "general": [
    {
      "filing_status": "mfj",
      "taxpayer_first_name": "Madison",
      "taxpayer_last_name": "Gray",
      "taxpayer_middle_initial": "M",
      "taxpayer_ssn": "400011111",
      "taxpayer_ssn_valid_for_employment": true,
      "taxpayer_ssn_issued_before_due_date": true,
      "taxpayer_dob": "1983-03-10",
      "taxpayer_can_be_claimed_as_dependent": false,
      "spouse_can_be_claimed_as_dependent": false,
      "spouse_first_name": "Salvester",
      "spouse_last_name": "Slone",
      "spouse_middle_initial": "A",
      "spouse_ssn": "400022222",
      "spouse_ssn_valid_for_employment": true,
      "spouse_ssn_issued_before_due_date": true,
      "spouse_dob": "1986-09-22",
      "address_line1": "110 Maitland HWY",
      "address_city": "Knoxville",
      "address_state": "TN",
      "address_zip": "37922",
      "digital_assets": false,
      "main_home_in_us_over_half_year": true,
      "taxpayer_signature_pin": "15615",
      "taxpayer_signature_date": "2026-07-14",
      "spouse_signature_pin": "15613",
      "dependents": [
        {
          "first_name": "Jessica",
          "last_name": "Davies",
          "middle_initial": "A",
          "ssn": "400033333",
          "ssn_valid_for_employment": true,
          "ssn_issued_before_due_date": true,
          "tin_issued_by_due_date": true,
          "dob": "2014-08-12",
          "relationship": "child_sibling",
          "irs_relationship_code": "NIECE",
          "months_in_home": 12,
          "lived_in_us_over_half_year": true,
          "months_lived_with_you_in_us": 12,
          "us_citizen_national_or_resident": true,
          "provided_over_half_own_support": false,
          "filed_joint_return_except_refund_only": false,
          "qualifying_child_for_ctc": true,
          "disabled": false,
          "full_time_student": false,
          "gross_income": 0,
          "taxpayer_provided_over_half_support": true,
          "dependent_on_another_return": false
        }
      ]
    }
  ],
  "w2": [
    {
      "employer_ein": "123456789",
      "employer_name": "Employers Name",
      "employee_ssn": "400011111",
      "source_document_reference": "w2_1.pdf",
      "box1_wages": 160368,
      "box2_fed_withheld": 28027,
      "box3_ss_wages": 164772,
      "box4_ss_withheld": 10216,
      "box5_medicare_wages": 164772,
      "box6_medicare_withheld": 2389,
      "box12_entries": [
        {
          "code": "D",
          "amount": 4403
        }
      ],
      "box13_retirement_plan": true,
      "box15_state": "TN",
      "box16_state_wages": 160368,
      "box17_state_withheld": 6794
    },
    {
      "employer_ein": "123456789",
      "employer_name": "Temp agency",
      "employee_ssn": "400022222",
      "source_document_reference": "w2_2.pdf",
      "box1_wages": 34000,
      "box2_fed_withheld": 3400,
      "box3_ss_wages": 40000,
      "box4_ss_withheld": 2480,
      "box5_medicare_wages": 40000,
      "box6_medicare_withheld": 580,
      "box15_state": "TN",
      "box16_state_wages": 34000,
      "box17_state_withheld": 1287
    }
  ],
  "f1099int": [
    {
      "payer_name": "Social Finance",
      "recipient_tin": "400011111",
      "box1": 330
    }
  ],
  "f1099div": [
    {
      "payerName": "IBM",
      "recipient_tin": "400011111",
      "isNominee": false,
      "box11": false,
      "box1a": 4870,
      "box1b": 4870
    }
  ],
  "f1099b": [
    {
      "recipient_ssn": "400022222",
      "part": "D",
      "description": "intuit stock",
      "date_acquired": "2021-12-01",
      "date_sold": "2025-11-27",
      "proceeds": 76100,
      "cost_basis": 38991,
      "box12_basis_reported_to_irs": true
    }
  ],
  "ssa1099": [
    {
      "recipient_tin": "400011111",
      "box3_gross_benefits": 19860,
      "box5_net_benefits": 19860,
      "box6_federal_withheld": 1986
    }
  ],
  "schedule_c": [
    {
      "line_a_principal_business": "consultant",
      "line_b_business_code": "541219",
      "business_reference": "consultant-1",
      "proprietor_recipient": "T",
      "line_f_accounting_method": "cash",
      "line_g_material_participation": true,
      "qbi_specified_service": false,
      "line_1_gross_receipts": 3882,
      "line_32_at_risk": "a"
    }
  ],
  "schedule_b_part_iii": [
    {
      "foreign_accounts_question": false,
      "foreign_trust_question": false
    }
  ],
  "schedule_a": [
    {
      "line_1_medical": 8286,
      "line_5a_state_income_tax": 8081,
      "line_9_investment_interest": 650,
      "cash_contributions_to_50_percent_organizations": 25000,
      "noncash_contribution_items": [
        {
          "source": "various donations",
          "amount": 5000,
          "category": "noncash_50"
        }
      ]
    }
  ],
  "w2g": [
    {
      "box1_winnings": 700,
      "box3_type_of_wager": "other",
      "box9_winner_tin": "400011111",
      "payer_name": "Other gambling",
      "payer_ein": "123456789",
      "winner_name": "Madison Gray",
      "source_document_reference": "remaining_data.json OtherGamblingIncomeAmtTP"
    }
  ],
  "f8812_credit_limit_worksheet": [
    {
      "credit_limit_worksheet": {
        "schedule3_line1": 0,
        "schedule3_line2": 0,
        "schedule3_line3": 0,
        "schedule3_line4": 0,
        "schedule3_line5b": 0,
        "schedule3_line6d": 0,
        "schedule3_line6f": 0,
        "schedule3_line6l": 0,
        "schedule3_line6m": 0,
        "worksheet_b_applies": false
      }
    }
  ]
};

// The same return, run 2: Form 4952 with a 20 qualified-dividend election.
const form4952Election: Inputs = {
  "general": [
    {
      "filing_status": "mfj",
      "taxpayer_first_name": "Madison",
      "taxpayer_last_name": "Gray",
      "taxpayer_middle_initial": "M",
      "taxpayer_ssn": "900456789",
      "taxpayer_ssn_valid_for_employment": true,
      "taxpayer_ssn_issued_before_due_date": true,
      "taxpayer_tin_issued_by_due_date": true,
      "taxpayer_dob": "1983-03-10",
      "taxpayer_blind": false,
      "taxpayer_can_be_claimed_as_dependent": false,
      "spouse_can_be_claimed_as_dependent": false,
      "spouse_first_name": "Salvester",
      "spouse_last_name": "Slone",
      "spouse_middle_initial": "A",
      "spouse_ssn": "900456788",
      "spouse_ssn_valid_for_employment": true,
      "spouse_ssn_issued_before_due_date": true,
      "spouse_tin_issued_by_due_date": true,
      "spouse_dob": "1986-09-22",
      "spouse_blind": false,
      "address_line1": "110 Maitland HWY",
      "address_city": "Knoxville",
      "address_state": "TN",
      "address_zip": "37922",
      "digital_assets": false,
      "main_home_in_us_over_half_year": true,
      "taxpayer_signature_pin": "15615",
      "taxpayer_signature_date": "2026-07-14",
      "spouse_signature_pin": "15613",
      "dependents": [
        {
          "first_name": "Jessica",
          "last_name": "Davies",
          "middle_initial": "A",
          "ssn": "900456787",
          "ssn_valid_for_employment": true,
          "ssn_issued_before_due_date": true,
          "tin_issued_by_due_date": true,
          "dob": "2014-08-12",
          "relationship": "child_sibling",
          "irs_relationship_code": "NIECE",
          "months_in_home": 12,
          "lived_in_us_over_half_year": true,
          "months_lived_with_you_in_us": 12,
          "us_citizen_national_or_resident": true,
          "provided_over_half_own_support": false,
          "filed_joint_return_except_refund_only": false,
          "qualifying_child_for_ctc": true,
          "disabled": false,
          "full_time_student": false,
          "gross_income": 0,
          "taxpayer_provided_over_half_support": true,
          "dependent_on_another_return": false
        }
      ]
    }
  ],
  "w2": [
    {
      "employer_ein": "123456789",
      "employer_name": "Employers Name",
      "employee_ssn": "900456789",
      "source_document_reference": "w2_1.pdf",
      "box1_wages": 160368,
      "box2_fed_withheld": 28027,
      "box3_ss_wages": 164772,
      "box4_ss_withheld": 10216,
      "box5_medicare_wages": 164772,
      "box6_medicare_withheld": 2389,
      "box12_entries": [
        {
          "code": "D",
          "amount": 4403
        }
      ],
      "box13_retirement_plan": true,
      "box15_state": "TN",
      "box16_state_wages": 160368,
      "box17_state_withheld": 6794
    },
    {
      "employer_ein": "123456789",
      "employer_name": "Temp agency",
      "employee_ssn": "900456788",
      "source_document_reference": "w2_2.pdf",
      "box1_wages": 34000,
      "box2_fed_withheld": 3400,
      "box3_ss_wages": 40000,
      "box4_ss_withheld": 2480,
      "box5_medicare_wages": 40000,
      "box6_medicare_withheld": 580,
      "box15_state": "TN",
      "box16_state_wages": 34000,
      "box17_state_withheld": 1287
    }
  ],
  "f1099int": [
    {
      "payer_name": "Social Finance",
      "payer_tin": "123456789",
      "box1": 330
    }
  ],
  "f1099div": [
    {
      "payerName": "IBM",
      "payerTin": "123456789",
      "isNominee": false,
      "box11": false,
      "box1a": 4870,
      "box1b": 4870
    }
  ],
  "f1099b": [
    {
      "recipient_ssn": "900456788",
      "part": "D",
      "description": "intuit stock",
      "date_acquired": "2021-12-01",
      "date_sold": "2025-11-27",
      "proceeds": 76100,
      "cost_basis": 38991,
      "box12_basis_reported_to_irs": true
    }
  ],
  "ssa1099": [
    {
      "box3_gross_benefits": 19860,
      "box5_net_benefits": 19860,
      "box6_federal_withheld": 1986
    }
  ],
  "schedule_c": [
    {
      "line_a_principal_business": "consultant",
      "line_b_business_code": "541219",
      "business_reference": "consultant-1",
      "proprietor_recipient": "T",
      "line_f_accounting_method": "cash",
      "line_g_material_participation": true,
      "line_h_new_business": false,
      "line_i_made_1099_payments": false,
      "qbi_specified_service": false,
      "line_1_gross_receipts": 3882,
      "line_32_at_risk": "a"
    }
  ],
  "schedule_b_part_iii": [
    {
      "foreign_accounts_question": false,
      "foreign_trust_question": false
    }
  ],
  "form4952": [
    {
      "investment_interest_expense": 650,
      "investment_income_election": 320,
      "elected_capital_gain_portion": 0,
      "source_1099_interest": 330,
      "source_1099_dividends": 4870,
      "source_1099_qualified_dividends": 4870,
      "amt_refigure": {
        "prior_year_disallowed_interest": 0,
        "interest_on_private_activity_bonds": 0,
        "other_gross_income_adjustment": 0,
        "qualified_dividends_adjustment": 0,
        "net_disposition_gain_adjustment": 0,
        "net_capital_gain_adjustment": 0,
        "investment_expenses_adjustment": 0,
        "elected_capital_gain_portion": 0
      }
    }
  ],
  "schedule_a": [
    {
      "line_1_medical": 8286,
      "line_5a_state_income_tax": 8081,
      "cash_contributions_to_50_percent_organizations": 25000,
      "noncash_contribution_items": [
        {
          "source": "f8283 list",
          "amount": 5000,
          "category": "noncash_50"
        }
      ],
      "current_noncash_gift_inventory_complete_confirmed": true,
      "other_prior_charitable_carryovers_absent_confirmed": true
    }
  ],
  "w2g": [
    {
      "calendar_year": 2025,
      "box1_winnings": 700,
      "box4_federal_withheld": 0,
      "box9_winner_tin": "900456789",
      "payer_name": "Other gambling income",
      "payer_ein": "000000000",
      "source_document_reference": "remaining_data.json addtl_income OtherGamblingIncomeAmtTP"
    }
  ],
  "f8812_credit_limit_worksheet": [
    {
      "credit_limit_worksheet": {
        "schedule3_line1": 0,
        "schedule3_line2": 0,
        "schedule3_line3": 0,
        "schedule3_line4": 0,
        "schedule3_line5b": 0,
        "schedule3_line6d": 0,
        "schedule3_line6f": 0,
        "schedule3_line6l": 0,
        "schedule3_line6m": 0,
        "worksheet_b_applies": false
      }
    }
  ]
};

async function seeded(inputs: Inputs) {
  const baseDir = await sys.makeTempDir();
  const { returnId } = await createReturnCommand({ year: 2025, baseDir });
  for (const [nodeType, entries] of Object.entries(inputs)) {
    for (const fields of entries) {
      await appendInput(join(baseDir, returnId), nodeType, fields);
    }
  }
  return { baseDir, returnId };
}

async function hintsOf(inputs: Inputs, pattern: RegExp) {
  const { baseDir, returnId } = await seeded(inputs);
  try {
    const got = await getReturnCommand({ returnId, baseDir });
    const { report } = await validateReturnCommand({ returnId, baseDir });
    return {
      get: got.warnings.filter((w) => pattern.test(w)),
      validate: report.entries.filter((e) =>
        e.ruleNumber === "OPENTAX_HINT" && pattern.test(e.message)
      ),
      lines: got.lines,
      canFile: report.canFile,
    };
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
}

// 2025 Schedule R, Part I box 2 and Part II; the physician's statement is kept,
// not filed (Instructions for Schedule R, Part II).
test("return get and validate point a code 3 disability pension under 65 to Schedule R", async () => {
  const hints = await hintsOf(disabilityUnder65, /Schedule R/);
  assertEquals(hints.get.length, 1);
  assertMatch(hints.get[0], /kept with the filer's records, not filed/);
  assertEquals(hints.validate.length, 1);
  assertEquals(hints.validate[0].severity, "alert");
});

test("form add and the 1099-R template name Schedule R for box 7 code 3", async () => {
  const { baseDir, returnId } = await seeded({});
  try {
    const added = await formAddCommand({
      returnId,
      baseDir,
      nodeType: "f1099r",
      dataJson: JSON.stringify(disabilityUnder65["f1099r"][0]),
    });
    assertMatch(added.hint ?? "", /schedule_r/);
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
  const template = nodeTemplateCommand({
    document: "1099-r",
    year: 2025,
    full: false,
  });
  assertMatch(template.note ?? "", /code 3.*schedule_r/s);
});

// 2025 Instructions for Schedule A, line 9: Form 4952 figures the deduction
// unless investment interest is within interest and ordinary dividends minus
// qualified dividends (30 + ,870 - ,870 here).
test("return get and validate send investment interest over that limit to Form 4952", async () => {
  const hints = await hintsOf(scheduleALine9, /Form 4952/);
  assertEquals(hints.get.length, 1);
  assertMatch(hints.get[0], /\$650\b.*\$330\b/);
  assertEquals(hints.validate.length, 1);
});

// 2025 Qualified Dividends and Capital Gain Tax Worksheet, MFJ: line 1
// 218,413; line 2 4,870 less the Form 4952 line 4g election of 320; line 3
// 37,109; line 5 176,754 taxed at 28,713.88 (2025 Tax Rate Schedule Y-1); 15%
// on 41,659 is 6,248.85; line 25 rounds 34,962.73 to 34,963.
test("Form 4952 election lowers the qualified dividends the worksheet taxes at 15%", async () => {
  const hints = await hintsOf(form4952Election, /Form 4952/);
  assertEquals(hints.get, []);
  assertEquals(hints.lines["line15_taxable_income"], 218_413);
  assertEquals(hints.lines["line16_income_tax"], 34_963);
});
