import { element, elements } from "../../../mef/xml.ts";
import type { Form8621Lines } from "../../../nodes/inputs/f8621/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = { items?: readonly Form8621Lines[] };

function explain(line: Form8621Lines): string {
  const allocations = line.excessEvents.map((result, index) => {
    const years = result.allocations.map((year) =>
      `${year.tax_year}: ${year.holding_days} days, ${year.allocated_amount} USD; PFIC year ${
        year.pfic_year ? "yes" : "no"
      }; foreign tax credit ${
        year.foreign_tax_credit ?? 0
      }; section 6621 interest ${year.interest_charge ?? 0}`
    ).join(". ");
    return `${result.kind} ${
      index + 1
    }, ${result.amount_usd} USD on ${result.event_date}. Holding period ${result.holding_period_start} through ${result.event_date}; first PFIC tax year ${result.first_pfic_tax_year}. Holding-period allocation: ${years}.`;
  }).join(" ");
  const foreignRates = (line.item.excess_events ?? []).flatMap((event) =>
    event.kind === "distribution" && "currency_code" in event
      ? event.current_year_distributions.map((distribution) =>
        `${distribution.date}: ${distribution.spot_usd_per_unit} USD per ${event.currency_code} (${distribution.spot_rate_source})`
      )
      : event.kind === "disposition" && "net_proceeds_foreign" in event
      ? [
        `${event.event_date}: ${event.spot_usd_per_unit} USD per ${event.currency_code} (${event.spot_rate_source}); ${event.net_proceeds_foreign} ${event.currency_code} net proceeds less ${event.adjusted_basis_usd} USD adjusted basis`,
      ]
      : []
  );
  return foreignRates.length > 0
    ? `${allocations} Distribution-date spot rates: ${foreignRates.join("; ")}.`
    : allocations;
}

export const form8621ExcessStatement: MefFormDescriptor<
  "form8621_excess_statement",
  Input,
  readonly string[]
> = {
  pendingKey: "form8621_excess_statement",
  sourcePendingKeys: ["form8621"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8621.pdf",
  build(_fields, context) {
    const pending = context?.pending?.form8621 as Input | undefined;
    return (pending?.items ?? [])
      .filter((line) => line.excessEvents.some((event) => event.amount_usd > 0))
      .map((line) =>
        elements("TaxationOfExcessDistriStmt", [
          element("ExplanationTxt", explain(line)),
        ])
      );
  },
};
