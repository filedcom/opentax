import { assertEquals, assertThrows } from "@std/assert";
import { firstYearPassiveSCorpLoss8582Activity } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp_passive_loss_source.ts";
import { passiveK1Activities } from "../../../../../nodes/inputs/income/rental-passthrough/k1_passive_source.ts";
import {
  form8582,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/income/business/form8582/index.ts";
import { passiveSCorpLossRecords } from "./eic_passive_s_corp_loss.fixture.ts";
import { passiveK1Item } from "./eic_passive_k1.fixture.ts";

function workpaper(cash: number, income: number) {
  const { source, k1 } = passiveSCorpLossRecords(cash);
  const loss = firstYearPassiveSCorpLoss8582Activity(source, k1);
  const incomes = income > 0
    ? passiveK1Activities(
      [passiveK1Item(
        "partnership",
        "box2",
        income,
        k1.recipient_tin,
        "987654321",
      )],
      "k1_partnership",
      true,
    )
    : [];
  const input = inputSchema.parse({
    current_loss: loss.stages.passiveLossBefore8582,
    current_income: income,
    rental_current_loss: 0,
    rental_current_income: 0,
    prior_unallowed: 0,
    has_other_passive: true,
    activities: [loss.activity, ...incomes],
  });
  const result = form8582.compute({ taxYear: 2025, formType: "f1040" }, input);
  return { source, k1, loss, input, result };
}

for (
  const c of [
    { cash: 1000, income: 0, allowed: 0, basisCarry: 3000, palCarry: 1000 },
    { cash: 1000, income: 500, allowed: 500, basisCarry: 3000, palCarry: 500 },
    { cash: 1000, income: 3000, allowed: 1000, basisCarry: 3000, palCarry: 0 },
    { cash: 4000, income: 0, allowed: 0, basisCarry: 0, palCarry: 4000 },
    { cash: 4000, income: 3000, allowed: 3000, basisCarry: 0, palCarry: 1000 },
    { cash: 4000, income: 4000, allowed: 4000, basisCarry: 0, palCarry: 0 },
    { cash: 6000, income: 3000, allowed: 3000, basisCarry: 0, palCarry: 1000 },
  ]
) {
  Deno.test(`Passive S-corp basis ${c.cash} and passive income ${c.income} preserve separate basis/PAL losses`, () => {
    const { source, loss, result } = workpaper(c.cash, c.income);
    assertEquals(loss.stages.basisSuspendedLoss, c.basisCarry);
    assertEquals(loss.activity.current_net, -Math.min(c.cash, 4000));
    assertEquals(loss.activity.reporting_form, "k1_s_corp");
    assertEquals(loss.activity.first_year_activity_source, {
      activity_id: source.activity_id,
      activity_name: source.activity_name,
      activity_acquired_on: source.stock_subscription.issued_on,
      acquisition_document_reference:
        source.stock_subscription.subscription_reference,
      not_grouped_with_prior_activity: true,
    });
    assertEquals(
      result.outputs.find((o) => o.nodeType === "schedule1")?.fields
        .line5_schedule_e ?? 0,
      -c.allowed || 0,
    );
    assertEquals(result.carryforwards?.suspended_pal_8582 ?? 0, c.palCarry);
    assertEquals(
      result.carryforwards?.[`suspended_pal_8582:${source.activity_id}`] ?? 0,
      c.palCarry,
    );
    // Basis is used at the basis stage even when §469 disallows the whole loss.
    assertEquals(loss.stages.endingStockBasis, Math.max(0, c.cash - 4000));
    assertEquals(c.allowed + c.palCarry + c.basisCarry, 4000);
    assertEquals(loss.stages.filingRouteAdmitted, false);
  });
}

Deno.test("Passive S-corp adapter replays changed source records rather than trusting previous stage amounts", () => {
  const { source, k1 } = passiveSCorpLossRecords();
  firstYearPassiveSCorpLoss8582Activity(source, k1);
  source.stock_subscription.cash_payment.corporate_bank_credit -= 1;
  assertThrows(() => firstYearPassiveSCorpLoss8582Activity(source, k1));
});

Deno.test("A basis-suspended loss cannot be injected into the reconciled Form 8582 activity total", () => {
  const { input } = workpaper(1000, 3000);
  const contradictory = { ...input, current_loss: 4000 };
  assertThrows(() =>
    form8582.compute({ taxYear: 2025, formType: "f1040" }, contradictory)
  );
});

Deno.test("A second source cannot reuse the loss activity's durable ID", () => {
  const { input, loss } = workpaper(1000, 3000);
  input.activities![1].activity_id = loss.activity.activity_id;
  assertThrows(() =>
    form8582.compute({ taxYear: 2025, formType: "f1040" }, input)
  );
});
