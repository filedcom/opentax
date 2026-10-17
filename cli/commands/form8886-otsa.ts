import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { sha256Hex } from "../../forms/f1040/2025/return-processing/prepared-source.ts";
import { dirname, join } from "node:path";
import {
  emittedValidationScope,
  type ExportReturnArgs,
  prepareWithSourceFiles,
  runReturnPipeline,
  validateBusinessRules,
} from "./export.ts";
import {
  otsaDeliveryRequestSchema,
  otsaExportRequestSchema,
  prepareForm8886OtsaDeliveryRecord,
  prepareForm8886OtsaExport,
} from "../../forms/f1040/2025/domains/general/filing/form8886/otsa-export.ts";

async function prepareExport(
  args: ExportReturnArgs & {
    readonly requestsPath: string;
    readonly outputDir?: string;
  },
  preparationTimestamp?: string,
) {
  if (args.draft) {
    throw new Error("OTSA exact-copy export does not accept draft output");
  }
  const request = otsaExportRequestSchema.parse(
    JSON.parse(await readFile(args.requestsPath, "utf8")),
  );
  const pipeline = await runReturnPipeline(args);
  const { pending, def } = pipeline;
  const filer = pipeline.filer && preparationTimestamp
    ? { ...pipeline.filer, timestamp: preparationTimestamp }
    : pipeline.filer;
  if (!filer) throw new Error("OTSA export requires the return filer");
  const prepared = await prepareWithSourceFiles(args, pending, def, filer);
  validateBusinessRules(
    pending,
    filer,
    args.force,
    emittedValidationScope(prepared.bundle.xml),
  );
  const exported = await prepareForm8886OtsaExport(
    prepared.bundle,
    filer,
    request,
  );
  return exported;
}

export async function exportForm8886OtsaCommand(
  args: ExportReturnArgs & {
    readonly requestsPath: string;
    readonly outputDir?: string;
  },
) {
  const exported = await prepareExport(args);
  const outputDir = args.outputDir ??
    join(args.baseDir, args.returnId, "otsa-export");
  await mkdir(dirname(outputDir), { recursive: true });
  // Exclusive directory creation preserves prior exports and their delivery bindings.
  await mkdir(outputDir, { mode: 0o700 });
  for (const file of exported.files) {
    await writeFile(join(outputDir, file.name), file.bytes, {
      flag: "wx",
      mode: 0o600,
    });
  }
  const manifestPath = join(outputDir, "manifest.json");
  // This completion marker is written only after every referenced artifact.
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        ...exported.manifest,
        business_rule_force_requested: args.force === true,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return {
    outputDir,
    manifestPath,
    status: exported.manifest.status,
    copies: exported.manifest.copies.length,
    delivered: false,
  };
}

/** Retain operator-reviewed evidence; this command neither sends nor authenticates an IRS acknowledgment. */
export async function recordForm8886OtsaDeliveryCommand(
  args: ExportReturnArgs & {
    readonly requestsPath: string;
    readonly exportDir: string;
    readonly recordPath: string;
    readonly evidencePath: string;
    readonly outputDir: string;
  },
) {
  const request = otsaDeliveryRequestSchema.parse(
    JSON.parse(await readFile(args.recordPath, "utf8")),
  );
  const evidence = new Uint8Array(await readFile(args.evidencePath));
  const manifestBytes = new Uint8Array(
    await readFile(join(args.exportDir, "manifest.json")),
  );
  // Retain the exact original preparation instant, including source-bound milliseconds.
  // All other manifest fields and every retained file are compared with the regenerated export below.
  const retained = z.object({ preparation_timestamp: z.string().datetime() })
    .passthrough().parse(
      JSON.parse(new TextDecoder().decode(manifestBytes)),
    );
  const exported = await prepareExport(args, retained.preparation_timestamp);
  const expectedManifest = JSON.stringify(
    {
      ...exported.manifest,
      business_rule_force_requested: args.force === true,
    },
    null,
    2,
  ) + "\n";
  if (new TextDecoder().decode(manifestBytes) !== expectedManifest) {
    throw new Error(
      "Retained OTSA manifest differs from the regenerated return and handoff requests",
    );
  }
  for (const file of exported.files) {
    const retained = new Uint8Array(
      await readFile(join(args.exportDir, file.name)),
    );
    if (
      await sha256Hex(retained) !== exported.manifest.file_sha256[file.name]
    ) {
      throw new Error(
        "Retained OTSA export file differs from its prepared digest",
      );
    }
  }
  const receipt = await prepareForm8886OtsaDeliveryRecord(
    exported,
    request,
    evidence,
  );
  await mkdir(dirname(args.outputDir), { recursive: true });
  await mkdir(args.outputDir, { mode: 0o700 });
  await writeFile(join(args.outputDir, "evidence.bin"), evidence, {
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(
    join(args.outputDir, "export-manifest.json"),
    manifestBytes,
    { flag: "wx", mode: 0o600 },
  );
  const receiptPath = join(args.outputDir, "delivery.json");
  await writeFile(
    receiptPath,
    JSON.stringify(
      {
        ...receipt,
        export_manifest_sha256: await sha256Hex(manifestBytes),
        evidence_file: "evidence.bin",
        business_rule_force_requested: args.force === true,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return { receiptPath, status: receipt.status, irs_acceptance: false };
}
