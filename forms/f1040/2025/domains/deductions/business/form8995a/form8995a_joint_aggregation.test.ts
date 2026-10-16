import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  calculateTwoBusinessAggregationLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import {
  jointAggregationCases,
  jointAggregationFixture,
} from "./form8995a_joint_aggregation_fixture.ts";
type Row = Record<string, any>;

for (const c of jointAggregationCases) {
  test(`joint aggregation ${c.name}: persisted owner sources, annual disclosure and complete packet`, async () => {
    const { input, filer } = jointAggregationFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040 as Row;
    assertEquals([
      f.line13_qbi_deduction,
      f.line24_total_tax,
      f.line33_total_payments,
      f.line37_amount_owed,
    ], [c.qbi, c.tax, 121800, c.tax - 121800]);
    assertEquals((result.pending.schedule1 as Row).line15_se_deduction, c.half);
    const pending = JSON.parse(JSON.stringify(result.pending));
    const fields = inputSchema.parse(pending.form8995a);
    assertThrows(() =>
      calculateTwoBusinessAggregationLines({
        ...fields,
        taxable_income: 394600,
      })
    );
    assertEquals(
      calculateTwoBusinessAggregationLines({
        ...fields,
        taxable_income: 494601,
      }).parent.line39,
      c.qbi,
    );
    const mixed = structuredClone(input);
    mixed.schedule_c[1].proprietor_recipient = c.owner === "T" ? "S" : "T";
    mixed.qbi_aggregation.aggregation_filing_details.members[1]
      .source_schedule_c.proprietor_recipient =
        mixed.schedule_c[1].proprietor_recipient;
    assert(
      f1040_2025.executeReturn(mixed).diagnostics.some((d) =>
        d.severity === "error"
      ),
    );
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1040ScheduleC documentId=/g) ?? [])
        .length,
      c.count,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<BusinessAggregationInfoGrp>/g) ?? []).length,
      c.count,
    );
    assertEquals(prepared.bundle.attachments.length, 1);
    const root = process.env.JOINT_AGGREGATION_EVIDENCE;
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
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
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
          "common-owner",
          "member-owner",
          "actual-owner",
          "payroll-owner",
          "se-owner",
          "se-sources",
          "annual-identity",
          "deduction",
          "payroll-wages",
        ]
      ) {
        const changed: Row = structuredClone(prepared.bundle.pending);
        if (kind === "common-owner") {
          changed.form8995a.aggregation_filing_details.common_owner_ssn =
            "999887777";
        }
        if (kind === "member-owner") {
          changed.form8995a.aggregation_filing_details.members[0]
            .source_schedule_c.proprietor_recipient = c.owner === "T"
              ? "S"
              : "T";
        }
        if (kind === "actual-owner") {
          changed.schedule_c.schedule_cs[0].proprietor_recipient =
            c.owner === "T" ? "S" : "T";
        }
        if (kind === "payroll-owner") {
          changed.w2.w2s[0].employee_ssn = c.owner === "T"
            ? filer.spouse!.ssn
            : filer.primarySSN;
        }
        if (kind === "se-owner") delete changed.schedule_se.owner_identity;
        if (kind === "se-sources") {
          changed.schedule_se.owner_business_sources = [];
        }
        if (kind === "annual-identity") {
          changed.form8995a.aggregation_filing_details.annual_disclosure
            .businesses[0].entity_ein = "999887777";
        }
        if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
        if (kind === "payroll-wages") changed.w2.w2s[0].box3_ss_wages--;
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
      for (
        const changed of [{ ...filer, filingStatus: FilingStatus.Single }, {
          ...filer,
          spouse: { ...filer.spouse!, ssn: "999887777" },
        }]
      ) {
        await assertRejects(() =>
          f1040_2025.prepareReturn(prepared.bundle.pending, changed)
        );
        await assertRejects(() =>
          buildPdfBytes(prepared.bundle.pending, changed, ".pdf-cache")
        );
      }
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
  });
}
