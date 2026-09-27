import { element, elements } from "../../../mef/xml.ts";
import {
  currentYear965Payment,
  deferredSCoTax,
  eligibleLiability,
  type F965Input,
  type F965Item,
  inputSchema,
  unpaidLiability,
} from "../../../nodes/inputs/f965/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

const PAID_TAGS = [
  "PaidYear1Amt",
  "PaidYear2Amt",
  "PaidYear3Amt",
  "PaidYear4Amt",
  "PaidYear5Amt",
  "PaidYear6Amt",
  "PaidYear7Amt",
  "PaidYear8Amt",
] as const;

function booleanElement(tag: string, value: boolean): string {
  return element(tag, String(value));
}

function counterparty(id: F965Item["counterparty_tax_id"]): string {
  return id ? element(id.kind === "ein" ? "EIN" : "SSN", id.value) : "";
}

function liabilityRow(input: F965Input, row: F965Item): string {
  const original = row.entry_type === "original";
  const net = original
    ? row.net_tax_with_965 - row.net_tax_without_965
    : undefined;
  const adjustment = row.entry_type === "assumed"
    ? row.assumed_liability
    : row.net_tax_adjustment;
  return elements("Net965TaxLiabInstalElectGrp", [
    element("NetTaxLiabilityYr", row.tax_year_of_inclusion),
    original ? element("NetTaxLiabilityWith965Amt", row.net_tax_with_965) : "",
    original
      ? element("NetTaxLiabilityWithout965Amt", row.net_tax_without_965)
      : "",
    net === undefined ? "" : element("NetSection965TaxLiabilityAmt", net),
    row.entry_type === "assumed"
      ? ""
      : element("InstallmentPaymentElectionAmt", eligibleLiability(input, row)),
    row.entry_type === "assumed"
      ? ""
      : booleanElement("InstallmentElectionInd", row.installment_election),
    adjustment !== 0 ||
      row.net_tax_adjustment_kind === "netted_adjustment_and_transfer"
      ? element("NetTaxAdjustmentAmt", adjustment)
      : "",
    counterparty(row.counterparty_tax_id),
    ...PAID_TAGS.map((tag, index) =>
      (row.paid_by_installment_year[index] ?? 0) > 0
        ? element(tag, row.paid_by_installment_year[index])
        : ""
    ),
    element("UnpaidTaxLiabilityAmt", unpaidLiability(input, row)),
    row.current_year_payment > 0
      ? element("PaidTaxLiabilityAmt", row.current_year_payment)
      : "",
  ]);
}

function businessName(name: string): string {
  return elements("SCorporationName", [
    element("BusinessNameLine1Txt", name),
  ]);
}

function sCorpCalculationGroups(input: F965Input): string[] {
  const years = [
    ...new Set(input.s_corp_calculations.map((row) => row.inclusion_year)),
  ].sort();
  return years.map((year) => {
    const rows = input.s_corp_calculations.filter((row) =>
      row.inclusion_year === year
    );
    return elements("TotalSCorpNet965TaxCmptGrp", [
      element("InclusionYr", year),
      ...rows.map((row) =>
        elements("SCorpNet965TaxComputationGrp", [
          businessName(row.corporation_name),
          element("SCorporationEIN", row.corporation_ein),
          element("NetTaxLiabilityWith965Amt", row.net_tax_with_965),
          element("NetTaxLiabilityWithout965Amt", row.net_tax_without_965),
          element(
            "NetSection965TaxLiabilityAmt",
            row.net_tax_with_965 - row.net_tax_without_965,
          ),
          booleanElement("DeferralElectionInd", row.deferral_election),
        ])
      ),
      element("NetSect965DeferredTaxLiabAmt", deferredSCoTax(input, year)),
    ]);
  });
}

function sCorpDeferredRows(input: F965Input): string[] {
  return input.s_corp_deferred_rows.map((row) => {
    const ending = row.beginning_deferred_liability -
      row.triggered_liability + row.transferred_liability;
    return elements("SCorpDeferredNet965TaxLiabGrp", [
      element("ElectionTransferYr", row.election_or_transfer_year),
      businessName(row.corporation_name),
      element("SCorporationEIN", row.corporation_ein),
      row.transferred_liability > 0 ? "" : element(
        "BeginningDeferredTaxLiabAmt",
        row.beginning_deferred_liability,
      ),
      row.triggered_liability > 0
        ? element("NetTaxLiabilityTriggeredAmt", row.triggered_liability)
        : "",
      row.transferred_liability !== 0
        ? element("DeferredNetTaxLiabTrnsfrAmt", row.transferred_liability)
        : "",
      row.counterparty_tax_id
        ? element(
          row.counterparty_tax_id.kind === "ein" ? "EIN" : "SSN",
          row.counterparty_tax_id.value,
        )
        : "",
      element("DeferredNetTaxLiabilityAmt", ending),
    ]);
  });
}

function buildIRS965A(input: F965Input, context?: MefBuildContext): string {
  const unpaid = input.f965s.reduce(
    (sum, row) => sum + unpaidLiability(input, row),
    0,
  );
  const currentPayment = currentYear965Payment(input);
  const deferred = input.s_corp_deferred_rows.reduce(
    (sum, row) =>
      sum + row.beginning_deferred_liability -
      row.triggered_liability + row.transferred_liability,
    0,
  );
  const needsNetStatement = input.f965s.some((row) =>
    row.net_tax_adjustment_kind === "netted_adjustment_and_transfer"
  );
  const needsMultipleTransfereeStatement = input.s_corp_deferred_rows.some(
    (row) => row.multiple_transferees,
  );
  const netStatementIds = context?.documentIdsByPendingKey
    ?.f965_net_adjustment_transfer_statement ?? [];
  const multipleStatementIds = context?.documentIdsByPendingKey
    ?.f965_multiple_transferee_statement ?? [];
  const agreementIds = input.transfer_agreements.map((agreement) =>
    context?.documentIdsByAttachmentFileName?.[agreement.file_name]
  );
  if (
    context?.binaryAttachmentFileNames &&
    input.transfer_agreements.some((agreement) =>
      !context.binaryAttachmentFileNames?.includes(agreement.file_name)
    )
  ) {
    throw new Error("Form 965-A needs each signed transfer agreement PDF");
  }
  if (
    context?.documentIdsByPendingKey &&
    ((needsNetStatement && netStatementIds.length === 0) ||
      (needsMultipleTransfereeStatement &&
        multipleStatementIds.length === 0))
  ) {
    throw new Error("Form 965-A needs its supporting transfer statement");
  }
  if (
    context?.documentIdsByAttachmentFileName &&
    agreementIds.some((id) => !id)
  ) {
    throw new Error("Form 965-A needs each signed transfer agreement PDF");
  }
  const statementIds = [
    ...agreementIds.filter((id): id is string => !!id),
    ...netStatementIds,
    ...multipleStatementIds,
  ];
  return elements(
    "IRS965A",
    [
      input.amended_report ? element("AmendedInd", "X") : "",
      ...input.f965s.map((row) => liabilityRow(input, row)),
      element("NetSection965TaxLiabUnpaidAmt", unpaid),
      element("NetSection965TaxLiabPaidAmt", currentPayment),
      ...sCorpCalculationGroups(input),
      ...sCorpDeferredRows(input),
      input.s_corp_deferred_rows.length > 0
        ? element("TotSCorpDefrdNet965TaxLiabAmt", deferred)
        : "",
    ],
    statementIds.length > 0
      ? {
        referenceDocumentId: statementIds.join(" "),
        referenceDocumentName:
          "BinaryAttachment NetAdjustmentTransferStatement MultipleTransfereeStatement",
      }
      : undefined,
  );
}

export const form965a: MefFormDescriptor<"f965", unknown> = {
  pendingKey: "f965",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f965a.pdf",
  build(raw, context?: MefBuildContext) {
    if (!raw || typeof raw !== "object" || !("f965s" in raw)) return "";
    const input = inputSchema.parse(raw);
    if (input.reporting_year !== 2025) {
      throw new Error("TY2025 Form 965-A requires a 2025 reporting year");
    }
    if (context?.pending) {
      const schedule2 = context.pending.schedule2;
      const line20 = schedule2 && typeof schedule2 === "object"
        ? (schedule2 as { line20_965_tax_installment?: number })
          .line20_965_tax_installment ?? 0
        : 0;
      if (Math.abs(line20 - currentYear965Payment(input)) > 0.005) {
        throw new Error(
          "Form 965-A Part II current-year payments differ from Schedule 2 line 20",
        );
      }
    }
    return buildIRS965A(input, context);
  },
  async buildBinaryAttachments(raw) {
    if (!raw || typeof raw !== "object" || !("f965s" in raw)) return [];
    const input = inputSchema.parse(raw);
    return input.transfer_agreements.map((agreement, index) => ({
      fileName: agreement.file_name,
      description: `Form ${agreement.agreement_type} agreement copy ${
        index + 1
      }`,
      bytes: Uint8Array.from(
        atob(agreement.signed_pdf_base64),
        (character) => character.charCodeAt(0),
      ),
    }));
  },
};
