import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { reconciledForm8908Source } from "./f8908_source_reconciliation.ts";

const countTags = [
  "TotalHomesMeetingStandardQty",
  "TotalMfrHmMeetingStdQty",
  "TotQlfyEgyStarProgNotCertQty",
  "TotQlfyEgyStarProgCertQty",
  "TotQlfyEgyStarNotMetNotCertQty",
  "TotQlfyEgyStarNotMetCertQty",
] as const;
const amountTags = [
  "TotalHomesStandardAmt",
  "TotalManufactureHomesAmt",
  "TotQlfyEgyStarProgNotCertAmt",
  "TotQlfyEgyStarProgCertAmt",
  "TotQlfyEgyStarNotMetNotCertAmt",
  "TotQlfyEgyStarNotMetCertAmt",
] as const;

/** Staged TY2025 IRS8908.xsd serializer; not in the public MeF registry. */
export const form8908: MefFormDescriptor<"f8908", unknown> = {
  pendingKey: "f8908",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8908--2025.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    const { source, lines } = reconciledForm8908Source(
      raw,
      context?.pending?.f3800,
    );
    if (
      context?.filer &&
      source.contractor_ssn !== context.filer.primarySSN &&
      source.contractor_ssn !== context.filer.spouse?.ssn
    ) {
      throw new Error("Form 8908 contractor SSN differs from filer and spouse");
    }
    return elements("IRS8908", [
      element("EligibleContractorInd", "true"),
      element("BssQlfyNewEgyEfficientHmInd", "true"),
      element("IssdEgyEfficiencySavCertInd", "true"),
      element("TotCertifierCnt", lines.itemD_distinct_certifiers),
      element("TotHomesCertifiedCnt", lines.itemE_certifications),
      ...countTags.flatMap((tag, index) => [
        element(tag, lines.counts[index]),
        element(amountTags[index], lines.credits[index]),
      ]),
      element("TotalCreditAmt", lines.line8),
      ...lines.certifiers.map((certifier) =>
        elements("CertifierInformationGrp", [
          elements("BusinessName", [
            element("BusinessNameLine1Txt", certifier.name),
          ]),
          element("StateAbbreviationCd", certifier.state),
          element("HomesCertifiedCnt", certifier.homes_certified),
          element(
            "OriginalModifiedCertCnt",
            certifier.modified_certifications,
          ),
        ])
      ),
      ...lines.first20HomeAddresses.map((home) =>
        elements("QualifiedHomesAddresses", [
          element("AddressLine1Txt", home.street),
          element("AddressLine2Txt", home.unit),
          element("CityNm", home.city),
          element("StateAbbreviationCd", home.state),
          element("ZIPCd", home.zip),
        ])
      ),
    ]);
  },
};
