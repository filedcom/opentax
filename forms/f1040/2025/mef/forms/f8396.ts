import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8396,
  type Form8396Source,
  form8396SourceSchema,
} from "../../../nodes/intermediate/forms/form8396/calculation.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type LineKey =
  | "line1"
  | "line2"
  | "line3"
  | "line4"
  | "line5"
  | "line6"
  | "line7"
  | "line8"
  | "line9"
  | "line10"
  | "line12"
  | "line13"
  | "line14"
  | "line15"
  | "line16"
  | "line17";

type Input = Partial<Form8396Source> & Partial<Record<LineKey, number>> & {
  credit_limit_worksheet_line1?: number;
  credit_limit_worksheet_line2?: number;
} & Record<string, unknown>;

const SOURCE_KEYS = [
  "qualified_home_address_if_different",
  "certificate_issuer_name",
  "certificate_number",
  "certificate_issue_date",
  "mortgage_interest_paid",
  "interest_reporting_line",
  "mcc_rate",
  "home_is_main_residence",
  "home_in_issuer_jurisdiction",
  "interest_paid_to_related_person",
  "certificate_is_reissued",
  "nonspouse_coowner",
  "nonspouse_coowner_share",
  "carryforward_vintages",
] as const;

const FIELD_MAP: ReadonlyArray<readonly [LineKey, string]> = [
  ["line1", "CertifiedMortgageIntCrPdAmt"],
  ["line2", "MortgageCreditCertificateRt"],
  ["line3", "MortgageInterestReductionAmt"],
  ["line4", "MortgIntPrevious3YrCfwdCrAmt"],
  ["line5", "MortgIntPrevious2YrCfwdCrAmt"],
  ["line6", "MortgIntPYCarryforwardCrAmt"],
  ["line7", "MortgIntTotPreviousCfwdCrAmt"],
  ["line8", "TaxLiabLmtFromCrLmtWrkshtAmt"],
  ["line9", "MortgageInterestCreditAmt"],
  ["line10", "MortgIntRedPlusOldestCfwdCrAmt"],
  ["line12", "LargerOfMortgIntCrOrCfwdAmt"],
  ["line13", "MortgIntTentTwoYearCfwdCrAmt"],
  ["line14", "MortgIntNextYears2YrCfwdCrAmt"],
  ["line15", "MortgIntTent3YearCfwdCrAmt"],
  ["line16", "MortgIntNextYears3YrCfwdCrAmt"],
  ["line17", "MortgIntNextYearsPYCfwdCrAmt"],
];

function sourceFromPending(fields: Input): Form8396Source {
  const source = Object.fromEntries(
    SOURCE_KEYS.filter((key) => fields[key] !== undefined).map((key) => [
      key,
      fields[key],
    ]),
  );
  return form8396SourceSchema.parse(source);
}

function reconciledLines(fields: Input) {
  const source = sourceFromPending(fields);
  const worksheetLine1 = fields.credit_limit_worksheet_line1;
  const worksheetLine2 = fields.credit_limit_worksheet_line2;
  if (
    typeof worksheetLine1 !== "number" ||
    typeof worksheetLine2 !== "number" ||
    !Number.isSafeInteger(worksheetLine1) ||
    !Number.isSafeInteger(worksheetLine2) ||
    worksheetLine1 < 0 || worksheetLine2 < 0
  ) {
    throw new Error("Form 8396 needs its finalized credit limit worksheet");
  }
  const lines = calculateForm8396(
    source,
    Math.max(0, worksheetLine1 - worksheetLine2),
  );
  for (const [key] of FIELD_MAP) {
    if (fields[key] !== lines[key]) {
      throw new Error(`Form 8396 ${key} differs from its source calculation`);
    }
  }
  return { source, lines };
}

function checkFiledCredit(
  amount: number,
  context: MefBuildContext | undefined,
): void {
  if (!context?.pending) return;
  const schedule3 = context.pending.schedule3 as
    | Record<string, unknown>
    | undefined;
  const filed = schedule3?.line6g_mortgage_interest_credit;
  if ((typeof filed === "number" ? filed : 0) !== amount) {
    throw new Error("Form 8396 line 9 differs from Schedule 3 line 6g");
  }
}

export const form8396: MefFormDescriptor<"form8396", Input> = {
  pendingKey: "form8396",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8396.pdf",
  build(fields, context) {
    if (fields.mortgage_interest_paid === undefined) return "";
    const { source, lines } = reconciledLines(fields);
    checkFiledCredit(lines.line9, context);
    return elements("IRS8396", [
      source.qualified_home_address_if_different
        ? elements("QlfyMortgageCertUSAddress", [
          element(
            "AddressLine1Txt",
            source.qualified_home_address_if_different.line1,
          ),
          element(
            "AddressLine2Txt",
            source.qualified_home_address_if_different.line2,
          ),
          element("CityNm", source.qualified_home_address_if_different.city),
          element(
            "StateAbbreviationCd",
            source.qualified_home_address_if_different.state,
          ),
          element("ZIPCd", source.qualified_home_address_if_different.zip),
        ])
        : "",
      element("MortgSbsdyCertIssuerAgencyNm", source.certificate_issuer_name),
      element("MortgageCreditCertificateNum", source.certificate_number),
      element("MortgCrCertificateIssueDt", source.certificate_issue_date),
      ...FIELD_MAP.map(([key, tag]) => {
        const value = lines[key];
        return typeof value === "number" ? element(tag, value) : "";
      }),
    ]);
  },
};
