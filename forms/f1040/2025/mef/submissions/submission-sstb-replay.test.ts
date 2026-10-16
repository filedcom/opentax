import { test } from "bun:test";
import * as fs from "node:fs/promises";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { unzipSync, zipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { f1040_2025 } from "../../index.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import {
  sstbStatusCases,
  sstbStatusFixture,
} from "../../domains/deductions/business/form8995a/form8995a_sstb_status_fixture.ts";
import {
  sstbJointOwnerCases,
  sstbJointOwnerFixture,
} from "../../domains/deductions/business/form8995a/form8995a_sstb_joint_owner_fixture.ts";
import {
  sstbInvestmentCases,
  sstbInvestmentFixture,
} from "../../domains/deductions/business/form8995a/form8995a_sstb_investments_fixture.ts";
import {
  sstbZeroCases,
  sstbZeroFixture,
} from "../../domains/deductions/business/form8995a/form8995a_sstb_zero_fixture.ts";
import {
  sstbServiceCases,
  sstbServiceFixture,
} from "../../domains/deductions/business/form8995a/form8995a_sstb_services_fixture.ts";
import {
  sstbFinancialCases,
  sstbFinancialFixture,
} from "../../domains/deductions/business/form8995a/form8995a_sstb_financial_fixture.ts";
import {
  sstbProfessionalCases,
  sstbProfessionalFixture,
} from "../../domains/deductions/business/form8995a/form8995a_sstb_professional_fixture.ts";
import {
  sstbIdentityCases,
  sstbIdentityFixture,
} from "../../domains/deductions/business/form8995a/form8995a_sstb_identity_fixture.ts";
import { sha256Hex } from "../../return-processing/prepared-source.ts";
import {
  buildMefSubmissionArchive,
  buildMefTransmissionPackage,
  type MefSubmissionArchive,
} from "./submission-archive.ts";

import { FilingStatus } from "../types.ts";
// Deliberately altered untrusted persisted values exercise the preparation boundary.
type Row = Record<string, any>;

const encoder = new TextEncoder(), decoder = new TextDecoder();
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
const saved = <T>(value: T): T => JSON.parse(JSON.stringify(value));
// Replace exact synthetic identity values throughout sources, preserving other TINs.
function remap<T>(value: T, primary: string, spouse: string): T {
  return JSON.parse(JSON.stringify(value), (_key, v) => {
    if (typeof v !== "string") return v;
    const tin = v.replaceAll("-", "");
    return tin === "111223333" ? primary : tin === "444556666" ? spouse : v;
  });
}

test("SSTB saved returns preserve all 68 source packets in mixed submission archives", async () => {
  const evidence = process.env.SSTB_SUBMISSION_EVIDENCE;
  if (evidence) await fs.mkdir(evidence, { recursive: true });
  const cases = [
    ...sstbStatusCases.map((c) => ({
      name: `status-${c.name}`,
      input: sstbStatusFixture(c),
    })),
    ...sstbJointOwnerCases.map((c) => ({
      name: `owner-${c.name}`,
      input: sstbJointOwnerFixture(c),
    })),
    ...sstbInvestmentCases.map((c) => ({
      name: `investment-${c}`,
      input: sstbInvestmentFixture(c),
    })),
    ...sstbZeroCases.map((c) => ({
      name: `zero-${c.name}`,
      input: sstbZeroFixture(c),
    })),
    ...sstbServiceCases.map((c) => ({
      name: `service-${c.name}`,
      input: sstbServiceFixture(c),
    })),
    ...sstbFinancialCases.map((c) => ({
      name: `financial-${c.name}`,
      input: sstbFinancialFixture(c),
    })),
    ...sstbProfessionalCases.map((c) => ({
      name: `professional-${c.name}`,
      input: sstbProfessionalFixture(c),
    })),
    ...sstbIdentityCases.map((c) => ({
      name: `identity-${c.name}`,
      input: sstbIdentityFixture(c),
    })),
  ];
  assertEquals(cases.length, 68);
  const archives: MefSubmissionArchive[] = [];
  const observations = [];
  let sourceRejected = 0, archiveRejected = 0;
  for (const [i, c] of cases.entries()) {
    const primary = String(211220000 + i), spouse = String(544550000 + i);
    const input = remap(c.input, primary, spouse);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, [], c.name);
    const filer = {
      ...extractFilerIdentity(result.pending.f1040)!,
      softwareId: "12345678",
      originator: { efin: "123456", originatorType: "ERO" as const },
    };
    const pending = saved(result.pending);
    const original = await f1040_2025.prepareReturn(result.pending, filer);
    const prepared = await f1040_2025.prepareReturn(pending, saved(filer));
    const originalData = parser.parse(original.bundle.xml).Return.ReturnData;
    const data = parser.parse(prepared.bundle.xml).Return.ReturnData;
    assertEquals(
      data,
      originalData,
      `${c.name}: JSON must preserve every native document and reference`,
    );
    // JSON omits optional undefined properties; compare all persisted values.
    assertEquals(
      saved(prepared.bundle.pending),
      saved(original.bundle.pending),
    );
    assertEquals(prepared.bundle.attachments, []);
    const owner = input.schedule_c[0].proprietor_recipient === "S"
      ? spouse
      : primary;
    assertEquals(data.IRS1040ScheduleC.SSN, owner);
    const seCopies = [data.IRS1040ScheduleSE].flat();
    assertEquals(seCopies.length, 1);
    assertEquals(seCopies[0].SSN, owner);
    assertEquals(
      data.IRS8995A.QualifiedBusinessIncomeDedAmt,
      String(result.pending.f1040.line13_qbi_deduction),
    );
    if (c.name.startsWith("zero-")) {
      assertEquals(data.IRS8995A.QualifiedBusinessIncomeDedAmt, "0");
    }
    const person = (tin: string) => ({
      tin,
      tax_status: "full_year_us_citizen" as const,
      status_source_reference: `Synthetic citizenship ${tin}`,
      reviewer_reference: "Synthetic archive review",
      reviewed_on: "2026-10-12",
    });
    const archive = await buildMefSubmissionArchive(prepared.bundle, {
      filer,
      submissionId: `1234562026285sstb${String(i).padStart(3, "0")}`,
      processingDate: new Date("2026-10-12T18:00:00Z"),
      residencyReview: {
        tax_year: 2025,
        taxpayer: person(primary),
        ...(input.general.filing_status === "mfj"
          ? { spouse: person(spouse) }
          : {}),
      },
    });
    archives.push(archive);
    observations.push({
      name: c.name,
      primary,
      owner,
      status: input.general.filing_status,
      deduction: result.pending.f1040.line13_qbi_deduction,
      totalTax: Math.round(Number(result.pending.f1040.line24_total_tax)),
      deferred: c.name === "zero-mfs-upper"
        ? "156: actual tax57813 is one below independent57814"
        : null,
    });
    for (
      const kind of [
        "retained-owner",
        "issued-owner",
        "settled-qbi",
        "duplicate-business",
      ] as const
    ) {
      const changed: Row = saved(pending);
      if (kind === "retained-owner") {
        changed.form8995a.single_sstb_schedule_c_source.owner_ssn = "999887777";
      }
      if (kind === "issued-owner") {
        changed.schedule_c.schedule_cs[0].qbi_sstb_filing_review.owner_ssn =
          "999887777";
      }
      if (kind === "settled-qbi") changed.f1040.line13_qbi_deduction++;
      if (kind === "duplicate-business") {
        changed.schedule_c.schedule_cs.push(
          saved(changed.schedule_c.schedule_cs[0]),
        );
      }
      await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
      sourceRejected++;
    }
    const classification =
      input.schedule_c[0].qbi_sstb_filing_review.service_classification_review;
    if (classification) {
      const stored: Row = prepared.bundle.pending;
      assertEquals(
        stored.schedule_c.schedule_cs[0].qbi_sstb_filing_review
          .service_classification_review,
        classification,
      );
      for (const key of ["form8995a", "form8995a_schedule_a"]) {
        assertEquals(
          stored[key].single_sstb_schedule_c_source.business.source_schedule_c
            .qbi_sstb_filing_review.service_classification_review,
          classification,
        );
      }
      if (classification.field === "reputation_or_skill") {
        assertEquals(classification.individual_ssn, owner);
      }
      for (
        const kind of [
          "missing-review",
          "receipt-total",
          "excluded-service",
          ...(classification.field === "reputation_or_skill"
            ? ["identity-owner", "identity-kind"]
            : []),
          ...(classification.field === "financial_services"
            ? ["financial-kind"]
            : []),
        ]
      ) {
        const changed: Row = saved(pending);
        const business = changed.schedule_c.schedule_cs[0];
        const review = business.qbi_sstb_filing_review;
        if (kind === "missing-review") {
          delete review.service_classification_review;
        }
        if (kind === "identity-owner") {
          review.service_classification_review.individual_ssn = "999001234";
        }
        if (kind === "identity-kind") {
          review.service_classification_review.income_kind =
            "ordinary_product_sales";
        }
        if (kind === "financial-kind") {
          const service = review.service_classification_review;
          service.service_kind = service.service_kind === "financial_advice"
            ? "loan_arrangement"
            : "financial_advice";
        }
        if (kind === "receipt-total") {
          review.service_classification_review.revenue_records[0].amount++;
        }
        if (kind === "excluded-service") {
          const service = review.service_classification_review;
          const key = Object.keys(service).find((key) =>
            key.startsWith("no_")
          )!;
          service[key] = false;
        }
        // A coherent alteration of every stored copy must still fail review.
        for (const key of ["form8995a", "form8995a_schedule_a"]) {
          changed[key].single_sstb_schedule_c_source.business
            .source_schedule_c = saved(business);
        }
        await assertRejects(() =>
          f1040_2025.prepareReturn(saved(changed), filer)
        );
        sourceRejected++;
      }
    }
    if (evidence) {
      await fs.writeFile(`${evidence}/${c.name}.zip`, archive.bytes);
      await fs.writeFile(`${evidence}/${c.name}.xml`, archive.bundle.xml);
      await fs.writeFile(
        `${evidence}/${c.name}-manifest.xml`,
        archive.manifestXml,
      );
      await fs.writeFile(
        `${evidence}/${c.name}.json`,
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
  for (
    const [label, order] of [["forward", archives], [
      "reverse",
      [...archives].reverse(),
    ]] as const
  ) {
    const postmark = new Date("2026-10-12T17:59:00Z");
    const transmission = buildMefTransmissionPackage(
      order.map((archive) => ({ archive, electronicPostmark: postmark })),
    );
    const entries = unzipSync(transmission.containerZipBytes);
    assertEquals(Object.keys(entries), order.map((a) => a.fileName));
    const request = parser.parse(transmission.sendSubmissionsRequestXml)
      .SendSubmissionsRequest.SubmissionDataList.SubmissionData;
    assertEquals(
      request.map((
        r: Record<string, string>,
      ) => [r.SubmissionId, r.ElectronicPostmarkTs]),
      order.map((a) => [a.submissionId, postmark.toISOString()]),
    );
    for (const archive of order) {
      assertEquals(entries[archive.fileName], archive.bytes);
      const inner = unzipSync(entries[archive.fileName]);
      assertEquals(Object.keys(inner), [
        "manifest/manifest.xml",
        "xml/submission.xml",
      ]);
      assertEquals(
        decoder.decode(inner["xml/submission.xml"]),
        '<?xml version="1.0" encoding="UTF-8"?>\n' + archive.bundle.xml,
      );
      assertEquals(
        decoder.decode(inner["manifest/manifest.xml"]),
        archive.manifestXml,
      );
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
  const reject = (archive: MefSubmissionArchive) => {
    assertThrows(() => buildMefTransmissionPackage([{ archive }]));
    archiveRejected++;
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
    const scheduleId =
      /<IRS8995AScheduleA documentId="([^"]+)"/.exec(target.bundle.xml)![1];
    const parentId =
      /<IRS8995A documentId="([^"]+)"/.exec(target.bundle.xml)![1];
    for (
      const xml of [
        target.bundle.xml.replace(
          `documentId="${scheduleId}"`,
          `documentId="${parentId}"`,
        ),
        target.bundle.xml.replace(
          `<IRS8995AScheduleA documentId="${scheduleId}"`,
          `<IRS8995AScheduleA documentId="${scheduleId}" referenceDocumentId="missing-document"`,
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
    if (target.filer.filingStatus === FilingStatus.MarriedFilingJointly) {
      reject({
        ...target,
        residencyReview: { ...target.residencyReview, spouse: undefined },
      });
    }
  }
  assertThrows(() =>
    buildMefTransmissionPackage([{ archive: archives[0] }, {
      archive: archives[0],
    }])
  );
  archiveRejected++;
  assertEquals(sourceRejected, 411);
  assertEquals(archiveRejected, 505);
  if (evidence) {
    await fs.writeFile(
      `${evidence}/checks.json`,
      JSON.stringify(
        {
          returns: archives.length,
          sourceRejected,
          archiveRejected,
          containerOrders: 2,
          observations,
        },
        null,
        2,
      ),
    );
  }
});
