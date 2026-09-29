import { element, elements } from "../../../mef/xml.ts";
import {
  type F8854Input,
  inputSchema,
  isCoveredExpatriate,
} from "../../../nodes/inputs/f8854/index.ts";
import {
  allocateMarkToMarketExclusion,
  wholeDollarAssets,
} from "../../../nodes/inputs/f8854/mark-to-market.ts";
import {
  NongrantorTrustTreatment,
  type SectionC,
  sectionCSchema,
} from "../../../nodes/inputs/f8854/section-c.ts";
import { calculateSectionDDeferral } from "../../../nodes/inputs/f8854/section-d.ts";

export type Form8854SectionCStatementIds = {
  eligibleDeferredCompensation?: string;
  ineligibleDeferredCompensation?: string;
  specifiedTaxDeferredAccounts?: string;
  nongrantorTrust?: string;
  computation?: string;
  deferredPropertyTaxElection?: string;
};

const names = {
  eligibleDeferredCompensation: "EligibleDeferredCompensationItemStatement",
  ineligibleDeferredCompensation: "IneligibleDeferredCompensationItemStatement",
  specifiedTaxDeferredAccounts: "SpecifiedTaxDeferredAccountsStatement",
  nongrantorTrust: "NongrantorTrustStatement",
  computation: "Form8854ComputationStatement",
  deferredPropertyTaxElection: "DeferredPropertyTaxElectionStatement",
} as const;

// The MeF XSD enumerations contain these spellings, including their typos.
export const eligibleWaiver =
  "I IRREVOCABLY WAIVE ANY RIGHT TO CLAIM ANY REDUCTION IN WITHOLDING FOR THIS ELIGIBLE DEFFERED COMPENSATION ITEM UNDER ANY TREATY WITH THE UNITED STATES";
export const trustWaiver =
  "I WAIVE ANY RIGHT TO CLAIM ANY REDUCTION IN WITHOLDING ON ANY DISTRIBUTION FROM SUCH TRUST UNDER ANY TREATY WITH THE UNITED STATES";
const trustElection =
  "I ELECT UNDER SECTION 877A(f)(4)(B) TO BE TREATED AS HAVING RECEIVED THE VALUE OF MY ENTIRE INTEREST IN THE TRUST (AS DETERMINED FOR PURPOSES OF SECTION 877A) AS OF THE DAY BEFORE MY EXPATRIATION DATE. I ATTACH A COPY OF MY VALUATION LETTER RULING ISSUED BY THE IRS.";

function linkedAttrs(
  populated: boolean,
  id: string | undefined,
  name: string,
  phase: "discover" | "link",
): Record<string, string> | undefined {
  if (phase === "link" && populated && !id) {
    throw new Error(`Form 8854 ${name} requires a linked statement document`);
  }
  if (!populated && id) {
    throw new Error(`Form 8854 ${name} cannot link an empty statement`);
  }
  return id
    ? { referenceDocumentId: id, referenceDocumentName: name }
    : undefined;
}

function sumMoney(values: readonly number[]): number {
  const cents = values.reduce(
    (sum, value) => sum + BigInt(Math.round(value * 100)),
    0n,
  );
  if (
    cents > BigInt(Number.MAX_SAFE_INTEGER) ||
    cents < -BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error("Form 8854 Section C total exceeds safe cent precision");
  }
  return Number(cents) / 100;
}

/** Native Section C statements. Empty categories do not produce documents. */
export function buildForm8854SectionCStatements(rawSection: SectionC) {
  const section = sectionCSchema.parse(rawSection);
  if (section.mark_to_market_assets.length > 20) {
    throw new Error("Form 8854 Section C supports at most 20 property rows");
  }
  const assets = wholeDollarAssets(section);
  const allocations = allocateMarkToMarketExclusion(assets);
  const totalBuiltInGain = sumMoney(
    allocations.map((row) => Math.max(row.builtInGainOrLoss, 0)),
  );
  return {
    eligibleDeferredCompensation: section.eligible_deferred_compensation.length
      ? elements(
        "EligDeferredCompItemStmt",
        section.eligible_deferred_compensation.map((row) =>
          elements("EligDeferredCompItemGrp", [
            element("Desc", row.description),
            element("IrrevocableWaiverCd", eligibleWaiver),
          ])
        ),
      )
      : "",
    ineligibleDeferredCompensation:
      section.ineligible_deferred_compensation.length
        ? elements(
          "InlgblDeferredCompItemStmt",
          section.ineligible_deferred_compensation.map((row) =>
            elements("InlgblDeferredCompItemGrp", [
              element("Desc", row.description),
              element("Amt", row.present_value_day_before_expatriation),
            ])
          ),
        )
        : "",
    specifiedTaxDeferredAccounts: section.specified_tax_deferred_accounts.length
      ? elements(
        "SpecifiedTaxDeferredAcctStmt",
        section.specified_tax_deferred_accounts.map((row) =>
          elements("SpecifiedTaxDeferredAcctGrp", [
            element("Desc", row.description),
            element("Amt", row.entire_account_balance_day_before_expatriation),
          ])
        ),
      )
      : "",
    nongrantorTrust: section.nongrantor_trust_interests.length
      ? elements(
        "NongrantorTrustStatement",
        section.nongrantor_trust_interests.map((row) =>
          elements("NongrantorTrustInterestGrp", [
            element("Desc", row.description),
            element(
              "NongrantorTrustInterestCd",
              row.treatment === NongrantorTrustTreatment.ElectFullValue
                ? trustElection
                : trustWaiver,
            ),
          ])
        ),
      )
      : "",
    computation: section.mark_to_market_assets.length
      ? elements(
        "Form8854ComputationStatement",
        assets.map((asset, index) => {
          const allocation = allocations[index];
          return elements("GainAfterAllocationExclGrp", [
            element("PropertyDesc", asset.description),
            element("CostOrOtherBasisAmt", asset.us_adjusted_basis),
            element(
              "FairMarketValueDayBfrExptrtAmt",
              asset.fmv_day_before_expatriation,
            ),
            element("GainOrLossAmt", allocation.builtInGainOrLoss),
            element("ExclusionCalculationAmt", allocation.exclusionAllocated),
            element(
              "GainAfterAllocationExclAmt",
              allocation.gainAfterExclusion,
            ),
            element("TotalBuiltInGainAmt", totalBuiltInGain),
          ]);
        }),
      )
      : "",
  };
}

/** IRS8854 Part II Section C children in 2025v5.4 XSD order. */
export function buildForm8854SectionC(
  rawInput: F8854Input,
  statementIds: Form8854SectionCStatementIds = {},
  phase: "discover" | "link" = "link",
): string {
  const input = inputSchema.parse(rawInput);
  const covered = isCoveredExpatriate(input);
  if (!covered) {
    if (input.section_d.elect_deferral) {
      throw new Error("Only covered expatriates can elect Section D deferral");
    }
    if (input.section_c !== null) {
      throw new Error("Form 8854 Section C is only for covered expatriates");
    }
    if (Object.values(statementIds).some((id) => id !== undefined)) {
      throw new Error("Form 8854 Section C cannot link statements when absent");
    }
    return "";
  }
  if (input.section_c === null) {
    throw new Error(
      "Covered expatriates require Form 8854 Section C source facts",
    );
  }
  const section = input.section_c;
  if (section.mark_to_market_assets.length > 20) {
    throw new Error("Form 8854 Section C supports at most 20 property rows");
  }
  const attrs = {
    eligibleDeferredCompensation: linkedAttrs(
      section.eligible_deferred_compensation.length > 0,
      statementIds.eligibleDeferredCompensation,
      names.eligibleDeferredCompensation,
      phase,
    ),
    ineligibleDeferredCompensation: linkedAttrs(
      section.ineligible_deferred_compensation.length > 0,
      statementIds.ineligibleDeferredCompensation,
      names.ineligibleDeferredCompensation,
      phase,
    ),
    specifiedTaxDeferredAccounts: linkedAttrs(
      section.specified_tax_deferred_accounts.length > 0,
      statementIds.specifiedTaxDeferredAccounts,
      names.specifiedTaxDeferredAccounts,
      phase,
    ),
    nongrantorTrust: linkedAttrs(
      section.nongrantor_trust_interests.length > 0,
      statementIds.nongrantorTrust,
      names.nongrantorTrust,
      phase,
    ),
    computation: linkedAttrs(
      section.mark_to_market_assets.length > 0,
      statementIds.computation,
      names.computation,
      phase,
    ),
    deferredPropertyTaxElection: linkedAttrs(
      input.section_d.elect_deferral,
      statementIds.deferredPropertyTaxElection,
      names.deferredPropertyTaxElection,
      phase,
    ),
  };
  const assets = wholeDollarAssets(section);
  const allocations = allocateMarkToMarketExclusion(assets);
  const deferral = calculateSectionDDeferral(section, input.section_d);
  const deferredById = new Map<string, number>(
    deferral?.properties.map((row): [string, number] => [
      row.itemId,
      row.deferredTax,
    ]) ?? [],
  );
  return elements("PropertyOwnedDtExpatriationGrp", [
    section.eligible_deferred_compensation.length
      ? element(
        "EligibleDeferredCompItemsInd",
        "true",
        attrs.eligibleDeferredCompensation,
      )
      : "",
    section.ineligible_deferred_compensation.length
      ? element(
        "IneligibleDeferredCompItemsInd",
        "true",
        attrs.ineligibleDeferredCompensation,
      )
      : "",
    section.specified_tax_deferred_accounts.length
      ? element(
        "SpecifiedTaxDeferredAccountInd",
        "true",
        attrs.specifiedTaxDeferredAccounts,
      )
      : "",
    section.nongrantor_trust_interests.length
      ? element("NongrantorTrustInterestInd", "true", attrs.nongrantorTrust)
      : "",
    section.nongrantor_trust_interests.some((row) =>
        row.treatment === NongrantorTrustTreatment.ElectFullValue
      )
      ? element("Section877AElectionInd", "X")
      : "",
    ...assets.map((asset, index) => {
      const allocation = allocations[index];
      return elements("MarkToMarketPropertySaleGrp", [
        element("PropertyDesc", asset.description),
        element(
          "FairMarketValueDayBfrExptrtAmt",
          asset.fmv_day_before_expatriation,
        ),
        elements("CostOrOtherBasisGrp", [
          element("CostOrOtherBasisAmt", asset.us_adjusted_basis),
          asset.basis_irrevocable_election_h2
            ? element("BasisIrrevocableElectionCd", "(h)(2)")
            : "",
        ]),
        element("GainOrLossAmt", allocation.builtInGainOrLoss),
        element(
          "GainAfterAllocationExclAmt",
          allocation.gainAfterExclusion,
          attrs.computation,
        ),
        element("FormOrSchGainAssetReportedCd", asset.reported_form_code),
        (deferredById.get(asset.item_id) ?? 0) > 0
          ? element(
            "DeferredTaxAmt",
            deferredById.get(asset.item_id),
            attrs.deferredPropertyTaxElection,
          )
          : "",
      ]);
    }),
    element(
      "TotalGainOrLossAmt",
      sumMoney(allocations.map((row) => row.builtInGainOrLoss)),
    ),
    element(
      "TotGainAfterAllocationExclAmt",
      sumMoney(allocations.map((row) => row.gainAfterExclusion)),
    ),
    deferral ? element("TotalTaxDeferredAmt", deferral.totalDeferredTax) : "",
  ]);
}
