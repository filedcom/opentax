import { assert, assertEquals, assertThrows } from "@std/assert";
import { unzipSync, zipSync } from "fflate";
import { f1040_2025 } from "../../index.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { sha256Hex } from "../../return-processing/prepared-source.ts";
import {
  buildMefSubmissionArchive,
  buildMefTransmissionPackage,
  type MefSubmissionArchive,
} from "./submission-archive.ts";

Deno.test("complete return batch isolates same-name generated statements by filer and submission", async () => {
  const base = pdfReviewFixtures.find((f) =>
    f.id === "single-form5695-door-and-air-conditioner"
  )!;
  const archives: MefSubmissionArchive[] = [];
  let evidence: string | undefined;
  try {
    evidence = Deno.env.get("SUBMISSION_BATCH_EVIDENCE");
  } catch {
    /* Evidence retention is optional under restricted test permissions. */
  }
  if (evidence) await Deno.mkdir(evidence, { recursive: true });
  const processingDate = new Date("2026-10-10T08:00:00Z");
  const ids = [
    "1234562026283batch01",
    "1234562026283batch02",
    "1234562026283batch03",
  ];
  const tins = ["111223333", "222334444", "333445555"];
  for (let index = 0; index < ids.length; index++) {
    // Synthetic source families are distinct; no real identity or authentication is claimed.
    const inputs = structuredClone(base.inputs) as any;
    inputs.general.taxpayer_ssn = tins[index];
    inputs.w2[0].employee_ssn = tins[index];
    inputs.f5695.part_ii_section_a.exterior_doors = Array.from(
      { length: 4 + index },
      (_, door) => ({ cost: 500 + index * 100, qmid: `A${index}B${door}` }),
    );
    const filer = {
      ...base.filer,
      primarySSN: tins[index],
      softwareId: "12345678",
      originator: { efin: "123456", originatorType: "ERO" as const },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(prepared.bundle.attachments.length, 1);
    assertEquals(
      prepared.bundle.attachments[0].fileName,
      "AdditionalQMIDStatement.pdf",
    );
    const archive = await buildMefSubmissionArchive(prepared.bundle, {
      filer,
      submissionId: ids[index],
      processingDate,
      residencyReview: {
        tax_year: 2025,
        taxpayer: {
          tin: tins[index],
          tax_status: "full_year_us_citizen",
          status_source_reference: `Synthetic citizen record ${index}`,
          reviewer_reference: "Synthetic batch review",
          reviewed_on: "2026-10-10",
        },
      },
    });
    archives.push(archive);
    if (evidence) {
      await Deno.writeFile(`${evidence}/${index}.zip`, archive.bytes);
      await Deno.writeTextFile(`${evidence}/${index}.xml`, archive.bundle.xml);
      await Deno.writeTextFile(
        `${evidence}/${index}-manifest.xml`,
        archive.manifestXml,
      );
      await Deno.writeTextFile(
        `${evidence}/${index}.json`,
        JSON.stringify(
          { inputs, filer, pending: archive.bundle.pending },
          null,
          2,
        ),
      );
    }
  }
  const statementName = "attachment/AdditionalQMIDStatement.pdf";
  const statements = archives.map((a) => unzipSync(a.bytes)[statementName]);
  assertEquals(new Set(await Promise.all(statements.map(sha256Hex))).size, 3);

  for (const order of [archives, [...archives].reverse()]) {
    const transmission = buildMefTransmissionPackage(
      order.map((archive) => ({ archive })),
    );
    if (evidence) {
      const prefix = order === archives ? "forward" : "reverse";
      await Deno.writeFile(
        `${evidence}/${prefix}.zip`,
        transmission.containerZipBytes,
      );
      await Deno.writeTextFile(
        `${evidence}/${prefix}.xml`,
        transmission.sendSubmissionsRequestXml,
      );
    }
    const container = unzipSync(transmission.containerZipBytes);
    assertEquals(Object.keys(container), order.map((a) => a.fileName));
    assertEquals(
      [...transmission.sendSubmissionsRequestXml.matchAll(
        /<SubmissionId>([^<]+)<\/SubmissionId>/g,
      )]
        .map((m) => m[1]),
      order.map((a) => a.submissionId),
    );
    for (const archive of order) {
      assertEquals(container[archive.fileName], archive.bytes);
      const inner = unzipSync(container[archive.fileName]);
      assertEquals(inner[statementName], archive.bundle.attachments[0].bytes);
      assertEquals(
        new TextDecoder().decode(inner["xml/submission.xml"]),
        '<?xml version="1.0" encoding="UTF-8"?>\n' + archive.bundle.xml,
      );
      assert(
        archive.bundle.xml.includes(
          `<PrimarySSN>${archive.filer.primarySSN}</PrimarySSN>`,
        ),
      );
    }
  }

  for (let index = 0; index < archives.length; index++) {
    const target = archives[index],
      donor = archives[(index + 1) % archives.length];
    const packageAltered = (altered: MefSubmissionArchive) =>
      buildMefTransmissionPackage(
        archives.map((archive, i) => ({
          archive: i === index ? altered : archive,
        })),
      );
    for (
      const name of [
        statementName,
        "xml/submission.xml",
        "manifest/manifest.xml",
      ]
    ) {
      const entries = unzipSync(target.bytes);
      entries[name] = unzipSync(donor.bytes)[name];
      assertThrows(() =>
        packageAltered({ ...target, bytes: zipSync(entries) })
      );
    }
    assertThrows(() => packageAltered({ ...target, filer: donor.filer }));
    assertThrows(() => packageAltered({ ...target, bundle: donor.bundle }));
    assertThrows(() =>
      packageAltered({ ...target, residencyReview: donor.residencyReview })
    );
  }
});
