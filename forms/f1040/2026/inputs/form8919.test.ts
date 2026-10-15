import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateForm8919_2026,
  claimInputSchema,
  form8919_2026,
} from "./form8919.ts";
import { syntheticForm8919_2026 } from "./form8919.fixture.ts";
import { calculateForm8959_2026 } from "../nodes/form8959.ts";
Deno.test("2026 Form 8919 shares the wage base with W-2s and Form 4137", () => {
  const input = syntheticForm8919_2026();
  input.form4137_sources = [{ recipient: "taxpayer", line10_ss_tips: 3000 }];
  const result = calculateForm8919_2026(input);
  const f = result.forms[0];
  assertEquals([
    f.line6,
    f.line8,
    f.line9,
    f.line10,
    f.line11,
    f.line12,
    f.line13,
  ], [10_000, 183_000, 1500, 1500, 93, 145, 238]);
  assertEquals(result.withholding, 1000);
  input.w2_sources![0].ss_wages_and_tips = 184_500;
  assertEquals(calculateForm8919_2026(input).forms[0].line13, 145);
});
Deno.test("2026 Form 8919 derives firm totals from multiple source records before rounding", () => {
  const input = syntheticForm8919_2026();
  const firm = input.forms![0].employers[0];
  const record = firm.income_records[0];
  if (record.kind !== "1099nec") throw new Error("fixture");
  record.box1a_nonemployee_compensation = 4999.25;
  record.wage_payments[0].gross_wages = 4999.25;
  firm.income_records.push({
    ...record,
    source_document_reference: "nec-two",
    box1a_nonemployee_compensation: 5000.25,
    wage_payments: [{
      payment_reference: "other-wage-ledger",
      gross_wages: 5000.25,
    }],
    box4_federal_withholding: 0,
  });
  assertEquals(calculateForm8919_2026(input).forms[0].line6, 10_000);
  record.box1a_nonemployee_compensation = 0.25;
  record.wage_payments[0].gross_wages = 0.25;
  firm.income_records = [record];
  assertEquals(calculateForm8919_2026(input).forms[0].line6, 0);
});
Deno.test("2026 Form 8919 requires worker-classification and chronology evidence", () => {
  for (
    const change of [
      "H-without-w2",
      "G-without-ss8",
      "future",
      "letter-before-ss8",
      "review",
    ] as const
  ) {
    const input = syntheticForm8919_2026();
    const firm = input.forms![0].employers[0];
    if (change === "H-without-w2") input.w2_sources = [];
    if (change === "G-without-ss8") firm.reason_code = "G";
    if (change === "future") {
      firm.reason_code = "C";
      firm.correspondence_reference = "letter";
      firm.correspondence_received_date = "2027-03-01";
    }
    if (change === "letter-before-ss8") {
      firm.reason_code = "A";
      firm.correspondence_reference = "letter";
      firm.correspondence_received_date = "2026-05-01";
      firm.ss8_filed_date = "2026-06-01";
      firm.ss8_filing_reference = "ss8";
    }
    if (change === "review") input.evidence_review_date = undefined;
    assertThrows(() => calculateForm8919_2026(input));
  }
});
Deno.test("2026 Form 8919 supports unknown firm TIN and payment records with filed SS-8", () => {
  const input = syntheticForm8919_2026();
  input.w2_sources = [];
  const firm = input.forms![0].employers[0];
  firm.tin_type = "unknown";
  firm.tin = undefined;
  firm.reason_code = "G";
  firm.ss8_filed_date = "2027-02-01";
  firm.ss8_filing_reference = "filed-ss8";
  firm.income_records = [{
    kind: "payment_record",
    payment_reference: "cash-payment",
    source_document_reference: "payment-one",
    recipient_ssn: "111223333",
    payment_date: "2026-12-01",
    amount: 10_000,
    no_information_return_received: true,
  }];
  const f = calculateForm8919_2026(input).forms[0];
  assertEquals([f.line6, f.line8, f.line13, f.employers[0].form1099_received], [
    10_000,
    0,
    765,
    false,
  ]);
});
Deno.test("2026 Form 8919 keeps joint owners and wage-base use separate", () => {
  const input = syntheticForm8919_2026();
  input.filing_status = FilingStatus.MFJ;
  input.spouse_ssn = "222334444";
  const spouse = structuredClone(input.forms![0]);
  spouse.recipient = "spouse";
  spouse.employers[0].income_records[0].recipient_ssn = input.spouse_ssn;
  spouse.employers[0].income_records[0].source_document_reference =
    "spouse-nec";
  const record = spouse.employers[0].income_records[0];
  if (record.kind !== "payment_record") {
    record.wage_payments[0].payment_reference = "spouse-payment";
  }
  input.forms!.push(spouse);
  input.w2_sources!.push({
    ...input.w2_sources![0],
    employee_ssn: input.spouse_ssn,
    source_document_reference: "spouse-w2",
    ss_wages_and_tips: 20_000,
  });
  input.form4137_sources = [{ recipient: "taxpayer", line10_ss_tips: 4500 }];
  assertEquals(calculateForm8919_2026(input).forms.map((f) => f.line13), [
    145,
    765,
  ]);
  input.filing_status = FilingStatus.MFS;
  assertThrows(
    () => calculateForm8919_2026(input),
    Error,
    "owner does not belong",
  );
});
Deno.test("2026 Form 8919 rejects duplicate income, mismatched owners and missing payroll boxes", () => {
  for (
    const change of [
      "duplicate",
      "owner",
      "payer",
      "ss-boxes",
      "tips-duplicate",
    ] as const
  ) {
    const input = syntheticForm8919_2026();
    const firm = input.forms![0].employers[0];
    if (change === "duplicate") {
      firm.income_records.push(firm.income_records[0]);
    }
    if (change === "owner") firm.income_records[0].recipient_ssn = "999887777";
    if (
      change === "payer" && firm.income_records[0].kind !== "payment_record"
    ) firm.income_records[0].payer_tin = "999887777";
    if (change === "ss-boxes") {
      input.w2_sources![0].ss_wages_and_tips = undefined;
    }
    if (change === "tips-duplicate") {
      input.form4137_sources = [
        { recipient: "taxpayer", line10_ss_tips: 100 },
        { recipient: "taxpayer", line10_ss_tips: 100 },
      ];
    }
    assertThrows(() => calculateForm8919_2026(input));
  }
  assertThrows(() =>
    claimInputSchema.parse({
      tax_year: 2026,
      evidence_review_date: "2027-02-10",
      forms: syntheticForm8919_2026().forms,
      wages: 10000,
    })
  );
});
Deno.test("2026 Form 8919 routes wages and withholding once and provides Additional Medicare wages", () => {
  const outputs = form8919_2026.compute(
    { taxYear: 2026, formType: "f1040" },
    syntheticForm8919_2026(),
  ).outputs;
  const fields = (node: string) =>
    outputs.find((o) => o.nodeType === node)!.fields;
  assertEquals(fields("f1040"), {
    line1g_wages_8919: 10_000,
    line25b_withheld_1099: 1000,
  });
  assertEquals(fields("agi_aggregator"), { line1g_wages_8919: 10_000 });
  assertEquals(fields("schedule2"), { line16b_form8919_wage_tax: 424 });
  assertEquals(fields("eitc"), { earned_income: 10_000 });
  const result = calculateForm8959_2026({
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    ...fields("form8959"),
    w2_medicare_sources_2026: [{
      employee_ssn: "111223333",
      employer_ein: "123456789",
      source_document_reference: "w2-one",
      box5_medicare_wages: 199_000,
      box6_medicare_withheld: 2885.5,
      uncollected_fica_medicare: 0,
      rrta_compensation: 0,
      rrta_additional_withheld: 0,
    }],
  });
  assertEquals([result.lines.line3, result.lines.line4, result.lines.line12], [
    10_000,
    209_000,
    81,
  ]);
});
Deno.test("2026 Form 8919 combines separately documented cash and information returns without duplicating payments", () => {
  const input = syntheticForm8919_2026();
  const firm = input.forms![0].employers[0];
  firm.income_records.push({
    kind: "payment_record",
    payment_reference: "extra-payment",
    source_document_reference: "cash-record",
    recipient_ssn: "111223333",
    payment_date: "2026-10-01",
    amount: 500.50,
    no_information_return_received: true,
  });
  assertEquals(calculateForm8919_2026(input).forms[0].line6, 10_501);
  firm.income_records[1] = {
    ...firm.income_records[0],
    source_document_reference: "duplicate-copy",
  };
  assertThrows(
    () => calculateForm8919_2026(input),
    Error,
    "same wage payment twice",
  );
  const record = firm.income_records[0];
  if (record.kind === "payment_record") throw new Error("fixture");
  firm.income_records.pop();
  record.wage_payments[0].gross_wages = 9999;
  assertThrows(
    () => calculateForm8919_2026(input),
    Error,
    "ledger must reconcile",
  );
});
Deno.test("2026 Form 8919 accepts documented IRS determinations and MISC wage sources", () => {
  for (const reason of ["A", "C"] as const) {
    const input = syntheticForm8919_2026();
    input.w2_sources = [];
    const firm = input.forms![0].employers[0];
    firm.reason_code = reason;
    firm.correspondence_reference = "irs-letter";
    firm.correspondence_received_date = "2027-01-15";
    if (reason === "A") {
      firm.ss8_filed_date = "2026-12-15";
      firm.ss8_filing_reference = "ss8-proof";
    }
    firm.income_records = [{
      kind: "1099misc",
      tax_year: 2026,
      source_document_reference: "misc-one",
      recipient_ssn: "111223333",
      payer_name: "First",
      payer_tin: "123456789",
      corrected: false,
      box3_other_income: 10_000,
      box13a_cash_tips: 0,
      box14_qualified_overtime: 0,
      box4_federal_withholding: 1000,
      wage_payments: [{
        payment_reference: "misc-wage-payment",
        gross_wages: 10_000,
      }],
      no_other_reportable_boxes_review_reference: "reviewed-all-boxes",
    }];
    assertEquals(calculateForm8919_2026(input).forms[0].line13, 765);
  }
});
