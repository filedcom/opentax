import { assertEquals, assertThrows } from "@std/assert";
import {
  earlyRetirementGraph2026,
  earlyRetirementSource2026,
} from "./retirement-early.fixture.ts";
import {
  retirementCopy2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { calculateRetirementSources2026 as calc } from "./retirement-source.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 early IRA applies shared ten-percent tax from reconciled taxable payments through settlement", async () => {
  const s = earlyRetirementSource2026(false, 10004.58), r = calc(s);
  assertEquals(r.form5329_not_required, true);
  assertEquals(r.early_owners[0].line1, 10005);
  assertEquals(r.line5_early_tax, 1001);
  const g = await executeDraftSources2026(
    earlyRetirementGraph2026(false, 10004.58),
  );
  assertEquals(g.diagnostics, []);
  assertEquals(g.pending.schedule2.line5_form5329_early_tax, 1001);
  assertEquals(g.pending.f1040.line23_other_taxes, 1001);
  assertEquals(
    g.pending.f1040.line24c_total_tax,
    Number(g.pending.f1040.line16_income_tax) + 1001,
  );
  assertEquals(
    g.pending.f1040.line35a_refund,
    Number(g.pending.f1040.line33_total_payments) -
      Number(g.pending.f1040.line24c_total_tax),
  );
});
Deno.test("2026 SIMPLE rate follows actual contribution anniversary and early payment age", () => {
  const s = earlyRetirementSource2026(true);
  const r = calc(s);
  assertEquals(r.line5_early_tax, 2500);
  assertEquals(r.early_owners[0].file_form5329, true);
  const e = s.claim.reviews[0].early_distribution!;
  e.simple_first_contribution_date = "2024-09-01";
  assertThrows(() => calc(s), Error, "two-year");
  s.claim.copies[0].box7a_distribution_codes = [Code.Code1];
  assertEquals(calc(s).line5_early_tax, 1000);
  e.payments[0].payment_date = "2026-08-31";
  assertThrows(() => calc(s), Error, "two-year");
  e.payments[0].payment_date = "2026-09-01";
  s.taxpayer_dob = "1967-03-01";
  assertThrows(() => calc(s), Error, "age");
  s.taxpayer_dob = "1967-03-02";
  assertEquals(calc(s).line5_early_tax, 1000);
});
Deno.test("2026 early tax separates spouses and combines regular and SIMPLE bases once per owner", () => {
  const a = earlyRetirementSource2026(true, 10000.49),
    b = earlyRetirementSource2026(false, 2000.49);
  b.claim.copies[0].source_document_reference = "regular";
  b.claim.copies[0].statement_identifier = "regular";
  b.claim.copies[0].account_number = "regular-account";
  b.claim.reviews[0].source_document_reference = "regular";
  a.claim.copies.push(...b.claim.copies);
  a.claim.reviews.push(...b.claim.reviews);
  let r = calc(a);
  assertEquals(r.early_owners[0].line1, 12001);
  assertEquals(r.line5_early_tax, 2700);
  const duplicate = structuredClone(a);
  duplicate.claim.copies[1].account_number =
    duplicate.claim.copies[0].account_number;
  assertThrows(() => calc(duplicate), Error, "reused");
  a.filing_status = FilingStatus.MFJ;
  a.spouse_ssn = "555667777";
  a.spouse_dob = "1991-01-01";
  a.claim.copies[1].recipient = "spouse";
  a.claim.copies[1].recipient_tin = "XXX-XX-7777";
  r = calc(a);
  assertEquals(r.early_owners.map((o) => o.owner_tin), [
    "400001037",
    "555667777",
  ]);
  assertEquals(r.early_owners.map((o) => o.line4), [2500, 200]);
  assertEquals(r.early_owners.every((o) => o.file_form5329), true);
});
Deno.test("2026 partial-taxable pension and mixed ordinary income require the owner Form 5329", () => {
  const s = earlyRetirementSource2026();
  const c = s.claim.copies[0], r = s.claim.reviews[0];
  c.box7b_ira_sep_simple = false;
  r.plan_type = "qualified_employer_plan";
  c.box2a_taxable_amount = 8000;
  r.early_distribution!.payments[0].taxable = 8000;
  let result = calc(s);
  assertEquals(result.lines.line5b_pension_taxable, 8000);
  assertEquals(result.line5_early_tax, 800);
  assertEquals(result.form5329_not_required, false);
  const ordinary = retirementCopy2026("inherited");
  ordinary.box7a_distribution_codes = [Code.Code4];
  const review = retirementSource2026([ordinary]).claim.reviews[0];
  review.death_benefit = {
    decedent_tin: "111223333",
    death_date: "2025-01-01",
    record_reference: "death",
    no_inherited_basis_or_special_tax_treatment_verified: true,
  };
  s.claim.copies.push(ordinary);
  s.claim.reviews.push(review);
  result = calc(s);
  assertEquals(result.early_owners.length, 1);
  assertEquals(result.line5_early_tax, 800);
});
Deno.test("2026 early tax rejects missing, mismatched and unsupported payment evidence", () => {
  for (
    const change of [
      (s: ReturnType<typeof earlyRetirementSource2026>) => {
        delete s.claim.reviews[0].early_distribution;
      },
      (s: ReturnType<typeof earlyRetirementSource2026>) => {
        s.claim.reviews[0].early_distribution!.payments[0].taxable = 9999;
      },
      (s: ReturnType<typeof earlyRetirementSource2026>) => {
        s.claim.reviews[0].early_distribution!.payments[0].payment_date =
          "2025-09-01";
      },
      (s: ReturnType<typeof earlyRetirementSource2026>) => {
        s.claim.reviews[0].early_distribution!.payments.push(
          s.claim.reviews[0].early_distribution!.payments[0],
        );
      },
      (s: ReturnType<typeof earlyRetirementSource2026>) => {
        s.claim.copies[0].box7a_distribution_codes = [Code.CodeS];
      },
      (s: ReturnType<typeof earlyRetirementSource2026>) => {
        s.claim.reviews[0].plan_type = "governmental_457b";
        s.claim.copies[0].box7b_ira_sep_simple = false;
      },
    ]
  ) {
    const s = earlyRetirementSource2026();
    change(s);
    assertThrows(() => calc(s));
  }
});
