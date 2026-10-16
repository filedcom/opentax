import { test } from "bun:test";
import * as fs from "node:fs/promises";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { unzipSync, zipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { f1040_2025 } from "../../index.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { groupDividendFixture } from "../../domains/deductions/business/form8995a/form8995a_group_dividend_fixture.ts";
import { groupLossCases } from "../../domains/deductions/business/form8995a/form8995a_group_loss_fixture.ts";
import { sha256Hex } from "../../return-processing/prepared-source.ts";
import {
  buildMefSubmissionArchive,
  buildMefTransmissionPackage,
  type MefSubmissionArchive,
} from "./submission-archive.ts";

const encoder = new TextEncoder(), decoder = new TextDecoder();
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
const saved = <T>(value: T): T => JSON.parse(JSON.stringify(value));
// Deliberately remap only the two exact synthetic identity values (including
// their formatted versions), across owned sources and the final filer.
function remap<T>(value: T, primary: string, spouse: string): T {
  return JSON.parse(JSON.stringify(value), (_key, v) => {
    if (typeof v !== "string") return v;
    const tin = v.replaceAll("-", "");
    return tin === "111223333" ? primary : tin === "444556666" ? spouse : v;
  });
}

test("joint source replay preserves owner copies and inline statements in a mixed submission batch", async () => {
  const evidence = process.env.JOINT_SUBMISSION_EVIDENCE;
  if (evidence) await fs.mkdir(evidence, { recursive: true });
  const processingDate = new Date("2026-10-12T08:00:00Z");
  const archives: MefSubmissionArchive[] = [];
  const totals = [141959, 141910, 141862, 98002];
  const fixtures = groupLossCases.map((c) => groupDividendFixture(c));
  const doors = structuredClone(
    pdfReviewFixtures.find((f) =>
      f.id === "single-form5695-door-and-air-conditioner"
    )!,
  );
  // Four distinct door QMIDs trigger the existing generated statement path.
  const doorInput = doors.inputs as Record<string, any>;
  doorInput.f5695.part_ii_section_a.exterior_doors = Array.from(
    { length: 4 },
    (_, i) => ({ cost: 500, qmid: `A0B${i}` }),
  );
  const sources = [
    ...fixtures.map((f) => ({ input: f.input, filer: f.filer })),
    { input: doorInput, filer: doors.filer },
  ];
  for (const [i, source] of sources.entries()) {
    const primary = String(211223330 + i), spouse = String(544556660 + i);
    const input = remap(source.input, primary, spouse);
    const filer = {
      ...remap(source.filer, primary, spouse),
      softwareId: "12345678",
      originator: { efin: "123456", originatorType: "ERO" as const },
    };
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    // Replay the actual JSON boundary, not an in-memory clone.
    const prepared = await f1040_2025.prepareReturn(
      saved(result.pending),
      saved(filer),
    );
    if (i < 4) {
      assertEquals(prepared.bundle.pending.f1040?.line24_total_tax, totals[i]);
      const data = parser.parse(prepared.bundle.xml).Return.ReturnData;
      assertEquals(
        data.IRS1040ScheduleC.map((c: Record<string, string>) => c.SSN),
        [primary, spouse, primary, spouse],
      );
      assertEquals(
        data.IRS1040ScheduleSE.map((c: Record<string, string>) => c.SSN),
        [primary, spouse],
      );
      assertEquals(
        data.ControlledGroupMemberStatement.ControlledGroupMember.map((
          m: Record<string, string>,
        ) => m.ShareOfCreditAmt),
        ["1200", "1200"],
      );
      assertEquals(prepared.bundle.attachments.length, 0);
    } else {
      assertEquals(prepared.bundle.attachments.map((a) => a.fileName), [
        "AdditionalQMIDStatement.pdf",
      ]);
    }
    const person = (tin: string) => ({
      tin,
      tax_status: "full_year_us_citizen" as const,
      status_source_reference: `Synthetic residency ${tin}`,
      reviewer_reference: "Synthetic archive review",
      reviewed_on: "2026-10-12",
    });
    const archive = await buildMefSubmissionArchive(prepared.bundle, {
      filer,
      submissionId: `1234562026285joint0${i}`,
      processingDate,
      residencyReview: {
        tax_year: 2025,
        taxpayer: person(primary),
        ...(i < 4 ? { spouse: person(spouse) } : {}),
      },
    });
    archives.push(archive);
    if (evidence) {
      await fs.writeFile(`${evidence}/${i}.zip`, archive.bytes);
      await fs.writeFile(`${evidence}/${i}.xml`, archive.bundle.xml);
      await fs.writeFile(
        `${evidence}/${i}-manifest.xml`,
        archive.manifestXml,
      );
      await fs.writeFile(
        `${evidence}/${i}.json`,
        JSON.stringify(
          {
            input,
            filer,
            pending: archive.bundle.pending,
            residency: archive.residencyReview,
          },
          null,
          2,
        ),
      );
    }
  }
  const postmark = new Date("2026-10-12T07:59:00Z");
  for (
    const [label, order] of [["forward", archives], [
      "reverse",
      [...archives].reverse(),
    ]] as const
  ) {
    const transmission = buildMefTransmissionPackage(
      order.map((archive) => ({ archive, electronicPostmark: postmark })),
    );
    const container = unzipSync(transmission.containerZipBytes);
    assertEquals(Object.keys(container), order.map((a) => a.fileName));
    const rows = parser.parse(transmission.sendSubmissionsRequestXml)
      .SendSubmissionsRequest.SubmissionDataList.SubmissionData;
    assertEquals(
      rows.map((
        r: Record<string, string>,
      ) => [r.SubmissionId, r.ElectronicPostmarkTs]),
      order.map((a) => [a.submissionId, postmark.toISOString()]),
    );
    for (const archive of order) {
      assertEquals(container[archive.fileName], archive.bytes);
      const inner = unzipSync(container[archive.fileName]);
      assertEquals(Object.keys(inner), [
        "manifest/manifest.xml",
        "xml/submission.xml",
        ...archive.bundle.attachments.map((a) => `attachment/${a.fileName}`),
      ]);
      assertEquals(
        decoder.decode(inner["xml/submission.xml"]),
        '<?xml version="1.0" encoding="UTF-8"?>\n' + archive.bundle.xml,
      );
      for (const attachment of archive.bundle.attachments) {
        assertEquals(
          inner[`attachment/${attachment.fileName}`],
          attachment.bytes,
        );
      }
    }
    if (evidence) {
      await fs.writeFile(
        `${evidence}/${label}.zip`,
        transmission.containerZipBytes,
      );
      await fs.writeFile(
        `${evidence}/${label}.xml`,
        transmission.sendSubmissionsRequestXml,
      );
    }
  }
  let rejected = 0;
  const reject = (archive: MefSubmissionArchive) => {
    assertThrows(() => buildMefTransmissionPackage([{ archive }]));
    rejected++;
  };
  for (const [i, target] of archives.entries()) {
    const donor = archives[(i + 1) % archives.length];
    for (const name of ["xml/submission.xml", "manifest/manifest.xml"]) {
      const entries = unzipSync(target.bytes);
      entries[name] = unzipSync(donor.bytes)[name];
      reject({ ...target, bytes: zipSync(entries) });
    }
    reject({ ...target, filer: donor.filer });
    reject({ ...target, bundle: donor.bundle });
    reject({ ...target, residencyReview: donor.residencyReview });
    if (i < 4) {
      reject({
        ...target,
        residencyReview: { ...target.residencyReview, spouse: undefined },
      });
      reject({
        ...target,
        residencyReview: {
          ...target.residencyReview,
          spouse: {
            ...target.residencyReview.spouse!,
            tin: target.filer.primarySSN,
          },
        },
      });
      const statementId =
        /<ControlledGroupMemberStatement documentId="([^"]+)"/.exec(
          target.bundle.xml,
        )![1];
      const seId =
        /<IRS1040ScheduleSE documentId="([^"]+)"/.exec(target.bundle.xml)![1];
      for (
        const xml of [
          target.bundle.xml.replace(
            `referenceDocumentId="${statementId} `,
            'referenceDocumentId="absent ',
          ),
          target.bundle.xml.replace(
            `documentId="${statementId}"`,
            `documentId="${seId}"`,
          ),
        ]
      ) {
        assert(xml !== target.bundle.xml);
        const entries = unzipSync(target.bytes);
        entries["xml/submission.xml"] = encoder.encode(
          '<?xml version="1.0" encoding="UTF-8"?>\n' + xml,
        );
        reject({
          ...target,
          bundle: {
            ...target.bundle,
            xml,
            xmlSha256: await sha256Hex(encoder.encode(xml)),
          },
          bytes: zipSync(entries),
        });
      }
    }
  }
  const attachmentArchive = archives[4],
    entries = unzipSync(attachmentArchive.bytes);
  delete entries["attachment/AdditionalQMIDStatement.pdf"];
  reject({ ...attachmentArchive, bytes: zipSync(entries) });
  assertThrows(() =>
    buildMefTransmissionPackage([{ archive: archives[0] }, {
      archive: archives[0],
    }])
  );
  rejected++;
  assertEquals(rejected, 43);
  if (evidence) {
    await fs.writeFile(
      `${evidence}/checks.json`,
      JSON.stringify(
        {
          returns: 5,
          jointReturns: 4,
          sourceReplay: "JSON",
          rejected,
          containerOrders: 2,
          totals,
        },
        null,
        2,
      ),
    );
  }
});
