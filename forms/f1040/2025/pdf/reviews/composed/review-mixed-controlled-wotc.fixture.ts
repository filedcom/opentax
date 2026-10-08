import type { PdfReviewFixture } from "../../review-fixtures.ts";

/** Retained synthetic issued records exercise joins; they do not authenticate issuers. */
export function mixedControlledWotcFixtures(
  farms: readonly PdfReviewFixture[],
  cBase: PdfReviewFixture,
): PdfReviewFixture[] {
  return farms.map((base) => {
    const inputs = structuredClone(base.inputs) as any;
    const primary = inputs.schedule_f.schedule_fs.shift();
    const c = structuredClone((cBase.inputs as any).schedule_c[0]);
    c.business_reference = primary.farm_id;
    c.line_c_business_name = "Primary source machine service";
    c.line_a_principal_business = "Independent machine maintenance services";
    c.line_b_business_code = "811310";
    c.line_d_ein = primary.line_d_ein;
    c.line_1_gross_receipts = primary.line4b_ag_program_payments_taxable +
      primary.line8_other_income;
    c.line_26_wages = primary.line22_labor_hired;
    c.line_22_supplies = primary.line16_feed;
    c.line_32_at_risk = "a";
    c.qbi_w2_wages = primary.qbi_w2_wages;
    c.qbi_wotc_filing_review.owner_ssn =
      primary.qbi_wotc_filing_review.owner_ssn;
    c.qbi_wotc_filing_review.reviewed_other_business_references = [
      inputs.schedule_f.schedule_fs[0].farm_id,
    ];
    c.qbi_wotc_filing_review.employee_w2_records = primary
      .qbi_wotc_filing_review.employee_w2_records.map((record: any) => {
        const {
          agricultural_labor_duties_source_reference,
          more_than_half_each_pay_period_agricultural_labor_confirmed,
          social_security_medicare_wages_confirmed,
          ...copy
        } = record;
        return copy;
      });
    inputs.schedule_c = [c];
    inputs.f1099g.shift();
    inputs.f1099nec[0] = {
      ...inputs.f1099nec[0],
      payer_name: "Machine maintenance services customer",
      for_routing: "schedule_c",
      schedule_c_business_reference: c.business_reference,
      box1_nec: c.line_1_gross_receipts,
      source_document_reference:
        `Synthetic issued primary machine service NEC ${base.id}`,
    };
    delete inputs.f1099nec[0].farm_id;
    c.qbi_wotc_filing_review.issued_nec_source_references = [
      inputs.f1099nec[0].source_document_reference,
    ];
    // The farm node rebuilds farm_sources from actual G/NEC issued public inputs.
    delete inputs.schedule_f.farm_sources;
    for (const e of inputs.f5884.f5884s) {
      if (
        e.direct_employer_review.business_reference !== c.business_reference
      ) continue;
      e.wage_records.forEach((r: any) => {
        r.deduction_location = {
          kind: "schedule_c",
          business_reference: c.business_reference,
        };
      });
    }
    inputs.f5884.controlled_group.members[0].business_name =
      c.line_c_business_name;
    inputs.f5884.controlled_group.group_classification_document_reference =
      "Synthetic mixed service/farm section52 reciprocal management classification";
    inputs.f5884.controlled_group.joint_filed_members_review
      .ownership_and_attribution_source_reference =
        "Synthetic service proprietorship, farm deed, reciprocal management and spouse attribution workpaper";
    if (inputs.general.form461_scope_review) {
      // These are prescribed reporting-year reviewed source joins, not QBI/SE profit inputs.
      inputs.general.form461_scope_review.line2_schedule_c_amount = -11201;
      inputs.general.form461_scope_review.line6_schedule_f_amount = 195201;
    }
    return {
      ...base,
      id: base.id.replace("owned-controlled-farm", "owned-controlled-mixed-cf"),
      inputs,
      expectedPdfForms: (() => {
        const forms = [...base.expectedPdfForms];
        forms[forms.indexOf("schedule_f")] = "schedule_c";
        return forms;
      })(),
      reviewFocus: [
        "Actual primary service Schedule C and spouse cash farm, shared worker identity and distinct employer-specific certification/payroll/W2/SSA records",
        "Common-control group cap once; full filed shares before owner SE/QBI; fractional wage rounding, current-use limitation and negative QBI netting",
        "Retained synthetic issued copies prove source joins only, not external authentication",
      ],
    };
  });
}
