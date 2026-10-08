import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { preparedSourceSha256 } from "../../../domains/execution/prepared-source.ts";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../builder.ts";
import { inputSchema } from "../../../../nodes/inputs/f8283/index.ts";
import {
  dispositionDigest,
  reviewedContributionYearDisposition,
} from "./form8283-contribution-year-disposition.fixture.ts";
import { reviewedSpecialSectionBInventory } from "./form8283-special-section-b.fixture.ts";

for (
  const [count, small, joint, mixed] of [
    [1, false, false, false],
    [3, true, false, false],
    [3, false, true, false],
    [1, false, false, true],
  ] as const
) {
  Deno.test(`2025 donee disposition ${count} small${small} joint${joint} mixed${mixed}`, async () => {
    const source = await reviewedContributionYearDisposition(
      count,
      small,
      joint,
    );
    const existing = mixed
      ? await reviewedSpecialSectionBInventory()
      : undefined;
    const inputs = {
      ...source.inputs,
      f8283: inputSchema.parse({
        section_b_items: [...source.items, ...(existing?.items ?? [])],
      }),
    };
    const attachments = [
      ...source.attachments,
      ...(existing?.attachments ?? []),
    ];
    const result = execute(buildExecutionPlan(registry), registry, inputs, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    const claim = (small ? 2100 : 6100) * count +
      100 * count * (count - 1) / 2 + (mixed ? 24000 : 0);
    // Independent IRS TaxTable $50-row midpoints: single69925/69425/45925;
    // joint57425. Brackets: single1192.5+4386+22% excess over48475,
    // or1192.5+12% excess over11925; joint2385+12% excess over23850.
    const expectedTax = mixed ? 5273 : joint ? 6414 : small ? 10188 : 10298;
    assertEquals(result.pending.f1040.line16_income_tax, expectedTax);
    assertEquals(result.pending.f1040.line11_agi, 100000);
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      claim,
    );
    assertEquals(
      result.pending.f1040.line12e_itemized_deductions,
      claim + 24000,
    );
    assertEquals(
      result.pending.f1040.line15_taxable_income,
      100000 - claim - 24000,
    );
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: source.filer,
      attachments,
    });
    assertEquals(
      (bundle.xml.match(/<IRS8283\b/g) ?? []).length,
      count + (mixed ? 4 : 0),
    );
    assertEquals(
      bundle.attachments.length,
      8 * count + (mixed ? existing!.attachments.length : 0),
    );
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
      const dir =
        `${root}/disposition-${count}-small${small}-joint${joint}-mixed${mixed}`;
      await Deno.mkdir(`${dir}/attachments`, { recursive: true });
      for (
        const [name, data] of Object.entries({
          source: { inputs, filer: source.filer },
          pending,
          origins,
          attachments: attachments.map(({ bytes, ...a }) => a),
        })
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(data, null, 2),
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      for (const attachment of attachments) {
        await Deno.writeFile(
          `${dir}/attachments/${attachment.fileName}`,
          attachment.bytes,
        );
      }
    }
    if (count === 1 && !mixed) {
      for (
        const [label, mutate] of [
          [
            "next-year",
            (s: any) =>
              s.special_fmv_reduction.source.disposition_date = "2026-08-15",
          ],
          [
            "before-gift",
            (s: any) =>
              s.special_fmv_reduction.source.disposition_date = "2025-05-15",
          ],
          [
            "wrong-owner",
            (s: any) =>
              s.special_fmv_reduction.source.original_donor_ssn = "444556666",
          ],
          [
            "wrong-donee",
            (s: any) => s.special_fmv_reduction.source.donee_ein = "123456789",
          ],
          ["certification-present", (s: any) =>
            s.special_fmv_reduction.source
              .no_signed_substantial_related_use_certification = false],
          ["short-holding", (s: any) => s.date_acquired = "2025-01-15"],
          [
            "claim-sale-proceeds",
            (s: any) =>
              s.deduction_claimed =
                s.special_fmv_reduction.source.gross_proceeds,
          ],
          [
            "original-use-rewritten",
            (s: any) => s.donee_acknowledgment.unrelated_use = true,
          ],
          [
            "missing-certification-inventory",
            (s: any) => s.special_fmv_reduction.source_documents.pop(),
          ],
        ] as const
      ) {
        const changed = structuredClone(inputs.f8283);
        mutate(changed.section_b_items![0]);
        assertThrows(
          () => inputSchema.parse(changed),
          Error,
          undefined,
          label,
        );
      }
      for (
        const [label, key, value] of [
          [
            "rehashed-donee",
            "topmostSubform[0].Page1[0].f1_1[0]",
            "Different Charity",
          ],
          ["rehashed-owner", "topmostSubform[0].Page1[0].f1_7[0]", "444556666"],
          [
            "rehashed-proceeds",
            "topmostSubform[0].Page2[0].Pg2Table2[0].Row8[0].f2_61[0]",
            "6100",
          ],
          [
            "rehashed-certification",
            "topmostSubform[0].Page2[0].f2_65[0]",
            "Director",
          ],
        ] as const
      ) {
        const changed = structuredClone(pending),
          altered = attachments.map((a) => ({ ...a }));
        const doc = await PDFDocument.load(altered[1].bytes);
        doc.getForm().getTextField(key).setText(value);
        altered[1].bytes = await doc.save();
        const special = changed.f8283!.section_b_items![0]
          .special_fmv_reduction!;
        special.source_documents[1].pdf_sha256 = await dispositionDigest(
          altered[1].bytes,
        );
        if (special.reason === "contribution_year_disposition") {
          special.source.retained_source_documents[1].pdf_sha256 =
            special.source_documents[1].pdf_sha256;
        }
        await assertRejects(
          () =>
            buildMefBundle(changed, {
              filer: source.filer,
              attachments: altered,
            }),
          Error,
          "Donee Form8282",
          label,
        );
        // Rebind both retained digest inventories so the actual field guard,
        // not a stale source/attachment hash, rejects this coherent rewrite.
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
              attachmentSha256ByFileName: {
                ...bundle.attachmentSha256ByFileName,
                [altered[1].fileName]: special.source_documents[1].pdf_sha256,
              },
              attachments: bundle.attachments.map((a) =>
                a.fileName === altered[1].fileName
                  ? { ...a, bytes: altered[1].bytes }
                  : a
              ),
            }),
          Error,
          "Donee Form8282",
          label,
        );
      }
    }
  });
}

Deno.test("donee disposition basis claim below5000 uses SectionA with actual retained source", async () => {
  const source = await reviewedContributionYearDisposition(
    1,
    true,
    false,
    true,
  );
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    source.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 2100);
  assertEquals(result.pending.f1040.line15_taxable_income, 73900);
  assertEquals(result.pending.f1040.line16_income_tax, 11178);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: source.filer,
    attachments: source.attachments,
  });
  assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 1);
  assertEquals(
    (bundle.xml.match(/<FairMarketValueStatement\b/g) ?? []).length,
    1,
  );
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
    const dir = `${root}/disposition-sectionA`;
    await Deno.mkdir(`${dir}/attachments`, { recursive: true });
    for (
      const [name, data] of Object.entries({
        source: { inputs: source.inputs, filer: source.filer },
        pending,
        origins,
        attachments: source.attachments.map(({ bytes, ...a }) => a),
      })
    ) {
      await Deno.writeTextFile(
        `${dir}/${name}.json`,
        JSON.stringify(data, null, 2),
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
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: source.filer,
        attachments: source.attachments.slice(0, 2),
      }),
    Error,
    "Reviewed disposition source record is absent",
  );
  const changed = structuredClone(pending);
  changed.f8283!.section_a_items![0].contribution_year_disposition_reduction!
    .original_donor_ssn = "444556666";
  await assertRejects(() =>
    buildMefBundle(changed, {
      filer: source.filer,
      attachments: source.attachments,
    })
  );
  await assertRejects(() =>
    buildPdfBytes(changed, source.filer, ".pdf-cache", bundle)
  );
});

Deno.test("disposition reviewed source cannot export a standalone PDF without retained bytes", async () => {
  const source = await reviewedContributionYearDisposition(
    1,
    true,
    false,
    true,
  );
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    source.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  await assertRejects(
    () => buildPdfBytes(buildPending(result.pending), source.filer),
    Error,
    "retained field evidence",
  );
});
