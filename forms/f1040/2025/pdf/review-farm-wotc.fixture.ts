import type { PdfReviewFixture } from "./review-fixtures.ts";
import { inputSchema as wotcSchema } from "../../nodes/inputs/f5884/index.ts";
import { ownedFarmRecord } from "./review-schedule-se-farm-owner.fixture.ts";

/** Synthetic issued-copy records exercise source joins, not external authentication. */
export function farmWotcReviewFixtures(
  base: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture[] {
  const credit = wotcSchema.parse(base.inputs.f5884);
  return [
    {
      id: "single-zero-use-below",
      joint: false,
      owner: "T",
      income: 6000.50,
      wages: 0,
      employees: 1,
    },
    {
      id: "single-below",
      joint: false,
      owner: "T",
      income: 60000.50,
      wages: 150000.37,
      employees: 1,
    },
    {
      id: "primary-below",
      joint: true,
      owner: "T",
      income: 150000.50,
      wages: 220000.37,
      employees: 1,
    },
    {
      id: "spouse-phase",
      joint: true,
      owner: "S",
      income: 350000.50,
      wages: 130000.37,
      employees: 1,
    },
    {
      id: "primary-limited",
      joint: true,
      owner: "T",
      income: 600000.50,
      wages: 300000,
      employees: 80,
    },
    {
      id: "ordinary-spouse-phase",
      joint: true,
      owner: "T",
      income: 180000.50,
      wages: 150000.37,
      employees: 1,
      other: 190000.50,
    },
    {
      id: "three-farms-phase",
      joint: true,
      owner: "T",
      income: 180000.50,
      wages: 150000.37,
      employees: 1,
      other: 190000.50,
      third: 1000.50,
    },
  ].map((row) => {
    const owner = row.owner === "S" ? "444556666" : "111223333";
    const customIncome = (total: number) =>
      Math.min(1000.50, Math.floor(total / 10));
    const gross = row.employees === 1 ? 6000.49 : 6000;
    const workers = Array.from({ length: row.employees }, (_, i) => ({
      ...credit.f5884s[0],
      employee_reference: `Farm-employee-${i}`,
      direct_employer_review: {
        employer_ein: "123456791",
        proprietor_recipient: row.owner,
        proprietor_ssn: owner,
        business_reference: "WOTC-Farm",
        certification_employer_and_payroll_match_confirmed: true,
        source_review_reference:
          `Synthetic farm employer ownership/payroll ${i}`,
      },
      certification: {
        ...credit.f5884s[0].certification,
        swa_certification_reference: `Synthetic farm SWA-${i}`,
      },
      wage_records: credit.f5884s[0].wage_records.map((r) => ({
        ...r,
        payroll_record_reference: `Synthetic farm payroll-${i}`,
        qualified_wages: gross,
        deduction_location: { kind: "schedule_f", farm_id: "WOTC-Farm" },
      })),
    }));
    const farm: any = {
      ...ownedFarmRecord(0, row.owner as "T" | "S"),
      farm_id: "WOTC-Farm",
      line8_other_income: customIncome(row.income),
      line4a_ag_program_payments: row.income - customIncome(row.income),
      line4b_ag_program_payments_taxable: row.income - customIncome(row.income),
      line22_labor_hired: row.employees * gross,
      qbi_w2_wages: row.employees * (gross - 2400),
      qbi_unadjusted_basis: 0,
      qbi_wotc_filing_review: {
        owner_ssn: owner,
        employee_w2_records: workers.map((w) => ({
          employee_reference: w.employee_reference,
          employee_ssn: String(
            555000000 + Number(w.employee_reference.split("-").at(-1)),
          ),
          employer_ein: "123456791",
          swa_certification_reference:
            w.certification.swa_certification_reference,
          payroll_record_references: w.wage_records.map((r) =>
            r.payroll_record_reference
          ),
          source_document_reference:
            `Synthetic farm issued W2 ${w.employee_reference}`,
          box1_wages: gross,
          box5_wages: gross,
          box3_social_security_wages: gross,
          agricultural_labor_duties_source_reference:
            `Synthetic grain cultivation agricultural duty/time record ${w.employee_reference}`,
          more_than_half_each_pay_period_agricultural_labor_confirmed: true,
          social_security_medicare_wages_confirmed: true,
          ssa_filing_record_reference:
            `Synthetic farm SSA ${w.employee_reference}`,
          filed_within_60_days_of_due_date_confirmed: true,
        })),
        all_business_payroll_included_confirmed: true,
        ...(row.other
          ? {
            no_aggregation_confirmed: true,
            reviewed_other_business_references: row.third
              ? ["Ordinary-Spouse-Farm", "Ordinary-Primary-Farm"]
              : ["Ordinary-Spouse-Farm"],
          }
          : { no_other_business_or_aggregation_confirmed: true }),
        no_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed: true,
        no_qualified_property_confirmed: true,
        review_reference: "Synthetic full farm 280C/QBI review",
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
        principal_income_from_farming_confirmed: true,
        farming_activity_source_reference:
          "Synthetic owned grain production and principal farm income ledger",
        farm_ownership_source_reference:
          "Synthetic sole proprietor farm ownership record",
        no_joint_venture_or_partnership_confirmed: true,
        no_other_qualified_group_employee_payroll_confirmed: true,
      },
    };
    const farms = [farm];
    if (row.other) {
      farms.push({
        ...ownedFarmRecord(0, "S"),
        farm_id: "Ordinary-Spouse-Farm",
        line8_other_income: customIncome(row.other),
        line4a_ag_program_payments: row.other - customIncome(row.other),
        line4b_ag_program_payments_taxable: row.other - customIncome(row.other),
        line_d_ein: "123456792",
        qbi_unadjusted_basis: 0,
        qbi_w2_wages: 0,
      });
    }
    if (row.third) {
      farms.push({
        ...ownedFarmRecord(0, "T"),
        farm_id: "Ordinary-Primary-Farm",
        line_d_ein: "123456793",
        line8_other_income: customIncome(row.third),
        line4a_ag_program_payments: row.third - customIncome(row.third),
        line4b_ag_program_payments_taxable: row.third - customIncome(row.third),
        qbi_unadjusted_basis: 0,
        qbi_w2_wages: 0,
      });
    }
    const issued = farms.map((f, i) => ({
      payer_name: i
        ? `Secondary Custom Machine Work Customer ${i}`
        : "Secondary Custom Machine Work Customer",
      payer_tin: String(234567891 + i),
      recipient_ssn: f.proprietor_recipient === "S" ? "444556666" : "111223333",
      account_number: `FARM-${i}`,
      source_document_reference: `Synthetic issued farm 1099NEC ${row.id}-${i}`,
      box1_nec: customIncome(
        i === 2 ? row.third! : i ? row.other! : row.income,
      ),
      for_routing: "schedule_f",
      farm_id: f.farm_id,
    }));
    const agriculture = farms.map((farm, i) => ({
      payer_name: `Synthetic Agricultural Program Issuer ${i}`,
      payer_tin: String(345678901 + i),
      recipient_tin: farm.proprietor_recipient === "S"
        ? "444556666"
        : "111223333",
      account_number: `AGRI-${i}`,
      source_document_reference:
        `Synthetic issued agricultural program 1099G ${row.id}-${i}`,
      farm_id: farm.farm_id,
      box_7_agriculture: farm.line4a_ag_program_payments,
      box_7_payment_kind: "agricultural_program",
      box_7_review_reference:
        `Synthetic taxable agricultural program/owned grain activity review ${row.id}-${i}`,
    }));
    const wage: any = (joint.inputs.w2 as any[])[0];
    const high = row.wages > 200000;
    return {
      id: `owned-farm-wotc-${row.id}`,
      filer: row.joint ? joint.filer : base.filer,
      inputs: {
        general: {
          ...(row.joint ? joint.inputs.general : base.inputs.general) as any,
          qbi_no_prior_loss_or_suspended_loss_confirmed: true,
          qbi_not_patron_of_specified_cooperative_confirmed: true,
        },
        ...(row.wages > 0
          ? {
            w2: [{
              ...wage,
              employer_ein: "54-3216789",
              employer_name: "External Example Employer",
              employee_ssn: owner,
              source_document_reference:
                `Synthetic farmer outside W2 ${row.id}`,
              box1_wages: row.wages,
              box2_fed_withheld: 60000,
              box3_ss_wages: Math.min(row.wages, 176100),
              box4_ss_withheld:
                Math.round(Math.min(row.wages, 176100) * .062 * 100) / 100,
              box5_medicare_wages: row.wages,
              box6_medicare_withheld: Math.round(
                (row.wages * .0145 + (high ? (row.wages - 200000) * .009 : 0)) *
                  100,
              ) / 100,
            }],
          }
          : {}),
        schedule_f: { schedule_fs: farms },
        f1099nec: issued,
        f1099g: agriculture,
        f5884: { ...credit, f5884s: workers },
      },
      expectedPdfForms: [
        "f1040",
        "schedule1",
        "schedule2",
        ...(row.id.includes("zero-use") ? [] : ["schedule3"]),
        ...farms.map(() => "schedule_f"),
        ...[...new Set(farms.map((f) => f.proprietor_recipient))].map(() =>
          "schedule_se"
        ),
        "f5884",
        "f3800",
        row.id.endsWith("below") ? "form8995" : "form8995a",
        ...(row.id.includes("zero-use") ? [] : ["form8959", "form8960"]),
        "form6251",
      ],
      reviewFocus: [
        "Actual sole-proprietor farm/issued income and certified employer payroll source joins",
        "Full determined wage reduction before owner-specific regular SE and QBI regardless current credit use",
        "Raw cents retained; finalized farm leaf/subtotal and below/phase/above QBI native/PDF joins; synthetic source review is not authentication",
      ],
    };
  });
}
