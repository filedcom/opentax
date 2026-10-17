import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  groupLossCases,
  groupLossFixture,
} from "./form8995a_group_loss_fixture.ts";
type Row = Record<string, any>;
for (const c of groupLossCases) {
  test(`Unequal cent payroll in QBI loss employer groups ${c.name}`, async () => {
    const { input, filer } = groupLossFixture(c);
    const employers = input.schedule_c.filter((b: Row) =>
      b.qbi_wotc_filing_review
    ) as Row[];
    // Independent ledger: 8000.00 becomes7001.01 actual wages; the shared6000
    // cap still gives2400 credit, apportioned1371/1029 in filed whole dollars.
    for (const [i, b] of employers.entries()) {
      const wages = [4000.49, 3000.52][i], credit = [1371, 1029][i];
      const employee = input.f5884.f5884s.find((e: Row) =>
        e.employer_ein === b.line_d_ein
      );
      employee.wage_records[0].qualified_wages = wages;
      b.line_26_wages = wages;
      b.qbi_w2_wages = wages - credit;
      b.part_v_other_expenses[0].amount = Math.round(
        (b.part_v_other_expenses[0].amount + 2800 - b.qbi_w2_wages) * 100,
      ) / 100;
      b.qbi_wotc_filing_review.employee_w2_records[0].box1_wages = wages;
      b.qbi_wotc_filing_review.employee_w2_records[0].box5_wages = wages;
    }
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = normalizeAllPending(result.pending);
    assertEquals(p.f1040.line13_qbi_deduction, c.qbi);
    assertEquals(p.f1040.line24_total_tax, c.tax);
    assertEquals(p.f1040.form5884_determined_credit, 2400);
    assertEquals(p.f3800.allowed_credit, 2400);
    assertEquals(
      (p.schedule_c.wotc_wage_reductions as Row[]).map((r) => r.credit_amount),
      [1371, 1029],
    );
    assertEquals(p.schedule1.line3_schedule_c, 3000);
    assertEquals(p.schedule1.line15_se_deduction, 156);
    const reversed = structuredClone(input);
    reversed.schedule_c.reverse();
    reversed.f5884.f5884s.reverse();
    reversed.f5884.controlled_group.members.reverse();
    reversed.f5884.controlled_group.joint_filed_members_review.members
      .reverse();
    const reverseResult = f1040_2025.executeReturn(reversed);
    assertEquals(reverseResult.diagnostics, []);
    assertEquals(reverseResult.pending.f1040.line24_total_tax, c.tax);
    await f1040_2025.prepareReturn(reverseResult.pending, filer);
    for (const kind of ["payroll", "w2-copy", "net-wages", "owner"]) {
      const changed = structuredClone(input);
      const b = changed.schedule_c.find((b: Row) =>
        b.business_reference === employers[0].business_reference
      );
      if (kind === "payroll") {
        changed.f5884.f5884s[0].wage_records[0].qualified_wages = 4001.49;
      }
      if (kind === "w2-copy") {
        b.qbi_wotc_filing_review.employee_w2_records[0].box1_wages = 4000;
      }
      if (kind === "net-wages") b.qbi_w2_wages = 2629;
      if (kind === "owner") {
        changed.f5884.controlled_group.joint_filed_members_review.members[0]
          .proprietor_ssn = "999887777";
      }
      assert(f1040_2025.executeReturn(changed).diagnostics.length > 0, kind);
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const root = process.env.FORM8995A_GROUP_CENTS_DIR;
    const dir = root ? `${root}/${c.name}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      for (
        const [key, value] of Object.entries({
          input,
          filer,
          pending: prepared.bundle.pending,
        })
      ) {
        await fs.writeFile(
          `${dir}/${key}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
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
        stderr: "piped",
        stdout: "piped",
      }).output();
      await fs.writeFile(`${dir}/xsd.log`, xsd.stderr);
      assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
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
      for (
        const kind of [
          "credit-share",
          "raw-wages",
          "net-wages",
          "issued-w2",
          "certificate",
          "group-identity",
          "credit-total",
          "statement-source",
        ]
      ) {
        const changed = structuredClone(prepared.bundle.pending) as Record<
          string,
          Row
        >;
        const b = changed.schedule_c.schedule_cs.find((b: Row) =>
          b.business_reference === employers[0].business_reference
        );
        if (kind === "credit-share") {
          changed.schedule_c.wotc_wage_reductions[0].credit_amount = 1372;
        }
        if (kind === "raw-wages") b.line_26_wages = 4000;
        if (kind === "net-wages") b.qbi_w2_wages = 2629;
        if (kind === "issued-w2") {
          b.qbi_wotc_filing_review.employee_w2_records[0].box5_wages = 4000;
        }
        if (kind === "certificate") {
          changed.f5884.f5884s[1].certification.swa_certification_reference =
            changed.f5884.f5884s[0].certification.swa_certification_reference;
        }
        if (kind === "group-identity") {
          changed.f5884.f5884s[0].group_employee_identity_review
            .employee_identity_source_reference = "Different source";
        }
        if (kind === "credit-total") {
          changed.f1040.form5884_determined_credit = 2401;
        }
        if (kind === "statement-source") {
          changed.f5884.controlled_group.members[0].business_name =
            "Changed employer";
        }
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
          undefined,
          kind,
        );
        await assertRejects(
          () => buildPdfBytes(changed, filer, ".pdf-cache"),
          Error,
          undefined,
          kind,
        );
      }
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
  });
}
