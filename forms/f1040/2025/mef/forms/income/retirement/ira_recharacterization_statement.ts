import { element, elements } from "../../../../../mef/xml.ts";
import { reconcileIraRecharacterizations } from "../../../../domains/income/retirement/form8606/form8606_recharacterization_source.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
export const iraRecharacterizationStatement: MefFormDescriptor<
  "ira_recharacterization_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "ira_recharacterization_statement",
  sourcePendingKeys: ["f1099r", "f4852"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8606--2025.pdf",
  build(_fields, context) {
    return reconcileIraRecharacterizations(
      context?.pending ?? {},
      context?.filer,
    ).map((text) =>
      elements("IRARecharacterizationStmt", [element("ExplanationTxt", text)])
    );
  },
};
