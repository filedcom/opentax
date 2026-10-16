import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateSaversCredit2026 as calculate,
  type SaversCreditSource2026,
} from "./savers-credit-source.ts";
import {
  saverDistribution2026,
  saverSource2026,
} from "./savers-credit.fixture.ts";
import { retirementIraSource2026 } from "./retirement-ira.fixture.ts";
import {
  retirementCopy2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 saver derives W-2 contributions and the printed tax-capacity worksheet", () => {
  const s = saverSource2026();
  s.finalized_tax = {
    line18: 1600,
    schedule3_line1: 100,
    schedule3_line2: 200,
    schedule3_line3: 300,
    schedule3_line6d: 400,
    schedule3_line6l: 50,
  };
  const r = calculate(s);
  assertEquals(r.columns[0].line6, 2000);
  assertEquals(r.lines, {
    line7: 2000,
    line8: 24000,
    line9: 0.5,
    line10: 1000,
    line11: 550,
    line12: 550,
  });
  assertEquals(r.tax_limit_worksheet, { line1: 1600, line2: 1050, line3: 550 });
  assertEquals(r.file_form8880, true);
  s.finalized_tax.line18 = 100;
  assertEquals(calculate(s).lines.line12, 0);
  assertEquals(calculate(s).file_form8880, false);
});

Deno.test("2026 saver tests every rate boundary for all five filing statuses", () => {
  for (
    const [status, thresholds] of [
      [FilingStatus.Single, [24250, 26250, 40250]],
      [FilingStatus.MFS, [24250, 26250, 40250]],
      [FilingStatus.QSS, [24250, 26250, 40250]],
      [FilingStatus.HOH, [36375, 39375, 60375]],
      [FilingStatus.MFJ, [48500, 52500, 80500]],
    ] as const
  ) {
    const s = saverSource2026(status === FilingStatus.MFJ);
    s.filing_status = status;
    for (const [index, boundary] of thresholds.entries()) {
      s.agi = boundary;
      assertEquals(calculate(s).lines.line9, [0.5, 0.2, 0.1][index]);
      s.agi = boundary + 1;
      assertEquals(calculate(s).lines.line9, [0.2, 0.1, 0][index]);
    }
  }
  const negative = saverSource2026();
  negative.agi = -100;
  assertEquals(calculate(negative).lines.line9, 0.5);
});

Deno.test("2026 saver eligibility uses Jan 1 birthday, five distinct months and actual dependent claim", () => {
  const s = saverSource2026();
  s.taxpayer_dob = "2009-01-01";
  assertEquals(calculate(s).lines.line12, 1000);
  s.taxpayer_dob = "2009-01-02";
  assertEquals(calculate(s).lines.line12, 0);
  s.taxpayer_dob = "1980-01-01";
  s.claim.owners[0].full_time_student_calendar_months = [1, 2, 3, 4];
  assertEquals(calculate(s).lines.line12, 1000);
  s.claim.owners[0].full_time_student_calendar_months.push(5);
  assertEquals(calculate(s).lines.line12, 0);
  s.claim.owners[0].full_time_student_calendar_months = [];
  s.claim.owners[0].claimed_as_dependent_on_another_2026_return = true;
  assertEquals(calculate(s).lines.line12, 0);
  s.claim.owners[0].full_time_student_calendar_months = [1, 1];
  assertThrows(() => calculate(s), Error, "repeat");
});

Deno.test("2026 saver an ineligible spouse still contributes distributions to an eligible joint owner", () => {
  const s = saverSource2026(true);
  s.wage_sources.push({
    ...s.wage_sources[0],
    source_document_reference: "spouse-wage",
    employee_ssn: s.spouse_ssn!,
  });
  s.claim.owners[1].full_time_student_calendar_months = [1, 2, 3, 4, 5];
  const d = saverDistribution2026();
  d.owner_tin = s.spouse_ssn!;
  s.claim.other_year_distributions = [d];
  const r = calculate(s);
  assertEquals(r.columns.map((c) => c.line6), [1000, 0]);
  assertEquals(r.lines.line12, 500);
});

Deno.test("2026 saver joint distribution columns honor each other year's actual joint status", () => {
  const s = saverSource2026(true);
  s.wage_sources[0].box12_entries![0].amount = 5000;
  s.wage_sources.push({
    ...s.wage_sources[0],
    source_document_reference: "spouse-wage",
    employee_ssn: s.spouse_ssn!,
  });
  s.claim.other_year_distributions = [saverDistribution2026(), {
    ...saverDistribution2026("future-spouse"),
    owner_tin: s.spouse_ssn!,
    received_on: "2027-04-14",
    gross: 500,
  }];
  s.claim.other_year_joint_status[0]
    .filed_or_plans_jointly_with_current_spouse = false;
  s.claim.other_year_joint_status[2]
    .filed_or_plans_jointly_with_current_spouse = false;
  assertEquals(calculate(s).columns.map((c) => c.line4), [1000, 500]);
  s.claim.other_year_joint_status[0]
    .filed_or_plans_jointly_with_current_spouse = true;
  assertEquals(calculate(s).columns.map((c) => c.line4), [1000, 1500]);
  s.claim.other_year_joint_status[2]
    .filed_or_plans_jointly_with_current_spouse = true;
  assertEquals(calculate(s).columns.map((c) => c.line4), [1500, 1500]);
});

Deno.test("2026 saver regular and extended due dates govern the complete distribution window", () => {
  const s = saverSource2026();
  const d = saverDistribution2026();
  s.claim.other_year_distributions = [d];
  assertEquals(calculate(s).lines.line12, 500);
  d.received_on = "2023-12-31";
  assertThrows(() => calculate(s), Error, "lookback");
  d.received_on = "2027-04-15";
  assertThrows(() => calculate(s), Error, "lookback");
  s.claim.filing_due_date = "2027-10-15";
  s.claim.extension_confirmation_reference = "extension-confirmation";
  s.claim.distribution_inventory_reviewed_through = "2027-10-14";
  s.claim.reviewed_on = "2027-10-15";
  assertEquals(calculate(s).lines.line12, 500);
  d.received_on = "2027-10-15";
  assertThrows(() => calculate(s), Error, "lookback");
  d.received_on = "2027-10-14";
  s.claim.extension_confirmation_reference = undefined;
  assertThrows(() => calculate(s), Error, "extension");
});

Deno.test("2026 saver code G includes only the reviewed governmental employee share", () => {
  const s = saverSource2026();
  s.wage_sources[0].box12_entries = [{
    code: Box12Code.G,
    amount: 5000,
    code_g_governmental_457b: true,
    code_g_employee_elective_amount: 1200,
    code_g_employee_split_review_ref: "governmental-plan-payroll",
  }];
  assertEquals(calculate(s).lines.line12, 600);
  s.wage_sources[0].box12_entries[0].code_g_employee_elective_amount =
    undefined;
  assertThrows(() => calculate(s), Error, "code G");
});

Deno.test("2026 saver voluntary payroll reconciles with an owned plan and rounds the combined line", () => {
  const s = saverSource2026();
  s.wage_sources[0].box12_entries![0].amount = 1000.25;
  s.claim.voluntary_employee_contributions = [{
    payroll: {
      source_document_reference: "payroll-receipt",
      employee_tin: s.taxpayer_ssn,
      employer_tin: "123456789",
      tax_year: 2026,
      employee_after_tax_paid: 500.25,
      not_reported_in_box12_verified: true,
      not_employer_contribution_or_section414h2_pickup_verified: true,
    },
    plan_statement: {
      source_document_reference: "plan-statement",
      participant_tin: s.taxpayer_ssn,
      sponsoring_employer_tin: "123456789",
      account_number: "after-tax",
      tax_year: 2026,
      qualified_under_section4974c_verified: true,
      not_ira_or_able_verified: true,
      voluntary_employee_contributions: 500.25,
      no_returned_contributions_verified: true,
    },
  }];
  const r = calculate(s);
  assertEquals(r.columns[0].line2, 1501);
  assertEquals(r.lines.line10, 751);
  s.claim.voluntary_employee_contributions[0].plan_statement
    .voluntary_employee_contributions = 500.24;
  assertThrows(() => calculate(s), Error, "reconcile");
});

function withRetirement(rs = retirementIraSource2026()) {
  const s = saverSource2026();
  s.taxpayer_dob = rs.taxpayer_dob;
  s.wage_sources = rs.wage_sources ?? [];
  s.retirement_sources_2026 = rs;
  s.claim.retirement_inventory_reference = rs.claim.record_reference;
  s.claim.reviewed_on = "2027-06-01";
  return s;
}
Deno.test("2026 saver replays nondeductible IRA contributions and excludes conversion before basis", () => {
  const s = withRetirement();
  const r = calculate(s);
  assertEquals(r.columns[0].line1, 2000);
  assertEquals(r.distribution_sources.map((s) => s.amount), [6000]);
  assertEquals(r.columns[0].line4, 6000); // Not taxable 5550 and not gross 16000.
  assertEquals(r.lines.line12, 0);
  s.wage_sources[0].box12_entries = [{ code: Box12Code.D, amount: 6000 }];
  s.retirement_sources_2026!.wage_sources = structuredClone(s.wage_sources);
  assertEquals(calculate(s).lines.line12, 1000);
});

Deno.test("2026 saver ignores superseded retirement copies and derives current rollover exclusion", () => {
  const copy = retirementCopy2026("original");
  copy.box1_gross_distribution = 1000;
  copy.box2a_taxable_amount = 1000;
  copy.box4_federal_withheld = 0;
  const corrected = {
    ...copy,
    source_document_reference: "correction",
    corrected: true,
    supersedes_document_reference: "original",
    box1_gross_distribution: 500,
    box2a_taxable_amount: 500,
  };
  const rs = retirementSource2026([copy, corrected]);
  rs.claim.reviews = rs.claim.reviews.slice(1);
  const s = withRetirement(rs);
  assertEquals(
    calculate(s).distribution_sources.map((
      s,
    ) => [s.source_document_reference, s.amount]),
    [["correction", 500]],
  );
  corrected.box7a_distribution_codes = [DistributionCode.CodeG];
  corrected.box2a_taxable_amount = 0;
  rs.claim.reviews[0].direct_rollover = {
    record_reference: "direct-transfer",
    transfer_date: "2026-08-01",
    destination_account_reference: "rollover-destination",
    destination_type: "traditional_ira",
    amount_transferred: 500,
    source_after_tax_basis: 0,
    eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: true,
    no_cash_received_by_filer_verified: true,
  };
  assertEquals(calculate(s).distribution_sources[0].amount, 0);
});

Deno.test("2026 saver inherited current IRA needs the actual spouse/nonspouse relationship", () => {
  const copy = retirementCopy2026("inherited-ira", true);
  copy.box7a_distribution_codes = [DistributionCode.Code4];
  const rs = retirementSource2026([copy]);
  rs.claim.reviews[0].death_benefit = {
    decedent_tin: "500001039",
    death_date: "2025-10-01",
    record_reference: "death-source",
    no_inherited_basis_or_special_tax_treatment_verified: true,
  };
  const s = withRetirement(rs);
  assertThrows(() => calculate(s), Error, "beneficiary relationship");
  s.claim.current_inherited_ira_relationships = [{
    source_document_reference: copy.source_document_reference,
    record_reference: "beneficiary-source",
    decedent_tin: "500001039",
    beneficiary_relationship: "nonspouse",
    beneficiary_entitlement_and_relationship_verified: true,
  }];
  assertEquals(calculate(s).distribution_sources[0].amount, 0);
  s.claim.current_inherited_ira_relationships[0].beneficiary_relationship =
    "spouse";
  assertEquals(calculate(s).distribution_sources[0].amount, 12000.25);
});

Deno.test("2026 saver source, identity, completeness and calendar substitutions fail", () => {
  const mutations: ((s: SaversCreditSource2026) => void)[] = [
    (s) => {
      s.claim.owners = [];
    },
    (s) => {
      s.claim.owners[0].owner_tin = "500001039";
    },
    (s) => {
      s.wage_sources.push(structuredClone(s.wage_sources[0]));
    },
    (s) => {
      s.wage_sources[0].employee_ssn = "500001039";
    },
    (s) => {
      s.wage_sources[0].box12_entries![0].amount = 1000.001;
    },
    (s) => {
      s.wage_sources[0].box12_entries![0].amount = 100000;
    },
    (s) => {
      s.claim.distribution_inventory_reviewed_through = "2027-04-13";
    },
    (s) => {
      s.claim.reviewed_on = "2027-04-13";
    },
    (s) => {
      s.claim.other_year_distributions = [{
        ...saverDistribution2026(),
        received_on: "2026-05-01",
      }];
    },
    (s) => {
      s.claim.other_year_distributions = [{
        ...saverDistribution2026(),
        source_document_reference: "saver-review",
      }];
    },
    (s) => {
      s.claim.other_year_distributions = [{
        ...saverDistribution2026(),
        plan_type: "able",
        treatment: "roth_conversion",
      }];
    },
  ];
  for (const mutate of mutations) {
    const s = saverSource2026();
    mutate(s);
    assertThrows(() => calculate(s));
  }
  const rs = withRetirement();
  rs.wage_sources = structuredClone(rs.wage_sources);
  rs.wage_sources[0].box1_wages += 1;
  assertThrows(() => calculate(rs), Error, "same owners, wages");
  const joint = saverSource2026(true);
  joint.claim.other_year_joint_status.pop();
  assertThrows(() => calculate(joint), Error, "joint-filing record");
});

Deno.test("2026 saver reproduces the IRS joint-distribution example (5000 / 7000)", () => {
  const s = saverSource2026(true),
    copy = retirementCopy2026("current-five-thousand");
  copy.box1_gross_distribution = 5000;
  copy.box2a_taxable_amount = 5000;
  const rs = retirementSource2026([copy]);
  rs.filing_status = FilingStatus.MFJ;
  rs.spouse_ssn = s.spouse_ssn;
  rs.spouse_dob = s.spouse_dob;
  rs.wage_sources = structuredClone(s.wage_sources);
  s.taxpayer_dob = rs.taxpayer_dob;
  s.retirement_sources_2026 = rs;
  s.claim.retirement_inventory_reference = rs.claim.record_reference;
  s.claim.other_year_distributions = [{
    ...saverDistribution2026("spouse-2024-roth"),
    owner_tin: s.spouse_ssn!,
    plan_type: "roth_ira",
    gross: 2000,
  }];
  s.claim.other_year_joint_status[0]
    .filed_or_plans_jointly_with_current_spouse = false;
  assertEquals(calculate(s).columns.map((c) => c.line4), [5000, 7000]);
});

Deno.test("2026 saver historical exclusions retain gross evidence without reducing contributions", () => {
  const cases = [
    ["nontaxable_rollover", "traditional_ira"],
    ["roth_conversion", "traditional_ira"],
    ["deemed_plan_loan", "qualified_employer_plan"],
    ["returned_excess_contributions", "simple_ira"],
    ["timely_returned_ira_contribution", "roth_ira"],
    ["section404k_esop_dividend", "qualified_employer_plan"],
    ["military_retirement", "military_retirement"],
    ["nonspousal_inherited_ira", "traditional_ira"],
  ] as const;
  for (const [treatment, plan_type] of cases) {
    const s = saverSource2026();
    s.claim.other_year_distributions = [{
      ...saverDistribution2026(),
      treatment,
      plan_type,
    }];
    const r = calculate(s);
    assertEquals(r.columns[0].line4, 0);
    assertEquals(r.lines.line12, 1000);
    assertEquals(r.source_input.claim.other_year_distributions[0].gross, 1000);
  }
  const able = saverSource2026();
  able.claim.other_year_distributions = [{
    ...saverDistribution2026(),
    plan_type: "able",
  }];
  assertEquals(calculate(able).lines.line12, 500);
});
