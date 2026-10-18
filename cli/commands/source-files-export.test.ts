import { test } from "bun:test";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { assertEquals } from "@std/assert";
import { unzipSync } from "fflate";
import * as sys from "../../scripts/support/sys.ts";
import { signed } from "../../scripts/testing/mef.ts";
import { sha256Hex } from "../../forms/f1040/2025/return-processing/prepared-source.ts";
import {
  scenario104002Attachments,
  scenario104002Input,
} from "../../forms/f1040/e2e/ats/scenario_1040_02_input.ts";
import {
  ATS_SUBMISSION_TRANSMITTER,
  atsResidencyReview,
} from "../../forms/f1040/e2e/ats/ty2025-submission.ts";
import { loadInputs } from "../store/store.ts";
import { exportMefSubmissionCommand } from "./export.ts";
import { formAddCommand } from "./form.ts";
import { createReturnCommand } from "./return.ts";
import { attachSourceFileCommand } from "./return-source-files.ts";

type Issuer = { file_name: string; pdf_sha256: string; bytes: Uint8Array };

test("binary source files reach the submission ZIP through form add and the store", async () => {
  const baseDir = await sys.makeTempDir();
  try {
    const inputs = signed(await scenario104002Input());
    const [statement] = await scenario104002Attachments();
    const [mortgage] = inputs.f1098 as { issuer_copy: Issuer }[];
    const issuer = mortgage.issuer_copy;
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    const returnPath = join(baseDir, returnId);

    const upload = join(baseDir, "upload.pdf");
    await fs.writeFile(upload, issuer.bytes);
    await attachSourceFileCommand({
      returnId,
      baseDir,
      file: upload,
      reference: issuer.file_name,
    });
    await fs.writeFile(upload, statement.bytes);
    await attachSourceFileCommand({
      returnId,
      baseDir,
      file: upload,
      name: statement.fileName,
      description: statement.description,
    });

    // What a user types: the 1098 copy's bytes name the retained file.
    const typed = {
      ...inputs,
      f1098: [{
        ...mortgage,
        issuer_copy: { ...issuer, bytes: { retained: issuer.file_name } },
      }],
    };
    for (const [nodeType, value] of Object.entries(typed)) {
      for (const fields of Array.isArray(value) ? value : [value]) {
        await formAddCommand({
          returnId,
          baseDir,
          nodeType,
          dataJson: JSON.stringify(fields),
        });
      }
    }
    const [f1098] = (await loadInputs(returnPath)).f1098;
    assertEquals(
      (f1098.fields.issuer_copy as { bytes: unknown }).bytes,
      { sha256: issuer.pdf_sha256 },
    );

    await fs.writeFile(
      join(returnPath, "residency-review.json"),
      JSON.stringify(atsResidencyReview(inputs)),
    );
    const summary = await exportMefSubmissionCommand({
      returnId,
      baseDir,
      efin: ATS_SUBMISSION_TRANSMITTER.efin,
      softwareId: ATS_SUBMISSION_TRANSMITTER.softwareId,
      processingDate: ATS_SUBMISSION_TRANSMITTER.processingDate,
      sequence: "cli0001",
    });
    const entries = unzipSync(new Uint8Array(await fs.readFile(summary.path)));
    const packaged = entries[`attachment/${statement.fileName}`];
    assertEquals(packaged, statement.bytes);
    assertEquals(await sha256Hex(packaged), await sha256Hex(statement.bytes));
    const xml = new TextDecoder().decode(entries["xml/submission.xml"]);
    assertEquals(xml.includes(statement.description), true);
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
}, 120_000);
