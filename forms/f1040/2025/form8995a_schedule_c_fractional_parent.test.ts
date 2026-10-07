import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { form8995aPdf } from "./pdf/forms/f8995a.ts";
import { PDFDocument } from "pdf-lib";

const base = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-two-business-loss-netting"
)!;
const sourceRows = base.inputs.schedule_c as Record<string, unknown>[];
// Independent filed-line oracles: signed business rows first, then each
// percentage amount on the parent, followed by the lesser-of limitation.
const cases = [
  {
    id: "qbi-round-down",
    gain: 301.25,
    wages: 100,
    net: 201,
    line3: 40,
    line5: 50,
    line6: 25,
    deduction: 40,
  },
  {
    id: "qbi-round-up",
    gain: 303.25,
    wages: 100,
    net: 203,
    line3: 41,
    line5: 50,
    line6: 25,
    deduction: 41,
  },
  {
    id: "odd-wage-limit",
    gain: 399.25,
    wages: 101,
    net: 299,
    line3: 60,
    line5: 51,
    line6: 25,
    deduction: 51,
  },
  {
    id: "rounded-zero-deduction",
    gain: 101.25,
    wages: 100,
    net: 1,
    line3: 0,
    line5: 50,
    line6: 25,
    deduction: 0,
  },
];

Deno.test("fractional QBI percentage and wage products file rounded monetary lines through full returns", async () => {
  for (const c of cases) {
    const inputs = {
      ...base.inputs,
      schedule_c: [
        {
          ...sourceRows[0],
          line_1_gross_receipts: c.gain + c.wages,
          line_26_wages: c.wages,
          qbi_w2_wages: c.wages,
        },
        {
          ...sourceRows[1],
          part_v_other_expenses: [{
            description: "Shop operating costs",
            amount: 100.10,
          }],
        },
      ],
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], c.id);
    assertEquals(result.pending.f1040.line13_qbi_deduction, c.deduction, c.id);
    assertEquals(result.pending.schedule1.line3_schedule_c, c.gain - 100.10);
    const normalized = normalizeAllPending(result.pending);
    const fields = form8995aPdf.projectFields!(
      normalized.form8995a,
      normalized,
    );
    assertEquals(
      [fields.line2, fields.line3, fields.line5, fields.line6, fields.line39],
      [c.net, c.line3, c.line5, c.line6, c.deduction],
      c.id,
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    assertStringIncludes(prepared.bundle.xml, "<IRS8995AScheduleC");
    if (c.deduction > 0) {
      assertStringIncludes(
        prepared.bundle.xml,
        `<QualifiedBusinessIncomeDedAmt>${c.deduction}</QualifiedBusinessIncomeDedAmt>`,
      );
    }
    const xml = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(xml, prepared.bundle.xml);
      const validated = await new Deno.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
            import.meta.url,
          ).pathname,
          xml,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(
        validated.code,
        0,
        new TextDecoder().decode(validated.stderr),
      );
    } finally {
      await Deno.remove(xml);
    }
    const origins: Parameters<typeof buildPdfBytes>[4] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      base.filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), 12);
    for (
      const altered of [
        {
          ...prepared.bundle.pending,
          f1040: {
            ...prepared.bundle.pending.f1040,
            line13_qbi_deduction: c.deduction + 1,
          },
        },
        {
          ...prepared.bundle.pending,
          schedule_c: {
            ...prepared.bundle.pending.schedule_c,
            schedule_cs: [{
              ...prepared.bundle.pending.schedule_c!.schedule_cs![0],
              line_1_gross_receipts: c.gain + c.wages + 0.01,
            }, prepared.bundle.pending.schedule_c!.schedule_cs![1]],
          },
        },
      ]
    ) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer: base.filer, attachments: [] })
      );
      await assertRejects(() =>
        buildPdfBytes(altered, base.filer, ".pdf-cache")
      );
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = `/tmp/opentax-8995a-fractional-parent-final-oct6/${c.id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(`${dir}/origins.json`, JSON.stringify(origins));
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify({
          inputs,
          filer: base.filer,
          pending: normalized,
          carryforwards: result.carryforwards,
          expected: c,
        }),
      );
    }
  }
});
