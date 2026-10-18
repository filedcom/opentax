import { test } from "bun:test";
import * as fs from "node:fs/promises";
import { assertEquals } from "@std/assert";
import * as sys from "../../../scripts/support/sys.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { f1040_2025 } from "../2025/index.ts";
import { f1040_2026 } from "./index.ts";

const zeroWorksheetA = {
  schedule3_line1: 0,
  schedule3_line2: 0,
  schedule3_line3: 0,
  schedule3_line4: 0,
  schedule3_line5b: 0,
  schedule3_line6d: 0,
  schedule3_line6f: 0,
  schedule3_line6l: 0,
  schedule3_line6m: 0,
  worksheet_b_applies: false,
};

const child = {
  first_name: "Lily",
  last_name: "Hayes",
  name_control: "HAYE",
  ssn: "222-33-4400",
  ssn_valid_for_employment: true,
  ssn_issued_before_due_date: true,
  tin_issued_by_due_date: true,
  dob: "2015-07-22",
  relationship: "daughter",
  irs_relationship_code: "DAUGHTER",
  months_in_home: 12,
  months_lived_with_you_in_us: 12,
  lived_in_us_over_half_year: true,
  us_citizen_national_or_resident: true,
  provided_over_half_own_support: false,
  filed_joint_return_except_refund_only: false,
  dependent_on_another_return: false,
};

function hohReturn(dependents: ReadonlyArray<Record<string, unknown>>) {
  return {
    general: {
      filing_status: "hoh",
      taxpayer_first_name: "Morgan",
      taxpayer_last_name: "Hayes",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-04-10",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_can_be_claimed_as_dependent: false,
      address_line1: "1 Example Way",
      address_city: "Reno",
      address_state: "NV",
      address_zip: "89501",
      digital_assets: false,
      hoh_paid_more_than_half_home_costs: true,
      main_home_in_us_over_half_year: true,
      child_eic_filer_review: {
        not_qualifying_child_of_another_taxpayer_verified: true,
        relationship_age_residence_record_reference: "Synthetic family review",
      },
      prior_eic_disallowance_review: {
        status: "none",
        irs_account_record_reference: "Synthetic IRS account transcript",
        no_nonclerical_disallowance_since_1996_verified: true,
      },
      eic_tax_residency_review: {
        status: "all_year_resident",
        taxpayer_status_record_reference: "Synthetic resident status review",
      },
      dependents,
    },
    w2: [{
      box1_wages: 45_000,
      box2_fed_withheld: 3_500,
      employee_ssn: "111-22-3333",
      box3_ss_wages: 45_000,
      box4_ss_withheld: 2_790,
      box5_medicare_wages: 45_000,
      box6_medicare_withheld: 652.5,
      employer_ein: "12-3456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Employer Road",
      employer_address_city: "Reno",
      employer_address_state: "NV",
      employer_address_zip: "89501",
      box12_entries: [],
    }],
    f8812_credit_limit_worksheet: { credit_limit_worksheet: zeroWorksheetA },
    f8812_earned_income_worksheet: {
      earned_income_worksheet: {
        form1040_line1z_wages: 45_000,
        nontaxable_combat_pay: 0,
        schedule_c_statutory_employee_income: 0,
        nonfarm_schedule_c_and_k1_net: 0,
        farm_schedule_f_and_k1_net: 0,
        farm_optional_method_used: false,
        excluded_medicaid_waiver_payments: 0,
        schedule1_line15_se_deduction: 0,
      },
    },
  };
}

function f1040Of(result: { pending: Record<string, unknown> }) {
  return result.pending.f1040 as Record<string, unknown>;
}

async function validatedXml(
  result: { pending: Record<string, unknown> },
): Promise<string> {
  const pending = f1040_2026.buildPending!(result.pending);
  const filer = extractFilerIdentity(f1040Of(result))!;
  const xml = await f1040_2026.buildMefXml!(pending, filer);
  assertEquals(xml.includes("<TaxYr>2026</TaxYr>"), true);
  const path = await sys.makeTempFile({
    prefix: "opentax-ty2026-credits-",
    suffix: ".xml",
  });
  await fs.writeFile(path, xml);
  const schema = new URL(
    "../../../irs/mef/2026v1.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const validation = await new sys.Command("xmllint", {
    args: ["--noout", "--schema", schema, path],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(
    validation.code,
    0,
    new TextDecoder().decode(validation.stderr),
  );
  return xml;
}

// Draft 2026 Schedule 8812 instructions, Reminders: $2,200 CTC and $1,700
// ACTC per child (Rev. Proc. 2025-32 §4.05). EIC: Rev. Proc. 2025-32
// §4.06(1), one child, $4,427 maximum less 15.98% of the $45,025 row
// midpoint over $23,890: $1,049.63, which the EIC Table rounds to $1,050.
test("a TY2026 HOH return with one child claims the 2026 CTC, ACTC and EIC and exports 2026v1.0 XML", async () => {
  const result = f1040_2026.executeReturn(hohReturn([child]));
  assertEquals(result.diagnostics, []);
  const f1040 = f1040Of(result);
  assertEquals(f1040.qualifying_child_tax_credit_count, 1);
  const ctc = f1040.line19_child_tax_credit as number;
  const actc = f1040.line28_actc as number;
  assertEquals(ctc + actc, 2_200);
  assertEquals(actc <= 1_700, true);
  assertEquals(f1040.line27_eitc, 1_050);

  const xml = await validatedXml(result);
  assertEquals(xml.includes("<IRS1040Schedule8812"), true);
  assertEquals(xml.includes("<IRS1040ScheduleEIC"), true);
}, 60_000);

// Draft 2026 Schedule 8812 instructions, Example 1: a child who turned 17
// during 2026 can't be used for the CTC; the ODC applies instead.
test("the CTC age test reads the return's tax year", () => {
  const turned17 = { ...child, dob: "2009-07-01" };
  const ty2025 = f1040Of(f1040_2025.executeReturn(hohReturn([turned17])));
  const ty2026 = f1040Of(f1040_2026.executeReturn(hohReturn([turned17])));
  assertEquals(ty2025.qualifying_child_tax_credit_count, 1);
  assertEquals(ty2026.qualifying_child_tax_credit_count, 0);
  assertEquals(ty2026.other_dependent_count, 1);
});

// Rev. Proc. 2025-32 §4.23: the 2026 qualifying-relative gross income limit
// is $5,300 ($5,200 for 2025, Rev. Proc. 2024-40 §2.24).
test("the qualifying-relative gross income limit reads the tax year", () => {
  const parent = {
    ...child,
    first_name: "Ruth",
    ssn: "222-33-4401",
    dob: "1950-02-01",
    relationship: "parent",
    irs_relationship_code: "PARENT",
    months_in_home: 0,
    months_lived_with_you_in_us: 0,
    provided_over_half_own_support: false,
    taxpayer_provided_over_half_support: true,
    gross_income: 5_250,
  };
  const ty2025 = f1040Of(f1040_2025.executeReturn(hohReturn([child, parent])));
  const ty2026 = f1040Of(f1040_2026.executeReturn(hohReturn([child, parent])));
  assertEquals(ty2025.other_dependent_count, 0);
  assertEquals(ty2026.other_dependent_count, 1);
});

test("a TY2026 custodial EIC release routes filing status to every threshold node", () => {
  const released = {
    ...child,
    first_name: "Rose",
    ssn: "222-33-4401",
    dependent_on_another_return: true,
    custodial_eitc_release_review: {
      form8332_source_reference: "Synthetic Form 8332",
      custody_record_reference: "Synthetic custody order",
      custodial_parent_for_tax_year: true,
      valid_tax_year_release_to_noncustodial_parent: true,
      no_competing_eitc_claim_verified: true,
    },
  };
  const result = f1040_2026.executeReturn(hohReturn([child, released]));
  assertEquals(
    result.diagnostics.filter((item) => item.severity === "error")
      .map((item) => item.message),
    [],
  );
  for (const node of ["form8959", "standard_deduction", "form8960"]) {
    assertEquals(
      (result.pending[node] as Record<string, unknown>).filing_status,
      "hoh",
    );
  }
});

const singleW2Return = {
  general: {
    filing_status: "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Example Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    digital_assets: false,
  },
  w2: [{
    box1_wages: 90_000,
    box2_fed_withheld: 9_000,
    employee_ssn: "111-22-3333",
    box3_ss_wages: 90_000,
    box4_ss_withheld: 5_580,
    box5_medicare_wages: 90_000,
    box6_medicare_withheld: 1_305,
    employer_ein: "12-3456789",
    employer_name: "Example Employer",
    employer_address_line1: "10 Employer Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    box12_entries: [],
  }],
};

// Draft 2026 Form 2441 instructions, line 8: $89,000-$91,000 (other than
// MFJ) is .27, so $3,000 of expenses gives an $810 credit.
test("a TY2026 Form 2441 credit uses the 2026 phaseout schedule and exports", async () => {
  const result = f1040_2026.executeReturn({
    ...singleW2Return,
    form2441: {
      filing_details: {
        filing_status: "single",
        care_providers: [{
          kind: "business",
          name: "Care Center",
          name_control: "CARE",
          ein: "123456789",
          us_address: {
            line1: "100 Main St",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
          household_employee: false,
          amount_paid: 3_000,
        }],
        qualifying_people: [{
          first_name: "Ada",
          last_name: "Example",
          name_control: "EXAM",
          ssn: "111223334",
          credit_expenses_paid: 3_000,
        }],
        taxpayer_earned_income: 90_000,
        tax_liability_limit: 5_000,
      },
    },
  });
  assertEquals(result.diagnostics, []);
  const schedule3 = result.pending.schedule3 as Record<string, unknown>;
  assertEquals(schedule3.line2_childcare_credit, 810);
  assertEquals((await validatedXml(result)).includes("<IRS2441"), true);
}, 60_000);

// Draft 2026 Form 5695 line 3: the smaller of the 2025 carryforward and the
// tax-liability limit goes to Schedule 3 line 5a.
test("a TY2026 Form 5695 carries the 2025 credit forward and exports", async () => {
  const result = f1040_2026.executeReturn({
    ...singleW2Return,
    f5695: { prior_year_carryforward: 1_200, part_i_tax_limit: 5_000 },
  });
  assertEquals(result.diagnostics, []);
  const schedule3 = result.pending.schedule3 as Record<string, unknown>;
  assertEquals(schedule3.line5a_residential_clean_energy, 1_200);
  assertEquals((await validatedXml(result)).includes("<IRS5695"), true);
}, 60_000);
