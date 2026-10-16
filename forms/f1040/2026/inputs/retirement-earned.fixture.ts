import { eicGraphFixture2026 } from "../nodes/eitc.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { disabilityPension2026 } from "./retirement-disability.fixture.ts";
import { syntheticMoving2026 } from "./moving.fixture.ts";
import { businessCareFixture2026 } from "./business-care.fixture.ts";
import { monthlyCareFixture2026 } from "./dependent-care-earned.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

export function disabilityMovingGraph2026() {
  const b = disabilityWageGraph2026(50000);
  const {
    filing_status: _status,
    taxpayer_ssn: _tin,
    spouse_ssn: _spouse,
    w2_moving_sources_2026: _w2,
    ...claim
  } = syntheticMoving2026();
  claim.moves[0].reimbursements[0].amount = 3000;
  return {
    ...b,
    f3903: JSON.parse(
      JSON.stringify(claim)
        .replaceAll("111223333", b.general.taxpayer_ssn)
        .replaceAll("issued-w2-1", b.w2s![0].source_document_reference!),
    ),
    w2s: [{
      ...b.w2s![0],
      box12_entries: [{ code: "P" as const, amount: 3000 }],
    }],
  };
}

export function disabilityBusinessCareGraph2026() {
  const b = businessCareFixture2026(10000, 10000);
  const s = disabilityForFiler2026(b.general.taxpayer_ssn);
  const { no_retirement_disability_inmate_or_workfare_wages: _old, ...eitc } =
    b.eitc;
  b.form2441.claim.retirement_inventory_reference = s.claim.record_reference;
  return {
    ...b,
    general: { ...b.general, taxpayer_dob: s.taxpayer_dob },
    f1099r: { claim: s.claim },
    eitc: {
      ...eitc,
      retirement_inventory_reference: s.claim.record_reference,
      no_inmate_or_workfare_wages: true as const,
    },
  };
}

export function jointDisabilityCareGraph2026() {
  const joint = monthlyCareFixture2026();
  const s = disabilityForFiler2026(
    joint.general.taxpayer_ssn,
    joint.general.taxpayer_dob,
  );
  s.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = joint.general.spouse_ssn;
  s.spouse_dob = "1971-06-15";
  s.claim.copies[0].recipient = "spouse";
  s.claim.copies[0].recipient_tin = s.spouse_ssn;
  const d = s.claim.reviews[0].disability_income!;
  if (d.kind !== "employer_disability_pension") throw Error("fixture");
  d.owner_tin = s.spouse_ssn;
  delete joint.form2441.claim.ordinary_w2_earnings_only;
  joint.form2441.claim.retirement_inventory_reference =
    s.claim.record_reference;
  joint.form2441.claim.earned_income = {
    method: "annual_retirement",
    no_student_or_disability_deemed_income: true,
  };
  // Keep this case about annual owner allocation; monthly floors have a separate fixture.
  joint.w2s[0].box10_dep_care = 0;
  return {
    ...joint,
    general: { ...joint.general, spouse_dob: s.spouse_dob },
    f1099r: { claim: s.claim },
  };
}

export function disabilityForFiler2026(tin: string, dob = "1971-06-15") {
  const s = disabilityPension2026();
  s.taxpayer_ssn = tin;
  s.taxpayer_dob = dob;
  s.claim.copies[0].recipient_tin = tin;
  s.claim.copies[0].box4_federal_withheld = 0;
  const d = s.claim.reviews[0].disability_income!;
  if (d.kind !== "employer_disability_pension") throw Error("fixture");
  d.owner_tin = tin;
  return s;
}
export function disabilityWageGraph2026(wages = 10000, count = 1) {
  const b = eicGraphFixture2026(wages, count),
    s = disabilityForFiler2026(b.general.taxpayer_ssn);
  const { no_retirement_disability_inmate_or_workfare_wages: _old, ...review } =
    b.eitc;
  return {
    ...b,
    general: { ...b.general, taxpayer_dob: s.taxpayer_dob },
    f1099r: { claim: s.claim },
    eitc: {
      ...review,
      retirement_inventory_reference: s.claim.record_reference,
      no_inmate_or_workfare_wages: true as const,
    },
  };
}
export function disabilityCareGraph2026(
  wages = 50000,
  benefits = 0,
  expenses = 6000,
) {
  const b = disabilityWageGraph2026(wages),
    c = dependentCareFixture2026(wages || 1, benefits, expenses);
  delete c.form2441.claim.ordinary_w2_earnings_only;
  c.form2441.claim.retirement_inventory_reference =
    b.f1099r.claim.record_reference;
  c.form2441.claim.earned_income = {
    method: "annual_retirement",
    no_student_or_disability_deemed_income: true,
  };
  if (wages === 0) {
    Object.assign(c.w2s[0], {
      box1_wages: 0,
      box2_fed_withheld: 0,
      box3_ss_wages: 0,
      box4_ss_withheld: 0,
      box5_medicare_wages: 0,
      box6_medicare_withheld: 0,
    });
  }
  return {
    ...b,
    general: { ...b.general, dependents: c.general.dependents },
    w2s: c.w2s,
    form2441: c.form2441,
  };
}
export function monthlyDisabilityCareGraph2026() {
  const b = disabilityCareGraph2026(0, 2000, 3000);
  const d = b.f1099r.claim.reviews[0].disability_income!;
  if (d.kind !== "employer_disability_pension") throw Error("fixture");
  d.payments = [
    {
      record_reference: "may",
      payment_date: "2026-05-31",
      gross: 100,
      taxable: 100,
    },
    {
      record_reference: "june-wages",
      payment_date: "2026-06-15",
      gross: 200,
      taxable: 200,
    },
    {
      record_reference: "june-pension",
      payment_date: "2026-06-16",
      gross: 500,
      taxable: 500,
    },
  ];
  b.f1099r.claim.copies[0].box1_gross_distribution = 800;
  b.f1099r.claim.copies[0].box2a_taxable_amount = 800;
  b.form2441.claim.earned_income = {
    method: "monthly",
    taxpayer: {
      record_reference: "monthly-care-wages",
      school_meets_full_time_student_definition: true,
      enrollment_record_reference: "five-month-enrollment",
      months: Array.from(
        { length: 12 },
        (_, i) => ({
          month: i + 1,
          w2_wages: 0,
          nontaxable_combat_pay: 0,
          taxable_care_benefits: i === 5 ? 550 : 0,
          full_time_student: i < 5,
          incapable_of_self_care: false,
        }),
      ),
    },
    both_eligible_month_choices: [],
  };
  return b;
}
