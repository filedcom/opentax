import { patronFiledBusinessLines } from "../../nodes/inputs/qbi_patron/calculation.ts";
import {
  filedOwnedScheduleC,
  filedOwnedScheduleF,
} from "../../nodes/owned-business-filing.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";

/** Synthetic reviewed issued sources; no external authentication claim. */
export function farmWotcLossFixtures(
  positive: readonly PdfReviewFixture[],
  cBase: PdfReviewFixture,
): PdfReviewFixture[] {
  return [
    {
      id: "below-primary-c-offset",
      owner: "T",
      otherKind: "c",
      other: 30000.50,
      wages: 150000.37,
      feed: 26400.51,
    },
    {
      id: "below-primary-zero-use",
      owner: "T",
      otherKind: "f",
      other: 8000.50,
      wages: 0,
      feed: 26401.50,
    },
    {
      id: "below-spouse-net-loss",
      owner: "S",
      otherKind: "f",
      other: 8000.50,
      wages: 100000.37,
      feed: 26401.50,
    },
    {
      id: "phase-primary-f-offset",
      owner: "T",
      otherKind: "f",
      other: 80000.50,
      wages: 430000.37,
      feed: 26401.50,
    },
    {
      id: "above-spouse-net-loss",
      owner: "S",
      otherKind: "f",
      other: 8000.50,
      wages: 550000.37,
      feed: 26401.49,
    },
    {
      id: "below-primary-limited-credit",
      owner: "T",
      otherKind: "c",
      other: 20000.50,
      wages: 30000.37,
      feed: 230001.50,
      many: true,
    },
  ].map((row) => {
    const base = positive.find((f) =>
      f.id ===
        (row.many
          ? "owned-farm-wotc-primary-limited"
          : "owned-farm-wotc-ordinary-spouse-phase")
    )!;
    const inputs: any = structuredClone(base.inputs);
    const farm = inputs.schedule_f.schedule_fs[0];
    const owner = row.owner === "T" ? "111223333" : "444556666";
    const gross = row.many ? 500000.50 : 20000.50;
    farm.proprietor_recipient = row.owner;
    farm.line4a_ag_program_payments = gross - 1000.50;
    farm.line4b_ag_program_payments_taxable = gross - 1000.50;
    farm.line8_other_income = 1000.50;
    farm.line16_feed = row.feed;
    const review = farm.qbi_wotc_filing_review;
    review.owner_ssn = owner;
    delete review.no_other_business_or_aggregation_confirmed;
    review.no_aggregation_confirmed = true;
    review.reviewed_other_business_references = ["Loss-Offset-Business"];
    for (const worker of inputs.f5884.f5884s) {
      worker.direct_employer_review.proprietor_recipient = row.owner;
      worker.direct_employer_review.proprietor_ssn = owner;
    }
    inputs.f1099nec = [inputs.f1099nec[0]];
    inputs.f1099nec[0].recipient_ssn = owner;
    inputs.f1099nec[0].box1_nec = 1000.50;
    inputs.f1099g = [inputs.f1099g[0]];
    inputs.f1099g[0].recipient_tin = owner;
    inputs.f1099g[0].box_7_agriculture = gross - 1000.50;
    inputs.schedule_f.schedule_fs = [farm];
    if (row.otherKind === "f") {
      const other = structuredClone(
        (positive.find((f) => f.id === "owned-farm-wotc-ordinary-spouse-phase")!
          .inputs.schedule_f as any).schedule_fs[1],
      );
      other.farm_id = "Loss-Offset-Business";
      other.proprietor_recipient = row.owner;
      other.line4a_ag_program_payments = row.other - 1000.50;
      other.line4b_ag_program_payments_taxable = row.other - 1000.50;
      other.line8_other_income = 1000.50;
      inputs.schedule_f.schedule_fs.push(other);
      inputs.f1099nec.push({
        ...inputs.f1099nec[0],
        payer_tin: "234567892",
        farm_id: other.farm_id,
        box1_nec: 1000.50,
        source_document_reference: `Synthetic loss offset NEC ${row.id}`,
        account_number: "OFFSET-NEC",
      });
      inputs.f1099g.push({
        ...inputs.f1099g[0],
        payer_tin: "345678902",
        farm_id: other.farm_id,
        box_7_agriculture: row.other - 1000.50,
        source_document_reference:
          `Synthetic loss offset agriculture ${row.id}`,
        account_number: "OFFSET-AGRI",
      });
    } else {
      const c: any = structuredClone((cBase.inputs.schedule_c as any[])[0]);
      c.proprietor_recipient = row.owner;
      c.business_reference = "Loss-Offset-Business";
      c.line_c_business_name = "Actual reviewed offset consulting";
      c.line_d_ein = "123456792";
      c.line_1_gross_receipts = row.other;
      c.line_32_at_risk = "a";
      c.qbi_no_other_adjustments_confirmed = true;
      c.qbi_w2_wages = 0;
      c.qbi_unadjusted_basis = 0;
      inputs.schedule_c = [c];
    }
    inputs.w2[0].box1_wages = row.wages;
    inputs.w2[0].box3_ss_wages = Math.min(row.wages, 176100);
    inputs.w2[0].box5_medicare_wages = row.wages;
    inputs.w2[0].employee_ssn = owner;
    if (row.wages === 0) inputs.w2 = [];
    const farmProfit = inputs.schedule_f.schedule_fs.reduce(
      (sum: number, f: any) =>
        sum +
        (f.qbi_wotc_filing_review
          ? patronFiledBusinessLines("schedule_f", f, row.many ? 192000 : 2400)
            .profit
          : filedOwnedScheduleF(f)!.profit),
      0,
    );
    if (farmProfit < 0) {
      inputs.general.form461_scope_review = {
        only_schedule_c_and_f_business_items: true,
        other_part_i_lines_zero: true,
        part_ii_adjustments_zero: true,
        post_at_risk_and_passive_limits_confirmed: true,
        line2_schedule_c_amount: inputs.schedule_c
          ? filedOwnedScheduleC(inputs.schedule_c[0])!.profit
          : 0,
        line6_schedule_f_amount: farmProfit,
        source_document_refs: [
          `Synthetic actual finalized C/F and payroll scope review ${row.id}`,
        ],
      };
    }
    return {
      ...base,
      id: `owned-farm-wotc-loss-${row.id}`,
      inputs,
      expectedPdfForms: [
        "f1040",
        "schedule1",
        ...(row.wages === 0 || row.id === "below-spouse-net-loss"
          ? []
          : ["schedule2"]),
        ...(row.wages === 0 ? [] : ["schedule3"]),
        "schedule_f",
        row.otherKind === "f" ? "schedule_f" : "schedule_c",
        ...(row.id.includes("net-loss") || row.wages === 0
          ? []
          : ["schedule_se"]),
        "f5884",
        "f3800",
        ...(row.id.startsWith("phase") || row.id.startsWith("above")
          ? ["form8995a", "form8995a_schedule_c"]
          : ["form8995"]),
        ...(row.wages > 250000
          ? ["form8959", "form8960"]
          : row.id === "below-spouse-net-loss" || row.many
          ? ["form8959"]
          : []),
        "form6251",
      ],
      reviewFocus: [
        "Actual loss retained after full determined wage reduction; owner combined SE and QBI loss/carryforward, current credit and final joins.",
      ],
    };
  });
}
