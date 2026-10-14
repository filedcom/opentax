import { z } from "zod";
import type { MefBundle } from "../../../../mef/builder.ts";
import { assertPreparedBundleProjection } from "../../../../mef/builder.ts";
import { assertPreparedAttachmentManifest } from "../../../../mef/attachments/prepared-attachment-manifest.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import {
  preparedSourceSha256,
  sha256Hex,
} from "../../../../return-processing/prepared-source.ts";
import { assertAuthenticForm8886ReturnPackets } from "./return-packets.ts";
import {
  deliveryRecordSchema,
  handoffRequestSchema,
  type OtsaHandoff,
  OtsaMethod,
  prepareOtsaHandoff,
  prepareOtsaTransmission,
  recordOtsaDelivery,
} from "./handoff.ts";

export const otsaExportRequestSchema = z.object({
  requests: z.array(
    z.object({
      disclosure_id: z.string().trim().min(1),
      handoff: handoffRequestSchema,
    }).strict(),
  ).min(1),
}).strict().refine(
  (source) =>
    new Set(source.requests.map((row) => row.disclosure_id)).size ===
      source.requests.length,
  "OTSA export repeats a disclosure request",
);

const exportPlans = new WeakMap<object, ReadonlyMap<string, OtsaHandoff>>();

/** Prepare one exact-copy file per disclosure and one separate fax file per
 * required fax. These are operator handoff artifacts, never delivery evidence. */
export async function prepareForm8886OtsaExport(
  bundleInput: MefBundle,
  filerInput: FilerIdentity,
  requestInput: z.infer<typeof otsaExportRequestSchema>,
) {
  const request = otsaExportRequestSchema.parse(requestInput);
  const filer = structuredClone(filerInput);
  const bundle = {
    ...bundleInput,
    pending: structuredClone(bundleInput.pending),
    attachments: bundleInput.attachments.map((row) => ({
      ...row,
      bytes: new Uint8Array(row.bytes),
    })),
    attachmentSha256ByFileName: { ...bundleInput.attachmentSha256ByFileName },
  };
  const prepared = bundle.form8886Packets;
  if (!prepared || prepared.packets.length === 0) {
    throw new Error("OTSA export needs prepared Form 8886 disclosures");
  }
  assertAuthenticForm8886ReturnPackets(prepared);
  const ids = prepared.packets.map((row) => row.packet.metadata.disclosure_id);
  if (
    request.requests.length !== ids.length ||
    request.requests.some((row) => !ids.includes(row.disclosure_id))
  ) {
    throw new Error(
      "OTSA export needs exactly one request for every prepared disclosure",
    );
  }
  if (
    await preparedSourceSha256(bundle.pending, filer) !== bundle.sourceSha256
  ) throw new Error("OTSA export source differs from the prepared return");
  await assertPreparedAttachmentManifest(bundle);
  assertPreparedBundleProjection(bundle, filer);
  const copies = await Promise.all(
    prepared.packets.map(async ({ packet }, index) => {
      const parts = [
        packet.documents.formXml,
        packet.documents.continuationXml,
        ...packet.documents.generalContinuations.map((row) => row.xml),
      ].filter((xml): xml is string => xml !== undefined);
      if (parts.some((xml) => !bundle.xml.includes(xml))) {
        throw new Error(
          "OTSA copy is not bound to the finalized native return",
        );
      }
      const bytes = packet.getPdf();
      if (
        await sha256Hex(bytes) !== packet.metadata.pdf_sha256
      ) {
        throw new Error("OTSA disclosure PDF differs from its prepared digest");
      }
      const selected = request.requests.find((row) =>
        row.disclosure_id === packet.metadata.disclosure_id
      )!;
      const plan = prepareOtsaHandoff(packet, selected.handoff);
      const transmission = plan.state === "prepared"
        ? await prepareOtsaTransmission(plan)
        : undefined;
      const prefix = `disclosure-${String(index + 1).padStart(3, "0")}`;
      const disclosureFile = `${prefix}.pdf`;
      const faxFile = transmission && plan.method === OtsaMethod.Fax
        ? `${prefix}-fax.pdf`
        : undefined;
      return {
        plan,
        record: {
          disclosure_id: packet.metadata.disclosure_id,
          state: plan.state,
          delivered: false as const,
          method: plan.method,
          destination: plan.destination,
          due_on: plan.due_on,
          prepared_on: plan.prepared_on,
          past_due_at_preparation: plan.prepared_on > plan.due_on,
          disclosure_file: disclosureFile,
          handoff_file: transmission ? (faxFile ?? disclosureFile) : undefined,
          page_count: packet.metadata.page_count,
          handoff_page_count: transmission?.page_count,
          disclosure_pdf_sha256: packet.metadata.pdf_sha256,
          native_copy_sha256: packet.metadata.xml_sha256,
          source_sha256: packet.metadata.source_sha256,
          handoff_sha256: transmission?.transmission_sha256,
          cover_sha256: transmission?.cover_sha256,
        },
        files: [
          { name: disclosureFile, bytes },
          ...(faxFile && transmission
            ? [{ name: faxFile, bytes: transmission.getPdf() }]
            : []),
        ],
      };
    }),
  );
  const files = [
    {
      name: "prepared-return.xml",
      bytes: new TextEncoder().encode(bundle.xml),
    },
    ...copies.flatMap((copy) => copy.files),
  ];
  const fileSha256 = Object.fromEntries(
    await Promise.all(
      files.map(async (file) =>
        [file.name, await sha256Hex(file.bytes)] as const
      ),
    ),
  );
  const exported = {
    manifest: {
      format_version: 1,
      preparation_timestamp: filer.timestamp,
      handoff_requests_sha256: await sha256Hex(
        new TextEncoder().encode(JSON.stringify(request)),
      ),
      status: "prepared_not_sent" as const,
      delivery_recorded: false as const,
      irs_acceptance: false as const,
      prepared_return_xml_sha256: bundle.xmlSha256,
      prepared_return_source_sha256: bundle.sourceSha256,
      disclosure_source_sha256: prepared.source_sha256,
      instructions_url: "https://www.irs.gov/instructions/i8886",
      operator_instructions:
        "For each required fax, send only its separate -fax.pdf file. For mail, use the disclosure PDF. Keep the fax transmission log or mailing evidence. These exports do not record delivery or IRS acceptance. The XML is a prepared reference, not a submission package or an acknowledgment.",
      copies: copies.map((copy) => copy.record),
      file_sha256: fileSha256,
    },
    files,
  };
  exportPlans.set(
    exported,
    new Map(copies.map((copy) => [copy.record.disclosure_id, copy.plan])),
  );
  return exported;
}

export const otsaDeliveryRequestSchema = z.object({
  disclosure_id: z.string().trim().min(1),
  record: deliveryRecordSchema,
}).strict();

export async function prepareForm8886OtsaDeliveryRecord(
  exported: Awaited<ReturnType<typeof prepareForm8886OtsaExport>>,
  input: z.infer<typeof otsaDeliveryRequestSchema>,
  evidenceBytes: Uint8Array,
) {
  const request = otsaDeliveryRequestSchema.parse(input);
  const evidence = new Uint8Array(evidenceBytes);
  const plan = exportPlans.get(exported)?.get(request.disclosure_id);
  if (!plan) {
    throw new Error(
      "OTSA delivery requires its authentic prepared export and disclosure",
    );
  }
  const delivery = await recordOtsaDelivery(plan, request.record, evidence);
  return {
    format_version: 1,
    status: "reviewed_delivery_recorded" as const,
    irs_acceptance: false as const,
    disclosure_id: request.disclosure_id,
    delivery,
    reviewed_record: request.record,
  };
}
