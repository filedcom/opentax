import { assertEquals, assertThrows } from "@std/assert";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import { stageForm8801SettledReturn } from "./form8801_settled_return.ts";
import { assertAttachmentCoverage } from "../../execution/attachment-coverage.ts";
import { BondType } from "../../../../nodes/inputs/f8912/index.ts";

Deno.test("Form 8801 settled credit flows through Schedule 3, tax and refund", async () => {
  const f = await fixture();
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.final_schedule3.line6b_prior_year_min_tax_credit, 5_182);
  assertEquals(r.final_form1040.line20_nonrefundable_credits, 5_182);
  assertEquals(r.final_form1040.line21_credits_total, 5_182);
  assertEquals(r.final_form1040.line22_tax_after_credits, 12_685);
  assertEquals(r.final_form1040.line24_total_tax, 12_685);
  assertEquals(r.final_form1040.line35a_refund, 7_315);
  assertEquals(r.lines[26], 0);
  assertEquals(r.finalReturnAmountsReconciled, true);
  assertEquals([
    r.filingReady,
    r.priorAcceptanceVerified,
    r.finalizedReturnReconciled,
  ], [false, false, false]);
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(r.projected_pending, kind),
      Error,
      "Form 8801",
    );
  }
});

Deno.test("Form 8801 partial credit leaves exact carry and zero income tax", async () => {
  const f = await fixture();
  f.inputs.w2[0].box1_wages = 30_000;
  f.inputs.w2[0].box2_fed_withheld = 0;
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.lines[25], 1_475);
  assertEquals(r.lines[26], 3_707);
  assertEquals(r.final_form1040.line22_tax_after_credits, 0);
  assertEquals(r.final_form1040.line37_amount_owed, undefined);
});

Deno.test("Form 8801 settlement switches amount owed to refund without stale balance", async () => {
  const f = await fixture();
  f.inputs.w2[0].box2_fed_withheld = 15_000;
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.current_form1040_before_credit.line37_amount_owed, 2_867);
  assertEquals(r.final_form1040.line35a_refund, 2_315);
  assertEquals(r.final_form1040.line37_amount_owed, undefined);
});

Deno.test("Form 8801 nonpositive available amount inserts no credit", async () => {
  const facts = packageFacts();
  facts.prior_form6251.line10 = 0;
  const f = await fixture(facts);
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.fileRequired, false);
  assertEquals(r.lines[21], -2_818);
  assertEquals(r.final_form1040.line20_nonrefundable_credits, 0);
  assertEquals(r.final_form1040.line22_tax_after_credits, 17_867);
  assertEquals(r.carryforward_to_2026, 0);
});

Deno.test("Form 8801 vehicle-only available credit still requires guarded attachment", async () => {
  const facts = packageFacts();
  facts.prior_form6251.line1 = 0;
  facts.prior_form6251.line2a = 0;
  facts.prior_form6251.line11 = 0;
  facts.prior_credit_carryforward.amount = 0;
  const f = await fixture(facts);
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.lines[21], 100);
  assertEquals(r.lines[25], 100);
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(r.projected_pending, kind),
      Error,
      "Form 8801",
    );
  }
});

Deno.test("Form 8801 retains preceding foreign credit when final tax is recomputed", async () => {
  const f = await fixture();
  f.inputs.schedule_b_part_iii = {
    foreign_accounts_question: false,
    fincen_form114_required: false,
    foreign_trust_question: false,
  };
  f.inputs.f1099int = [50, 75].map((tax, i) => ({
    payer_name: `Bank ${i}`,
    recipient_tin: "111223333",
    box1: 5_000,
    box6: tax,
    foreign_source_interest_usd: 5_000,
    foreign_tax_irs_country_code: "CA",
    foreign_tax_source_document_reference: `Bank ${i} issued interest`,
  }));
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.final_schedule3.line1_foreign_tax_credit, 125);
  assertEquals(r.final_form1040.line20_nonrefundable_credits, 5_307);
  assertEquals(r.final_form1040.line22_tax_after_credits, 14_960);
});

Deno.test("Form 8801 reruns later bond-credit limitation instead of adding settled credits", async () => {
  const f = await fixture();
  f.inputs.schedule_b_part_iii = {
    foreign_accounts_question: false,
    fincen_form114_required: false,
    foreign_trust_question: false,
  };
  f.inputs.f8912 = [{
    reported_bonds: [{
      bond_type: BondType.CREB,
      issue_date: "2009-12-31",
      issuer_name: "Bond Issuer",
      issuer_ein: "123456789",
      unique_identifier_code: "O",
      unique_identifier: "bond1",
      monthly_credit_amounts: [...Array(11).fill(0), 20_000],
      credit_amount: 20_000,
      purchase_accrued_interest: 0,
      sale_accrued_interest: 0,
      taxable_interest_reported_elsewhere: 0,
      issuer_elected_direct_payment: false,
      is_pass_through_creb_credit: false,
    }],
    unreported_bonds: [],
    carryforwards: [],
  }];
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.current_form1040_before_credit.line16_income_tax, 22_667);
  assertEquals(
    r.public_pending_before_credit.schedule3.line6k_tax_credit_bonds,
    20_000,
  );
  assertEquals(r.final_schedule3.line6b_prior_year_min_tax_credit, 5_182);
  assertEquals(r.final_schedule3.line6k_tax_credit_bonds, 17_485);
  assertEquals(r.projected_pending.f8912.allowed_credit, 17_485);
  assertEquals(r.projected_pending.f8912.unused_credit, 2_515);
  assertEquals(r.final_form1040.line20_nonrefundable_credits, 22_667);
  assertEquals(r.final_form1040.line22_tax_after_credits, 0);
});
