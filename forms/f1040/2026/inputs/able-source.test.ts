import { assertEquals, assertThrows } from "@std/assert";
import {
  ableDistribution2026,
  ableEmployment2026,
  ableSource2026,
} from "./able.fixture.ts";
import {
  type AbleSource2026,
  calculateAbleSources2026,
} from "./able-source.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { businessQbiFixture2026 } from "./business-qbi.fixture.ts";
import { resolveBusinessQbi2026 } from "./business-qbi.ts";
import {
  ableDistributionReviewSchema,
  createAbleDistributionReviewSchema,
} from "../../nodes/intermediate/forms/credits/individual/form8880/able_distribution_review.ts";
import {
  ableEmploymentReviewSchema,
  createAbleEmploymentReviewSchema,
} from "../../nodes/intermediate/forms/credits/individual/form8880/able_employment_review.ts";

Deno.test("2026 ABLE separates beneficiary cash from QTP and other contributions with the 20000 annual limit", () => {
  const s = ableSource2026(), a = s.claim.accounts[0];
  a.form5498qa.box1_contributions = 20000;
  a.other_contributors_cash = 17000;
  a.qtp_rollovers_or_transfers = 1000;
  const r = calculateAbleSources2026(s);
  assertEquals(r.owners[0].saver_contributions, 2000);
  assertEquals(r.taxable_earnings, 0);
  assertEquals(r.additional_tax, 0);
  a.form5498qa.box1_contributions += .01;
  a.other_contributors_cash += .01;
  assertThrows(() => calculateAbleSources2026(s), Error, "annual limits");
});
Deno.test("2026 ABLE checks onset before age 46 and actual account ownership", () => {
  const s = ableSource2026();
  s.claim.accounts[0].eligibility.blindness_or_disability_onset = "2025-12-31";
  assertEquals(calculateAbleSources2026(s).accounts.length, 1);
  for (
    const mutate of [
      (x: AbleSource2026) => {
        x.claim.accounts[0].eligibility.blindness_or_disability_onset =
          "2026-01-01";
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].eligibility.blindness_or_disability_onset =
          "1979-12-31";
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].form5498qa.beneficiary_ssn = "999887777";
      },
      (x: AbleSource2026) => {
        x.claim.accounts.push(structuredClone(x.claim.accounts[0]));
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].beneficiary_payments[0].contributor_ssn =
          "999887777";
      },
    ]
  ) {
    const bad = structuredClone(s);
    mutate(bad);
    assertThrows(() => calculateAbleSources2026(bad));
  }
});
Deno.test("2026 ABLE taxable ratio retains gross saver distributions and produces owner Part II amounts", () => {
  const s = ableSource2026(), a = s.claim.accounts[0];
  a.no_current_year_able_distributions_confirmed = undefined;
  a.current_year_distributions = ableDistribution2026(s);
  a.current_distribution_copy_after_corrections_verified = true;
  const r = calculateAbleSources2026(s);
  assertEquals(r.owners[0].saver_distributions, 2000);
  assertEquals(r.taxable_earnings, 200);
  assertEquals(r.additional_tax, 20);
  assertEquals(r.owners[0].form5329_part2, {
    line5: 200,
    line6: 0,
    line7: 200,
    line8: 20,
  });
  a.current_year_distributions.qualified_expenses[0].amount = 2500;
  assertEquals(calculateAbleSources2026(s).taxable_earnings, 0);
  assertEquals(calculateAbleSources2026(s).owners[0].saver_distributions, 2000);
});
Deno.test("2026 ABLE expense election covers exactly the first 60 days and cannot use future review evidence", () => {
  const s = ableSource2026(), a = s.claim.accounts[0];
  a.no_current_year_able_distributions_confirmed = undefined;
  a.current_year_distributions = ableDistribution2026(s);
  a.current_distribution_copy_after_corrections_verified = true;
  const e = a.current_year_distributions.qualified_expenses[0];
  e.paid_on = "2027-03-01";
  e.next_year_60_day_election_ref = "60-day-election";
  assertEquals(calculateAbleSources2026(s).taxable_earnings, 200);
  e.paid_on = "2027-03-02";
  assertThrows(() => calculateAbleSources2026(s));
  e.paid_on = "2027-03-01";
  s.claim.reviewed_on = "2027-02-28";
  assertThrows(() => calculateAbleSources2026(s));
});
Deno.test("2026 ABLE increased limit uses prior-year HHS limits for the longest residence and actual wages", () => {
  for (
    const [state, extra] of [["CA", 15650], ["AK", 19550], [
      "HI",
      17990,
    ]] as const
  ) {
    const s = ableSource2026(), a = s.claim.accounts[0];
    const e = ableEmployment2026(s);
    a.employed_beneficiary_review = e;
    e.residence_periods[0].state = state;
    a.form5498qa.box1_contributions = a.beneficiary_payments[0].amount = 20000 +
      extra;
    assertEquals(
      calculateAbleSources2026(s).accounts[0].extra_contribution_limit,
      extra,
    );
    a.form5498qa.box1_contributions += .01;
    a.beneficiary_payments[0].amount += .01;
    assertThrows(() => calculateAbleSources2026(s));
    a.form5498qa.box1_contributions = a.beneficiary_payments[0].amount = 21000;
    s.wage_sources![0].box1_wages = 1000.25;
    assertEquals(
      calculateAbleSources2026(s).accounts[0].extra_contribution_limit,
      1000.25,
    );
    s.wage_sources![0].box1_wages = 999.99;
    assertThrows(() => calculateAbleSources2026(s));
  }
});
Deno.test("2026 ABLE employment rejects missing wages, contradictory plan deferrals, incomplete calendar and other-owner sources", () => {
  const s = ableSource2026();
  s.claim.accounts[0].employed_beneficiary_review = ableEmployment2026(s);
  for (
    const mutate of [
      (x: AbleSource2026) => {
        x.claim.accounts[0].employed_beneficiary_review!.wages = [];
      },
      (x: AbleSource2026) => {
        x.wage_sources![0].box12_entries = [{ code: Box12Code.D, amount: 1 }];
      },
      (x: AbleSource2026) => {
        x.wage_sources![0].box11_nonqual_plans = 1;
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].employed_beneficiary_review!.residence_periods[0]
          .from = "2026-01-02";
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].employed_beneficiary_review!.wages[0]
          .employer_plan_review_reference = "issued-5498qa";
      },
    ]
  ) {
    const bad = structuredClone(s);
    mutate(bad);
    assertThrows(() => calculateAbleSources2026(bad));
  }
});
Deno.test("2026 ABLE self-employment compensation replays the owned business and deductible SE tax", () => {
  const s = ableSource2026(), b = businessQbiFixture2026();
  b.taxpayer_tin = s.taxpayer_ssn;
  b.businesses.forEach((v) => {
    v.owner_tin = s.taxpayer_ssn;
  });
  b.w2s = [];
  s.wage_sources = [];
  s.business_sources_2026 = b;
  const a = s.claim.accounts[0], e = ableEmployment2026(s);
  a.employed_beneficiary_review = e;
  e.business_inventory_reference = b.record_reference;
  e.personal_service_business_references = b.businesses.map((v) =>
    v.business_reference
  );
  const actual = resolveBusinessQbi2026(b).business;
  const expected = Math.max(
    0,
    actual.owners[0].net_profit_subject_to_se -
      (actual.owners[0].schedule_se?.line13 ?? 0),
  );
  assertEquals(
    calculateAbleSources2026(s).accounts[0].extra_contribution_limit,
    Math.min(15650, expected),
  );
  e.personal_service_business_references = [];
  assertThrows(() => calculateAbleSources2026(s));
});
Deno.test("ABLE shared schemas preserve 2025 guards while validating 2026 dates independently", () => {
  const source = ableDistribution2026();
  assertThrows(() => ableDistributionReviewSchema.parse(source));
  createAbleDistributionReviewSchema(2026, true).parse(source);
  const r = calculateAbleSources2026({
    ...ableSource2026(),
    claim: {
      ...ableSource2026().claim,
      accounts: [{
        ...ableSource2026().claim.accounts[0],
        employed_beneficiary_review: ableEmployment2026(),
      }],
    },
  });
  assertThrows(() =>
    ableEmploymentReviewSchema.parse(r.accounts[0].employment)
  );
  createAbleEmploymentReviewSchema(2026).parse(r.accounts[0].employment);
});

Deno.test("2026 ABLE wage review distinguishes IRA deferrals from disqualifying employer plans", () => {
  const s = ableSource2026();
  s.claim.accounts[0].employed_beneficiary_review = ableEmployment2026(s);
  for (const code of [Box12Code.F, Box12Code.S]) {
    s.wage_sources![0].box12_entries = [{ code, amount: 1000 }];
    assertEquals(
      calculateAbleSources2026(s).accounts[0].extra_contribution_limit,
      15650,
    );
  }
  for (
    const code of [
      Box12Code.D,
      Box12Code.E,
      Box12Code.G,
      Box12Code.AA,
      Box12Code.BB,
      Box12Code.EE,
    ]
  ) {
    s.wage_sources![0].box12_entries = [{ code, amount: 1000 }];
    assertThrows(() => calculateAbleSources2026(s));
  }
});
Deno.test("2026 ABLE rejects inconsistent, stale, duplicate and unsupported annual source records", () => {
  const s = ableSource2026(), a = s.claim.accounts[0];
  a.no_current_year_able_distributions_confirmed = undefined;
  a.current_year_distributions = ableDistribution2026(s);
  a.current_distribution_copy_after_corrections_verified = true;
  for (
    const mutate of [
      (x: AbleSource2026) => {
        x.claim.accounts[0].current_year_distributions!.form1099qa.box3_basis++;
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].current_year_distributions!.form1099qa.tax_year =
          2025;
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].current_year_distributions!.distributions[0]
          .amount--;
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].current_year_distributions!.form1099qa
          .account_number = "other";
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0]
          .current_distribution_copy_after_corrections_verified = undefined;
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].no_current_year_able_distributions_confirmed = true;
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].current_year_distributions!.qualified_expenses[0]
          .source_document_ref = "own-payment";
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].form5498qa.source_document_ref =
          x.wage_sources![0].source_document_reference;
      },
      (x: AbleSource2026) => {
        x.claim.accounts[0].beneficiary_payments[0].paid_on = "2025-12-31";
      },
    ]
  ) {
    const bad = structuredClone(s);
    mutate(bad);
    assertThrows(() => calculateAbleSources2026(bad));
  }
  assertThrows(() =>
    calculateAbleSources2026(
      {
        ...s,
        claim: {
          ...s.claim,
          accounts: [{
            ...a,
            form5498qa: { ...a.form5498qa, box8_trump_account_rollover: 100 },
          }],
        },
      } as unknown as AbleSource2026,
    )
  );
});

Deno.test("2026 ABLE keeps joint beneficiaries separate and rejects a nonjoint spouse account", async () => {
  const { FilingStatus } = await import("../../nodes/types.ts");
  const s = ableSource2026();
  s.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = "400001038";
  s.spouse_dob = "1980-02-01";
  const second = structuredClone(s.claim.accounts[0]);
  second.form5498qa.beneficiary_ssn = s.spouse_ssn;
  second.form5498qa.source_document_ref += "-spouse";
  second.form5498qa.account_number += "-spouse";
  second.program_review_ref += "-spouse";
  second.contribution_detail_ref += "-spouse";
  second.eligibility.record_reference += "-spouse";
  second.beneficiary_payments[0].source_document_ref += "-spouse";
  second.beneficiary_payments[0].contributor_ssn = s.spouse_ssn;
  second.form5498qa.box1_contributions =
    second.beneficiary_payments[0].amount =
      1500.49;
  s.claim.accounts.push(second);
  assertEquals(
    calculateAbleSources2026(s).owners.map((o) => o.saver_contributions),
    [2000, 1500.49],
  );
  s.filing_status = FilingStatus.MFS;
  assertThrows(() => calculateAbleSources2026(s));
});

Deno.test("2026 ABLE rounds taxable earnings before additional tax and preserves source cents", () => {
  const s = ableSource2026(), a = s.claim.accounts[0];
  a.no_current_year_able_distributions_confirmed = undefined;
  a.current_year_distributions = ableDistribution2026(s);
  a.current_distribution_copy_after_corrections_verified = true;
  a.current_year_distributions.form1099qa.box2_earnings = 259.10;
  a.current_year_distributions.form1099qa.box3_basis = 1740.90;
  const r = calculateAbleSources2026(s);
  assertEquals(r.accounts[0].distribution?.taxableEarnings, 129.55);
  assertEquals(r.taxable_earnings, 130);
  assertEquals(r.additional_tax, 13);
  assertEquals(r.owners[0].saver_distributions, 2000);
  s.taxpayer_dob = "1980-02-29";
  a.eligibility.blindness_or_disability_onset = "2026-02-27";
  calculateAbleSources2026(s);
  a.eligibility.blindness_or_disability_onset = "2026-02-28";
  assertThrows(() => calculateAbleSources2026(s));
});
