import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { projectStagedAggregatedParentPdf } from "../../../../pdf/forms/deductions/business/f8995a.ts";
import {
  calculateTwoBusinessAggregationLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import {
  aggregationPhaseInCases,
  aggregationPhaseInFixture,
} from "./form8995a_aggregation_phasein_fixture.ts";
type Row = Record<string, any>;

for (const c of aggregationPhaseInCases) {
  test(`aggregation phase-in ${c.name}: filed limits, owner sources, XML and PDF`, async () => {
    const { input, filer } = aggregationPhaseInFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending: Row = JSON.parse(JSON.stringify(result.pending));
    const f = pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      f.line24_total_tax,
      f.line33_total_payments,
    ], [c.qbi, c.tax, c.payments]);
    assertEquals(
      c.joint ? f.line37_amount_owed : f.line35a_refund,
      Math.abs(c.tax - c.payments),
    );
    const fields = inputSchema.parse(pending.form8995a);
    const { parent } = calculateTwoBusinessAggregationLines(fields);
    assertEquals([
      parent.line33,
      parent.phaseIn,
      parent.line25,
      parent.line26,
      parent.line12,
    ], [c.preQbi, c.ratio, c.reduction, c.qbi, c.qbi]);
    const threshold = c.joint ? 394600 : 197300,
      range = c.joint ? 100000 : 50000;
    assertThrows(() =>
      calculateTwoBusinessAggregationLines({
        ...fields,
        taxable_income: threshold,
      })
    );
    for (const excess of [1, range - 1, range, range + 1]) {
      const { parent: p } = calculateTwoBusinessAggregationLines({
        ...fields,
        taxable_income: threshold + excess,
      });
      const phased = excess <= range;
      const expected = phased
        ? p.line3 - Math.round((p.line3 - p.line10) * excess / range)
        : p.line11;
      assertEquals(p.phaseInRequired, phased);
      assertEquals(p.line39, expected);
    }
    const projection = projectStagedAggregatedParentPdf(fields, filer, pending);
    assertEquals([
      projection.line17,
      projection.line18,
      projection.line20,
      projection.line21,
      projection.line22,
      projection.line23,
      projection.line25,
      projection.line26,
    ], [
      parent.line3,
      parent.line10,
      c.preQbi,
      threshold,
      c.preQbi - threshold,
      range,
      c.reduction,
      c.qbi,
    ]);
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    const xml = prepared.bundle.xml;
    for (
      const [tag, value] of Object.entries({
        FilingStatusThresholdCd: threshold,
        TXIBfrQBIDedLessThresholdAmt: c.preQbi - threshold,
        FilingStatusPhaseInRangeCd: range,
        PhaseInPct: c.ratio.toFixed(5),
        TotalPhaseInReductionAmt: c.reduction,
        QBIAfterPhaseInReductionAmt: c.qbi,
      })
    ) assert(xml.includes(`<${tag}>${value}</${tag}>`), tag);
    const root = process.env.AGGREGATION_PHASEIN_EVIDENCE;
    const dir = root ? `${root}/${c.name}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(
        `${dir}/source.json`,
        JSON.stringify(
          { input, filer, pending: prepared.bundle.pending },
          null,
          2,
        ),
      );
      await fs.writeFile(`${dir}/return.xml`, xml);
      await fs.writeFile(
        `${dir}/annual-disclosure.pdf`,
        prepared.bundle.attachments[0].bytes,
      );
      const origins: Parameters<typeof buildPdfBytes>[4] = [];
      await fs.writeFile(
        `${dir}/return.pdf`,
        await buildPdfBytes(
          prepared.bundle.pending,
          filer,
          ".pdf-cache",
          prepared.bundle,
          origins,
        ),
      );
      await fs.writeFile(
        `${dir}/origins.json`,
        JSON.stringify(origins, null, 2),
      );
      const xsd = await new sys.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
            import.meta.url,
          ).pathname,
          `${dir}/return.xml`,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      await fs.writeFile(`${dir}/xsd.log`, xsd.stderr);
      assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
      for (
        const kind of [
          "phase-income",
          "deduction",
          "business-income",
          "property-source",
          "half-se",
          "annual-event",
        ]
      ) {
        const changed: Row = structuredClone(prepared.bundle.pending);
        if (kind === "phase-income") {
          changed.form8995a.taxable_income++;
          changed.form8995a_schedule_b.taxable_income++;
        }
        if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
        if (kind === "business-income") {
          changed.schedule_c.schedule_cs[0].line_1_gross_receipts++;
        }
        if (kind === "property-source") {
          changed.schedule_c.schedule_cs[0].qbi_unadjusted_basis++;
        }
        if (kind === "half-se") changed.schedule1.line15_se_deduction++;
        if (kind === "annual-event") {
          for (const key of ["form8995a", "form8995a_schedule_b"]) {
            changed[key].aggregation_filing_details.annual_disclosure
              .businesses[1].events = [];
          }
        }
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
          "",
          kind,
        );
        await assertRejects(
          () => buildPdfBytes(changed, filer, ".pdf-cache"),
          Error,
          "",
          kind,
        );
      }
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
  });
}

test("aggregation skips Part III when sourced property makes the wage/property limit nonbinding", async () => {
  for (const c of aggregationPhaseInCases) {
    const { input, filer } = aggregationPhaseInFixture(c);
    for (let i = 0; i < c.count; i++) {
      input.schedule_c[i].qbi_unadjusted_basis = 10000000;
      const member =
        input.qbi_aggregation.aggregation_filing_details.members[i];
      member.ubia = 10000000;
      member.source_schedule_c.qbi_unadjusted_basis = 10000000;
    }
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = result.pending as Row;
    const fields = inputSchema.parse(pending.form8995a);
    const { parent } = calculateTwoBusinessAggregationLines(fields);
    assertEquals(parent.phaseInRequired, false);
    assertEquals(parent.line39, parent.line3);
    const projection = projectStagedAggregatedParentPdf(fields, filer, pending);
    for (let line = 17; line <= 26; line++) {
      assertEquals(projection[`line${line}`], undefined);
    }
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    assertEquals(prepared.bundle.xml.includes("<PhaseInPct>"), false);
    assertEquals(
      prepared.bundle.xml.includes("<TotalPhaseInReductionAmt>"),
      false,
    );
  }
});
