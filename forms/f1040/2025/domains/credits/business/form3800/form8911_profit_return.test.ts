import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import {
  profitableBonusCases,
  profitableBonusInput,
} from "./form8911_profit_fixture.ts";
import { bonusFilerFixture } from "./form8911_bonus_fixture.ts";

Deno.test("Profitable refueling assets reconcile depreciation, SE, QBI, credit limits and overflow through full return", async () => {
  for (const scenario of profitableBonusCases) {
    const result = f1040_2025.executeReturn(profitableBonusInput(scenario));
    assertEquals(result.diagnostics, [], scenario.id);
    const p = result.pending;
    assertEquals(
      p.schedule1.line3_schedule_c,
      scenario.profits.reduce((a, b) => a + b, 0),
    );
    assertEquals(p.schedule1.line15_se_deduction, scenario.halfSe);
    assertEquals(p.f1040.line23_other_taxes, scenario.se);
    assertEquals(p.f1040.line13_qbi_deduction, scenario.qbi);
    assertEquals(p.f1040.line11_agi, scenario.agi);
    assertEquals(p.f1040.line16_income_tax, scenario.incomeTax);
    assertEquals(p.f3800.allowed_credit, scenario.credit);
    assertEquals(p.f1040.line24_total_tax, scenario.tax);
    assertEquals(p.f1040.line35a_refund ?? 0, scenario.refund);
    assertEquals(p.f1040.line37_amount_owed ?? 0, scenario.owed);
    const prepared = await f1040_2025.prepareReturn(p, bonusFilerFixture.filer);
    const xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS4562 /g) ?? []).length, scenario.costs.length);
    assertEquals(
      (xml.match(/<IRS8911ScheduleA /g) ?? []).length,
      scenario.costs.length,
    );
    assertStringIncludes(
      xml,
      `<BusinessInvstUsePartOfCrAmt>${
        scenario.costs.reduce<number>((sum, cost) => sum + cost * 0.06, 0)
      }</BusinessInvstUsePartOfCrAmt>`,
    );
    for (const cost of scenario.costs) {
      assertStringIncludes(
        xml,
        `<SpecialAllowanceAmt>${cost * 0.94}</SpecialAllowanceAmt>`,
      );
    }
    const depreciationIds = [...xml.matchAll(/<IRS4562 documentId="([^"]+)"/g)]
      .map((match) => match[1]);
    assertEquals(new Set(depreciationIds).size, scenario.costs.length);
    assertStringIncludes(xml, "<IRS1040ScheduleSE ");
    assertStringIncludes(xml, "<IRS8995 ");
    await prepared.renderPdf();
  }
});

Deno.test("Profitable asset filing rejects changed SE/QBI/credit final joins and missing allocation review", async () => {
  const input = profitableBonusInput(profitableBonusCases[1]);
  const { pending } = f1040_2025.executeReturn(input);
  const variations = [
    {
      ...pending,
      schedule1: { ...pending.schedule1, line15_se_deduction: 2120 },
    },
    { ...pending, schedule_se: { ...pending.schedule_se, w2_ss_wages: 50001 } },
    { ...pending, f1040: { ...pending.f1040, line13_qbi_deduction: 5577 } },
    { ...pending, f1040: { ...pending.f1040, line24_total_tax: 9798 } },
    { ...pending, f3800: { ...pending.f3800, allowed_credit: 1799 } },
  ];
  for (const changed of variations) {
    await assertRejects(() =>
      f1040_2025.prepareReturn(changed, bonusFilerFixture.filer)
    );
  }
  const missing = f1040_2025.executeReturn({
    ...input,
    schedule_c: input.schedule_c.map((business) => ({
      ...business,
      qbi_se_tax_allocation_review: undefined,
    })),
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(missing.pending, bonusFilerFixture.filer)
  );
});
