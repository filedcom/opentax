import { assertForm8835TransferStatements } from "./forms/credits/business/f8835_transfer_statement.ts";
import { assertForm8835DomesticStatements } from "./forms/credits/business/f8835_domestic_statement.ts";
import { assertForm8835IncreaseStatements } from "./forms/credits/business/f8835_increase_statement.ts";
import { assertEmployeeContributionReturn } from "../domains/credits/individual/form8880/form8880_tax_limit.ts";
import { assertRequiredLtcSource } from "./forms/adjustments/health/f8853_ltc.ts";
import type { ExecuteResult } from "../../../../core/runtime/executor.ts";
import type { Form8886Source } from "../domains/general/filing/form8886/source.ts";
import {
  assertPreparedForm8886PublicSource,
  type PreparedForm8886ReturnPackets,
  verifyPreparedForm8886ReturnPackets,
} from "../domains/general/filing/form8886/return-packets.ts";
import {
  finalizeForm8886NativeReturnPackets,
  Form8886PendingKey,
} from "../domains/general/filing/form8886/native-return.ts";
import { buildPending } from "./execution/pending.ts";
import type { MefDocumentFragment } from "./identity/document-identity.ts";
import { assertOwned7203RequiredCopies } from "../domains/income/business/form7203/form7203-owned-return.ts";
import { assertHsaExcessRequiredCopy } from "../domains/adjustments/health/form8889/form8889_postyear_single_reconciliation.ts";
import { assertSingleFarmQbiReturn } from "../domains/deductions/business/form8995a/form8995a_single_farm_reconciliation.ts";
import { assertScheduleJSourceReturn } from "../domains/taxes/income-averaging/schedule-j/schedule_j_source_return.ts";
import { executeComposedSourceReturn } from "../return-processing/composed_source_return.ts";
import { reconcileForm8606RothInventories } from "../domains/income/retirement/form8606/form8606_roth_inventory_reconciliation.ts";
import { reconcileForm8606RothActivity } from "../domains/income/retirement/form8606/form8606_roth_activity_reconciliation.ts";
import { assertForm4852RetainedEvidence } from "../domains/income/wages/form4852/form4852_retained_evidence.ts";
import type { Form4852RetainedDocument } from "../domains/income/wages/form4852/form4852_source.ts";
import { assertReviewedForm8283PdfFields } from "./forms/deductions/charitable/f8283/f8283_signed_fields.ts";
import { assertForm8978SourceBytes } from "../domains/taxes/passthrough/form8978/form8978_source.ts";
import { buildReturnHeader, FilingStatus } from "../../mef/header.ts";
import { element, elements } from "../../mef/xml.ts";
import { F1040_2025_CONFIG } from "../config.ts";
import { PDFDocument } from "pdf-lib";
import { isValidMefPdfFilename } from "./attachments/pdf-attachment-filename.ts";
import { assertMefPdfEnvelope } from "./attachments/pdf-attachment-envelope.ts";
import { ALL_MEF_FORMS } from "./forms/index.ts";
import {
  documentId,
  validateDocumentReferences,
} from "./identity/document-identity.ts";
import { SCHEDULE_E_TYPE8_STATEMENT_FILE } from "./forms/income/rental-passthrough/schedule_e_type8_statement.ts";
import type { MefBuildContext, MefPdfAttachment } from "./form-descriptor.ts";
import type { FilerIdentity, MefFormsPending } from "./types.ts";
import { assertAttachmentCoverage } from "../return-processing/attachment-coverage.ts";
import type { Form3800DocumentParts } from "./forms/credits/business/f3800/f3800_document.ts";
import {
  preparedSourceSha256,
  sha256Hex,
} from "../return-processing/prepared-source.ts";
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
  assertScheduleCStatutoryW2Sources,
  assertScheduleFFarmSourceIdentity,
} from "../domains/general/return-assembly/filer-source-reconciliation.ts";
import { assertBox11CodeJSources } from "../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_code_j.ts";
import { assertSchedule1Form8621Source } from "../domains/income/foreign/schedule1-form8621-source.ts";
import { assertBox11CodeESources } from "../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_code_e.ts";
import { assertBox11CodeKSources } from "../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_code_k.ts";
import { assertBox11CodeSSources } from "../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_code_s.ts";
import { assertScheduleDK1Source } from "../domains/income/investments/schedule-d/schedule-d-k1-source.ts";
import { assertScheduleD1040Join } from "../domains/income/investments/schedule-d/schedule-d-1040-join.ts";
import { assertForm8858FilingSource } from "../../nodes/inputs/general/foreign/f8858/index.ts";
import { assertBox11Line10Sources } from "../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_line10.ts";
import { assertForm8915FSourceLinks } from "../../nodes/inputs/income/retirement/f8915f/index.ts";
import { assertW2GPayerCopyContents } from "./identity/w2g-payer-copy.ts";
import { assertLine1bHouseholdWageSource } from "../domains/income/other/line1b-household-wages.ts";
import { assertBusinessSchedule1Amounts } from "../domains/income/business/business-schedule1-reconciliation.ts";
import { assertPositiveW2GRecipient } from "./forms/income/other/w2g.ts";
import { reconciledForm8908Source } from "./forms/credits/business/f8908_source_reconciliation.ts";
import { assertForm8908PwaSubmittedPdfs } from "./forms/credits/business/f8908_pwa.ts";
import { assertPreparedVehicleAcknowledgments } from "./forms/deductions/charitable/f8283/f8283_vehicle_sale_evidence.ts";
import { assertForm1098IssuerCopies } from "../../nodes/inputs/deductions/mortgage/f1098/issuer_copy.ts";
import { assertExtensionPaymentSource } from "../domains/payments/settlement/extension-payment-reconciliation.ts";
import { assert1099RRecipientOwner } from "../domains/income/retirement/f1099r/f1099r-recipient-owner.ts";
import { assertNecWithholdingRecipient } from "../domains/payments/withholding/f1099n/f1099nec-withholding-owner.ts";
import { assert1099BRecipientOwner } from "../domains/income/other/f1099b/f1099b-recipient-owner.ts";
import {
  assertCapitalSaleSourceRows,
  assertNoRepeatedBrokerSaleSources,
} from "../domains/income/investments/broker-sale-source-reconciliation.ts";
import {
  assertPatrIssuedCopies,
  assertPatrWithholdingRecipient,
} from "../domains/payments/withholding/f1099p/f1099patr-withholding-owner.ts";
import {
  assertForm4852FilingRoute,
  assertLine1aWageSource,
  assertLine1iCombatPayElectionSource,
  assertW2WithholdingSource,
} from "../domains/payments/withholding/w2-withholding-reconciliation.ts";
import {
  assertLine1cForm4137Income,
  assertSchedule2Form4137Tax,
} from "../domains/taxes/employment/schedule2-form4137-reconciliation.ts";
import {
  assertLine1gForm8919Wages,
  assertSchedule2Form8919Tax,
} from "../domains/taxes/employment/schedule2-form8919-reconciliation.ts";
import { assertSchedule2ScheduleHTax } from "../domains/taxes/household-employment/schedule2-schedule-h-reconciliation.ts";
import { assertSchedule2Form8960Tax } from "../domains/taxes/investments/schedule2-form8960-reconciliation.ts";
import { assertSchedule2ScheduleSETax } from "../domains/taxes/self-employment/schedule2-schedule-se-reconciliation.ts";
import { assertSchedule2Form8828Tax } from "../domains/taxes/credit-recapture/schedule2-form8828-reconciliation.ts";
import { assertSchedule2Form8936Repayment } from "../domains/credits/individual/schedule2-form8936-reconciliation.ts";
import { assertSchedule3Form8859Credit } from "../domains/credits/individual/schedule3-form8859-reconciliation.ts";
import { assertSchedule3Form8834Credit } from "../domains/credits/individual/schedule3-form8834-reconciliation.ts";
import { assertSchedule3Form8912Credit } from "../domains/credits/individual/schedule3-form8912-reconciliation.ts";
import { assertSchedule3Form8396Credit } from "../domains/credits/individual/schedule3-form8396-reconciliation.ts";
import {
  assertSchedule2Line17HSources,
  assertSchedule2W2Line13Sources,
  assertSchedule2W2Line17KSource,
} from "../domains/taxes/other/schedule2-w2-source-reconciliation.ts";
import { assert1099WithholdingSource } from "../domains/payments/withholding/f1099/f1099-withholding-reconciliation.ts";
import { assert1099GUnemploymentSource } from "../domains/income/other/f1099g/f1099g-unemployment-reconciliation.ts";
import { assert1098EInterestSource } from "../domains/adjustments/education/f1098e/f1098e-source-reconciliation.ts";
import { assertF8288WithholdingOwner } from "../domains/payments/withholding/f8288/f8288-withholding-owner.ts";
import { assertOtherFormsWithholding } from "../domains/payments/withholding/f8288/f8288-withholding-reconciliation.ts";
import {
  assertFinalBalanceProjection,
  assertQualifiedDividendSubset,
} from "../return-processing/return-wide-arithmetic.ts";
import { assertDividendIncomeSources } from "../domains/income/other/f1099d/f1099div-income-reconciliation.ts";
import {
  assertScheduleBInterestJoin,
  assertScheduleBPreparedProjection,
} from "../domains/income/investments/schedule-b/schedule-b-interest-reconciliation.ts";
import { assertTaxExemptInterestSource } from "../domains/income/investments/tax-exempt-interest-reconciliation.ts";
import {
  assertBenefitStatementOwner,
  assertSocialSecurityBenefitSource,
} from "../domains/income/retirement/ssa-benefits-reconciliation.ts";
import { assertRrb1099rPensionSource } from "../domains/income/retirement/rrb1099r-pension-reconciliation.ts";
import { assertIra1099rIncomeSource } from "../domains/income/retirement/ira1099r-income-reconciliation.ts";
import {
  hasForm8994Claim,
  reconcileForm8994EvidenceBytes,
} from "../../nodes/inputs/credits/business/f8994/evidence_bytes.ts";
import {
  assertPublicForm8839Attachments,
  hasForm8839Claim,
} from "../../nodes/intermediate/forms/credits/individual/form8839/public_source.ts";

export interface MefBundle {
  readonly form8886Packets?: PreparedForm8886ReturnPackets;
  readonly retainedSourceDocuments?: readonly Form4852RetainedDocument[];
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
  readonly form8886?: {
    readonly prepared: PreparedForm8886ReturnPackets;
    readonly source: Form8886Source;
    readonly result: ExecuteResult;
  };
  readonly retainedSourceDocuments?: readonly Form4852RetainedDocument[];
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
    assertMefPdfEnvelope(attachment);
    const bytes = new Uint8Array(attachment.bytes);
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
      !(context.preparedForm8886 &&
        Object.values(Form8886PendingKey).some((key) =>
          key === form.pendingKey
        )) &&
      form.pendingKey !== "f1040" &&
      !sourceKeys.some((key) =>
        pending[key as keyof MefFormsPending] !== undefined
      )
    ) return [];
    const built = form.build(
      (source ?? []) as never,
      context,
    );
    const fragments = [
      ...(typeof built === "string" ? [built] : built),
      ...(form.buildAdditionalDocuments?.((source ?? []) as never, context) ??
        []),
    ];
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
  form4852EvidenceVerified = false,
  preparedForm8886?: PreparedForm8886ReturnPackets,
): {
  readonly xml: string;
  readonly form3800Parts?: Form3800DocumentParts;
  readonly documents: readonly MefDocumentFragment[];
} {
  assertEmployeeContributionReturn(pending);
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
  assertPreparedForm8886PublicSource(pending, preparedForm8886);
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
  assert1098EInterestSource(pending, filer);
  assert1099RRecipientOwner(pending.f1099r, filer);
  assertPositiveW2GRecipient(pending.w2g, filer);
  assertNecWithholdingRecipient(pending.f1099nec, filer);
  assert1099BRecipientOwner(pending.f1099b, filer);
  assertNoRepeatedBrokerSaleSources(pending.f1099b, pending.f8949);
  assertCapitalSaleSourceRows(pending);
  assertPatrIssuedCopies(pending.f1099patr);
  assertPatrWithholdingRecipient(pending.f1099patr, filer);
  assertLine1bHouseholdWageSource(pending);
  assertForm4852FilingRoute(pending, filer, form4852EvidenceVerified);
  reconcileForm8606RothInventories(pending, filer);
  reconcileForm8606RothActivity(pending, filer);
  assertW2WithholdingSource(pending, filer);
  assert1099WithholdingSource(pending, filer);
  assertOtherFormsWithholding(pending.f1040 ?? {}, pending, true);
  assertLine1aWageSource(pending);
  assertQualifiedDividendSubset(pending.f1040 ?? {});
  assertFinalBalanceProjection(pending.f1040 ?? {});
  assertDividendIncomeSources(pending.f1040 ?? {}, pending);
  assertScheduleBInterestJoin(pending);
  assertScheduleBPreparedProjection(pending);
  assertTaxExemptInterestSource(pending);
  assertBusinessSchedule1Amounts(pending);
  assertOwned7203RequiredCopies(pending);
  assertHsaExcessRequiredCopy(pending);
  assertRequiredLtcSource({ pending, filer });
  assertLine1iCombatPayElectionSource(pending);
  assertSchedule2W2Line13Sources(pending);
  assertSchedule2W2Line17KSource(pending);
  assertSchedule2Line17HSources(pending, filer);
  assertSchedule2Form4137Tax(pending);
  assertLine1cForm4137Income(pending);
  assertSchedule2Form8919Tax(pending);
  assertLine1gForm8919Wages(pending);
  assertSchedule2ScheduleHTax(pending);
  assertSchedule2Form8960Tax(pending);
  assertSchedule2ScheduleSETax(pending);
  assertSchedule2Form8828Tax(pending);
  assertSchedule2Form8936Repayment(pending);
  assertSchedule3Form8859Credit(pending);
  assertSchedule3Form8834Credit(pending);
  assertSchedule3Form8912Credit(pending);
  assertSchedule3Form8396Credit(pending);
  assert1099GUnemploymentSource(pending);
  assertF8288WithholdingOwner(pending.f8288, filer);
  assertSocialSecurityBenefitSource(pending);
  assertBenefitStatementOwner(pending, filer);
  assertRrb1099rPensionSource(pending, filer);
  assertIra1099rIncomeSource(pending);
  assertExtensionPaymentSource(pending, filer);
  assertForm8915FSourceLinks(pending);
  assertKIncomeClassification(pending);
  assertEitcChildSources(pending, filer);
  assertKReportedErrorSources(pending, filer);
  assertScheduleCReceiptSourceIdentity(pending, filer);
  assertScheduleCStatutoryW2Sources(pending, filer);
  assertKWithholdingSourceIdentity(pending, filer);
  assertKPersonalSaleSources(pending, filer);
  assertSchedule1Box3SourceIdentity(pending, filer);
  assertSchedule1Box8SourceIdentity(pending, filer);
  assertSchedule1Form8814Source(pending);
  assertSchedule1Form8621Source(pending);
  assertScheduleJSourceReturn(pending, executeComposedSourceReturn);
  assertSingleFarmQbiReturn(pending);
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
  assertScheduleD1040Join(pending);
  assertBox11Line10Sources(pending, k1Recipients);
  if (
    Array.isArray(pending.form8949) && pending.form8949.length > 0 &&
    !pending.schedule_d
  ) {
    throw new Error("Form 8949 needs its reconciled Schedule D");
  }
  assertAttachmentCoverage(pending, "mef", preparedForm8886);
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
    preparedForm8886,
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
    preparedForm8886,
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
    documents,
  };
}

/** Verify the retained native return still represents its prepared source. */
export function assertPreparedBundleProjection(
  bundle: MefBundle,
  filer: FilerIdentity,
): void {
  // ReturnTs is generated at preparation time when the filer has no timestamp.
  // Replay that retained instant so the native document comparison is stable.
  const retainedTimestamp = bundle.xml.match(
    /<ReturnTs>(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})-05:00<\/ReturnTs>/,
  )?.[1];
  if (!filer.timestamp && !retainedTimestamp) {
    throw new Error("Prepared MeF XML has no replayable ReturnTs");
  }
  const projected = buildReturnXml(
    bundle.pending,
    filer.timestamp ? filer : { ...filer, timestamp: `${retainedTimestamp}Z` },
    F1040_2025_CONFIG.mefSchemaVersion,
    2025,
    "1040",
    bundle.attachments,
    bundle.attachmentSha256ByFileName,
    bundle.retainedSourceDocuments !== undefined,
    bundle.form8886Packets,
  );
  if (projected.xml !== bundle.xml) {
    throw new Error(
      "Prepared MeF XML differs from its retained source projection",
    );
  }
  if (
    JSON.stringify(projected.form3800Parts) !==
      JSON.stringify(bundle.form3800Parts)
  ) {
    throw new Error(
      "Prepared Form 3800 PDF parts differ from the retained source projection",
    );
  }
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
  if (pending.f8978?.reviewed_source) {
    throw new Error(
      "Form8978 reviewed source needs validated attachment bundle",
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
  pendingInput: MefFormsPending,
  optionsInput: MefBundleOptions,
): Promise<MefBundle> {
  const pending = structuredClone(pendingInput);
  const options = {
    ...optionsInput,
    filer: optionsInput.filer ? structuredClone(optionsInput.filer) : undefined,
    attachments: optionsInput.attachments.map((row) => ({
      ...row,
      bytes: new Uint8Array(row.bytes),
    })),
    retainedSourceDocuments: optionsInput.retainedSourceDocuments?.map(
      (row) => ({ ...row, bytes: new Uint8Array(row.bytes) }),
    ),
    form8886: optionsInput.form8886
      ? {
        prepared: optionsInput.form8886.prepared,
        source: structuredClone(optionsInput.form8886.source),
        result: structuredClone(optionsInput.form8886.result),
      }
      : undefined,
  };
  if (options.form8886) {
    if (!options.filer) throw new Error("Form 8886 needs the return filer");
    await verifyPreparedForm8886ReturnPackets(
      options.form8886.prepared,
      options.form8886.source,
      options.form8886.result,
      options.filer,
    );
    if (
      await preparedSourceSha256(pending, options.filer) !==
        await preparedSourceSha256(
          buildPending(options.form8886.result.pending),
          options.filer,
        )
    ) {
      throw new Error(
        "Form 8886 calculation differs from the MeF pending return",
      );
    }
  }
  await assertForm1098IssuerCopies(pending);
  const retainedSourceDocuments = (options.retainedSourceDocuments ?? []).map((
    d,
  ) => ({
    document_reference: d.document_reference,
    bytes: Uint8Array.from(d.bytes),
  }));
  await assertForm4852RetainedEvidence(
    pending,
    options.filer,
    retainedSourceDocuments,
  );
  const generated = await Promise.all(
    ALL_MEF_FORMS.map((form) =>
      "buildBinaryAttachments" in form && form.buildBinaryAttachments
        ? form.buildBinaryAttachments(
          (pending[form.pendingKey as keyof MefFormsPending] ?? {}) as never,
          { filer: options.filer, pending },
        )
        : Promise.resolve([] as ReadonlyArray<MefPdfAttachment>)
    ),
  );
  const attachments = await validatePdfAttachments([
    ...options.attachments,
    ...generated.flat(),
  ]);
  await assertReviewedForm8283PdfFields(
    pending.f8283,
    options.filer,
    attachments,
  );
  if (hasForm8839Claim(pending)) {
    const route = pending.form8839_route as
      | { public_source?: unknown }
      | undefined;
    if (!route) {
      throw new Error("Form 8839 needs a reviewed executor route");
    }
    await assertPublicForm8839Attachments(route.public_source, attachments);
  }
  if (pending.f8978?.reviewed_source) {
    await assertForm8978SourceBytes(
      pending as Record<string, Record<string, unknown>>,
      options.filer,
      attachments,
    );
  }
  if (hasForm8994Claim(pending)) {
    await reconcileForm8994EvidenceBytes(pending.f8994, attachments);
  }
  if (pending.f8908) {
    const { source } = reconciledForm8908Source(pending.f8908, pending.f3800);
    await assertForm8908PwaSubmittedPdfs(source, attachments);
  }
  await assertForm8835TransferStatements(
    pending.f8835,
    options.filer,
    attachments,
  );
  await assertForm8835DomesticStatements(
    pending.f8835,
    options.filer,
    attachments,
  );
  await assertForm8835IncreaseStatements(
    pending.f8835,
    options.filer,
    attachments,
  );
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
    pending.f4852 !== undefined,
    options.form8886?.prepared,
  );
  const form8886Packets = options.form8886 && options.filer
    ? await finalizeForm8886NativeReturnPackets(
      options.form8886.prepared,
      options.form8886.source,
      options.form8886.result,
      options.filer,
      prepared.documents,
    )
    : undefined;
  if (pending.f8283) {
    await assertPreparedVehicleAcknowledgments(
      pending.f8283,
      attachments,
      prepared.xml,
      options.filer?.primarySSN ?? "",
    );
  }
  return {
    xml: prepared.xml,
    form3800Parts: prepared.form3800Parts,
    form8886Packets,
    retainedSourceDocuments,
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
