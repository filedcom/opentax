import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  parent_name: string;
  parent_name_control: string;
  parent_ssn: string;
  parent_filing_status: FilingStatus;
  line1_child_unearned_income?: number;
  line2_kiddie_deduction?: number;
  line3_adjusted_unearned_income?: number;
  line4_child_taxable_income?: number;
  line5_child_net_unearned_income?: number;
  line6_parent_taxable_income?: number;
  line7_other_children_income?: number;
  line8_family_income?: number;
  line9_family_tax?: number;
  line9_preferential_tax_used?: boolean;
  line10_parent_tax?: number;
  line10_preferential_tax_used?: boolean;
  line11_children_tax?: number;
  line12a_children_income?: number;
  line12b_allocation_ratio?: number;
  line13_allocable_tax?: number;
  line14_child_net_income?: number;
  line15_child_net_income_tax?: number;
  line15_preferential_tax_used?: boolean;
  line16_combined_child_tax?: number;
  line17_child_regular_tax?: number;
  line17_preferential_tax_used?: boolean;
  line18_child_tax?: number;
}

const FILING_STATUS_CODE: Record<FilingStatus, string> = {
  [FilingStatus.Single]: "1",
  [FilingStatus.MFJ]: "2",
  [FilingStatus.MFS]: "3",
  [FilingStatus.HOH]: "4",
  [FilingStatus.QSS]: "5",
};

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1_child_unearned_income", "ChildInvestmentIncomeAmt"],
  ["line2_kiddie_deduction", "KiddieDeductionAmt"],
  ["line3_adjusted_unearned_income", "ChildUnearnedIncomeAdjustedAmt"],
  ["line4_child_taxable_income", "ChildTaxableIncomeAmt"],
  ["line5_child_net_unearned_income", "ChildNetInvestmentIncomeAmt"],
  ["line6_parent_taxable_income", "ParentTaxableIncomeAmt"],
  ["line7_other_children_income", "OtherChildrenInvestmentIncmAmt"],
  ["line8_family_income", "FamilyIncomeAmt"],
  ["line9_family_tax", "FamilyTentativeTaxAmt"],
  ["line10_parent_tax", "ParentTentativeTaxAmt"],
  ["line11_children_tax", "ChildrenTaxAmt"],
  ["line12a_children_income", "NetChildrenInvestmentIncomeAmt"],
  ["line12b_allocation_ratio", "ChildrenInvestmentPct"],
  ["line13_allocable_tax", "ChildrenInvestmentAllcblTaxAmt"],
  ["line14_child_net_income", "ChildNetIncomeAmt"],
  ["line15_child_net_income_tax", "ChildNetIncomeTaxAmt"],
  ["line16_combined_child_tax", "TotalAllocableAndNetTaxAmt"],
  ["line17_child_regular_tax", "TaxOnChildTaxableIncomeAmt"],
  ["line18_child_tax", "KiddieTaxAmt"],
];

function buildIRS8615(fields: Partial<Fields>): string {
  if (!fields.parent_name) return "";
  if (
    !fields.parent_name_control || !fields.parent_ssn ||
    !fields.parent_filing_status
  ) {
    throw new Error(
      "Form 8615 needs the parent's name control, SSN, and filing status",
    );
  }
  const children = [
    element("ParentNm", fields.parent_name),
    element("ParentNameControlTxt", fields.parent_name_control.toUpperCase()),
    element("SSN", fields.parent_ssn.replaceAll("-", "")),
    element(
      "IndividualReturnFilingStatusCd",
      FILING_STATUS_CODE[fields.parent_filing_status],
    ),
    ...FIELD_MAP.flatMap(([key, tag]) => {
      const value = fields[key];
      const indicator = key === "line9_family_tax" &&
          fields.line9_preferential_tax_used
        ? element("FamilyCapitalGainsTaxInd", "X")
        : key === "line10_parent_tax" && fields.line10_preferential_tax_used
        ? element("ParentCapitalGainsTaxInd", "X")
        : key === "line15_child_net_income_tax" &&
            fields.line15_preferential_tax_used
        ? element("ChildUnearnedIncomeInd", "X")
        : key === "line17_child_regular_tax" &&
            fields.line17_preferential_tax_used
        ? element("ChildCapitalGainInd", "X")
        : "";
      return [indicator, typeof value === "number" ? element(tag, value) : ""];
    }),
  ];
  return elements("IRS8615", children);
}

export const form8615: MefFormDescriptor<"form8615", Partial<Fields>> = {
  pendingKey: "form8615",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8615.pdf",
  build(fields) {
    return buildIRS8615(fields);
  },
};
