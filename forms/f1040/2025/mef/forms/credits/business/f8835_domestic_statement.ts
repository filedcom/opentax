import { PDFDocument } from "pdf-lib";
import {
  calculateForm8835,
  type F8835Item,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import {
  assertForm8835DomesticSource,
  form8835DomesticDescription,
} from "../../../../../nodes/inputs/credits/business/f8835/domestic-source.ts";
import type { MefPdfAttachment } from "../../../form-descriptor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const domesticContentDeclaration =
  "Any steel, iron, or manufactured product that is a component of the facility upon completion of construction was produced in the United States, as determined under the domestic content requirements of section 45(b)(9) and Notice 2023-38.";
export const domesticContentPerjury =
  "Under penalties of perjury I declare that I have examined the information contained in this Domestic Content Certification Statement, and to the best of my knowledge and belief, it is true, correct, and complete.";

export function domesticStatementFields(item: F8835Item) {
  const s = item.domestic_content_source!;
  return {
    TaxpayerName: s.taxpayer_name,
    TaxpayerTIN: s.taxpayer_tin,
    CertificationYear: String(s.certification_year),
    ProjectCategory: "Qualified facility under section 45",
    FacilityType: item.energy_type === "WIND"
      ? "Land-based wind facility"
      : "Geothermal facility",
    FacilityDescription: item.facility_description!,
    FacilityAddress: [
      s.facility_address_line1,
      s.facility_address_line2,
      `${s.facility_city}, ${s.facility_state} ${s.facility_zip}`,
    ].filter(Boolean).join(", "),
    FacilityCoordinates: `${s.facility_latitude}, ${s.facility_longitude}`,
    PlacedInServiceOn: s.placed_in_service_on,
    FirstYearBonusCredit: String(s.first_year_bonus_credit),
    SignerName: s.signer_name,
    SignedOn: s.signed_on,
    Declaration: domesticContentDeclaration,
    PerjuryDeclaration: domesticContentPerjury,
  };
}

/** The reviewed content and bytes are checked; this does not authenticate signatures. */
export async function assertForm8835DomesticStatements(
  raw: unknown,
  filer: FilerIdentity | undefined,
  attachments: readonly MefPdfAttachment[],
) {
  if (!raw) return;
  const names = new Set<string>();
  for (const item of inputSchema.parse(raw).f8835s) {
    assertForm8835DomesticSource(item, true);
    if (!item.domestic_content_bonus) continue;
    const source = item.domestic_content_source!;
    const matches = attachments.filter((a) =>
      a.fileName === source.statement_file_name
    );
    const attachment = matches[0];
    if (
      !filer || source.taxpayer_name !== filer.fullName ||
      source.taxpayer_tin !== filer.primarySSN || matches.length !== 1 ||
      names.has(source.statement_file_name) ||
      attachment.description !==
        form8835DomesticDescription(item.facility_description!) ||
      await sha256Hex(attachment.bytes) !== source.statement_sha256 ||
      (source.certification_year === 2025 &&
        source.first_year_bonus_credit !== calculateForm8835(item).line10)
    ) {
      throw new Error(
        "Form 8835 domestic certification differs from final filer, first-year bonus or distinct retained bytes",
      );
    }
    names.add(source.statement_file_name);
    const pdf = await PDFDocument.load(attachment.bytes);
    if (!pdf.getPageCount()) {
      throw new Error("Form 8835 domestic certification has no pages");
    }
    for (
      const [key, expected] of Object.entries(domesticStatementFields(item))
    ) {
      const actual = pdf.getForm().getTextField(`Form8835Domestic.${key}`)
        .getText();
      if (
        actual?.trim().replace(/\s+/g, " ") !==
          expected.trim().replace(/\s+/g, " ")
      ) {
        throw new Error(
          `Form 8835 domestic certification ${key} differs from reviewed source`,
        );
      }
    }
  }
}
