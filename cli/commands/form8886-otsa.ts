import { z } from "zod";
import { sha256Hex } from "../../forms/f1040/2025/return-processing/prepared-source.ts";
import { dirname, join } from "@std/path";
import {
  emittedValidationScope,
  type ExportReturnArgs,
  runReturnPipeline,
  validateBusinessRules,
} from "./export.ts";
import { loadForm8839Attachments } from "./form8839-attachments.ts";
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
    JSON.parse(await Deno.readTextFile(args.requestsPath)),
  );
  const pipeline = await runReturnPipeline(args);
  const { pending, def } = pipeline;
  const filer = pipeline.filer && preparationTimestamp
    ? { ...pipeline.filer, timestamp: preparationTimestamp }
    : pipeline.filer;
  if (!filer) throw new Error("OTSA export requires the return filer");
  const attachments = await loadForm8839Attachments(
    join(args.baseDir, args.returnId),
    pending,
  );
  const prepared = await def.prepareReturn(pending, filer, attachments);
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
  await Deno.mkdir(dirname(outputDir), { recursive: true });
  // Exclusive directory creation preserves prior exports and their delivery bindings.
  await Deno.mkdir(outputDir, { mode: 0o700 });
  for (const file of exported.files) {
    await Deno.writeFile(join(outputDir, file.name), file.bytes, {
      createNew: true,
      mode: 0o600,
    });
  }
  const manifestPath = join(outputDir, "manifest.json");
  // This completion marker is written only after every referenced artifact.
  await Deno.writeTextFile(
    manifestPath,
    JSON.stringify(
      {
        ...exported.manifest,
        business_rule_force_requested: args.force === true,
      },
      null,
      2,
    ) + "\n",
    { createNew: true, mode: 0o600 },
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
    JSON.parse(await Deno.readTextFile(args.recordPath)),
  );
  const evidence = new Uint8Array(await Deno.readFile(args.evidencePath));
  const manifestBytes = new Uint8Array(
    await Deno.readFile(join(args.exportDir, "manifest.json")),
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
    const retained = await Deno.readFile(join(args.exportDir, file.name));
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
  await Deno.mkdir(dirname(args.outputDir), { recursive: true });
  await Deno.mkdir(args.outputDir, { mode: 0o700 });
  await Deno.writeFile(join(args.outputDir, "evidence.bin"), evidence, {
    createNew: true,
    mode: 0o600,
  });
  await Deno.writeFile(
    join(args.outputDir, "export-manifest.json"),
    manifestBytes,
    { createNew: true, mode: 0o600 },
  );
  const receiptPath = join(args.outputDir, "delivery.json");
  await Deno.writeTextFile(
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
    { createNew: true, mode: 0o600 },
  );
  return { receiptPath, status: receipt.status, irs_acceptance: false };
}
