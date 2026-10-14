import { element, elements } from "../../../../../mef/xml.ts";
import type { Form8621Lines } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { assertForm8621PrintableSource } from "../../../../domains/income/foreign/form8621/form8621_parent_source.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";

type Input = { items?: readonly Form8621Lines[] };

/** IRS multiple-disposition statement, with one sourced group per sale. */
export const form8621MtmDispositionsStatement: MefFormDescriptor<
  "form8621_mtm_dispositions_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "form8621_mtm_dispositions_statement",
  sourcePendingKeys: ["form8621"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8621.pdf",
  build(_fields, context) {
    const pending = context?.pending?.form8621 as Input | undefined;
    return (pending?.items ?? [])
      .filter((line) => (line.item.mtm_dispositions?.length ?? 0) > 1)
      .map((line) => {
        assertForm8621PrintableSource(line.item);
        return elements(
          "GainOrLossMrktToMrktElectStmt",
          (line.item.mtm_dispositions ?? []).map((sale) => {
            return elements("GainOrLossMrktToMrktElectGrp", [
              element("FMVStkOnDtSaleOrDisposAmt", sale.fair_market_value_usd),
              element(
                "AdjBasisStkOnDtSaleOrDisposAmt",
                sale.adjusted_basis_usd,
              ),
              element(
                "UnreversedInclusionsAmt",
                sale.unreversed_inclusions_usd,
              ),
            ]);
          }),
        );
      });
  },
};
