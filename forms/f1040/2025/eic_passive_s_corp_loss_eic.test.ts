import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import {
  passiveSCorpJointLossReturnInputs,
  passiveSCorpLossReturnInputs,
} from "./eic_passive_s_corp_loss.fixture.ts";
import { assertEicSource } from "./eic-source.ts";

function check(p: any, credit = Number(p.f1040.line27_eitc ?? 0)) {
  assertEicSource(
    p.f1040.filing_status,
    credit,
    p.f1040.main_home_in_us_over_half_year,
    p,
  );
  const filer = extractFilerIdentity(p.f1040)!;
  irs1040.build(p.f1040, { pending: p, filer });
  irs1040Pdf.projectFields!(p.f1040, p);
}
for (
  const [cash, income] of [
    [1000, 0],
    [1000, 500],
    [1000, 3000],
    [4000, 3000],
    [4000, 4000],
    [4000, 5000],
    [6000, 0],
    [6000, 3000],
  ]
) {
  for (const investment of [11950, 11951]) {
    Deno.test(`Passive source EIC filing validator replays basis ${cash}/income ${income} at ${investment}`, () => {
      const r = f1040_2025.executeReturn(
        passiveSCorpLossReturnInputs(cash, income, investment),
      );
      assertEquals(r.diagnostics, []);
      const p = r.pending;
      assertEquals(p.eitc.investment_income_floor, investment);
      assertEquals(p.eitc.earned_income, 5000);
      assertEquals(p.f1040.line27_eitc ?? 0, investment === 11950 ? 384 : 0);
      check(p);
      if (investment === 11951) {
        const forged = structuredClone(p);
        forged.eitc.credit_amount = 384;
        forged.f1040.line27_eitc = 384;
        assertThrows(() => check(forged), Error, "investment income exceeds");
      }
    });
  }
}
for (
  const [label, mutate] of [
    ["missing basis", (p: any) => delete p.form7203],
    ["missing qualified loss", (p: any) => delete p.form8995],
    ["missing original K1", (p: any) => delete p.k1_s_corp],
    ["missing PAL", (p: any) => delete p.form8582],
    ["raw loss into PAL", (p: any) => p.form8582.current_loss = 4000],
    [
      "allowed loss into Schedule1",
      (p: any) => p.schedule1.line5_schedule_e = -4000,
    ],
    [
      "bank source",
      (p: any) =>
        p.k1_s_corp.k1_s_corps[0].first_year_passive_loss_source
          .stock_subscription.cash_payment.shareholder_bank_debit++,
    ],
    [
      "wrong owner",
      (p: any) => p.k1_s_corp.k1_s_corps[0].recipient_tin = "999887777",
    ],
    ["passive income floor", (p: any) => p.eitc.investment_income_floor--],
    ["unreviewed nonpassive loss", (p: any) => {
      delete p.k1_s_corp.k1_s_corps[0].first_year_passive_loss_source;
      p.k1_s_corp.k1_s_corps[0].eic_passive_activity_review.box1 = "nonpassive";
    }],
  ] as const
) {
  Deno.test(`Passive EIC filing validator rejects ${label}`, () => {
    const p = f1040_2025.executeReturn(passiveSCorpLossReturnInputs(1000, 3000))
      .pending;
    mutate(p);
    assertThrows(() => check(p));
  });
}

for (const spouseOwned of [false, true]) {
  for (const investment of [11950, 11951]) {
    Deno.test(`Passive EIC actual joint ${spouseOwned ? "spouse" : "primary"} loss source at ${investment}`, () => {
      const r = f1040_2025.executeReturn(
        passiveSCorpJointLossReturnInputs(spouseOwned, investment),
      );
      assertEquals(r.diagnostics, []);
      const p = r.pending;
      assertEquals(p.eitc.investment_income_floor, investment);
      assertEquals(p.f1040.line27_eitc ?? 0, investment === 11950 ? 649 : 0);
      check(p);
      if (investment === 11951) {
        const forged = structuredClone(p);
        forged.eitc.credit_amount = 649;
        forged.f1040.line27_eitc = 649;
        assertThrows(
          () => check(forged),
          Error,
          "investment income exceeds",
        );
      }
    });
  }
}
for (const investment of [11950, 11951]) {
  Deno.test(`Passive EIC filing validator combines taxable/exempt interest and dividends at ${investment}`, () => {
    const i = passiveSCorpLossReturnInputs(1000, 3000, investment);
    i.f1099int[0].box8 -= 5;
    i.f1099int[0].box1 = 3;
    i.f1099div = [{
      payerName: "Constructed dividend issuer",
      payerTin: "876543210",
      source_document_reference: "Constructed 2025 dividend copy",
      account_number: "DIV-2025",
      recipient_tin: "111223333",
      isNominee: false,
      box11: false,
      box1a: 2,
    }];
    const r = f1040_2025.executeReturn(i);
    assertEquals(r.diagnostics, []);
    const p = r.pending;
    assertEquals(p.f1040.line11_agi, 7005);
    assertEquals(p.eitc.investment_income_floor, investment);
    check(p);
    if (investment === 11951) {
      const forged = structuredClone(p);
      forged.eitc.credit_amount = 384;
      forged.f1040.line27_eitc = 384;
      assertThrows(() => check(forged), Error, "investment income exceeds");
    }
  });
}
