import {
  assertForm8835EarlyConstructionSource,
  form8835EarlyConstructionDeclaration,
} from "../../../../../nodes/inputs/credits/business/f8835/early-construction-source.ts";
import { PDFDocument } from "pdf-lib";
import { inputSchema } from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import {
  assertForm8835SmallFacilitySource,
  form8835IncreaseDescription,
} from "../../../../../nodes/inputs/credits/business/f8835/increase-source.ts";
import type { MefPdfAttachment } from "../../../form-descriptor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const smallFacilityDeclaration =
  "The facility has a maximum net output of less than 1 megawatt, measured in alternating current.";
export const increasedCreditPerjury =
  "Under penalties of perjury, I declare that I have examined this statement, including accompanying documents, and to the best of my knowledge and belief, the facts presented in support of this statement are true, correct, and complete.";

/** Verify the reviewed structured PDF, not the authenticity of its signature. */
export async function assertForm8835IncreaseStatements(
  raw: unknown,
  filer: FilerIdentity | undefined,
  attachments: readonly MefPdfAttachment[],
) {
  if (!raw) return;
  const source = inputSchema.parse(raw);
  const names = new Set<string>();
  for (const item of source.f8835s) {
    if (
      !["under_one_mw", "construction_before_2023_01_29"].includes(
        item.increased_credit_reason,
      )
    ) continue;
    assertForm8835SmallFacilitySource(item, true);
    assertForm8835EarlyConstructionSource(item, true);
    const review =
      (item.small_facility_source ?? item.early_construction_source)!;
    const matches = attachments.filter((a) =>
      a.fileName === review.statement_file_name
    );
    const attachment = matches[0];
    if (
      !filer || review.taxpayer_name !== filer.fullName ||
      review.taxpayer_tin !== filer.primarySSN ||
      names.has(review.statement_file_name) || matches.length !== 1 ||
      attachment.description !==
        form8835IncreaseDescription(item.facility_description!) ||
      await sha256Hex(attachment.bytes) !== review.statement_sha256
    ) {
      throw new Error(
        "Form 8835 increased statement needs distinct reviewed bytes for the final filer",
      );
    }
    names.add(review.statement_file_name);
    const pdf = await PDFDocument.load(attachment.bytes);
    if (pdf.getPageCount() < 1) {
      throw new Error("Form 8835 increased statement has no pages");
    }
    const expected = {
      TaxpayerName: review.taxpayer_name,
      TaxpayerTIN: review.taxpayer_tin,
      TaxYear: "2025",
      FacilityDescription: item.facility_description!,
      FacilityStreet: item.facility_us_address!.line1,
      FacilityCoordinates:
        `${item.facility_latitude}, ${item.facility_longitude}`,
      MaximumNetOutputMW: String(item.maximum_net_output_mw),
      ReviewReference: review.review_reference,
      SignerName: review.signer_name,
      SignedOn: review.signed_on,
      Declaration: item.early_construction_source
        ? form8835EarlyConstructionDeclaration(item)
        : smallFacilityDeclaration,
      PerjuryDeclaration: increasedCreditPerjury,
    };
    for (const [key, value] of Object.entries(expected)) {
      const actual = pdf.getForm().getTextField(`Form8835Increase.${key}`)
        .getText();
      if (
        actual?.trim().replace(/\s+/g, " ") !==
          value.trim().replace(/\s+/g, " ")
      ) {
        throw new Error(
          `Form 8835 increased statement ${key} differs from reviewed source`,
        );
      }
    }
  }
}
