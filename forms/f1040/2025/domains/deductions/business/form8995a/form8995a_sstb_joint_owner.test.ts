import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  sstbJointOwnerCases,
  sstbJointOwnerFixture,
} from "./form8995a_sstb_joint_owner_fixture.ts";
type Row = Record<string, any>;
// Independently calculated whole-dollar Schedule A, phase reduction and final tax.
const expected: Record<string, number[]> = {
  "primary-partial-payroll": [4165, 410757, 85568, 91351, 41351],
  "spouse-partial-owner-only": [3355, 411567, 85827, 91610, 41610],
  "primary-capped-owner-only": [3418, 413132, 86328, 88855, 38855],
  "spouse-capped-payroll": [4275, 412275, 86054, 88581, 38581],
};
for (const c of sstbJointOwnerCases) {
  test(`SSTB ${c.name}: joint owner sources, Schedule A and complete return`, async () => {
    const input = sstbJointOwnerFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line37_amount_owed,
    ], expected[c.name]);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const p: Row = prepared.bundle.pending;
    const root = process.env.SSTB_JOINT_OWNER_EVIDENCE;
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
          "header-spouse",
          "retained-owner",
          "owner-deduction",
        ]
      ) {
        const changed: Row = structuredClone(p);
        const identity = {
          ...structuredClone(filer),
          spouse: { ...filer.spouse! },
        };
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
        if (kind === "se-wages") {
          changed.schedule_se.owner_wage_sources[0].ss_wages_and_tips--;
        }
        if (kind === "retained-owner") {
          changed.schedule_se.owner_identity.spouse_ssn = "999887777";
        }
        if (kind === "owner-deduction") {
          changed.schedule_se.owner_instances[0].line13++;
        }
        if (kind === "header-spouse") identity.spouse.ssn = "999887777";
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
    const reversed = structuredClone(input);
    reversed.w2.reverse();
    const again = f1040_2025.executeReturn(reversed);
    assertEquals(again.diagnostics, []);
    assertEquals(again.pending.f1040.line24_total_tax, f.line24_total_tax);
    await f1040_2025.prepareReturn(again.pending, filer);
    for (
      const kind of ["owner", "payroll", "review", "wage-owner", "spouse-owner"]
    ) {
      const invalid = structuredClone(input);
      const source = invalid.schedule_c[0];
      if (kind === "owner") {
        source.qbi_sstb_filing_review.owner_ssn = "999887777";
      }
      if (kind === "payroll") source.qbi_w2_wages++;
      if (kind === "review") {
        source.qbi_sstb_filing_review.reviewed_on = "2025-03-01";
      }
      if (kind === "wage-owner") invalid.w2[0].employee_ssn = "999-88-7777";
      if (kind === "spouse-owner") invalid.general.spouse_ssn = "999-88-7777";
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
