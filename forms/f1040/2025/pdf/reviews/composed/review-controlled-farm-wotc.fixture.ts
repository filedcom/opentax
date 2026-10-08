import type { PdfReviewFixture } from "../../review-fixtures.ts";
import {
  calculateForm5884,
  inputSchema,
} from "../../../../nodes/inputs/f5884/index.ts";
import { patronFiledBusinessLines } from "../../../../nodes/inputs/qbi_patron/calculation.ts";

/** Actual retained synthetic source records prove joins, not issuer authentication. */
export function controlledFarmWotcFixtures(
  independent: readonly PdfReviewFixture[],
): PdfReviewFixture[] {
  return independent.map((base) => {
    const inputs = structuredClone(base.inputs) as any;
    const farms = inputs.schedule_f.schedule_fs;
    const fractional = base.id.endsWith("phase");
    const many = base.id.endsWith("above-limited");
    delete inputs.f5884.ordinary_joint_employer_control_review;
    inputs.f5884.controlled_group = {
      kind: "businesses_under_common_control",
      group_classification_document_reference:
        "Synthetic farm section52 reciprocal spousal management classification",
      taxpayer_member_ein: farms[0].line_d_ein,
      members: farms.map((f: any) => ({
        ein: f.line_d_ein,
        business_name: f.line_c_farm_name,
      })),
      joint_filed_members_review: {
        members: farms.map((f: any) => ({
          ein: f.line_d_ein,
          proprietor_recipient: f.proprietor_recipient,
          proprietor_ssn: f.qbi_wotc_filing_review.owner_ssn,
          business_reference: f.farm_id,
          direct_owner_percent: 100,
          other_spouse_management_participation_confirmed: true,
          spousal_ownership_attribution_applies_confirmed: true,
        })),
        ownership_and_attribution_source_reference:
          "Synthetic two farm deeds and reciprocal management/attribution workpaper",
        common_control_confirmed: true,
        complete_group_members_and_payroll_confirmed: true,
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
      },
    };
    const oldCount = inputs.f5884.f5884s.length / 2;
    const workers: any[] = [];
    farms.forEach((f: any, employer: number) => {
      const oldCopies = f.qbi_wotc_filing_review.employee_w2_records;
      const oldWorkers = inputs.f5884.f5884s.slice(
        employer * oldCount,
        (employer + 1) * oldCount,
      );
      const count = many ? oldCount * 2 : oldCount;
      const copies: any[] = [];
      for (let n = 0; n < count; n++) {
        const e = structuredClone(oldWorkers[n % oldCount]);
        const copy = structuredClone(oldCopies[n % oldCount]);
        e.employer_ein = f.line_d_ein;
        e.employee_reference = `Farm-shared-person-${n}`;
        e.group_employee_identity_review = {
          employee_identity_source_reference:
            `Synthetic shared agricultural worker identity-${n}`,
          same_employee_across_members_confirmed: true,
          group_first_workday_on: e.hired_on,
          complete_group_hours_and_wages_confirmed: true,
        };
        e.certification.swa_certification_reference =
          `Synthetic ${employer} controlled farm SWA-${n}`;
        e.wage_records.forEach((r: any) => {
          r.payroll_record_reference =
            `Synthetic ${employer} controlled farm payroll-${n}`;
          if (fractional) r.qualified_wages = employer ? 3000.52 : 4000.49;
        });
        copy.employee_reference = e.employee_reference;
        copy.employee_ssn = String(555000000 + n);
        copy.swa_certification_reference =
          e.certification.swa_certification_reference;
        copy.payroll_record_references = e.wage_records.map((r: any) =>
          r.payroll_record_reference
        );
        copy.source_document_reference =
          `Synthetic issued ${employer} controlled farm W2-${n}`;
        copy.ssa_filing_record_reference =
          `Synthetic ${employer} controlled farm SSA-${n}`;
        copy.box1_wages = copy.box3_social_security_wages = copy.box5_wages = e
          .wage_records.reduce((s: number, r: any) => s + r.qualified_wages, 0);
        workers.push(e);
        copies.push(copy);
      }
      f.qbi_wotc_filing_review.employee_w2_records = copies;
      f.line22_labor_hired = copies.reduce(
        (s: number, c: any) => s + c.box1_wages,
        0,
      );
      if (many) {
        f.line4a_ag_program_payments =
          f.line4b_ag_program_payments_taxable =
            1199000;
        inputs.f1099g[employer].box_7_agriculture = 1199000;
      }
    });
    inputs.f5884.f5884s = workers;
    const credit = calculateForm5884(inputSchema.parse(inputs.f5884));
    farms.forEach((f: any) => {
      const reduction = credit.wageDeductionAllocations.find((a) =>
        a.location.kind === "schedule_f" && a.location.farm_id === f.farm_id
      )!.credit_amount;
      f.qbi_w2_wages = f.line22_labor_hired - reduction;
    });
    if (inputs.general.form461_scope_review) {
      inputs.general.form461_scope_review.line6_schedule_f_amount = farms
        .reduce(
          (s: number, f: any) =>
            s +
            patronFiledBusinessLines(
              "schedule_f",
              f,
              credit.wageDeductionAllocations.find((a) =>
                a.location.kind === "schedule_f" &&
                a.location.farm_id === f.farm_id
              )!.credit_amount,
            ).profit,
          0,
        );
    }
    return {
      ...base,
      id: base.id.replace("owned-two-farm", "owned-controlled-farm"),
      inputs,
      reviewFocus: [
        "Actual common-control farm owners from reciprocal management and spousal attribution; shared worker person with distinct SWA/payroll/W2/SSA employer sources",
        "Group cap once, proportionate filed shares/full farm reduction before separate ownerSE/QBI, actual full/limited joint current tax use and ordinary loss netting",
        "Synthetic retained source joins/replay only, no external authentication or accepted carryover claim",
      ],
    };
  });
}
