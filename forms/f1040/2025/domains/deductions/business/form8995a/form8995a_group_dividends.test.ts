import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { groupDividendFixture } from "./form8995a_group_dividend_fixture.ts";
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
  test(`Qualified dividends with QBI loss employer groups ${c.name}`, async () => {
    const { input, filer, employers } = groupDividendFixture(c);
    // Independent MFJ ledger: qualified1500 within ordinary dividends3000;
    // qualified dividends and long gain1800 fall in15% band; phase-in56.5%.
    const expected = {
      "both-loss": [150, 577694, 140627, 141959],
      "mixed-primary": [292, 577552, 140578, 141910],
      "mixed-spouse": [427, 577417, 140530, 141862],
      "both-loss-phase": [332, 450768, 97811, 98002],
    }[c.name]!;
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = normalizeAllPending(result.pending);
    assertEquals(p.f1040.line13_qbi_deduction, expected[0]);
    assertEquals(p.f1040.line24_total_tax, expected[3]);
    assertEquals(p.f1040.line15_taxable_income, expected[1]);
    assertEquals(p.f1040.line16_income_tax, expected[2]);
    assertEquals(p.f1040.line37_amount_owed, expected[3] - 60000);
    assertEquals(p.form8995a.net_capital_gain, 3300);
    assertEquals(p.f1040.line3a_qualified_dividends, 1500);
    assertEquals(p.form8960.line17_niit, 247);
    assertEquals(p.f1040.form5884_determined_credit, 2400);
    assertEquals(p.f3800.allowed_credit, 2400);
    assertEquals(
      (p.schedule_c.wotc_wage_reductions as Row[]).map((r) => r.credit_amount),
      [1200, 1200],
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
    assertEquals(reverseResult.pending.f1040.line24_total_tax, expected[3]);
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
        b.qbi_wotc_filing_review.employee_w2_records[0].box1_wages = 4001;
      }
      if (kind === "net-wages") b.qbi_w2_wages = 2629;
      if (kind === "owner") {
        changed.f5884.controlled_group.joint_filed_members_review.members[0]
          .proprietor_ssn = "999887777";
      }
      const changedResult = f1040_2025.executeReturn(changed);
      if (kind === "payroll") {
        // Small payroll changes can preserve rounded credit shares; source
        // reconciliation at export must still reject the changed issued wages.
        assertEquals(changedResult.diagnostics, []);
        await assertRejects(() =>
          f1040_2025.prepareReturn(changedResult.pending, filer)
        );
        await assertRejects(() =>
          buildPdfBytes(changedResult.pending, filer, ".pdf-cache")
        );
      } else assert(changedResult.diagnostics.length > 0, kind);
    }
    const qualified = structuredClone(input);
    qualified.schedule_c.find((b: Row) => b.qbi_wotc_filing_review)
      .qbi_wotc_filing_review.qualified_dividends_zero_confirmed = true;
    assert(
      f1040_2025.executeReturn(qualified).diagnostics.some((d) =>
        d.message.includes("zero qualified-dividend")
      ),
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const root = process.env.FORM8995A_GROUP_DIVIDENDS_DIR;
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
          "interest-owner",
          "dividend-owner",
          "capital-copy",
          "capital-limit",
          "capital-total",
          "regular-tax",
          "qualified-copy",
          "qualified-total",
          "qualified-review",
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
        if (kind === "raw-wages") b.line_26_wages = 4001;
        if (kind === "net-wages") b.qbi_w2_wages = 2629;
        if (kind === "issued-w2") {
          b.qbi_wotc_filing_review.employee_w2_records[0].box5_wages = 4001;
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
        if (kind === "interest-owner") {
          changed.f1099int.f1099ints[0].recipient_tin = "999887777";
        }
        if (kind === "dividend-owner") {
          changed.f1099div.f1099divs[0].recipient_tin = "999887777";
        }
        if (kind === "qualified-copy") {
          changed.f1099div.f1099divs[0].box1b = 1001;
        }
        if (kind === "qualified-total") {
          changed.f1040.line3a_qualified_dividends = 1501;
        }
        if (kind === "qualified-review") {
          b.qbi_wotc_filing_review.qualified_dividends_zero_confirmed = true;
        }
        if (kind === "capital-copy") changed.f1099div.f1099divs[0].box2a = 1001;
        if (kind === "capital-limit") changed.form8995a.net_capital_gain = 1801;
        if (kind === "capital-total") changed.f1040.line7_capital_gain = 1801;
        if (kind === "regular-tax") {
          changed.f1040.line16_income_tax = expected[2] + 1;
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

test("Loss employer dividend review cannot claim nonzero dividends without sources", () => {
  for (const c of groupLossCases) {
    const { input } = groupLossFixture(c);
    const employer = input.schedule_c.find((b: Row) =>
      b.qbi_wotc_filing_review
    );
    employer.qbi_wotc_filing_review.qualified_dividends_zero_confirmed = false;
    assert(
      f1040_2025.executeReturn(input).diagnostics.some((d) =>
        d.message.includes("zero qualified-dividend review disagrees")
      ),
    );
  }
});
