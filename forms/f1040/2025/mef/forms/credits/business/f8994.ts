import { element, elements } from "../../../../../mef/xml.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
import { reconcileForm8994DocumentSource } from "../../../../domains/credits/business/form8994/form8994_source.ts";

/** TY2025 v5.4 Shared/IRS8994/IRS8994.xsd A–D, then lines 1–3. */
export const form8994: MefFormDescriptor<"f8994", unknown> = {
  pendingKey: "f8994",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8994.pdf",
  build(raw, context) {
    if (raw === undefined || raw === null) return "";
    if (
      !context?.pending ||
      (context.phase !== "discovery" &&
        context.documentIdsByPendingKey?.f3800?.length !== 1)
    ) {
      throw new Error("Form 8994 needs one sourced Form 3800 document");
    }
    const { lines } = reconcileForm8994DocumentSource(
      raw,
      context.pending,
    );
    return elements("IRS8994", [
      element("WrttnPlcy2WksPdFamMedLvInd", "true"),
      element("WrttnPlcyPdFamMedLv50PctInd", "true"),
      element("PaidFamilyMedLeaveInd", "true"),
      element("WrttnPolicyNoninterferenceInd", "true"),
      element("TotPaidFamilyMedicalLeaveCrAmt", lines.line1),
      element("EmplrCrPdFamilyMedLeaveAmt", lines.line3),
    ]);
  },
};
