import { element, elements } from "../../../mef/xml.ts";
import type { Form8814Lines } from "../../../nodes/inputs/f8814/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export const childTaxableInterestStatement: MefFormDescriptor<
  "child_taxable_interest_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "child_taxable_interest_statement",
  sourcePendingKeys: ["form8814"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8814--2025.pdf",
  build(_fields, context?: MefBuildContext) {
    const source = context?.pending?.form8814;
    const items = source && typeof source === "object" && "items" in source &&
        Array.isArray(source.items)
      ? source.items as Form8814Lines[]
      : [];
    return items.flatMap(({ item }) => {
      const adjustments = item.interest_adjustments;
      if (
        !adjustments ||
        Object.values(adjustments).every((value) => value === undefined)
      ) return [];
      const nonTaxable = [
        ["ACCRUED INTEREST", adjustments.accrued_interest],
        ["ABP ADJUSTMENT", adjustments.abp_adjustment],
        ["OID ADJUSTMENT", adjustments.oid_adjustment],
      ] as const;
      return [elements("ChildTaxableInterestStmt", [
        adjustments.nominee_distribution === undefined
          ? ""
          : elements("ChildTaxableIntNomneDistriGrp", [
            element("NomineeDistributionCd", "ND"),
            element("NomineeDistributionAmt", adjustments.nominee_distribution),
          ]),
        ...nonTaxable.filter(([, value]) => value !== undefined).map(
          ([code, value]) =>
            elements("ChildNonTaxableInterestGrp", [
              element("ChildNonTaxableInterestTypeCd", code),
              element("ChildNonTaxableInterestAmt", value),
            ]),
        ),
      ])];
    });
  },
};
