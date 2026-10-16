import { assertEquals, assertThrows } from "@std/assert";
import { earlyRetirementSource2026 } from "./retirement-early.fixture.ts";
import {
  claimEarlyExceptions2026,
  exceptionRetirementGraph2026,
  levyRetirementSource2026,
} from "./retirement-exceptions.fixture.ts";
import { calculateRetirementSources2026 as calc } from "./retirement-source.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 levy exception removes additional tax, retains income, and requires an owner form even at zero tax", async () => {
  for (const simple of [false, true]) {
    const s = levyRetirementSource2026(simple),
      r = calc(s),
      part = r.early_owners[0];
    assertEquals([part.line1, part.line2, part.line3, part.line4], [
      10000,
      10000,
      0,
      0,
    ]);
    assertEquals(part.exception_code, "10");
    assertEquals(part.file_form5329, true);
    assertEquals(r.form5329_not_required, false);
    assertEquals(r.lines.line4b_ira_taxable, 10000);
    const g = await executeDraftSources2026(exceptionRetirementGraph2026(s));
    assertEquals(g.diagnostics, []);
    assertEquals(g.pending.f1040.line4b_ira_taxable, 10000);
    assertEquals(g.pending.schedule2.line5_form5329_early_tax, 0);
    assertEquals(
      g.pending.f1040.line24c_total_tax,
      g.pending.f1040.line16_income_tax,
    );
  }
});
Deno.test("2026 age-55 separation follows separation year and employer-plan eligibility", () => {
  const s = earlyRetirementSource2026();
  s.taxpayer_dob = "1971-12-31"; // Not yet 55 on payment day; separation year qualifies.
  s.claim.copies[0].box7b_ira_sep_simple = false;
  s.claim.reviews[0].plan_type = "qualified_employer_plan";
  claimEarlyExceptions2026(s, [{
    kind: "separation_after_age55",
    record_reference: "termination-and-plan",
    payment_reference: "payment-one",
    separation_date: "2026-01-01",
    employer_tin: "987654321",
    distribution_from_that_employers_plan_verified: true,
  }]);
  assertEquals(calc(s).early_owners[0].exception_code, "01");
  assertEquals(calc(s).line5_early_tax, 0);
  const claim =
    s.claim.reviews[0].early_distribution!.exception_review!.claims[0];
  if (claim.kind !== "separation_after_age55") throw new Error("fixture");
  claim.separation_date = "2025-12-31";
  assertThrows(() => calc(s), Error, "separation year");
  claim.separation_date = "2026-09-02";
  assertThrows(() => calc(s), Error, "before payment");
  claim.separation_date = "2026-01-01";
  s.claim.copies[0].box7b_ira_sep_simple = true;
  s.claim.reviews[0].plan_type = "traditional_ira";
  assertThrows(() => calc(s), Error, "employer's plan");
});
Deno.test("2026 QDRO and levy payments derive taxable exemptions and code 99 without reducing pension income", () => {
  const s = earlyRetirementSource2026(false, 15000);
  const c = s.claim.copies[0],
    review = s.claim.reviews[0],
    e = review.early_distribution!;
  c.box7b_ira_sep_simple = false;
  c.box2a_taxable_amount = 12000;
  review.plan_type = "qualified_employer_plan";
  e.payments = [
    {
      record_reference: "qdro-payment",
      payment_date: "2026-03-01",
      gross: 5000,
      taxable: 4000,
    },
    {
      record_reference: "levy-payment",
      payment_date: "2026-06-01",
      gross: 5000,
      taxable: 4000,
    },
    {
      record_reference: "ordinary-payment",
      payment_date: "2026-09-01",
      gross: 5000,
      taxable: 4000,
    },
  ];
  claimEarlyExceptions2026(s, [{
    kind: "qdro_alternate_payee",
    record_reference: "qualified-order",
    payment_reference: "qdro-payment",
    order_date: "2026-02-01",
    alternate_payee_tin: s.taxpayer_ssn,
    relationship_to_plan_participant: "former_spouse",
    plan_administrator_qualified_order_verified: true,
    entire_payment_made_under_order_verified: true,
  }, {
    kind: "irs_levy",
    record_reference: "levy-order",
    payment_reference: "levy-payment",
    levy_date: "2026-05-01",
    amount_paid_under_levy: 5000,
    irs_levy_on_this_retirement_account_verified: true,
  }]);
  const r = calc(s), p = r.early_owners[0];
  assertEquals([p.line1, p.line2, p.line3, p.line4], [12000, 8000, 4000, 400]);
  assertEquals(p.exception_code, "99");
  assertEquals(r.lines.line5b_pension_taxable, 12000);
  const claim = e.exception_review!.claims[0];
  if (claim.kind !== "qdro_alternate_payee") throw new Error("fixture");
  claim.alternate_payee_tin = "555667777";
  assertThrows(() => calc(s), Error, "alternate payee");
  claim.alternate_payee_tin = s.taxpayer_ssn;
  const child = structuredClone(s);
  Object.assign(
    child.claim.reviews[0].early_distribution!.exception_review!.claims[0],
    {
      relationship_to_plan_participant: "child",
    },
  );
  assertThrows(() => calc(child));
  claim.order_date = "2026-03-02";
  assertThrows(() => calc(s), Error, "effective by payment");
  claim.order_date = "2026-02-01";
  review.plan_type = "traditional_ira";
  c.box7b_ira_sep_simple = true;
  c.box2a_taxable_amount = 15000;
  e.payments.forEach((p) => p.taxable = p.gross);
  assertThrows(() => calc(s), Error, "employer plan");
});
Deno.test("2026 incorrect early coding uses the actual 59-and-a-half birthday including month ends", () => {
  for (
    const [dob, birthday, before] of [
      ["1967-03-01", "2026-09-01", "2026-08-31"],
      ["1966-08-31", "2026-02-28", "2026-02-27"],
    ]
  ) {
    for (const simple of [false, true]) {
      const s = earlyRetirementSource2026(simple);
      s.taxpayer_dob = dob;
      s.claim.reviews[0].early_distribution!.payments[0].payment_date =
        birthday;
      claimEarlyExceptions2026(s, [{
        kind: "age59_half",
        record_reference: "birth-and-bank-records",
        payment_reference: "payment-one",
        actual_payment_date_and_birth_record_verified: true,
      }]);
      assertEquals(calc(s).early_owners[0].exception_code, "12");
      assertEquals(calc(s).line5_early_tax, 0);
      s.claim.reviews[0].early_distribution!.payments[0].payment_date = before;
      assertThrows(() => calc(s), Error, "on or after age");
    }
  }
});
Deno.test("2026 exception review rejects conflicting, duplicate, orphan, wrong-owner and partial levy evidence", () => {
  const mutations = [
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      s.claim.reviews[0].early_distribution!
        .no_additional_tax_exception_applies_verified = true;
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      delete s.claim.reviews[0].early_distribution!.exception_review;
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      s.claim.reviews[0].early_distribution!.exception_review!.owner_tin =
        "555667777";
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      s.claim.reviews[0].early_distribution!.exception_review!.account_number =
        "wrong-account";
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      const e = s.claim.reviews[0].early_distribution!.exception_review!;
      e.claims.push(e.claims[0]);
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      s.claim.reviews[0].early_distribution!.exception_review!.claims[0]
        .payment_reference = "absent";
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      const c =
        s.claim.reviews[0].early_distribution!.exception_review!.claims[0];
      if (c.kind === "irs_levy") c.amount_paid_under_levy = 9999;
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      const c =
        s.claim.reviews[0].early_distribution!.exception_review!.claims[0];
      if (c.kind === "irs_levy") c.levy_date = "2026-09-02";
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      Object.assign(
        s.claim.reviews[0].early_distribution!.exception_review!.claims[0],
        { exempt_amount: 10000 },
      );
    },
    (s: ReturnType<typeof levyRetirementSource2026>) => {
      Object.assign(
        s.claim.reviews[0].early_distribution!.exception_review!.claims[0],
        { irs_levy_on_this_retirement_account_verified: false },
      );
    },
  ];
  for (const mutate of mutations) {
    const s = levyRetirementSource2026();
    mutate(s);
    assertThrows(() => calc(s));
  }
});
Deno.test("2026 mixed-rate exceptions preserve separate spouses, remaining SIMPLE base and rounding", () => {
  const a = levyRetirementSource2026(true, 10000),
    b = earlyRetirementSource2026(false, 4000);
  a.claim.copies[0].box1_gross_distribution =
    a.claim.copies[0]
      .box2a_taxable_amount =
      20000;
  a.claim.reviews[0].early_distribution!.payments.push({
    record_reference: "unexempt",
    payment_date: "2026-10-01",
    gross: 10000,
    taxable: 10000,
  });
  b.claim.copies[0].source_document_reference = "regular";
  b.claim.copies[0].statement_identifier = "regular";
  b.claim.copies[0].account_number = "regular-account";
  b.claim.reviews[0].source_document_reference = "regular";
  a.claim.copies.push(...b.claim.copies);
  a.claim.reviews.push(...b.claim.reviews);
  assertEquals(calc(a).line5_early_tax, 2900);
  a.filing_status = FilingStatus.MFJ;
  a.spouse_ssn = "555667777";
  a.spouse_dob = "1991-01-01";
  a.claim.copies[1].recipient = "spouse";
  a.claim.copies[1].recipient_tin = a.spouse_ssn;
  assertEquals(
    calc(a).early_owners.map((p) => [p.exception_code, p.line2, p.line4]),
    [["10", 10000, 2500], [undefined, 0, 400]],
  );
  // Rounded line 1 and line 2 can differ by less than the separately rounded
  // SIMPLE remainder. It must never create a negative 10-percent base.
  const tiny = levyRetirementSource2026(true, 0.50);
  const e = tiny.claim.reviews[0].early_distribution!;
  e.payments.push({
    record_reference: "remainder",
    payment_date: "2026-10-01",
    gross: 0.50,
    taxable: 0.50,
  });
  tiny.claim.copies[0].box1_gross_distribution =
    tiny.claim.copies[0]
      .box2a_taxable_amount =
      1;
  const p = calc(tiny).early_owners[0];
  assertEquals([p.line1, p.line2, p.line3, p.line4], [1, 1, 0, 0]);
});
