import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../index.ts";
import { passivePropertyInputs } from "../../domains/credits/earned-income/earned-income/eic_passive_property.fixture.ts";
import { normalizeAllPending } from "../../return-processing/pending.ts";
import { reviewCurrentLossOriginalForms } from "./current-loss-original-form-review.ts";
import { form4797 } from "../forms/income/business/f4797.ts";
import { scheduleE } from "../forms/income/rental-passthrough/schedule_e.ts";

function currentLoss(farmIncome: boolean, rent: number) {
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
  return { inputs, pending: normalizeAllPending(graph.pending) };
}

async function validateXml(xml: string, root: string, schema: string) {
  const temp = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(
      temp,
      xml.replace(
        `<${root}>`,
        `<${root} documentId="${root}Review" xmlns="http://www.irs.gov/efile">`,
      ),
    );
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, temp],
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(temp);
  }
}

Deno.test("current loss original-form native reviews reconcile original deductions and validate three reporting schemas", async () => {
  const cache = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/",
    import.meta.url,
  ).pathname;
  const schemas = {
    IRS4797: `${cache}CorporateIncomeTax/Common/IRS4797/IRS4797.xsd`,
    IRS1040ScheduleE:
      `${cache}IndividualIncomeTax/Common/IRS1040ScheduleE/IRS1040ScheduleE.xsd`,
    IRS4835: `${cache}IndividualIncomeTax/Common/IRS4835/IRS4835.xsd`,
  };
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  for (
    const c of [
      {
        id: "mixed-allowed",
        farmIncome: true,
        rent: 2000,
        line4: -1500,
        line5: 1500,
        propertyLoss: 500,
        farmNet: 2000,
        saleSuspended: 1500,
        label: "PAL",
      },
      {
        id: "all-suspended",
        farmIncome: false,
        rent: 2000,
        line4: 0,
        line5: 0,
        propertyLoss: 0,
        farmNet: 0,
        saleSuspended: 3000,
        label: undefined,
      },
      {
        id: "recharacterized-land",
        farmIncome: false,
        rent: 8000,
        line4: -3000,
        line5: 5000,
        propertyLoss: 0,
        farmNet: 0,
        saleSuspended: 0,
        label: undefined,
      },
      {
        id: "income-with-ordinary-loss",
        farmIncome: false,
        rent: 4000,
        line4: -1000,
        line5: 1000,
        propertyLoss: 0,
        farmNet: 0,
        saleSuspended: 2000,
        label: "PAL",
      },
    ]
  ) {
    const source = currentLoss(c.farmIncome, c.rent);
    const before = structuredClone(source.pending);
    const review = reviewCurrentLossOriginalForms(source.pending);
    assertEquals(review.filingReady, false);
    assertEquals(review.issuerVerified, false);
    assertEquals(review.line4, c.line4);
    assertEquals(review.line5, c.line5);
    assertEquals(
      review.line4 + review.line5,
      c.id === "recharacterized-land" ? 2000 : 0,
    );
    assertEquals(review.properties[0].net, c.rent - 3000);
    assertEquals(review.properties[0].deductibleLoss, c.propertyLoss);
    assertEquals(review.farmRows[0].filed_net, c.farmNet);
    assertEquals(review.saleRows[0].economic_gain_loss, -3000);
    assertEquals(review.saleRows[0].filed_net, c.line4);
    assertEquals(review.saleRows[0].suspended_loss, c.saleSuspended);
    assertEquals(review.saleRows[0].label, c.label);
    if (c.line4 === 0) assertEquals(review.saleXml, "");
    else {
      assertStringIncludes(
        review.saleXml,
        `<GainOrLossAmt>${c.line4}</GainOrLossAmt>`,
      );
      await validateXml(review.saleXml, "IRS4797", schemas.IRS4797);
    }
    await validateXml(
      review.scheduleXml,
      "IRS1040ScheduleE",
      schemas.IRS1040ScheduleE,
    );
    await validateXml(review.farmRows[0].xml, "IRS4835", schemas.IRS4835);
    assertEquals(
      form4797.build(source.pending.form4797, { pending: source.pending }),
      review.saleXml,
    );
    assertEquals(
      scheduleE.build(source.pending.schedule_e, { pending: source.pending }),
      review.scheduleXml,
    );
    assertEquals(source.pending, before);
    if (output) {
      await Deno.writeTextFile(
        `${output}/${c.id}-original-forms.json`,
        JSON.stringify({ ...source, review }, null, 2),
        { createNew: true, mode: 0o600 },
      );
      for (
        const [root, xml] of [["IRS4797", review.saleXml], [
          "IRS1040ScheduleE",
          review.scheduleXml,
        ], ["IRS4835", review.farmRows[0].xml]]
      ) {
        if (xml) {
          await Deno.writeTextFile(
            `${output}/${c.id}-${root}.xml`,
            xml.replace(
              `<${root}>`,
              `<${root} documentId="${root}Review" xmlns="http://www.irs.gov/efile">`,
            ),
            { createNew: true, mode: 0o600 },
          );
        }
      }
    }
  }
});

Deno.test("original-form loss review rejects changed basis, farm costs, source reference and final reporting totals", () => {
  const original = currentLoss(true, 2000).pending;
  for (
    const mutate of [
      (p: any) =>
        p.form4797.passive_property_sales[0].cost_or_other_basis = 5999,
      (p: any) =>
        p.form4797.passive_property_sales[0].current_loss_source_reference =
          "Detached closing",
      (p: any) => p.f4835.f4835s[0].expense_taxes = 1,
      (p: any) => p.schedule1.line4_other_gains = -3000,
      (p: any) => p.schedule1.line5_schedule_e = 1000,
    ]
  ) {
    const changed = structuredClone(original);
    mutate(changed);
    assertThrows(() => reviewCurrentLossOriginalForms(changed));
  }
  assertEquals(currentLoss(true, 2000).pending, original);
});
