import type { Schedule2Fields, Schedule2Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";

// Direct 1:1 field mappings (inputSchema key -> XSD element name)
const FIELD_MAP: ReadonlyArray<readonly [keyof Schedule2Fields, string]> = [
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
const AGGREGATED: ReadonlyArray<
  readonly [string, ...(keyof Schedule2Fields)[]]
> = [
  ["UncollSSMedcrRRTAGrpInsTxAmt", "uncollected_fica", "uncollected_fica_gtl"],
  ["IncmNonqlfyDefrdCompPlanAmt", "section409a_excise", "line17h_nqdc_tax"],
  [
    "ExcessParachutePaymentAmt",
    "golden_parachute_excise",
    "line17k_golden_parachute_excise",
  ],
];

function buildIRS1040Schedule2(fields: Schedule2Input): string {
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

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Schedule2MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f1040s2.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS1040Schedule2(pending.schedule2 ?? {});
  }
}

export const schedule2 = new Schedule2MefNode();
