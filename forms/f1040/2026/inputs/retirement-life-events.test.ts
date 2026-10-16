import { assertEquals, assertThrows } from "@std/assert";
import {
  deathRetirementSource2026,
  terminalIllnessClaim2026,
  terminalRetirementSource2026,
} from "./retirement-life-events.fixture.ts";
import { calculateRetirementSources2026 as calc } from "./retirement-source.ts";
import { exceptionRetirementGraph2026 } from "./retirement-exceptions.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 terminal illness certification on payment day preserves taxable income with no additional tax", async () => {
  for (
    const plan of [
      "traditional_ira",
      "sep_ira",
      "simple_ira",
      "qualified_employer_plan",
    ] as const
  ) {
    const s = terminalRetirementSource2026(plan === "simple_ira");
    s.claim.reviews[0].plan_type = plan;
    s.claim.copies[0].box7b_ira_sep_simple = plan !== "qualified_employer_plan";
    const r = calc(s), p = r.early_owners[0];
    assertEquals([p.line1, p.line2, p.line3, p.line4], [10000, 10000, 0, 0]);
    assertEquals(p.exception_code, "20");
    assertEquals(p.file_form5329, true);
    const g = await executeDraftSources2026(exceptionRetirementGraph2026(s));
    assertEquals(g.diagnostics, []);
    assertEquals(
      g.pending.f1040[
        plan === "qualified_employer_plan"
          ? "line5b_pension_taxable"
          : "line4b_ira_taxable"
      ],
      10000,
    );
    assertEquals(g.pending.schedule2.line5_form5329_early_tax, 0);
  }
});
Deno.test("2026 terminal plan-permitted route reconciles physician signing and administrator receipt dates", () => {
  const s = terminalRetirementSource2026();
  const c = terminalIllnessClaim2026();
  c.administration = {
    route: "plan_permits",
    certification_furnished_to_administrator_on: "2026-09-01",
    administrator_receipt_record_reference: "administrator-receipt",
  };
  s.claim.reviews[0].early_distribution!.exception_review!.claims = [c];
  assertEquals(calc(s).line5_early_tax, 0);
  c.administration.certification_furnished_to_administrator_on = "2026-08-31";
  assertThrows(() => calc(s), Error, "plan receipt");
  c.administration.certification_furnished_to_administrator_on = "2026-09-02";
  assertThrows(() => calc(s), Error, "plan receipt");
});
Deno.test("2026 terminal exception rejects self-certification, late or deficient certifications and unsupported plans", () => {
  const changes = [
    { patient_tin: "555667777" },
    { certification_signed_on: "2026-09-02" },
    { examination_or_evidence_review_date: "2026-09-02" },
    { examination_or_evidence_review_date: "1989-12-31" },
    { certified_expected_death_within_months: 85 },
    { physician_is_not_patient_verified: false },
    { physician_qualification: "self" },
    { physician_contact: "" },
    { physician_signed_narrative_and_attestation_verified: false },
    { physician_legally_authorized_to_practice_verified: false },
    { certification_and_underlying_evidence_retained_verified: false },
    { distribution_otherwise_permissible_verified: false },
    {
      administration: {
        route: "return_election",
        plan_does_not_permit_terminal_illness_distributions_verified: false,
        election_record_reference: "election",
      },
    },
  ];
  for (const change of changes) {
    const s = terminalRetirementSource2026();
    Object.assign(
      s.claim.reviews[0].early_distribution!.exception_review!.claims[0],
      change,
    );
    assertThrows(() => calc(s));
  }
  const s = terminalRetirementSource2026();
  s.claim.reviews[0].plan_type = "governmental_457b";
  s.claim.copies[0].box7b_ira_sep_simple = false;
  assertThrows(() => calc(s), Error, "457(b)");
});
Deno.test("2026 terminal exception covers only payments on or after certification and uses their taxable portion", () => {
  const s = terminalRetirementSource2026(false, 15000),
    r = s.claim.reviews[0],
    e = r.early_distribution!;
  s.claim.copies[0].box7b_ira_sep_simple = false;
  s.claim.copies[0].box2a_taxable_amount = 12000;
  r.plan_type = "qualified_employer_plan";
  e.payments = [
    {
      record_reference: "before-certification",
      payment_date: "2026-08-31",
      gross: 5000,
      taxable: 4000,
    },
    {
      record_reference: "payment-one",
      payment_date: "2026-09-01",
      gross: 10000,
      taxable: 8000,
    },
  ];
  const p = calc(s).early_owners[0];
  assertEquals([p.line1, p.line2, p.line3, p.line4], [12000, 8000, 4000, 400]);
  const late = terminalIllnessClaim2026();
  late.payment_reference = "before-certification";
  e.exception_review!.claims.push(late);
  assertThrows(() => calc(s), Error, "signed on or before payment");
});
Deno.test("2026 death-beneficiary exception reconciles the deceased owner's records and inherited account treatment", () => {
  for (const simple of [false, true]) {
    const s = deathRetirementSource2026(simple), p = calc(s).early_owners[0];
    assertEquals([p.exception_code, p.line1, p.line2, p.line4], [
      "04",
      10000,
      10000,
      0,
    ]);
    assertEquals(calc(s).lines.line4b_ira_taxable, 10000);
  }
  const s = deathRetirementSource2026(true);
  // Decedent's first SIMPLE participation can precede the beneficiary's birth.
  s.claim.copies[0].box7a_distribution_codes = [Code.Code1];
  s.claim.reviews[0].early_distribution!.simple_first_contribution_date =
    "1980-01-01";
  assertEquals(calc(s).line5_early_tax, 0);
  // Correctly issued code 4 uses the ordinary death-income route without 5329.
  s.claim.copies[0].box7a_distribution_codes = [Code.Code4];
  delete s.claim.reviews[0].early_distribution;
  assertEquals(calc(s).early_owners, []);
  assertEquals(calc(s).lines.line4b_ira_taxable, 10000);
});
Deno.test("2026 death exception refuses missing inheritance proof, pre-death payments and mixed account treatment", () => {
  const mutations = [
    (s: ReturnType<typeof deathRetirementSource2026>) => {
      delete s.claim.reviews[0].death_benefit;
    },
    (s: ReturnType<typeof deathRetirementSource2026>) => {
      s.claim.reviews[0].death_benefit!.decedent_tin = s.taxpayer_ssn;
    },
    (s: ReturnType<typeof deathRetirementSource2026>) => {
      s.claim.reviews[0].death_benefit!.decedent_tin = "999887777";
    },
    (s: ReturnType<typeof deathRetirementSource2026>) => {
      s.claim.reviews[0].death_benefit!.death_date = "2026-09-02";
    },
    (s: ReturnType<typeof deathRetirementSource2026>) => {
      Object.assign(
        s.claim.reviews[0].early_distribution!.exception_review!.claims[0],
        { inherited_account_not_treated_as_own_verified: false },
      );
    },
    (s: ReturnType<typeof deathRetirementSource2026>) => {
      s.claim.reviews[0].early_distribution!.exception_review!.claims = [
        terminalIllnessClaim2026(),
      ];
    },
    (s: ReturnType<typeof deathRetirementSource2026>) => {
      const e = s.claim.reviews[0].early_distribution!;
      e.payments[0].gross = e.payments[0].taxable = 5000;
      e.payments.push({
        record_reference: "unreviewed",
        payment_date: "2026-10-01",
        gross: 5000,
        taxable: 5000,
      });
    },
  ];
  for (const mutate of mutations) {
    const s = deathRetirementSource2026();
    mutate(s);
    assertThrows(() => calc(s));
  }
});
Deno.test("2026 life-event exceptions remain separate per spouse and combine to 99 only within one owner", () => {
  const a = deathRetirementSource2026(),
    b = terminalRetirementSource2026(true, 4000);
  const c = b.claim.copies[0];
  c.source_document_reference = c.statement_identifier = "terminal";
  c.account_number = "terminal-account";
  const r = b.claim.reviews[0];
  r.source_document_reference = "terminal";
  r.early_distribution!.exception_review!.account_number = "terminal-account";
  a.claim.copies.push(c);
  a.claim.reviews.push(r);
  assertEquals(
    calc(a).early_owners.map((p) => [p.exception_code, p.line2, p.line4]),
    [["99", 14000, 0]],
  );
  a.filing_status = FilingStatus.MFJ;
  a.spouse_ssn = "555667777";
  a.spouse_dob = "1991-01-01";
  c.recipient = "spouse";
  c.recipient_tin = a.spouse_ssn;
  r.early_distribution!.exception_review!.owner_tin = a.spouse_ssn;
  const claim = r.early_distribution!.exception_review!.claims[0];
  if (claim.kind !== "terminal_illness") throw new Error("fixture");
  claim.patient_tin = a.spouse_ssn;
  assertEquals(
    calc(a).early_owners.map(
      (p) => [p.owner, p.exception_code, p.line2, p.line4],
    ),
    [["taxpayer", "04", 10000, 0], ["spouse", "20", 4000, 0]],
  );
});

Deno.test("2026 inherited account identity remains consistent across current statements", () => {
  const a = deathRetirementSource2026(), b = deathRetirementSource2026();
  b.claim.copies[0].source_document_reference =
    b.claim.copies[0]
      .statement_identifier =
      "second-statement";
  b.claim.reviews[0].source_document_reference = "second-statement";
  b.claim.reviews[0].early_distribution!.payments[0].record_reference =
    "second-payment";
  const claim =
    b.claim.reviews[0].early_distribution!.exception_review!.claims[0];
  claim.payment_reference = "second-payment";
  a.claim.copies.push(...b.claim.copies);
  a.claim.reviews.push(...b.claim.reviews);
  assertEquals(calc(a).early_owners[0].line2, 20000);
  b.claim.reviews[0].death_benefit!.death_date = "2026-07-31";
  assertThrows(() => calc(a), Error, "conflicting inherited/decedent");
  b.claim.reviews[0].death_benefit!.death_date = "2026-08-01";
  b.claim.reviews[0].death_benefit!.decedent_tin = "999887777";
  if (claim.kind !== "death_beneficiary") throw new Error("fixture");
  claim.decedent_tin = "999887777";
  assertThrows(() => calc(a), Error, "conflicting inherited/decedent");
  delete b.claim.reviews[0].death_benefit;
  const e = b.claim.reviews[0].early_distribution!;
  delete e.exception_review;
  e.no_additional_tax_exception_applies_verified = true;
  assertThrows(() => calc(a), Error, "conflicting inherited/decedent");
});
