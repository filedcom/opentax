import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  patronStatusCases,
  patronStatusFixture,
} from "./form8995a_patron_status_fixture.ts";
import { patronStatusExpected } from "./form8995a_patron_status_expected.ts";
// Mutations intentionally cross the untrusted persisted-data boundary.
type Row = Record<string, any>;

function mirrorSources(p: Row) {
  const review = p.qbi_patron;
  const isC = review.business.kind === "schedule_c";
  const container = isC ? p.schedule_c : p.schedule_f;
  const business = isC ? container.schedule_cs[0] : container.schedule_fs[0];
  container.patron_filing_review = structuredClone(review);
  p.f1099patr.f1099patrs[0] = structuredClone(review.source_1099patr);
  for (const key of ["form8995a", "form8995a_schedule_d"]) {
    p[key].patron_business_source.review = structuredClone(review);
    p[key].patron_business_source.business_source = structuredClone(business);
    const details = p[key].patron_filing_details;
    details.source_1099patr = structuredClone(review.source_1099patr);
    details.box6_written_notice_review = structuredClone(
      review.box6_written_notice_review,
    );
    details.allocation_worksheet_reference =
      review.allocation_worksheet_reference;
  }
}

for (const c of patronStatusCases) {
  test(`Patron ${c.name}: owned sources, final tax and complete packet`, async () => {
    const input = patronStatusFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line37_amount_owed,
    ], patronStatusExpected[c.name]);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const pending: Row = prepared.bundle.pending;
    assertEquals(
      pending.form8995a.patron_business_source.review,
      pending.qbi_patron,
    );
    assertEquals(pending.form8995a_schedule_d, pending.form8995a);
    assert(prepared.bundle.xml.includes("<IRS8995AScheduleD "));
    const root = process.env.PATRON_STATUS_EVIDENCE;
    const dir = root ? `${root}/${c.name}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(
        `${dir}/source.json`,
        JSON.stringify({ input, filer, pending }, null, 2),
      );
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
      const origins: Parameters<typeof buildPdfBytes>[4] = [];
      await fs.writeFile(
        `${dir}/return.pdf`,
        await buildPdfBytes(
          pending,
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
      const kinds = [
        "payer",
        "recipient",
        "payroll",
        "notice",
        "allocation",
        "owner",
        "deduction",
        "tax",
        "companion",
        ...(c.status === "mfs"
          ? [
            "missing-mfs",
            "community-state",
            "mfs-spouse",
            "spouse-itemizing",
            "mail-state",
          ]
          : []),
      ];
      for (const kind of kinds) {
        const changed: Row = structuredClone(pending);
        const review = changed.qbi_patron;
        const business = review.business.kind === "schedule_c"
          ? changed.schedule_c.schedule_cs[0]
          : changed.schedule_f.schedule_fs[0];
        if (kind === "payer") review.source_1099patr.payer_tin = "bad";
        if (kind === "recipient") {
          review.source_1099patr.recipient_tin = "999001234";
        }
        if (kind === "payroll") {
          review.employee_w2_records[0].eligible_199a_wages++;
        }
        if (kind === "notice") delete review.box6_written_notice_review;
        if (kind === "allocation") review.allocation_worksheet_reference = "";
        if (kind === "owner") business.proprietor_recipient = "S";
        if (kind === "missing-mfs") delete review.mfs_filing_review;
        if (kind === "community-state") {
          review.mfs_filing_review.domicile_state = "CA";
        }
        if (kind === "mfs-spouse") {
          review.mfs_filing_review.spouse_ssn = "999001234";
        }
        if (kind === "spouse-itemizing") {
          changed.general.mfs_spouse_itemizing = true;
          changed.f1040.mfs_spouse_itemizing = true;
        }
        if (kind === "mail-state") {
          review.mfs_filing_review.mailing_address_state = "FL";
        }
        mirrorSources(changed);
        if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
        if (kind === "tax") changed.f1040.line24_total_tax++;
        if (kind === "companion") changed.form8995a_schedule_d.qbi++;
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
          "",
          `${c.name}/${kind}/native`,
        );
        await assertRejects(
          () => buildPdfBytes(changed, filer, ".pdf-cache"),
          Error,
          "",
          `${c.name}/${kind}/pdf`,
        );
      }
      if (c.status === "mfs") {
        const changedFiler = {
          ...filer,
          spouse: { ...filer.spouse!, ssn: "999001234" },
        };
        await assertRejects(() =>
          f1040_2025.prepareReturn(pending, changedFiler)
        );
        await assertRejects(() =>
          buildPdfBytes(pending, changedFiler, ".pdf-cache")
        );
      }
      await fs.writeFile(
        `${dir}/checks.json`,
        JSON.stringify(
          {
            case: c.name,
            nativeRejections: kinds.length + (c.status === "mfs" ? 1 : 0),
            pdfRejections: kinds.length + (c.status === "mfs" ? 1 : 0),
          },
          null,
          2,
        ),
      );
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
  });
}

test("patron public status review requires MFS property evidence and rejects it for other statuses", () => {
  for (const c of patronStatusCases) {
    const input = patronStatusFixture(c);
    if (c.status === "mfs") {
      for (
        const kind of ["missing", "community", "same-owner", "elected-property"]
      ) {
        const changed = structuredClone(input);
        const review = changed.qbi_patron;
        if (kind === "missing") delete review.mfs_filing_review;
        if (kind === "community") {
          review.mfs_filing_review.domicile_state = "CA";
        }
        if (kind === "same-owner") {
          review.mfs_filing_review.spouse_ssn =
            review.source_1099patr.recipient_tin;
        }
        if (kind === "elected-property") {
          review.mfs_filing_review
            .no_elected_community_property_regime_confirmed = false;
        }
        assert(
          f1040_2025.executeReturn(changed).diagnostics.some((d) =>
            d.severity === "error"
          ),
          `${c.name}/${kind}`,
        );
      }
    } else {
      input.qbi_patron.mfs_filing_review =
        patronStatusFixture({ ...c, status: "mfs" }).qbi_patron
          .mfs_filing_review;
      assert(
        f1040_2025.executeReturn(input).diagnostics.some((d) =>
          d.severity === "error"
        ),
        c.name,
      );
    }
  }
});
