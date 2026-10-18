import { element, elements } from "../../../../../mef/xml.ts";
import { retainedDisabilityPension } from "../../../../domains/income/other/line1h-source.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
import { mefTaxYear } from "../../../support/year-config.ts";

/** Explains a Form 1099-R disability pension filed on Form 1040 line 1h. */
export const nonW2DisabilityPaymentStatement: MefFormDescriptor<
  "non_w2_disability_payment_statement",
  unknown
> = {
  pendingKey: "non_w2_disability_payment_statement",
  sourcePendingKeys: ["f1099r"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf",
  build(_fields, context) {
    const amount = retainedDisabilityPension(
      context?.pending,
      mefTaxYear(context),
    );
    return amount > 0
      ? elements("NonW2DisabilityPaymentStmt", [
        element(
          "ExplanationTxt",
          `Form 1099-R disability pension of ${amount} received before minimum retirement age, reported on line 1h`,
        ),
      ])
      : "";
  },
};
