import { element, elements } from "../../../mef/xml.ts";
import {
  computeExpenses,
  computePropertyNet,
  type inputSchema,
  isVacationHomeExcluded,
  isVacationHomeLimited,
  itemSchema,
} from "../../../nodes/inputs/schedule_e/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import {
  allocatePassiveActivityLosses,
  inputSchema as form8582InputSchema,
  passiveLossLimit,
} from "../../../nodes/intermediate/forms/form8582/index.ts";
import { form8582 } from "./f8582.ts";
import { farmAllowedLosses } from "./f4835_passive_loss.ts";
import {
  calculateForm4835AtRiskNet,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import type { z } from "zod";

type Fields = Partial<z.infer<typeof inputSchema>>;
type Property = z.infer<typeof itemSchema>;

const propertyTypes = [
  "SINGLE FAMILY RESIDENCE",
  "MULTI-FAMILY RESIDENCE",
  "VACATION/SHORT-TERM RENTAL",
  "COMMERCIAL",
  "LAND",
  "ROYALTIES",
  "SELF-RENTAL",
  "OTHER",
] as const;

const expenseFields = [
  ["expense_advertising", "AdvertisingAmt"],
  ["expense_auto_travel", "AutoAndTravelAmt"],
  ["expense_cleaning", "CleaningAndMaintenanceAmt"],
  ["expense_commissions", "CommissionsAmt"],
  ["expense_insurance", "InsuranceAmt"],
  ["expense_legal_professional", "LegalAndOtherProfFeesAmt"],
  ["expense_management", "ManagementFeesAmt"],
  ["expense_mortgage_interest", "MortgageInterestPaidBanksAmt"],
  ["expense_other_interest", "MortgageInterestPaidOtherAmt"],
  ["expense_repairs", "RepairsAmt"],
  ["expense_supplies", "SuppliesAmt"],
  ["expense_taxes", "TaxesAmt"],
  ["expense_utilities", "UtilitiesAmt"],
] as const satisfies ReadonlyArray<readonly [keyof Property, string]>;

interface PropertyLines {
  readonly xml: string;
  readonly rent: number;
  readonly royalty: number;
  readonly mortgage: number;
  readonly depreciation: number;
  readonly expenses: number;
  readonly net: number;
  readonly deductibleLoss: number;
  readonly realEstateProfessionalNet: number;
}

function failUnsupportedFacts(item: Property): void {
  if (item.property_type === 8 && !item.property_type_other_desc) {
    throw new Error("Schedule E other property needs a description");
  }
  if (item.form_1099_payments_made && item.form_1099_filed === undefined) {
    throw new Error("Schedule E Form 1099 filing answer is required");
  }
  if (item.foreign_country) {
    throw new Error("Schedule E foreign property needs a complete MeF address");
  }
  if (
    item.property_type !== 6 &&
    (!item.street_address || !item.city || !item.state || !item.zip)
  ) {
    throw new Error("Schedule E rental property needs a complete US address");
  }
  if (
    item.property_type === 6 &&
    [item.street_address, item.city, item.state, item.zip].some(Boolean) &&
    ![item.street_address, item.city, item.state, item.zip].every(Boolean)
  ) {
    throw new Error("Schedule E royalty property address is incomplete");
  }
  if (
    (item.operating_expenses_carryover ?? 0) > 0 ||
    (item.prior_unallowed_passive_4797_part1 ?? 0) > 0 ||
    (item.prior_unallowed_passive_4797_part2 ?? 0) > 0 ||
    (item.prior_unallowed_at_risk ?? 0) > 0 ||
    (item.disallowed_mortgage_interest_8990 ?? 0) > 0 ||
    (item.disallowed_other_interest_8990 ?? 0) > 0
  ) {
    throw new Error(
      "Schedule E carryovers need their limitation worksheets in MeF",
    );
  }
  if (item.main_home_or_second_home && (item.occupancy_percent ?? 0) > 0) {
    throw new Error(
      "Schedule E mixed-use expense allocation is not filing-ready",
    );
  }
  if (item.personal_use_days > 0 && computeExpenses(item) > 0) {
    throw new Error(
      "Schedule E personal-use property needs explicit rental expense allocation",
    );
  }
  if ((item.section_179 ?? 0) > 0) {
    throw new Error("Schedule E section 179 needs Form 4562 reconciliation");
  }
}

function propertyAddress(item: Property): string {
  if (!item.street_address) return "";
  return elements("PropertyUSAddress", [
    element("AddressLine1Txt", item.street_address),
    element("CityNm", item.city),
    element("StateAbbreviationCd", item.state),
    element("ZIPCd", item.zip),
  ]);
}

function buildProperty(
  raw: Property,
  allowedPassiveLoss?: number,
): PropertyLines | undefined {
  const item = itemSchema.parse(raw);
  // §280A(g) excludes short-term rental income and deductions from Schedule E.
  if (isVacationHomeExcluded(item)) return undefined;
  failUnsupportedFacts(item);
  const fraction = (item.ownership_percent ?? 100) / 100;
  const allocated = (value: number | undefined) =>
    Math.round((value ?? 0) * fraction);
  const rent = allocated(item.rent_income);
  const royalty = allocated(item.royalties_income);
  const expenseAmounts = expenseFields.map(([key, tag]) => ({
    tag,
    value: item[key] === undefined ? undefined : allocated(item[key]),
  }));
  const depreciation = allocated(
    (item.expense_depreciation ?? 0) + (item.expense_depletion ?? 0),
  );
  const otherExpenses = (item.expense_other_lines ?? []).map((line) => ({
    description: line.description,
    amount: allocated(line.amount),
  }));
  const expenses =
    expenseAmounts.reduce((sum, line) => sum + (line.value ?? 0), 0) +
    depreciation + otherExpenses.reduce((sum, line) => sum + line.amount, 0);
  const net = rent + royalty - expenses;
  if (isVacationHomeLimited(item) && net < 0) {
    throw new Error(
      "Schedule E vacation-home deduction allocation is not filing-ready",
    );
  }
  const priorOperating = item.prior_unallowed_passive_operating ?? 0;
  const potentialLoss = Math.max(0, -net) + priorOperating;
  if (
    potentialLoss > 0 &&
    (item.activity_type === "A" || item.activity_type === "B") &&
    allowedPassiveLoss === undefined
  ) {
    throw new Error(
      "Schedule E passive loss needs Form 8582 allowed-loss allocation",
    );
  }
  if (net < 0 && item.some_investment_not_at_risk) {
    throw new Error("Schedule E at-risk loss needs linked Form 6198");
  }
  if (
    Math.round(computePropertyNet(item)) !== net ||
    Math.round(computeExpenses(item) * fraction) !== expenses
  ) {
    throw new Error(
      "Schedule E rounded property lines do not match the tax calculation",
    );
  }
  const deductibleLoss =
    item.activity_type === "A" || item.activity_type === "B"
      ? allowedPassiveLoss ?? 0
      : Math.max(0, -net);
  if (
    !Number.isSafeInteger(deductibleLoss) ||
    deductibleLoss < 0 || deductibleLoss > potentialLoss
  ) {
    throw new Error(
      "Schedule E deductible loss does not reconcile to property loss",
    );
  }
  const mortgage = allocated(item.expense_mortgage_interest);
  return {
    xml: elements("PropertyRealEstAndRoyaltyGroup", [
      propertyAddress(item),
      element("PropertyDesc", propertyTypes[item.property_type - 1]),
      element("OtherPropertyTypeDesc", item.property_type_other_desc),
      item.property_type === 6
        ? ""
        : element("FairRentalDaysCnt", item.fair_rental_days),
      item.property_type === 6
        ? ""
        : element("PersonalUseDaysCnt", item.personal_use_days),
      item.qualified_joint_venture
        ? element("QualifiedJointVentureInd", "X")
        : "",
      element("RentsReceivedAmt", rent),
      item.royalties_income === undefined
        ? ""
        : element("TotalRoyaltiesReceivedAmt", royalty),
      ...expenseAmounts.map(({ tag, value }) =>
        value === undefined ? "" : element(tag, value)
      ),
      item.expense_depreciation === undefined &&
        item.expense_depletion === undefined
        ? ""
        : element("DeprecExpenseOrDepletionAmt", depreciation),
      ...otherExpenses.map((line) =>
        elements("OtherExpenseDetail", [
          element("Desc", line.description),
          element("Amt", line.amount),
        ])
      ),
      element("TotalExpensesAmt", expenses),
      element("NetRentalIncomeOrLossAmt", net),
      deductibleLoss > 0 && item.property_type !== 6
        ? element("DedRentalRealEstateLossAmt", deductibleLoss)
        : "",
    ]),
    rent,
    royalty,
    mortgage,
    depreciation,
    expenses,
    net,
    deductibleLoss,
    realEstateProfessionalNet: item.activity_type === "C" ? net : 0,
  };
}

function sum(
  lines: readonly PropertyLines[],
  key: keyof Omit<PropertyLines, "xml">,
): number {
  return lines.reduce((total, line) => total + line[key], 0);
}

function validatePassiveActivityLink(
  items: readonly Property[],
  context: MefBuildContext | undefined,
): ReadonlyMap<number, number> {
  const needsLimitation = items.some((item) =>
    (item.activity_type === "A" || item.activity_type === "B") &&
    (computePropertyNet(item) < 0 ||
      (item.prior_unallowed_passive_operating ?? 0) > 0)
  );
  if (!needsLimitation) return new Map();
  const activityItems = items.flatMap((item, index) =>
    (item.activity_type === "A" || item.activity_type === "B") &&
      (computePropertyNet(item) !== 0 ||
        (item.prior_unallowed_passive_operating ?? 0) > 0)
      ? [{ item, index }]
      : []
  );
  if (activityItems.length === 0) return new Map();
  const linked = context?.pending?.form8582;
  if (!linked || typeof linked !== "object" || Array.isArray(linked)) {
    throw new Error("Schedule E passive loss needs a matching Form 8582");
  }
  const input = form8582InputSchema.parse(linked);
  if (
    activityItems.length > (input.activities?.length ?? 0) ||
    activityItems.some(({ item }, index) =>
      input.activities?.[index].name !== item.property_description ||
      input.activities[index].activity_type !== item.activity_type ||
      input.activities[index].property_type !== item.property_type ||
      input.activities[index].current_net !== computePropertyNet(item) ||
      input.activities[index].prior_unallowed_operating !==
        (item.prior_unallowed_passive_operating ?? 0) ||
      input.activities[index].prior_active_participation !==
        item.prior_passive_losses_active_when_incurred
    )
  ) {
    throw new Error(
      "Schedule E passive loss does not match Form 8582 activity",
    );
  }
  // The linked form proves the limitation and its per-activity worksheets.
  form8582.build(linked as Record<string, unknown>, context);
  const allowed = passiveLossLimit({
    currentIncome: input.current_income ?? 0,
    currentLoss: input.current_loss ?? 0,
    priorUnallowed: input.prior_unallowed ?? 0,
    rentalLoss: (input.rental_current_loss ?? 0) +
      (input.rental_prior_eligible_loss ?? 0),
    rentalIncome: input.rental_current_income ?? 0,
    activeParticipation: input.active_participation === true,
    modifiedAgi: input.modified_agi,
    filingStatus: input.filing_status,
  }).allowed;
  const allocations = allocatePassiveActivityLosses(
    (input.activities ?? []).map((activity) => ({
      currentNet: activity.current_net,
      priorUnallowed: activity.prior_unallowed_operating,
      specialEligible: activity.activity_type === "A",
      priorSpecialEligible: activity.prior_active_participation === true,
    })),
    allowed,
  ).allowed;
  return new Map(
    activityItems.map(({ index }, position) => [index, allocations[position]]),
  );
}

export const scheduleE: MefFormDescriptor<"schedule_e", Fields> = {
  pendingKey: "schedule_e",
  FIELD_MAP: [
    ["farm_rental_net", "NetFarmRentalIncomeOrLossAmt"],
    ["farm_rental_gross", "FarmingAndFishingIncomeAmt"],
  ],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040se.pdf",
  build(fields, context) {
    if (!fields || Object.keys(fields).length === 0) return "";
    if (
      fields.mortgage_interest !== undefined ||
      fields.expense_auto_travel !== undefined ||
      fields.expense_depletion !== undefined
    ) {
      throw new Error(
        "Schedule E unassigned passthrough expense needs property allocation",
      );
    }
    const itemList = fields.schedule_es ?? [];
    const allowedPassiveLosses = validatePassiveActivityLink(itemList, context);
    const properties = itemList.map((item, index) =>
      buildProperty(item, allowedPassiveLosses.get(index))
    ).filter(
      (line): line is PropertyLines => line !== undefined,
    );
    if (
      properties.length === 0 &&
      (fields.rental_income !== undefined ||
        fields.royalty_income !== undefined)
    ) {
      throw new Error("Schedule E 1099-MISC income needs a property row");
    }
    const farmNet = fields.farm_rental_net;
    const farmGross = fields.farm_rental_gross;
    if ((farmNet === undefined) !== (farmGross === undefined)) {
      throw new Error(
        "Schedule E farm rental line 40 and line 42 must both be supplied",
      );
    }
    const farmSource = context?.pending?.f4835;
    const farmItems = farmSource === undefined
      ? []
      : form4835InputSchema.parse(farmSource).f4835s;
    const farmPreliminaries = farmItems.map((item) =>
      calculateForm4835AtRiskNet(item).atRiskNet
    );
    if (
      farmItems.length > 0 &&
      farmPreliminaries.reduce((sum, net) => sum + net, 0) !== farmNet
    ) {
      throw new Error(
        "Schedule E farm rental amount does not match Form 4835 activities",
      );
    }
    if (farmNet !== undefined && farmNet < 0 && farmItems.length === 0) {
      throw new Error(
        "Schedule E farm rental loss needs linked Form 4835 limitation forms",
      );
    }
    const farmLosses = farmPreliminaries.reduce(
      (sum, net) => sum + Math.max(0, -net),
      0,
    );
    const farmAllowed = farmAllowedLosses(context).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const allowedFarmNet = farmNet === undefined
      ? undefined
      : farmNet + farmLosses - farmAllowed;
    if (properties.length === 0 && farmNet === undefined) return "";
    const payments = itemList.some((item) => item.form_1099_payments_made);
    const income = properties.filter((line) => line.net > 0).reduce(
      (total, line) => total + line.net,
      0,
    );
    const losses = sum(properties, "deductibleLoss");
    const propertyNet = income - losses;
    return elements("IRS1040ScheduleE", [
      itemList.length > 0
        ? element("PaymentRqrFilingForm1099Ind", String(payments))
        : "",
      payments
        ? element(
          "RequiredForms1099FiledInd",
          String(itemList.every((item) =>
            !item.form_1099_payments_made || item.form_1099_filed
          )),
        )
        : "",
      ...properties.map((line) => line.xml),
      properties.length > 0
        ? element("TotAllPaymentsAllRentalPropAmt", sum(properties, "rent"))
        : "",
      properties.length > 0
        ? element("TotAllPaymentsAllRyltyPropAmt", sum(properties, "royalty"))
        : "",
      properties.length > 0
        ? element("TotalMortgageInterestPaidAmt", sum(properties, "mortgage"))
        : "",
      properties.length > 0
        ? element("TotalDepreciationAmt", sum(properties, "depreciation"))
        : "",
      properties.length > 0
        ? element("TotalAllPropTotalExpensesAmt", sum(properties, "expenses"))
        : "",
      properties.length > 0 ? element("IncomeAmt", income) : "",
      losses > 0 ? element("LossesAmt", losses) : "",
      properties.length > 0 ? element("TotalIncomeOrLossAmt", propertyNet) : "",
      allowedFarmNet === undefined
        ? ""
        : element("NetFarmRentalIncomeOrLossAmt", allowedFarmNet),
      element("TotalSuppIncomeOrLossAmt", propertyNet + (allowedFarmNet ?? 0)),
      farmGross === undefined
        ? ""
        : element("FarmingAndFishingIncomeAmt", farmGross),
      itemList.some((item) => item.activity_type === "C")
        ? element(
          "RecnclForREProfessionalsAmt",
          sum(properties, "realEstateProfessionalNet"),
        )
        : "",
    ]);
  },
};
