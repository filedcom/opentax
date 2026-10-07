// Constructed current source contracts. No issuer/authenticated-history claim.
import { passiveK1Inputs, passiveK1Item } from "./eic_passive_k1.fixture.ts";
export function ordinaryPassiveK1(
  gain = 3000,
  owner = "111223333",
  ein = "123456789",
) {
  const reference = `2025 issued ordinary partnership ${ein} ${owner}`,
    id = `ordinary:${ein}:${owner}`;
  const statement = `${reference} box11R ordinary statement`;
  const activity = `${reference} current non-PTP activity statement`,
    participation = `${reference} owned current participation records`;
  return {
    partnership_name: "Owned ordinary activity partnership",
    partnership_ein: ein,
    recipient_tin: owner,
    source_document_reference: reference,
    box14a_se_earnings: 0,
    box20z_qbi: gain,
    qualified_business_income_source: {
      tax_year: 2025,
      issuer_ein: ein,
      recipient_tin: owner,
      issued_k1_reference: reference,
      issued_section199a_statement_reference:
        `${reference} domestic trade section199A statement`,
      business_name: "Owned ordinary partnership trade",
      domestic_non_sstb_trade: true,
      qualified_box1_income: 0,
      qualified_box11_line10_income: gain,
      statement_qbi: gain,
      owner_level_adjustments: 0,
      prior_qbi_loss: 0,
    },
    box11_line10_ordinary: [{
      code: "R",
      gain_loss: gain,
      statement_reference: statement,
      recipient_tin: owner,
      ordinary_character_reviewed: true,
      character_workpaper_reference:
        `${statement} ordinary gain character records`,
      eic_activity_review: {
        classification: "passive",
        activity_statement_reference: activity,
        participation_workpaper_reference: participation,
        partnership_not_publicly_traded_verified: true,
      },
      current_passive_source: {
        issued_ordinary_statement_record: {
          tax_year: 2025,
          issuer_ein: ein,
          recipient_tin: owner,
          issued_k1_reference: reference,
          statement_reference: statement,
          code: "R",
          gain,
          character_workpaper_reference:
            `${statement} ordinary gain character records`,
        },
        tax_year: 2025,
        issuer_ein: ein,
        recipient_tin: owner,
        issued_k1_reference: reference,
        activity_statement_reference: activity,
        participation_workpaper_reference: participation,
        entity_status_record: {
          issuer_ein: ein,
          tax_year: 2025,
          publicly_traded_partnership: false,
          source_document_reference:
            `${reference} issued current partnership status`,
        },
        activities: [{
          activity_id: id,
          activity_name: "Owned ordinary K1 activity",
          income_box: "form4797_line10",
          current_income: gain,
          ownership_acquired_on: "2025-01-01",
          acquisition_document_reference:
            `${reference} current subscription and acquisition`,
          not_grouped_with_prior_activity: true,
          prior_unallowed_operating: 0,
          prior_unallowed_4797_part1: 0,
          prior_unallowed_4797_part2: 0,
        }],
      },
    }],
  };
}
export function passiveLine10Inputs(gain = 3000) {
  const i = passiveK1Inputs("partnership", "box1");
  i.k1_partnership = [ordinaryPassiveK1(gain)];
  return i;
}
export const passiveLine10Cases = [
  {
    id: "ordinary_current_farm",
    inputs: () => passiveLine10Inputs(),
    agi: 5000,
    investment: 11950,
    eic: 384,
    tax: 0,
    allowed: 3000,
    suspended: 2000,
    qbi: 0,
    qbiIncome: 0,
  },
  {
    id: "ordinary_above_limit",
    inputs: () => {
      const i = passiveLine10Inputs();
      i.f1099int[0].box8 = 11951;
      return i;
    },
    agi: 5000,
    investment: 11951,
    eic: 0,
    tax: 0,
    allowed: 3000,
    suspended: 2000,
    qbi: 0,
    qbiIncome: 0,
  },
  {
    id: "ordinary_original_high_wages",
    inputs: () => {
      const i = passiveLine10Inputs();
      i.w2[0].box1_wages = 50000;
      return i;
    },
    agi: 50000,
    investment: 11950,
    eic: 0,
    tax: 3875,
    allowed: 3000,
    suspended: 2000,
    qbi: 0,
    qbiIncome: 0,
  },
  {
    id: "ordinary_positive_net_qbi",
    inputs: () => {
      const i = passiveLine10Inputs(7000);
      i.w2[0].box1_wages = 50000;
      return i;
    },
    agi: 52000,
    investment: 13950,
    eic: 0,
    tax: 4067,
    allowed: 5000,
    suspended: 0,
    qbi: 400,
    qbiIncome: 2000,
  },
  {
    id: "ordinary_joint_same_issuer",
    inputs: () => {
      const i = passiveLine10Inputs();
      i.general.filing_status = "mfj";
      i.general.spouse_first_name = "Casey";
      i.general.spouse_last_name = "Example";
      i.general.spouse_ssn = "444-55-6666";
      i.general.spouse_dob = "1984-01-01";
      Object.assign(i.general, {
        spouse_ssn_valid_for_employment: true,
        spouse_ssn_issued_before_due_date: true,
        spouse_tin_issued_by_due_date: true,
        spouse_can_be_claimed_as_dependent: false,
      });
      i.general.eic_tax_residency_review.spouse_status_record_reference =
        "Reviewed spouse all-year resident status";
      i.w2[0].box1_wages = 10000;
      i.k1_partnership = [
        ordinaryPassiveK1(1500),
        ordinaryPassiveK1(1500, "444556666"),
      ];
      return i;
    },
    agi: 10000,
    investment: 11950,
    eic: 649,
    tax: 0,
    allowed: 3000,
    suspended: 2000,
    qbi: 0,
    qbiIncome: 0,
  },
  {
    id: "ordinary_no_other_pal",
    inputs: () => {
      const i = passiveLine10Inputs();
      delete i.f4835;
      return i;
    },
    agi: 8000,
    investment: 14950,
    eic: 0,
    tax: 0,
    allowed: 0,
    suspended: 0,
    qbi: 0,
    qbiIncome: 3000,
  },
  {
    id: "ordinary_and_box1_statement",
    inputs: () => {
      const i = passiveLine10Inputs();
      i.w2[0].box1_wages = 50000;
      const row = i.k1_partnership[0],
        box = passiveK1Item("partnership", "box1", 3000);
      row.box1_ordinary_business = 3000;
      row.eic_passive_activity_review = box.eic_passive_activity_review;
      row.passive_income_source = box.passive_income_source;
      row.passive_income_source.issued_k1_reference =
        row.source_document_reference;
      row.box20z_qbi = 6000;
      row.qualified_business_income_source.qualified_box1_income = 3000;
      row.qualified_business_income_source.statement_qbi = 6000;
      return i;
    },
    agi: 51000,
    investment: 12950,
    eic: 0,
    tax: 3971,
    allowed: 5000,
    suspended: 0,
    qbi: 200,
    qbiIncome: 1000,
  },
  ...([11950, 11951] as const).map((limit) => ({
    id: `ordinary_combined_${limit}`,
    inputs: () => {
      const i = passiveLine10Inputs();
      i.f1099int[0].box8 = limit - 5;
      i.f1099int[0].box1 = 3;
      i.f1099div = [{
        payerName: "Reviewed dividend issuer",
        payerTin: "876543210",
        source_document_reference: "2025 issued dividend copy",
        account_number: "DIV-2025",
        recipient_tin: "111223333",
        box1a: 2,
        isNominee: false,
        box11: false,
      }];
      return i;
    },
    agi: 5005,
    investment: limit,
    eic: limit === 11950 ? 384 : 0,
    tax: 0,
    allowed: 3000,
    suspended: 2000,
    qbi: 0,
    qbiIncome: 0,
  })),
] as const;
