import {
  businessTipSourceInputs,
  tipWageSources,
  tipWotcSourceInputs,
} from "./business-tip-source.fixture.ts";
import { independentHealthInputs } from "./form7206-independent-owner.fixture.ts";
import { inputSchema as wotcSchema } from "../../nodes/inputs/f5884/index.ts";
export function singleTipInputs(
  receipts = 80000,
  tipAmount = 12000,
  wages = 0,
): any {
  const i: any = businessTipSourceInputs();
  i.f1099nec[0].box1_nec = receipts;
  i.f1099nec[0].qualified_tips_review.amount = tipAmount;
  Object.assign(i.f1099nec[0], {
    recipient_name: "Alex Example",
    source_document_reference: "2025-issued-event-client-1099NEC",
    account_number: "EVENT-TIPS-2025",
  });
  i.schedule_c[0].line_1_gross_receipts = receipts;
  if (wages) {
    i.w2 = tipWageSources();
    Object.assign(i.w2[0], {
      box1_wages: wages,
      box3_ss_wages: wages,
      box5_medicare_wages: wages,
      box4_ss_withheld: wages * .062,
      box6_medicare_withheld: wages * .0145,
    });
  }
  return i;
}
export function jointTipInputs(capPhase = false, employeeMix = false): any {
  const i: any = independentHealthInputs();
  delete i.form7206;
  i.schedule1a = structuredClone(singleTipInputs().schedule1a);
  for (const prefix of ["taxpayer", "spouse"]) {
    Object.assign(i.general, {
      [`${prefix}_ssn_valid_for_employment`]: true,
      [`${prefix}_ssn_issued_before_due_date`]: true,
      [`${prefix}_tin_issued_by_due_date`]: true,
    });
  }
  for (const c of i.schedule_c) {
    const primary = c.proprietor_recipient === "T";
    Object.assign(c, {
      line_a_principal_business: "Event food service",
      line_b_business_code: "722320",
      line_c_business_name: primary
        ? "Alex Event Service"
        : "Casey Event Service",
      line_1_gross_receipts: capPhase
        ? (primary ? 80000 : 60000)
        : (primary ? 10000 : 5000),
    });
    const n = i.f1099nec.find((r: any) =>
      r.schedule_c_business_reference === c.business_reference
    );
    n.box1_nec = c.line_1_gross_receipts;
    if (!employeeMix || primary) {
      n.qualified_tips_review = {
        ...singleTipInputs().f1099nec[0].qualified_tips_review,
        amount: employeeMix
          ? 12000
          : capPhase
          ? (primary ? 40000 : 30000)
          : (primary ? 9000 : 4000),
        tip_records_reference: primary
          ? "Alex owned event POS tip ledger"
          : "Casey owned event POS tip ledger",
      };
    }
  }
  if (employeeMix) {
    Object.assign(i.w2[0], {
      employer_name: "Alex Event Employer",
      box3_ss_wages: 171100,
      box4_ss_withheld: 10918.2,
      box7_ss_tips: 5000,
      box14b_tipped_code: "102",
    });
  }
  return i;
}
export function advancedTipInputs(): any {
  const tips = singleTipInputs();
  const i: any = tipWotcSourceInputs();
  delete i.w2;
  Object.assign(i.general, tips.general);
  i.f5884 = wotcSchema.parse(i.f5884);
  const worker = i.f5884.f5884s[0], c = i.schedule_c[0];
  Object.assign(c, {
    proprietor_recipient: "T",
    line_a_principal_business: "Event food service",
    line_b_business_code: "722320",
    line_c_business_name: "Example Event Service",
    line_d_ein: "123456789",
    line_1_gross_receipts: 260000,
    line_26_wages: 6000,
    qbi_w2_wages: 3600,
    qbi_unadjusted_basis: 0,
    qbi_no_other_adjustments_confirmed: true,
    qbi_wotc_filing_review: {
      employee_w2_records: [{
        employee_reference: worker.employee_reference,
        source_document_reference: "Issued event service employee W2",
        box1_wages: 6000,
        box5_wages: 6000,
        ssa_filing_record_reference: "Timely actual SSA payroll filing",
        filed_within_60_days_of_due_date_confirmed: true,
      }],
      all_business_payroll_included_confirmed: true,
      no_other_business_or_aggregation_confirmed: true,
      no_ptp_or_loss_carryforward_confirmed: true,
      qualified_dividends_zero_confirmed: true,
      no_qualified_property_confirmed: true,
      review_reference: "Event service actual payroll and280C review",
      reviewed_by: "Source reviewer",
      reviewed_on: "2026-03-01",
    },
  });
  i.schedule1a = structuredClone(tips.schedule1a);
  i.f1099nec = structuredClone(tips.f1099nec);
  Object.assign(i.f1099nec[0], {
    box1_nec: 260000,
    schedule_c_business_reference: c.business_reference,
  });
  i.f1099nec[0].qualified_tips_review.amount = 30000;
  return i;
}
export const qualifiedTipCases = [
  {
    id: "wholly-excluded-qbi",
    inputs: () => singleTipInputs(18000),
    profit: 10000,
    half: 707,
    se: 1413,
    tips: 9293,
    qbi: 0,
    qbiDed: 0,
    agi: 9293,
    ti: 0,
    ordinary: 0,
    total: 1413,
    advanced: false,
  },
  {
    id: "positive-business-only",
    inputs: () => singleTipInputs(),
    profit: 72000,
    half: 5087,
    se: 10173,
    tips: 12000,
    qbi: 54913,
    qbiDed: 7833,
    agi: 66913,
    ti: 31330,
    ordinary: 3521,
    total: 13694,
    advanced: false,
  },
  {
    id: "issued-w2-qbi-binding",
    inputs: () => singleTipInputs(80000, 12000, 50000),
    profit: 72000,
    half: 5087,
    se: 10173,
    tips: 12000,
    qbi: 54913,
    qbiDed: 10983,
    agi: 116913,
    ti: 78180,
    ordinary: 12113,
    total: 22286,
    advanced: false,
  },
  {
    id: "business-tips-25000-cap",
    inputs: () => singleTipInputs(80000, 40000),
    profit: 72000,
    half: 5087,
    se: 10173,
    tips: 25000,
    qbi: 41913,
    qbiDed: 5233,
    agi: 66913,
    ti: 20930,
    ordinary: 2273,
    total: 12446,
    advanced: false,
  },
  {
    id: "business-tips-magi-phaseout",
    inputs: () => singleTipInputs(80000, 12000, 100000),
    profit: 72000,
    half: 5087,
    se: 10173,
    tips: 10400,
    qbi: 56513,
    qbiDed: 11303,
    agi: 166913,
    ti: 129460,
    ordinary: 23917,
    total: 34090,
    advanced: false,
  },
  {
    id: "mfj-independent-owner-tips",
    inputs: () => jointTipInputs(),
    profit: 15000,
    half: 488,
    se: 975,
    tips: 13000,
    qbi: 1512,
    qbiDed: 302,
    agi: 190612,
    ti: 145810,
    ordinary: 21906,
    total: 22881,
    advanced: false,
  },
  {
    id: "mfj-cap-phaseout-owner-allocation",
    inputs: () => jointTipInputs(true),
    profit: 140000,
    half: 5311,
    se: 10621,
    tips: 24000,
    qbi: 110689,
    qbiDed: 22138,
    agi: 310789,
    ti: 233151,
    ordinary: 41650,
    total: 52770,
    advanced: false,
  },
  {
    id: "mfj-employee-business-tip-allocation",
    inputs: () => jointTipInputs(true, true),
    profit: 140000,
    half: 5311,
    se: 10621,
    tips: 16000,
    qbi: 123395,
    qbiDed: 24679,
    agi: 310789,
    ti: 238610,
    ordinary: 42960,
    total: 54080,
    advanced: false,
  },
  {
    id: "advanced-event-wotc-tip-exclusion",
    inputs: () => advancedTipInputs(),
    profit: 256400,
    half: 14352,
    se: 28703,
    tips: 15800,
    qbi: 226248,
    qbiDed: 33781,
    agi: 242048,
    ti: 176717,
    ordinary: 35259,
    total: 61893,
    advanced: true,
  },
] as const;
