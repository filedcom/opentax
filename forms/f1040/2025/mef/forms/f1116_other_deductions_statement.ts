import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// Form 1116 Part I line 3b requires a separate list of deductions not
// definitely related to a particular source of income. The IRS schema links
// that line to one OtherDeductionsNotRelatedStmt document.
export const form1116OtherDeductionsStatement: MefFormDescriptor<
  "form1116_other_deductions_statement",
  unknown
> = {
  pendingKey: "form1116_other_deductions_statement",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.form_1116;
    if (!raw || typeof raw !== "object") return "";
    const amount = raw.other_deductions;
    if (typeof amount !== "number" || amount <= 0) return "";
    const explanation = raw.other_deductions_explanation;
    if (typeof explanation !== "string" || !explanation.trim()) {
      throw new Error(
        "Form 1116 other deductions need a source explanation",
      );
    }
    if (explanation.length > 9000) {
      throw new Error("Form 1116 other-deductions explanation is too long");
    }
    return elements("OtherDeductionsNotRelatedStmt", [
      element("ExplanationTxt", explanation.trim()),
    ]);
  },
};
