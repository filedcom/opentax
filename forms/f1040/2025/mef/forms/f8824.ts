import { element, elements } from "../../../mef/xml.ts";
import {
  calculateLikeKindExchange,
  requiresGainStatement,
} from "../../../nodes/intermediate/forms/form8824/calculation.ts";
import {
  type Form8824Input,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8824/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  buildForm8824GainStatement,
  GAIN_STATEMENT_FILE,
} from "./f8824_gain_statement.ts";

type Input = Form8824Input;

// Part III is calculated from exchange inputs, not copied from caller totals.
export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function validateExchangeTiming(input: {
  date_acquired: string;
  date_transferred: string;
  date_identified: string;
  date_received: string;
  return_due_date_including_extensions?: string;
}): void {
  const acquired = new Date(`${input.date_acquired}T00:00:00Z`);
  const transferred = new Date(`${input.date_transferred}T00:00:00Z`);
  const identified = new Date(`${input.date_identified}T00:00:00Z`);
  const received = new Date(`${input.date_received}T00:00:00Z`);
  if (acquired > transferred || transferred > received) {
    throw new Error(
      "Form 8824 property dates must be in acquisition, transfer, receipt order",
    );
  }
  if (received.getTime() === transferred.getTime()) return;
  if (!input.return_due_date_including_extensions) {
    throw new Error(
      "Form 8824 deferred exchange needs the return due date including extensions",
    );
  }
  const due = new Date(
    `${input.return_due_date_including_extensions}T00:00:00Z`,
  );
  const day = 86_400_000;
  if (received.getTime() <= transferred.getTime() + 45 * day) {
    if (identified.getTime() !== received.getTime()) {
      throw new Error(
        "Form 8824 line 5 must use the receipt date when received within 45 days",
      );
    }
  } else if (identified.getTime() > transferred.getTime() + 45 * day) {
    throw new Error("Form 8824 written identification is later than 45 days");
  }
  if (
    received.getTime() > transferred.getTime() + 180 * day ||
    received > due
  ) {
    throw new Error(
      "Form 8824 replacement property was received after the exchange deadline",
    );
  }
}

function buildIRS8824(raw: Input, context: MefBuildContext = {}): string {
  if (Array.isArray(raw) && raw.length === 0) return "";
  const input = inputSchema.parse(raw);
  if (
    !input.relinquished_description || !input.received_description ||
    !input.date_acquired || !input.date_transferred ||
    !input.date_identified || !input.date_received ||
    input.related_party !== false ||
    input.recapture_applies !== false ||
    input.multiple_like_kind_properties !== false ||
    input.installment_method_applies !== false ||
    input.property_used_as_home !== false ||
    input.replacement_property_category !== "nondepreciable_land" ||
    input.relinquished_basis === undefined ||
    input.received_fmv === undefined
  ) {
    throw new Error(
      "Form 8824 MeF needs property and dates, basis and FMV, plus explicit eligibility and nondepreciable replacement land confirmations",
    );
  }
  validateExchangeTiming({
    date_acquired: input.date_acquired,
    date_transferred: input.date_transferred,
    date_identified: input.date_identified,
    date_received: input.date_received,
    return_due_date_including_extensions:
      input.return_due_date_including_extensions,
  });
  const lines = calculateLikeKindExchange(input);
  const needsStatement = requiresGainStatement(input);
  if (
    (input.other_property_fmv ?? 0) > 0 &&
    !input.other_property_description
  ) {
    throw new Error("Form 8824 other property received needs a description");
  }
  if (
    needsStatement &&
    !context.binaryAttachmentFileNames?.includes(GAIN_STATEMENT_FILE)
  ) {
    throw new Error(
      "Form 8824 exchange with cash or other property needs the IRS multi-asset gain statement attachment",
    );
  }
  if (lines.line22 > 0 && input.gain_type === undefined) {
    throw new Error(
      "Form 8824 recognized gain needs explicit capital or section 1231 classification",
    );
  }
  if (lines.line22 > 0) {
    const acquired = new Date(`${input.date_acquired}T00:00:00Z`);
    const transferred = new Date(`${input.date_transferred}T00:00:00Z`);
    const anniversary = new Date(acquired);
    anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
    if (transferred <= anniversary) {
      throw new Error(
        "Form 8824 recognized gain needs long-term holding period for the current destination lines",
      );
    }
  }
  if (lines.line22 > 0 && context.pending) {
    const destination = input.gain_type === "section_1231"
      ? context.pending.form4797
      : context.pending.schedule_d;
    const destinationFields = destination && typeof destination === "object" &&
        !Array.isArray(destination)
      ? destination as Record<string, unknown>
      : {};
    const sourceField = input.gain_type === "section_1231"
      ? "gain_form8824"
      : "gain_form8824_lt";
    if (destinationFields[sourceField] !== lines.line22) {
      throw new Error(
        `Form 8824 line 22 must match its ${
          input.gain_type === "section_1231" ? "Form 4797" : "Schedule D"
        } gain source`,
      );
    }
  }
  if (lines.line19 < 0) {
    throw new Error(
      "Form 8824 realized loss cannot be encoded in TY2025 MeF line 19's nonnegative amount type",
    );
  }
  if (
    Object.values(lines).some((value) => !Number.isSafeInteger(value)) ||
    lines.line25 < 0
  ) {
    throw new Error(
      "Form 8824 MeF amounts must be safe whole dollars with nonnegative replacement basis",
    );
  }
  const statementId = context.documentIdsByAttachmentFileName?.[
    GAIN_STATEMENT_FILE
  ];
  return elements(
    "IRS8824",
    [
      element("LikeKindPropertyGivenUpDsc", input.relinquished_description),
      element("LikeKindPropertyReceivedDsc", input.received_description),
      element("PropertyGivenUpAcquiredDt", input.date_acquired),
      element("PropertyTransferredDt", input.date_transferred),
      element("WrittenNoticeOfPropertyRcvdDt", input.date_identified),
      element("PropertyActuallyReceivedDt", input.date_received),
      element("ExchangeMadeWithRelatedPrtyInd", "false"),
      needsStatement
        ? ""
        : element("CashFMVNetLiabRedByExpnssAmt", lines.line15),
      needsStatement
        ? ""
        : element("FMVOfLikeKindPropertyRcvdAmt", lines.line16),
      needsStatement ? "" : element("RealizedAmt", lines.line17),
      needsStatement
        ? ""
        : element("AdjBssOfLikeKindPropGvnUpAmt", lines.line18),
      element("RealizedGainOrLossAmt", lines.line19),
      element("SmallerGainOrLossAmt", lines.line20),
      element("OrdinaryIncmUndRecaptureRlsAmt", lines.line21),
      element("SmllrGainLossLessOrdnryIncmAmt", lines.line22),
      element("RecognizedGainAmt", lines.line23),
      element("DeferredGainOrLossAmt", lines.line24),
      element("BasisOfLikeKindPropertyRcvdAmt", lines.line25),
    ],
    needsStatement
      ? {
        gainInMultiAssetExchStmtInd: "true",
        ...(statementId
          ? {
            referenceDocumentId: statementId,
            referenceDocumentName:
              "BinaryAttachment GeneralDependencySmall RealizedAndRecognizedGainInMultiAssetExchangesStmt",
          }
          : {}),
      }
      : undefined,
  );
}

export const form8824: MefFormDescriptor<"form8824", Input> = {
  pendingKey: "form8824",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8824--2025.pdf",
  build(fields, context) {
    return buildIRS8824(fields, context);
  },
  async buildBinaryAttachments(fields, context = {}) {
    const attachment = await buildForm8824GainStatement(fields, context.filer);
    return attachment ? [attachment] : [];
  },
};
