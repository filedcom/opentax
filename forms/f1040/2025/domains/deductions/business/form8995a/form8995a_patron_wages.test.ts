import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  patronWageCases,
  patronWageFixture,
} from "./form8995a_patron_wages_fixture.ts";
// Independent Decimal source proof and IRS Tax Computation Worksheet.
const patronWageExpected: Record<string, number[]> = {
  "single-farm": [26226, 247611, 56299, 77858, 67858],
  "single-c-health": [23579, 392221, 106825, 115909, 105909],
  "hoh-farm": [26226, 239736, 52040, 73599, 63599],
  "hoh-c-health": [23579, 384346, 102330, 111414, 101414],
  "qss-farm": [26226, 231861, 41341, 62900, 52900],
  "qss-c-health": [23579, 376471, 76047, 85131, 75131],
  "mfs-farm": [26226, 247611, 56299, 78533, 68533],
  "mfs-c-health": [23579, 392221, 107153, 116913, 106913],
  "joint-farm": [27263, 460824, 101590, 124769, 72498],
  "joint-c-health": [23579, 606471, 151359, 162064, 109793],
  "spouse-farm": [27263, 460824, 101590, 124769, 72498],
  "spouse-c-health": [23579, 606471, 151359, 162064, 109793],
};
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

for (const c of patronWageCases) {
  test(`Patron ${c.name}: owned sources, final tax and complete packet`, async () => {
    const input = patronWageFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      Math.round(Number(f.line15_taxable_income)),
      f.line16_income_tax,
      f.line24_total_tax,
      f.line37_amount_owed,
    ], patronWageExpected[c.name]);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const pending: Row = prepared.bundle.pending;
    assertEquals(
      pending.form8995a.patron_business_source.review,
      pending.qbi_patron,
    );
    assertEquals(pending.form8995a_schedule_d, pending.form8995a);
    assert(prepared.bundle.xml.includes("<IRS8995AScheduleD "));
    const root = process.env.PATRON_WAGES_EVIDENCE;
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
        "owner-tin",
        "ss-wages",
        "medicare-wages",
        "income",
        "withholding",
        "employer",
        "copy-reference",
        "missing-owner",
        "se-wages",
        "se-deduction",
        "deduction",
        "tax",
        ...(["joint", "spouse"].includes(c.status) ? ["swap-collections"] : []),
      ];
      for (const kind of kinds) {
        const changed: Row = structuredClone(pending);
        const review = changed.qbi_patron;
        const key = c.status === "spouse"
          ? "spouse_w2_sources"
          : "primary_w2_sources";
        const ownerWage = review[key][0];
        if (kind === "owner-tin") ownerWage.employee_ssn = "999001234";
        if (kind === "ss-wages") ownerWage.box3_ss_wages++;
        if (kind === "medicare-wages") ownerWage.box5_medicare_wages++;
        if (kind === "income") ownerWage.box1_wages++;
        if (kind === "withholding") ownerWage.box2_fed_withheld++;
        if (kind === "employer") ownerWage.employer_name = "";
        if (kind === "copy-reference") ownerWage.source_document_reference = "";
        if (kind === "missing-owner") delete review[key];
        if (kind === "swap-collections") {
          [review.primary_w2_sources, review.spouse_w2_sources] = [
            review.spouse_w2_sources,
            review.primary_w2_sources,
          ];
        }
        changed.w2.w2s = structuredClone([
          ...review.primary_w2_sources ?? [],
          ...review.spouse_w2_sources ?? [],
        ]);
        changed.w2.patron_filing_review = structuredClone(review);
        mirrorSources(changed);
        if (kind === "se-wages") changed.schedule_se.w2_ss_wages++;
        if (kind === "se-deduction") changed.schedule1.line15_se_deduction++;
        if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
        if (kind === "tax") changed.f1040.line24_total_tax++;
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
      await fs.writeFile(
        `${dir}/checks.json`,
        JSON.stringify(
          {
            case: c.name,
            nativeRejections: kinds.length,
            pdfRejections: kinds.length,
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

test("patron wage collections reject one employee claimed under both spouses", () => {
  for (const c of patronWageCases) {
    const input = patronWageFixture(c);
    input.qbi_patron.spouse_w2_sources = structuredClone(
      input.qbi_patron.primary_w2_sources,
    );
    assert(
      f1040_2025.executeReturn(input).diagnostics.some((d) =>
        d.nodeType === "qbi_patron" && d.severity === "error"
      ),
    );
  }
});
