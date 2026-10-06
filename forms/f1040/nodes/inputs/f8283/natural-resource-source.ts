import { z } from "zod";

const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});
const expense = z.object({
  paid_on: date,
  invoice_reference: ref,
  payment_reference: ref,
  vendor_name: ref,
  vendor_ein: z.string().regex(/^\d{9}$/),
  vendor_entity_classification: z.literal("c_corporation"),
  vendor_corporate_status_record_reference: ref,
  amount: money.positive(),
  nature: z.enum([
    "soil_water_175",
    "idc_263c",
    "development_616",
    "exploration_617",
  ]),
  eligibility_record_reference: ref,
}).strict();
const annual = z.object({
  tax_year: z.number().int().min(1966).max(2025),
  annual_return_and_account_reference: ref,
  gross_property_income: money,
  other_deductible_property_expenses: money,
  expenses: z.array(expense),
  deduction_claimed: money,
  depletion_claimed: money,
  units_sold: money,
  recoverable_units_before_sales: money,
  reserve_engineer_record_reference: ref,
  gross_receipt_record_reference: ref,
  no_other_basis_adjustments_or_prior_recapture: z.literal(true),
}).strict();
const common = z.object({
  property_reference: ref,
  donor_name: ref,
  donor_ssn: z.string().regex(/^\d{9}$/),
  proprietor_recipient: z.enum(["T", "S"]),
  business_reference: ref,
  recorded_deed_or_mineral_interest_identifier: ref,
  property_location: ref,
  purchase_record_reference: ref,
  annual_account_ledger_reference: ref,
  property_use_record_reference: ref,
  retained_source_documents: z.array(
    z.object({
      source_reference: ref,
      attachment_file_name: ref,
      pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }).strict(),
  ).length(3),
  date_acquired: date,
  placed_in_service: date,
  date_contributed: date.refine((value) => value.startsWith("2025-")),
  original_owned_cost: money.positive(),
  appraised_fmv: money.positive(),
  whole_original_owned_interest: z.literal(true),
  no_debt_consideration_transfer_basis_or_partial_interest: z.literal(true),
  fifty_percent_limit_donee: z.literal(true),
  exempt_related_use_confirmed: z.literal(true),
  no_other_depreciable_assets_or_recapture_classes: z.literal(true),
  calendar_year_full_year_returns: z.literal(true),
  current_year_paid_receipts: z.array(
    z.object({
      received_on: date,
      buyer_name: ref,
      sale_invoice_reference: ref,
      bank_payment_record_reference: ref,
      amount: money.positive(),
    }).strict(),
  ),
  complete_current_year_receipt_inventory_reference: ref,
  no_other_current_year_receipts_or_deductions: z.literal(true),
  annual_records: z.array(annual).min(1),
});
export const charitableNaturalResourceSourceSchema = z.discriminatedUnion(
  "kind",
  [
    common.extend({
      kind: z.literal("farmland_1252"),
      section175_election_reference: ref,
      conservation_plan_and_farming_use_record_reference: ref,
      only_eligible_soil_water_conservation_costs: z.literal(true),
      no_land_clearing_182_or_depreciable_improvement_costs: z.literal(true),
    }).strict(),
    common.extend({
      kind: z.literal("legacy_mining_617"),
      mineral: z.literal("gold"),
      exploration_election_reference: ref,
      domestic_predevelopment_exploration_record_reference: ref,
      never_reached_producing_stage_or_received_bonus_royalties: z.literal(
        true,
      ),
      no_percentage_depletion_offset_or_recaptured_exploration: z.literal(true),
      no_binding_contract_transition_to_1254: z.literal(true),
    }).strict(),
    common.extend({
      kind: z.literal("producing_mining_617"),
      resource: z.literal("gold"),
      exploration_election_reference: ref,
      domestic_predevelopment_exploration_record_reference: ref,
      development_stage_began_on: date,
      producing_stage_reached_on: date,
      producing_stage_basis: z.enum([
        "major_portion_from_nondevelopment_workings",
        "principal_activity_developed_ore_production",
      ]),
      mine_identifier: ref,
      mine_inventory: z.array(
        z.object({
          mine_identifier: ref,
          property_reference: ref,
          donor_ssn: z.string().regex(/^\d{9}$/),
          development_stage_began_on: date,
          producing_stage_reached_on: date,
          operation_record_reference: ref,
          default_disallowance_return_record_reference: ref,
        }).strict(),
      ).length(1),
      producing_stage_geological_and_operation_record_reference: ref,
      producing_stage_treatment: z.literal("depletion_disallowance"),
      mineral_cost_allocation_record: z.object({
        record_reference: ref,
        property_reference: ref,
        donor_ssn: z.string().regex(/^\d{9}$/),
        original_purchase_cost: money,
        depletable_mineral_cost: money,
        residual_nonmineral_land_cost: money,
        separate_depreciable_asset_cost: money,
      }).strict(),
      complete_mine_and_property_inventory_reference: ref,
      sole_owned_mine_no_aggregation_bonus_royalty_or_prior_recapture: z
        .literal(true),
      no_binding_contract_transition_to_1254: z.literal(true),
      development_election_reference: ref,
      regular_ten_year_writeoff_not_elected: z.literal(true),
      no_other_regular_or_amt_property_basis_adjustments: z.literal(true),
    }).strict(),
    common.extend({
      kind: z.literal("natural_resource_1254"),
      resource: z.enum(["oil", "gas", "geothermal", "gold"]),
      operating_interest_and_economic_interest_record_reference: ref,
      expense_election_reference: ref,
      no_suspended_or_amortized_costs_or_related_party_1254_costs: z.literal(
        true,
      ),
      no_pre1987_binding_contract_transition: z.literal(true),
      // A bounded cost-depletion route: actual unit/basis computation must equal
      // the retained annual return, and exceed even the uncapped percentage amount.
      cost_depletion_exceeds_uncapped_percentage_when_producing: z.literal(
        true,
      ),
      mining_exploration_never_reached_producing_stage: z.boolean(),
    }).strict(),
    common.extend({
      kind: z.literal("legacy_oil_gas_geothermal_1254"),
      resource: z.enum(["oil", "gas", "geothermal"]),
      operating_interest_and_economic_interest_record_reference: ref,
      expense_election_reference: ref,
      no_suspended_or_amortized_costs_or_related_party_1254_costs: z.literal(
        true,
      ),
      no_pre1987_binding_contract_transition: z.literal(true),
      // A bounded cost-depletion route: actual unit/basis computation must equal
      // the retained annual return, and exceed even the uncapped percentage amount.
      cost_depletion_exceeds_uncapped_percentage_when_producing: z.literal(
        true,
      ),
      productive_well_cost_and_start_record_reference: ref,
      geothermal_well_commenced_on: date.optional(),
      all_idc_allocable_to_depletable_productive_property: z.literal(true),
      no_other_regular_or_amt_property_basis_adjustments: z.literal(true),
    }).strict(),
  ],
);
export type CharitableNaturalResourceSource = z.infer<
  typeof charitableNaturalResourceSourceSchema
>;
const cents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Outright gift: 170(e)/1.170A-4, not actual taxable sale income. Current
 * 1251 is repealed and 1252 no longer includes 182 land-clearing deductions. */
export function calculateCharitableNaturalResource(raw: unknown) {
  const source = charitableNaturalResourceSourceSchema.parse(raw);
  const acquiredYear = Number(source.date_acquired.slice(0, 4));
  const placedYear = Number(source.placed_in_service.slice(0, 4));
  if (
    source.placed_in_service < source.date_acquired ||
    source.placed_in_service > source.date_contributed ||
    source.date_contributed <=
      `${Number(source.date_acquired.slice(0, 4)) + 1}${
        source.date_acquired.slice(4)
      }` ||
    (["legacy_mining_617", "producing_mining_617"].includes(source.kind) &&
      placedYear > 1986) ||
    (source.kind === "natural_resource_1254" && placedYear < 1987) ||
    (source.kind === "legacy_oil_gas_geothermal_1254" &&
      (placedYear > 1986 ||
        (source.resource === "geothermal" &&
          (!source.geothermal_well_commenced_on ||
            source.geothermal_well_commenced_on < "1978-10-01" ||
            source.geothermal_well_commenced_on > source.placed_in_service))))
  ) {
    throw new Error(
      "Natural-resource acquisition, service, long holding or recapture effective-date facts disagree",
    );
  }
  if (
    source.annual_records.length !== 2025 - acquiredYear + 1 ||
    source.annual_records.some((row, index) =>
      row.tax_year !== acquiredYear + index
    )
  ) {
    throw new Error(
      "Natural-resource annual account must retain every owned year in order through2025",
    );
  }
  const refs = [
    source.purchase_record_reference,
    source.annual_account_ledger_reference,
    source.property_use_record_reference,
  ];
  if (
    new Set(refs).size !== 3 ||
    source.retained_source_documents.some((row, index) =>
      row.source_reference !== refs[index]
    ) ||
    new Set(
        source.retained_source_documents.map((row) => row.attachment_file_name),
      ).size !== 3
  ) {
    throw new Error(
      "Natural-resource purchase, annual account and property-use records must retain distinct joined source documents",
    );
  }
  const receiptIds = new Set<string>();
  const received = cents(
    source.current_year_paid_receipts.reduce((sum, row) => {
      if (
        !row.received_on.startsWith("2025-") ||
        row.received_on > source.date_contributed ||
        receiptIds.has(row.sale_invoice_reference)
      ) {
        throw new Error(
          "Natural-resource current receipt dates or duplicate owned invoices disagree",
        );
      }
      receiptIds.add(row.sale_invoice_reference);
      return sum + row.amount;
    }, 0),
  );
  if (
    source.annual_records[source.annual_records.length - 1]
      .gross_property_income !== received
  ) {
    throw new Error(
      "Natural-resource current gross income differs from complete owned paid-receipt inventory",
    );
  }
  let basis = source.original_owned_cost, ordinaryCosts = 0, carry = 0;
  const invoices = new Set<string>();
  let remainingUnits: number | undefined;
  let hypotheticalBasis = source.original_owned_cost,
    hypotheticalDepletionOffset = 0;
  const legacyOil = source.kind === "legacy_oil_gas_geothermal_1254";
  const producing = source.kind === "producing_mining_617";
  let miningAmtUnamortized = 0, miningAmtAdjustment = 0;
  let amtDepletionBasis = source.original_owned_cost, amtExplorationAccount = 0;
  if (
    producing &&
    (source.development_stage_began_on < source.placed_in_service ||
      source.development_stage_began_on > source.producing_stage_reached_on ||
      source.producing_stage_reached_on < source.placed_in_service ||
      source.producing_stage_reached_on > source.date_contributed)
  ) {
    throw new Error(
      "Owned producing mine stage dates disagree with service/gift",
    );
  }
  if (producing) {
    const mine = source.mine_inventory[0];
    const allocation = source.mineral_cost_allocation_record;
    if (
      allocation.property_reference !== source.property_reference ||
      allocation.donor_ssn !== source.donor_ssn ||
      allocation.original_purchase_cost !== source.original_owned_cost ||
      allocation.depletable_mineral_cost !== source.original_owned_cost ||
      allocation.residual_nonmineral_land_cost !== 0 ||
      allocation.separate_depreciable_asset_cost !== 0
    ) {
      throw new Error(
        "Producing617 depletion basis needs owned purchase mineral allocation excluding land/residual/depreciable costs",
      );
    }
    if (
      mine.mine_identifier !== source.mine_identifier ||
      mine.property_reference !== source.property_reference ||
      mine.donor_ssn !== source.donor_ssn ||
      mine.development_stage_began_on !== source.development_stage_began_on ||
      mine.producing_stage_reached_on !== source.producing_stage_reached_on ||
      mine.operation_record_reference !==
        source.producing_stage_geological_and_operation_record_reference
    ) {
      throw new Error(
        "Owned617 mine inventory/owner/stage joins differ from actual operating property",
      );
    }
  }
  const rows = source.annual_records.map((row) => {
    if (
      row.tax_year < placedYear &&
      (row.gross_property_income > 0 || row.expenses.length > 0 ||
        row.depletion_claimed > 0)
    ) {
      throw new Error(
        "Natural-resource annual deductions or production precede placed-in-service source",
      );
    }
    for (const item of row.expenses) {
      if (
        Number(item.paid_on.slice(0, 4)) !== row.tax_year ||
        item.paid_on < source.date_acquired ||
        item.paid_on > source.date_contributed ||
        invoices.has(item.invoice_reference)
      ) {
        throw new Error(
          "Natural-resource expense invoice ownership dates or duplicate costs disagree",
        );
      }
      invoices.add(item.invoice_reference);
      const valid = source.kind === "farmland_1252"
        ? item.nature === "soil_water_175"
        : source.kind === "legacy_mining_617"
        ? item.nature === "exploration_617"
        : source.resource === "gold"
        ? ["development_616", "exploration_617"].includes(item.nature)
        : item.nature === "idc_263c";
      if (!valid) {
        throw new Error(
          "Natural-resource expense nature is not eligible for its sourced asset and recapture class",
        );
      }
    }
    const paid = cents(
      row.expenses.reduce((sum, item) => sum + item.amount, 0),
    );
    const allowed = source.kind === "farmland_1252"
      ? cents(Math.min(paid + carry, row.gross_property_income * .25))
      : paid;
    if (source.kind === "farmland_1252") carry = cents(paid + carry - allowed);
    if (row.deduction_claimed !== allowed) {
      throw new Error(
        "Natural-resource filed deduction differs from paid-cost ledger and actual section175 gross-income limit/carry",
      );
    }
    let depletion = 0, hypotheticalDepletion = 0;
    let otherwiseAllowableDepletion = 0, disallowedExplorationDepletion = 0;
    let amtOtherwiseDepletion = 0,
      amtDisallowedDepletion = 0,
      amtAllowedDepletion = 0;
    if (producing) {
      for (const cost of row.expenses) {
        if (
          cost.nature === "exploration_617" &&
            cost.paid_on >= source.development_stage_began_on ||
          cost.nature === "development_616" &&
            cost.paid_on < source.development_stage_began_on
        ) {
          throw new Error(
            "Owned mining exploration/development cost differs from actual stage record",
          );
        }
        if (row.tax_year > 1986 && row.tax_year !== 2025) {
          throw new Error(
            "Prior post1986 mining AMT vintages need their complete amortization source route",
          );
        }
      }
      ordinaryCosts = cents(
        ordinaryCosts +
          row.expenses.filter((cost) => cost.nature === "exploration_617")
            .reduce((sum, cost) => sum + cost.amount, 0),
      );
      const stageYear = Number(source.producing_stage_reached_on.slice(0, 4));
      if (
        row.tax_year < stageYear &&
        (row.gross_property_income || row.units_sold ||
          row.recoverable_units_before_sales)
      ) {
        throw new Error(
          "Owned mine production precedes geological producing stage",
        );
      }
      if (
        row.units_sold > row.recoverable_units_before_sales ||
        row.units_sold > 0 &&
          (!row.gross_property_income || !row.recoverable_units_before_sales)
      ) {
        throw new Error(
          "Owned mining units differ from actual production receipts/reserves",
        );
      }
      if (row.recoverable_units_before_sales > 0) {
        if (
          remainingUnits !== undefined &&
          row.recoverable_units_before_sales !== remainingUnits
        ) {
          throw new Error(
            "Owned mining reserve inventory does not reconcile previous sales",
          );
        }
        remainingUnits = cents(
          row.recoverable_units_before_sales - row.units_sold,
        );
        otherwiseAllowableDepletion = cents(
          Math.min(
            basis,
            basis * row.units_sold / row.recoverable_units_before_sales,
          ),
        );
      }
      const percentageDepletion = cents(
        Math.min(
          row.gross_property_income * .15,
          Math.max(
            0,
            row.gross_property_income - row.other_deductible_property_expenses -
              allowed,
          ) * .5,
        ),
      );
      if (otherwiseAllowableDepletion < percentageDepletion) {
        throw new Error(
          "Producing617 requires actual percentage-depletion source method beyond this owned cost route",
        );
      }
      disallowedExplorationDepletion = cents(
        Math.min(ordinaryCosts, otherwiseAllowableDepletion),
      );
      ordinaryCosts = cents(ordinaryCosts - disallowedExplorationDepletion);
      depletion = cents(
        otherwiseAllowableDepletion - disallowedExplorationDepletion,
      );
      if (row.depletion_claimed !== depletion) {
        throw new Error(
          "Producing617 filed depletion differs from source-derived adjusted exploration disallowance",
        );
      }
      // Independent AMT pool and greater-of cost/percentage depletion. Deferred
      // ten-year mining costs are excluded from depletion basis (1.612-1(b)(1)).
      amtExplorationAccount = cents(
        amtExplorationAccount +
          row.expenses.filter((cost) => cost.nature === "exploration_617")
            .reduce((sum, cost) => sum + cost.amount, 0),
      );
      const amtCurrentCostDeduction = row.tax_year > 1986
        ? allowed * .1
        : allowed;
      const amtCostDepletion = row.recoverable_units_before_sales > 0
        ? cents(
          Math.min(
            amtDepletionBasis,
            amtDepletionBasis * row.units_sold /
              row.recoverable_units_before_sales,
          ),
        )
        : 0;
      const amtPercentageDepletion = cents(
        Math.min(
          row.gross_property_income * .15,
          Math.max(
            0,
            row.gross_property_income - row.other_deductible_property_expenses -
              amtCurrentCostDeduction,
          ) * .5,
        ),
      );
      amtOtherwiseDepletion = Math.max(
        amtCostDepletion,
        amtPercentageDepletion,
      );
      amtDisallowedDepletion = Math.min(
        amtExplorationAccount,
        amtOtherwiseDepletion,
      );
      amtExplorationAccount = cents(
        amtExplorationAccount - amtDisallowedDepletion,
      );
      amtAllowedDepletion = cents(
        amtOtherwiseDepletion - amtDisallowedDepletion,
      );
      if (amtAllowedDepletion > amtDepletionBasis) {
        throw new Error(
          "Producing617 percentage depletion beyond basis needs its actual section57 preference route",
        );
      }
      amtDepletionBasis = cents(amtDepletionBasis - amtAllowedDepletion);
      basis = cents(basis - depletion);
      const amortizable = row.tax_year > 1986 ? allowed : 0;
      miningAmtUnamortized = cents(miningAmtUnamortized + amortizable * .9);
      if (row.tax_year === 2025) miningAmtAdjustment = cents(amortizable * .9);
    } else if (source.kind !== "natural_resource_1254" && !legacyOil) {
      if (
        row.depletion_claimed !== 0 || row.units_sold !== 0 ||
        row.recoverable_units_before_sales !== 0 ||
        (source.kind === "legacy_mining_617" && row.gross_property_income !== 0)
      ) {
        throw new Error(
          "Legacy exploration nonproducing or farmland nondepletion account conflicts with source classification",
        );
      }
    } else {
      if (
        row.expenses.some((item) => item.nature === "exploration_617") &&
        (source.kind !== "natural_resource_1254" ||
          !source.mining_exploration_never_reached_producing_stage ||
          row.gross_property_income > 0 || row.units_sold > 0)
      ) {
        throw new Error(
          "Producing mining exploration needs independently settled617(b) coordination rather than double recapture",
        );
      }
      if (
        row.units_sold > row.recoverable_units_before_sales ||
        (row.units_sold > 0 &&
          (row.gross_property_income === 0 ||
            row.recoverable_units_before_sales === 0))
      ) {
        throw new Error(
          "Natural-resource sold units differ from actual production/reserve account",
        );
      }
      if (row.recoverable_units_before_sales > 0) {
        if (
          remainingUnits !== undefined &&
          row.recoverable_units_before_sales !== remainingUnits
        ) {
          throw new Error(
            "Owned reserve inventory does not reconcile preceding units sold",
          );
        }
        remainingUnits = cents(
          row.recoverable_units_before_sales - row.units_sold,
        );
      }
      depletion = row.recoverable_units_before_sales > 0
        ? cents(
          Math.min(
            basis,
            basis * row.units_sold / row.recoverable_units_before_sales,
          ),
        )
        : 0;
      if (
        row.gross_property_income > 0 &&
        depletion < cents(row.gross_property_income * .15)
      ) {
        throw new Error(
          "This owned cost-depletion source must exceed the independently bounded percentage deduction",
        );
      }
      if (row.depletion_claimed !== depletion) {
        throw new Error(
          "Natural-resource filed depletion differs from owned basis and actual sold/reserve units",
        );
      }
      if (legacyOil) {
        if (
          row.expenses.some((cost) => cost.paid_on < "1976-01-01") ||
          (paid > 0 && (row.units_sold === 0 ||
            paid > .65 * Math.max(
                  0,
                  row.gross_property_income -
                    row.other_deductible_property_expenses - allowed -
                    depletion,
                )))
        ) {
          throw new Error(
            "Legacy1254 productive post1975 IDC and independently bounded zero-AMT preference source disagree",
          );
        }
        // CFR1.1254-1(b)(1)(ii)/(vii): legacyIDC is capitalized solely
        // in the counterfactual account. Actual depletion never enters its pool.
        hypotheticalBasis = cents(hypotheticalBasis + allowed);
        hypotheticalDepletion = row.recoverable_units_before_sales > 0
          ? cents(
            Math.min(
              hypotheticalBasis,
              hypotheticalBasis * row.units_sold /
                row.recoverable_units_before_sales,
            ),
          )
          : 0;
        hypotheticalBasis = cents(hypotheticalBasis - hypotheticalDepletion);
        hypotheticalDepletionOffset = cents(
          hypotheticalDepletionOffset + hypotheticalDepletion - depletion,
        );
      }
      basis = cents(basis - depletion);
    }
    ordinaryCosts = cents(
      ordinaryCosts + (producing ? 0 : allowed + (legacyOil ? 0 : depletion)),
    );
    return {
      tax_year: row.tax_year,
      paid_costs: paid,
      deduction: allowed,
      depletion,
      adjusted_basis: basis,
      conservation_carry: carry,
      ...(producing
        ? {
          otherwise_allowable_depletion: otherwiseAllowableDepletion,
          disallowed_exploration_depletion: disallowedExplorationDepletion,
          remaining_exploration_account: ordinaryCosts,
          amt_unamortized_mining_costs: miningAmtUnamortized,
          amt_otherwise_allowable_depletion: amtOtherwiseDepletion,
          amt_disallowed_exploration_depletion: amtDisallowedDepletion,
          amt_allowed_depletion: amtAllowedDepletion,
          amt_remaining_exploration_account: amtExplorationAccount,
          amt_depletion_basis: amtDepletionBasis,
        }
        : {}),
      ...(legacyOil
        ? {
          hypothetical_capitalized_basis: hypotheticalBasis,
          hypothetical_depletion: hypotheticalDepletion,
          cumulative_hypothetical_depletion_offset: hypotheticalDepletionOffset,
        }
        : {}),
    };
  });
  if (legacyOil) {
    ordinaryCosts = cents(
      Math.max(0, ordinaryCosts - hypotheticalDepletionOffset),
    );
  }
  let percentage = 1;
  if (source.kind === "farmland_1252") {
    const anniversaries = Number(source.date_contributed.slice(0, 4)) -
      acquiredYear -
      (source.date_contributed.slice(5) <= source.date_acquired.slice(5)
        ? 1
        : 0);
    // Sixth-year starts immediately after fifth anniversary; exact fifth
    // anniversary is within five years, and ten full years means zero.
    const afterFifth = source.date_contributed >
      `${acquiredYear + 5}${source.date_acquired.slice(4)}`;
    percentage = anniversaries >= 10
      ? 0
      : !afterFifth
      ? 1
      : Math.max(0, 1 - .2 * (anniversaries - 4));
  }
  const hypotheticalGain = cents(source.appraised_fmv - basis);
  if (hypotheticalGain < 0) {
    throw new Error(
      "Natural-resource loss property needs its separate FMV source treatment",
    );
  }
  const ordinary = cents(
    Math.min(hypotheticalGain, ordinaryCosts * percentage),
  );
  const residual = cents(hypotheticalGain - ordinary);
  return {
    source,
    rows,
    fmv: source.appraised_fmv,
    adjusted_basis: basis,
    recapture_costs: ordinaryCosts,
    applicable_percentage: percentage,
    hypothetical_gain: hypotheticalGain,
    ordinary_gain: ordinary,
    residual_long_term_gain: residual,
    deduction_claimed: cents(source.appraised_fmv - ordinary),
    is_capital_gain_property: residual > 0,
    charitable_limit_category: residual > 0
      ? "capital_gain_30" as const
      : "ordinary_noncash_50" as const,
    current_year: rows[rows.length - 1],
    ...(producing
      ? {
        amt_adjusted_basis: cents(amtDepletionBasis + miningAmtUnamortized),
        amt_ordinary_gain: cents(
          Math.min(
            Math.max(
              0,
              source.appraised_fmv - amtDepletionBasis - miningAmtUnamortized,
            ),
            amtExplorationAccount,
          ),
        ),
        amt_deduction_claimed: cents(
          source.appraised_fmv -
            Math.min(
              Math.max(
                0,
                source.appraised_fmv - amtDepletionBasis - miningAmtUnamortized,
              ),
              amtExplorationAccount,
            ),
        ),
        amt_mining_cost_adjustment: miningAmtAdjustment,
      }
      : {}),
    ...(legacyOil
      ? { hypothetical_depletion_offset: hypotheticalDepletionOffset }
      : {}),
  };
}

/** Visible canonical fields from the actual owned source; hashes alone are not
 * sufficient, and these fields do not authenticate an issuer or prior return. */
export function charitableNaturalResourceDocumentFields(
  raw: unknown,
  index: number,
): Record<string, string> {
  const source = charitableNaturalResourceSourceSchema.parse(raw);
  const commonFields = {
    property_reference: source.property_reference,
    donor_name: source.donor_name,
    donor_ssn: source.donor_ssn,
    business_reference: source.business_reference,
    kind: source.kind,
  };
  const content = index === 0
    ? {
      ...commonFields,
      date_acquired: source.date_acquired,
      placed_in_service: source.placed_in_service,
      original_owned_cost: source.original_owned_cost,
      appraised_fmv: source.appraised_fmv,
      property_location: source.property_location,
      recorded_deed_or_mineral_interest_identifier:
        source.recorded_deed_or_mineral_interest_identifier,
    }
    : index === 1
    ? { ...commonFields, annual_records: source.annual_records }
    : Object.fromEntries(
      Object.entries(source).filter(([key]) =>
        !["annual_records", "retained_source_documents"].includes(key)
      ),
    );
  const fields: Record<string, string> = {};
  const flatten = (value: unknown, key: string) => {
    if (Array.isArray(value)) {
      value.forEach((child, n) => flatten(child, `${key}.${n + 1}`));
    } else if (value !== null && typeof value === "object") {
      Object.entries(value).forEach(([name, child]) =>
        flatten(child, key ? `${key}.${name}` : name)
      );
    } else fields[key] = String(value);
  };
  flatten(content, "");
  return fields;
}
