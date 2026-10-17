import {
  BankAccountType,
  type F4868Input,
  PinType,
} from "../../nodes/inputs/general/filing/f4868/index.ts";

export const SCENARIO_4868_07_SOURCE =
  "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-7-09012026.pdf";

/** TY2026 ATS Scenario 7 as printed: p. 1 cover sheet, p. 2 Form 4868 (2026). */
export const SCENARIO_4868_07_FACTS = {
  taxYear: 2026,
  taxpayer: {
    // p. 1 header and p. 2 lines 1-2.
    firstName: "Teresa",
    lastName: "Morehouse",
    ssn: "400001042",
    address: {
      line1: "2548 West Gate Street",
      city: "Sunset Valley",
      state: "TX",
      zip: "78745",
    },
  },
  // p. 1 "Payment Information".
  payment: {
    routingTransitNumber: "012345678",
    bankAccountNumber: "1234567",
    bankAccountType: "checking",
    amount: 4_000,
    dueDate: "2027-03-25",
    phone: "8004446543",
  },
  // p. 2 Part II; lines 6 and 7 are printed blank, lines 8-10 unchecked.
  printedForm4868: {
    line4EstimatedTotalTax: 14_000,
    line5TotalPayments: 8_075,
    line6BalanceDuePrinted: false,
    line7AmountPayingPrinted: false,
    line8OutOfCountryChecked: false,
    line9NonresidentNoWithheldWagesChecked: false,
    line10DisasterChecked: false,
  },
} as const;

const ASSUMED = {
  signaturePin: "12345",
  signatureDate: "2027-03-20",
  birthDate: "1980-01-01",
  priorYearAgi: 0,
} as const;

export const SCENARIO_4868_07_ASSUMPTIONS = [
  {
    field: "f4868.line7_amount_paying",
    value: String(SCENARIO_4868_07_FACTS.payment.amount),
    why:
      "Line 7 is printed blank; p. 1 gives a $4,000 electronic payment, and FPYMT-052-02 requires TaxpayerIsPayingAmt to equal PaymentAmt.",
  },
  {
    field: "f4868.pin_type / taxpayer.signature_pin / taxpayer.signature_date",
    value:
      `${PinType.SelfSelectOnLine} / ${ASSUMED.signaturePin} / ${ASSUMED.signatureDate}`,
    why:
      "An electronic payment needs a PIN signature (R0000-098-01); the packet gives none.",
  },
  {
    field: "f4868.taxpayer.birth_date",
    value: ASSUMED.birthDate,
    why:
      "R0000-681-01 needs a Self-Select PIN birth date; the packet gives none.",
  },
  {
    field: "f4868.taxpayer.prior_year_agi",
    value: String(ASSUMED.priorYearAgi),
    why: "The packet gives no 2025 AGI for the Self-Select PIN.",
  },
] as const;

/** Packet facts the 4868 rules reject, with the page and both values. */
export const SCENARIO_4868_07_RECONCILIATION = {
  conflicts: [
    {
      page: 1,
      field: "IRSPayment/RoutingTransitNum",
      rule: "R0000-075-03",
      printed: "012345678",
      current: "rejected: ABA check digit sums to 126, not a multiple of 10",
      note:
        "The TY2025 Scenario 7 packet printed 012345672, which passes the check; this TY2026 RTN fails it.",
    },
  ],
  notCompared: [
    "Line 6 is printed blank; the engine files 5,925 (line 4 minus line 5).",
    "Line 10 (disaster) is on the 2026 form but not in the 2026v1.0 IRS4868 schema; it is unchecked here.",
  ],
} as const;

export function scenario486807Input(): { f4868: F4868Input } {
  const facts = SCENARIO_4868_07_FACTS;
  return {
    f4868: {
      taxpayer: {
        first_name: facts.taxpayer.firstName,
        last_name: facts.taxpayer.lastName,
        ssn: facts.taxpayer.ssn,
        birth_date: ASSUMED.birthDate,
        prior_year_agi: ASSUMED.priorYearAgi,
        signature_pin: ASSUMED.signaturePin,
        signature_date: ASSUMED.signatureDate,
      },
      address: { ...facts.taxpayer.address },
      line4_estimated_total_tax: facts.printedForm4868.line4EstimatedTotalTax,
      line5_total_payments: facts.printedForm4868.line5TotalPayments,
      line7_amount_paying: facts.payment.amount,
      line8_out_of_country: facts.printedForm4868.line8OutOfCountryChecked,
      line9_1040nr_no_wages_withheld:
        facts.printedForm4868.line9NonresidentNoWithheldWagesChecked,
      payment: {
        routing_transit_number: facts.payment.routingTransitNumber,
        bank_account_number: facts.payment.bankAccountNumber,
        bank_account_type: BankAccountType.Checking,
        amount: facts.payment.amount,
        requested_payment_date: facts.payment.dueDate,
        daytime_phone: facts.payment.phone,
      },
      pin_type: PinType.SelfSelectOnLine,
      ats_test_submission: true,
    },
  };
}
