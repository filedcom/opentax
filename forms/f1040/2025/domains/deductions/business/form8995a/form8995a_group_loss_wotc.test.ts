import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  groupLossCases,
  groupLossFixture,
} from "./form8995a_group_loss_fixture.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  calculateScheduleCLossLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
// Synthetic reviewed payroll; neither source references nor these tests authenticate issuer records.
type Row = Record<string, any>;
for (const c of groupLossCases) {
  test(`Joint common-control employers with QBI losses ${c.name}`, async () => {
    const { name, indices } = c;
    const { input, filer } = groupLossFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const lines = calculateScheduleCLossLines(
      inputSchema.parse(pending.form8995a),
    );
    assertEquals(lines.schedule.rows.map((r) => r.line1a), c.raw);
    assertEquals(lines.schedule.rows.map((r) => r.line1b), c.offset);
    assertEquals(lines.businessLines.map((r) => r.parent.line2), c.adjusted);
    assertEquals(lines.businessLines.map((r) => r.parent.line4), c.parentWages);
    assertEquals(pending.f1040.line13_qbi_deduction, c.qbi);
    assertEquals(pending.f1040.line24_total_tax, c.tax);
    assertEquals(pending.f3800.allowed_credit, 2400);
    assertEquals(pending.f1040.form5884_determined_credit, 2400);
    assertEquals(pending.schedule1.line15_se_deduction, 156);
    assertEquals(pending.schedule2.line4_se_tax, 310);
    assertEquals(
      (pending.schedule_c.wotc_wage_reductions as Row[]).map((r: Row) =>
        r.credit_amount
      ),
      [1200, 1200],
    );
    const reversed = f1040_2025.executeReturn({
      ...input,
      schedule_c: [...input.schedule_c].reverse(),
      f5884: { ...input.f5884, f5884s: [...input.f5884.f5884s].reverse() },
    });
    assertEquals(reversed.diagnostics, []);
    assertEquals(reversed.pending.f1040.line24_total_tax, c.tax);
    for (
      const kind of [
        "control",
        "owner",
        "payroll",
        "other-businesses",
        "se-allocation",
        "group-name",
        "shared-identity",
        "certificate",
      ]
    ) {
      const changed = structuredClone(input);
      if (kind === "group-name") {
        changed.f5884.controlled_group.members[0].ein = "999887777";
      }
      if (kind === "shared-identity") {
        changed.f5884.f5884s[1].group_employee_identity_review
          .employee_identity_source_reference = "Different person";
      }
      if (kind === "certificate") {
        changed.f5884.f5884s[1].certification.swa_certification_reference =
          changed.f5884.f5884s[0].certification.swa_certification_reference;
      }

      if (kind === "control") {
        delete changed.f5884.controlled_group.joint_filed_members_review;
      }
      if (kind === "owner") {
        changed.f5884.controlled_group.joint_filed_members_review.members[0]
          .proprietor_ssn = "999887777";
      }
      if (kind === "payroll") {
        changed.schedule_c[indices[0]].qbi_wotc_filing_review
          .employee_w2_records[0].box1_wages = 6001;
      }
      if (kind === "other-businesses") {
        changed.schedule_c[indices[1]].qbi_wotc_filing_review
          .reviewed_other_business_references = [];
      }
      if (kind === "se-allocation") {
        changed.schedule_c[indices[1]].qbi_loss_se_tax_allocation_review
          .deduction_amount = 0;
      }
      assert(f1040_2025.executeReturn(changed).diagnostics.length > 0, kind);
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const root = process.env.FORM8995A_GROUP_LOSS_DIR;
    const dir = root ? `${root}/${name}` : await sys.makeTempDir();
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
          "control",
          "owner",
          "employer",
          "payroll",
          "credit",
          "reduction",
          "qbi-owner",
          "se-allocation",
          "group-name",
          "shared-identity",
          "certificate",
        ]
      ) {
        const changed = structuredClone(prepared.bundle.pending) as Record<
          string,
          Row
        >;
        if (kind === "group-name") {
          changed.f5884.controlled_group.members[0].business_name =
            "Changed employer name";
        }
        if (kind === "shared-identity") {
          changed.f5884.f5884s[1].group_employee_identity_review
            .employee_identity_source_reference = "Different person";
        }
        if (kind === "certificate") {
          changed.f5884.f5884s[1].certification.swa_certification_reference =
            changed.f5884.f5884s[0].certification.swa_certification_reference;
        }

        if (kind === "control") {
          delete changed.f5884.controlled_group.joint_filed_members_review;
        }
        if (kind === "owner") {
          changed.f5884.controlled_group.joint_filed_members_review.members[0]
            .proprietor_ssn = "999887777";
        }
        if (kind === "employer") {
          changed.f5884.f5884s[1].direct_employer_review.employer_ein =
            "999887777";
        }
        if (kind === "payroll") {
          changed.f5884.f5884s[1].wage_records[0].qualified_wages = 6001;
        }
        if (kind === "credit") changed.f1040.form5884_determined_credit = 1200;
        if (kind === "reduction") {
          changed.schedule_c.wotc_wage_reductions[1].credit_amount = 1201;
        }
        if (kind === "qbi-owner") {
          changed.schedule_c.schedule_cs[indices[1]].qbi_wotc_filing_review
            .owner_ssn = "999887777";
        }
        if (kind === "se-allocation") {
          changed.form8995a.schedule_c_qbi_businesses[indices[0]]
            .source_schedule_c.qbi_loss_se_tax_allocation_review
            .deduction_amount = 0;
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
