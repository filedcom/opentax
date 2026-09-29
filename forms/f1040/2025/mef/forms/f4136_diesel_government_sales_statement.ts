import { element, elements } from "../../../mef/xml.ts";
import {
  allForm4136Claims,
  inputSchema,
} from "../../../nodes/inputs/f4136/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// The 2025 instructions require a separate statement of each government
// purchaser's identity and gallons for Form 4136 line 6a.
export const form4136DieselGovernmentSalesStatement: MefFormDescriptor<
  "f4136_diesel_government_sales_statement",
  unknown
> = {
  pendingKey: "f4136_diesel_government_sales_statement",
  sourcePendingKeys: ["f4136"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4136.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f4136;
    if (!raw) return "";
    const input = inputSchema.parse(raw);
    const line6a = allForm4136Claims(input).filter((claim) =>
      claim.line === "6a"
    );
    if (!line6a.length) return "";
    const buyers = new Map<string, {
      buyer_name: string;
      buyer_ein: string;
      gallons: number;
    }>();
    for (const claim of line6a) {
      for (const sale of claim.government_sales ?? []) {
        const key = `${sale.buyer_ein}:${sale.buyer_name}`;
        const previous = buyers.get(key);
        buyers.set(key, {
          buyer_name: sale.buyer_name,
          buyer_ein: sale.buyer_ein,
          gallons: (previous?.gallons ?? 0) + sale.gallons,
        });
      }
    }
    return elements(
      "ToWhomDieselFuelSoldStatement",
      [...buyers.values()].map(
        (buyer) =>
          elements("DieselFuelBuyer", [
            elements("BusinessName", [
              element("BusinessNameLine1Txt", buyer.buyer_name),
            ]),
            element("EIN", buyer.buyer_ein),
            element("GallonsBoughtQty", buyer.gallons),
          ]),
      ),
    );
  },
};
