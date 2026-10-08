import { z } from "zod";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildForm8886Documents } from "./document.ts";
import { buildForm8886Pdf, type Form8886Owner } from "./pdf.ts";
import { disclosureSchema, type Form8886Disclosure } from "./source.ts";
import {
  form8886FinalDocumentsSchema,
  validateForm8886NativeBinding,
} from "./native-binding.ts";

export enum OtsaMethod {
  Mail = "mail",
  Fax = "fax",
}
export enum OtsaTiming {
  InitialReturn = "initial_return",
  LateK1 = "late_k1",
  LaterDesignation = "later_designation",
  PublishedGuidance = "published_guidance",
}
export enum DesignationCategory {
  Listed = "listed",
  Interest = "interest",
}

const reference = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Invalid OTSA calendar date");
const timingSchema = z.object({
  kind: z.nativeEnum(OtsaTiming),
  return_due_date: date,
  event_date: date.optional(),
  event_source_reference: reference,
  timely_k1_review_reference: reference.optional(),
  published_deadline: date.optional(),
  published_guidance_reference: reference.optional(),
  transaction_entered_on: date.optional(),
  designation_category: z.nativeEnum(DesignationCategory).optional(),
  first_return_due_after_designation: date.optional(),
}).strict();
export const handoffRequestSchema = z.object({
  method: z.nativeEnum(OtsaMethod),
  timing: timingSchema,
  sender_name: reference,
  sender_title: reference,
  sender_phone: reference,
  sender_address: reference,
  prepared_on: date,
}).strict();

async function sha256(bytes: Uint8Array): Promise<string> {
  const result = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
  );
  return Array.from(result, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
function addDays(value: string, count: number): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + count);
  return parsed.toISOString().slice(0, 10);
}
export function otsaDeadline(input: z.infer<typeof timingSchema>): string {
  const timing = timingSchema.parse(input);
  if (timing.kind === OtsaTiming.InitialReturn) return timing.return_due_date;
  if (timing.kind === OtsaTiming.PublishedGuidance) {
    if (!timing.published_deadline || !timing.published_guidance_reference) {
      throw new Error("OTSA published timing needs the guidance and deadline");
    }
    return timing.published_deadline;
  }
  if (!timing.event_date) {
    throw new Error("OTSA special timing needs its event date");
  }
  if (timing.kind === OtsaTiming.LaterDesignation) {
    if (!timing.transaction_entered_on || !timing.designation_category) {
      throw new Error(
        "OTSA designation timing needs transaction date and listed/interest category",
      );
    }
    if (
      timing.designation_category === DesignationCategory.Listed &&
      timing.transaction_entered_on < "2007-08-03"
    ) {
      if (
        !timing.first_return_due_after_designation ||
        timing.first_return_due_after_designation < timing.event_date
      ) {
        throw new Error(
          "Legacy listed transaction needs the first return due after designation",
        );
      }
      return timing.first_return_due_after_designation;
    }
    if (
      timing.designation_category === DesignationCategory.Interest &&
      timing.transaction_entered_on <= "2006-11-01"
    ) {
      throw new Error(
        "Pre-November-2-2006 interest transaction needs separate reviewed filing timing",
      );
    }
    return addDays(timing.event_date, 90);
  }
  const daysBefore =
    (Date.parse(timing.return_due_date) - Date.parse(timing.event_date)) /
    86400000;
  if (
    daysBefore < 0 || daysBefore >= 10 || !timing.timely_k1_review_reference
  ) {
    throw new Error(
      "OTSA late K-1 relief needs a timely K-1 received less than ten days before the due date",
    );
  }
  return addDays(timing.return_due_date, 60);
}

const packetMetadataSchema = z.object({
  disclosure_id: reference,
  taxpayer_name: reference,
  initial_year_filer: z.boolean(),
  source_sha256: digest,
  xml_sha256: digest,
  pdf_sha256: digest,
  page_count: z.number().int().positive(),
  preparation_xml_sha256: digest.optional(),
  final_native_document_ids: z.array(
    z.string().regex(/^[A-Za-z0-9:.\-]{1,30}$/),
  ).readonly().optional(),
}).strict();
const packets = new WeakMap<object, { pdf: Uint8Array; taxpayerTin: string }>();
export async function prepareForm8886Packet(
  sourceInput: Form8886Disclosure,
  owner: Form8886Owner,
  number: number,
  count: number,
  template: Uint8Array,
) {
  const source = disclosureSchema.parse(sourceInput);
  const templateBytes = new Uint8Array(template);
  const ownerSnapshot = { ...owner, address: { ...owner.address } };
  if (
    await sha256(templateBytes) !==
      "adeb7087e9726763bde7846d02774a271c7855e5a4aaa24b78ed7efce800629b"
  ) {
    throw new Error(
      "Form 8886 packet requires the retained official canonical template bytes",
    );
  }
  const documents = buildForm8886Documents(
    source,
    ownerSnapshot.ssn,
    number,
    count,
  );
  const xml = [
    documents.formXml,
    documents.continuationXml,
    ...documents.generalContinuations.map((row) => row.xml),
  ].filter(Boolean)
    .join("");
  const pdf = await buildForm8886Pdf(
    source,
    ownerSnapshot,
    number,
    count,
    templateBytes,
  );
  const metadata = Object.freeze(packetMetadataSchema.parse({
    disclosure_id: source.disclosure_id,
    taxpayer_name: [
      ownerSnapshot.lastName,
      ownerSnapshot.firstName,
      ownerSnapshot.middleInitial,
    ]
      .filter(Boolean).join(" "),
    initial_year_filer: source.initial_year_filer,
    source_sha256: await sha256(
      new TextEncoder().encode(JSON.stringify(source)),
    ),
    xml_sha256: await sha256(new TextEncoder().encode(xml)),
    pdf_sha256: await sha256(pdf),
    page_count: (await PDFDocument.load(pdf)).getPageCount(),
  }));
  const packet = Object.freeze({
    metadata,
    xml,
    documents: Object.freeze({
      ...documents,
      generalContinuations: Object.freeze(
        documents.generalContinuations.map((row) => Object.freeze(row)),
      ),
    }),
    getPdf: () => new Uint8Array(pdf),
  });
  packets.set(packet, {
    pdf: new Uint8Array(pdf),
    taxpayerTin: ownerSnapshot.ssn,
  });
  return packet;
}
export type PreparedForm8886Packet = Awaited<
  ReturnType<typeof prepareForm8886Packet>
>;

/** Bind the final allocated native representation without regenerating the
 * exact-copy PDF. Only authentic preparation packets can be finalized. The
 * retained OTSA/delivery digest then describes these final native bytes. */
export async function bindForm8886PacketToNativeDocuments(
  packet: PreparedForm8886Packet,
  input: z.infer<typeof form8886FinalDocumentsSchema>,
) {
  const retained = packets.get(packet);
  if (!retained) {
    throw new Error(
      "Form 8886 native binding needs its authentic prepared packet",
    );
  }
  const binding = validateForm8886NativeBinding(packet.documents, input);
  const parsed = packetMetadataSchema.parse({
    ...packet.metadata,
    preparation_xml_sha256: packet.metadata.preparation_xml_sha256 ??
      packet.metadata.xml_sha256,
    final_native_document_ids: [...binding.documentIds],
    xml_sha256: await sha256(new TextEncoder().encode(binding.xml)),
  });
  const pdf = new Uint8Array(retained.pdf);
  const finalized = Object.freeze({
    metadata: Object.freeze({
      ...parsed,
      final_native_document_ids: Object.freeze([...binding.documentIds]),
    }),
    xml: binding.xml,
    documents: binding.documents,
    getPdf: () => new Uint8Array(pdf),
  });
  packets.set(finalized, { pdf, taxpayerTin: retained.taxpayerTin });
  return finalized;
}

const plans = new WeakMap<object, PreparedForm8886Packet>();
export function prepareOtsaHandoff(
  packet: PreparedForm8886Packet,
  input: z.infer<typeof handoffRequestSchema>,
) {
  if (!packets.has(packet)) {
    throw new Error(
      "OTSA needs a packet from the shared Form 8886 preparation path",
    );
  }
  const request = handoffRequestSchema.parse(input);
  const retained = packets.get(packet)!;
  const coverText = [
    request.sender_name,
    request.sender_title,
    request.sender_phone,
    request.sender_address,
    packet.metadata.taxpayer_name,
  ];
  if (
    coverText.some((value) =>
      value.replace(/\D/g, "").includes(retained.taxpayerTin) ||
      /\b(?:\d{3}-\d{2}-\d{4}|\d{2}-\d{7})\b/.test(value)
    )
  ) {
    throw new Error("OTSA fax cover must omit the taxpayer TIN");
  }
  const required = packet.metadata.initial_year_filer ||
    request.timing.kind !== OtsaTiming.InitialReturn;
  const pageCount = packet.metadata.page_count +
    (request.method === OtsaMethod.Fax ? 1 : 0);
  if (request.method === OtsaMethod.Fax && pageCount > 100) {
    throw new Error("OTSA fax exceeds 100 pages including the cover");
  }
  // This cover has no taxpayer TIN; the disclosure itself retains its ID.
  const cover = Object.freeze({
    subject: "Form 8886",
    sender_name: request.sender_name,
    sender_title: request.sender_title,
    sender_phone: request.sender_phone,
    sender_address: request.sender_address,
    taxpayer_name: packet.metadata.taxpayer_name,
    date: request.prepared_on,
    page_count: pageCount,
  });
  const plan = Object.freeze({
    state: required ? "prepared" as const : "not_required" as const,
    method: request.method,
    prepared_on: request.prepared_on,
    due_on: otsaDeadline(request.timing),
    destination: request.method === OtsaMethod.Fax
      ? "844-253-2553"
      : "Internal Revenue Service, 1973 Rulon White Blvd., OTSA Mail Stop 4915, Ogden, UT 84201",
    artifact: packet.metadata,
    transmitted_page_count: pageCount,
    cover: request.method === OtsaMethod.Fax ? cover : undefined,
  });
  plans.set(plan, packet);
  return plan;
}
export type OtsaHandoff = ReturnType<typeof prepareOtsaHandoff>;

const transmissions = new WeakMap<object, {
  pdf: Uint8Array;
  sha256: string;
  coverSha256?: string;
}>();

async function renderFaxCover(plan: OtsaHandoff): Promise<Uint8Array> {
  if (!plan.cover) throw new Error("OTSA fax requires a cover");
  const document = await PDFDocument.create();
  document.setCreationDate(new Date("2025-01-01T00:00:00Z"));
  document.setModificationDate(new Date("2025-01-01T00:00:00Z"));
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage([612, 792]);
  page.drawText("Form 8886 - OTSA fax cover", {
    x: 54,
    y: 732,
    size: 18,
    font: bold,
  });
  const fields = [
    ["To", "Internal Revenue Service - OTSA"],
    ["Fax", plan.destination],
    ["Sender", plan.cover.sender_name],
    ["Title", plan.cover.sender_title],
    ["Phone", plan.cover.sender_phone],
    ["Address", plan.cover.sender_address],
    ["Taxpayer name", plan.cover.taxpayer_name],
    ["Date", plan.cover.date],
    ["Total pages including cover", String(plan.cover.page_count)],
  ];
  let y = 682;
  for (const [label, value] of fields) {
    page.drawText(label, { x: 54, y, size: 10, font: bold });
    y -= 17;
    const words = value.replace(/\s+/g, " ").split(" ");
    let row = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(word, 11) > 504) {
        throw new Error("OTSA cover contains a word too wide to render");
      }
      const candidate = row ? `${row} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 11) > 504) {
        if (y < 76) throw new Error("OTSA fax cover exceeds one page");
        page.drawText(row, { x: 54, y, size: 11, font });
        y -= 15;
        row = word;
      } else row = candidate;
    }
    if (y < 76) throw new Error("OTSA fax cover exceeds one page");
    page.drawText(row, { x: 54, y, size: 11, font });
    y -= 34;
  }
  return document.save();
}

export async function prepareOtsaTransmission(plan: OtsaHandoff) {
  const packet = plans.get(plan);
  if (!packet || plan.state !== "prepared") {
    throw new Error("OTSA transmission requires its prepared handoff");
  }
  const disclosure = packet.getPdf();
  const cover = plan.method === OtsaMethod.Fax
    ? await renderFaxCover(plan)
    : undefined;
  let bytes = disclosure;
  if (cover) {
    const document = await PDFDocument.load(cover, { updateMetadata: false });
    const source = await PDFDocument.load(disclosure, {
      updateMetadata: false,
    });
    for (
      const page of await document.copyPages(source, source.getPageIndices())
    ) {
      document.addPage(page);
    }
    bytes = new Uint8Array(await document.save());
  }
  if (
    (await PDFDocument.load(bytes)).getPageCount() !==
      plan.transmitted_page_count
  ) {
    throw new Error("OTSA transmission page count differs from its handoff");
  }
  const hash = await sha256(bytes);
  const coverHash = cover ? await sha256(cover) : undefined;
  const existing = transmissions.get(plan);
  if (existing && existing.sha256 !== hash) {
    throw new Error("OTSA transmission changed after preparation");
  }
  transmissions.set(plan, {
    pdf: new Uint8Array(bytes),
    sha256: hash,
    coverSha256: coverHash,
  });
  return Object.freeze({
    transmission_sha256: hash,
    cover_sha256: coverHash,
    disclosure_pdf_sha256: packet.metadata.pdf_sha256,
    page_count: plan.transmitted_page_count,
    getPdf: () => new Uint8Array(bytes),
    getDisclosurePdf: () => packet.getPdf(),
    getCoverPdf: () => cover ? new Uint8Array(cover) : undefined,
  });
}

export const deliveryRecordSchema = z.object({
  method: z.nativeEnum(OtsaMethod),
  destination: reference,
  delivered_on: date,
  source_sha256: digest,
  xml_sha256: digest,
  pdf_sha256: digest,
  transmission_sha256: digest,
  transmitted_page_count: z.number().int().positive(),
  evidence_sha256: digest,
  evidence_reference: reference,
  reviewed_delivery_result: z.literal("completed"),
  reviewer_reference: reference,
}).strict();
export async function recordOtsaDelivery(
  plan: OtsaHandoff,
  input: z.infer<typeof deliveryRecordSchema>,
  evidenceBytes: Uint8Array,
) {
  const transmission = transmissions.get(plan);
  if (!plans.has(plan) || !transmission || plan.state !== "prepared") {
    throw new Error("OTSA delivery needs its prepared exact-copy handoff");
  }
  const record = deliveryRecordSchema.parse(input);
  if (record.delivered_on < plan.prepared_on) {
    throw new Error("OTSA delivery predates its prepared handoff");
  }
  if (
    record.method !== plan.method || record.destination !== plan.destination ||
    record.transmitted_page_count !== plan.transmitted_page_count ||
    record.source_sha256 !== plan.artifact.source_sha256 ||
    record.xml_sha256 !== plan.artifact.xml_sha256 ||
    record.pdf_sha256 !== plan.artifact.pdf_sha256 ||
    record.transmission_sha256 !== transmission.sha256
  ) {
    throw new Error(
      "OTSA delivery differs from the prepared disclosure or destination",
    );
  }
  if (
    evidenceBytes.length === 0 ||
    await sha256(evidenceBytes) !== record.evidence_sha256
  ) {
    throw new Error(
      "OTSA delivery evidence bytes do not match their retained digest",
    );
  }
  return Object.freeze({
    ...plan,
    state: "delivery_recorded" as const,
    delivered_on: record.delivered_on,
    late: record.delivered_on > plan.due_on,
    evidence_reference: record.evidence_reference,
    evidence_sha256: record.evidence_sha256,
    reviewer_reference: record.reviewer_reference,
    transmission_sha256: transmission.sha256,
    cover_sha256: transmission.coverSha256,
  });
}
