import { syntheticForm8919_2026 } from "../inputs/form8919.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
export function syntheticForm8919Continuation2026() {
  const input = syntheticForm8919_2026();
  input.filing_status = FilingStatus.MFJ;
  input.spouse_ssn = "222334444";
  const primary = input.forms![0];
  for (let index = 1; index <= 5; index++) {
    const firm = structuredClone(primary.employers[0]);
    firm.name = `Firm ${index + 1}`;
    firm.tin = `98000000${index}`;
    firm.reason_code = index % 2 ? "A" : "C";
    firm.correspondence_received_date = "2027-01-15";
    firm.correspondence_reference = `irs-letter-${index}`;
    if (firm.reason_code === "A") {
      firm.ss8_filed_date = "2026-12-15";
      firm.ss8_filing_reference = `ss8-${index}`;
    }
    const record = firm.income_records[0];
    if (record.kind === "payment_record") throw new Error("fixture");
    record.source_document_reference = `nec-${index}`;
    record.payer_name = firm.name;
    record.payer_tin = firm.tin;
    record.wage_payments[0].payment_reference = `payment-${index}`;
    primary.employers.push(firm);
  }
  const spouse = structuredClone(primary);
  spouse.recipient = "spouse";
  spouse.employers = [spouse.employers[0]];
  Object.assign(spouse.employers[0], {
    name: "Unknown Firm",
    tin_type: "unknown",
    tin: undefined,
    reason_code: "G",
    ss8_filed_date: "2027-02-01",
    ss8_filing_reference: "spouse-ss8",
    income_records: [{
      kind: "payment_record",
      payment_reference: "spouse-wages",
      source_document_reference: "spouse-cash-record",
      recipient_ssn: input.spouse_ssn,
      payment_date: "2026-12-15",
      amount: 10_000,
      no_information_return_received: true,
    }],
  });
  input.forms!.push(spouse);
  return input;
}
