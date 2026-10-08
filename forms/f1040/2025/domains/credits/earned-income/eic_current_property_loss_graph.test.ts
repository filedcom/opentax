import { form8582 } from "../../../mef/forms/execution/f8582/f8582.ts";
import { form8582Pdf } from "../../../pdf/forms/execution/f8582.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { passivePropertyInputs } from "./eic_passive_property.fixture.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { form4797 } from "../../../mef/forms/business/f4797.ts";
import { form4797Pdf } from "../../../pdf/forms/business/f4797.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { form4797EicPassiveOrdinary } from "../../../../nodes/intermediate/forms/form4797/index.ts";

function lossInputs(farmIncome: boolean, nonpassive: boolean, above: boolean) {
  const inputs = passivePropertyInputs(-3000);
  const property = inputs.schedule_e[0];
  property.passive_property_sales[0].current_loss_source_reference =
    property.current_property_source.source_reference;
  if (farmIncome) {
    inputs.f4835[0].livestock_crop_income = 9000;
    inputs.f4835[0].current_qbi_source.current_receipts[0].amount = 9000;
  }
  if (nonpassive) {
    property.rent_income = 8000;
    property.current_property_source.rent_payments[0].amount = 8000;
  }
  if (above) inputs.f1099int[0].box8 = 11951;
  return inputs;
}

Deno.test("source-backed current ordinary sale losses reach finalized AGI/EIC and preserve loss character through source-reconciled registered exports", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];

  for (
    const c of [
      {
        farmIncome: true,
        nonpassive: false,
        above: false,
        agi: 5000,
        ordinary: -1500,
        operating: 1500,
        suspended: 2000,
      },
      {
        farmIncome: true,
        nonpassive: false,
        above: true,
        agi: 5000,
        ordinary: -1500,
        operating: 1500,
        suspended: 2000,
      },
      {
        farmIncome: false,
        nonpassive: false,
        above: false,
        agi: 5000,
        ordinary: 0,
        operating: 0,
        suspended: 9000,
      },
      {
        farmIncome: false,
        nonpassive: true,
        above: false,
        agi: 7000,
        ordinary: -3000,
        operating: 5000,
        suspended: 5000,
      },
    ]
  ) {
    const inputs = lossInputs(c.farmIncome, c.nonpassive, c.above);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const p = normalizeAllPending(result.pending);
    assertEquals(p.schedule1.line4_other_gains ?? 0, c.ordinary);
    assertEquals(p.schedule1.line5_schedule_e ?? 0, c.operating);
    assertEquals(p.f1040.line11_agi, c.agi);
    assertEquals(p.eitc.investment_income_floor, c.above ? 11951 : 11950);
    assertEquals(p.f1040.line27_eitc ?? 0, c.above ? 0 : 384);
    assertEquals(result.carryforwards.suspended_pal_8582, c.suspended);
    if (c.farmIncome) {
      assertEquals(
        result
          .carryforwards[
            "suspended_pal_8582_partix:current-rented-land:schedule_e"
          ],
        500,
      );
      assertEquals(
        result
          .carryforwards[
            "suspended_pal_8582_partix:current-rented-land:form4797_part2"
          ],
        1500,
      );
      assertEquals(form4797EicPassiveOrdinary(p.form4797), -1500);
    }
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const nativeSale = form4797.build(p.form4797, { pending: p, filer });
    if (c.ordinary === 0) assertEquals(nativeSale, "");
    else {assertStringIncludes(
        nativeSale,
        `<OtherGainLossAmt>${c.ordinary}</OtherGainLossAmt>`,
      );}
    assertEquals(
      form4797Pdf.projectFields!(p.form4797 as any, p as any).ordinary_gain ??
        0,
      c.ordinary,
    );
    assertStringIncludes(
      form8582.build(p.form8582, { pending: p, filer }),
      "<IRS8582>",
    );
    form8582Pdf.projectFields!(p.form8582 as any, p as any);
    await buildMefBundle(buildPending(result.pending), {
      filer,
      attachments: [],
    });
    if (output) {
      await Deno.writeTextFile(
        `${output}/graph-${Number(c.farmIncome)}-${Number(c.nonpassive)}-${
          Number(c.above)
        }.json`,
        JSON.stringify(
          {
            inputs,
            pending: p,
            carryforwards: result.carryforwards,
            expected: c,
            filingReady: false,
            issuerVerified: false,
          },
          null,
          2,
        ),
        { createNew: true, mode: 0o600 },
      );
    }
  }
});

Deno.test("current sale loss requires its reconciled owned source rather than a negative manual sale", () => {
  for (
    const mutate of [
      (i: any) =>
        delete i.schedule_e[0].passive_property_sales[0]
          .current_loss_source_reference,
      (i: any) =>
        i.schedule_e[0].passive_property_sales[0]
          .current_loss_source_reference = "Other closing source",
      (i: any) =>
        i.schedule_e[0].passive_property_sales[0].cost_or_other_basis = 7000,
    ]
  ) {
    const inputs = lossInputs(true, false, false);
    mutate(inputs);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics.some((d) => d.severity === "error"), true);
  }
});
