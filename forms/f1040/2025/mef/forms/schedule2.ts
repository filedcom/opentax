import { element, elements } from "../../../mef/xml.ts";
import { calculateForm8874Recapture } from "../../../nodes/inputs/f8874/recapture_node.ts";
import type { F8874RecaptureInput } from "../../../nodes/inputs/f8874/recapture_node.ts";
import {
  calculateForm4255Routes,
  type F4255Input,
} from "../../../nodes/inputs/f4255/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1a_excess_advance_premium?: number | null;
  line1b_new_clean_vehicle_repayment?: number | null;
  line1c_prev_owned_clean_vehicle_repayment?: number | null;
  line1d_form4255_net_epe?: number | null;
  line1e_form4255_excessive_payment?: number | null;
  line1f_form4255_20_percent_ep?: number | null;
  line2_amt?: number | null;
  line4_se_tax?: number | null;
  line5_unreported_tip_tax?: number | null;
  line6_uncollected_8919?: number | null;
  line8_form5329_tax?: number | null;
  line9_household_employment?: number | null;
  line11_additional_medicare?: number | null;
  line12_niit?: number | null;
  uncollected_fica?: number | null;
  uncollected_fica_gtl?: number | null;
  section409a_excise?: number | null;
  line17h_nqdc_tax?: number | null;
  golden_parachute_excise?: number | null;
  line17k_golden_parachute_excise?: number | null;
  line17c_hsa_penalty?: number | null;
  line17d_hsa_eligibility_tax?: number | null;
  line17a_investment_credit_recapture?: number | null;
  line17a_new_markets_credit_recapture?: number | null;
  line17b_mortgage_subsidy_recapture?: number | null;
  line16_lihtc_recapture?: number | null;
  line17e_archer_msa_tax?: number | null;
  line17f_medicare_advantage_msa_tax?: number | null;
  line17p_form8621_interest?: number | null;
  line17z_other_additional_taxes?: number | null;
  line20_965_tax_installment?: number | null;
  line19_form4255_net_epe?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Direct 1:1 field mappings (inputSchema key -> XSD element name)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1a_excess_advance_premium", "PremiumTaxCreditTaxLiabAmt"],
  ["line1b_new_clean_vehicle_repayment", "CrTrnsfrDlrSaleAmt"],
  ["line1c_prev_owned_clean_vehicle_repayment", "PrevOwnCrTrnsfrDlrSaleAmt"],
  ["line1d_form4255_net_epe", "RcptrPrtnNetEPECrAmt"],
  ["line2_amt", "AlternativeMinimumTaxAmt"],
  ["line4_se_tax", "SelfEmploymentTaxAmt"],
  ["line5_unreported_tip_tax", "SocSecMedicareTaxUnrptdTipAmt"],
  ["line6_uncollected_8919", "UncollectedSocSecMedTaxAmt"],
  ["line8_form5329_tax", "TaxOnIRAsAmt"],
  ["line9_household_employment", "HouseholdEmploymentTaxAmt"],
  ["line11_additional_medicare", "TotalAMRRTTaxAmt"],
  ["line12_niit", "IndivNetInvstIncomeTaxAmt"],
  ["line16_lihtc_recapture", "RecaptureTaxAmt"],
  ["line17b_mortgage_subsidy_recapture", "MortgSbsdyRecaptureTaxAmt"],
  ["line17c_hsa_penalty", "HSADistriAddnlPercentTaxAmt"],
  ["line17d_hsa_eligibility_tax", "HDHPCoverageAddnlTaxAmt"],
  ["line17e_archer_msa_tax", "ArcherMSAAddnlDistriTaxAmt"],
  ["line17f_medicare_advantage_msa_tax", "MedicareMSAAddnlDistriTaxAmt"],
  ["line20_965_tax_installment", "Section965TaxInstallmentAmt"],
  ["line19_form4255_net_epe", "Frm3468IVRcptrPrtnNetEPECrAmt"],
];

// Aggregated mappings: multiple inputSchema fields -> single XSD element
// Each tuple: [XSD element name, ...inputSchema keys to sum]
const AGGREGATED: ReadonlyArray<readonly [string, ...(keyof Fields)[]]> = [
  ["UncollSSMedcrRRTAGrpInsTxAmt", "uncollected_fica", "uncollected_fica_gtl"],
  ["IncmNonqlfyDefrdCompPlanAmt", "section409a_excise", "line17h_nqdc_tax"],
  [
    "ExcessParachutePaymentAmt",
    "golden_parachute_excise",
    "line17k_golden_parachute_excise",
  ],
];

// IRS1040Schedule2.xsd is a sequence, not an unordered set of line elements.
const ELEMENT_ORDER = [
  "PremiumTaxCreditTaxLiabAmt",
  "CrTrnsfrDlrSaleAmt",
  "PrevOwnCrTrnsfrDlrSaleAmt",
  "RcptrPrtnNetEPECrAmt",
  "ExcessivePymtFrom4255Grp",
  "IncreaseChapter1TaxFrom4255Grp",
  "TotalTaxAdditionsAmt",
  "AlternativeMinimumTaxAmt",
  "AdditionalTaxAmt",
  "SelfEmploymentTaxAmt",
  "SocSecMedicareTaxUnrptdTipAmt",
  "UncollectedSocSecMedTaxAmt",
  "UnrprtdSocSecAndMedcrTaxAmt",
  "TaxOnIRAsAmt",
  "HouseholdEmploymentTaxAmt",
  "TotalAMRRTTaxAmt",
  "IndivNetInvstIncomeTaxAmt",
  "UncollSSMedcrRRTAGrpInsTxAmt",
  "RecaptureTaxAmt",
  "RecaptureOtherCreditsGrp",
  "TotalRecaptureOtherCreditsAmt",
  "MortgSbsdyRecaptureTaxAmt",
  "HSADistriAddnlPercentTaxAmt",
  "HDHPCoverageAddnlTaxAmt",
  "ArcherMSAAddnlDistriTaxAmt",
  "MedicareMSAAddnlDistriTaxAmt",
  "IncmNonqlfyDefrdCompPlanAmt",
  "ExcessParachutePaymentAmt",
  "InterestOnEachNetIncrInTaxAmt",
  "TotalAnyOtherTaxesAmt",
  "TotalOtherAdditionalTaxesAmt",
  "Frm3468IVRcptrPrtnNetEPECrAmt",
  "Section965TaxInstallmentAmt",
  "TotalOtherTaxesAmt",
] as const;

function buildIRS1040Schedule2(
  fields: Input,
  context?: MefBuildContext,
): string {
  const childrenByTag = new Map<string, string>();

  const form4255Amounts = [
    fields.line1d_form4255_net_epe,
    fields.line1e_form4255_excessive_payment,
    fields.line1f_form4255_20_percent_ep,
    fields.line19_form4255_net_epe,
  ];
  if (form4255Amounts.some((value) => typeof value === "number" && value > 0)) {
    const source = context?.pending?.f4255;
    if (!source || typeof source !== "object") {
      throw new Error("Schedule 2 Form 4255 lines require source rows");
    }
    const lines = calculateForm4255Routes(source as F4255Input);
    const expected = [
      lines.line1d,
      lines.line1e_1d + lines.line1e_2a,
      lines.line1f_1d + lines.line1f_2a,
      lines.line19,
    ];
    if (
      form4255Amounts.some((value, index) => (value ?? 0) !== expected[index])
    ) {
      throw new Error("Schedule 2 Form 4255 lines differ from source rows");
    }
    const group = (
      tag: string,
      amount1d: number,
      amount2a: number,
      totalTag: string,
    ) => {
      const total = amount1d + amount2a;
      if (total === 0) return;
      childrenByTag.set(
        tag,
        elements(tag, [
          amount1d > 0 ? element("ApplicableCheckboxiiiInd", "X") : "",
          amount2a > 0 ? element("ApplicableCheckboxivInd", "X") : "",
          element(totalTag, total),
        ]),
      );
    };
    group(
      "ExcessivePymtFrom4255Grp",
      lines.line1e_1d,
      lines.line1e_2a,
      "ExPymt100CrAmt",
    );
    group(
      "IncreaseChapter1TaxFrom4255Grp",
      lines.line1f_1d,
      lines.line1f_2a,
      "TotEx20PrvlWgAprntcshpPnltyAmt",
    );
  }

  // Direct mappings
  for (const [key, tag] of FIELD_MAP) {
    const value = fields[key];
    if (typeof value !== "number") continue;
    if (
      key === "line1b_new_clean_vehicle_repayment" ||
      key === "line1c_prev_owned_clean_vehicle_repayment"
    ) {
      const formIds = context?.documentIdsByTag?.IRS8936 ?? [];
      if (context?.documentIdsByTag && formIds.length === 0) {
        throw new Error("Schedule 2 clean-vehicle repayment needs Form 8936");
      }
      childrenByTag.set(
        tag,
        element(
          tag,
          value,
          formIds.length > 0
            ? {
              referenceDocumentId: formIds.join(" "),
              referenceDocumentName: "IRS8936",
            }
            : undefined,
        ),
      );
      continue;
    }
    if (key === "line16_lihtc_recapture" && value > 0) {
      const formIds = context?.documentIdsByPendingKey?.f8611 ?? [];
      if (context?.documentIdsByPendingKey && formIds.length === 0) {
        throw new Error("Schedule 2 line 16 needs attached Forms 8611");
      }
      childrenByTag.set(
        tag,
        element(
          tag,
          value,
          formIds.length > 0
            ? {
              referenceDocumentId: formIds.join(" "),
              referenceDocumentName: "IRS8611",
            }
            : undefined,
        ),
      );
      continue;
    }
    if (key === "line20_965_tax_installment" && value > 0) {
      const formIds = context?.documentIdsByPendingKey?.f965 ?? [];
      if (context?.documentIdsByPendingKey && formIds.length === 0) {
        throw new Error("Schedule 2 line 20 needs attached Form 965-A");
      }
    }
    childrenByTag.set(tag, element(tag, value));
  }

  // Aggregated mappings
  for (const [tag, ...keys] of AGGREGATED) {
    const values = keys.map((k) => fields[k]).filter((v): v is number =>
      typeof v === "number"
    );
    if (values.length === 0) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    childrenByTag.set(tag, element(tag, sum));
  }

  // The printed 2025 form carries lines 1z, 3, and 7 even though their
  // component amounts have separate MeF elements.
  const amount = (key: keyof Fields): number => {
    const value = fields[key];
    return typeof value === "number" ? value : 0;
  };
  const line1z = amount("line1a_excess_advance_premium") +
    amount("line1b_new_clean_vehicle_repayment") +
    amount("line1c_prev_owned_clean_vehicle_repayment") +
    amount("line1d_form4255_net_epe") +
    amount("line1e_form4255_excessive_payment") +
    amount("line1f_form4255_20_percent_ep");
  if (line1z > 0) {
    childrenByTag.set(
      "TotalTaxAdditionsAmt",
      element("TotalTaxAdditionsAmt", line1z),
    );
  }
  const line3 = line1z + amount("line2_amt");
  if (line3 > 0) {
    childrenByTag.set("AdditionalTaxAmt", element("AdditionalTaxAmt", line3));
  }
  const line7 = amount("line5_unreported_tip_tax") +
    amount("line6_uncollected_8919");
  if (line7 > 0) {
    childrenByTag.set(
      "UnrprtdSocSecAndMedcrTaxAmt",
      element("UnrprtdSocSecAndMedcrTaxAmt", line7),
    );
  }

  const form8621Interest = fields.line17p_form8621_interest;
  const investmentRecapture = fields.line17a_investment_credit_recapture;
  if (typeof investmentRecapture === "number" && investmentRecapture > 0) {
    throw new Error(
      "Schedule 2 generic 3468 recapture requires a specific Form 4255 credit-line source; the old shortcut is unsupported",
    );
  }
  const newMarketsRecapture = fields.line17a_new_markets_credit_recapture;
  const newMarketsSource = context?.pending?.f8874_recapture;
  if (newMarketsSource !== undefined || (newMarketsRecapture ?? 0) > 0) {
    if (newMarketsSource === undefined) {
      throw new Error("Schedule 2 NMCR needs a Form 8874-B recapture source");
    }
    const calculated = calculateForm8874Recapture(
      newMarketsSource as F8874RecaptureInput,
    );
    if (calculated !== (newMarketsRecapture ?? 0)) {
      throw new Error("Schedule 2 NMCR does not match its recapture source");
    }
  }
  const recaptureGroups = [
    { code: "3468", amount: investmentRecapture },
    { code: "NMCR", amount: newMarketsRecapture },
  ].filter((group): group is { code: string; amount: number } =>
    typeof group.amount === "number" && group.amount > 0
  );
  if (recaptureGroups.length > 0) {
    childrenByTag.set(
      "RecaptureOtherCreditsGrp",
      recaptureGroups.map((group) =>
        elements("RecaptureOtherCreditsGrp", [
          element("OtherCreditsCd", group.code),
          element("OtherCreditsAmt", group.amount),
        ])
      ).join(""),
    );
    childrenByTag.set(
      "TotalRecaptureOtherCreditsAmt",
      element(
        "TotalRecaptureOtherCreditsAmt",
        recaptureGroups.reduce((sum, group) => sum + group.amount, 0),
      ),
    );
  }
  if (typeof form8621Interest === "number" && form8621Interest > 0) {
    const formIds = context?.documentIdsByPendingKey?.form8621 ?? [];
    if (context?.documentIdsByPendingKey && formIds.length === 0) {
      throw new Error("Schedule 2 line 17p needs an attached Form 8621");
    }
    childrenByTag.set(
      "InterestOnEachNetIncrInTaxAmt",
      element(
        "InterestOnEachNetIncrInTaxAmt",
        form8621Interest,
        formIds.length > 0
          ? {
            referenceDocumentId: formIds.join(" "),
            referenceDocumentName: "IRS8621",
          }
          : undefined,
      ),
    );
  }

  const adjustment = context?.pending?.form8978_reporting_year;
  const reduction = adjustment && typeof adjustment === "object"
    ? (adjustment as Record<string, unknown>).schedule2_line17z_reduction
    : undefined;
  const line17z = (fields.line17z_other_additional_taxes ?? 0) -
    (typeof reduction === "number" ? reduction : 0);
  if (line17z !== 0) {
    const statementId = context?.documentIdsByPendingKey
      ?.any_other_taxes_statement?.[0];
    if (context?.documentIdsByPendingKey && !statementId) {
      throw new Error("Schedule 2 line 17z needs its other-taxes statement");
    }
    childrenByTag.set(
      "TotalAnyOtherTaxesAmt",
      element(
        "TotalAnyOtherTaxesAmt",
        line17z,
        statementId
          ? {
            referenceDocumentId: statementId,
            referenceDocumentName: "AnyOtherTaxesStatement",
          }
          : undefined,
      ),
    );
  }
  const line18 = amount("line17a_investment_credit_recapture") +
    amount("line17a_new_markets_credit_recapture") +
    amount("line17b_mortgage_subsidy_recapture") +
    amount("line17c_hsa_penalty") +
    amount("line17d_hsa_eligibility_tax") +
    amount("line17e_archer_msa_tax") +
    amount("line17f_medicare_advantage_msa_tax") +
    amount("section409a_excise") +
    amount("line17h_nqdc_tax") +
    amount("golden_parachute_excise") +
    amount("line17k_golden_parachute_excise") +
    amount("line17p_form8621_interest") + line17z;
  if (line18 < 0) {
    // IRS1040Schedule2.xsd declares line 18 as USAmountNNType even though
    // the Form 8978 worksheet can place a negative amount on line 17z.
    // Omitting a negative line 18 would also break business rule S2-F1040-004.
    throw new Error(
      "Schedule 2 negative Form 8978 adjustment makes line 18 negative; the TY2025 MeF schema cannot represent that result",
    );
  }
  if (line18 > 0) {
    childrenByTag.set(
      "TotalOtherAdditionalTaxesAmt",
      element("TotalOtherAdditionalTaxesAmt", line18),
    );
  }
  const calculatedPart2 = amount("line4_se_tax") + line7 +
    amount("line8_form5329_tax") + amount("line9_household_employment") +
    amount("line11_additional_medicare") + amount("line12_niit") +
    amount("uncollected_fica") + amount("uncollected_fica_gtl") +
    amount("line16_lihtc_recapture") + line18 +
    amount("line19_form4255_net_epe");
  const adjustedPart2 = adjustment && typeof adjustment === "object"
    ? (adjustment as Record<string, unknown>).schedule2_line21
    : undefined;
  const line21 = typeof adjustedPart2 === "number"
    ? adjustedPart2
    : calculatedPart2;
  if (
    line21 > 0 || (typeof reduction === "number" && reduction > 0)
  ) {
    childrenByTag.set(
      "TotalOtherTaxesAmt",
      element("TotalOtherTaxesAmt", line21),
    );
  }

  return elements(
    "IRS1040Schedule2",
    ELEMENT_ORDER.map((tag) => childrenByTag.get(tag) ?? ""),
  );
}

export const schedule2: MefFormDescriptor<"schedule2", Input> = {
  pendingKey: "schedule2",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s2.pdf",
  build(fields, context) {
    return buildIRS1040Schedule2(fields, context);
  },
};
