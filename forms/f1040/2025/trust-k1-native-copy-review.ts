import { z } from "zod";
import type { FilerIdentity } from "../mef/header.ts";
import { element, elements } from "../mef/xml.ts";
import { ty2025IrsCountryCodeSchema } from "../nodes/irs_country_code.ts";
import {
  type ExtractedTrustK1Copy,
  extractTrustK1IssuedCopyFields,
} from "./trust-k1-issued-copy-fields.ts";

const street = z.string().max(35).regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/);
const city = z.string().max(22).regex(/^[A-Za-z]( ?[A-Za-z])*$/);
const states = new Set(
  "AL AK AS AZ AR CA CO CT DE DC FL GA GU HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND MP OH OK OR PA PR RI SC SD TN TX UT VT VI VA WA WV WI WY AA AE AP"
    .split(" "),
);
const text = z.string().regex(
  /^([!-~£§ÁÉÍÑÓ×ÚÜáéíñóúü] ?)*[!-~£§ÁÉÍÑÓ×ÚÜáéíñóúü]$/,
);
const address = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("us"),
    line1: street,
    line2: street.optional(),
    city,
    state: z.string().refine((value) => states.has(value)),
    zip: z.string().regex(/^\d{5}(?:\d{4}|\d{7})?$/),
  }).strict(),
  z.object({
    kind: z.literal("foreign"),
    line1: street,
    line2: street.optional(),
    city: z.string().max(50).regex(/^[A-Za-z]( ?[A-Za-z])*$/).optional(),
    province: text.max(17).optional(),
    country: ty2025IrsCountryCodeSchema,
    // The printed country wording is retained separately from the IRS code.
    printed_country_name: text.max(50),
    postal_code: text.max(16).optional(),
  }).strict(),
]);
export const trustK1BeneficiaryTranscriptionSchema = z.object({
  pdf_reference: z.string().min(1),
  person_name: z.string().max(35).regex(/^([A-Za-z0-9'\-] ?)*[A-Za-z0-9'\-]$/),
  in_care_of_name: z.string().max(35).regex(
    /^% ([A-Za-z0-9#/%\-()&'] ?)*[A-Za-z0-9#/%\-()&']$/,
  ).optional(),
  address,
}).strict();
export type TrustK1BeneficiaryTranscription = z.infer<
  typeof trustK1BeneficiaryTranscriptionSchema
>;

// All scalar income boxes in their exact native sequence; box10 follows box9.
const scalarFields = [
  [12, "InterestIncomeAmt", false],
  [13, "OrdinaryDividendsAmt", false],
  [14, "QualifiedDividendsAmt", false],
  [15, "NetSTCapitalGainAmt", true],
  [16, "NetLTCapitalGainAmt", true],
  [17, "Collectibles28PercentGainAmt", true],
  [18, "UnrecapturedSection1250GainAmt", true],
  [19, "OtherPortfolioIncomeLossAmt", false],
  [20, "OrdinaryBusinessIncomeAmt", false],
  [21, "NetRentalIncomeRealEstateAmt", false],
  [22, "OtherRentalIncomeAmt", false],
] as const;
const codedFields = [
  [
    23,
    3,
    "BenefDirectlyApprtnDedGrp",
    "DirectlyApprtnDeductionsCd",
    "DirectlyApprtnDeductionsAmt",
    /^(?:[A-C]\*?|\*)$/,
  ],
  [
    30,
    5,
    "BenefFinalYearDeductionGrp",
    "FinalYearDeductionsCd",
    "FinalYearDeductionsAmt",
    /^(?:[A-F]\*?|\*)$/,
  ],
  [
    40,
    5,
    "AMTAdjustmentGrp",
    "AMTAdjustmentCd",
    "AMTAdjustmentAmt",
    /^(?:[A-J]\*?|\*)$/,
  ],
  [
    50,
    3,
    "BenefCrAndCreditRecaptureGrp",
    "CreditsAndRecaptureCd",
    "CreditsAndRecaptureAmt",
    /^(?:[A-T]|ZZ)$/,
  ],
  [
    56,
    6,
    "BenefOtherInformationGrp",
    "F1041K1OtherCd",
    "F1041K1OtherAmt",
    /^(?:[A-M]|ZZ)$/,
  ],
] as const;

export function parseTrustK1PrintedAmount(value: string): number {
  let input = value.trim();
  const parentheses = input.startsWith("(") && input.endsWith(")");
  if (parentheses) input = input.slice(1, -1);
  if (
    !/^-?\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(input) ||
    (parentheses && input.startsWith("-"))
  ) {
    throw Error(
      "Trust K-1 native amount needs unambiguous printed dollars and cents",
    );
  }
  const amount = Number(input.replace(/[$,]/g, "")) * (parentheses ? -1 : 1);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 100))
  ) {
    throw Error("Trust K-1 native amount exceeds exact cent precision");
  }
  return amount;
}

function normalized(value: string): string {
  return value.trim().replace(/[\s,]+/g, " ").toUpperCase();
}

function project(
  copy: ExtractedTrustK1Copy,
  recipient: TrustK1BeneficiaryTranscription,
  filer: FilerIdentity,
): string {
  const values = copy.canonicalFields;
  const field = (n: number) => String(values[`f1_${n}[0]`] ?? "").trim();
  const checked = (key: string) => values[key] === true;
  const owner = copy.beneficiarySsn === filer.primarySSN ? filer : filer.spouse;
  const ownerName = owner &&
    [owner.firstName, owner.middleInitial, owner.lastName, owner.suffix].filter(
      Boolean,
    ).join(
      " ",
    );
  if (
    !ownerName || normalized(ownerName) !== normalized(recipient.person_name)
  ) {
    throw Error("Trust K-1 native beneficiary name differs from current owner");
  }
  const a = recipient.address;
  const locality = a.kind === "us"
    ? [a.city, a.state, a.zip]
    : [a.city, a.province, a.postal_code, a.printed_country_name];
  const printed = [
    recipient.person_name,
    recipient.in_care_of_name,
    a.line1,
    a.line2,
    ...locality,
  ].filter(Boolean).join(" ");
  if (normalized(printed) !== normalized(field(11))) {
    throw Error(
      "Trust K-1 beneficiary transcription differs from printed name/address",
    );
  }
  const date = field(9);
  let filedDate: string | undefined;
  if (date) {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);
    if (!match || !checked("c1_2[0]")) {
      throw Error(
        "Trust K-1 Form1041-T date needs its printed indicator and valid date",
      );
    }
    filedDate = `${match[3]}-${match[1].padStart(2, "0")}-${
      match[2].padStart(2, "0")
    }`;
    const parsed = new Date(`${filedDate}T00:00:00Z`);
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== filedDate
    ) throw Error("Trust K-1 Form1041-T date is invalid");
  }
  if (checked("c1_4[0]") && checked("c1_4[1]")) {
    throw Error(
      "Trust K-1 has conflicting domestic/foreign beneficiary indicators",
    );
  }
  const group = (spec: typeof codedFields[number]): string[] => {
    const [start, rows, tag, codeTag, amountTag, pattern] = spec;
    return Array.from({ length: rows }, (_, i) => {
      const code = field(start + i * 2).toUpperCase(),
        amount = field(start + i * 2 + 1);
      if (!code && !amount) return "";
      if (!pattern.test(code) || !amount) {
        throw Error(
          `Trust K-1 ${tag} needs each printed code and amount; statements cannot be omitted`,
        );
      }
      return elements(tag, [
        element(codeTag, code),
        element(amountTag, parseTrustK1PrintedAmount(amount)),
      ]);
    });
  };
  return elements("IRS1041ScheduleK1", [
    element("FinalK1Ind", checked("c1_1[0]") ? "X" : undefined),
    element("AmendedK1Ind", checked("c1_1[1]") ? "X" : undefined),
    element("Form1041TFiledInd", checked("c1_2[0]") ? "X" : undefined),
    element("Form1041TFiledDt", filedDate),
    element("FutureFilingNotRequiredInd", checked("c1_3[0]") ? "X" : undefined),
    elements("BeneficiaryDetail", [
      element("SSN", copy.beneficiarySsn),
      element("BeneficiaryPersonNm", recipient.person_name),
      element("InCareOfNm", recipient.in_care_of_name),
      elements(a.kind === "us" ? "USAddress" : "ForeignAddress", [
        element("AddressLine1Txt", a.line1),
        element("AddressLine2Txt", a.line2),
        element("CityNm", a.city),
        ...(a.kind === "us"
          ? [element("StateAbbreviationCd", a.state), element("ZIPCd", a.zip)]
          : [
            element("ProvinceOrStateNm", a.province),
            element("CountryCd", a.country),
            element("ForeignPostalCd", a.postal_code),
          ]),
      ]),
    ]),
    element("DomesticBeneficiaryInd", checked("c1_4[0]") ? "X" : undefined),
    element("ForeignBeneficiaryInd", checked("c1_4[1]") ? "X" : undefined),
    ...scalarFields.map(([n, tag, nonnegative]) => {
      if (!field(n)) return "";
      const amount = parseTrustK1PrintedAmount(field(n));
      if (nonnegative && amount < 0) {
        throw Error(`Trust K-1 ${tag} requires a nonnegative native amount`);
      }
      return element(tag, amount);
    }),
    ...group(codedFields[0]),
    element(
      "EstateTaxDeductionAmt",
      field(29) ? parseTrustK1PrintedAmount(field(29)) : undefined,
    ),
    ...codedFields.slice(1).flatMap(group),
  ]);
}

export interface ReviewedTrustK1NativeCopy extends ExtractedTrustK1Copy {
  readonly nativeXml: string;
  readonly beneficiaryTranscription: TrustK1BeneficiaryTranscription;
  readonly filingReady: false;
}

/** Read-only source projection. Not registered for filing: graph joins, statements,
 * checkbox/static-page authenticity and prepared issued-copy packet remain required. */
export async function reviewTrustK1NativeCopies(
  source: unknown,
  filer: FilerIdentity,
  documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
  transcriptions: readonly unknown[],
): Promise<readonly ReviewedTrustK1NativeCopy[]> {
  const recipients = transcriptions.map((row) =>
    trustK1BeneficiaryTranscriptionSchema.parse(row)
  );
  if (
    new Set(recipients.map((r) => r.pdf_reference)).size !== recipients.length
  ) {
    throw Error(
      "Trust K-1 native review rejects duplicate beneficiary transcriptions",
    );
  }
  const copies = await extractTrustK1IssuedCopyFields(source, filer, documents);
  if (recipients.length !== copies.length) {
    throw Error(
      "Trust K-1 native review needs exactly one beneficiary transcription per issued copy",
    );
  }
  return copies.map((copy) => {
    const recipient = recipients.find((r) =>
      r.pdf_reference === copy.pdfReference
    );
    if (!recipient) {
      throw Error(
        "Trust K-1 native review needs its printed beneficiary transcription",
      );
    }
    return {
      ...copy,
      nativeXml: project(copy, recipient, filer),
      beneficiaryTranscription: recipient,
      filingReady: false,
    };
  });
}
