import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { eitc } from "./index.ts";
import { eitc as scheduleEic } from "../../../../2025/mef/forms/credits/eitc.ts";
import { FilingStatus } from "../../../types.ts";

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function compute(input: Record<string, unknown>) {
  return eitc.compute({ taxYear: 2025, formType: "f1040" }, {
    filer_has_valid_ssns: true,
    taxpayer_dob: "1985-06-15",
    main_home_in_us_over_half_year: true,
    taxpayer_can_be_claimed_as_dependent: false,
    childless_eic_review: {
      not_qualifying_child_of_another_taxpayer_verified: true,
      qualifying_child_status_record_reference: "Synthetic 2025 family review",
    },
    child_eic_filer_review: {
      not_qualifying_child_of_another_taxpayer_verified: true,
      relationship_age_residence_record_reference:
        "Synthetic 2025 filer family and residence review",
    },
    prior_eic_disallowance_review: {
      status: "none",
      irs_account_record_reference: "Synthetic IRS account transcript review",
      no_nonclerical_disallowance_since_1996_verified: true,
    },
    eic_tax_residency_review: {
      status: "all_year_resident",
      taxpayer_status_record_reference: "Synthetic 2025 resident status review",
      spouse_status_record_reference: "Synthetic 2025 spouse status review",
    },
    ...input,
  });
}

Deno.test("explicit Form 1040 line 27c election suppresses an otherwise eligible EIC", () => {
  const claim = {
    earned_income: 15_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  };
  assertEquals(getCredit(claim) > 0, true);
  noCredit({ ...claim, do_not_claim_eic: true });
  assertEquals(getCredit({ ...claim, do_not_claim_eic: false }) > 0, true);
});

Deno.test("EITC needs verified filer SSNs", () => {
  noCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    filer_has_valid_ssns: false,
  });
  noCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    filer_has_valid_ssns: undefined,
  });
});

Deno.test("filing Form 2555 disqualifies EIC even with earned income and a child", () => {
  noCredit({
    earned_income: 15_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    form2555_filed: true,
  });
});

Deno.test("EIC requires reviewed all-year resident status or a valid joint election", () => {
  const base = {
    earned_income: 15_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  };
  assertEquals(getCredit(base) > 0, true);
  noCredit({ ...base, eic_tax_residency_review: undefined });
  noCredit({
    ...base,
    eic_tax_residency_review: {
      status: "joint_new_election",
      elected_person: "taxpayer",
      elected_spouse_nonresident_at_year_end_verified: true,
      other_spouse_citizen_or_resident_at_year_end_verified: true,
      worldwide_income_included_verified: true,
      status_record_reference: "2025 status record",
      signed_statement_file_name: "ResidentElection.pdf",
      signed_statement_pdf_sha256: "a".repeat(64),
      statement_signed_by_both_verified: true,
    },
  });
  noCredit({
    ...base,
    filing_status: FilingStatus.MFJ,
    eic_tax_residency_review: {
      status: "all_year_resident",
      taxpayer_status_record_reference: "2025 taxpayer status record",
    },
  });
  assertEquals(
    getCredit({
      ...base,
      filing_status: FilingStatus.MFJ,
      eic_tax_residency_review: {
        status: "joint_prior_election",
        elected_person: "spouse",
        election_still_in_effect_verified: true,
        at_least_one_spouse_citizen_or_resident_during_2025_verified: true,
        worldwide_income_included_verified: true,
        prior_joint_return_reference: "2024 joint Form 1040",
        prior_signed_statement_reference: "2024 signed election statement",
      },
    }) > 0,
    true,
  );
});

Deno.test("childless EIC requires DOB, U.S. main home, and reviewed dependent status", () => {
  const base = { earned_income: 12_000, filing_status: FilingStatus.Single };
  assertEquals(getCredit(base), 542);
  noCredit({ ...base, taxpayer_dob: undefined });
  noCredit({ ...base, taxpayer_dob: "2001-01-02" });
  noCredit({ ...base, taxpayer_dob: "1960-12-31" });
  noCredit({ ...base, main_home_in_us_over_half_year: false });
  noCredit({ ...base, main_home_in_us_over_half_year: undefined });
  noCredit({ ...base, taxpayer_can_be_claimed_as_dependent: true });
  noCredit({ ...base, taxpayer_can_be_claimed_as_dependent: undefined });
  noCredit({ ...base, childless_eic_review: undefined });
});

Deno.test("childless EIC honors the IRS birthday boundaries", () => {
  const base = { earned_income: 12_000, filing_status: FilingStatus.Single };
  assertEquals(getCredit({ ...base, taxpayer_dob: "2001-01-01" }), 542);
  assertEquals(getCredit({ ...base, taxpayer_dob: "1961-01-01" }), 542);
  noCredit({
    ...base,
    taxpayer_dob: "2000-02-14",
    taxpayer_death_date: "2025-02-12",
  });
  assertEquals(
    getCredit({
      ...base,
      taxpayer_dob: "2000-02-14",
      taxpayer_death_date: "2025-02-13",
    }),
    542,
  );
  noCredit({
    ...base,
    taxpayer_dob: "1960-02-14",
    taxpayer_death_date: "2025-02-14",
  });
  assertEquals(
    getCredit({
      ...base,
      taxpayer_dob: "1960-02-14",
      taxpayer_death_date: "2025-02-13",
    }),
    542,
  );
});

Deno.test("MFJ childless EIC accepts one age-eligible spouse; HOH requires unmarried review", () => {
  const base = { earned_income: 12_000 };
  assertEquals(
    getCredit({
      ...base,
      filing_status: FilingStatus.MFJ,
      taxpayer_dob: "2003-06-15",
      spouse_dob: "1985-06-15",
      childless_eic_review: undefined,
    }),
    649,
  );
  noCredit({
    ...base,
    filing_status: FilingStatus.MFJ,
    taxpayer_dob: "2003-06-15",
    spouse_dob: "2004-06-15",
  });
  noCredit({ ...base, filing_status: FilingStatus.HOH });
  assertEquals(
    getCredit({
      ...base,
      filing_status: FilingStatus.HOH,
      childless_eic_review: {
        not_qualifying_child_of_another_taxpayer_verified: true,
        qualifying_child_status_record_reference:
          "Synthetic 2025 family review",
        hoh_unmarried_at_year_end_verified: true,
      },
    }),
    542,
  );
});

Deno.test("EIC requires reviewed prior-disallowance history and the matching Form 8862 when needed", () => {
  const base = { earned_income: 12_000, filing_status: FilingStatus.Single };
  noCredit({ ...base, prior_eic_disallowance_review: undefined });
  const required = {
    status: "requires_8862",
    disallowed_year: 2023,
    disallowance_notice_reference: "Synthetic 2023 IRS notice",
  };
  noCredit({ ...base, prior_eic_disallowance_review: required });
  noCredit({
    ...base,
    prior_eic_disallowance_review: required,
    form8862_filed: true,
    form8862_disallowed_year: 2022,
    form8862_notice_reference: "Synthetic 2023 IRS notice",
  });
  assertEquals(
    getCredit({
      ...base,
      prior_eic_disallowance_review: required,
      form8862_filed: true,
      form8862_disallowed_year: 2023,
      form8862_notice_reference: "Synthetic 2023 IRS notice",
    }),
    542,
  );
  assertEquals(
    getCredit({
      ...base,
      prior_eic_disallowance_review: {
        status: "math_or_clerical_only",
        irs_notice_reference: "Synthetic 2023 math-error notice",
        no_other_disallowance_verified: true,
      },
    }),
    542,
  );
  assertEquals(
    getCredit({
      ...base,
      prior_eic_disallowance_review: {
        status: "reinstated",
        disallowance_notice_reference: "Synthetic 2022 IRS notice",
        later_allowance_notice_reference: "Synthetic 2023 allowance notice",
        no_new_disallowance_verified: true,
      },
    }),
    542,
  );
  assertEquals(
    getCredit({
      ...base,
      prior_eic_disallowance_review: {
        status: "childless_exception",
        disallowance_notice_reference: "Synthetic 2023 child-only notice",
        disallowed_only_for_child_qualification_verified: true,
        no_other_disallowance_verified: true,
        no_active_ban_verified: true,
      },
    }),
    542,
  );
  noCredit({
    ...base,
    qualifying_children: 1,
    prior_eic_disallowance_review: {
      status: "childless_exception",
      disallowance_notice_reference: "Synthetic 2023 child-only notice",
      disallowed_only_for_child_qualification_verified: true,
      no_other_disallowance_verified: true,
      no_active_ban_verified: true,
    },
  });
});

Deno.test("a nonjoint child EIC requires the filer's qualifying-child status review", () => {
  const base = {
    earned_income: 15_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  };
  assertEquals(getCredit(base), 4_328);
  noCredit({ ...base, child_eic_filer_review: undefined });
  assertEquals(
    getCredit({
      ...base,
      filing_status: FilingStatus.MFJ,
      child_eic_filer_review: undefined,
    }),
    4_328,
  );
  noCredit({
    ...base,
    filing_status: FilingStatus.MFS,
    child_eic_filer_review: undefined,
    mfs_separation_reviewed: false,
  });
  assertEquals(
    getCredit({
      ...base,
      filing_status: FilingStatus.MFS,
      child_eic_filer_review: undefined,
      mfs_separation_reviewed: true,
    }),
    4_328,
  );
});

function getCredit(input: Record<string, unknown>): number {
  const result = compute(input);
  const out = result.outputs.find((o) => o.nodeType === "f1040");
  return (out?.fields.line27_eitc as number) ?? 0;
}

function noCredit(input: Record<string, unknown>): void {
  const result = compute(input);
  const out = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(out, undefined);
}

// ─── No Income ────────────────────────────────────────────────────────────────

Deno.test("no_earned_income_no_credit — earned_income=0 → no output", () => {
  noCredit({
    earned_income: 0,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
});

Deno.test("no_earned_income_no_credit — empty input → no output", () => {
  noCredit({});
});

Deno.test("computed EITC amount is retained for the MeF Schedule EIC builder", () => {
  const result = compute({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  const filing = result.outputs.find((item) => item.nodeType === "eitc");
  assertEquals(filing?.fields.credit_amount, 4_328);
});

Deno.test("qualifying-child facts survive EIC finalization and reach Schedule EIC", () => {
  const child = {
    first_name: "Ada",
    last_name: "Taxpayer",
    name_control: "TAXP",
    ssn: "111-22-3334",
    ssn_valid_for_employment: true,
    tin_issued_by_due_date: true,
    dob: "2017-06-15",
    irs_relationship_code: "DAUGHTER",
    months_in_home: 12,
    months_lived_with_you_in_us: 12,
  };
  const result = compute({
    earned_income: 12_730,
    qualifying_children: 1,
    qualifying_child_details: [child],
    filing_status: FilingStatus.Single,
  });
  const filing = result.outputs.find((item) => item.nodeType === "eitc");
  assertEquals(filing?.fields.qualifying_children, 1);
  assertEquals(filing?.fields.qualifying_child_details, [child]);
  const xml = scheduleEic.build(filing?.fields ?? {});
  assertStringIncludes(
    xml,
    "<QualifyingChildSSN>111223334</QualifyingChildSSN>",
  );
});

Deno.test("a positive child EIC without child rows cannot disappear from MeF", () => {
  const result = compute({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  const filing = result.outputs.find((item) => item.nodeType === "eitc");
  assertThrows(
    () => scheduleEic.build(filing?.fields ?? {}),
    Error,
    "count does not match child detail",
  );
});

// ─── Investment Income Disqualifier ──────────────────────────────────────────

Deno.test("investment_income_disqualifier_at_limit — $11,950 → still eligible", () => {
  // At exactly the limit: still qualifies. Credit = 4328 (at max for 1 child).
  const credit = getCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    investment_income: 11_950,
  });
  assertEquals(credit, 4_328);
});

Deno.test("investment_income_disqualifier_over_limit — $11,951 → no credit", () => {
  noCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    investment_income: 11_951,
  });
});

// ─── IRS 2025 EIC Table and Worksheets A/B ────────────────────────────────

Deno.test("IRS published table example: $2,455 and one child gives $842", () => {
  assertEquals(
    getCredit({
      earned_income: 2_455,
      qualifying_children: 1,
      filing_status: FilingStatus.Single,
    }),
    842,
  );
});

Deno.test("EIC uses the $50 table band, not a rounded phase-in formula", () => {
  assertEquals(
    getCredit({ earned_income: 5_000, filing_status: FilingStatus.Single }),
    384,
  );
  assertEquals(
    getCredit({ earned_income: 5_049, filing_status: FilingStatus.Single }),
    384,
  );
  assertEquals(
    getCredit({
      earned_income: 6_365,
      qualifying_children: 1,
      filing_status: FilingStatus.Single,
    }),
    2_168,
  );
  assertEquals(
    getCredit({
      earned_income: 8_940,
      qualifying_children: 2,
      filing_status: FilingStatus.Single,
    }),
    3_570,
  );
  assertEquals(
    getCredit({
      earned_income: 8_940,
      qualifying_children: 3,
      filing_status: FilingStatus.Single,
    }),
    4_016,
  );
});

Deno.test("EIC table applies the TY2025 phase-out bands for single and joint filers", () => {
  assertEquals(
    getCredit({ earned_income: 19_000, filing_status: FilingStatus.Single }),
    6,
  );
  assertEquals(
    getCredit({ earned_income: 19_000, filing_status: FilingStatus.MFJ }),
    550,
  );
  assertEquals(
    getCredit({
      earned_income: 45_000,
      qualifying_children: 1,
      filing_status: FilingStatus.Single,
    }),
    864,
  );
  assertEquals(
    getCredit({
      earned_income: 45_000,
      qualifying_children: 1,
      filing_status: FilingStatus.MFJ,
    }),
    2_002,
  );
});

Deno.test("qualifying surviving spouse uses the single/HOH/QSS EIC table column", () => {
  assertEquals(
    getCredit({ earned_income: 19_000, filing_status: FilingStatus.QSS }),
    6,
  );
});

Deno.test("EIC compares AGI table credit when AGI crosses the worksheet threshold", () => {
  assertEquals(
    getCredit({
      earned_income: 25_000,
      agi: 40_000,
      qualifying_children: 1,
      filing_status: FilingStatus.Single,
    }),
    1_663,
  );
  // Below $23,350, Worksheet A keeps the earned-income table amount.
  assertEquals(
    getCredit({
      earned_income: 12_730,
      agi: 10_000,
      qualifying_children: 1,
      filing_status: FilingStatus.Single,
    }),
    4_328,
  );
});

Deno.test("EIC honors the IRS table's exact-dollar terminal footnotes", () => {
  const cases: Array<[number, number, FilingStatus, number]> = [
    [19_103, 0, FilingStatus.Single, 1],
    [19_104, 0, FilingStatus.Single, 0],
    [26_213, 0, FilingStatus.MFJ, 1],
    [26_214, 0, FilingStatus.MFJ, 0],
    [50_433, 1, FilingStatus.Single, 3],
    [50_434, 1, FilingStatus.Single, 0],
    [57_309, 2, FilingStatus.Single, 1],
    [57_310, 2, FilingStatus.Single, 0],
    [57_550, 1, FilingStatus.MFJ, 0],
    [61_554, 3, FilingStatus.Single, 1],
    [61_555, 3, FilingStatus.Single, 0],
    [64_429, 2, FilingStatus.MFJ, 3],
    [64_430, 2, FilingStatus.MFJ, 0],
    [68_674, 3, FilingStatus.MFJ, 3],
    [68_675, 3, FilingStatus.MFJ, 0],
  ];
  for (
    const [earned_income, qualifying_children, filing_status, expected] of cases
  ) {
    assertEquals(
      getCredit({ earned_income, qualifying_children, filing_status }),
      expected,
    );
  }
});

Deno.test("Worksheet B subtracts Schedule SE line 13 from Schedule C earned income", () => {
  assertEquals(
    getCredit({
      se_net_profit: 6_365,
      se_tax_deduction: 450,
      qualifying_children: 1,
      filing_status: FilingStatus.Single,
    }),
    2_015,
  );
});

Deno.test("MFS without the separate-spouse eligibility route has no EIC", () => {
  noCredit({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.MFS,
  });
});

Deno.test("reviewed MFS separation with one child uses the single EIC column", () => {
  assertEquals(
    getCredit({
      earned_income: 15_000,
      qualifying_children: 1,
      filing_status: FilingStatus.MFS,
      mfs_separation_reviewed: true,
    }),
    4_328,
  );
  noCredit({
    earned_income: 15_000,
    filing_status: FilingStatus.MFS,
    mfs_separation_reviewed: true,
  });
});

Deno.test("computed EIC routes to Form 1040 line 27a", () => {
  const result = compute({
    earned_income: 12_730,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
  });
  const out = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(out?.fields.line27_eitc, 4_328);
});
