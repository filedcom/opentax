import type { PdfReviewFixture } from "../../../review-fixtures.ts";
import { patronFiledBusinessLines } from "../../../../../nodes/inputs/deductions/business/qbi_patron/calculation.ts";

/** Reviewed synthetic issued copies exercise actual joins, not authentication. */
export function twoFarmWotcFixtures(
  positive: readonly PdfReviewFixture[],
): PdfReviewFixture[] {
  return [
    { id: "below", income: [40000.50, 60000.50], wages: [180000.37, 50000.49] },
    { id: "phase", income: [180000.50, 190000.50], wages: [150000.37, 0] },
    {
      id: "above-limited",
      income: [600000.50, 600000.50],
      wages: [300000.37, 100000.49],
      many: true,
    },
    {
      id: "phase-loss",
      income: [20000.50, 200000.50],
      wages: [300000.37, 0],
      feed: 26401.50,
    },
  ].map((row) => {
    const base = positive.find((f) =>
      f.id ===
        (row.many
          ? "owned-farm-wotc-primary-limited"
          : "owned-farm-wotc-primary-below")
    )!;
    const inputs: any = structuredClone(base.inputs);
    const seedFarm = inputs.schedule_f.schedule_fs[0],
      seedWorkers = inputs.f5884.f5884s;
    const farms: any[] = [],
      workers: any[] = [],
      necs: any[] = [],
      agriculture: any[] = [];
    for (const [i, recipient] of ["T", "S"].entries()) {
      const owner = i ? "444556666" : "111223333",
        ein = i ? "123456792" : "123456791",
        ref = i ? "Spouse-WOTC-Farm" : "Primary-WOTC-Farm";
      const farm = structuredClone(seedFarm);
      farm.farm_id = ref;
      farm.line_c_farm_name = i
        ? "Spouse source grain farm"
        : "Primary source grain farm";
      farm.proprietor_recipient = recipient;
      farm.line_d_ein = ein;
      farm.line4a_ag_program_payments =
        farm
          .line4b_ag_program_payments_taxable =
          row.income[i] - 1000.50;
      farm.line8_other_income = 1000.50;
      farm.line16_feed = i ? 0 : row.feed ?? 0;
      const review = farm.qbi_wotc_filing_review;
      review.owner_ssn = owner;
      delete review.no_other_business_or_aggregation_confirmed;
      review.no_aggregation_confirmed = true;
      review.reviewed_other_business_references = [
        i ? "Primary-WOTC-Farm" : "Spouse-WOTC-Farm",
      ];
      review.farm_ownership_source_reference =
        `Synthetic actual ${recipient} separate farm proprietorship ${row.id}`;
      review.review_reference =
        `Synthetic full agricultural payroll/280C/QBI ${recipient} ${row.id}`;
      const ownWorkers = structuredClone(seedWorkers);
      ownWorkers.forEach((w: any, n: number) => {
        w.employee_reference = `${recipient}-Farm-employee-${n}`;
        w.direct_employer_review = {
          ...w.direct_employer_review,
          employer_ein: ein,
          proprietor_recipient: recipient,
          proprietor_ssn: owner,
          business_reference: ref,
          source_review_reference:
            `Synthetic ${recipient} actual farm employer/payroll ${n}`,
        };
        w.certification.swa_certification_reference =
          `Synthetic ${recipient} farm SWA-${n}`;
        w.wage_records.forEach((r: any) => {
          r.payroll_record_reference =
            `Synthetic ${recipient} farm payroll-${n}`;
          r.deduction_location = { kind: "schedule_f", farm_id: ref };
        });
      });
      review.employee_w2_records = review.employee_w2_records.map((
        record: any,
        n: number,
      ) => ({
        ...record,
        employee_reference: ownWorkers[n].employee_reference,
        employee_ssn: String(555000000 + i * 1000 + n),
        employer_ein: ein,
        swa_certification_reference:
          ownWorkers[n].certification.swa_certification_reference,
        payroll_record_references: ownWorkers[n].wage_records.map((r: any) =>
          r.payroll_record_reference
        ),
        source_document_reference:
          `Synthetic issued ${recipient} farm employee W2-${n}`,
        ssa_filing_record_reference:
          `Synthetic actual ${recipient} farm SSA-${n}`,
        agricultural_labor_duties_source_reference:
          `Synthetic ${recipient} grain cultivation pay-period record-${n}`,
      }));
      farms.push(farm);
      workers.push(...ownWorkers);
      necs.push({
        ...inputs.f1099nec[0],
        recipient_ssn: owner,
        farm_id: ref,
        payer_tin: String(234567891 + i),
        account_number: `${recipient}-CUSTOM`,
        source_document_reference:
          `Synthetic issued ${recipient} secondary custom-work NEC ${row.id}`,
        box1_nec: 1000.50,
      });
      agriculture.push({
        ...inputs.f1099g[0],
        recipient_tin: owner,
        farm_id: ref,
        payer_tin: String(345678901 + i),
        account_number: `${recipient}-AGRI`,
        source_document_reference:
          `Synthetic issued ${recipient} owned agriculture G ${row.id}`,
        box_7_agriculture: row.income[i] - 1000.50,
      });
    }
    inputs.schedule_f.schedule_fs = farms;
    inputs.f5884.f5884s = workers;
    inputs.f1099nec = necs;
    inputs.f1099g = agriculture;
    inputs.f5884.ordinary_joint_employer_control_review = {
      businesses: farms.map((f) => ({
        employer_ein: f.line_d_ein,
        business_reference: f.farm_id,
        proprietor_ssn: f.qbi_wotc_filing_review.owner_ssn,
        other_spouse_no_direct_interest_confirmed: true,
        other_spouse_no_director_fiduciary_employee_or_management_confirmed:
          true,
        passive_gross_income_not_more_than_half_confirmed: true,
        no_disposition_restrictions_favoring_spouse_or_minor_children_confirmed:
          true,
        ownership_and_income_source_reference:
          `Synthetic owned ${f.farm_id} ownership, management, gross-income and disposition records ${row.id}`,
      })),
      no_other_common_control_ownership_or_options_confirmed: true,
      reviewed_by: "Synthetic reviewer",
      reviewed_on: "2026-03-01",
      review_reference:
        `Synthetic section52 both-farm spouse attribution exception review ${row.id}`,
    };
    const wage = inputs.w2[0];
    inputs.w2 = row.wages.flatMap((amount, i) =>
      amount
        ? [{
          ...wage,
          employee_ssn: i ? "444556666" : "111223333",
          employer_ein: String(234567895 + i),
          employer_name: `External ${i ? "spouse" : "primary"} wage employer`,
          source_document_reference: `Synthetic actual issued ${
            i ? "spouse" : "primary"
          } external W2 ${row.id}`,
          box1_wages: amount,
          box3_ss_wages: Math.min(amount, 176100),
          box4_ss_withheld: Math.round(Math.min(amount, 176100) * .062 * 100) /
            100,
          box5_medicare_wages: amount,
          box6_medicare_withheld: Math.round(
            (amount * .0145 + Math.max(0, amount - 200000) * .009) * 100,
          ) / 100,
        }]
        : []
    );
    const farmProfit = farms.reduce(
      (s, f) =>
        s +
        patronFiledBusinessLines("schedule_f", f, row.many ? 192000 : 2400)
          .profit,
      0,
    );
    if (row.feed) {
      inputs.general.form461_scope_review = {
        only_schedule_c_and_f_business_items: true,
        other_part_i_lines_zero: true,
        part_ii_adjustments_zero: true,
        post_at_risk_and_passive_limits_confirmed: true,
        line2_schedule_c_amount: 0,
        line6_schedule_f_amount: farmProfit,
        source_document_refs: [
          `Synthetic finalized two-farm source/limit review ${row.id}`,
        ],
      };
    }
    return {
      ...base,
      id: `owned-two-farm-wotc-${row.id}`,
      inputs,
      expectedPdfForms: [
        "f1040",
        "schedule1",
        "schedule2",
        "schedule3",
        "schedule_f",
        "schedule_f",
        "schedule_se",
        ...(row.feed ? [] : ["schedule_se"]),
        "f5884",
        "f3800",
        "form6251",
        ...(row.id === "below" ? ["form8995"] : ["form8995a"]),
        ...(row.feed ? ["form8995a_schedule_c"] : []),
        "form8959",
        "form8960",
      ],
      reviewFocus: [
        "Actual independent primary/spouse farm employers: attribution exceptions, issued agriculture/custom-work, per-employer payroll/SWA/W2/full reductions, separate owner SE wage caps and joint credit/QBI/loss/current-use joins.",
      ],
    };
  });
}
