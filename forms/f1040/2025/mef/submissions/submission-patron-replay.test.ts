import { test } from "bun:test";
import * as fs from "node:fs/promises";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { unzipSync, zipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { f1040_2025 } from "../../index.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import {
  patronStatusCases,
  patronStatusFixture,
} from "../../domains/deductions/business/form8995a/form8995a_patron_status_fixture.ts";
import {
  patronWageCases,
  patronWageFixture,
} from "../../domains/deductions/business/form8995a/form8995a_patron_wages_fixture.ts";
import {
  patronInvestmentCases,
  patronInvestmentFixture,
} from "../../domains/deductions/business/form8995a/form8995a_patron_investments_fixture.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { spouseOwnedPatronFixture } from "../../pdf/reviews/general/composed-returns/review-8995a-patron-joint.fixture.ts";
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

test("Patron saved returns preserve all 58 source packets in mixed submission archives", async () => {
  const evidence = process.env.PATRON_SUBMISSION_EVIDENCE;
  if (evidence) await fs.mkdir(evidence, { recursive: true });
  const kinds = [
    "farm",
    "c-health",
    "income-cap",
    "phase-farm",
    "phase-c-health",
    "phase-income-cap",
    "phase-unbound",
  ];
  const fixture = (id: string) => {
    const found = pdfReviewFixtures.find((f) => f.id === id);
    assert(found, id);
    return structuredClone(found);
  };
  const cases = [
    ...patronStatusCases.map((c) => ({
      name: c.name,
      input: patronStatusFixture(c),
    })),
    ...kinds.map((kind) => ({
      name: `single-${kind}`,
      input: fixture(`single-form8995a-patron-${kind}`).inputs,
    })),
    ...["farm", "c-health", "income-cap"].flatMap((kind) => {
      const primary = fixture(`joint-form8995a-patron-${kind}`);
      return [
        { name: `joint-${kind}`, input: primary.inputs },
        {
          name: `spouse-${kind}`,
          input: spouseOwnedPatronFixture(primary).inputs,
        },
      ];
    }),
  ];
  cases.push(
    ...patronWageCases.map((c) => ({
      name: `wages-${c.name}`,
      input: patronWageFixture(c),
    })),
  );
  cases.push(
    ...patronInvestmentCases.map((c) => ({
      name: `investments-${c.name}`,
      input: patronInvestmentFixture(c),
    })),
  );
  assertEquals(cases.length, 58);
  const archives: MefSubmissionArchive[] = [];
  const observations = [];
  let sourceRejected = 0, archiveRejected = 0;
  for (const [i, c] of cases.entries()) {
    // Serial 0000 is never issued (R0000-500-01), so numbering starts at 0001.
    const primary = String(211220001 + i), spouse = String(544550001 + i);
    const input: Row = remap(c.input, primary, spouse);
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
    const review = input.qbi_patron;
    const owner = review.source_1099patr.recipient_tin;
    assertEquals(
      data[
        review.business.kind === "schedule_c"
          ? "IRS1040ScheduleC"
          : "IRS1040ScheduleF"
      ].SSN,
      owner,
    );
    const seCopies = [data.IRS1040ScheduleSE].flat();
    assertEquals(seCopies.length, 1);
    assertEquals(seCopies[0].SSN, owner);
    const stored: Row = prepared.bundle.pending;
    assertEquals(stored.qbi_patron, review);
    assertEquals(stored.f1099patr.f1099patrs, [review.source_1099patr]);
    for (const key of ["form8995a", "form8995a_schedule_d"]) {
      assertEquals(stored[key].patron_business_source.review, review);
      assertEquals(
        stored[key].patron_filing_details.source_1099patr,
        review.source_1099patr,
      );
    }
    assertEquals(stored.form8995a_schedule_d, stored.form8995a);
    assertEquals(
      data.IRS8995A.QualifiedBusinessIncomeDedAmt,
      String(result.pending.f1040.line13_qbi_deduction),
    );
    assert(data.IRS8995AScheduleD);
    const person = (tin: string) => ({
      tin,
      tax_status: "full_year_us_citizen" as const,
      status_source_reference: `Synthetic citizenship ${tin}`,
      reviewer_reference: "Synthetic archive review",
      reviewed_on: "2026-10-12",
    });
    const archive = await buildMefSubmissionArchive(prepared.bundle, {
      filer,
      submissionId: `1234562026285patr${String(i).padStart(3, "0")}`,
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
    });
    for (
      const kind of [
        "payer",
        "recipient",
        "payroll",
        "notice",
        "allocation",
        "owner",
        "deduction",
        "tax",
        "companion",
        ...((c.name.startsWith("wages-") || c.name.startsWith("investments-"))
          ? [
            "wage-owner",
            "wage-ss",
            "wage-medicare",
            "wage-income",
            "wage-withholding",
            "wage-employer",
            "wage-reference",
            "wage-missing",
            ...(input.general.filing_status === "mfj" ? ["wage-swap"] : []),
          ]
          : []),
        ...(c.name.startsWith("investments-")
          ? [
            "interest-owner",
            "dividend-owner",
            "interest-reference",
            "dividend-reference",
            "interest-amount",
            "dividend-amount",
            "qualified-review",
            "capital-distribution",
            "capital-limit",
            "investment-payer",
            "schedule-b",
            "tax-worksheet",
            "niit",
            "niit-interest",
            "niit-dividends",
            "niit-gain",
          ]
          : []),
        ...(input.general.filing_status === "mfs"
          ? [
            "missing-mfs",
            "community-state",
            "mfs-spouse",
            "spouse-itemizing",
            "mail-state",
          ]
          : []),
      ]
    ) {
      const changed: Row = saved(pending);
      const changedReview = changed.qbi_patron;
      const isC = changedReview.business.kind === "schedule_c";
      const container = isC ? changed.schedule_c : changed.schedule_f;
      const business = isC
        ? container.schedule_cs[0]
        : container.schedule_fs[0];
      if (kind === "payer") changedReview.source_1099patr.payer_tin = "bad";
      if (kind === "recipient") {
        changedReview.source_1099patr.recipient_tin = "999001234";
      }
      if (kind === "payroll") {
        changedReview.employee_w2_records[0].eligible_199a_wages++;
      }
      if (kind === "notice") delete changedReview.box6_written_notice_review;
      if (kind === "allocation") {
        changedReview.allocation_worksheet_reference = "";
      }
      if (kind === "owner") {
        business.proprietor_recipient = business.proprietor_recipient === "S"
          ? "P"
          : "S";
      }
      if (kind === "missing-mfs") delete changedReview.mfs_filing_review;
      if (kind === "community-state") {
        changedReview.mfs_filing_review.domicile_state = "CA";
      }
      if (kind === "mfs-spouse") {
        changedReview.mfs_filing_review.spouse_ssn = "999001234";
      }
      if (kind === "spouse-itemizing") {
        changed.general.mfs_spouse_itemizing = true;
        changed.f1040.mfs_spouse_itemizing = true;
      }
      if (kind === "mail-state") {
        changedReview.mfs_filing_review.mailing_address_state = "FL";
      }
      if (kind.startsWith("wage-")) {
        const wageKey = business.proprietor_recipient === "S"
          ? "spouse_w2_sources"
          : "primary_w2_sources";
        const wage = changedReview[wageKey][0];
        if (kind === "wage-owner") wage.employee_ssn = "999001234";
        if (kind === "wage-ss") wage.box3_ss_wages++;
        if (kind === "wage-medicare") wage.box5_medicare_wages++;
        if (kind === "wage-income") wage.box1_wages++;
        if (kind === "wage-withholding") wage.box2_fed_withheld++;
        if (kind === "wage-employer") wage.employer_name = "";
        if (kind === "wage-reference") wage.source_document_reference = "";
        if (kind === "wage-missing") delete changedReview[wageKey];
        if (kind === "wage-swap") {
          [changedReview.primary_w2_sources, changedReview.spouse_w2_sources] =
            [changedReview.spouse_w2_sources, changedReview.primary_w2_sources];
        }
      }
      if (changed.w2?.patron_filing_review) {
        changed.w2.w2s = saved([
          ...changedReview.primary_w2_sources ?? [],
          ...changedReview.spouse_w2_sources ?? [],
        ]);
        changed.w2.patron_filing_review = saved(changedReview);
      }
      container.patron_filing_review = saved(changedReview);
      changed.f1099patr.f1099patrs[0] = saved(changedReview.source_1099patr);
      for (const key of ["form8995a", "form8995a_schedule_d"]) {
        changed[key].patron_business_source.review = saved(changedReview);
        changed[key].patron_business_source.business_source = saved(business);
        const details = changed[key].patron_filing_details;
        details.source_1099patr = saved(changedReview.source_1099patr);
        details.box6_written_notice_review =
          changedReview.box6_written_notice_review;
        details.allocation_worksheet_reference =
          changedReview.allocation_worksheet_reference;
      }
      if (c.name.startsWith("investments-")) {
        const interest = changed.f1099int.f1099ints[0];
        const dividend = changed.f1099div.f1099divs[0];
        if (kind === "interest-owner") interest.recipient_tin = "999001234";
        if (kind === "dividend-owner") dividend.recipient_tin = "999001234";
        if (kind === "interest-reference") {
          interest.source_document_reference = "";
        }
        if (kind === "dividend-reference") {
          dividend.source_document_reference = "";
        }
        if (kind === "interest-amount") interest.box1++;
        if (kind === "dividend-amount") dividend.box1a++;
        if (kind === "qualified-review") {
          delete dividend.qualified_dividend_filing_review;
        }
        if (kind === "capital-distribution") dividend.box2a++;
        if (kind === "investment-payer") interest.payer_tin = "bad";
        for (const key of ["form8995", "form8995a", "form8995a_schedule_d"]) {
          changed[key].investment_interest_sources = structuredClone(
            changed.f1099int.f1099ints,
          );
          changed[key].investment_dividend_sources = structuredClone(
            changed.f1099div.f1099divs,
          );
          if (kind === "dividend-amount") {
            changed[key].investment_dividend_totals.ordinary++;
          }
          if (kind === "capital-distribution") {
            changed[key].investment_dividend_totals
              .capital_gain_distributions++;
          }
          if (kind === "capital-limit") changed[key].net_capital_gain++;
        }
        if (kind === "schedule-b") changed.schedule_b.interest_rows[0].amount++;
        if (kind === "tax-worksheet") {
          changed.income_tax_calculation.qualified_dividends++;
        }
        if (kind === "niit") changed.form8960.line17_niit++;
        if (kind === "niit-interest") changed.form8960.line1_taxable_interest++;
        if (kind === "niit-dividends") {
          changed.form8960.line2_ordinary_dividends++;
        }
        if (kind === "niit-gain") changed.form8960.line5a_net_gain++;
      }
      if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
      if (kind === "tax") changed.f1040.line24_total_tax++;
      if (kind === "companion") changed.form8995a_schedule_d.qbi++;
      await assertRejects(
        () => f1040_2025.prepareReturn(saved(changed), saved(filer)),
        Error,
        "",
        `${c.name}/${kind}`,
      );
      sourceRejected++;
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
      /<IRS8995AScheduleD documentId="([^"]+)"/.exec(target.bundle.xml)![1];
    const parentId =
      /<IRS8995A documentId="([^"]+)"/.exec(target.bundle.xml)![1];
    for (
      const xml of [
        target.bundle.xml.replace(
          `documentId="${scheduleId}"`,
          `documentId="${parentId}"`,
        ),
        target.bundle.xml.replace(
          `<IRS8995AScheduleD documentId="${scheduleId}"`,
          `<IRS8995AScheduleD documentId="${scheduleId}" referenceDocumentId="missing-document"`,
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
  assertEquals(sourceRejected, 969);
  assertEquals(archiveRejected, 421);
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
