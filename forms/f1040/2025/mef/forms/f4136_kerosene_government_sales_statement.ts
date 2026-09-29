import { element, elements } from "../../../mef/xml.ts";
import {
  allForm4136Claims,
  inputSchema,
} from "../../../nodes/inputs/f4136/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// Form 4136 line 7a requires the government buyers and gallons sold to each.
export const form4136KeroseneGovernmentSalesStatement: MefFormDescriptor<
  "f4136_kerosene_government_sales_statement",
  unknown
> = {
  pendingKey: "f4136_kerosene_government_sales_statement",
  sourcePendingKeys: ["f4136"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4136.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f4136;
    if (!raw) return "";
    const input = inputSchema.parse(raw);
    const line7a = allForm4136Claims(input).filter((claim) =>
      claim.line === "7a"
    );
    if (!line7a.length) return "";
    const buyers = new Map<string, {
      buyer_name: string;
      buyer_ein: string;
      gallons: number;
    }>();
    for (const claim of line7a) {
      for (const sale of claim.government_sales ?? []) {
        const key = `${sale.buyer_ein}:${sale.buyer_name}`;
        const prior = buyers.get(key);
        buyers.set(key, {
          buyer_name: sale.buyer_name,
          buyer_ein: sale.buyer_ein,
          gallons: (prior?.gallons ?? 0) + sale.gallons,
        });
      }
    }
    return elements(
      "ToWhomKeroseneFuelSoldStmt",
      [...buyers.values()].map(
        (buyer) =>
          elements("KeroseneFuelBuyer", [
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
