import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { preparedSourceSha256 } from "../prepared-source.ts";
import { dispositionDigest } from "./form8283-contribution-year-disposition.fixture.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./builder.ts";
import { inputSchema as giftSchema } from "../../nodes/inputs/f8283/index.ts";
import { calculateCharitableNaturalResource } from "../../nodes/inputs/f8283/natural-resource-source.ts";
import {
  naturalResourceSource,
  type ResourceCase,
  reviewedNaturalResourceGift,
} from "./form8283-natural-resource.fixture.ts";
const expected = {
  active_soil_water_limited: [20000, 27000, .8, 21600, 28400],
  active_soil_water: [20000, 24000, .8, 19200, 30800],
  soil_water: [20000, 12000, .8, 9600, 40400],
  legacy_exploration: [20000, 10000, 1, 10000, 40000],
  active_idc_oil: [140000, 70000, 1, 70000, 230000],
  active_oil: [140000, 60000, 1, 60000, 240000],
  small_oil: [1600, 1400, 1, 1400, 3600],
  oil: [16000, 14000, 1, 14000, 36000],
  gas: [16000, 14000, 1, 14000, 36000],
  geothermal: [16000, 14000, 1, 14000, 36000],
  gold_development: [16000, 14000, 1, 14000, 36000],
  gold_exploration: [20000, 10000, 1, 10000, 40000],
};
for (const kind of Object.keys(expected) as ResourceCase[]) {
  Deno.test(`2025 owned natural-resource gift ${kind} public full packet`, async () => {
    const source = await reviewedNaturalResourceGift(kind),
      want = expected[kind];
    assertEquals([
      source.calc.adjusted_basis,
      source.calc.recapture_costs,
      source.calc.applicable_percentage,
      source.calc.ordinary_gain,
      source.calc.deduction_claimed,
    ], want);
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      source.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(
      [
        result.pending.f1040.line11_agi,
        Math.round(
          Number(result.pending.f1040.line12e_itemized_deductions) * 100,
        ) / 100,
        Math.round(Number(result.pending.f1040.line15_taxable_income) * 100) /
        100,
        result.pending.f1040.line16_income_tax,
      ],
      kind === "small_oil"
        ? [100000, 27600, 72400, 10848]
        : kind === "active_soil_water_limited"
        ? [141821, 52400, 81057, 12751]
        : kind === "active_idc_oil"
        ? [127881, 62364.3, 59940.7, 8098]
        : kind === "active_soil_water"
        ? [144608, 54800, 80886, 12707]
        : kind === "active_oil"
        ? [137174, 65152.2, 64586.8, 9121]
        : [100000, 54000, 46000, 5285],
    );
    assertEquals(
      Math.round(
        Number(result.carryforwards.charitable_capital_gain_30_2025) * 100,
      ) / 100,
      Math.round(
        (kind === "small_oil" || kind.startsWith("active_soil_water")
          ? 0
          : want[4] - (kind === "active_idc_oil"
            ? 38364.3
            : kind === "active_oil"
            ? 41152.2
            : 30000)) * 100,
      ) / 100,
    );
    assertEquals(result.pending.form4797, undefined);
    if (kind === "active_soil_water_limited") {
      assertEquals(
        result
          .carryforwards[
            "schedule_f_section175_conservation_OWNED-active_soil_water_limited_2025"
          ],
        5000,
      );
    }
    const pending = buildPending(result.pending),
      bundle = await buildMefBundle(pending, {
        filer: source.filer,
        attachments: source.attachments,
      });
    assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 1);
    assertEquals(bundle.xml.includes("IRS4797"), false);
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        "/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      source.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
    if (kind.startsWith("active_")) {
      const farm = kind.startsWith("active_soil_water");
      const business = (p: any) =>
        farm ? p.schedule_f.schedule_fs[0] : p.schedule_c.schedule_cs[0];
      for (
        const [label, mutate] of [
          ["detached-business", (p: any) => {
            delete p[farm ? "schedule_f" : "schedule_c"];
          }],
          [
            "wrong-business-owner",
            (p: any) => business(p).proprietor_recipient = "S",
          ],
          ["changed-owned-receipts", (p: any) =>
            business(
              p,
            )[farm ? "line2_sales_products_raised" : "line_1_gross_receipts"] =
              59000],
          [
            "changed-filed-deduction",
            (p: any) =>
              business(p)[farm ? "line12_conservation" : "line_12_depletion"] =
                0,
          ],
          [
            "detached-account",
            (p: any) =>
              delete business(p).donated_natural_resource_property_source,
          ],
          ["changed-half-SE", (p: any) => p.schedule1.line15_se_deduction = 0],
          ["changed-owned-SE-wages", (p: any) => p.schedule_se.w2_ss_wages = 0],
          ["changed-QBI-cap", (p: any) => p.form8995.line11 += 1],
          [
            "changed-AGI-source",
            (p: any) =>
              p.agi_aggregator[farm ? "line6_schedule_f" : "line3_schedule_c"] =
                59000,
          ],
          ["changed-final-tax", (p: any) => p.f1040.line16_income_tax += 1],
        ] as const
      ) {
        const changed = structuredClone(pending);
        mutate(changed);
        await assertRejects(
          () =>
            buildMefBundle(changed, {
              filer: source.filer,
              attachments: source.attachments,
            }),
          Error,
          undefined,
          label,
        );
        await assertRejects(
          () => buildPdfBytes(changed, source.filer, ".pdf-cache", bundle),
          Error,
          undefined,
          label,
        );
      }
      for (
        const [index, key, value] of [[0, "donor_ssn", "444556666"], [
          1,
          "annual_records.4.depletion_claimed",
          "1",
        ], [2, "current_year_paid_receipts.1.amount", "59000"]] as const
      ) {
        const changed = structuredClone(pending),
          attachments = source.attachments.map((a) => ({ ...a }));
        const doc = await PDFDocument.load(attachments[index].bytes);
        doc.getForm().getTextField(key).setText(value);
        attachments[index].bytes = await doc.save();
        const digest = await dispositionDigest(attachments[index].bytes);
        const special: any = changed.f8283!.section_b_items![0]
          .special_fmv_reduction!;
        special.source_documents[index].pdf_sha256 = digest;
        special.source.retained_source_documents[index].pdf_sha256 = digest;
        business(changed).donated_natural_resource_property_source
          .retained_source_documents[index].pdf_sha256 = digest;
        const rows: any = farm
          ? changed.form8995!.schedule_f_qbi_businesses
          : changed.form8995!.schedule_c_qbi_businesses;
        rows[0][farm ? "source_schedule_f" : "source_schedule_c"]
          .donated_natural_resource_property_source
          .retained_source_documents[index].pdf_sha256 = digest;
        await assertRejects(
          () => buildMefBundle(changed, { filer: source.filer, attachments }),
          Error,
          "natural-resource source field differs",
        );
        const forgedSourceHash = await preparedSourceSha256(
          changed,
          source.filer,
        );
        await assertRejects(
          () =>
            buildPdfBytes(changed, source.filer, ".pdf-cache", {
              ...bundle,
              pending: changed,
              sourceSha256: forgedSourceHash,
              attachments: bundle.attachments.map((a) => ({
                ...a,
                ...attachments.find((r) => r.fileName === a.fileName),
              })),
              attachmentSha256ByFileName: {
                ...bundle.attachmentSha256ByFileName,
                [attachments[index].fileName]: digest,
              },
            }),
          Error,
          "natural-resource source field differs",
        );
      }
    }
    const root = Deno.env.get("FORM8283_EVIDENCE_DIR");
    if (root) {
      const dir = `${root}/${kind}`;
      await Deno.mkdir(`${dir}/attachments`, { recursive: true });
      for (
        const [name, value] of Object.entries({
          source: { inputs: source.inputs, filer: source.filer },
          pending,
          carryforwards: result.carryforwards,
          origins,
          calculation: source.calc,
          attachments: source.attachments.map(({ bytes, ...row }) => row),
        })
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      for (const attachment of source.attachments) {
        await Deno.writeFile(
          `${dir}/attachments/${attachment.fileName}`,
          attachment.bytes,
        );
      }
    }
  });
}
Deno.test("Natural-resource original owned annual-account calculation conflicts", () => {
  for (const kind of Object.keys(expected) as ResourceCase[]) {
    const source = naturalResourceSource(kind);
    const changed = structuredClone(source);
    changed.annual_records.pop();
    assertThrows(() => calculateCharitableNaturalResource(changed));
    const duplicate = structuredClone(source);
    duplicate.annual_records[1].tax_year = duplicate.annual_records[0].tax_year;
    assertThrows(() => calculateCharitableNaturalResource(duplicate));
    const costs = structuredClone(source);
    const paid = costs.annual_records.find((r: any) => r.expenses.length > 0);
    if (!paid) {
      costs.annual_records.at(-1).depletion_claimed += 1;
      assertThrows(() => calculateCharitableNaturalResource(costs));
      continue;
    }
    paid.expenses[0].amount += 1;
    assertThrows(() => calculateCharitableNaturalResource(costs));
    const wrongClass = structuredClone(source);
    wrongClass.annual_records.find((r: any) => r.expenses.length > 0)
      .expenses[0].nature = "soil_water_175" === paid.expenses[0].nature
        ? "exploration_617"
        : "soil_water_175";
    assertThrows(() => calculateCharitableNaturalResource(wrongClass));
  }
});

Deno.test("Owned175 recapture holding anniversaries and gain-limited ordinary amount", () => {
  for (
    const [acquired, donated, percentage] of [
      ["2020-01-15", "2025-01-15", 1],
      ["2020-01-15", "2025-01-16", .8],
      ["2019-01-15", "2025-01-15", .8],
      ["2019-01-15", "2025-01-16", .6],
      ["2018-01-15", "2025-01-15", .6],
      ["2018-01-15", "2025-01-16", .4],
      ["2017-01-15", "2025-01-15", .4],
      ["2017-01-15", "2025-01-16", .2],
      ["2016-01-15", "2025-01-15", .2],
      ["2016-01-15", "2025-01-16", 0],
      ["2015-01-15", "2025-01-15", 0],
    ] as const
  ) {
    const source = naturalResourceSource("soil_water");
    const first = structuredClone(source.annual_records[0]);
    const prefix = Array.from(
      { length: 2020 - Number(acquired.slice(0, 4)) },
      (_, n) => ({ ...first, tax_year: Number(acquired.slice(0, 4)) + n }),
    );
    source.annual_records = [...prefix, ...source.annual_records];
    source.date_acquired = acquired;
    source.placed_in_service = acquired;
    source.date_contributed = donated;
    const calc = calculateCharitableNaturalResource(source);
    assertEquals(
      Math.round(calc.applicable_percentage * 100),
      percentage * 100,
    );
    assertEquals(calc.ordinary_gain, 12000 * percentage);
    source.appraised_fmv = 21000;
    assertEquals(
      calculateCharitableNaturalResource(source).ordinary_gain,
      Math.min(1000, 12000 * percentage),
    );
  }
});

Deno.test("Owned1252/legacy617/current1254 real-estate inventory preserves current return and independent signed copies", async () => {
  const sources = await Promise.all([
    reviewedNaturalResourceGift("active_idc_oil"),
    reviewedNaturalResourceGift("soil_water"),
    reviewedNaturalResourceGift("legacy_exploration"),
  ]);
  const items = sources.flatMap((source) =>
    source.inputs.f8283.section_b_items!
  ).map((row) => ({
    ...row,
    similar_item_group: "Owned real estate interests",
  }));
  const inputs = {
    ...sources[0].inputs,
    general: { ...sources[0].inputs.general, taxpayer_dob: "1965-06-15" },
    f8283: giftSchema.parse({ section_b_items: items }),
  };
  const attachments = sources.flatMap((source) => source.attachments).map(
      (row) => ({ ...row, description: `${row.description}: ${row.fileName}` }),
    ),
    filer = sources[0].filer;
  assertEquals(
    items.map(
      (row) => [row.fmv, row.cost_or_adjusted_basis, row.deduction_claimed],
    ),
    [[300000, 140000, 230000], [50000, 20000, 40400], [50000, 20000, 40000]],
  );
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line11_agi, 127881);
  assertEquals(
    Math.round(
      Number(result.pending.schedule_a.line_12_noncash_contributions) * 100,
    ) / 100,
    38364.3,
  );
  assertEquals(
    Math.round(
      Number(result.carryforwards.charitable_capital_gain_30_2025) * 100,
    ) / 100,
    272035.7,
  );
  assertEquals(result.pending.f1040.line16_income_tax, 8098);
  const pending = buildPending(result.pending),
    bundle = await buildMefBundle(pending, { filer, attachments });
  assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 3);
  const child = new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      "/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      "-",
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(bundle.xml));
  await writer.close();
  const checked = await child.output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(
    new Set(
      origins.filter((row) => row.formKey === "f8283").map((row) =>
        row.formCopy
      ),
    ).size,
    3,
  );
  for (
    const [label, mutate] of [
      ["duplicate-owned-property", (p: any) =>
        p.f8283.section_b_items.push(
          structuredClone(p.f8283.section_b_items[1]),
        )],
      [
        "crossjoined-mining-ledger",
        (p: any) =>
          p.f8283.section_b_items[2].special_fmv_reduction.source =
            structuredClone(
              p.f8283.section_b_items[1].special_fmv_reduction.source,
            ),
      ],
      [
        "crossjoined-active-business",
        (p: any) =>
          p.schedule_c.schedule_cs[0].donated_natural_resource_property_source =
            structuredClone(
              p.f8283.section_b_items[1].special_fmv_reduction.source,
            ),
      ],
      [
        "changed-aggregate-claim",
        (p: any) => p.schedule_a.line_12_noncash_contributions += 1,
      ],
    ] as const
  ) {
    const changed = structuredClone(pending);
    mutate(changed);
    await assertRejects(
      () => buildMefBundle(changed, { filer, attachments }),
      Error,
      undefined,
      label,
    );
    await assertRejects(
      () => buildPdfBytes(changed, filer, ".pdf-cache", bundle),
      Error,
      undefined,
      label,
    );
  }
  const root = Deno.env.get("FORM8283_EVIDENCE_DIR");
  if (root) {
    const dir = `${root}/mixed`;
    await Deno.mkdir(`${dir}/attachments`, { recursive: true });
    for (
      const [name, value] of Object.entries({
        source: { inputs, filer },
        pending,
        carryforwards: result.carryforwards,
        origins,
        attachments: attachments.map(({ bytes, ...row }) => row),
      })
    ) {
      await Deno.writeTextFile(
        `${dir}/${name}.json`,
        JSON.stringify(value, null, 2),
      );
    }
    await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
    await Deno.writeFile(`${dir}/return.pdf`, pdf);
    for (const row of attachments) {
      await Deno.writeFile(`${dir}/attachments/${row.fileName}`, row.bytes);
    }
  }
});
