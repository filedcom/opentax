import { independentPatronHealthFixtures } from "./review-independent-patron-health.fixture.ts";
/** Reviewed synthetic cash-plan contribution and complete employee census records. */
export function independentPatronSepFixtures() {
  const bases = independentPatronHealthFixtures();
  return [0, 0, 0, 0, 1, 4, 5].map((baseIndex, index) => {
    const fixture = structuredClone(bases[baseIndex]);
    const i = fixture.inputs as any;
    i.general.taxpayer_dob = "1980-01-02";
    i.general.spouse_dob = "1982-03-04";
    if (index === 3) delete i.form7206;
    const farms = i.schedule_f.schedule_fs;
    const allPlans = farms.map((farm: any, n: number) => {
      const r = i.qbi_patron.independent_farm_reviews[n];
      for (const w of r.employee_w2_records) {
        w.employee_ssn = n ? "777889999" : "222334444";
      }
      const eligible = index === 1;
      const employeeContribution = eligible
        ? r.employee_w2_records.reduce(
          (a: number, w: any) => a + w.box1_wages * .25,
          0,
        )
        : 0;
      farm.line23_pension_plans = employeeContribution;
      if (index === 5) {
        farm.line2_sales_products_raised = [500000, 400000][n] +
          farm.line22_labor_hired -
          farm.line3b_cooperative_distributions_taxable;
      }
      const grossProfit = index === 5
        ? [500000, 400000][n]
        : baseIndex === 4
        ? [230000, 260000][n]
        : baseIndex === 5
        ? [350000, 280000][n]
        : [150000, 180000][n];
      const profit = grossProfit - employeeContribution;
      const net = profit * .9235;
      const halfSE = Math.round(
        (Math.min(net, 176100) * .124 + net * .029) / 2,
      );
      const rate = (index === 2 || index === 3) && n === 1 ? .20 : .25;
      const contribution = Math.round(
        Math.min((profit - halfSE) * rate / (1 + rate), 70000) * 100,
      ) / 100;
      const ssn = n ? "444556666" : "111223333",
        id = index === 6 ? "SEP-001" : `SEP-${n}`;
      const payment = (participant: string, amount: number, ref: string) => ({
        custodian_name: "Reviewed SEP Custodian",
        custodian_ein: "987654321",
        participant_ssn: participant,
        payer_ssn: ssn,
        plan_identifier: id,
        tax_year: 2025,
        traditional_sep_ira_confirmed: true,
        amount,
        received_on: "2026-03-10",
        issued_record_reference: `statement-${n}-${ref}`,
        payment_reference: `transfer-${n}-${ref}`,
      });
      return {
        business_reference: farm.farm_id,
        recipient: n ? "S" : "T",
        employer_ein: farm.line_d_ein,
        plan_identifier: id,
        adoption_record_reference: `adoption-${id}`,
        adopted_on: "2025-01-15",
        contribution_deadline: "2026-04-15",
        annual_allocation_rate: rate,
        eligibility: {
          minimum_age: 21,
          minimum_prior_service_years: 3,
          minimum_compensation: 750,
        },
        owner_date_of_birth: n ? i.general.spouse_dob : i.general.taxpayer_dob,
        owner_service_years: [2022, 2023, 2024],
        owner_participant_record_reference: `owner-${id}`,
        owner_information_delivery_reference: `owner-info-${id}`,
        owner_contribution: payment(ssn, contribution, `owner-${id}`),
        employee_census: r.employee_w2_records.map((w: any, e: number) => ({
          employee_reference: w.employee_reference,
          payroll_source_document_reference: w.source_document_reference,
          employee_ssn: n ? "777889999" : "222334444",
          date_of_birth: "1990-06-05",
          employment_source_reference: `employment-${id}-${e}`,
          service_years: eligible ? [2022, 2023, 2024] : [],
          compensation: w.box1_wages,
          ...(eligible
            ? {
              participant_information_delivery_reference:
                `employee-info-${id}-${e}`,
              contribution: payment(
                n ? "777889999" : "222334444",
                w.box1_wages * .25,
                `employee-${id}-${e}`,
              ),
            }
            : {}),
        })),
        complete_employee_census_record_reference: `complete-census-${id}`,
        all_employee_compensation_in_retained_box1_records_confirmed: true,
        all_common_law_and_leased_workers_included_confirmed: true,
        no_sarsep_elective_deferrals_roth_or_excess_carryover_confirmed: true,
      };
    });
    const plans = index === 2 ? allPlans.slice(1) : allPlans;
    i.owned_sep_retirement = {
      owned_sep_plans: {
        plans,
        business_plan_reviews: farms.map((farm: any, n: number) => ({
          business_reference: farm.farm_id,
          recipient: n ? "S" : "T",
          plan_identifiers: plans.filter((p: any) =>
            p.business_reference === farm.farm_id
          ).map((p: any) => p.plan_identifier),
          review_record_reference: `plans-reviewed-${n}`,
          no_other_defined_contribution_or_defined_benefit_plans_confirmed:
            true,
        })),
        employer_relationship_review: {
          assessed_business_references: farms.map((farm: any) => farm.farm_id),
          ownership_and_family_attribution_record_reference:
            "separate-employer-ownership-and-attribution-review",
          no_controlled_group_or_affiliated_service_group_confirmed: true,
          spousal_attribution_exception_reviews: farms.map((
            farm: any,
            n: number,
          ) => ({
            business_reference: farm.farm_id,
            nonowner_spouse_ssn: n ? "111223333" : "444556666",
            ownership_record_reference: `independent-ownership-${n}`,
            no_direct_interest_at_any_time_confirmed: true,
            roles_and_management_record_reference: `independent-roles-${n}`,
            no_employee_director_fiduciary_or_management_role_at_any_time_confirmed:
              true,
            income_classification_record_reference:
              `section61-and-patron-receipts-classification-${n}`,
            section61_gross_income: farm.line2_sales_products_raised +
              farm.line3b_cooperative_distributions_taxable,
            royalties_rents_dividends_interest_annuities_income: 0,
            disposal_rights_record_reference:
              `independent-disposal-rights-${n}`,
            no_disposal_restriction_in_favor_of_spouse_or_children_under_21_confirmed:
              true,
          })),
        },
      },
    };
    return { ...fixture, id: `independent-patron-sep-${index}` };
  });
}
