import { buildReturnHeader, FilingStatus } from "../../mef/header.ts";
import { element, elements } from "../../mef/xml.ts";
import { F1040_2025_CONFIG } from "../config.ts";
import { PDFDocument } from "pdf-lib";
import { isValidMefPdfFilename } from "./pdf-attachment-filename.ts";
import { ALL_MEF_FORMS } from "./forms/index.ts";
import { documentId, validateDocumentReferences } from "./document-identity.ts";
import { SCHEDULE_E_TYPE8_STATEMENT_FILE } from "./forms/schedule_e_type8_statement.ts";
import type { MefBuildContext, MefPdfAttachment } from "./form-descriptor.ts";
import type { FilerIdentity, MefFormsPending } from "./types.ts";
import { assertAttachmentCoverage } from "../attachment-coverage.ts";
import type { Form3800DocumentParts } from "./forms/f3800_document.ts";
import { preparedSourceSha256, sha256Hex } from "../prepared-source.ts";
import {
  assertDigitalAssetDispositionAnswer,
  assertEitcChildSources,
  assertF1040SourceIdentity,
  assertGeneral1040DependentSource,
  assertGeneral1040DepositSource,
  assertGeneral1040HeaderSource,
  assertKIncomeClassification,
  assertKPersonalSaleSources,
  assertKReportedErrorSources,
  assertKWithholdingSourceIdentity,
  assertSchedule1Box3SourceIdentity,
  assertSchedule1Box8SourceIdentity,
  assertSchedule1Form8814Source,
  assertSchedule1KSourceIdentity,
  assertSchedule1NecSourceIdentity,
  assertScheduleCReceiptSourceIdentity,
  assertScheduleFFarmSourceIdentity,
} from "../filer-source-reconciliation.ts";
import { assertBox11CodeJSources } from "../../nodes/inputs/k1_partnership/box11_code_j.ts";
import { assertBox11CodeESources } from "../../nodes/inputs/k1_partnership/box11_code_e.ts";
import { assertBox11CodeKSources } from "../../nodes/inputs/k1_partnership/box11_code_k.ts";
import { assertBox11CodeSSources } from "../../nodes/inputs/k1_partnership/box11_code_s.ts";
import { assertScheduleDK1Source } from "../schedule-d-k1-source.ts";
import { assertForm8858FilingSource } from "../../nodes/inputs/f8858/index.ts";
import { assertBox11Line10Sources } from "../../nodes/inputs/k1_partnership/box11_line10.ts";
import { assertForm8915FSourceLinks } from "../../nodes/inputs/f8915f/index.ts";
import { assertW2GPayerCopyContents } from "./w2g-payer-copy.ts";
import { assertPositiveW2GRecipient } from "./forms/w2g.ts";
import { reconciledForm8908Source } from "./forms/f8908_source_reconciliation.ts";
import { assertForm8908PwaSubmittedPdfs } from "./forms/f8908_pwa.ts";
import { assertPreparedVehicleAcknowledgments } from "./forms/f8283_vehicle_sale_evidence.ts";
import { assertForm1098IssuerCopies } from "../../nodes/inputs/f1098/issuer_copy.ts";
import { assertExtensionPaymentSource } from "../extension-payment-reconciliation.ts";
import { assert1099RRecipientOwner } from "../f1099r-recipient-owner.ts";
import { assertNecWithholdingRecipient } from "../f1099nec-withholding-owner.ts";
import { assert1099BRecipientOwner } from "../f1099b-recipient-owner.ts";
import {
  assertPatrIssuedCopies,
  assertPatrWithholdingRecipient,
} from "../f1099patr-withholding-owner.ts";
import { assertW2WithholdingSource } from "../w2-withholding-reconciliation.ts";
import { assertSchedule2Form4137Tax } from "../schedule2-form4137-reconciliation.ts";
import { assertSchedule2Form8919Tax } from "../schedule2-form8919-reconciliation.ts";
import { assertSchedule2ScheduleHTax } from "../schedule2-schedule-h-reconciliation.ts";
import { assertSchedule2Form8960Tax } from "../schedule2-form8960-reconciliation.ts";
import { assertSchedule2ScheduleSETax } from "../schedule2-schedule-se-reconciliation.ts";
import { assertSchedule2Form8828Tax } from "../schedule2-form8828-reconciliation.ts";
import { assertSchedule2Form8936Repayment } from "../schedule2-form8936-reconciliation.ts";
import { assertSchedule3Form8859Credit } from "../schedule3-form8859-reconciliation.ts";
import { assertSchedule3Form8834Credit } from "../schedule3-form8834-reconciliation.ts";
import { assertSchedule3Form8912Credit } from "../schedule3-form8912-reconciliation.ts";
import {
  assertSchedule2Line17HSources,
  assertSchedule2W2Line13Sources,
  assertSchedule2W2Line17KSource,
} from "../schedule2-w2-source-reconciliation.ts";
import { assert1099WithholdingSource } from "../f1099-withholding-reconciliation.ts";
import { assertF8288WithholdingOwner } from "../f8288-withholding-owner.ts";
import {
  assertBenefitStatementOwner,
  assertSocialSecurityBenefitSource,
} from "../ssa-benefits-reconciliation.ts";
import { assertRrb1099rPensionSource } from "../rrb1099r-pension-reconciliation.ts";
import {
  hasForm8994Claim,
  reconcileForm8994EvidenceBytes,
} from "../../nodes/inputs/f8994/evidence_bytes.ts";
import {
  assertPublicForm8839Attachments,
  hasForm8839Claim,
} from "../../nodes/intermediate/forms/form8839/public_source.ts";

export interface MefBundle {
  readonly xml: string;
  readonly attachments: ReadonlyArray<MefPdfAttachment>;
  readonly pending: MefFormsPending;
  readonly sourceSha256: string;
  readonly xmlSha256: string;
  readonly attachmentSha256ByFileName: Readonly<Record<string, string>>;
  readonly form3800Parts?: Form3800DocumentParts;
  readonly form3800PartsSha256?: string;
}

export interface MefBundleOptions {
  readonly filer?: FilerIdentity;
  readonly attachments: ReadonlyArray<MefPdfAttachment>;
  readonly schemaVersion?: string;
  readonly year?: number;
  readonly returnType?: string;
}

function binaryFragments(
  attachments: ReadonlyArray<MefPdfAttachment>,
): ReadonlyArray<{ pendingKey: string; tag: string; xml: string }> {
  return attachments.map((attachment) => ({
    pendingKey: "binaryAttachment",
    tag: "BinaryAttachment",
    xml: elements("BinaryAttachment", [
      element("DocumentTypeCd", "PDF"),
      element("Desc", attachment.description),
      element("AttachmentLocationTxt", attachment.fileName),
    ]),
  }));
}

async function validatePdfAttachments(
  attachments: ReadonlyArray<MefPdfAttachment>,
): Promise<ReadonlyArray<MefPdfAttachment>> {
  const names = new Set<string>();
  const descriptions = new Set<string>();
  const validated: MefPdfAttachment[] = [];
  for (const attachment of attachments) {
    const { fileName, description } = attachment;
    if (
      !isValidMefPdfFilename(fileName) ||
      names.has(fileName)
    ) {
      throw new Error(`Invalid or duplicate MeF PDF filename: ${fileName}`);
    }
    if (
      description.trim().length === 0 || description.length > 128 ||
      descriptions.has(description)
    ) {
      throw new Error(
        `Invalid or duplicate MeF PDF description: ${description}`,
      );
    }
    if (
      attachment.bytes.length === 0 ||
      attachment.bytes.length > 60_000_000
    ) {
      throw new Error(`MeF PDF size is invalid: ${fileName}`);
    }
    const bytes = new Uint8Array(attachment.bytes);
    const start = new TextDecoder().decode(bytes.subarray(0, 5));
    const end = new TextDecoder().decode(
      bytes.subarray(Math.max(0, bytes.length - 32)),
    );
    if (start !== "%PDF-" || !/%%EOF\s*$/.test(end)) {
      throw new Error(`MeF attachment is not a complete PDF: ${fileName}`);
    }
    try {
      const pdf = await PDFDocument.load(bytes);
      if (pdf.getPageCount() === 0) throw new Error("PDF has no pages");
    } catch {
      throw new Error(
        `MeF attachment is not a readable, unencrypted PDF: ${fileName}`,
      );
    }
    names.add(fileName);
    descriptions.add(description);
    validated.push({ fileName, description, bytes });
  }
  return validated;
}

function buildFragments(
  pending: MefFormsPending,
  context: MefBuildContext,
): ReadonlyArray<{ pendingKey: string; tag: string; xml: string }> {
  return ALL_MEF_FORMS.flatMap((form) => {
    const source = pending[form.pendingKey as keyof MefFormsPending];
    const sourceKeys = form.sourcePendingKeys ?? [form.pendingKey];
    if (
      form.pendingKey !== "f1040" &&
      !sourceKeys.some((key) =>
        pending[key as keyof MefFormsPending] !== undefined
      )
    ) return [];
    const built = form.build(
      (source ?? []) as never,
      context,
    );
    const fragments = typeof built === "string" ? [built] : built;
    return fragments.filter((xml) => xml !== "").map((xml) => {
      const tag = /^<([A-Za-z0-9]+)(?:\s[^>]*)?>/.exec(xml)?.[1];
      if (!tag) throw new Error(`Invalid MeF document from ${form.pendingKey}`);
      return { pendingKey: form.pendingKey, tag, xml };
    });
  });
}

function buildReturnXml(
  pending: MefFormsPending,
  filer: FilerIdentity | undefined,
  schemaVersion: string,
  year: number,
  returnType: string,
  attachments: ReadonlyArray<MefPdfAttachment>,
  attachmentSha256ByFileName?: Readonly<Record<string, string>>,
): { readonly xml: string; readonly form3800Parts?: Form3800DocumentParts } {
  if (year !== 2025 || returnType !== "1040") {
    throw new Error(
      "TY2025 Form 1040 export requires year 2025 and return type 1040",
    );
  }
  if (schemaVersion !== F1040_2025_CONFIG.mefSchemaVersion) {
    throw new Error(
      "TY2025 Form 1040 export requires the reviewed MeF schema version",
    );
  }
  if (!filer) {
    throw new Error("MeF export requires a real filer identity");
  }
  assertForm8858FilingSource(pending.f8858);
  if (pending.f1040?.dual_status_return_2025 === true) {
    throw new Error("TY2025 dual-status return cannot use Form 1040 e-file");
  }
  if (pending.f1040) {
    assertF1040SourceIdentity(pending.f1040, filer);
  }
  assertGeneral1040HeaderSource(pending);
  assertDigitalAssetDispositionAnswer(pending);
  assertGeneral1040DependentSource(pending);
  assertGeneral1040DepositSource(pending, filer);
  assert1099RRecipientOwner(pending.f1099r, filer);
  assertPositiveW2GRecipient(pending.w2g, filer);
  assertNecWithholdingRecipient(pending.f1099nec, filer);
  assert1099BRecipientOwner(pending.f1099b, filer);
  assertPatrIssuedCopies(pending.f1099patr);
  assertPatrWithholdingRecipient(pending.f1099patr, filer);
  assertW2WithholdingSource(pending, filer);
  assertSchedule2W2Line13Sources(pending);
  assertSchedule2W2Line17KSource(pending);
  assertSchedule2Line17HSources(pending, filer);
  assertSchedule2Form4137Tax(pending);
  assertSchedule2Form8919Tax(pending);
  assertSchedule2ScheduleHTax(pending);
  assertSchedule2Form8960Tax(pending);
  assertSchedule2ScheduleSETax(pending);
  assertSchedule2Form8828Tax(pending);
  assertSchedule2Form8936Repayment(pending);
  assertSchedule3Form8859Credit(pending);
  assertSchedule3Form8834Credit(pending);
  assertSchedule3Form8912Credit(pending);
  assert1099WithholdingSource(pending, filer);
  assertF8288WithholdingOwner(pending.f8288, filer);
  assertSocialSecurityBenefitSource(pending);
  assertBenefitStatementOwner(pending, filer);
  assertRrb1099rPensionSource(pending, filer);
  assertExtensionPaymentSource(pending, filer);
  assertForm8915FSourceLinks(pending);
  assertKIncomeClassification(pending);
  assertEitcChildSources(pending, filer);
  assertKReportedErrorSources(pending, filer);
  assertScheduleCReceiptSourceIdentity(pending, filer);
  assertKWithholdingSourceIdentity(pending, filer);
  assertKPersonalSaleSources(pending, filer);
  assertSchedule1Box3SourceIdentity(pending, filer);
  assertSchedule1Box8SourceIdentity(pending, filer);
  assertSchedule1Form8814Source(pending);
  assertSchedule1NecSourceIdentity(pending, filer);
  assertSchedule1KSourceIdentity(pending, filer);
  assertScheduleFFarmSourceIdentity(pending, filer);
  const k1Recipients = [
    filer.primarySSN,
    ...(filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse?.ssn
      ? [filer.spouse.ssn]
      : []),
  ];
  assertBox11CodeJSources(pending, k1Recipients);
  assertBox11CodeESources(pending, k1Recipients);
  assertBox11CodeKSources(pending, k1Recipients);
  assertBox11CodeSSources(pending, k1Recipients);
  assertScheduleDK1Source(pending.schedule_d ?? {}, pending);
  assertBox11Line10Sources(pending, k1Recipients);
  if (
    Array.isArray(pending.form8949) && pending.form8949.length > 0 &&
    !pending.schedule_d
  ) {
    throw new Error("Form 8949 needs its reconciled Schedule D");
  }
  assertAttachmentCoverage(pending, "mef");
  if (
    pending.schedule_e?.schedule_es?.some((item) =>
      item.property_type === 8 &&
      (item.property_type_other_desc?.length ?? 0) > 20
    ) &&
    !attachments.some((item) =>
      item.fileName === SCHEDULE_E_TYPE8_STATEMENT_FILE
    )
  ) {
    throw new Error(
      "Schedule E long type 8 description needs its binary PDF attachment",
    );
  }
  const binaryAttachmentFileNames = attachments.map((item) => item.fileName);
  const attachmentDescriptionsByFileName = Object.fromEntries(
    attachments.map((item) => [item.fileName, item.description]),
  );
  const initial = buildFragments(pending, {
    phase: "discovery",
    filer,
    binaryAttachmentFileNames,
    attachmentDescriptionsByFileName,
    attachmentSha256ByFileName,
    pending,
  });
  const documentIdsByPendingKey = Object.fromEntries(
    ALL_MEF_FORMS.map((form) => [
      form.pendingKey,
      initial.flatMap((fragment, index) =>
        fragment.pendingKey === form.pendingKey
          ? [documentId(fragment.tag, index)]
          : []
      ),
    ]),
  );
  const documentIdsByTag = Object.fromEntries(
    [...new Set(initial.map((fragment) => fragment.tag))].map((tag) => [
      tag,
      initial.flatMap((fragment, index) =>
        fragment.tag === tag ? [documentId(fragment.tag, index)] : []
      ),
    ]),
  );
  const documentIdsByAttachmentFileName = Object.fromEntries(
    attachments.map((attachment, index) => [
      attachment.fileName,
      documentId("BinaryAttachment", initial.length + index),
    ]),
  );
  let form3800Parts: Form3800DocumentParts | undefined;
  const linked = buildFragments(pending, {
    phase: "final",
    filer,
    binaryAttachmentFileNames,
    attachmentDescriptionsByFileName,
    attachmentSha256ByFileName,
    documentIdsByPendingKey,
    documentIdsByTag,
    documentIdsByAttachmentFileName,
    pending,
    onPreparedForm3800(parts) {
      if (form3800Parts) {
        throw new Error("Form 3800 prepared more than once in one return");
      }
      form3800Parts = parts;
    },
  });
  if (
    linked.length !== initial.length ||
    linked.some((fragment, index) =>
      fragment.pendingKey !== initial[index].pendingKey ||
      fragment.tag !== initial[index].tag
    )
  ) {
    throw new Error("MeF document set changed while linking references");
  }
  const documents = [...linked, ...binaryFragments(attachments)];
  validateDocumentReferences(documents);
  const forms = documents.map((fragment, index) =>
    fragment.xml.replace(
      /^<([A-Za-z0-9]+)(?=[\s>])/,
      `<${fragment.tag} documentId="${documentId(fragment.tag, index)}"`,
    )
  );
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData =
    `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(
    filer,
    year,
    returnType,
    attachments.length,
  );

  return {
    xml:
      `<Return returnVersion="${schemaVersion}" xmlns="http://www.irs.gov/efile" xmlns:efile="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`,
    form3800Parts,
  };
}

export function buildMefXml(
  pending: MefFormsPending,
  filer?: FilerIdentity,
  schemaVersion = "2025v5.4",
  year = 2025,
  returnType = "1040",
): string {
  if (hasForm8839Claim(pending)) {
    throw new Error(
      "MeF Form 8839 requires reviewed PDF attachment bytes; use buildMefBundle",
    );
  }
  if (hasForm8994Claim(pending)) {
    throw new Error(
      "MeF Form 8994 requires validated policy and payroll attachment bytes; use buildMefBundle",
    );
  }
  return buildReturnXml(pending, filer, schemaVersion, year, returnType, [])
    .xml;
}

/** XML and PDF files that must later be placed in a MeF submission ZIP. */
export async function buildMefBundle(
  pending: MefFormsPending,
  options: MefBundleOptions,
): Promise<MefBundle> {
  await assertForm1098IssuerCopies(pending);
  const generated = await Promise.all(
    ALL_MEF_FORMS.map((form) =>
      "buildBinaryAttachments" in form && form.buildBinaryAttachments
        ? form.buildBinaryAttachments(
          (pending[form.pendingKey as keyof MefFormsPending] ?? {}) as never,
          { filer: options.filer },
        )
        : Promise.resolve([] as ReadonlyArray<MefPdfAttachment>)
    ),
  );
  const attachments = await validatePdfAttachments([
    ...options.attachments,
    ...generated.flat(),
  ]);
  if (hasForm8839Claim(pending)) {
    const route = pending.form8839_route as
      | { public_source?: unknown }
      | undefined;
    if (!route) {
      throw new Error("Form 8839 needs a reviewed executor route");
    }
    await assertPublicForm8839Attachments(route.public_source, attachments);
  }
  if (hasForm8994Claim(pending)) {
    await reconcileForm8994EvidenceBytes(pending.f8994, attachments);
  }
  if (pending.f8908) {
    const { source } = reconciledForm8908Source(pending.f8908, pending.f3800);
    await assertForm8908PwaSubmittedPdfs(source, attachments);
  }
  await assertW2GPayerCopyContents(pending, options.filer, attachments);
  const attachmentSha256ByFileName = Object.fromEntries(
    await Promise.all(attachments.map(async ({ fileName, bytes }) => {
      return [fileName, await sha256Hex(bytes)] as const;
    })),
  );
  const prepared = buildReturnXml(
    pending,
    options.filer,
    options.schemaVersion ?? "2025v5.4",
    options.year ?? 2025,
    options.returnType ?? "1040",
    attachments,
    attachmentSha256ByFileName,
  );
  if (pending.f8283) {
    await assertPreparedVehicleAcknowledgments(
      pending.f8283,
      attachments,
      prepared.xml,
      options.filer?.primarySSN ?? "",
    );
  }
  return {
    ...prepared,
    attachments,
    pending,
    sourceSha256: await preparedSourceSha256(pending, options.filer),
    xmlSha256: await sha256Hex(new TextEncoder().encode(prepared.xml)),
    attachmentSha256ByFileName,
    form3800PartsSha256: prepared.form3800Parts
      ? await sha256Hex(
        new TextEncoder().encode(JSON.stringify(prepared.form3800Parts)),
      )
      : undefined,
  };
}
