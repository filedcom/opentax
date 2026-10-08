import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  passiveSCorpCombinedLossReturnInputs,
  passiveSCorpLossReturnInputs,
} from "../../forms/f1040/2025/domains/credits/earned-income/eic_passive_s_corp_loss.fixture.ts";
import { buildForm8582Ledger } from "../../forms/f1040/nodes/intermediate/forms/form8582/ledger.ts";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { reconcileForm8582NextYearOpening } from "../../forms/f1040/nodes/intermediate/forms/form8582/next_year_import.ts";
import {
  archiveForm8582LedgerCandidate,
  readForm8582LedgerCandidate,
} from "./form8582-ledger.ts";
import { appendInput, createReturn, loadReturn, updateInput } from "./store.ts";
const reference = "Constructed current source; no accepted filing evidence";
for (
  const c of [
    {
      id: "basis-and-full-PAL",
      inputs: () => passiveSCorpLossReturnInputs(1000, 0),
      current: 1000,
      allowed: 0,
      carry: 1000,
      basis: 3000,
    },
    {
      id: "basis-and-partial-PAL",
      inputs: () => passiveSCorpLossReturnInputs(1000, 500),
      current: 1000,
      allowed: 500,
      carry: 500,
      basis: 3000,
    },
    {
      id: "no-basis-carry-partial-PAL",
      inputs: () => passiveSCorpLossReturnInputs(4000, 3000),
      current: 4000,
      allowed: 3000,
      carry: 1000,
      basis: 0,
    },
    {
      id: "combined-partial-PAL",
      inputs: () => passiveSCorpCombinedLossReturnInputs(4000, 500),
      current: 4000,
      allowed: 500,
      carry: 3500,
      basis: 0,
    },
    {
      id: "joint-spouse-fully-allowed",
      inputs: () =>
        passiveSCorpCombinedLossReturnInputs(1000, 3000, 11950, "spouse"),
      current: 1000,
      allowed: 1000,
      carry: 0,
      basis: 3000,
    },
  ]
) {
  Deno.test(`durable passive S-corporation ledger ${c.id} preserves basis-limited source and rejects stale next-year rows`, async () => {
    const base = await Deno.makeTempDir({
      prefix: "opentax-passive-s-ledger-",
    });
    const facts = await createReturn(2025, base), inputs = c.inputs();
    const entry = await appendInput(facts.returnPath, "start", inputs);
    const before = await loadReturn(facts.returnPath);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(
      result
        .carryforwards[
          `basis_suspended_s_corp_loss:${
            inputs.k1_s_corp[0].recipient_tin
          }:123456789`
        ] ?? 0,
      c.basis,
    );
    assertEquals(
      result
        .carryforwards[
          `suspended_pal_8582:${
            inputs.k1_s_corp[0].first_year_passive_loss_source.activity_id
          }`
        ] ?? 0,
      c.carry,
    );

    const record = await archiveForm8582LedgerCandidate(
      base,
      facts.returnId,
      reference,
    );
    assertEquals(record.status, "acceptance-unverified");
    assertEquals(record.ledger.ending_unallowed_loss, c.carry);
    assertEquals(record.ledger.activities.length, 1);
    const activity = record.ledger.activities[0];
    assertEquals(
      activity.activity_id,
      inputs.k1_s_corp[0].first_year_passive_loss_source.activity_id,
    );
    assertEquals(activity.lines, [{
      reporting_form: "schedule_e",
      opening_unallowed_loss: 0,
      current_year_loss: c.current,
      current_same_part_income: 0,
      allowed_loss: c.allowed,
      ending_unallowed_loss: c.carry,
    }]);
    assertEquals(
      await readForm8582LedgerCandidate(
        base,
        facts.returnId,
        record.recordId,
        reference,
      ),
      record,
    );
    assertEquals(await loadReturn(facts.returnPath), before);
    const path = join(
      facts.returnPath,
      "form8582-ledger-candidates",
      record.recordId,
    );
    assertEquals(
      JSON.parse(await Deno.readTextFile(join(path, "source.json"))),
      before,
    );
    for (const file of ["source.json", "form8582.xml", "record.json"]) {
      if (Deno.build.os !== "windows") {
        assertEquals((await Deno.stat(join(path, file))).mode! & 0o777, 0o600);
      }
    }
    const opening = {
      tax_year: 2026,
      prior_accepted_return_reference: reference,
      rows: [{
        activity_id: activity.activity_id,
        reporting_part: "viii",
        reporting_form: "schedule_e",
        prior_unallowed_loss: c.carry,
      }],
    };
    if (c.carry > 0) {
      assertEquals(
        reconcileForm8582NextYearOpening(
          opening,
          record.ledger,
          result.pending.form8582,
          reference,
        ),
        opening,
      );
      for (
        const altered of [{
          ...opening,
          rows: [{
            ...opening.rows[0],
            prior_unallowed_loss: c.carry + c.basis + 1,
          }],
        }, {
          ...opening,
          rows: [{ ...opening.rows[0], activity_id: "other-owner" }],
        }, {
          ...opening,
          rows: [{ ...opening.rows[0], reporting_form: "form4835" }],
        }, { ...opening, rows: [opening.rows[0], opening.rows[0]] }]
      ) {
        assertThrows(() =>
          reconcileForm8582NextYearOpening(
            altered,
            record.ledger,
            result.pending.form8582,
            reference,
          )
        );
      }
    } else {assertThrows(() =>
        reconcileForm8582NextYearOpening(
          opening,
          record.ledger,
          result.pending.form8582,
          reference,
        )
      );}
    const bytes = await Deno.readFile(join(path, "source.json"));
    const changed = structuredClone(inputs);
    changed.k1_s_corp[0].first_year_passive_loss_source.stock_subscription
      .cash_payment.corporate_bank_credit++;
    await updateInput(facts.returnPath, entry.id, changed);
    await assertRejects(() =>
      readForm8582LedgerCandidate(
        base,
        facts.returnId,
        record.recordId,
        reference,
      )
    );
    assertEquals(await Deno.readFile(join(path, "source.json")), bytes);
    console.log(`Retained passive ledger candidate: ${path}`);
  });
}

Deno.test("current passive K1 ledger rejects lost first-year provenance and invented opening or activity types", () => {
  const original =
    f1040_2025.executeReturn(passiveSCorpCombinedLossReturnInputs(1000, 500))
      .pending.form8582;
  for (
    const mutate of [
      (p: any) => delete p.activities[0].first_year_activity_source,
      (p: any) =>
        p.activities[0].first_year_activity_source.activity_id = "different",
      (p: any) =>
        p.activities[0].first_year_activity_source.activity_acquired_on =
          "2024-01-01",
      (p: any) =>
        p.activities[0].first_year_activity_source
          .not_grouped_with_prior_activity = false,
      (p: any) => p.activities[0].prior_unallowed_operating = 3000,
      (p: any) => p.activities[0].reporting_form = "k1_partnership",
      (p: any) => p.activities[1].current_net = -200,
      (p: any) => delete p.activities[1].first_year_activity_source,
    ]
  ) {
    const p = structuredClone(original);
    mutate(p);
    assertThrows(() => buildForm8582Ledger(p, reference));
  }
  const record = buildForm8582Ledger(original, reference);
  const forged = structuredClone(record);
  forged.activities[0].lines[0].current_year_loss = 4000;
  forged.activities[0].lines[0].ending_unallowed_loss = 3500;
  forged.activities[0].ending_unallowed_loss = 3500;
  forged.ending_unallowed_loss = 3500;
  assertThrows(() =>
    reconcileForm8582NextYearOpening(
      {
        tax_year: 2026,
        prior_accepted_return_reference: reference,
        rows: [{
          activity_id: forged.activities[0].activity_id,
          reporting_part: "viii",
          reporting_form: "schedule_e",
          prior_unallowed_loss: 3500,
        }],
      },
      forged,
      original,
      reference,
    )
  );
});
