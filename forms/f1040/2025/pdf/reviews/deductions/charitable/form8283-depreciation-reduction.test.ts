import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../registry.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";
import { inputSchema } from "../../../../../nodes/inputs/deductions/charitable/f8283/index.ts";
import { calculateCharitableDepreciation } from "../../../../../nodes/inputs/deductions/charitable/f8283/depreciation-source.ts";
import { dispositionDigest } from "./form8283-contribution-year-disposition.fixture.ts";
import {
  type DepreciationCase,
  depreciationSource,
  reviewedDepreciationGift,
} from "./form8283-depreciation-reduction.fixture.ts";

const expected = {
  ceased1245: {
    basis: 8000,
    ordinary: 7000,
    claim: 8000,
    dep: 0,
    agi: 100000,
    half: 0,
    qbi: 0,
    itemized: 32000,
    taxable: 68000,
    tax: 9880,
    se: 0,
  },
  recovered1245: {
    basis: 0,
    ordinary: 20000,
    claim: 10000,
    dep: 0,
    agi: 100000,
    half: 0,
    qbi: 0,
    itemized: 34000,
    taxable: 66000,
    tax: 9440,
    se: 0,
  },
  active1245: {
    basis: 8000,
    ordinary: 12000,
    claim: 18000,
    dep: 2000,
    agi: 139962,
    half: 3038,
    qbi: 7992,
    itemized: 42000,
    taxable: 89970,
    tax: 14709,
    se: 6076,
  },
  active1250: {
    basis: 38583.33,
    ordinary: 8000,
    claim: 79000,
    dep: 458,
    agi: 141395,
    half: 3147,
    qbi: 8279,
    itemized: 66418.5,
    taxable: 66697.5,
    tax: 9583,
    se: 6294,
  },
  active1245A: {
    basis: 800,
    ordinary: 1200,
    claim: 1800,
    dep: 200,
    agi: 141635,
    half: 3165,
    qbi: 8327,
    itemized: 25800,
    taxable: 107508,
    tax: 18649,
    se: 6330,
  },
};
for (const kind of Object.keys(expected) as DepreciationCase[]) {
  Deno.test(`2025 owned donated depreciation ${kind} source to full packet`, async () => {
    const source = await reviewedDepreciationGift(kind), want = expected[kind];
    assertEquals({
      basis: source.calc.adjusted_basis,
      ordinary: source.calc.ordinary_gain,
      claim: source.calc.deduction_claimed,
      dep: source.calc.current_year_depreciation,
    }, {
      basis: want.basis,
      ordinary: want.ordinary,
      claim: want.claim,
      dep: want.dep,
    });
    if (kind === "active1250") {
      //39yr allowable building:958.3333 +4*1000 +458.3333=5416.6667.
      //Prior/current filed deductions are958/1000/458; basis keeps allowable cents. QIP2022 bonus10000;
      //15yr hypotheticalSL HY:333+667+667+333=2000, additional8000.
      assertEquals(
        source.calc.rows.map((
          r,
        ) => [
          r.cumulative_depreciation,
          r.straight_line_comparison,
          r.ordinary_gain,
        ]),
        [[5416.67, 5416.67, 0], [0, 0, 0], [10000, 2000, 8000]],
      );
    }
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      source.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    const final = result.pending.f1040;
    assertEquals([
      final.line11_agi,
      final.line10_adjustments ?? 0,
      final.line13_qbi_deduction ?? 0,
      final.line12e_itemized_deductions,
      final.line15_taxable_income,
      final.line16_income_tax,
      final.line23_other_taxes ?? 0,
    ], [
      want.agi,
      want.half,
      want.qbi,
      want.itemized,
      want.taxable,
      want.tax,
      want.se,
    ]);
    // Independent $50 TaxTable midpoints68025/66025/89975/66675;
    // activeA above100k uses exact ordinary brackets, rounded18649.
    if (want.dep > 0) {
      assertEquals(result.pending.schedule1.line3_schedule_c, 45000 - want.dep);
      assertEquals(
        result.pending.form8995.line1_qbi,
        45000 - want.dep - want.half,
      );
      assertEquals(
        result.pending.form8995.line11,
        Math.round(want.agi - want.itemized),
      );
      assertEquals(source.inputs.schedule_c[0].line_13_depreciation, undefined);
    }
    assertEquals(result.pending.form4797, undefined);
    assertEquals(result.pending.form4562, undefined);
    if (kind === "active1250") {
      // Original79000 claim before AGI cap; current allowed42418.5,
      // current-year generated carryover36581.5, not a claimed prior carryover.
      assertEquals(
        result.pending.schedule_a.line_12_noncash_contributions,
        42418.5,
      );
      assertEquals(
        result.carryforwards.charitable_capital_gain_30_2025,
        36581.5,
      );
    }
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: source.filer,
      attachments: source.attachments,
    });
    assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 1);
    assertEquals(bundle.xml.includes("IRS4797"), false);
    assertEquals(bundle.xml.includes("IRS4562"), false);
    assertEquals(bundle.attachments.length, kind === "active1245A" ? 3 : 8);
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
    const root = Deno.env.get("FORM8283_EVIDENCE_DIR");
    if (root) {
      const dir = `${root}/${kind}`;
      await Deno.mkdir(`${dir}/attachments`, { recursive: true });
      for (
        const [name, value] of Object.entries({
          source: { inputs: source.inputs, filer: source.filer },
          pending,
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
    if (kind === "active1245") {
      for (
        const [label, mutate] of [
          [
            "changed-receipts",
            (p: any) => p.f1099nec.f1099necs[0].box1_nec = 49000,
          ],
          ["detached-income-source", (p: any) => delete p.f1099nec],
          [
            "wrong-income-owner",
            (p: any) => p.f1099nec.f1099necs[0].recipient_ssn = "444-55-6666",
          ],
          [
            "changed-current-depreciation",
            (p: any) => p.schedule_c.schedule_cs[0].line_13_depreciation = 0,
          ],
          ["changed-half-SE", (p: any) => p.schedule1.line15_se_deduction = 0],
          ["changed-SE-owned-wages", (p: any) => p.schedule_se.w2_ss_wages = 0],
          [
            "changed-AGI-source",
            (p: any) => p.agi_aggregator.line3_schedule_c = 42000,
          ],
          ["changed-QBI-income-limit", (p: any) => p.form8995.line11 = 124212],
          [
            "actual-sale-fabricated",
            (p: any) => p.form4797 = { line14_ordinary_gain: 12000 },
          ],
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
        const [index, key, value] of [
          [0, "donor_ssn", "444556666"],
          [0, "components.1.cost", "25000"],
          [1, "components.1.annual_records.4.depreciation_claimed", "0"],
          [2, "last_business_use_date", "2024-06-01"],
        ] as const
      ) {
        const changed = structuredClone(pending),
          attachments = source.attachments.map((a) => ({ ...a }));
        const doc = await PDFDocument.load(attachments[index].bytes);
        doc.getForm().getTextField(key).setText(value);
        attachments[index].bytes = await doc.save();
        const digest = await dispositionDigest(attachments[index].bytes);
        const special = changed.f8283!.section_b_items![0]
          .special_fmv_reduction!;
        if (special.reason !== "depreciation_ordinary_income") {
          throw new Error("Wrong test source");
        }
        special.source_documents[index].pdf_sha256 = digest;
        special.source.retained_source_documents[index].pdf_sha256 = digest;
        // Rebind all actual graph source hashes so the canonical field check,
        // rather than an obsolete attachment digest, must reject the rewrite.
        changed.schedule_c!.schedule_cs![0].donated_depreciable_property_source!
          .retained_source_documents[index].pdf_sha256 = digest;
        (changed.form8995!.schedule_c_qbi_businesses![0]
          .source_schedule_c as any).donated_depreciable_property_source
          .retained_source_documents[index].pdf_sha256 = digest;
        await assertRejects(
          () => buildMefBundle(changed, { filer: source.filer, attachments }),
          Error,
          "depreciation source field differs",
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
          "depreciation source field differs",
        );
      }
    }
    if (kind === "active1245A") {
      await assertRejects(
        () => buildPdfBytes(pending, source.filer, ".pdf-cache"),
        Error,
        "prepared return",
      );
    }
  });
}
Deno.test("2025 donated depreciation source method/owner/basis/ordinary conflicts", () => {
  for (
    const mutate of [
      (s: any) => s.components[0].annual_records[2].depreciation_claimed = 0,
      (s: any) =>
        s.components[0].annual_records.push(s.components[0].annual_records[0]),
      (s: any) => s.components[0].cost = 25000,
      (s: any) => s.last_business_use_date = "2026-01-01",
      (s: any) => s.components[0].no_section179_or_bonus = false,
      (s: any) => s.business_use_percent = 90,
    ]
  ) {
    const source = depreciationSource("active1245");
    mutate(source);
    assertThrows(() => calculateCharitableDepreciation(source));
  }
  const source = depreciationSource("active1250");
  source.components[2].underlying_building_placed_in_service = "2023-01-01";
  assertThrows(() => calculateCharitableDepreciation(source));
});

Deno.test("2025 active owned depreciation and four sourced reductions bind actual QBI income cap", async () => {
  const source = await reviewedDepreciationGift("active1245");
  const { reviewedSpecialSectionBInventory } = await import(
    "./form8283-special-section-b.fixture.ts"
  );
  const extra = await reviewedSpecialSectionBInventory();
  const inputs = structuredClone(source.inputs);
  Object.assign(inputs.w2[0], {
    box1_wages: 50000,
    box2_fed_withheld: 8000,
    box3_ss_wages: 50000,
    box4_ss_withheld: 3100,
    box5_medicare_wages: 50000,
    box6_medicare_withheld: 725,
  });
  inputs.f8283 = inputSchema.parse({
    section_b_items: [...source.items, ...extra.items],
  });
  const attachments = [...source.attachments, ...extra.attachments];
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  //Actual owned W250000+ScheduleC43000-halfSE3038=AGI89962.
  //Pre-AGI charity18000+4*6000=42000, no current AGI limit binds.
  //Itemized66000, pre-QBI income23962;20% cap4792.4 filed4792
  //is below business QBI39962*20%=7992.4. TaxTable midpoint19175.
  assertEquals(result.pending.f1040.line11_agi, 89962);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 42000);
  assertEquals(result.pending.form8995.line11, 23962);
  assertEquals(result.pending.form8995.line5, 7992);
  assertEquals(result.pending.form8995.line14, 4792);
  assertEquals(result.pending.f1040.line13_qbi_deduction, 4792);
  assertEquals(result.pending.f1040.line15_taxable_income, 19170);
  assertEquals(result.pending.f1040.line16_income_tax, 2063);
  assertEquals(result.pending.f1040.line24_total_tax, 8139);
  const pending = buildPending(result.pending),
    bundle = await buildMefBundle(pending, {
      filer: source.filer,
      attachments,
    });
  assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 5);
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
  const root = Deno.env.get("FORM8283_EVIDENCE_DIR");
  if (root) {
    const dir = `${root}/mixed-binding-QBI`;
    await Deno.mkdir(`${dir}/attachments`, { recursive: true });
    for (
      const [name, value] of Object.entries({
        source: { inputs, filer: source.filer },
        pending,
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
    for (const a of attachments) {
      await Deno.writeFile(`${dir}/attachments/${a.fileName}`, a.bytes);
    }
  }
  const detached = structuredClone(pending);
  delete detached.f8283;
  await assertRejects(
    () => buildMefBundle(detached, { filer: source.filer, attachments }),
    Error,
    "linked Form 8283 source",
  );
});
