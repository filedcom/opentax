import { join } from "@std/path";
import { z } from "zod";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import {
  form8990WorkpaperSchema,
  reconcileForm8990Projection,
} from "../../forms/f1040/2025/form8990_projection.ts";
import {
  buildEngineInputs,
  loadForm8990CalculatedWorkpaper,
  loadReturn,
  saveForm8990CalculatedWorkpaper,
} from "./store.ts";
import type { Form8990CalculatedWorkpaperRecord } from "./types.ts";

const recordSchema = z.object({
  recordVersion: z.literal(1),
  status: z.literal("calculated-unfiled"),
  returnId: z.string().uuid(),
  taxpayerSsn: z.string().min(1),
  sourceRecordsSha256: z.string().regex(/^[0-9a-f]{64}$/),
  form8990Line31: z.number().int().finite().nonnegative(),
  workpaper: form8990WorkpaperSchema,
}).strict();

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(
        ([key, nested]) => [key, ordered(nested)],
      ),
    );
  }
  return value;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(ordered(value)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function calculateRecord(
  returnPath: string,
): Promise<Form8990CalculatedWorkpaperRecord> {
  const { meta, inputs } = await loadReturn(returnPath);
  if (meta.year !== 2025 || (meta.formType ?? "f1040") !== "f1040") {
    throw new Error("Form 8990 calculated workpaper needs a TY2025 Form 1040");
  }
  const singletonNodeTypes = new Set(
    f1040_2025.inputNodes.filter((entry) => !entry.isArray).map((entry) =>
      entry.node.nodeType
    ),
  );
  const engineInputs = buildEngineInputs(inputs, singletonNodeTypes);
  if (engineInputs.form8990 === undefined) {
    throw new Error("Form 8990 calculated workpaper needs source records");
  }
  const result = f1040_2025.executeReturn(engineInputs);
  if (
    result.diagnostics.length !== 1 ||
    result.diagnostics[0].nodeType !== "form8990" ||
    !result.diagnostics[0].message.includes("durably persisted")
  ) {
    throw new Error("Form 8990 workpaper source return has other errors");
  }
  const pending = f1040_2025.buildPending(result.pending);
  const projected = reconcileForm8990Projection(
    pending.form8990,
    pending,
  );
  const taxpayerSsn = z.object({ taxpayer_ssn: z.string().min(1) })
    .passthrough().parse(projected.sourceRecords.returnInputs.general)
    .taxpayer_ssn;
  if (
    projected.nextYearCarryforward.sourceLine31 !== projected.line31 ||
    projected.nextYearCarryforward.targetLine2 !== projected.line31
  ) {
    throw new Error("Form 8990 calculated workpaper does not reconcile");
  }
  return recordSchema.parse({
    recordVersion: 1,
    status: "calculated-unfiled",
    returnId: meta.returnId,
    taxpayerSsn,
    sourceRecordsSha256: await sha256(projected.sourceRecords),
    form8990Line31: projected.line31,
    workpaper: projected.nextYearCarryforward,
  });
}

/** Explicit calculated-workpaper write. It is not an IRS filing event. */
export async function persistCalculatedForm8990Workpaper(
  baseDir: string,
  returnId: string,
): Promise<Form8990CalculatedWorkpaperRecord> {
  const returnPath = join(baseDir, returnId);
  const record = await calculateRecord(returnPath);
  if (record.returnId !== returnId) {
    throw new Error("Form 8990 workpaper return ID differs from directory");
  }
  await saveForm8990CalculatedWorkpaper(returnPath, record);
  return record;
}

/** Read only when the saved source hash and all calculated lines still match. */
export async function readCalculatedForm8990Workpaper(
  baseDir: string,
  returnId: string,
): Promise<Form8990CalculatedWorkpaperRecord> {
  const returnPath = join(baseDir, returnId);
  const stored = recordSchema.parse(
    await loadForm8990CalculatedWorkpaper(returnPath),
  );
  const expected = await calculateRecord(returnPath);
  if (
    expected.returnId !== returnId ||
    JSON.stringify(ordered(stored)) !== JSON.stringify(ordered(expected))
  ) {
    throw new Error("Form 8990 saved workpaper differs from current sources");
  }
  return stored;
}
