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
  aggregationStatusCases,
  aggregationStatusFixture,
} from "./form8995a_aggregation_status_fixture.ts";
type Row = Record<string, any>;
const expected: Record<string, number[]> = {
  "hoh-direct-3": [9568, 41245, 1926, 43171, 16829],
  "hoh-direct-4": [9557, 44406, 2277, 46683, 13317],
  "hoh-rpe-3": [48000, 61740, 0, 61740, 51740],
  "hoh-rpe-4": [66250, 93853, 0, 93853, 83853],
  "mfs-direct-3": [8590, 45817, 2601, 48418, 11582],
  "mfs-direct-4": [8366, 49046, 2952, 51998, 8002],
  "mfs-rpe-3": [48000, 66235, 0, 66235, 56235],
  "mfs-rpe-4": [66250, 98347, 0, 98347, 88347],
  "qss-direct-3": [10547, 33201, 1926, 35127, 24873],
  "qss-direct-4": [10748, 35329, 2277, 37606, 22394],
  "qss-rpe-3": [48000, 48214, 0, 48214, 38214],
  "qss-rpe-4": [66250, 70234, 0, 70234, 60234],
};
for (const c of aggregationStatusCases) {
  test(`aggregation ${c.name}: source owner, nonjoint QBI threshold and complete packet`, async () => {
    const input = await aggregationStatusFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending: Row = JSON.parse(JSON.stringify(result.pending));
    const filer = extractFilerIdentity(pending.f1040)!;
    const f = pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      f.line16_income_tax,
      f.line23_other_taxes ?? 0,
      f.line24_total_tax,
      c.kind === "direct" ? f.line35a_refund : f.line37_amount_owed,
    ], expected[c.name]);
    const fields = inputSchema.parse(pending.form8995a);
    const p = calculateTwoBusinessAggregationLines(fields).parent;
    assertEquals(p.patronThreshold, 197300);
    assertEquals(p.patronPhaseInRange, 50000);
    assertEquals(p.phaseInRequired, c.kind === "direct");
    assertThrows(() =>
      calculateTwoBusinessAggregationLines({
        ...fields,
        taxable_income: 197300,
      })
    );
    for (const excess of [1, 49999, 50000, 50001]) {
      const b = calculateTwoBusinessAggregationLines({
        ...fields,
        taxable_income: 197300 + excess,
      }).parent;
      const deduction = b.line10 >= b.line3
        ? b.line3
        : excess <= 50000
        ? b.line3 - Math.round((b.line3 - b.line10) * excess / 50000)
        : b.line11;
      assertEquals(
        b.line39,
        Math.min(deduction, Math.round((197300 + excess) * .2)),
      );
    }
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    const xml = prepared.bundle.xml;
    assertEquals(prepared.bundle.attachments.length, c.kind === "rpe" ? 2 : 1);
    if (c.kind === "rpe") {
      const source =
        input.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf;
      assertEquals(
        prepared.bundle.attachments[1].bytes,
        Uint8Array.from(atob(source.pdf_base64), (c) => c.charCodeAt(0)),
      );
    } else {
      assert(
        xml.includes(
          "<FilingStatusThresholdCd>197300</FilingStatusThresholdCd>",
        ),
      );
      assert(
        xml.includes(
          "<FilingStatusPhaseInRangeCd>50000</FilingStatusPhaseInRangeCd>",
        ),
      );
    }
    const root = process.env.AGGREGATION_STATUS_EVIDENCE;
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
      if (c.kind === "rpe") {
        await fs.writeFile(
          `${dir}/issued.pdf`,
          prepared.bundle.attachments[1].bytes,
        );
      }
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
        "owner",
        "status",
        "income",
        "deduction",
        ...(c.status === "mfs"
          ? [
            "review-owner",
            "review-spouse",
            "mail-state",
            "itemizing",
            "retained-review",
          ]
          : []),
      ];
      for (const kind of kinds) {
        const changed: Row = structuredClone(prepared.bundle.pending);
        const identity = { ...structuredClone(filer) };
        if (kind === "owner") identity.primarySSN = "555667777";
        if (kind === "status") identity.filingStatus = 1;
        if (kind === "income") {
          changed.form8995a.taxable_income++;
          changed.form8995a_schedule_b.taxable_income++;
        }
        if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
        if (kind === "itemizing") changed.general.mfs_spouse_itemizing = true;
        if (kind === "retained-review") {
          delete changed.qbi_aggregation.aggregation_mfs_review;
        }
        if (kind.startsWith("review-") || kind === "mail-state") {
          for (const key of ["form8995a", "form8995a_schedule_b"]) {
            const review = changed[key].aggregation_mfs_review;
            if (kind === "review-owner") {
              review.owner_ssn = "555667777";
            }
            if (kind === "review-spouse") review.spouse_ssn = "666778888";
            if (kind === "mail-state") review.mailing_address_state = "NY";
          }
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
    for (
      const kind of c.status === "mfs"
        ? [
          "missing-review",
          "community",
          "elected-community",
          "spouse-itemizes",
          "spouse-owner",
        ]
        : ["spouse-owner"]
    ) {
      const changed = structuredClone(input);
      if (kind === "missing-review") {
        delete changed.qbi_aggregation.aggregation_mfs_review;
      }
      if (kind === "community") {
        changed.qbi_aggregation.aggregation_mfs_review.domicile_state = "CA";
      }
      if (kind === "elected-community") {
        changed.qbi_aggregation.aggregation_mfs_review
          .no_elected_community_property_regime_confirmed = false;
      }
      if (kind === "spouse-itemizes") {
        changed.qbi_aggregation.aggregation_mfs_review
          .spouse_does_not_itemize_confirmed = false;
      }
      if (kind === "spouse-owner") {
        if (c.kind === "direct") {
          for (
            const member of changed.qbi_aggregation.aggregation_filing_details
              .members
          ) member.source_schedule_c.proprietor_recipient = "S";
        } else changed.general.taxpayer_ssn = "555-66-7777";
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
