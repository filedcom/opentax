import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import {
  passivePropertyCases,
  passivePropertyInputs,
} from "./eic_passive_property.fixture.ts";
import { normalizeAllPending } from "./pending.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { form4797 } from "./mef/forms/f4797.ts";
import { form4797Pdf } from "./pdf/forms/f4797.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
Deno.test("owned current passive property ordinary gains join actual farm PAL and qualified allowed-source QBI", async () => {
  const arg = Deno.args.indexOf("--write-review-artifacts"),
    out = arg < 0 ? undefined : Deno.args[arg + 1];
  for (const c of passivePropertyCases) {
    const inputs = c.inputs(),
      r = f1040_2025.executeReturn(inputs),
      p = normalizeAllPending(r.pending);
    assertEquals(r.diagnostics, [], c.id);
    assertEquals(p.f1040.line11_agi, c.agi, c.id);
    assertEquals(p.f1040.line27_eitc ?? 0, c.eic, c.id);
    assertEquals(p.f1040.line16_income_tax ?? 0, c.tax, c.id);
    assertEquals(p.f1040.line13_qbi_deduction ?? 0, c.qbi, c.id);
    assertEquals(p.form8995.line2, c.qbiNet, c.id);
    assertEquals(r.carryforwards.suspended_pal_8582 ?? 0, c.suspended, c.id);
    assertEquals(
      Object.entries(r.carryforwards).filter(([key]) =>
        key.startsWith("qualified_passive_loss_199a:")
      ).reduce((n, [, amount]) => n + Number(amount), 0),
      c.suspended,
      c.id,
    );
    const shouldHavePropertyPal = c.id.includes("negative_net");
    assertEquals(
      ((p.form8582?.activities ?? []) as any[]).some((row: any) =>
        row.activity_id === "current-rented-land"
      ),
      shouldHavePropertyPal,
      c.id,
    );
    if (!shouldHavePropertyPal) {
      assertEquals(p.form8582?.current_4797_sale_gains ?? [], [], c.id);
    }

    assertEquals(
      p.schedule1.line4_other_gains,
      inputs.schedule_e[0].current_property_source.closing_record.gross_paid -
        6000,
      c.id,
    );
    const filer = extractFilerIdentity(r.pending.f1040)!,
      bundle = await buildMefBundle(buildPending(r.pending), {
        filer,
        attachments: [],
      }),
      origins: any[] = [],
      pdf = await buildPdfBytes(
        bundle.pending,
        filer,
        undefined,
        bundle,
        origins,
      ),
      path = await Deno.makeTempFile({ suffix: ".xml" });
    await Deno.writeTextFile(path, bundle.xml);
    const v = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stderr: "piped",
    }).output();
    assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
    await Deno.remove(path);
    if (out) {
      const dir = `${out}/${c.id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify(
          {
            inputs,
            filer,
            pending: p,
            preparedPending: bundle.pending,
            carryforwards: r.carryforwards,
            origins,
            expected: {
              agi: c.agi,
              eic: c.eic,
              tax: c.tax,
              suspended: c.suspended,
              qbi: c.qbi,
              qbiNet: c.qbiNet,
            },
          },
          null,
          2,
        ),
      );
    }
  }
});
Deno.test("current property gain owner, asset, sale, activity, PAL and QBI export conflicts reject", async () => {
  const r = f1040_2025.executeReturn(passivePropertyInputs()),
    p = normalizeAllPending(r.pending),
    filer = extractFilerIdentity(r.pending.f1040)!;
  assertEquals(r.diagnostics, []);
  await buildMefBundle(buildPending(r.pending), { filer, attachments: [] });
  const mutations: Array<[string, (p: any) => void]> = [
    [
      "detached-property-source",
      (g) => delete g.schedule_e.schedule_es[0].current_property_source,
    ],
    [
      "sold-basis",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.acquisition_record
          .parcels[0].allocated_purchase_cost++,
    ],
    [
      "closing-proceeds",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.closing_record
          .gross_paid++,
    ],
    [
      "retained-interest",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source
          .retained_interest_record.remaining_parcel_ids = ["land-sold"],
    ],
    [
      "owner",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.recipient_tin =
          "999887777",
    ],
    [
      "operating-payment",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source
          .property_tax_payments[0].amount++,
    ],
    [
      "acquisition",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.acquisition_record
          .acquired_on = "2025-02-01",
    ],
    [
      "impossible-date",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.closing_record
          .sold_on = "2025-02-30",
    ],
    [
      "source-document",
      (g) =>
        g.schedule_e.schedule_es[0].current_property_source.closing_record
          .closing_reference += " changed",
    ],
    [
      "unjoined-property",
      (g) =>
        g.schedule_e.schedule_es.push({
          ...g.schedule_e.schedule_es[0],
          activity_id: "phantom",
        }),
    ],
    [
      "ledger-owner-source",
      (g) =>
        g.form8995.current_passive_property_sources[0].recipient_tin =
          "999887777",
    ],
    ["qbi-zero", (g) => g.form8995.line2 = 1],
    ["missing-qbi", (g) => delete g.form8995],
    ["missing-pal", (g) => delete g.form8582],
    ["allowed-pal", (g) => g.form8582.current_loss++],
    [
      "sale-pool",
      (g) =>
        g.form8582.current_4797_sale_gains = [{
          activity_id: "current-rented-land",
          activity_name: "Current rented land trade",
          part: "II",
          gain: 3000,
          entire_activity_interest_disposed: false,
        }],
    ],
    [
      "activity-kind",
      (g) => g.form8582.activities[0].reporting_form = "schedule_e",
    ],
    ["agi", (g) => g.f1040.line11_agi++],
    ["ordinary-income", (g) => g.schedule1.line4_other_gains++],
    ["allowed-scheduleE", (g) => g.schedule1.line5_schedule_e++],
    [
      "farm-qbi",
      (g) =>
        g.form8995.current_passive_farm_qbi_sources[0].current_repairs[0]
          .amount++,
    ],
    [
      "depreciation",
      (g) => g.form4797.passive_property_sales[0].depreciation_allowed = 1,
    ],
    [
      "ordinary-character",
      (g) => g.form4797.passive_property_sales[0].part = "I",
    ],
  ];
  for (const [label, mutate] of mutations) {
    const g = structuredClone(p);
    mutate(g);
    await assertRejects(
      () => buildMefBundle(buildPending(g), { filer, attachments: [] }),
      Error,
      undefined,
      label,
    );
    assertThrows(
      () => form4797.build(g.form4797, { pending: g }),
      Error,
      undefined,
      label,
    );
    assertThrows(
      () => form4797Pdf.projectFields!(g.form4797, g),
      Error,
      undefined,
      label,
    );
    assertThrows(
      () => irs1040Pdf.projectFields!(g.f1040, g),
      Error,
      undefined,
      label,
    );
  }
  const wrong = passivePropertyInputs();
  wrong.schedule_e[0].current_property_source.recipient_tin = "999887777";
  assertEquals(f1040_2025.executeReturn(wrong).diagnostics.length > 0, true);
});
