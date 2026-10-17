import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  sstbStatusCases,
  sstbStatusFixture,
} from "./form8995a_sstb_status_fixture.ts";
type Row = Record<string, any>;
// Independently calculated whole-dollar Schedule A, phase reduction and final tax.
const expected: Record<string, number[]> = {
  "hoh-payroll": [3552, 210873, 42803, 43890, 6110],
  "hoh-owner-only": [2426, 211999, 43164, 44251, 5749],
  "qss-payroll": [4480, 202070, 34283, 35370, 14630],
  "qss-owner-only": [3726, 202824, 34449, 35536, 14464],
};
for (const c of sstbStatusCases) {
  test(`SSTB ${c.name}: household source, Schedule A and complete return`, async () => {
    const input = sstbStatusFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line35a_refund,
    ], expected[c.name]);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const p: Row = prepared.bundle.pending;
    const root = process.env.SSTB_STATUS_EVIDENCE;
    const dir = root ? `${root}/${c.name}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(
        `${dir}/source.json`,
        JSON.stringify({ input, filer, pending: p }, null, 2),
      );
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
      await fs.writeFile(
        `${dir}/return.pdf`,
        await buildPdfBytes(p, filer, ".pdf-cache", prepared.bundle),
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
          "source-profit",
          "payroll",
          "classification",
          "source-review",
          "status",
          "se-wages",
          "se-deduction",
          "qbi",
          "taxable",
          "header-status",
          "header-owner",
        ]
      ) {
        const changed: Row = structuredClone(p);
        const identity = { ...structuredClone(filer) };
        const source = changed.schedule_c.schedule_cs[0];
        if (kind === "owner") {
          source.qbi_sstb_filing_review.owner_ssn = "999887777";
        }
        if (kind === "source-profit") source.line_1_gross_receipts++;
        if (kind === "payroll") source.qbi_w2_wages++;
        if (kind === "classification") source.line_b_business_code = "541330";
        if (kind === "source-review") {
          source.qbi_sstb_filing_review.reviewed_on = "2026-02-31";
        }
        // Mirror source changes so equality alone is insufficient to reject.
        for (const key of ["form8995a", "form8995a_schedule_a"]) {
          changed[key].single_sstb_schedule_c_source.business
            .source_schedule_c = structuredClone(source);
          if (kind === "status") changed[key].filing_status = "single";
        }
        if (kind === "se-wages") changed.schedule_se.w2_ss_wages--;
        if (kind === "se-deduction") changed.schedule1.line15_se_deduction++;
        if (kind === "qbi") changed.f1040.line13_qbi_deduction++;
        if (kind === "taxable") changed.f1040.line15_taxable_income++;
        if (kind === "header-status") identity.filingStatus = 1;
        if (kind === "header-owner") identity.primarySSN = "999887777";
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
    for (const kind of ["owner", "payroll", "review", "household"]) {
      const invalid = structuredClone(input);
      const source = invalid.schedule_c[0];
      if (kind === "owner") {
        source.qbi_sstb_filing_review.owner_ssn = "999887777";
      }
      if (kind === "payroll") source.qbi_w2_wages++;
      if (kind === "review") {
        source.qbi_sstb_filing_review.reviewed_on = "2025-03-01";
      }
      if (kind === "household") {
        if (c.status === "qss") invalid.general.qss_spouse_death_year = 2020;
        else invalid.general.hoh_paid_more_than_half_home_costs = false;
      }
      let rejected = false;
      try {
        const result = f1040_2025.executeReturn(invalid);
        if (result.diagnostics.some((d) => d.severity === "error")) {
          rejected = true;
        } else {try {
            await f1040_2025.prepareReturn(
              result.pending,
              extractFilerIdentity(result.pending.f1040)!,
            );
          } catch {
            rejected = true;
          }}
      } catch {
        rejected = true;
      }
      assert(rejected, kind);
    }
  });
}
