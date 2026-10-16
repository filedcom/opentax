import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateScheduleR2026,
  type ScheduleRSource2026,
} from "./schedule-r-source.ts";
import {
  scheduleRGraphFixture2026,
  scheduleRSourceFixture2026,
} from "./schedule-r.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { educationFixture2026 } from "./education.fixture.ts";
import { calculateEducationCredit2026 } from "../nodes/f8863.ts";
import { calculateChildCredit2026 } from "../nodes/f8812.ts";
import { itemizedClaim2026 } from "../schedule-a.fixture.ts";

Deno.test("2026 Schedule R includes post-minimum-age disability payments until mandatory retirement and caps credit by tax", () => {
  const f = scheduleRSourceFixture2026(), r = calculateScheduleR2026(f);
  assertEquals(r.box, 2);
  assertEquals(r.lines?.line11, 10001);
  assertEquals(r.lines?.line20, 37);
  assertEquals(r.lines?.line22, 37);
  assertEquals(r.prior_statement_names, ["Synthetic"]);
  assertEquals(
    calculateScheduleR2026({ ...f, regular_tax: 16 }).lines?.line22,
    16,
  );
  const m = f.claim!.disability[0].plans[0].mandatory_retirement;
  if (m.kind !== "date") throw Error("fixture");
  m.reached_on = "2026-06-16";
  assertEquals(calculateScheduleR2026(f).lines?.line11, 7001);
  m.reached_on = "2026-06-15";
  assertEquals(calculateScheduleR2026(f).lines?.line11, 3500);
});
Deno.test("2026 Schedule R selects all nine boxes and mixed-age base without invented disability income", () => {
  for (
    const [box, status, older, spouseOlder, primaryDisabled, spouseDisabled]
      of [
        [1, FilingStatus.QSS, true, false, false, false],
        [2, FilingStatus.Single, false, false, true, false],
        [3, FilingStatus.MFJ, true, true, false, false],
        [4, FilingStatus.MFJ, false, false, true, false],
        [5, FilingStatus.MFJ, false, false, true, true],
        [6, FilingStatus.MFJ, true, false, false, true],
        [7, FilingStatus.MFJ, true, false, false, false],
        [8, FilingStatus.MFS, true, false, false, false],
        [9, FilingStatus.MFS, false, false, true, false],
      ] as const
  ) {
    const f = scheduleRSourceFixture2026();
    f.filing_status = status;
    f.taxpayer_dob = older ? "1962-01-01" : "1971-06-15";
    const retire = f.retirement_sources_2026!;
    retire.filing_status = status;
    retire.taxpayer_dob = f.taxpayer_dob;
    const originalCopy = structuredClone(retire.claim.copies[0]),
      originalReview = structuredClone(retire.claim.reviews[0]),
      originalDisability = structuredClone(f.claim!.disability[0]);
    if (!primaryDisabled) {
      f.claim!.disability = [];
      retire.claim.copies = [];
      retire.claim.reviews = [];
    }
    if (status === FilingStatus.MFJ) {
      f.spouse_ssn = retire.spouse_ssn = "444556666";
      f.spouse_dob = retire.spouse_dob = spouseOlder
        ? "1960-01-01"
        : "1971-06-15";
      f.spouse_first_name = "Joint";
      if (spouseDisabled) {
        originalCopy.recipient = "spouse";
        originalCopy.recipient_tin = f.spouse_ssn;
        originalCopy.source_document_reference += "-spouse";
        originalReview.source_document_reference =
          originalCopy.source_document_reference;
        const d = originalReview.disability_income!;
        if (d.kind !== "employer_disability_pension") throw Error("fixture");
        d.owner_tin = f.spouse_ssn;
        originalDisability.owner_tin = f.spouse_ssn;
        originalDisability.plans[0].source_document_reference =
          originalCopy.source_document_reference;
        retire.claim.copies.push(originalCopy);
        retire.claim.reviews.push(originalReview);
        f.claim!.disability.push(originalDisability);
      }
    }
    if (status === FilingStatus.MFS) {
      f.mfs_spouse_lived_with_taxpayer = false;
      f.claim!.mfs_lived_apart_all_year_record_reference =
        "separate-residences";
    }
    if (!retire.claim.copies.length) {
      f.retirement_sources_2026 = undefined;
      f.claim!.retirement_inventory_reference = undefined;
    }
    const r = calculateScheduleR2026(f);
    assertEquals(r.box, box);
    if (box === 6) assertEquals(r.lines?.line11, 15001);
    if (box === 1) assertEquals(r.lines?.line15, 7500);
  }
});
Deno.test("2026 Schedule R validates evidence ownership, dates, inventory and benefit treatment", () => {
  const f = scheduleRSourceFixture2026();
  const mutations: ((x: ScheduleRSource2026) => void)[] = [
    (x) => {
      x.claim!.disability[0].owner_tin = "999887777";
    },
    (x) => {
      x.claim!.disability[0].plans = [];
    },
    (x) => {
      x.claim!.retirement_inventory_reference = undefined;
    },
    (x) => {
      x.claim!.disability[0].disability_onset_date = "2025-02-01";
    },
    (x) => {
      x.claim!.disability[0].physician_statement.signed_on = "2027-04-01";
    },
    (x) => {
      x.filing_status = FilingStatus.MFS;
    },
    (x) => {
      x.claim!.disability.push(structuredClone(x.claim!.disability[0]));
    },
    (x) => {
      x.gross_ssa = 100;
    },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(f);
    mutate(bad);
    assertThrows(() => calculateScheduleR2026(bad));
  }
  for (
    const kind of [
      "veterans_pension",
      "other_federal_law_excluded",
      "military_service_disability",
      "return_of_cost",
      "foreign_service_section808",
      "internal_revenue_code_excluded",
    ] as const
  ) {
    f.claim!.other_benefits = [{
      kind,
      tax_year: 2026,
      statement_reference: "benefit-statement",
      owner_tin: f.taxpayer_ssn,
      payer: "Agency",
      treatment_record_reference: "benefit-review",
      amount: 100.5,
      exclusion_authority: "Reviewed statutory authority",
    }];
    assertEquals(
      calculateScheduleR2026(f).lines?.line13b,
      ["veterans_pension", "other_federal_law_excluded"].includes(kind)
        ? 101
        : 0,
    );
  }
});
Deno.test("2026 Schedule R reaches Schedule 3, child credit and draft 1040 without reducing AGI", async () => {
  const r = await executeDraftSources2026(scheduleRGraphFixture2026());
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line11b_agi, 17001);
  assertEquals(r.pending.f1040.line20_nonrefundable_credits, 37);
  assertEquals(r.pending.f1040.line19_child_tax_credit, 54);
  const c = r.pending.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(c.source_input.finalized_schedule_r_credit, 37);
});
Deno.test("2026 Schedule R precedes education and child credits in the tax limit", async () => {
  const b = scheduleRGraphFixture2026(), e = educationFixture2026();
  const r = await executeDraftSources2026({ ...b, f8863: e.f8863 });
  assertEquals(r.diagnostics, []);
  const education = r.pending.f8863.calculation_2026 as ReturnType<
    typeof calculateEducationCredit2026
  >;
  assertEquals(education.lines?.line19, 54);
  assertEquals(r.pending.f1040.line20_nonrefundable_credits, 91);
  assertEquals(r.pending.f1040.line19_child_tax_credit, 0);
});

Deno.test("2026 Schedule R tax limit follows the actual dependent care credit", async () => {
  const { disabilityCareGraph2026 } = await import(
    "./retirement-earned.fixture.ts"
  );
  const b = scheduleRGraphFixture2026(),
    care = disabilityCareGraph2026(7000, 0, 150);
  const r = await executeDraftSources2026({
    ...care,
    general: { ...care.general, do_not_claim_eic: true },
    schedule_r: b.schedule_r,
    f8812: b.f8812,
  });
  assertEquals(r.diagnostics, []);
  const scheduleR = r.pending.schedule_r.calculation_2026 as ReturnType<
    typeof calculateScheduleR2026
  >;
  assertEquals(scheduleR.source_input.finalized_dependent_care_credit, 72);
  assertEquals(scheduleR.lines?.line21, 19);
  assertEquals(scheduleR.lines?.line22, 19);
  assertEquals(r.pending.f1040.line20_nonrefundable_credits, 91);
  assertEquals(r.pending.f1040.line19_child_tax_credit, 0);
});

Deno.test("2026 Schedule R survives Form 1062 actual and hypothetical credit replay with consistent source scope", async () => {
  const { form1062TaxFixture2026 } = await import("./form1062-tax.fixture.ts");
  const { landGraphFixture2026 } = await import("./land-graph.fixture.ts");
  const { calculateForm1062Tax2026 } = await import("./form1062-tax.ts");
  const land = landGraphFixture2026(100, [], 7000),
    disability = scheduleRGraphFixture2026();
  const { input } = form1062TaxFixture2026({ ...land, ...disability });
  const r = calculateForm1062Tax2026(input);
  assertEquals(r.actual.credits.scheduleR?.lines?.line22, 30);
  assertEquals(
    r.without_elected_gain.credits.scheduleR?.lines?.line14,
    input.return_lines.line11b_agi,
  );
  assertEquals(r.actual.credits.personal, 30);
  const wrong = structuredClone(input);
  wrong.schedule_r!.taxpayer_ssn = "999887777";
  assertThrows(
    () => calculateForm1062Tax2026(wrong),
    Error,
    "Schedule R must match",
  );
  const review = structuredClone(input);
  review.review
    .no_credits_other_than_care_education_child_energy_and_schedule_r =
      undefined;
  review.review.no_credits_other_than_care_education_child_and_energy = true;
  assertThrows(
    () => calculateForm1062Tax2026(review),
    Error,
    "Schedule R credit inventory",
  );
});

Deno.test("2026 Schedule R reconciles Social Security, included workers compensation and excluded other benefits", async () => {
  const { syntheticSocialSecurity2026 } = await import(
    "./social-security.fixture.ts"
  );
  const f = scheduleRSourceFixture2026(),
    source = syntheticSocialSecurity2026();
  f.social_security_sources_2026 = source;
  f.claim!.ssa_inventory_reference = source.inventory_record_reference;
  f.gross_ssa = 10000;
  f.taxable_ssa = 1000;
  assertEquals(calculateScheduleR2026(f).lines?.line13a, 9000);
  assertEquals(calculateScheduleR2026(f).file_schedule_r, false);
  f.claim!.other_benefits = [{
    tax_year: 2026,
    statement_reference: source.statements[0].source_document_reference,
    owner_tin: f.taxpayer_ssn,
    payer: "SSA",
    kind: "other_federal_law_excluded",
    amount: 1000,
    treatment_record_reference: "review",
    exclusion_authority: "same statement",
  }];
  assertThrows(() => calculateScheduleR2026(f), Error, "unique statements");
});
Deno.test("2026 Schedule R current and VA statements do not claim the prior-statement certification", () => {
  const f = scheduleRSourceFixture2026();
  for (
    const statement of [
      {
        kind: "current_statement" as const,
        record_reference: "current",
        signed_on: "2027-02-01",
        certifies_disability_at_retirement_verified: true as const,
        expected_duration: "at_least_one_year" as const,
      },
      {
        kind: "va_21_0172" as const,
        record_reference: "va",
        signed_on: "2026-02-01",
        signed_by_authorized_va_official_verified: true as const,
        permanent_total_disability_at_retirement_verified: true as const,
      },
    ]
  ) {
    f.claim!.disability[0].physician_statement = statement;
    assertEquals(calculateScheduleR2026(f).prior_statement_names, []);
  }
});
Deno.test("2026 Schedule R limits energy carryforward even when no child credit is claimed", async () => {
  const { energyClaimFixture2026 } = await import("./energy.fixture.ts");
  const { energyClaim2026Schema } = await import("./energy-source.ts");
  const f = scheduleRGraphFixture2026(7000, 0),
    energy = energyClaimFixture2026(1000);
  const {
    no_nonrefundable_credits_other_than_child_dependent_care_and_education:
      _old,
    ...claim
  } = energy.claim;
  const e = energyClaim2026Schema.parse({
    claim: {
      ...claim,
      schedule_r_inventory_reference: f.schedule_r.claim.record_reference,
      no_nonrefundable_credits_other_than_child_care_education_and_schedule_r:
        true,
    },
  });
  const r = await executeDraftSources2026({ ...f, f5695: e });
  assertEquals(r.diagnostics, []);
  const c = r.pending.f8812.calculation_2026 as ReturnType<
    typeof calculateChildCredit2026
  >;
  assertEquals(c.energy_credit?.lines.line3, 54);
  assertEquals(c.energy_credit?.carryforward_2027.amount, 946);
  assertEquals(r.pending.f1040.line20_nonrefundable_credits, 91);
  const wrong = await executeDraftSources2026({ ...f, f5695: energy });
  assertEquals(
    wrong.diagnostics.some((d) =>
      d.message.includes("actual Schedule R inventory")
    ),
    true,
  );
});

Deno.test("2026 Schedule R separate-filer path uses the actual spouse identity and full-year residence proof", async () => {
  const f = scheduleRGraphFixture2026(0, 0);
  f.schedule_r.claim.mfs_lived_apart_all_year_record_reference =
    "residence-records";
  const source = {
    ...f,
    schedule_a: { ...itemizedClaim2026 },
    general: {
      ...f.general,
      filing_status: FilingStatus.MFS,
      spouse_ssn: "444556666",
      spouse_first_name: "Separate",
      spouse_last_name: "Investor",
      mfs_spouse_itemizing: true,
      mfs_spouse_lived_with_taxpayer: false,
    },
  };
  const r = await executeDraftSources2026(source);
  assertEquals(r.diagnostics, []);
  const scheduleR = r.pending.schedule_r.calculation_2026 as ReturnType<
    typeof calculateScheduleR2026
  >;
  assertEquals(scheduleR.box, 9);
  assertEquals(scheduleR.lines?.line22, 187);
  assertEquals(r.pending.f1040.line20_nonrefundable_credits, 187);
});
