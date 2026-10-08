import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { passiveK1Item } from "./eic_passive_k1.fixture.ts";
import { passiveSCorpLossReturnInputs as inputs } from "./eic_passive_s_corp_loss.fixture.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

for (
  const c of [
    { cash: 1000, income: 0, agi: 5000, allowed: 0, basis: 3000, pal: 1000 },
    { cash: 1000, income: 500, agi: 5000, allowed: 500, basis: 3000, pal: 500 },
    { cash: 1000, income: 3000, agi: 7000, allowed: 1000, basis: 3000, pal: 0 },
    { cash: 4000, income: 3000, agi: 5000, allowed: 3000, basis: 0, pal: 1000 },
    { cash: 6000, income: 0, agi: 5000, allowed: 0, basis: 0, pal: 4000 },
  ]
) {
  for (const investment of [11950, 11951]) {
    Deno.test(`Calculation-only passive S-corp basis ${c.cash}/income ${c.income}/investment ${investment} reaches AGI and EIC after PAL/QBI`, () => {
      const i = inputs(c.cash, c.income, investment);
      const r = f1040_2025.executeReturn(i), p = r.pending;
      assertEquals(r.diagnostics, []);
      assertEquals(p.f1040.line11_agi, c.agi);
      assertEquals(p.f1040.line27_eitc ?? 0, investment === 11950 ? 384 : 0);
      assertEquals(p.eitc.investment_income_floor, investment);
      assertEquals(p.eitc.earned_income, 5000);
      assertEquals(p.form8582.current_loss, Math.min(c.cash, 4000));
      assertEquals(
        r.carryforwards["basis_suspended_s_corp_loss:111223333:123456789"] ?? 0,
        c.basis,
      );
      assertEquals(
        r.carryforwards["suspended_pal_8582:2025-S-123456789-111223333"] ?? 0,
        c.pal,
      );
      assertEquals(p.form8995.line2, -c.allowed || 0);
      assertEquals(r.carryforwards.qbi_loss_carryforward ?? 0, c.allowed);
      assertEquals(
        r.carryforwards[
          "qualified_passive_loss_199a:111223333:2025-S-123456789-111223333"
        ] ?? 0,
        c.pal,
      );
      assertEquals(
        r.carryforwards[
          "qualified_basis_suspended_s_corp_loss:111223333:123456789"
        ] ?? 0,
        c.basis,
      );
      assertEquals(p.f1040.line13_qbi_deduction ?? 0, 0);
    });
  }
}

Deno.test("Calculation-only passive loss rejects ambiguous ownership, other K1 items and unsupported return combinations", () => {
  const badOwner = inputs(1000, 3000);
  badOwner.general.taxpayer_ssn = "555667777";
  assertThrows(() => f1040_2025.executeReturn(badOwner));
  const extra = inputs(1000, 3000);
  extra.k1_s_corp[0].box4_interest = 50;
  assertThrows(() => f1040_2025.executeReturn(extra));
  const mixed = inputs(1000, 3000);
  mixed.schedule_e = [];
  assertThrows(() => f1040_2025.executeReturn(mixed));
  const ordinary = inputs(1000, 3000);
  ordinary.k1_partnership = [passiveK1Item("partnership", "box1", 3000)];
  assertThrows(() => f1040_2025.executeReturn(ordinary));
  const negative = inputs(1000, 3000);
  negative.k1_partnership[0].box2_rental_re = -3000;
  assertThrows(() => f1040_2025.executeReturn(negative));
  const nonpassive = inputs(1000, 3000);
  nonpassive.k1_partnership[0].eic_passive_activity_review.box2 = "nonpassive";
  assertThrows(() => f1040_2025.executeReturn(nonpassive));
});

for (const spouseOwned of [false, true]) {
  Deno.test(`Calculation-only passive S-corp ${spouseOwned ? "spouse" : "primary"} loss shares joint passive income while keeping owned carryovers`, () => {
    const i = inputs(1000, 3000);
    Object.assign(i.general, {
      filing_status: "mfj",
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "444556666",
      spouse_dob: "1985-07-01",
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
      spouse_can_be_claimed_as_dependent: false,
    });
    i.general.eic_tax_residency_review.spouse_status_record_reference =
      "Spouse all-year residency record";
    i.w2[0].box1_wages = 10000;
    const item = i.k1_s_corp[0], source = item.first_year_passive_loss_source;
    const owner = spouseOwned ? "444556666" : "111223333";
    for (
      const row of [
        source,
        source.stock_subscription,
        source.participation,
        source.issued_k1,
      ]
    ) row.shareholder_ssn = owner;
    source.stock_subscription.cash_payment.payer_ssn = owner;
    source.issued_k1.shareholder_name_as_on_k1 = spouseOwned
      ? "Casey Example"
      : "Alex Example";
    source.participation.spouse = {
      status: "married_same_spouse_all_year",
      spouse_ssn: spouseOwned ? "111223333" : "444556666",
      spouse_participation_record_reference:
        "Other spouse nonparticipation records",
    };
    item.recipient_tin = item.eic_passive_activity_review.recipient_tin = owner;
    const r = f1040_2025.executeReturn(i);
    assertEquals(r.diagnostics, []);
    assertEquals(r.pending.f1040.line11_agi, 12000);
    assertEquals(r.pending.f1040.line27_eitc, 649);
    assertEquals(r.pending.eitc.earned_income, 10000);
    assertEquals(r.pending.eitc.investment_income_floor, 11950);
    assertEquals(
      r.carryforwards[`basis_suspended_s_corp_loss:${owner}:123456789`],
      3000,
    );
    assertEquals(r.pending.form8995.line2, -1000);
  });
}

for (const investment of [11950, 11951]) {
  Deno.test(`Calculation-only passive loss combines taxable interest, exempt interest and dividends at ${investment}`, () => {
    const i = inputs(1000, 3000, investment);
    i.f1099int[0].box8 -= 5;
    i.f1099int[0].box1 = 3;
    i.f1099div = [{
      payerName: "Constructed dividend issuer",
      payerTin: "876543210",
      source_document_reference: "Constructed 2025 dividend copy",
      account_number: "DIV-2025",
      recipient_tin: "111223333",
      box1a: 2,
      isNominee: false,
      box11: false,
    }];
    const r = f1040_2025.executeReturn(i);
    assertEquals(r.diagnostics, []);
    assertEquals(r.pending.f1040.line11_agi, 7005);
    assertEquals(r.pending.eitc.investment_income_floor, investment);
    assertEquals(
      r.pending.f1040.line27_eitc ?? 0,
      investment === 11950 ? 384 : 0,
    );
    assertEquals(r.pending.form8995.line2, -1000);
  });
}

Deno.test("Calculation-only passive source cannot export native or PDF by deleting required basis or QBI copies", async () => {
  const r = f1040_2025.executeReturn(inputs(1000, 3000));
  for (const key of [undefined, "form7203", "form8995", "k1_s_corp"]) {
    const p = buildPending(r.pending) as any;
    if (key) delete p[key];
    const filer = extractFilerIdentity(p.f1040)!;
    await assertRejects(
      () => buildMefBundle(p, { filer, attachments: [] }),
      Error,
      "export remains staged",
    );
    await assertRejects(
      () => buildPdfBytes(p, filer),
      Error,
      "export remains staged",
    );
  }
});
