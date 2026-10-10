import {
  type LtcLedger,
  LtcOwner,
  LtcPeriodMethod,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/ltc.ts";
import { paymentPackets } from "../../../income/investments/form6252/form6252_payments.fixture.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

type Insured = LtcLedger["insureds"][number];
const primary = { ssn: "123456789", name: "Alex Taxpayer" };
const elder = { ssn: "222334444", name: "Dana Elder" };
const other = { ssn: "333445555", name: "Casey Example" };
export function ltcSource(
  id: string,
  policyholder = primary,
  gross = 18000,
  chronic = 0,
  terminal = 0,
) {
  return {
    source_reference: id,
    payer_ein: "120000001",
    contract_reference: `${id} policy`,
    policyholder,
    insured_ssn: elder.ssn,
    gross_ltc_per_diem: gross,
    accelerated_chronic_per_diem: chronic,
    accelerated_terminal_per_diem: terminal,
    qualified_contract_review_reference: `${id} qualification`,
    period_allocation_review_reference: `${id} complete benefit-period ledger`,
    form1099ltc_box1: gross,
    form1099ltc_box2: chronic + terminal,
    per_diem_box3_confirmed: true as const,
    only_per_diem_payments_reported_confirmed: true as const,
    all_ltc_payments_from_qualified_contracts_confirmed: true as const,
    no_business_relationship_exclusion_limit_confirmed: true as const,
  };
}
export function ltcInsured(): Insured {
  return {
    insured: {
      ...elder,
      name_control: "ELDE",
      identity_source_reference: "synthetic insured identity",
    },
    filing_policyholders: [{ owner: LtcOwner.Taxpayer, ssn: primary.ssn }],
    period: {
      start_date: "2025-06-01",
      end_date: "2025-06-30",
      method: LtcPeriodMethod.EqualRate,
      source_reference: "synthetic complete benefit period",
      all_contracts_and_rates_unchanged_for_period_confirmed: true,
      all_payees_agreed_equal_rate_period: true,
    },
    chronic_illness: {
      certification_date: "2025-01-01",
      practitioner_source_reference:
        "synthetic annual practitioner certification",
      annual_chronic_eligibility_confirmed: true,
      prescribed_care_plan_reference: "synthetic prescribed care plan",
    },
    all_payees_contracts_and_periods_review_reference:
      "synthetic complete recipient and contract review",
    no_other_ltc_periods_confirmed: true,
    sources: [ltcSource("2025-LTC-primary")],
    expenses: [{
      source_reference: "synthetic care bill",
      qualified_cost: 9000,
    }],
    reimbursements: [{
      source_reference: "synthetic reimbursement statement",
      amount: 2000,
    }],
  };
}
const ordinary = ltcInsured();
const irs = ltcInsured();
irs.period.start_date = "2025-01-01";
irs.period.end_date = "2025-12-31";
irs.sources = [ltcSource("irs-example-policy", primary, 24000)];
irs.expenses[0].qualified_cost = 54750;
irs.reimbursements[0].amount = 27375;
const cost = ltcInsured();
cost.expenses[0].qualified_cost = 20000;
cost.reimbursements[0].amount = 6000;
const chronic = ltcInsured();
chronic.sources = [ltcSource("chronic-life-policy", primary, 18000, 4000)];
const terminal = ltcInsured();
terminal.sources = [ltcSource("terminal-life-policy", primary, 0, 0, 50000)];
terminal.chronic_illness = undefined;
terminal.expenses = [];
terminal.reimbursements = [];
terminal.terminal_illness = {
  certification_date: "2025-05-01",
  physician_source_reference: "synthetic terminal physician certification",
  death_expected_within_24_months_confirmed: true,
};
const multi = ltcInsured();
multi.period.start_date = "2025-07-01";
multi.period.end_date = "2025-12-31";
multi.sources = [
  ltcSource("insured-policy", elder, 15000),
  ltcSource("primary-policy", primary, 60000),
  ltcSource("other-policy", other, 30000),
];
multi.expenses[0].qualified_cost = 27600;
multi.reimbursements[0].amount = 13800;
const priority = structuredClone(multi);
priority.insured = { ...priority.insured, ...primary, name_control: "TAXP" };
priority.sources = [
  ltcSource("insured-priority-policy", primary, 15000),
  ltcSource("adult-policy", elder, 60000),
  ltcSource("second-adult-policy", other, 30000),
].map((s) => ({ ...s, insured_ssn: primary.ssn }));
const spouse = ltcInsured();
spouse.filing_policyholders = [{ owner: LtcOwner.Spouse, ssn: "987654321" }];
spouse.sources = [
  ltcSource("spouse-policy", { ssn: "987654321", name: "Bea Taxpayer" }),
];
const cents = ltcInsured();
cents.sources = [ltcSource("cent-policy", primary, 18000.40)];
cents.expenses[0].qualified_cost = 9000.60;
cents.reimbursements[0].amount = 2000.60;
const legacy = ltcInsured();
legacy.reimbursements[0].excluded_pre_august_1996_unmodified_contract = {
  issued_on: "1996-07-31",
  no_increasing_exchange_or_modification_confirmed: true,
  contract_review_reference: "synthetic unchanged old contract",
};
const jointPriority = structuredClone(multi);
jointPriority.insured_joint_spouse = {
  ssn: other.ssn,
  joint_return_review_reference: "synthetic insured and spouse joint return",
};
jointPriority.sources = [
  ltcSource("joint-insured-policy", elder, 15000),
  ltcSource("joint-spouse-policy", other, 10000),
  ltcSource("adult-child-policy", primary, 60000),
];
jointPriority.joint_priority_allocation = {
  review_reference: "synthetic joint priority allocation",
  shares: [{ ssn: elder.ssn, limitation: 15000 }, {
    ssn: other.ssn,
    limitation: 10000,
  }],
};

const daily = ltcInsured();
daily.period = {
  ...daily.period,
  start_date: "2025-06-01",
  end_date: "2025-06-01",
  method: LtcPeriodMethod.Contract,
  all_payees_agreed_equal_rate_period: undefined,
  common_contract_period_confirmed: true,
};
daily.sources = [ltcSource("one-day-contract", primary, 1000)];
daily.expenses[0].qualified_cost = 400;
daily.reimbursements[0].amount = 100;
const twoPolicies = structuredClone(cents);
twoPolicies.sources.push(ltcSource("second-cent-policy", primary, 1000.40));
const overflow = structuredClone(daily);
overflow.expenses = [];
overflow.reimbursements = [];
overflow.sources = [
  ltcSource("overflow-insured", elder, 100),
  ltcSource("overflow-primary", primary, 100),
  ...Array.from({ length: 24 }, (_, i) =>
    ltcSource(`overflow-policy-${i}`, {
      ssn: String(444551001 + i),
      name: `Policyholder ${i + 1}`,
    }, 100)),
];
const terminalMultiple = structuredClone(terminal);
terminalMultiple.chronic_illness = ltcInsured().chronic_illness;
terminalMultiple.sources.push(ltcSource("terminal-other-policy", elder, 18000));

const examples = [
  {
    id: "daily-contract-method",
    insured: daily,
    income: 680,
    tax: 25230,
    limit: 320,
  },
  {
    id: "same-holder-two-cent-policies",
    insured: twoPolicies,
    income: 8402,
    tax: 27083,
    limit: 10599,
  },
  {
    id: "multiple-payee-statement-overflow",
    insured: overflow,
    income: 87,
    tax: 25088,
    limit: 13,
  },
  {
    id: "terminal-only-multiple-payees",
    insured: terminalMultiple,
    income: 0,
    tax: 25067,
    limit: undefined,
  },
  {
    id: "irs-example-zero",
    insured: irs,
    income: 0,
    tax: 25067,
    limit: 125925,
  },
  {
    id: "taxable-per-diem",
    insured: ordinary,
    income: 7400,
    tax: 26843,
    limit: 10600,
  },
  {
    id: "actual-cost-limit",
    insured: cost,
    income: 4000,
    tax: 26027,
    limit: 14000,
  },
  {
    id: "chronic-accelerated-benefits",
    insured: chronic,
    income: 11400,
    tax: 27803,
    limit: 10600,
  },
  {
    id: "terminal-only-exclusion",
    insured: terminal,
    income: 0,
    tax: 25067,
    limit: undefined,
  },
  {
    id: "multiple-payee-child-allocation",
    insured: multi,
    income: 27680,
    tax: 31710,
    limit: 32320,
  },
  {
    id: "insured-priority-exclusion",
    insured: priority,
    income: 0,
    tax: 25067,
    limit: 15000,
  },
  {
    id: "joint-return-spouse-owner",
    insured: spouse,
    income: 7400,
    tax: 17526,
    limit: 10600,
    joint: true,
  },
  {
    id: "rounded-source-lines",
    insured: cents,
    income: 7401,
    tax: 26843,
    limit: 10599,
  },
  {
    id: "pre-1996-reimbursement",
    insured: legacy,
    income: 5400,
    tax: 26363,
    limit: 12600,
  },
  {
    id: "external-joint-insured-priority",
    insured: jointPriority,
    income: 21520,
    tax: 30232,
    limit: 38480,
  },
];
export const ltcPackets = examples.map((entry) => ({
  ...entry,
  inputs: {
    general: entry.joint
      ? {
        ...paymentPackets[0].inputs.general,
        filing_status: FilingStatus.MFJ,
        spouse_first_name: "Bea",
        spouse_last_name: "Taxpayer",
        spouse_ssn: "987654321",
        spouse_dob: "1985-03-01",
      }
      : paymentPackets[0].inputs.general,
    w2: paymentPackets[0].inputs.w2,
    form8853: {
      ltc_ledger: { tax_year: 2025 as const, insureds: [entry.insured] },
    },
  },
}));
