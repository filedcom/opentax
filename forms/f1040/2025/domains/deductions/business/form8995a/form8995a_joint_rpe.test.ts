import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  calculateTwoBusinessAggregationLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import {
  jointRpeCases,
  jointRpeFixture,
} from "./form8995a_joint_rpe_fixture.ts";
type Row = Record<string, any>;
for (const c of jointRpeCases) {
  test(`issued RPE ${c.name}: actual owner, phased limit, intact copies and final tax`, async () => {
    const input = await jointRpeFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending: Row = JSON.parse(JSON.stringify(result.pending));
    const filer = extractFilerIdentity(pending.f1040)!;
    const f = pending.f1040;
    const gross = c.count === 4 ? 350000 : 240000;
    const preQbi = gross + c.wages - 31500;
    const taxable = preQbi - c.deduction;
    // Official 2025 MFJ tax-computation worksheet, 24% and 32% bands.
    const tax = Math.round(
      taxable <= 394600 ? taxable * .24 - 14306 : taxable * .32 - 45874,
    );
    // Employer-specific Social Security cap and Medicare withholding remain intact.
    const excessSs = Math.max(
      0,
      Math.round(
        input.w2.reduce((s: number, w: Row) => s + w.box4_ss_withheld, 0) -
          10918.2,
      ),
    );
    const excessMed = c.wages > 210000
      ? Math.round((c.wages - 210000) * .009)
      : 0;
    const payments = 10000 + excessSs + excessMed;
    assertEquals([
      f.line8_additional_income,
      f.line11_agi,
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line33_total_payments,
      f.line37_amount_owed,
    ], [
      gross,
      gross + c.wages,
      c.deduction,
      taxable,
      tax,
      tax,
      payments,
      tax - payments,
    ]);
    const fields = inputSchema.parse(pending.form8995a);
    const lines = calculateTwoBusinessAggregationLines(fields);
    const phase = c.count === 4 && c.wages === 100000;
    assertEquals(lines.parent.phaseInRequired, phase);
    assertEquals(lines.parent.line39, c.deduction);
    assertEquals(lines.schedule.rows.length, c.count);
    if (phase) {
      assertEquals([
        lines.parent.phaseIn,
        lines.parent.line25,
        lines.parent.line26,
      ], [.239, 896, 69104]);
    }
    assertThrows(() =>
      calculateTwoBusinessAggregationLines({
        ...fields,
        taxable_income: 394600,
      })
    );
    if (c.count === 4) {
      for (const excess of [1, 99999, 100000, 100001]) {
        const p = calculateTwoBusinessAggregationLines({
          ...fields,
          taxable_income: 394600 + excess,
        }).parent;
        assertEquals(
          p.line39,
          excess <= 100000 ? 70000 - Math.round(3750 * excess / 100000) : 66250,
        );
      }
    }
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    assertEquals(prepared.bundle.attachments.length, 2);
    const issued =
      input.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf;
    assertEquals(prepared.bundle.attachments[1].fileName, issued.file_name);
    assertEquals(
      prepared.bundle.attachments[1].bytes,
      Uint8Array.from(atob(issued.pdf_base64), (c) => c.charCodeAt(0)),
    );
    const xml = prepared.bundle.xml;
    assertEquals(xml.includes("<PhaseInPct>0.23900</PhaseInPct>"), phase);
    assertEquals(
      xml.includes("<TotalPhaseInReductionAmt>896</TotalPhaseInReductionAmt>"),
      phase,
    );
    assertEquals(
      (xml.match(/<BusinessAggregationInfoGrp>/g) ?? []).length,
      c.count,
    );
    const root = process.env.JOINT_RPE_EVIDENCE;
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
      await fs.writeFile(
        `${dir}/annual.pdf`,
        prepared.bundle.attachments[0].bytes,
      );
      await fs.writeFile(
        `${dir}/issued.pdf`,
        prepared.bundle.attachments[1].bytes,
      );
      const xsd = await new sys.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
          "owner",
          "ambiguous-owner",
          "income",
          "deduction",
          "wages",
          "members",
          "issued-digest",
        ]
      ) {
        const changed: Row = structuredClone(prepared.bundle.pending);
        const identity = {
          ...structuredClone(filer),
          spouse: { ...filer.spouse! },
        };
        if (kind === "owner") {
          identity.primarySSN = "555667777";
          identity.spouse!.ssn = "666778888";
        }
        if (kind === "ambiguous-owner") {
          identity.spouse!.ssn = identity.primarySSN;
        }
        if (kind === "income") changed.schedule1.line5_schedule_e++;
        if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
        if (kind === "wages") changed.k1_s_corp.k1_s_corps[0].w2_wages++;
        if (kind === "members") {
          for (const key of ["form8995a", "form8995a_schedule_b"]) {
            changed[key].rpe_aggregation_source.members.pop();
          }
        }
        if (kind === "issued-digest") {
          changed.k1_s_corp.k1_s_corps[0].rpe_aggregation_source
            .issued_statement_pdf.pdf_sha256 = "0".repeat(64);
        }
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, identity),
          Error,
          "",
          kind,
        );
        await assertRejects(
          () => buildPdfBytes(changed, identity, ".pdf-cache"),
          Error,
          "",
          kind,
        );
      }
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
    for (const kind of ["missing-spouse", "foreign-owner", "duplicate-owner"]) {
      const changed = structuredClone(input);
      if (kind === "missing-spouse") delete changed.general.spouse_ssn;
      if (kind === "foreign-owner") {
        changed.general.taxpayer_ssn = "555-66-7777";
        changed.general.spouse_ssn = "666-77-8888";
      }
      if (kind === "duplicate-owner") {
        changed.general.spouse_ssn = changed.general.taxpayer_ssn;
      }
      let rejected = false;
      try {
        rejected = f1040_2025.executeReturn(changed).diagnostics.some((d) =>
          d.severity === "error"
        );
      } catch {
        rejected = true;
      }
      assert(rejected, kind);
    }
  });
}
