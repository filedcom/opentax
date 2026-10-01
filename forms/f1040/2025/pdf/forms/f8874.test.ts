import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { form8874Pdf } from "./f8874.ts";
import { withReviewedForm8874A } from "../../../nodes/inputs/f8874/issuance_fixture.ts";

const source = {
  investments: [withReviewedForm8874A(
    {
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
    },
    "Alex Owner",
    "111223333",
  )],
};
const owner1040 = {
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111223333",
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
    f1040: owner1040,
    f3800: directClaim,
  });
  assertEquals(
    fields.row_1_cde,
    "Community Development Entity\n10 Main Street, Wilmington, DE 19801",
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
    f1040: owner1040,
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
    f1040: owner1040,
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

Deno.test("Form 8874 PDF prints the IRS last-row attachment total for seven investments", () => {
  const overflow = {
    investments: Array.from({ length: 7 }, (_, index) =>
      withReviewedForm8874A(
        {
          ...source.investments[0],
          cde_ein: String(123456780 + index),
          designation_notice_reference: `QEI notice ${index}`,
        },
        "Alex Owner",
        "111223333",
      )),
  };
  const fields = form8874Pdf.projectFields!(overflow, {
    f8874: overflow,
    f1040: owner1040,
    f3800: {
      f8874_credit: {
        credit_amount: 350_000,
        subject_to_passive_activity_limit: false,
      },
    },
  });
  assertEquals(fields.row_5_credit, 50_000);
  assertEquals(fields.row_6_cde, "See attached");
  assertEquals(fields.row_6_credit, 100_000);
  assertEquals(fields.row_6_investment, undefined);
  assertEquals(fields.line3, 350_000);
  assertEquals((fields.print_overflow_rows as unknown[]).length, 2);
});

Deno.test("Form 8874 PDF attaches long CDE identity instead of clipping its form row", async () => {
  const long = {
    investments: [withReviewedForm8874A(
      {
        ...source.investments[0],
        cde_name:
          "Greater Wilmington Community Development And Neighborhood Equity Fund",
        cde_address: {
          ...source.investments[0].cde_address,
          line1: "12345 Community Boulevard Ste 5",
        },
      },
      "Alex Owner",
      "111223333",
    )],
  };
  const fields = form8874Pdf.projectFields!(long, {
    f8874: long,
    f1040: owner1040,
    f3800: directClaim,
  });
  assertEquals(fields.row_1_cde, undefined);
  assertEquals(fields.row_6_cde, "See attached");
  assertEquals(fields.row_6_credit, 50_000);
  assertEquals((fields.print_overflow_rows as unknown[]).length, 1);
  const document = await PDFDocument.create();
  await form8874Pdf.appendSupplementalPages!(
    document,
    fields,
    pdfReviewFixtures[0].filer,
  );
  assertEquals(document.getPageCount(), 1);
});

Deno.test("Form 8874 attachment keeps long and excess investments exactly once", () => {
  const investments = Array.from(
    { length: 7 },
    (_, index) =>
      withReviewedForm8874A(
        {
          ...source.investments[0],
          cde_name: index === 0
            ? "Greater Wilmington Community Development And Neighborhood Equity Fund"
            : `Community Entity ${index + 1}`,
          cde_ein: String(123456780 + index),
          designation_notice_reference: `QEI notice ${index + 1}`,
        },
        "Alex Owner",
        "111223333",
      ),
  );
  const filing = { investments };
  const fields = form8874Pdf.projectFields!(filing, {
    f8874: filing,
    f1040: owner1040,
    f3800: {
      f8874_credit: {
        credit_amount: 350_000,
        subject_to_passive_activity_limit: false,
      },
    },
  });
  assertEquals(
    fields.row_1_cde,
    "Community Entity 2\n10 Main Street, Wilmington, DE 19801",
  );
  assertEquals(fields.row_6_cde, "See attached");
  assertEquals(fields.row_6_credit, 100_000);
  assertEquals(
    (fields.print_overflow_rows as Array<{ cdeName: string }>).map(
      (row) => row.cdeName,
    ),
    [investments[0].cde_name, investments[6].cde_name],
  );
});

Deno.test("Form 8874 overflow statement spans pages and rejects a changed last-row total", async () => {
  const overflow = {
    investments: Array.from(
      { length: 24 },
      (_, index) =>
        withReviewedForm8874A(
          {
            ...source.investments[0],
            cde_ein: String(123456780 + index),
            designation_notice_reference: `QEI notice ${index}`,
          },
          "Alex Owner",
          "111223333",
        ),
    ),
  };
  const fields = form8874Pdf.projectFields!(overflow, {
    f8874: overflow,
    f1040: owner1040,
    f3800: {
      f8874_credit: {
        credit_amount: 1_200_000,
        subject_to_passive_activity_limit: false,
      },
    },
  });
  const filer = pdfReviewFixtures[0].filer;
  const document = await PDFDocument.create();
  await form8874Pdf.appendSupplementalPages!(document, fields, filer);
  assertEquals(document.getPageCount(), 2);
  await assertRejects(
    async () =>
      await form8874Pdf.appendSupplementalPages!(
        await PDFDocument.create(),
        { ...fields, row_6_credit: 1 },
        filer,
      ),
    Error,
    "does not reconcile to line 1",
  );
});

Deno.test("Form 8874 PDF rejects cents and a missing final credit join", () => {
  const cents = {
    investments: [withReviewedForm8874A(
      {
        ...source.investments[0],
        qualified_equity_investment_amount: 1_000_000.01,
      },
      "Alex Owner",
      "111223333",
    )],
  };
  assertThrows(
    () =>
      form8874Pdf.projectFields!(cents, {
        f8874: cents,
        f1040: owner1040,
        f3800: directClaim,
      }),
    Error,
    "whole-dollar print precision",
  );
  assertThrows(
    () =>
      form8874Pdf.projectFields!(source, { f8874: source, f1040: owner1040 }),
    Error,
    "does not reconcile to Form 3800",
  );
});
