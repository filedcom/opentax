import { element, elements } from "../../../mef/xml.ts";
import type { Form8621Lines } from "../../../nodes/inputs/f8621/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = { items?: readonly Form8621Lines[] };

function explain(line: Form8621Lines): string {
  return (line.item.excess_events ?? []).map((event, index) => {
    const result = line.excessEvents[index];
    if (!result) {
      throw new Error(
        "Form 8621 event is missing its holding-period allocation",
      );
    }
    const years = result.allocations.map((year) =>
      `${year.tax_year}: ${year.holding_days} days, ${year.allocated_amount} USD; PFIC year ${
        year.pfic_year ? "yes" : "no"
      }; foreign tax credit ${
        year.foreign_tax_credit ?? 0
      }; section 6621 interest ${year.interest_charge ?? 0}`
    ).join(". ");
    return `${event.kind} ${
      index + 1
    }, ${event.amount_usd} USD. Holding period ${event.holding_period_start} through ${event.event_date}; first PFIC tax year ${event.first_pfic_tax_year}. Holding-period allocation: ${years}.`;
  }).join(" ");
}

export const form8621ExcessStatement: MefFormDescriptor<
  "form8621_excess_statement",
  Input,
  readonly string[]
> = {
  pendingKey: "form8621_excess_statement",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8621.pdf",
  build(_fields, context) {
    const pending = context?.pending?.form8621 as Input | undefined;
    return (pending?.items ?? [])
      .filter((line) => (line.item.excess_events?.length ?? 0) > 0)
      .map((line) =>
        elements("TaxationOfExcessDistriStmt", [
          element("ExplanationTxt", explain(line)),
        ])
      );
  },
};
