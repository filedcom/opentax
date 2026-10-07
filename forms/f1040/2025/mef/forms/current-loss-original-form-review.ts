import { inputSchema as scheduleSchema } from "../../../nodes/inputs/schedule_e/index.ts";
import {
  calculateForm4835Lines,
  inputSchema as farmSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import { reconcileCurrentFarmRentalQbi } from "../../../nodes/inputs/f4835/qbi-source.ts";
import { reconcileCurrentPropertySource } from "../../../nodes/inputs/schedule_e/current-property-source.ts";
import { currentPropertyLossAllocation } from "../../../nodes/inputs/schedule_e/current-property-loss-allocation.ts";
import { inputSchema as saleSchema } from "../../../nodes/intermediate/forms/form4797/index.ts";
import { element, elements } from "../../../mef/xml.ts";
import { buildScheduleEPropertyLines } from "./schedule_e.ts";
import { buildForm4835Item } from "./f4835.ts";
import { reviewCurrentPropertyLoss8582 } from "./f8582-current-loss-review.ts";

/** Source-bound original-form review. It does not open any filing descriptor. */
export function reviewCurrentLossOriginalForms(
  pending: Readonly<Record<string, any>>,
) {
  const worksheet = reviewCurrentPropertyLoss8582(pending);
  const e = scheduleSchema.parse(pending.schedule_e);
  const farms = pending.f4835 === undefined
    ? []
    : farmSchema.parse(pending.f4835).f4835s;
  const sources = e.schedule_es.map((row) =>
    reconcileCurrentPropertySource(row)!
  );
  const farmSources = farms.map((row) => reconcileCurrentFarmRentalQbi(row)!);
  const facts = currentPropertyLossAllocation(sources, farmSources);
  const ledger = [
    ...worksheet.allocation.by_activity,
    ...facts.nonpassive_forms,
  ];
  const form = (id: string, reporting: string) =>
    ledger.find((r) => r.activity_id === id)?.forms.find((r) =>
      r.reporting_form === reporting
    );
  const properties = e.schedule_es.map((row) => {
    const operating = form(row.activity_id!, "Schedule E");
    const lines = buildScheduleEPropertyLines(
      row,
      operating?.allowed_loss ?? 0,
    );
    if (!lines) {
      throw new Error(
        "Current loss original-form review has an excluded property",
      );
    }
    return { activity_id: row.activity_id!, ...lines };
  });
  const farmRows = farms.map((row) => {
    const lines = calculateForm4835Lines(row);
    const allocated = form(row.activity_id!, "Form 4835");
    const allowedLoss = allocated?.allowed_loss ?? 0;
    const filedNet = allocated?.filed_net ?? lines.preliminaryNet;
    const xml = buildForm4835Item(row, undefined, undefined, allowedLoss);
    return {
      activity_id: row.activity_id!,
      preliminary_net: lines.preliminaryNet,
      allowed_loss: allowedLoss,
      filed_net: filedNet,
      gross: lines.gross,
      xml,
    };
  });
  const sales = saleSchema.parse(pending.form4797).passive_property_sales ?? [];
  const saleRows = sales.map((sale) => {
    const allocated = form(sale.activity_id, "Form 4797 Part II");
    if (sale.part !== "II" || !allocated) {
      throw new Error(
        "Current loss original-form review has an unreconciled sale",
      );
    }
    const filedNet = allocated.filed_net;
    const passive = facts.origins.find((r) =>
      r.activity_id === sale.activity_id
    )!.passive;
    const label =
      passive && allocated.current_loss > 0 && allocated.allowed_loss > 0
        ? "PAL"
        : passive && allocated.current_income > 0
        ? "FPA"
        : undefined;
    const description = `${
      label ? `${label} ` : ""
    }${sale.property_description}`.slice(0, 20);
    return {
      activity_id: sale.activity_id,
      source_reference: sale.current_loss_source_reference,
      acquired_on: sale.acquired_on,
      sold_on: sale.sold_on,
      gross_sales_price: sale.gross_sales_price,
      cost_or_other_basis: sale.cost_or_other_basis,
      depreciation_allowed: sale.depreciation_allowed,
      economic_gain_loss: sale.gross_sales_price - sale.cost_or_other_basis +
        sale.depreciation_allowed,
      allowed_loss: allocated.allowed_loss,
      suspended_loss: allocated.suspended_loss,
      filed_net: filedNet,
      label,
      description,
      // Fully suspended losses stay in the worksheet/ledger, without a deduction row.
      xml: filedNet === 0 ? "" : elements("OrdinaryGainLoss", [
        element("PropertyDesc", description),
        element("AcquiredDt", sale.acquired_on),
        element("SoldDt", sale.sold_on),
        element("GrossSalesPriceAmt", sale.gross_sales_price),
        element("DepreciationAllowedAmt", sale.depreciation_allowed),
        element("CostOrOtherBasisAmt", sale.cost_or_other_basis),
        element("GainOrLossAmt", filedNet),
      ]),
    };
  });
  const ordinary = saleRows.reduce((n, r) => n + r.filed_net, 0);
  const income = properties.reduce((n, r) => n + Math.max(0, r.net), 0);
  const losses = properties.reduce((n, r) => n + r.deductibleLoss, 0);
  const propertyNet = income - losses;
  const farmNet = farmRows.reduce((n, r) => n + r.filed_net, 0);
  const farmGross = farmRows.reduce((n, r) => n + r.gross, 0);
  const line5 = propertyNet + farmNet;
  if (
    ordinary !== (pending.schedule1?.line4_other_gains ?? 0) ||
    line5 !== (pending.schedule1?.line5_schedule_e ?? 0)
  ) {
    throw new Error(
      "Current loss original-form review differs from finalized Schedule 1",
    );
  }
  const sum = (
    key: "rent" | "royalty" | "mortgage" | "depreciation" | "expenses",
  ) => properties.reduce((n, r) => n + r[key], 0);
  const payments = e.schedule_es.some((r) => r.form_1099_payments_made);
  const scheduleXml = elements("IRS1040ScheduleE", [
    element("PaymentRqrFilingForm1099Ind", String(payments)),
    payments
      ? element(
        "RequiredForms1099FiledInd",
        String(e.schedule_es.every((r) =>
          !r.form_1099_payments_made || r.form_1099_filed
        )),
      )
      : "",
    ...properties.map((r) => r.xml),
    element("TotAllPaymentsAllRentalPropAmt", sum("rent")),
    element("TotAllPaymentsAllRyltyPropAmt", sum("royalty")),
    element("TotalMortgageInterestPaidAmt", sum("mortgage")),
    element("TotalDepreciationAmt", sum("depreciation")),
    element("TotalAllPropTotalExpensesAmt", sum("expenses")),
    element("IncomeAmt", income),
    losses > 0 ? element("LossesAmt", losses) : "",
    element(
      "TotalIncomeOrLossAmt",
      propertyNet,
      facts.nonpassive_forms.length
        ? {
          nonpassiveActivityLiteralCd: "NPA",
          nonpassiveActivityAmt: String(
            facts.nonpassive_forms.flatMap((r) => r.forms).filter((r) =>
              r.reporting_form === "Schedule E"
            ).reduce((n, r) => n + r.filed_net, 0),
          ),
        }
        : undefined,
    ),
    farmRows.length ? element("NetFarmRentalIncomeOrLossAmt", farmNet) : "",
    element("TotalSuppIncomeOrLossAmt", line5),
    farmRows.length ? element("FarmingAndFishingIncomeAmt", farmGross) : "",
  ]);
  const saleXml = saleRows.some((r) => r.xml)
    ? elements("IRS4797", [
      ...saleRows.map((r) => r.xml),
      element("TotalOrdinaryGainLossAmt", ordinary),
      element("OtherGainLossAmt", ordinary),
    ])
    : "";
  return {
    worksheet,
    properties,
    farmRows,
    saleRows,
    scheduleXml,
    saleXml,
    line4: ordinary,
    line5,
    filingReady: false as const,
    issuerVerified: false as const,
  };
}
