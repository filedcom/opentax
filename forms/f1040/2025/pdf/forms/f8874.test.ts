import { assertEquals, assertThrows } from "@std/assert";
import { form8874Pdf } from "./f8874.ts";

const source = {
  investments: [{
    cde_name: "Community Development Entity",
    cde_ein: "123456789",
    cde_address: {
      line1: "10 Main Street",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    initial_investment_date: "2023-04-15",
    credit_allowance_date: "2025-04-15",
    qualified_equity_investment_amount: 1_000_000,
    designation_notice_reference: "2023 QEI notice",
    held_on_credit_allowance_date: true,
    qualified_on_credit_allowance_date: true,
    recapture_notice_received: false,
    subject_to_passive_activity_limit: false,
  }],
};

const directClaim = {
  f8874_credit: {
    credit_amount: 50_000,
    subject_to_passive_activity_limit: false,
  },
};

Deno.test("Form 8874 PDF projects the six-column investment row and direct Form 3800 total", () => {
  const fields = form8874Pdf.projectFields!(source, {
    f8874: source,
    f3800: directClaim,
  });
  assertEquals(
    fields.row_1_cde,
    "Community Development Entity\n10 Main Street\nWilmington, DE 19801",
  );
  assertEquals(fields.row_1_ein, "12-3456789");
  assertEquals(fields.row_1_date, "04/15/2023");
  assertEquals(fields.row_1_investment, 1_000_000);
  assertEquals(fields.row_1_rate, 5);
  assertEquals(fields.row_1_credit, 50_000);
  assertEquals(fields.line2, 0);
  assertEquals(fields.line3, 50_000);
  assertEquals(form8874Pdf.pageIndices!(fields), [0]);
  assertEquals(
    form8874Pdf.fields.find((entry) => entry.domainKey === "row_1_cde")
      ?.pdfField,
    "topmostSubform[0].Page1[0].Table_Line1[0].Row1[0].f1_03[0]",
  );
  assertEquals(
    form8874Pdf.fields.find((entry) => entry.domainKey === "row_6_credit")
      ?.pdfField,
    "topmostSubform[0].Page1[0].Table_Line1[0].Row6[0].f1_38[0]",
  );
});

Deno.test("Form 8874 PDF uses the native K-1 line 2 reconciliation", () => {
  const pending = {
    f8874: source,
    f3800: {
      ...directClaim,
      f8874_k1_credit_entries: [{
        source_type: "partnership",
        source_ein: "111111111",
        source_document_reference: "2025 partnership K-1",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    },
    k1_partnership: {
      k1_partnerships: [{
        partnership_name: "Community partnership",
        partnership_ein: "111111111",
        source_document_reference: "2025 partnership K-1",
        box15_code_ad_new_markets_credit: 1_250,
        new_markets_credit_subject_to_passive_activity_limit: false,
      }],
    },
  };
  const fields = form8874Pdf.projectFields!(source, pending);
  assertEquals(fields.line2, 1_250);
  assertEquals(fields.line3, 51_250);
  assertThrows(
    () =>
      form8874Pdf.projectFields!(source, {
        ...pending,
        f3800: {
          ...pending.f3800,
          f8874_k1_credit_entries: [{
            ...pending.f3800.f8874_k1_credit_entries[0],
            credit_amount: 1_251,
          }],
        },
      }),
    Error,
    "differs from Form 3800",
  );
});

Deno.test("Form 8874 PDF does not file a pass-through-only recipient form", () => {
  assertEquals(
    form8874Pdf.projectFields!({}, {
      f3800: {
        f8874_k1_credit_entries: [{
          source_type: "partnership",
          source_ein: "111111111",
          source_document_reference: "2025 partnership K-1",
          credit_amount: 1_250,
          subject_to_passive_activity_limit: false,
        }],
      },
    }),
    {},
  );
});

Deno.test("Form 8874 PDF reconciles a passive investment to Form 8582-CR", () => {
  const passive = {
    investments: [{
      ...source.investments[0],
      subject_to_passive_activity_limit: true,
      passive_activity_reference: "Community venture",
      passive_source_document_reference: "2025 community venture QEI",
    }],
  };
  const activity = {
    activity_reference: "Community venture",
    source_form: "Form 8874",
    source_origin: { kind: "self" },
    source_document_reference: "2025 community venture QEI",
    category: "other",
    reporting_route: "form3800_line3",
    form3800_credit_line: "1i",
    current_year_credit: 50_000,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  };
  const pending = {
    f8874: passive,
    f3800: {},
    form8582cr: {
      credit_sources: [activity],
      regular_tax_all_income: 50_000,
      regular_tax_without_passive: 40_000,
    },
  };
  assertEquals(form8874Pdf.projectFields!(passive, pending).line3, 50_000);
  assertThrows(
    () =>
      form8874Pdf.projectFields!(passive, {
        ...pending,
        form8582cr: {
          ...pending.form8582cr,
          credit_sources: [{ ...activity, current_year_credit: 49_999 }],
        },
      }),
    Error,
    "does not reconcile to Form 8582-CR",
  );
});

Deno.test("Form 8874 PDF rejects overflow, cents and a missing final credit join", () => {
  const overflow = {
    investments: Array.from({ length: 7 }, (_, index) => ({
      ...source.investments[0],
      cde_ein: String(123456780 + index),
      designation_notice_reference: `QEI notice ${index}`,
    })),
  };
  assertThrows(
    () =>
      form8874Pdf.projectFields!(overflow, {
        f8874: overflow,
        f3800: directClaim,
      }),
    Error,
    "six investment rows",
  );
  const cents = {
    investments: [{
      ...source.investments[0],
      qualified_equity_investment_amount: 1_000_000.01,
    }],
  };
  assertThrows(
    () =>
      form8874Pdf.projectFields!(cents, { f8874: cents, f3800: directClaim }),
    Error,
    "whole-dollar print precision",
  );
  assertThrows(
    () => form8874Pdf.projectFields!(source, { f8874: source }),
    Error,
    "does not reconcile to Form 3800",
  );
});
