import { fixture, ledger } from "./form8853_contributions.fixture.ts";
import { ltcPackets } from "./form8853_ltc.fixture.ts";
import { LtcOwner } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/ltc.ts";

// Independent 2025 Schedule X/Y-1 arithmetic: wages + taxable LTC + employer
// excess - Archer deduction - standard deduction, plus Form 5329 Part VI tax.
const cases = [
  {
    id: "personal-deduction",
    personal: 2000.49,
    employer: 0,
    ltc: "taxable-per-diem",
    income: 7400,
    deduction: 2000,
    excessIncome: 0,
    excise: 0,
    agi: 155400,
    tax: 26363,
  },
  {
    id: "personal-limit-and-excess",
    personal: 4000.51,
    employer: 0,
    ltc: "taxable-per-diem",
    income: 7400,
    deduction: 2600,
    excessIncome: 0,
    excise: 84,
    agi: 154800,
    tax: 26303,
  },
  {
    id: "employer-and-personal-excess",
    personal: 1000.51,
    employer: 3000.51,
    ltc: "taxable-per-diem",
    income: 7400,
    deduction: 0,
    excessIncome: 401,
    excise: 84,
    agi: 157801,
    tax: 27023,
  },
  {
    id: "employer-excess-already-wages",
    personal: 0,
    employer: 3000.51,
    alreadyWages: 401,
    ltc: "irs-example-zero",
    income: 0,
    deduction: 0,
    excessIncome: 0,
    excise: 24,
    agi: 150401,
    tax: 25187,
  },
  {
    id: "spouse-msa-primary-ltc",
    personal: 2000.49,
    employer: 0,
    msaSpouse: true,
    joint: true,
    ltc: "taxable-per-diem",
    income: 7400,
    deduction: 2000,
    excessIncome: 0,
    excise: 0,
    agi: 155400,
    tax: 17086,
  },
  {
    id: "primary-msa-spouse-ltc",
    personal: 2000.49,
    employer: 0,
    ltcSpouse: true,
    joint: true,
    ltc: "taxable-per-diem",
    income: 7400,
    deduction: 2000,
    excessIncome: 0,
    excise: 0,
    agi: 155400,
    tax: 17086,
  },
  {
    id: "multiple-payees-with-deduction",
    personal: 2000.49,
    employer: 0,
    ltc: "multiple-payee-child-allocation",
    income: 27680,
    deduction: 2000,
    excessIncome: 0,
    excise: 0,
    agi: 175680,
    tax: 31230,
  },
  {
    id: "zero-income-deduction-and-tax",
    personal: 0,
    employer: 1000,
    ltc: "terminal-only-exclusion",
    income: 0,
    deduction: 0,
    excessIncome: 0,
    excise: 0,
    agi: 150000,
    tax: 25067,
  },
  {
    id: "source-cents",
    personal: 2000.51,
    employer: 0,
    ltc: "rounded-source-lines",
    income: 7401,
    deduction: 2001,
    excessIncome: 0,
    excise: 0,
    agi: 155400,
    tax: 26363,
  },
];

export const combinedPackets = cases.map((entry) => {
  const archer = ledger();
  delete archer.no_other_form8853_activity_review_reference;
  archer.ltc_activity_review = {
    source_reference: "Synthetic combined Archer/LTC inventory review",
    no_msa_distributions_confirmed: true,
    all_other_form8853_activity_in_ltc_ledger_confirmed: true,
  };
  archer.owner = entry.msaSpouse ? "spouse" : "taxpayer";
  archer.filing_status = entry.joint ? "mfj" : "single";
  archer.holder_ssn = entry.msaSpouse ? "222334444" : "111223333";
  archer.compensation.service_wages = 150000;
  archer.compensation.employer_excess_already_in_box1 = entry.alreadyWages ?? 0;
  archer.personal_contributions[0].payer_ssn = archer.holder_ssn;
  archer.personal_contributions[0].amount = entry.personal;
  const ltc = structuredClone(
    ltcPackets.find((p) => p.id === entry.ltc)!.inputs.form8853.ltc_ledger,
  );
  const oldInsuredSsn = ltc.insureds[0].insured.ssn;
  ltc.insureds[0].insured.ssn = "444556666";
  ltc.insureds[0].sources = ltc.insureds[0].sources.map((source) => ({
    ...source,
    insured_ssn: "444556666",
    policyholder: source.policyholder.ssn === oldInsuredSsn
      ? { ...source.policyholder, ssn: "444556666" }
      : source.policyholder,
  }));
  const holder = {
    ssn: entry.ltcSpouse ? "222334444" : "111223333",
    name: entry.ltcSpouse ? "Casey Example" : "Alex Example",
  };
  ltc.insureds[0].filing_policyholders = [{
    owner: entry.ltcSpouse ? LtcOwner.Spouse : LtcOwner.Taxpayer,
    ssn: holder.ssn,
  }];
  ltc.insureds[0].sources = ltc.insureds[0].sources.map((s) =>
    s.policyholder.ssn === "123456789" ? { ...s, policyholder: holder } : s
  );
  const base = fixture(archer, entry.employer);
  base.w2[0].box2_fed_withheld = 35000;
  return {
    ...entry,
    inputs: { ...base, form8853: { ...base.form8853, ltc_ledger: ltc } },
  };
});
