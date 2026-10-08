import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../index.ts";
import { normalizeAllPending } from "../execution/pending.ts";
import { passivePropertyInputs } from "../credits/earned-income/eic_passive_property.fixture.ts";
import { reviewCurrentLossOriginalForms } from "../../mef/forms/execution/current-loss-original-form-review.ts";
import {
  buildForm8582Ledger,
  readForm8582Ledger,
} from "../../../nodes/intermediate/forms/form8582/ledger.ts";
import { reconcileForm8582NextYearOpening } from "../../../nodes/intermediate/forms/form8582/next_year_import.ts";

function source(farmIncome: boolean, rent: number) {
  const inputs = passivePropertyInputs(-3000);
  const property = inputs.schedule_e[0];
  property.passive_property_sales[0].current_loss_source_reference =
    property.current_property_source.source_reference;
  property.rent_income = rent;
  property.current_property_source.rent_payments[0].amount = rent;
  if (farmIncome) {
    inputs.f4835[0].livestock_crop_income = 9000;
    inputs.f4835[0].current_qbi_source.current_receipts[0].amount = 9000;
  }
  const graph = f1040_2025.executeReturn(inputs);
  assertEquals(graph.diagnostics, []);
  const pending = normalizeAllPending(graph.pending);
  reviewCurrentLossOriginalForms(pending);
  return { inputs, pending, carryforwards: graph.carryforwards };
}

Deno.test("public current-loss sources retain separate operating and ordinary ledger characters into a source-reconciled next-year opening", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  const reference = "Synthetic ledger reference; not IRS acceptance";
  for (
    const c of [
      {
        id: "mixed-allowed",
        farm: true,
        rent: 2000,
        total: 2000,
        rows: [
          {
            activity_id: "current-rented-land",
            reporting_part: "ix",
            reporting_form: "schedule_e",
            prior_unallowed_loss: 500,
          },
          {
            activity_id: "current-rented-land",
            reporting_part: "ix",
            reporting_form: "form4797_part2",
            prior_unallowed_loss: 1500,
          },
        ],
      },
      {
        id: "all-suspended",
        farm: false,
        rent: 2000,
        total: 9000,
        rows: [
          {
            activity_id: "current-rented-land",
            reporting_part: "ix",
            reporting_form: "schedule_e",
            prior_unallowed_loss: 1000,
          },
          {
            activity_id: "current-rented-land",
            reporting_part: "ix",
            reporting_form: "form4797_part2",
            prior_unallowed_loss: 3000,
          },
          {
            activity_id: "current-farm-loss",
            reporting_part: "viii",
            reporting_form: "form4835",
            prior_unallowed_loss: 5000,
          },
        ],
      },
      {
        id: "recharacterized-land",
        farm: false,
        rent: 8000,
        total: 5000,
        rows: [
          {
            activity_id: "current-farm-loss",
            reporting_part: "viii",
            reporting_form: "form4835",
            prior_unallowed_loss: 5000,
          },
        ],
      },
      {
        id: "income-with-ordinary-loss",
        farm: false,
        rent: 4000,
        total: 7000,
        rows: [
          {
            activity_id: "current-rented-land",
            reporting_part: "viii",
            reporting_form: "form4797_part2",
            prior_unallowed_loss: 2000,
          },
          {
            activity_id: "current-farm-loss",
            reporting_part: "viii",
            reporting_form: "form4835",
            prior_unallowed_loss: 5000,
          },
        ],
      },
    ]
  ) {
    const facts = source(c.farm, c.rent);
    const before = structuredClone(facts.pending);
    const ledger = buildForm8582Ledger(facts.pending.form8582, reference);
    assertEquals(ledger.ending_unallowed_loss, c.total);
    assertEquals(
      ledger.ending_unallowed_loss,
      facts.carryforwards.suspended_pal_8582,
    );
    const stored = JSON.parse(JSON.stringify(ledger));
    assertEquals(
      readForm8582Ledger(stored, facts.pending.form8582, reference),
      ledger,
    );
    const opening = {
      tax_year: 2026,
      prior_accepted_return_reference: reference,
      rows: c.rows,
    };
    assertEquals(
      reconcileForm8582NextYearOpening(
        opening,
        stored,
        facts.pending.form8582,
        reference,
      ),
      opening,
    );
    for (const activity of ledger.activities) {
      for (const line of activity.lines) {
        assertEquals(line.opening_unallowed_loss, 0);
        assertEquals(
          line.current_year_loss,
          line.allowed_loss + line.ending_unallowed_loss,
        );
        if (line.ending_unallowed_loss > 0) {
          assertEquals(
            facts
              .carryforwards[
                `suspended_pal_8582_part${activity.reporting_part}:${
                  encodeURIComponent(activity.activity_id)
                }:${line.reporting_form}`
              ],
            line.ending_unallowed_loss,
          );
        }
      }
    }
    if (c.farm) {
      assertEquals(
        ledger.activities[0].lines.map((
          line,
        ) => [
          line.reporting_form,
          line.current_year_loss,
          line.allowed_loss,
          line.ending_unallowed_loss,
        ]),
        [
          ["schedule_e", 1000, 500, 500],
          ["form4797_part2", 3000, 1500, 1500],
        ],
      );
    }
    // Swapping characters preserves the aggregate but must not import.
    const swapped = structuredClone(opening);
    swapped.rows[0].reporting_form =
      swapped.rows[0].reporting_form === "form4797_part2"
        ? "schedule_e"
        : "form4797_part2";
    assertThrows(() =>
      reconcileForm8582NextYearOpening(
        swapped,
        stored,
        facts.pending.form8582,
        reference,
      )
    );
    assertEquals(facts.pending, before);
    if (output) {
      await Deno.writeTextFile(
        `${output}/${c.id}-ledger.json`,
        JSON.stringify(
          {
            ...facts,
            ledger,
            opening,
            issuerVerified: false,
            filingReady: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
        { createNew: true, mode: 0o600 },
      );
    }
  }
});

Deno.test("current-loss ledger and opening reject changed original forms, prior loss, duplicates, stored allocation and filing reference", () => {
  const facts = source(true, 2000);
  const original = facts.pending.form8582;
  const reference = "Synthetic ledger reference; not IRS acceptance";
  const ledger = buildForm8582Ledger(original, reference);
  for (
    const mutate of [
      (p: any) => p.activities[0].current_net = -999,
      (p: any) => p.activities[0].prior_unallowed_4797_part2 = 1,
      (p: any) => p.current_loss_forms[0].forms[1].current_loss = 2999,
      (p: any) => p.current_loss_forms[0].special_allowance_eligible = true,
      (p: any) =>
        p.current_loss_forms[0].forms.push({
          reporting_form: "Form 4835",
          current_income: 0,
          current_loss: 0,
        }),
      (p: any) => p.activities.push(structuredClone(p.activities[0])),
      (p: any) =>
        p.current_loss_forms.push(structuredClone(p.current_loss_forms[0])),
      (p: any) =>
        p.current_loss_forms[0].forms.push(
          structuredClone(p.current_loss_forms[0].forms[0]),
        ),
      (p: any) =>
        p.current_4797_sale_gains = [{
          activity_id: "current-rented-land",
          activity_name: "Current rented land trade",
          part: "II",
          gain: 1,
        }],
    ]
  ) {
    const changed = structuredClone(original);
    mutate(changed);
    assertThrows(() => buildForm8582Ledger(changed, reference));
  }
  const forged = structuredClone(ledger);
  forged.activities[0].lines[0].allowed_loss = 501;
  forged.activities[0].lines[0].ending_unallowed_loss = 499;
  forged.activities[0].lines[1].allowed_loss = 1499;
  forged.activities[0].lines[1].ending_unallowed_loss = 1501;
  assertThrows(() => readForm8582Ledger(forged, original, reference));
  assertThrows(() =>
    readForm8582Ledger(ledger, original, "Other filing reference")
  );
  assertEquals(source(true, 2000).pending.form8582, original);
});
