import { element, elements } from "../../../mef/xml.ts";
import {
  currentYearDistributionLines,
  type Form8915FItem,
  inputSchema,
  verifyCurrentYearDistributionSource,
} from "../../../nodes/inputs/f8915f/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import type { z } from "zod";

export function form8915FOwnerName(
  item: Form8915FItem,
  filer: FilerIdentity | undefined,
): string {
  const spouse = filer?.spouse;
  const name = item.owner === "T"
    ? filer?.fullName ?? filer?.nameLine1
    : spouse
    ? [spouse.firstName, spouse.middleInitial, spouse.lastName, spouse.suffix]
      .filter(Boolean).join(" ")
    : undefined;
  if (!name) throw new Error("Form 8915-F needs the distribution owner's name");
  return name;
}

/** The bounded current-year TY2025 plan or traditional IRA path. */
export function buildCurrentYearDistributionForm8915F(
  item: Form8915FItem,
  context: MefBuildContext | undefined,
): string {
  const filer = context?.filer;
  verifyCurrentYearDistributionSource(item, context?.pending?.f1099r, filer);
  const filed1040 = context?.pending?.f1040 as
    | {
      line4a_ira_gross?: number;
      line4b_ira_taxable?: number;
      line5a_pension_gross?: number;
      line5b_pension_taxable?: number;
    }
    | undefined;
  const lines = currentYearDistributionLines(item);
  const matches1040 = item.retirement_source_kind === "plan"
    ? filed1040?.line5a_pension_gross === item.gross_distribution &&
      filed1040?.line5b_pension_taxable === lines.line15_form1040_line5b
    : filed1040?.line4a_ira_gross === item.gross_distribution &&
      filed1040?.line4b_ira_taxable === lines.line26_form1040_line4b;
  if (!matches1040) {
    throw new Error(
      item.retirement_source_kind === "plan"
        ? "Form 8915-F plan distribution must match Form 1040 lines 5a and 5b"
        : "Form 8915-F IRA distribution must match Form 1040 lines 4a and 4b",
    );
  }
  const name = form8915FOwnerName(item, filer);
  return elements("IRS8915F", [
    element("PersonNm", name),
    element("SSN", item.recipient_ssn),
    element("TaxYearFilingFormCd", "2025"),
    element("CalendarYrDisasterCd", "2025"),
    element("FEMADisasterDeclarationNum", item.fema_number),
    elements("TotalDistriAllRetirePlansGrp", [
      elements("FEMADisasterDeclarationGrp", [
        element("FEMADisasterDeclarationNum", item.fema_number),
        element("DisasterDeclarationDt", item.disaster_declaration_date),
        element("DisasterBeginDt", item.disaster_begin_date),
      ]),
      element("DistributionDt", item.distribution_date),
      element("TotalCYAvailDistributionsAmt", lines.line1e_available),
      item.retirement_source_kind === "plan"
        ? elements("DistriFromNotIRARetirePlanGrp", [
          element("CYTotalDistributionsAmt", lines.line2a_plan_distributions),
          element(
            "QualifiedDistributionsAmt",
            lines.line2b_qualified_plan_distributions,
          ),
        ])
        : elements("DistriTrdnSEPAndSIMPLEIRAGrp", [
          element("CYTotalDistributionsAmt", lines.line3a_ira_distributions),
          element(
            "QualifiedDistributionsAmt",
            lines.line3b_qualified_ira_distributions,
          ),
        ]),
      elements("TotalDistriAmtFromAllPlansGrp", [
        element(
          "CYTotalDistributionsAmt",
          lines.line5b_qualified_distributions,
        ),
        element(
          "QualifiedDistributionsAmt",
          lines.line5b_qualified_distributions,
        ),
      ]),
      element("LimitationDistributionsAmt", lines.line6_total_qualified),
    ]),
    item.retirement_source_kind === "plan"
      ? elements("QlfyDsstrDistriNotIRAPlansGrp", [
        element("QlfyDsstrDistriNotIRAPlansInd", "true"),
        element("QlfyDistriOrAllocationAmt", lines.line8_plan_qualified),
        element("DistributionsCostAmt", lines.line9_cost),
        element("QlfyDistriMinusDistriCostAmt", lines.line10_taxable),
        item.full_inclusion_elected
          ? element("OptOutSpreadThreeYrsInd", "X")
          : "",
        element("CYQlfySelectedDistriAmt", lines.line11_current_income),
        element("SumPriorYrAndCYSelDistriAmt", lines.line13_total_income),
        element("CYTaxableDistributionsAmt", lines.line15_form1040_line5b),
      ])
      : elements("QlfyDistriTrdnSEPSIMPLERothGrp", [
        element("QlfyDistriTrdnSEPSIMPLERothInd", "true"),
        element("QlfyDistriRequiredRptF8606Ind", "false"),
        element("QlfyDistriOrAllocationAmt", lines.line20_ira_qualified),
        element("SumForm8606AndDistriAllocnAmt", lines.line21_ira_taxable),
        item.full_inclusion_elected
          ? element("OptOutSpreadThreeYrsInd", "X")
          : "",
        element("CYQlfySelectedDistriAmt", lines.line22_current_ira_income),
        element("SumPriorYrAndCYSelDistriAmt", lines.line24_total_ira_income),
        element("CYTaxableDistributionsAmt", lines.line26_form1040_line4b),
      ]),
  ]);
}

export const form8915F: MefFormDescriptor<
  "f8915f",
  z.infer<typeof inputSchema>
> = {
  pendingKey: "f8915f",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8915f.pdf",
  build(fields, context) {
    const items = inputSchema.parse(fields).f8915fs ?? [];
    return items.length === 0
      ? ""
      : buildCurrentYearDistributionForm8915F(items[0], context);
  },
};
