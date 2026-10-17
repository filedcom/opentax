import { test } from "bun:test";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import * as sys from "../../scripts/support/sys.ts";
import { createReturnCommand } from "./return.ts";
import {
  attachSourceFileCommand,
  detachInlineBytes,
  loadReturnSourceFiles,
  namedSourceFiles,
  resolveSourceBytes,
  withMissingSourceFiles,
} from "./return-source-files.ts";

const pending = {
  f8978: {
    reviewed_source: {
      documents: [{
        document_reference: "filing1-record1",
        attachment_file_name: "Record1.pdf",
        sha256: "a".repeat(64),
      }],
    },
  },
  form8839_route: {
    public_source: {
      documents: [{ file_name: "decree-1.pdf", description: "Final decree" }],
    },
  },
  general: {
    prior_ctc_disallowance_review: {
      notice_copy_reference: "CTC notice copy",
      notice_copy_sha256: "b".repeat(64),
    },
  },
  f4852: {
    records: [{
      completed_form: {
        document_reference: "4852-101",
        sha256: "c".repeat(64),
      },
    }],
  },
  w2: [{ source_document_reference: "not a retained copy" }],
};

async function withReturn(
  run: (
    dirs: { baseDir: string; returnId: string; returnPath: string },
  ) => Promise<void>,
) {
  const baseDir = await sys.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({ year: 2025, baseDir });
    await run({ baseDir, returnId, returnPath: join(baseDir, returnId) });
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
}

test("the inputs name attachment files and retained references", () => {
  const named = namedSourceFiles(pending);
  assertEquals([...named.attachments], [
    ["Record1.pdf", undefined],
    ["decree-1.pdf", "Final decree"],
  ]);
  assertEquals([...named.retained].sort(), ["4852-101", "CTC notice copy"]);
});

test("present files are offered and absent ones are reported with their path", async () => {
  await withReturn(async ({ baseDir, returnId, returnPath }) => {
    const source = join(baseDir, "upload.pdf");
    await fs.writeFile(source, "%PDF-1.7 record");
    await attachSourceFileCommand({
      returnId,
      baseDir,
      file: source,
      name: "Record1.pdf",
      description: "Form8978 filing1 source1",
    });
    await fs.mkdir(join(returnPath, "retained"));
    await fs.writeFile(join(returnPath, "retained", "4852-101"), "workpaper");
    const files = await loadReturnSourceFiles(returnPath, pending);
    assertEquals(
      files.attachments.map((a) => [a.fileName, a.description]),
      [["Record1.pdf", "Form8978 filing1 source1"]],
    );
    assertEquals(files.retained.map((d) => d.document_reference), [
      "4852-101",
    ]);
    assertEquals(files.missing, [
      join(returnPath, "attachments", "decree-1.pdf"),
      join(returnPath, "retained", "CTC notice copy"),
    ]);
    const error = withMissingSourceFiles(
      new Error("Form 8839 needs the reviewed PDF attachment decree-1.pdf"),
      files.missing,
    );
    assertStringIncludes(error.message, "decree-1.pdf\n\nThe return names");
    assertStringIncludes(
      error.message,
      `  ${join(returnPath, "attachments", "decree-1.pdf")}`,
    );
  });
});

test("an attachment without a recorded description uses the one the inputs name", async () => {
  await withReturn(async ({ baseDir, returnId, returnPath }) => {
    const source = join(baseDir, "decree-1.pdf");
    await fs.writeFile(source, "%PDF-1.7 decree");
    const attached = await attachSourceFileCommand({
      returnId,
      baseDir,
      file: source,
    });
    assertEquals(attached.description, undefined);
    const files = await loadReturnSourceFiles(returnPath, pending);
    assertEquals(
      files.attachments.find((a) => a.fileName === "decree-1.pdf")
        ?.description,
      "Final decree",
    );
  });
});

test("a retained reference that cannot name a file is stored under a digest name", async () => {
  await withReturn(async ({ baseDir, returnId, returnPath }) => {
    const source = join(baseDir, "notice.txt");
    await fs.writeFile(source, "notice");
    const attached = await attachSourceFileCommand({
      returnId,
      baseDir,
      file: source,
      reference: "IRS/2023/notice",
    });
    assertStringIncludes(
      attached.path,
      join(returnPath, "retained", "retained-"),
    );
    const files = await loadReturnSourceFiles(returnPath, {
      general: {
        review: {
          notice_copy_reference: "IRS/2023/notice",
          notice_copy_sha256: "d".repeat(64),
        },
      },
    });
    assertEquals(files.retained.map((d) => d.document_reference), [
      "IRS/2023/notice",
    ]);
    assertEquals(files.missing, []);
  });
});

test("attach rejects names MeF cannot carry and descriptions on retained copies", async () => {
  await withReturn(async ({ baseDir, returnId }) => {
    const source = join(baseDir, "a.pdf");
    await fs.writeFile(source, "%PDF-1.7");
    await assertRejects(
      () =>
        attachSourceFileCommand({
          returnId,
          baseDir,
          file: source,
          name: "bad;name.pdf",
        }),
      Error,
      "MeF PDF name",
    );
    await assertRejects(
      () =>
        attachSourceFileCommand({
          returnId,
          baseDir,
          file: source,
          reference: "copy",
          description: "x",
        }),
      Error,
      "apply to attachments",
    );
    await assertRejects(
      () =>
        attachSourceFileCommand({
          returnId: "missing",
          baseDir,
          file: source,
        }),
      Error,
      "Return not found",
    );
  });
});

test("inline source bytes are stored as digests and resolved from retained/", async () => {
  await withReturn(async ({ returnPath }) => {
    const bytes = new TextEncoder().encode("issuer copy");
    const detached = detachInlineBytes({
      f1098: [{ issuer_copy: { file_name: "copy.pdf", bytes } }],
    });
    const [[sha256]] = [...detached.files];
    assertEquals(JSON.parse(JSON.stringify(detached.value)), {
      f1098: [{ issuer_copy: { file_name: "copy.pdf", bytes: { sha256 } } }],
    });
    await assertRejects(
      () => resolveSourceBytes(returnPath, detached.value),
      Error,
      `No file in ${join(returnPath, "retained")} has SHA-256 ${sha256}`,
    );
    await fs.mkdir(join(returnPath, "retained"));
    await fs.writeFile(join(returnPath, "retained", "any-name"), bytes);
    const resolved = await resolveSourceBytes(returnPath, detached.value);
    assertEquals(resolved, {
      f1098: [{ issuer_copy: { file_name: "copy.pdf", bytes } }],
    });
    await assertRejects(
      () =>
        resolveSourceBytes(returnPath, {
          f1098: [{ issuer_copy: { bytes: { retained: "absent.pdf" } } }],
        }),
      Error,
      `Missing source file ${join(returnPath, "retained", "absent.pdf")}`,
    );
  });
});
