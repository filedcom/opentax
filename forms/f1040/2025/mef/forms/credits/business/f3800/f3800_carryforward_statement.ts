import { element, elements } from "../../../../../../mef/xml.ts";
import {
  inputSchema as f3800InputSchema,
  reconcileForm3800NonpassiveCarryforwards,
} from "../../../../../../nodes/inputs/credits/business/f3800/index.ts";
import type { MefFormDescriptor } from "../../../../form-descriptor.ts";

/** One source-vintage computation for each native Form 3800 carryforward. */
export const form3800CarryforwardStatement: MefFormDescriptor<
  "f3800_carryforward_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "f3800_carryforward_statement",
  sourcePendingKeys: ["f3800"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f3800.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f3800;
    if (raw === undefined) return [];
    const entries = f3800InputSchema.parse(raw).carryforward_vintages ?? [];
    reconcileForm3800NonpassiveCarryforwards(entries);
    if (context.documentIdsByTag) {
      const ids = context.documentIdsByTag.CarryforwardGeneralBusinessCr ?? [];
      if (
        ids.length !== entries.length || ids.some((id) => !id.trim()) ||
        new Set(ids).size !== ids.length
      ) {
        throw new Error(
          "Form 3800 carryforward computation needs one reserved document ID per vintage",
        );
      }
    }
    return entries.map(({ vintage }) => {
      const identification = `${vintage.credit_type} [${vintage.source_key}]`;
      if (identification.length > 100) {
        throw new Error(
          "Form 3800 carryforward credit identification exceeds the native statement limit",
        );
      }
      return elements("CarryforwardGeneralBusinessCr", [
        element("CreditIdentificationTxt", identification),
        element("CreditOriginatedTaxYr", vintage.originating_tax_year_end_date),
        element("CreditAmt", vintage.credit_generated_as_filed),
        element("CreditAllowedForYrAmt", vintage.credit_allowed_origin_year),
        ...vintage.historical_uses.filter((use) => use.kind === "carryback")
          .sort((a, b) => a.tax_year - b.tax_year)
          .map((use) =>
            elements("CarrybackCrRemainingGrp", [
              element("CarryYr", use.tax_year_end_date),
              element("CarryAllowedAmt", use.credit_allowed),
            ])
          ),
        ...vintage.historical_uses.filter((use) => use.kind === "carryforward")
          .sort((a, b) => a.tax_year - b.tax_year)
          .map((use) =>
            elements("CarryforwardCrRemainingGrp", [
              element("CarryYr", use.tax_year_end_date),
              element("CarryAllowedAmt", use.credit_allowed),
            ])
          ),
      ]);
    });
  },
};
