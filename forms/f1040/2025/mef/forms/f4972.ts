import { element, elements } from "../../../mef/xml.ts";
import { TS } from "../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm4972Nua } from "../../form4972_nua_reconciliation.ts";
import { reconcileForm4972MultipleRecipients } from "../../form4972_multiple_recipient_reconciliation.ts";
import { reconcileForm4972EstatePartII } from "../../form4972_estate_part2_reconciliation.ts";
import { reconcileForm4972FullShare } from "../../form4972_full_share_reconciliation.ts";

export interface Fields {
  recipient?: TS;
  born_before_1936?: boolean;
  entire_balance_distributed?: boolean;
  rolled_over_any?: boolean;
  beneficiary_distribution?: boolean;
  participant_five_year_member?: boolean;
  prior_election_after_1986?: boolean;
  prior_beneficiary_election_after_1986?: boolean;
  line6?: number;
  line6_nua_capital_gain?: number;
  line7?: number;
  line8?: number;
  line8_nua_included?: number;
  line9?: number;
  line10?: number;
  line11?: number;
  line12?: number;
  line13?: number;
  line14?: number;
  line15?: number;
  line16?: number;
  line17?: number;
  line18?: number;
  line19?: number;
  line20?: number;
  line21?: number;
  line22?: number;
  line23?: number;
  line24?: number;
  line25?: number;
  line26?: number;
  line27?: number;
  line28?: number;
  line29?: number;
  line30?: number;
}

type Input = Partial<Fields> & Record<string, unknown>;

// 2025v5.4 IRS4972.xsd sequence. Source-only 1099-R amounts are deliberately
// not emitted as invented Form 4972 fields.
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line6", "CapitalGainElectionAmt"],
  ["line7", "CapitalGainTimesElectionPctAmt"],
  ["line8", "LumpSumDistriOrdinaryIncmAmt"],
  ["line9", "LumpSumDistriDeathBnftExclAmt"],
  ["line10", "LumpSumDistriTotalTaxableAmt"],
  ["line11", "AnnuityActuarialValueAmt"],
  ["line12", "LumpSumDistriAdjTotTaxableAmt"],
  ["line13", "LumpSumDistri50PctTotalTxblAmt"],
  ["line14", "LumpSumNetAdjTotalTaxableAmt"],
  ["line15", "LumpSumDistriProratedTxblAmt"],
  ["line16", "LumpSumMinDistriAllowanceAmt"],
  ["line17", "LumpSumDistriAllowableTxblAmt"],
  ["line18", "LumpDistribFederalEstateTaxAmt"],
  ["line19", "LumpSumDistriNetTaxableAmt"],
  ["line20", "LumpSumDistriActuarialAdjPct"],
  ["line21", "LumpSumDistriMinAllwPercentAmt"],
  ["line22", "LumpSumDistriAdjActuarialAmt"],
  ["line23", "LumpSumDistriPctAdjTxblAmt"],
  ["line24", "LumpSumDistriTaxOnPercentAmt"],
  ["line25", "LumpSumDistriTentAvgTaxAmt"],
  ["line26", "LumpSumDistriTxblAdjActrlAmt"],
  ["line27", "AdjustedActuarialAmt"],
  ["line28", "LumpSumDistriAdjAverageTaxAmt"],
  ["line29", "LumpSumRsdlAnnuityAvgTaxAmt"],
  ["line30", "LumpSumDistributionTaxAmt"],
];

function recipientIdentity(fields: Input, context?: MefBuildContext) {
  const filer = context?.filer;
  if (!filer || !fields.recipient) {
    throw new Error("Form 4972 requires the recipient and filer identity");
  }
  if (fields.recipient === TS.S) {
    const spouse = filer.spouse;
    if (!spouse) throw new Error("Form 4972 spouse recipient is missing");
    return {
      name: [spouse.firstName, spouse.middleInitial, spouse.lastName]
        .filter(Boolean).join(" "),
      ssn: spouse.ssn,
    };
  }
  const name = filer.fullName ??
    [filer.firstName, filer.middleInitial, filer.lastName]
      .filter(Boolean).join(" ");
  if (!name) throw new Error("Form 4972 recipient name is missing");
  return { name, ssn: filer.primarySSN };
}

function buildIRS4972(fields: Input, context?: MefBuildContext): string {
  if (!FIELD_MAP.some(([key]) => typeof fields[key] === "number")) {
    if (Object.keys(fields).length === 0) return "";
    throw new Error("Form 4972 has source facts but no calculated form lines");
  }
  if (
    fields.born_before_1936 !== true ||
    fields.entire_balance_distributed !== true ||
    fields.rolled_over_any !== false ||
    typeof fields.beneficiary_distribution !== "boolean" ||
    typeof fields.participant_five_year_member !== "boolean" ||
    (fields.beneficiary_distribution === true &&
      fields.participant_five_year_member === true) ||
    fields.beneficiary_distribution !== true &&
      fields.participant_five_year_member !== true ||
    (fields.beneficiary_distribution === true
      ? fields.prior_beneficiary_election_after_1986 !== false
      : fields.prior_election_after_1986 !== false)
  ) {
    throw new Error("Form 4972 is missing qualifying Part I answers");
  }
  const recipient = recipientIdentity(fields, context);
  if (
    (fields.line6_nua_capital_gain ?? 0) > 0 &&
    typeof fields.line6 !== "number"
  ) {
    throw new Error("Form 4972 capital NUA needs line 6");
  }
  if (
    (fields.line8_nua_included ?? 0) > 0 &&
    typeof fields.line8 !== "number"
  ) {
    throw new Error("Form 4972 ordinary NUA needs line 8");
  }
  reconcileForm4972Nua(fields, context?.pending);
  reconcileForm4972EstatePartII(fields, context?.pending);
  reconcileForm4972FullShare(fields, context?.pending);
  const multipleRecipients = reconcileForm4972MultipleRecipients(
    fields,
    context?.pending,
  );
  return elements("IRS4972", [
    element("PersonNm", recipient.name),
    element("SSN", recipient.ssn.replaceAll("-", "")),
    element("DistributionOfQualifiedPlanInd", "true"),
    element("RolloverInd", "false"),
    element(
      "EmployeeBeneficiaryDistriInd",
      String(fields.beneficiary_distribution === true),
    ),
    element(
      "QualifyingAge5YearMemberInd",
      String(fields.participant_five_year_member === true),
    ),
    fields.beneficiary_distribution !== true &&
      fields.prior_election_after_1986 !== undefined
      ? element(
        "PriorYearDistributionInd",
        String(fields.prior_election_after_1986),
      )
      : "",
    fields.beneficiary_distribution === true
      ? element(
        "BeneficiaryDistributionInd",
        String(fields.prior_beneficiary_election_after_1986),
      )
      : "",
    ...FIELD_MAP.flatMap(([key, tag]) => {
      const value = fields[key];
      if (typeof value !== "number") return [];
      const capitalNua = fields.line6_nua_capital_gain ?? 0;
      if (key === "line6" && capitalNua > 0) {
        return [element(tag, value, {
          capitalGainElectionNUAAmt: String(Math.round(capitalNua)),
          capitalGainElectionNUACd: "NUA",
        })];
      }
      const ordinaryNua = fields.line8_nua_included ?? 0;
      if (key === "line8" && ordinaryNua > 0) {
        return [element(tag, value, {
          netUnrealizedAppreciationAmt: String(Math.round(ordinaryNua)),
          netUnrealizedAppreciationCd: "NUA",
        })];
      }
      return [
        element(tag, key === "line20" ? value.toFixed(5) : value),
        ...(key === "line29" && multipleRecipients
          ? [element("LumpSumDistriMultRecipientsCd", "MRD")]
          : []),
      ];
    }),
  ]);
}

export const form4972: MefFormDescriptor<"form4972", Input> = {
  pendingKey: "form4972",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4972--2025.pdf",
  build(fields, context) {
    return buildIRS4972(fields, context);
  },
};
