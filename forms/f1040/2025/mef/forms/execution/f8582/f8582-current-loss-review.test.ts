import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { passivePropertyInputs } from "../../../../domains/credits/earned-income/eic_passive_property.fixture.ts";
import { normalizeAllPending } from "../../../../domains/execution/pending.ts";
import { reviewCurrentPropertyLoss8582 } from "./f8582-current-loss-review.ts";
import { form8582 } from "./f8582.ts";

function currentLoss(
  farmIncome = true,
  nonpassive = false,
  operatingIncome = false,
) {
  const i = passivePropertyInputs(-3000);
  const property = i.schedule_e[0];
  property.passive_property_sales[0].current_loss_source_reference =
    property.current_property_source.source_reference;
  if (farmIncome) {
    i.f4835[0].livestock_crop_income = 9000;
    i.f4835[0].current_qbi_source.current_receipts[0].amount = 9000;
  }
  if (nonpassive) {
    property.rent_income = 8000;
    property.current_property_source.rent_payments[0].amount = 8000;
  }
  if (operatingIncome) {
    property.rent_income = 4000;
    property.current_property_source.rent_payments[0].amount = 4000;
  }
  const r = f1040_2025.executeReturn(i);
  assertEquals(r.diagnostics, []);
  return { inputs: i, pending: normalizeAllPending(r.pending) };
}

Deno.test("source-bound current ordinary loss review projects Parts V VII VIII IX and validates standalone IRS8582", async () => {
  const schema = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS8582/IRS8582.xsd",
    import.meta.url,
  ).pathname;
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  for (
    const c of [
      {
        id: "mixed-allowed",
        farm: true,
        nonpassive: false,
        allowed: 2000,
        suspended: 2000,
      },
      {
        id: "all-suspended",
        farm: false,
        nonpassive: false,
        allowed: 0,
        suspended: 9000,
      },
      {
        id: "income-with-ordinary-loss",
        farm: false,
        nonpassive: false,
        operatingIncome: true,
        allowed: 1000,
        suspended: 7000,
      },
      {
        id: "recharacterized-land",
        farm: false,
        nonpassive: true,
        allowed: 0,
        suspended: 5000,
      },
    ]
  ) {
    const source = currentLoss(
      c.farm,
      c.nonpassive,
      "operatingIncome" in c && c.operatingIncome,
    );
    const review = reviewCurrentPropertyLoss8582(source.pending);
    assertEquals(review.filingReady, false);
    assertEquals(review.issuerVerified, false);
    assertEquals(review.allocation.allowed_loss, c.allowed);
    assertEquals(review.allocation.suspended_loss, c.suspended);
    assertStringIncludes(
      review.xml,
      `<TotalLossesAllowedAmt>${c.allowed}</TotalLossesAllowedAmt>`,
    );
    if (c.id === "income-with-ordinary-loss") {
      assertStringIncludes(
        review.xml,
        "<ReportingFormOrScheduleNm>4797, Part II</ReportingFormOrScheduleNm>",
      );
      const loss = review.allocation.by_activity.find((a) =>
        a.activity_id === "current-rented-land"
      )!.forms.find((f) => f.reporting_form === "Form 4797 Part II")!;
      assertEquals(loss.allowed_loss, 1000);
      assertEquals(loss.suspended_loss, 2000);
    }
    if (c.farm) {
      assertStringIncludes(
        review.xml,
        "<ReportingFormOrScheduleNm>SchE22/4797II</ReportingFormOrScheduleNm>",
      );
      assertStringIncludes(review.xml, "<LossesPct>0.25000</LossesPct>");
      assertStringIncludes(review.xml, "<LossesPct>0.75000</LossesPct>");
      assertStringIncludes(
        review.xml,
        "<ReportingFormOrScheduleNm>Form 4797, Part II</ReportingFormOrScheduleNm>",
      );
      assertStringIncludes(
        review.xml,
        "<PriorYearUnallowedLossesAmt>1500</PriorYearUnallowedLossesAmt>",
      );
    }
    const xml = review.xml.replace(
      "<IRS8582>",
      '<IRS8582 documentId="IRS8582CurrentLoss" xmlns="http://www.irs.gov/efile">',
    );
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, xml);
      const result = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", schema, temp],
        stderr: "piped",
      }).output();
      assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    } finally {
      await Deno.remove(temp);
    }
    assertEquals(
      form8582.build(source.pending.form8582, { pending: source.pending }),
      review.xml,
    );
    if (output) {
      await Deno.writeTextFile(`${output}/${c.id}.xml`, xml, {
        createNew: true,
        mode: 0o600,
      });
      await Deno.writeTextFile(
        `${output}/${c.id}-native.json`,
        JSON.stringify({ ...source, review }, null, 2),
        { createNew: true, mode: 0o600 },
      );
    }
  }
});

Deno.test("current native loss review rejects detached source owners, inventory and finalized amounts", () => {
  const original = currentLoss().pending;
  reviewCurrentPropertyLoss8582(original);
  for (
    const mutate of [
      (p: any) =>
        p.schedule_e.schedule_es[0].current_property_source.recipient_tin =
          "444556666",
      (p: any) =>
        p.form4797.current_property_sources[0].closing_record.gross_paid = 3500,
      (p: any) => p.form8582.current_loss_forms[0].forms[1].current_loss = 2999,
      (p: any) => p.form4797.current_loss_forms[0].forms[1].current_loss = 2999,
      (p: any) => p.form8582.current_loss = 3999,
      (p: any) => p.schedule1.line4_other_gains = -1499,
      (p: any) => p.schedule1.line5_schedule_e = 1501,
      (p: any) => p.agi_aggregator.pal_4797_preapplied_loss = 1499,
      (p: any) => p.f1040.line11_agi = 5001,
      (p: any) => p.form8995.line2 = 1,
      (p: any) => p.form4797.ordinary_gain = 1,
      (p: any) => p.form8582.passive_schedule_c = 1,
      (p: any) => p.form8582.modified_agi = 1,
      (p: any) => p.agi_aggregator.eic_passive_4797_ordinary = -1499,
      (p: any) => p.eitc.investment_income_floor = 11949,
    ]
  ) {
    const changed = structuredClone(original);
    mutate(changed);
    assertThrows(() => reviewCurrentPropertyLoss8582(changed));
  }
  assertEquals(currentLoss().pending, original);
});
