/** Offline ATS acceptance proxy: the export pipeline, rule report and v5.4 XSD. */
import * as fs from "node:fs/promises";
import { join } from "node:path";
import * as sys from "../../../../scripts/support/sys.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import {
  businessRuleReport,
  emittedValidationScope,
  exportMefCommand,
} from "../../../../cli/commands/export.ts";
import { createReturnCommand } from "../../../../cli/commands/return.ts";
import {
  type AttachSourceFileArgs,
  attachSourceFileCommand,
  detachInlineBytes,
} from "../../../../cli/commands/return-source-files.ts";
import { appendInput } from "../../../../cli/store/store.ts";
import { f1040_2025 } from "../../2025/index.ts";
import type { MefPdfAttachment } from "../../2025/mef/form-descriptor.ts";
import { normalizeAllPending } from "../../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";

export type RetainedDocument = {
  readonly document_reference: string;
  readonly bytes: Uint8Array;
};

export const RETURN_1040_XSD = new URL(
  "../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

export const SUBMISSION_MANIFEST_XSD = new URL(
  "../../../../irs/mef/2025v5.4/Common/efileAttachments.xsd",
  import.meta.url,
).pathname;

export async function xsdAvailable(
  xsd: string = RETURN_1040_XSD,
): Promise<boolean> {
  return await fs.stat(xsd).then(() => true, () => false);
}

/** Build the return as export does; reject-level rule ids, sorted. */
export async function exportedReturn(
  inputs: Record<string, unknown>,
  attachments: readonly MefPdfAttachment[] = [],
  retained: readonly RetainedDocument[] = [],
) {
  const result = f1040_2025.executeReturn(signed(inputs));
  if (result.diagnostics.length > 0) {
    throw new Error(
      result.diagnostics.map((d) => `${d.nodeType}: ${d.message}`).join("\n"),
    );
  }
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  const { bundle } = await f1040_2025.prepareReturn(
    pending,
    filer,
    attachments,
    retained,
  );
  const rejects = businessRuleReport(
    pending,
    filer,
    emittedValidationScope(bundle.xml),
  ).entries.filter((e) =>
    e.severity === "reject" || e.severity === "reject_and_stop"
  ).map((e) => e.ruleNumber).sort();
  return { result, xml: bundle.xml, rejects };
}

/** xmllint against an official TY2025 v5.4 schema, Return1040.xsd by default. */
export async function validateAgainstXsd(
  xml: string | Uint8Array,
  xsd: string = RETURN_1040_XSD,
): Promise<string> {
  const path = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(path, xml);
    const output = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    const stderr = new TextDecoder().decode(output.stderr);
    if (output.code !== 0) throw new Error(stderr);
    return stderr;
  } finally {
    await sys.remove(path);
  }
}

/** Save the fixture as a CLI return with its files, then export MeF without --force. */
export async function cliExport(
  inputs: Record<string, unknown>,
  attachments: readonly MefPdfAttachment[] = [],
  retained: readonly RetainedDocument[] = [],
): Promise<string> {
  return await withCliReturn(
    inputs,
    attachments,
    retained,
    (returnId, baseDir) => exportMefCommand({ returnId, baseDir }),
  );
}

/** Save the fixture as a CLI return in `baseDir` with its attachments and retained copies. */
export async function saveCliReturn(
  baseDir: string,
  inputs: Record<string, unknown>,
  attachments: readonly MefPdfAttachment[],
  retained: readonly RetainedDocument[],
): Promise<string> {
  const { returnId } = await createReturnCommand({ year: 2025, baseDir });
  const returnPath = join(baseDir, returnId);
  const detached = detachInlineBytes(signed(inputs));
  for (
    const [nodeType, value] of Object.entries(
      detached.value as Record<string, unknown>,
    )
  ) {
    for (const fields of Array.isArray(value) ? value : [value]) {
      await appendInput(returnPath, nodeType, fields);
    }
  }
  const source = await sys.makeTempFile();
  try {
    const attach = async (
      bytes: Uint8Array,
      file: Omit<AttachSourceFileArgs, "returnId" | "baseDir" | "file">,
    ) => {
      await fs.writeFile(source, bytes);
      await attachSourceFileCommand({
        returnId,
        baseDir,
        file: source,
        ...file,
      });
    };
    for (const a of attachments) {
      await attach(a.bytes, { name: a.fileName, description: a.description });
    }
    for (const d of retained) {
      await attach(d.bytes, { reference: d.document_reference });
    }
    for (const [sha256, bytes] of detached.files) {
      await attach(bytes, { reference: `inline-${sha256}` });
    }
  } finally {
    await sys.remove(source);
  }
  return returnId;
}

/** Run `fn` against the fixture saved as a temporary CLI return with its files. */
export async function withCliReturn<T>(
  inputs: Record<string, unknown>,
  attachments: readonly MefPdfAttachment[],
  retained: readonly RetainedDocument[],
  fn: (returnId: string, baseDir: string) => Promise<T>,
): Promise<T> {
  const baseDir = await sys.makeTempDir();
  try {
    return await fn(
      await saveCliReturn(baseDir, inputs, attachments, retained),
      baseDir,
    );
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
}
