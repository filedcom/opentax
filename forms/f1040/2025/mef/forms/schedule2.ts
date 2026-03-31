import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  line1_amt?: number | null;
  line4_se_tax?: number | null;
  line5_unreported_tip_tax?: number | null;
  line6_uncollected_8919?: number | null;
  line8_form5329_tax?: number | null;
  line11_additional_medicare?: number | null;
  line12_niit?: number | null;
  uncollected_fica?: number | null;
  uncollected_fica_gtl?: number | null;
  section409a_excise?: number | null;
  line17h_nqdc_tax?: number | null;
  golden_parachute_excise?: number | null;
  line17k_golden_parachute_excise?: number | null;
  line17b_hsa_penalty?: number | null;
  line17e_archer_msa_tax?: number | null;
  line17f_medicare_advantage_msa_tax?: number | null;
  lump_sum_tax?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Direct 1:1 field mappings (inputSchema key -> XSD element name)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line1_amt", "AlternativeMinimumTaxAmt"],
  ["line4_se_tax", "SelfEmploymentTaxAmt"],
  ["line5_unreported_tip_tax", "SocSecMedicareTaxUnrptdTipAmt"],
  ["line6_uncollected_8919", "UncollectedSocSecMedTaxAmt"],
  ["line8_form5329_tax", "TaxOnIRAsAmt"],
  ["line11_additional_medicare", "TotalAMRRTTaxAmt"],
  ["line12_niit", "IndivNetInvstIncomeTaxAmt"],
  ["line17b_hsa_penalty", "HSADistriAddnlPercentTaxAmt"],
  ["line17e_archer_msa_tax", "ArcherMSAAddnlDistriTaxAmt"],
  ["line17f_medicare_advantage_msa_tax", "MedicareMSAAddnlDistriTaxAmt"],
  ["lump_sum_tax", "PartialTaxOnAccumDistriAmt"],
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

function buildIRS1040Schedule2(fields: Input): string {
  const children: string[] = [];

  // Direct mappings
  for (const [key, tag] of FIELD_MAP) {
    const value = fields[key];
    if (typeof value !== "number") continue;
    children.push(element(tag, value));
  }

  // Aggregated mappings
  for (const [tag, ...keys] of AGGREGATED) {
    const values = keys.map((k) => fields[k]).filter((v): v is number =>
      typeof v === "number"
    );
    if (values.length === 0) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    children.push(element(tag, sum));
  }

  return elements("IRS1040Schedule2", children);
}

export const schedule2: MefFormDescriptor<"schedule2", Input> = {
  pendingKey: "schedule2",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s2.pdf",
  build(fields) {
    return buildIRS1040Schedule2(fields);
  },
};
