import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../index.ts";
import { normalizeAllPending } from "../execution/pending.ts";
import { passivePropertyInputs } from "../credits/earned-income/eic_passive_property.fixture.ts";
import { buildPending } from "../../mef/execution/pending.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";

function source(farmIncome: boolean, rent: number, above = false) {
  const inputs = passivePropertyInputs(-3000);
  const p = inputs.schedule_e[0];
  p.passive_property_sales[0].current_loss_source_reference =
    p.current_property_source.source_reference;
  p.rent_income = rent;
  p.current_property_source.rent_payments[0].amount = rent;
  if (farmIncome) {
    inputs.f4835[0].livestock_crop_income = 9000;
    inputs.f4835[0].current_qbi_source.current_receipts[0].amount = 9000;
  }
  if (above) inputs.f1099int[0].box8 = 11951;
  const graph = f1040_2025.executeReturn(inputs);
  assertEquals(graph.diagnostics, []);
  return {
    inputs,
    pending: normalizeAllPending(graph.pending),
    carryforwards: graph.carryforwards,
  };
}

const xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

Deno.test("source-bound current loss returns join original forms, Form1040, native Return1040 and prepared PDF", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const output = flag < 0 ? undefined : Deno.args[flag + 1];
  for (
    const c of [
      {
        id: "mixed-allowed",
        farm: true,
        rent: 2000,
        above: false,
        ordinary: -1500,
        operating: 1500,
        agi: 5000,
        eic: 384,
        suspended: 2000,
      },
      {
        id: "above-eic-limit",
        farm: true,
        rent: 2000,
        above: true,
        ordinary: -1500,
        operating: 1500,
        agi: 5000,
        eic: 0,
        suspended: 2000,
      },
      {
        id: "all-suspended",
        farm: false,
        rent: 2000,
        above: false,
        ordinary: 0,
        operating: 0,
        agi: 5000,
        eic: 384,
        suspended: 9000,
      },
      {
        id: "recharacterized-land",
        farm: false,
        rent: 8000,
        above: false,
        ordinary: -3000,
        operating: 5000,
        agi: 7000,
        eic: 384,
        suspended: 5000,
      },
      {
        id: "income-with-ordinary-loss",
        farm: false,
        rent: 4000,
        above: false,
        ordinary: -1000,
        operating: 1000,
        agi: 5000,
        eic: 384,
        suspended: 7000,
      },
    ]
  ) {
    const facts = source(c.farm, c.rent, c.above);
    const before = structuredClone(facts.pending);
    const filer = extractFilerIdentity(facts.pending.f1040)!;
    const bundle = await buildMefBundle(buildPending(facts.pending), {
      filer,
      attachments: [],
    });
    const origins: PdfPageOrigin[] = [];
    const bytes = await buildPdfBytes(
      bundle.pending,
      filer,
      undefined,
      bundle,
      origins,
    );
    assertEquals(facts.pending.schedule1.line4_other_gains ?? 0, c.ordinary);
    assertEquals(facts.pending.schedule1.line5_schedule_e ?? 0, c.operating);
    assertEquals(facts.pending.f1040.line11_agi, c.agi);
    assertEquals(facts.pending.f1040.line27_eitc ?? 0, c.eic);
    assertEquals(facts.pending.f1040.line35a_refund ?? 0, c.eic);
    assertEquals(facts.carryforwards.suspended_pal_8582, c.suspended);
    assertStringIncludes(
      bundle.xml,
      `<AdjustedGrossIncomeAmt>${c.agi}</AdjustedGrossIncomeAmt>`,
    );
    if (c.ordinary) {
      assertStringIncludes(
        bundle.xml,
        `<OtherGainLossAmt>${c.ordinary}</OtherGainLossAmt>`,
      );
    } else assertEquals(bundle.xml.includes("<IRS4797"), false);
    assertEquals(
      (await PDFDocument.load(bytes)).getPageCount(),
      origins.length,
    );
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, bundle.xml);
      const result = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, temp],
        stderr: "piped",
      }).output();
      assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    } finally {
      await Deno.remove(temp);
    }
    assertEquals(facts.pending, before);
    if (output) {
      const dir = `${output}/${c.id}`;
      await Deno.mkdir(dir, { mode: 0o700 });
      await Deno.writeFile(`${dir}/return.pdf`, bytes, {
        createNew: true,
        mode: 0o600,
      });
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml, {
        createNew: true,
        mode: 0o600,
      });
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify(
          {
            ...facts,
            preparedPending: bundle.pending,
            origins,
            expected: c,
            issuerVerified: false,
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

Deno.test("registered current-loss exports reject detached ownership, source, original character and finalized totals", async () => {
  const original = source(true, 2000).pending;
  const filer = extractFilerIdentity(original.f1040)!;
  for (
    const mutate of [
      (p: any) =>
        p.schedule_e.schedule_es[0].current_property_source.recipient_tin =
          "999887777",
      (p: any) =>
        p.form4797.passive_property_sales[0].current_loss_source_reference =
          "Detached closing",
      (p: any) =>
        p.form4797.passive_property_sales[0].cost_or_other_basis = 5999,
      (p: any) =>
        p.form8582.current_loss_forms[0].forms[1].reporting_form =
          "Form 4797 Part I",
      (p: any) => p.f4835.f4835s[0].expense_repairs_maintenance = 6999,
      (p: any) => p.schedule1.line4_other_gains = -3000,
      (p: any) => p.schedule1.line5_schedule_e = 1000,
      (p: any) => p.f1040.line11_agi = 5001,
      (p: any) => {
        p.general.filing_status = "mfj";
        p.f1040.filing_status = "mfj";
      },
    ]
  ) {
    const changed = structuredClone(original);
    mutate(changed);
    await assertRejects(() =>
      buildMefBundle(buildPending(changed), { filer, attachments: [] })
    );
  }
  assertEquals(source(true, 2000).pending, original);
});
