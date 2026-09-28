import { element, elements } from "../../../mef/xml.ts";
import {
  assertForm7217FilingSource,
  computeForm7217Amounts,
  type Form7217Input,
  type Form7217Item,
  inputSchema,
} from "../../../nodes/inputs/f7217/index.ts";
import { assertForm7217GainFiling } from "../../form7217_gain_filing.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<Form7217Input> & Record<string, unknown>;

function amount(tag: string, value: number | undefined): string {
  return value === undefined ? "" : element(tag, value);
}

function boolean(tag: string, value: boolean | undefined): string {
  return value === undefined ? "" : element(tag, String(value));
}

function checkbox(tag: string, value: boolean | undefined): string {
  return value ? element(tag, "X") : "";
}

function businessName(tag: string, name: string): string {
  return elements(tag, [element("BusinessNameLine1Txt", name)]);
}

function buildForm7217(item: Form7217Item, context: MefBuildContext): string {
  const filer = context.filer;
  if (!filer) throw new Error("Form 7217 needs the partner's filer identity");
  assertForm7217GainFiling(item, filer, context.pending);
  const amounts = computeForm7217Amounts(item);
  return elements("IRS7217", [
    element("PartnerPersonNm", filer.fullName ?? filer.nameLine1),
    element("PartnerSSN", filer.primarySSN.replace(/\D/g, "")),
    businessName("DistributingPartnershipName", item.partnership_name),
    element(
      "DistributingPartnershipEIN",
      item.partnership_ein.replace(/\D/g, ""),
    ),
    element("PropertyDistributedDt", item.distribution_date),
    boolean("DistriLiqdtPrtnrIntPrtshpInd", item.complete_liquidation),
    boolean(
      "DistriTrtdSaleExchSect751bInd",
      item.section_751b_sale_or_exchange,
    ),
    element(
      "AdjBssPrtnrIntPrtshpBfrAmt",
      item.partner_adjusted_basis_before_distribution,
    ),
    amount("CashReceivedAmt", item.cash_received),
    amount("FMVMrktblSecRcvdAmt", item.marketable_securities_fmv),
    element("CashMrktblSecRcvdAmt", amounts.cashAndSecurities),
    element("SmllrPrtnrBssCashMrktblRcvdAmt", amounts.smallerBasisAndCash),
    element("RecognizedGainAmt", amounts.recognizedGain),
    boolean("USTxRqrPaidRecognizedGainInd", item.us_tax_required_on_gain),
    element("PrtnrBssPrtshpIntLessCashAmt", amounts.remainingPartnerBasis),
    element("TotPrtnrBssAllocDistriPropAmt", amounts.basisAllocatedToProperty),
    ...item.distributed_properties.map((property) =>
      elements("AllocationBssDistriPropGrp", [
        element("PropertyDesc", property.description),
        amount(
          "PrtshpBasisPropBfrDistriAmt",
          property.partnership_basis_before_distribution,
        ),
        checkbox("Sect732dBasisAdjInd", property.section_732d_basis_adjustment),
        checkbox("Sect732fBasisAdjInd", property.section_732f_basis_adjustment),
        checkbox("Sect734bBasisAdjInd", property.section_734b_basis_adjustment),
        checkbox("Sect743bBasisAdjInd", property.section_743b_basis_adjustment),
        amount("DistributedPropertyFMVAmt", property.fair_market_value),
        amount(
          "PrtnrBssPropAftrSect732Amt",
          property.partner_basis_after_section_732,
        ),
      ])
    ),
    element("TotPrtshpBasisPropBfrDistriAmt", amounts.totalPartnershipBasis),
    amount("TotDistributedPropertyFMVAmt", amounts.totalDistributedPropertyFMV),
    amount(
      "TotPrtnrBssPropAftrSect732Amt",
      amounts.totalPartnerBasisAfterSection732,
    ),
  ]);
}

export const form7217: MefFormDescriptor<"f7217", Input, readonly string[]> = {
  pendingKey: "f7217",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f7217.pdf",
  build(fields, context = {}) {
    if (Object.keys(fields).length === 0) return [];
    const input = inputSchema.parse(fields);
    assertForm7217FilingSource(input);
    return input.form7217s.map((item) => buildForm7217(item, context));
  },
};
