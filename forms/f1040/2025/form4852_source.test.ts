import { assertEquals, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { FormType } from "../nodes/inputs/f4852/index.ts";
import {
  assertForm4852RetainedBytes,
  reconcileForm4852Source,
} from "./form4852_source.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "A TEST",
  nameControl: "TEST",
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Test St", city: "Austin", state: "TX", zip: "78701" },
  spouse: {
    firstName: "B",
    lastName: "Test",
    ssn: "987654321",
    nameControl: "TEST",
  },
};
function fixture() {
  const bytes = new TextEncoder().encode("retained source contract test bytes");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const item = {
    form_type: FormType.W2,
    payer_name: "Employer",
    payer_tin: "12-3456789",
    recipient_ssn: "123-45-6789",
    subject_ts: "T" as const,
    form_year: 2025 as const,
    payer_address_line1: "2 Test St",
    payer_address_city: "Austin",
    payer_address_state: "TX",
    payer_address_zip: "78701",
    missing_or_incorrect: "missing" as "missing" | "incorrect",
    wages: 75000,
    federal_withheld: 11000,
    amount_determination_explanation: "Final paystub",
    payer_form_efforts_explanation: "Requested corrected source from payroll",
    source_workpaper_reference: "paystub:1",
    completed_form_review_reference: "4852:1",
  };
  const record = {
    reviewed_substitute: structuredClone(item),
    source_workpaper: { document_reference: "paystub:1", sha256 },
    completed_form: { document_reference: "4852:1", sha256 },
    taxpayer_completed_form_confirmed: true as const,
    original_excluded_from_current_income_confirmed: true as const,
  };
  return {
    pending: {
      f4852: { f4852s: [item], reviewed_source: { records: [record] } },
    },
    documents: ["paystub:1", "4852:1"].map((document_reference) => ({
      document_reference,
      bytes,
    })),
  };
}
Deno.test("4852 retained source contract binds owner, reviewed facts and exact document bytes", () => {
  const { pending, documents } = fixture();
  assertEquals(
    assertForm4852RetainedBytes(pending, filer, documents).f4852s[0].wages,
    75000,
  );
  for (
    const mutate of [
      (p: ReturnType<typeof fixture>["pending"]) => {
        p.f4852.f4852s[0].wages++;
      },
      (p: ReturnType<typeof fixture>["pending"]) => {
        p.f4852.f4852s[0].recipient_ssn = "111223333";
        p.f4852.reviewed_source.records[0].reviewed_substitute.recipient_ssn =
          "111223333";
      },
      (p: ReturnType<typeof fixture>["pending"]) => {
        p.f4852.reviewed_source.records[0].completed_form.document_reference =
          "other";
      },
      (p: ReturnType<typeof fixture>["pending"]) => {
        p.f4852.f4852s[0].missing_or_incorrect = "incorrect";
        p.f4852.reviewed_source.records[0].reviewed_substitute
          .missing_or_incorrect = "incorrect";
      },
    ]
  ) {
    const f = fixture();
    mutate(f.pending);
    assertThrows(() => reconcileForm4852Source(f.pending, filer));
  }
  assertThrows(() =>
    assertForm4852RetainedBytes(pending, filer, documents.slice(0, 1))
  );
  assertThrows(() =>
    assertForm4852RetainedBytes(pending, filer, [...documents, documents[0]])
  );
  assertThrows(() =>
    assertForm4852RetainedBytes(
      pending,
      filer,
      documents.map((d) => ({ ...d, bytes: new Uint8Array([1]) })),
    )
  );
});
Deno.test("4852 rejects duplicate substitute and original-source double counting", () => {
  const { pending } = fixture();
  const both = {
    ...pending,
    w2: {
      w2s: [{
        employer_name: "Employer",
        employer_ein: "123456789",
        employee_ssn: "123456789",
        box1_wages: 70000,
        box2_fed_withheld: 10000,
      }],
    },
  };
  assertThrows(
    () => reconcileForm4852Source(both, filer),
    Error,
    "both enter current income",
  );
  pending.f4852.f4852s.push(structuredClone(pending.f4852.f4852s[0]));
  pending.f4852.reviewed_source.records.push(
    structuredClone(pending.f4852.reviewed_source.records[0]),
  );
  assertThrows(
    () => reconcileForm4852Source(pending, filer),
    Error,
    "duplicate owner/payer",
  );
});
Deno.test("4852 1099-R original ownership and joint same-payer substitutes use distinct owners", () => {
  const { pending } = fixture();
  const w2 = pending.f4852.f4852s[0];
  const spouse = {
    ...w2,
    subject_ts: "S",
    recipient_ssn: "987654321",
    source_workpaper_reference: "paystub:spouse",
    completed_form_review_reference: "4852:spouse",
  };
  const record = pending.f4852.reviewed_source.records[0];
  const combined = {
    f4852: {
      f4852s: [w2, spouse],
      reviewed_source: {
        records: [record, {
          ...record,
          reviewed_substitute: spouse,
          source_workpaper: {
            ...record.source_workpaper,
            document_reference: "paystub:spouse",
          },
          completed_form: {
            ...record.completed_form,
            document_reference: "4852:spouse",
          },
        }],
      },
    },
  };
  assertEquals(reconcileForm4852Source(combined, filer).f4852s.length, 2);
  const { wages: _wages, ...facts } = w2;
  const pension = {
    ...facts,
    form_type: FormType.R_1099,
    gross_distribution: 12000,
    taxable_amount: 10000,
    distribution_code: "7",
  };
  const p = {
    f4852: {
      f4852s: [pension],
      reviewed_source: {
        records: [
          { ...record, reviewed_substitute: pension },
        ],
      },
    },
    f1099r: {
      f1099rs: [{
        payer_name: "Employer",
        payer_ein: "123456789",
        recipient_ssn: "123456789",
        box1_gross_distribution: 12000,
        box2a_taxable_amount: 10000,
        box7_distribution_code: "7",
      }],
    },
  };
  assertThrows(
    () => reconcileForm4852Source(p, filer),
    Error,
    "both enter current income",
  );
});
