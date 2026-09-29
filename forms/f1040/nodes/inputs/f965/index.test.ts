import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import {
  currentYear965Payment,
  f965,
  type F965Input,
  inputSchema,
  unpaidLiability,
} from "./index.ts";

function source(overrides: Partial<F965Input> = {}) {
  return inputSchema.parse({
    reporting_year: 2025,
    amended_report: false,
    f965s: [{
      entry_type: "original",
      source_document_reference:
        "2018 filed Form 965-A and 2025 payment ledger",
      tax_year_of_inclusion: 2018,
      net_tax_with_965: 52_000,
      net_tax_without_965: 20_000,
      installment_election: true,
      net_tax_adjustment: 0,
      paid_by_installment_year: [
        2_560,
        2_560,
        2_560,
        2_560,
        2_560,
        4_800,
        6_400,
        8_000,
      ],
      current_year_payment: 8_000,
      current_year_payment_reference: "2025 IRS payment confirmation",
    }],
    s_corp_calculations: [],
    s_corp_deferred_rows: [],
    transfer_agreements: [],
    ...overrides,
  });
}

Deno.test("Form 965-A uses cumulative payments and the actual TY2025 payment", () => {
  const input = source();
  assertEquals(currentYear965Payment(input), 8_000);
  assertEquals(unpaidLiability(input, input.f965s[0]), 0);
  const result = f965.compute(
    { taxYear: 2025, formType: "f1040" },
    input,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line20_965_tax_installment,
    8_000,
  );
});

Deno.test("Form 965-A retains an unpaid liability without inventing a 2025 payment", () => {
  const input = source({
    f965s: [{
      ...source().f965s[0],
      tax_year_of_inclusion: 2017,
      paid_by_installment_year: [
        2_560,
        2_560,
        2_560,
        2_560,
        2_560,
        4_800,
        6_400,
        0,
      ],
      current_year_payment: 0,
      current_year_payment_reference: undefined,
    }],
  });
  assertEquals(unpaidLiability(input, input.f965s[0]), 8_000);
  assertEquals(
    f965.compute({ taxYear: 2025, formType: "f1040" }, input).outputs,
    [],
  );
});

Deno.test("Form 965-A rejects unsourced payments and overpaid balances", () => {
  assertThrows(() =>
    source({
      f965s: [{
        ...source().f965s[0],
        current_year_payment_reference: undefined,
      }],
    })
  );
  assertThrows(() =>
    source({
      f965s: [{
        ...source().f965s[0],
        paid_by_installment_year: Array(8).fill(8_000),
      }],
    })
  );
});

Deno.test("Form 965-A S corporation deferral reduces installment-eligible liability", () => {
  const original = source().f965s[0];
  if (original.entry_type !== "original") {
    throw new Error("Original Form 965 entry required");
  }
  const input = source({
    f965s: [{
      ...original,
      net_tax_with_965: 62_000,
      paid_by_installment_year: [
        2_560,
        2_560,
        2_560,
        2_560,
        2_560,
        4_800,
        6_400,
        8_000,
      ],
    }],
    s_corp_calculations: [{
      inclusion_year: 2018,
      source_document_reference: "2018 S corporation section 965 statement",
      corporation_name: "Example S Corp",
      corporation_ein: "123456789",
      net_tax_with_965: 15_000,
      net_tax_without_965: 5_000,
      deferral_election: true,
    }],
    s_corp_deferred_rows: [{
      election_or_transfer_year: 2018,
      source_document_reference: "2024 filed Form 965-A Part IV",
      corporation_name: "Example S Corp",
      corporation_ein: "123456789",
      beginning_deferred_liability: 10_000,
      triggered_liability: 0,
      transferred_liability: 0,
    }],
  });
  assertEquals(unpaidLiability(input, input.f965s[0]), 0);
});

Deno.test("Form 965-A netted adjustment and transfer require reconciling facts", () => {
  const row = source().f965s[0];
  const transaction = {
    ...row,
    net_tax_adjustment: 100,
    net_tax_adjustment_kind: "netted_adjustment_and_transfer" as const,
    transfer_agreement_file_name: "Form965C.pdf",
    counterparty_tax_id: { kind: "ein" as const, value: "987654321" },
    netted_adjustment_and_transfer: {
      adjustment_amount: 200,
      transferred_out_amount: -100,
      explanation: "IRS examination adjustment followed by transfer",
      source_document_reference: "2025 signed transfer agreement",
    },
  };
  const input = source({
    f965s: [transaction],
    transfer_agreements: [{
      agreement_type: "965-C",
      file_name: "Form965C.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 signed Form 965-C",
    }],
  });
  assertEquals(unpaidLiability(input, input.f965s[0]), 100);
  assertThrows(() =>
    source({
      f965s: [{
        ...transaction,
        netted_adjustment_and_transfer: undefined,
      }],
    })
  );
});

Deno.test("Form 965-A multiple transferees must sum to Part IV transfer", () => {
  const annualRow = {
    election_or_transfer_year: 2018,
    source_document_reference: "2025 signed Form 965-D agreements",
    corporation_name: "Example S Corp",
    corporation_ein: "123456789",
    beginning_deferred_liability: 10_000,
    triggered_liability: 0,
    transferred_liability: -6_000,
    transfer_agreement_links: [{
      counterparty_tax_id: { kind: "ein" as const, value: "123123123" },
      file_name: "Form965D1.pdf",
    }, {
      counterparty_tax_id: { kind: "ssn" as const, value: "321321321" },
      file_name: "Form965D2.pdf",
    }],
    counterparty_tax_id: { kind: "ein" as const, value: "123123123" },
    multiple_transferees: [
      {
        tax_id: { kind: "ein" as const, value: "123123123" },
        transferred_amount: 2_000,
      },
      {
        tax_id: { kind: "ssn" as const, value: "321321321" },
        transferred_amount: 4_000,
      },
    ],
  };
  const input = source({
    s_corp_deferred_rows: [annualRow],
    transfer_agreements: [{
      agreement_type: "965-D",
      file_name: "Form965D1.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 first signed Form 965-D",
    }, {
      agreement_type: "965-D",
      file_name: "Form965D2.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 second signed Form 965-D",
    }],
  });
  assertEquals(input.s_corp_deferred_rows[0].transferred_liability, -6_000);
  assertThrows(() =>
    source({
      s_corp_deferred_rows: [{
        ...annualRow,
        transfer_agreement_links: annualRow.transfer_agreement_links.slice(
          0,
          1,
        ),
      }],
      transfer_agreements: input.transfer_agreements,
    })
  );
  assertThrows(() =>
    source({
      s_corp_deferred_rows: [{
        ...annualRow,
        transferred_liability: -5_000,
      }],
      transfer_agreements: input.transfer_agreements,
    })
  );
});

Deno.test("Form 965-A Part IV transfer in has one Form 965-D counterparty and no beginning balance", () => {
  const transferIn = {
    election_or_transfer_year: 2025,
    source_document_reference: "2025 signed transfer-in agreement",
    corporation_name: "Acquired S Corp",
    corporation_ein: "456789123",
    beginning_deferred_liability: 0,
    triggered_liability: 0,
    transferred_liability: 500,
    counterparty_tax_id: { kind: "ein" as const, value: "987654321" },
    transfer_agreement_links: [{
      counterparty_tax_id: { kind: "ein" as const, value: "987654321" },
      file_name: "Form965DIn.pdf",
    }],
  };
  const agreement = {
    agreement_type: "965-D" as const,
    file_name: "Form965DIn.pdf",
    signed_pdf_base64: "JVBERi0x",
    source_document_reference: "2025 signed Form 965-D transfer in",
  };
  assertEquals(
    source({
      s_corp_deferred_rows: [transferIn],
      transfer_agreements: [agreement],
    }).s_corp_deferred_rows[0].transferred_liability,
    500,
  );
  assertThrows(() =>
    source({
      s_corp_deferred_rows: [{
        ...transferIn,
        beginning_deferred_liability: 100,
      }],
      transfer_agreements: [agreement],
    })
  );
});

Deno.test("Form 965-A consent-triggered liability needs its signed Form 965-E copy", () => {
  const triggered = {
    entry_type: "triggered_s_corp" as const,
    source_document_reference: "2025 consent-triggering transaction",
    tax_year_of_inclusion: 2025,
    triggering_event_date: "2025-06-01",
    installment_election: true,
    triggered_liability: 1_000,
    net_tax_adjustment: 0,
    paid_by_installment_year: Array(8).fill(0),
    current_year_payment: 0,
    requires_965e_consent: true,
    consent_agreement_file_name: "Form965E.pdf",
    separate_965h_election_reference: "2025 separate section 965(h) election",
  };
  const deferred = {
    election_or_transfer_year: 2018,
    source_document_reference: "2018 deferral and 2025 consent transaction",
    corporation_name: "Example S Corp",
    corporation_ein: "123456789",
    beginning_deferred_liability: 1_000,
    triggered_liability: 1_000,
    transferred_liability: 0,
  };
  assertThrows(() =>
    source({
      f965s: [source().f965s[0], triggered],
      s_corp_deferred_rows: [deferred],
    })
  );
  const input = source({
    f965s: [source().f965s[0], triggered],
    s_corp_deferred_rows: [deferred],
    transfer_agreements: [{
      agreement_type: "965-E",
      file_name: "Form965E.pdf",
      signed_pdf_base64: "JVBERi0x",
      source_document_reference: "2025 signed Form 965-E",
    }],
  });
  assertEquals(input.f965s[1].entry_type, "triggered_s_corp");
  assertThrows(() =>
    source({
      ...input,
      f965s: [input.f965s[0], {
        ...triggered,
        tax_year_of_inclusion: 2018,
      }],
    })
  );
  assertThrows(() =>
    source({
      ...input,
      f965s: [input.f965s[0], {
        ...triggered,
        triggering_event_date: "2025-02-30",
      }],
    })
  );
  assertThrows(() =>
    source({
      ...input,
      f965s: [input.f965s[0], {
        ...triggered,
        separate_965h_election_reference: undefined,
      }],
    })
  );
  assertThrows(() =>
    source({
      ...input,
      transfer_agreements: [{
        ...input.transfer_agreements[0],
        agreement_type: "965-D",
      }],
    })
  );
});
