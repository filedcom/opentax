import { join } from "@std/path";
import { z } from "zod";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { form8582 as native8582 } from "../../forms/f1040/2025/mef/forms/income/business/f8582/f8582.ts";
import {
  buildForm8582Ledger,
  form8582LedgerSchema,
} from "../../forms/f1040/nodes/intermediate/forms/income/business/form8582/ledger.ts";
import { singletonPublicInputKeys } from "./public-input-keys.ts";
import { buildEngineInputs, loadReturn } from "./store.ts";

const candidateSchema = z.object({
  recordVersion: z.literal(1),
  status: z.literal("acceptance-unverified"),
  recordId: z.string().uuid(),
  returnId: z.string().uuid(),
  taxYear: z.literal(2025),
  taxpayerSsn: z.string().regex(/^\d{9}$/),
  declaredAcceptedReturnReference: z.string().trim().min(1),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/),
  nativeForm8582Sha256: z.string().regex(/^[0-9a-f]{64}$/),
  ledger: form8582LedgerSchema,
}).strict();

export type Form8582LedgerCandidate = z.infer<typeof candidateSchema>;
const encoder = new TextEncoder();

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

async function calculateCandidate(
  returnPath: string,
  recordId: string,
  declaredReference: string,
) {
  const { meta, inputs } = await loadReturn(returnPath);
  if (meta.year !== 2025 || (meta.formType ?? "f1040") !== "f1040") {
    throw new Error("Form 8582 ledger candidate needs a TY2025 Form 1040");
  }
  const result = f1040_2025.executeReturn(
    buildEngineInputs(inputs, singletonPublicInputKeys(f1040_2025)),
  );
  if (result.diagnostics.length > 0) {
    throw new Error("Form 8582 ledger candidate source return has errors");
  }
  const pending = normalizeAllPending(result.pending);
  // Use the registered source-reconciling projector before recording a ledger.
  // This checks entered facts; neither it nor a reference authenticates filing.
  const xml = native8582.build(pending.form8582, { pending });
  if (!xml) {
    throw new Error("Form 8582 ledger candidate has no native worksheet");
  }
  const sourceBytes = encoder.encode(JSON.stringify({ meta, inputs }));
  const xmlBytes = encoder.encode(xml);
  const record = candidateSchema.parse({
    recordVersion: 1,
    status: "acceptance-unverified",
    recordId,
    returnId: meta.returnId,
    taxYear: 2025,
    taxpayerSsn: pending.general.taxpayer_ssn,
    declaredAcceptedReturnReference: declaredReference,
    sourceSha256: await sha256(sourceBytes),
    nativeForm8582Sha256: await sha256(xmlBytes),
    ledger: buildForm8582Ledger(pending.form8582, declaredReference),
  });
  return { record, sourceBytes, xmlBytes };
}

async function writeSynced(path: string, bytes: Uint8Array) {
  const file = await Deno.open(path, {
    createNew: true,
    write: true,
    mode: 0o600,
  });
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const count = await file.write(bytes.subarray(offset));
      if (count === 0) {
        throw new Error("Form 8582 snapshot write made no progress");
      }
      offset += count;
    }
    await file.sync();
  } finally {
    file.close();
  }
}

/** Immutable, source-bound candidate archive. It never marks IRS acceptance,
 * changes return inputs, or authorizes a next-year carryover import. */
export async function archiveForm8582LedgerCandidate(
  baseDir: string,
  returnId: string,
  declaredAcceptedReturnReference: string,
): Promise<Form8582LedgerCandidate> {
  z.string().uuid().parse(returnId);
  const returnPath = join(baseDir, returnId);
  const data = await calculateCandidate(
    returnPath,
    crypto.randomUUID(),
    declaredAcceptedReturnReference,
  );
  if (data.record.returnId !== returnId) {
    throw new Error("Form 8582 ledger return ID differs from directory");
  }
  const root = join(returnPath, "form8582-ledger-candidates");
  await Deno.mkdir(root, { recursive: true, mode: 0o700 });
  const staging = join(root, `.staging-${crypto.randomUUID()}`);
  await Deno.mkdir(staging, { mode: 0o700 });
  try {
    await writeSynced(join(staging, "source.json"), data.sourceBytes);
    await writeSynced(join(staging, "form8582.xml"), data.xmlBytes);
    await writeSynced(
      join(staging, "record.json"),
      encoder.encode(JSON.stringify(data.record, null, 2)),
    );
    await Deno.rename(staging, join(root, data.record.recordId));
  } catch (error) {
    await Deno.remove(staging, { recursive: true }).catch(() => {});
    throw error;
  }
  return data.record;
}

/** Recheck exact archived bytes and recompute from the current source return.
 * A historical snapshot remains retained when edited inputs invalidate it. */
export async function readForm8582LedgerCandidate(
  baseDir: string,
  returnId: string,
  recordId: string,
  declaredAcceptedReturnReference: string,
): Promise<Form8582LedgerCandidate> {
  z.string().uuid().parse(returnId);
  z.string().uuid().parse(recordId);
  const returnPath = join(baseDir, returnId);
  const path = join(returnPath, "form8582-ledger-candidates", recordId);
  const stored = candidateSchema.parse(
    JSON.parse(await Deno.readTextFile(join(path, "record.json"))),
  );
  const sourceBytes = await Deno.readFile(join(path, "source.json"));
  const xmlBytes = await Deno.readFile(join(path, "form8582.xml"));
  const expected = await calculateCandidate(
    returnPath,
    recordId,
    declaredAcceptedReturnReference,
  );
  if (
    expected.record.returnId !== returnId ||
    stored.sourceSha256 !== await sha256(sourceBytes) ||
    stored.nativeForm8582Sha256 !== await sha256(xmlBytes) ||
    JSON.stringify(stored) !== JSON.stringify(expected.record)
  ) {
    throw new Error(
      "Form 8582 ledger candidate differs from archived or current sources",
    );
  }
  return stored;
}
