import { element, elements } from "../../../mef/xml.ts";
import {
  computePersonalCreditAmounts,
  type F8911Input,
} from "../../../nodes/inputs/f8911/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<F8911Input> & Record<string, unknown>;

export const form8911: MefFormDescriptor<"f8911", Input> = {
  pendingKey: "f8911",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8911.pdf",
  build(fields) {
    if (Object.keys(fields).length === 0) return "";
    const amounts = computePersonalCreditAmounts(fields as F8911Input);
    if (!amounts || amounts.allowedCredit === 0) return "";
    return elements("IRS8911", [
      element("PrsnlUseRefuelingPropCrAmt", amounts.tentativeCredit),
      element("RegularTaxBeforeCreditsAmt", amounts.regularTaxBeforeCredits),
      element("ForeignTaxCreditAmt", amounts.foreignTaxCredit),
      element("CertainAllowableCreditsAmt", amounts.certainAllowableCredits),
      element("TotalTaxCreditsAmt", amounts.totalOtherCredits),
      element("NetRegularTaxAmt", amounts.netRegularTax),
      element("TentativeMinimumTaxAmt", amounts.tentativeMinimumTax),
      element("AdjustedRegularTaxAmt", amounts.adjustedRegularTax),
      element("TotalPersonalUsePartOfCrAmt", amounts.allowedCredit),
    ]);
  },
};
