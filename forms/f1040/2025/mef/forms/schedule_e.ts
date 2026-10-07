import { mefBusinessNameLine1 } from "../../../mef/business-name.ts";
import { currentPropertyPassiveAmounts } from "../../../nodes/inputs/schedule_e/current-property-source.ts";
import { assertCurrentPassivePropertyReturn } from "../../current_passive_property_source.ts";
import { element, elements } from "../../../mef/xml.ts";
import {
  computeExpenses,
  computePropertyNet,
  type inputSchema,
  isVacationHomeExcluded,
  isVacationHomeLimited,
  itemSchema,
  qualifiedEntireDispositionGain,
  qualifiedEntireDispositionLoss,
} from "../../../nodes/inputs/schedule_e/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import {
  allocatePassiveActivityLosses,
  inputSchema as form8582InputSchema,
  passiveActivity,
  passiveLossLimit,
} from "../../../nodes/intermediate/forms/form8582/index.ts";
import { form8582 } from "./f8582.ts";
import { farmAllowedLosses } from "./f4835_passive_loss.ts";
import {
  calculateForm4835AtRiskNet,
  calculateForm4835Lines,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import type { z } from "zod";
import { FilingStatus, type FilerIdentity } from "../../../mef/header.ts";
import { inputSchema as partnershipK1InputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as miscInputSchema } from "../../../nodes/inputs/f1099m/index.ts";
import { inputSchema as trustK1InputSchema } from "../../../nodes/inputs/k1_trust/index.ts";
import {
  passivePropertySaleSchema,
  samePassiveSale,
} from "../../../nodes/intermediate/forms/form4797/index.ts";
import { scheduleEK1Part2Rows } from "../../schedule-e-k1-part2.ts";
import { buildScheduleEType8Statement } from "./schedule_e_type8_statement.ts";
import { assertSingleFilerActiveEntireLoss } from "../../form8582_active_entire_loss.ts";

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

export function verifyPartnershipRoyaltySource(
  item: Property,
  pendingK1: unknown,
): void {
  const source = item.k1_royalty_source;
  if (!source) return;
  const parsed = partnershipK1InputSchema.safeParse(pendingK1);
  const matching = parsed.success
    ? parsed.data.k1_partnerships.filter((k1) =>
      k1.partnership_ein === source.partnership_ein &&
      k1.source_document_reference === source.source_document_reference
    )
    : [];
  const k1 = matching[0];
  const codeI = k1?.box13_code_i_royalty_deduction;
  const allowed = source.box13_code_i_allowed_deduction ?? 0;
  if (
    matching.length !== 1 || !k1 ||
    item.property_type !== 6 || item.activity_type !== "D" ||
    item.rent_income !== 0 ||
    item.royalties_income !== source.box7_gross_royalties ||
    item.fair_rental_days !== 0 || item.personal_use_days !== 0 ||
    (item.ownership_percent ?? 100) !== 100 ||
    computeExpenses(item) !== allowed ||
    (item.expense_other_lines?.length ?? 0) !== (codeI ? 1 : 0) ||
    (codeI && (item.expense_other_lines?.[0]?.description !==
        "From Schedule K-1 (Form 1065)" ||
      item.expense_other_lines?.[0]?.amount !== allowed)) ||
    k1.box7_royalties !== source.box7_gross_royalties ||
    k1.box7_royalty_reporting?.property_description !==
      item.property_description ||
    k1.box7_royalty_reporting?.tsj !== item.tsj ||
    k1.box7_royalty_reporting?.portfolio_nonpassive !== true ||
    k1.box7_royalty_reporting?.form_1099_payments_made !==
      item.form_1099_payments_made ||
    (codeI?.allowed_amount) !== source.box13_code_i_allowed_deduction ||
    (codeI?.statement_reference) !== source.box13_code_i_statement_reference
  ) {
    throw new Error(
      "Schedule E royalty row needs its matching partnership K-1 box 7 and code I source",
    );
  }
}

const permittedMiscRoyaltyFields = new Set([
  "payer_name",
  "payer_tin",
  "recipient_tin",
  "source_document_reference",
  "account_number",
  "multi_form_code",
  "box2_royalties",
  "box2_royalties_routing",
  "box2_nonpassive_portfolio_investment_for_form4952_verified",
]);

export function verifyMiscRoyaltySource(
  item: Property,
  pendingMisc: unknown,
  filer?: FilerIdentity,
): void {
  const source = item.f1099m_royalty_source;
  if (!source) return;
  const parsed = miscInputSchema.safeParse(pendingMisc);
  const items = parsed.success ? parsed.data.f1099ms : [];
  const misc = items[0];
  if (
    items.length !== 1 || !misc ||
    misc.payer_name !== source.payer_name ||
    misc.payer_tin !== source.payer_tin ||
    misc.recipient_tin !== source.recipient_tin ||
    misc.source_document_reference !== source.source_document_reference ||
    misc.box2_royalties !== source.box2_gross_royalties ||
    misc.box2_nonpassive_portfolio_investment_for_form4952_verified !== true ||
    misc.box2_royalties_routing === "schedule_c" ||
    Object.keys(misc).some((key) => !permittedMiscRoyaltyFields.has(key)) ||
    item.k1_royalty_source !== undefined ||
    (item.tsj !== "T" && item.tsj !== "S") ||
    (filer !== undefined &&
      (item.tsj === "T"
        ? source.recipient_tin !== filer.primarySSN.replaceAll("-", "")
        : filer.filingStatus !== FilingStatus.MarriedFilingJointly ||
          !filer.spouse?.ssn ||
          source.recipient_tin !== filer.spouse.ssn.replaceAll("-", ""))) ||
    item.property_type !== 6 || item.activity_type !== "D" ||
    item.rent_income !== 0 ||
    item.royalties_income !== source.box2_gross_royalties ||
    item.fair_rental_days !== 0 || item.personal_use_days !== 0 ||
    (item.ownership_percent ?? 100) !== 100 ||
    item.form_1099_payments_made !== false ||
    computeExpenses(item) !== 0
  ) {
    throw new Error(
      "Schedule E royalty row needs its one matching nonbusiness 1099-MISC box 2 source",
    );
  }
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
      element(
        "OtherPropertyTypeDesc",
        item.property_type_other_desc &&
          item.property_type_other_desc.length > 20
          ? "SEE ATTACHED"
          : item.property_type_other_desc,
      ),
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

export function validatePassiveActivityLink(
  items: readonly Property[],
  context: MefBuildContext | undefined,
): ReadonlyMap<number, number> {
  const entireLoss = items.length === 1
    ? qualifiedEntireDispositionLoss(items[0])
    : undefined;
  if (entireLoss !== undefined) {
    assertSingleFilerActiveEntireLoss(items[0], context?.pending);
    const sale = items[0].passive_property_sales?.[0];
    const pendingSales = (context?.pending?.form4797 as
      | { passive_property_sales?: unknown[] }
      | undefined)?.passive_property_sales;
    const pendingSale = passivePropertySaleSchema.safeParse(pendingSales?.[0]);
    if (
      (context?.pending?.form8582 !== undefined &&
        context.pending.form8582 !== null &&
        (!Object.hasOwn(context.pending.form8582, "filing_status") ||
          Object.keys(context.pending.form8582).some((key) =>
            key !== "filing_status"
          ))) ||
      !sale ||
      pendingSales?.length !== 1 ||
      !pendingSale.success || !samePassiveSale(pendingSale.data, sale)
    ) {
      throw new Error(
        "Schedule E entire-disposition loss needs its matching Form 4797 and no Form 8582 activity",
      );
    }
    return new Map([[0, entireLoss]]);
  }
  const entireGain = items.length === 1
    ? qualifiedEntireDispositionGain(items[0])
    : undefined;
  if (entireGain !== undefined) {
    const sale = items[0].passive_property_sales?.[0];
    const pendingSales = (context?.pending?.form4797 as
      | { passive_property_sales?: unknown[] }
      | undefined)?.passive_property_sales;
    const pendingSale = passivePropertySaleSchema.safeParse(pendingSales?.[0]);
    const ledger = context?.pending?.form8582;
    if (
      !sale || pendingSales?.length !== 1 || !pendingSale.success ||
      !samePassiveSale(pendingSale.data, sale) || !ledger ||
      typeof ledger !== "object" || Array.isArray(ledger)
    ) {
      throw new Error(
        "Schedule E entire-disposition gain needs matching Form 4797 and Form 8582 sources",
      );
    }
    form8582.build(ledger as Record<string, unknown>, context);
    return new Map([[0, entireGain]]);
  }
  const needsLimitation = items.some((item) =>
    (item.activity_type === "A" || item.activity_type === "B") &&
    ((item.current_property_source
      ? currentPropertyPassiveAmounts(item.current_property_source)
        .passiveOperating < 0
      : computePropertyNet(item) < 0) ||
      (item.prior_unallowed_passive_operating ?? 0) > 0)
  );
  if (!needsLimitation) return new Map();
  const activityItems = items.flatMap((item, index) =>
    (item.activity_type === "A" || item.activity_type === "B") &&
      ((item.current_property_source
        ? currentPropertyPassiveAmounts(item.current_property_source)
          .passiveOperating !== 0
        : computePropertyNet(item) !== 0) ||
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
    activityItems.some(({ item }) => {
      const activity = input.activities?.find((row) =>
        row.activity_id === item.activity_id
      );
      return !activity || activity.name !== item.property_description ||
        activity.activity_type !== item.activity_type ||
        activity.property_type !== item.property_type ||
        activity.current_net !==
          (item.current_property_source
            ? currentPropertyPassiveAmounts(item.current_property_source)
              .passiveOperating
            : computePropertyNet(item)) ||
        activity.prior_unallowed_operating !==
          (item.prior_unallowed_passive_operating ?? 0) ||
        activity.prior_active_participation !==
          item.prior_passive_losses_active_when_incurred;
    })
  ) {
    throw new Error(
      "Schedule E passive loss does not match Form 8582 activity",
    );
  }
  // The linked form proves the limitation and its per-activity worksheets.
  form8582.build(linked as Record<string, unknown>, context);
  const allowed = passiveLossLimit(passiveActivity(input)).allowed;
  const gainsFor = (activityId: string) =>
    (input.current_4797_sale_gains ?? [])
      .filter((sale) => sale.activity_id === activityId)
      .reduce((sum, sale) => sum + sale.gain, 0);
  const allocations = allocatePassiveActivityLosses(
    (input.activities ?? []).map((activity) => {
      const gain = gainsFor(activity.activity_id);
      return {
        currentNet: activity.current_net + gain,
        currentIncome: Math.max(0, activity.current_net) + gain,
        currentLoss: Math.max(0, -activity.current_net),
        priorUnallowed: activity.prior_unallowed_operating,
        specialEligible: activity.activity_type === "A",
        priorSpecialEligible: activity.prior_active_participation === true,
      };
    }),
    allowed,
  ).allowed;
  return new Map(
    activityItems.map((
      { item, index },
    ) => [
      index,
      allocations[
        (input.activities ?? []).findIndex((row) =>
          row.activity_id === item.activity_id
        )
      ],
    ]),
  );
}

function validatePartIxCarryovers(
  items: readonly Property[],
  context: MefBuildContext | undefined,
): void {
  const carried = items.filter((item) =>
    (item.prior_unallowed_passive_4797_part1 ?? 0) > 0 ||
    (item.prior_unallowed_passive_4797_part2 ?? 0) > 0
  );
  if (carried.length === 0) return;
  const linked = context?.pending?.form8582;
  if (!linked || typeof linked !== "object" || Array.isArray(linked)) {
    throw new Error(
      "Schedule E Form 4797 carryovers need a matching Form 8582 worksheet",
    );
  }
  const ledger = form8582InputSchema.parse(linked);
  if (
    carried.some((item) => {
      const activity = ledger.activities?.find((row) =>
        row.activity_id === item.activity_id
      );
      return !activity ||
        activity.prior_unallowed_4797_part1 !==
          (item.prior_unallowed_passive_4797_part1 ?? 0) ||
        activity.prior_unallowed_4797_part2 !==
          (item.prior_unallowed_passive_4797_part2 ?? 0);
    })
  ) {
    throw new Error(
      "Schedule E Form 4797 carryovers differ from Form 8582 activity rows",
    );
  }
  form8582.build(linked as Record<string, unknown>, context);
}

export const scheduleE: MefFormDescriptor<"schedule_e", Fields> = {
  pendingKey: "schedule_e",
  sourcePendingKeys: ["schedule_e", "k1_partnership", "k1_s_corp"],
  FIELD_MAP: [
    ["farm_rental_net", "NetFarmRentalIncomeOrLossAmt"],
    ["farm_rental_gross", "FarmingAndFishingIncomeAmt"],
  ],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040se.pdf",
  async buildBinaryAttachments(fields, context) {
    const statement = await buildScheduleEType8Statement(
      fields,
      context?.filer,
    );
    return statement ? [statement] : [];
  },
  build(fields, context) {
    if (
      context?.pending &&
      (context.pending.form4797 as Record<string, unknown> | undefined)
          ?.current_property_sources !== undefined
    ) {
      assertCurrentPassivePropertyReturn(
        context.pending.form4797 as Record<string, unknown>,
        { ...context.pending, schedule_e: fields },
      );
    }
    const k1Rows = scheduleEK1Part2Rows(context?.pending);
    if ((!fields || Object.keys(fields).length === 0) && k1Rows.length === 0) {
      return "";
    }
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
    const royaltyKeys = itemList.flatMap((item) =>
      item.k1_royalty_source
        ? [
          `${item.k1_royalty_source.partnership_ein}:${item.k1_royalty_source.source_document_reference}`,
        ]
        : []
    );
    if (new Set(royaltyKeys).size !== royaltyKeys.length) {
      throw new Error(
        "Schedule E partnership K-1 royalty source cannot be duplicated",
      );
    }
    itemList.forEach((item) =>
      verifyPartnershipRoyaltySource(item, context?.pending?.k1_partnership)
    );
    itemList.forEach((item) =>
      verifyMiscRoyaltySource(item, context?.pending?.f1099m, context?.filer)
    );
    validatePartIxCarryovers(itemList, context);
    const allowedPassiveLosses = validatePassiveActivityLink(itemList, context);
    const properties = itemList.map((item, index) =>
      buildProperty(
        item,
        item.current_property_source &&
          currentPropertyPassiveAmounts(item.current_property_source)
              .recharacterized > 0
          ? Math.max(0, -computePropertyNet(item))
          : allowedPassiveLosses.get(index),
      )
    ).filter(
      (line): line is PropertyLines => line !== undefined,
    );
    const linkedMiscRoyalty = itemList.length === 1 &&
      itemList[0].f1099m_royalty_source !== undefined &&
      fields.royalty_income ===
        itemList[0].f1099m_royalty_source.box2_gross_royalties;
    if (
      itemList.some((item) => item.f1099m_royalty_source !== undefined) &&
      !linkedMiscRoyalty
    ) {
      throw new Error(
        "Schedule E 1099-MISC royalty needs exactly one matched property and passthrough",
      );
    }
    if (linkedMiscRoyalty && !context?.filer) {
      throw new Error(
        "Schedule E linked 1099-MISC royalty needs filer identity",
      );
    }
    if (
      properties.length === 0 &&
      (fields.rental_income !== undefined ||
        fields.royalty_income !== undefined)
    ) {
      throw new Error("Schedule E 1099-MISC income needs a property row");
    }
    if (fields.royalty_income !== undefined && !linkedMiscRoyalty) {
      throw new Error(
        "Schedule E 1099-MISC royalty needs its linked property row",
      );
    }
    const farmNet = fields.farm_rental_net;
    const farmGross = fields.farm_rental_gross;
    const trustRows = fields.estate_trust_rows ?? [];
    const trustSource = context?.pending?.k1_trust;
    const trustParsed = trustK1InputSchema.safeParse(trustSource);
    if (trustRows.length > 0 && !trustParsed.success) {
      throw new Error("Schedule E estate/trust rows need their source K-1s");
    }
    const trustKeys = trustRows.map((row) =>
      `${row.estate_trust_ein}:${row.source_document_reference}`
    );
    if (new Set(trustKeys).size !== trustKeys.length || trustRows.length > 2) {
      throw new Error(
        "Schedule E estate/trust rows need unique sources and fit the two printed rows",
      );
    }
    for (const row of trustRows) {
      const matches = trustParsed.success
        ? trustParsed.data.k1_trusts.filter((source) =>
          source.estate_trust_name === row.estate_trust_name &&
          source.estate_trust_ein === row.estate_trust_ein &&
          source.source_document_reference === row.source_document_reference &&
          (source.box5_other_portfolio ?? 0) ===
            (row.other_income ?? 0) &&
          (source.box6_ordinary_business ?? 0) +
                (source.box7_rental_real_estate ?? 0) +
                (source.box8_other_rental ?? 0) ===
            (row.passive_income ?? 0)
        )
        : [];
      if (matches.length !== 1) {
        throw new Error(
          "Schedule E estate/trust row must match one K-1 and its box 5–8 activity statement",
        );
      }
    }
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
    if ((farmItems.length > 0) !== (farmNet !== undefined)) {
      throw new Error("Schedule E farm rental needs its Form 4835 source");
    }
    if (
      farmItems.length > 0 &&
      (farmPreliminaries.reduce((sum, net) => sum + net, 0) !== farmNet ||
        farmItems.reduce(
            (sum, item) => sum + calculateForm4835Lines(item).gross,
            0,
          ) !== farmGross)
    ) {
      throw new Error(
        "Schedule E farm rental net and gross do not match Form 4835 activities",
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
    if (
      properties.length === 0 && farmNet === undefined &&
      trustRows.length === 0 &&
      k1Rows.length === 0
    ) return "";
    const payments = itemList.some((item) => item.form_1099_payments_made);
    const income = properties.filter((line) => line.net > 0).reduce(
      (total, line) => total + line.net,
      0,
    );
    const losses = sum(properties, "deductibleLoss");
    const propertyNet = income - losses;
    const trustOtherIncome = trustRows.reduce(
      (sum, row) => sum + (row.other_income ?? 0),
      0,
    );
    const trustPassiveIncome = trustRows.reduce(
      (sum, row) => sum + (row.passive_income ?? 0),
      0,
    );
    const trustTotalIncome = trustOtherIncome + trustPassiveIncome;
    const k1PassiveIncome = k1Rows.reduce(
      (sum, row) => sum + row.passiveIncome,
      0,
    );
    const k1NonpassiveIncome = k1Rows.reduce(
      (sum, row) => sum + row.nonpassiveIncome,
      0,
    );
    const k1TotalIncome = k1PassiveIncome + k1NonpassiveIncome;
    if (trustRows.length > 0) {
      const pendingSchedule1 = context?.pending?.schedule1;
      const pendingLine5 = pendingSchedule1 &&
          typeof pendingSchedule1 === "object" &&
          "line5_schedule_e" in pendingSchedule1
        ? pendingSchedule1.line5_schedule_e
        : undefined;
      const line5 = Array.isArray(pendingLine5)
        ? pendingLine5.reduce((sum: number, amount: number) => sum + amount, 0)
        : pendingLine5;
      if (
        line5 !==
          propertyNet + trustTotalIncome + k1TotalIncome +
            (allowedFarmNet ?? 0)
      ) {
        throw new Error(
          "Schedule E trust Part III income must match finalized Schedule 1 line 5",
        );
      }
    }
    if (royaltyKeys.length > 0 || linkedMiscRoyalty) {
      const pendingSchedule1 = context?.pending?.schedule1;
      const pendingLine5 = pendingSchedule1 &&
          typeof pendingSchedule1 === "object" &&
          "line5_schedule_e" in pendingSchedule1
        ? pendingSchedule1.line5_schedule_e
        : undefined;
      const line5 = Array.isArray(pendingLine5)
        ? pendingLine5.reduce((sum: number, amount: number) => sum + amount, 0)
        : pendingLine5;
      if (
        (royaltyKeys.length > 0 && royaltyKeys.length !== 1) ||
        itemList.length !== 1 ||
        farmNet !== undefined ||
        line5 !== propertyNet + trustTotalIncome + k1TotalIncome
      ) {
        throw new Error(
          "Schedule E sourced royalty net must match finalized Schedule 1 line 5",
        );
      }
    }
    if (k1Rows.length > 0) {
      const pendingLine5 =
        (context?.pending?.schedule1 as Record<string, unknown> | undefined)
          ?.line5_schedule_e;
      const line5 = Array.isArray(pendingLine5)
        ? pendingLine5.reduce((sum: number, amount: number) => sum + amount, 0)
        : pendingLine5;
      if (
        line5 !==
          propertyNet + trustTotalIncome + (allowedFarmNet ?? 0) + k1TotalIncome
      ) {
        throw new Error(
          "Schedule E Part II K-1 rows differ from finalized Schedule 1 line 5",
        );
      }
    }
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
      properties.length > 0
        ? element(
          "TotalIncomeOrLossAmt",
          propertyNet,
          itemList.some((item) =>
              item.current_property_source &&
              currentPropertyPassiveAmounts(item.current_property_source)
                  .nonpassiveOperating !== 0
            )
            ? {
              nonpassiveActivityLiteralCd: "NPA",
              nonpassiveActivityAmt: String(
                itemList.reduce((n, item) =>
                  n + (item.current_property_source
                    ? currentPropertyPassiveAmounts(
                      item.current_property_source,
                    ).nonpassiveOperating
                    : 0), 0),
              ),
            }
            : undefined,
        )
        : "",
      ...k1Rows.map((row) =>
        elements("PartnershipOrSCorpGroup", [
          element(
            "PartnershipOrSCorporationNm",
            mefBusinessNameLine1(row.name),
          ),
          element("PartnershipSCorpCd", row.code),
          element("PartnershipOrSCorpEIN", row.ein),
          row.passiveIncome > 0
            ? element("BusinessPassiveIncomeAmt", row.passiveIncome)
            : "",
          row.nonpassiveIncome > 0
            ? element("NonpassiveIncomeAmt", row.nonpassiveIncome)
            : "",
        ])
      ),
      k1PassiveIncome > 0
        ? element("TotalPassiveIncomeAmt", k1PassiveIncome)
        : "",
      k1NonpassiveIncome > 0
        ? element("BusTotalNonpassiveIncomeAmt", k1NonpassiveIncome)
        : "",
      k1Rows.length > 0
        ? element("TotalPrtshpSCorpIncomeAmt", k1TotalIncome)
        : "",
      k1Rows.length > 0
        ? element("NetPrtshpSCorpIncomeOrLossAmt", k1TotalIncome)
        : "",
      ...trustRows.map((row) =>
        elements("EstateAndTrustGroup", [
          elements("EstateOrTrustName", [
            element("BusinessNameLine1Txt", row.estate_trust_name),
          ]),
          element("EstateOrTrustEIN", row.estate_trust_ein),
          element("EstateAndTrustPassiveIncomeAmt", row.passive_income),
          element("OtherIncomeAmt", row.other_income),
        ])
      ),
      trustPassiveIncome > 0
        ? element("EstateAndTrustTotPssvIncmAmt", trustPassiveIncome)
        : "",
      trustOtherIncome > 0
        ? element("TotalOtherIncomeAmt", trustOtherIncome)
        : "",
      trustRows.length > 0
        ? element("TotalEstateOrTrustIncomeAmt", trustTotalIncome)
        : "",
      trustRows.length > 0
        ? element("TotEstateAndTrustIncOrLossAmt", trustTotalIncome)
        : "",
      allowedFarmNet === undefined
        ? ""
        : element("NetFarmRentalIncomeOrLossAmt", allowedFarmNet),
      element(
        "TotalSuppIncomeOrLossAmt",
        propertyNet + k1TotalIncome + trustTotalIncome + (allowedFarmNet ?? 0),
      ),
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
