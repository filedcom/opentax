import { canonicalForm1098CopyDocument } from "../../../../../2025/pdf/reviews/deductions/mortgage/review-1098-copy.fixture.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  assertForm1098IssuerCopies,
  verifyForm1098IssuerCopy,
} from "./issuer_copy.ts";
import { buildMefBundle } from "../../../../../2025/mef/builder.ts";
import { buildPdfBytes } from "../../../../../2025/pdf/builder.ts";
import type { MefFormsPending } from "../../../../../2025/mef/types.ts";
import { f1040_2025 } from "../../../../../2025/index.ts";
import { buildPending } from "../../../../../2025/mef/execution/pending.ts";
import { FilingStatus } from "../../../../types.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { purchasePointsCrossLoanFixture } from "./purchase_points_cross_loan.fixture.ts";

const item = {
  lender_name: "Test Mortgage Bank",
  recipient_tin: "111-22-3333",
  source_document_reference: "2025 lender Form 1098 account 001",
  box1_mortgage_interest: 18_000,
  box1_current_year_deductible_interest: 18_000,
  box1_deduction_workpaper_reference: "Pub 936 mortgage workpaper",
  box4_refund_overpaid: 2_000,
  box4_prior_year_refund: true,
  box4_taxable_recovery_verified_amount: 1_200,
  box4_recovery_workpaper_reference: "Pub 525 recovery workpaper",
  box6_points_paid: 2_400,
  box6_current_year_deductible_points: 2_400,
  box6_deduction_workpaper_reference: "Pub 936 points workpaper",
};

async function copy(
  box1 = "18000",
  includeBox6 = true,
  box2 = "",
): Promise<Uint8Array> {
  const pdf = await canonicalForm1098CopyDocument();
  const form = pdf.getForm();
  const prefix = "topmostSubform[0].CopyB[0]";
  const values: Record<string, string> = {
    [`${prefix}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
    [`${prefix}.LeftCol[0].f2_2[0]`]: "Test Mortgage Bank\n1 Bank St",
    [`${prefix}.LeftCol[0].f2_4[0]`]: "***-**-3333",
    [`${prefix}.RightCol[0].f2_11[0]`]: box1,
    [`${prefix}.RightCol[0].f2_12[0]`]: box2,
    [`${prefix}.RightCol[0].f2_13[0]`]: "",
    [`${prefix}.RightCol[0].f2_14[0]`]: "2000",
    [`${prefix}.RightCol[0].f2_15[0]`]: "",
    ...(includeBox6 ? { [`${prefix}.RightCol[0].f2_16[0]`]: "2400" } : {}),
  };
  for (const [name, value] of Object.entries(values)) {
    form.getTextField(name).setText(value);
  }
  if (!includeBox6) {
    form.removeField(form.getTextField(`${prefix}.RightCol[0].f2_16[0]`));
  }
  return pdf.save();
}

async function review(bytes: Uint8Array) {
  const sha256 = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        Uint8Array.from(bytes),
      ),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    source_document_reference: item.source_document_reference,
    file_name: "Lender1098.pdf",
    pdf_sha256: sha256,
  };
}

Deno.test("Form 1098 official Copy B fields bind reviewed bytes and tax boxes", async () => {
  const bytes = await copy();
  await verifyForm1098IssuerCopy(
    item,
    await review(bytes),
    bytes,
    "Lender1098.pdf",
  );
  const changed = await copy("17999");
  const reviewForChanged = await review(changed);
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(item, reviewForChanged, bytes, "Lender1098.pdf"),
    Error,
    "exact PDF SHA-256",
  );
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(
        item,
        reviewForChanged,
        changed,
        "Lender1098.pdf",
      ),
    Error,
    "box1_mortgage_interest differs",
  );
  const missing = await copy("18000", false);
  const reviewForMissing = await review(missing);
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(
        item,
        reviewForMissing,
        missing,
        "Lender1098.pdf",
      ),
    Error,
    "lacks readable Copy B field",
  );
  const malformedBlankBox = await copy("18000", true, "not reported");
  const malformedBlankBoxReview = await review(malformedBlankBox);
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(
        { ...item, box2_outstanding_principal: undefined },
        malformedBlankBoxReview,
        malformedBlankBox,
        "Lender1098.pdf",
      ),
    Error,
    "invalid amount field",
  );
  const malformedGroupingBox = await copy("18000", true, "1,00");
  const malformedGroupingBoxReview = await review(malformedGroupingBox);
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(
        { ...item, box2_outstanding_principal: undefined },
        malformedGroupingBoxReview,
        malformedGroupingBox,
        "Lender1098.pdf",
      ),
    Error,
    "invalid amount field",
  );
  const negativeBlankBox = await copy("18000", true, "-1");
  const negativeBlankBoxReview = await review(negativeBlankBox);
  await assertRejects(
    () =>
      verifyForm1098IssuerCopy(
        { ...item, box2_outstanding_principal: undefined },
        negativeBlankBoxReview,
        negativeBlankBox,
        "Lender1098.pdf",
      ),
    Error,
    "invalid amount field",
  );
});

Deno.test("Form 1098 box 6 export binds original Copy B bytes and rejects missing or altered evidence", async () => {
  const bytes = await copy();
  const reviewed = await review(bytes);
  const source = {
    f1098: {
      f1098s: [{
        ...item,
        issuer_copy: {
          file_name: reviewed.file_name,
          pdf_sha256: reviewed.pdf_sha256,
          bytes,
        },
      }],
    },
  };
  await assertForm1098IssuerCopies(source);
  await assertRejects(
    () =>
      assertForm1098IssuerCopies({
        f1098: { f1098s: [{ ...item }] },
      }),
    Error,
    "needs the reviewed issuer Copy B bytes",
  );
  await assertRejects(
    () =>
      buildMefBundle(
        { f1098: { f1098s: [{ ...item }] } } as unknown as MefFormsPending,
        { attachments: [] },
      ),
    Error,
    "needs the reviewed issuer Copy B bytes",
  );
  await assertRejects(
    () => buildPdfBytes({ f1098: { f1098s: [{ ...item }] } }, undefined),
    Error,
    "needs the reviewed issuer Copy B bytes",
  );
  const changed = await copy("17999");
  await assertRejects(
    () =>
      assertForm1098IssuerCopies({
        f1098: {
          f1098s: [{
            ...item,
            issuer_copy: {
              ...source.f1098.f1098s[0].issuer_copy,
              bytes: changed,
            },
          }],
        },
      }),
    Error,
    "exact PDF SHA-256",
  );
});

async function lenderCopy(
  source: ReturnType<typeof purchasePointsCrossLoanFixture>["f1098"][number],
  interest = source.box1_mortgage_interest,
): Promise<Uint8Array> {
  const pdf = await canonicalForm1098CopyDocument();
  const form = pdf.getForm();
  const prefix = "topmostSubform[0].CopyB[0]";
  const values: Record<string, string> = {
    [`${prefix}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
    [`${prefix}.LeftCol[0].f2_2[0]`]: source.lender_name,
    [`${prefix}.LeftCol[0].f2_4[0]`]: source.recipient_tin,
    [`${prefix}.RightCol[0].f2_11[0]`]: String(interest),
    [`${prefix}.RightCol[0].f2_12[0]`]: String(
      source.box2_outstanding_principal ?? "",
    ),
    [`${prefix}.RightCol[0].f2_13[0]`]: source.box3_origination_date,
    [`${prefix}.RightCol[0].f2_14[0]`]: "",
    [`${prefix}.RightCol[0].f2_15[0]`]: "",
    [`${prefix}.RightCol[0].f2_16[0]`]: String(source.box6_points_paid ?? ""),
  };
  for (const [name, value] of Object.entries(values)) {
    form.getTextField(name).setText(value);
  }
  return pdf.save();
}

async function issuerCopy(bytes: Uint8Array, fileName: string) {
  return {
    file_name: fileName,
    pdf_sha256: Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join(""),
    bytes,
  };
}

Deno.test("whole-return cross-loan review binds both lender-issued Forms 1098 at native and PDF export", async () => {
  const fixture = purchasePointsCrossLoanFixture();
  const [purchase, existing] = fixture.f1098;
  const purchaseBytes = await lenderCopy(purchase);
  const existingBytes = await lenderCopy(existing);
  const source = {
    f1098: {
      f1098s: [{
        ...purchase,
        issuer_copy: await issuerCopy(purchaseBytes, "purchase1098.pdf"),
      }, {
        ...existing,
        issuer_copy: await issuerCopy(existingBytes, "existing1098.pdf"),
      }],
      ...fixture.f1098_purchase_points_cross_loan_review,
    },
  };
  await assertForm1098IssuerCopies(source);
  const general = {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    digital_assets: false,
    address_line1: "1 Test Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  };
  const result = f1040_2025.executeReturn({
    general,
    f1098: source.f1098.f1098s,
    f1098_purchase_points_cross_loan_review:
      fixture.f1098_purchase_points_cross_loan_review,
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.schedule_a?.line_8a_mortgage_interest_1098,
    21_000,
  );
  const filer = extractFilerIdentity(general);
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<RptHomeMortgIntAndPointsAmt>21000</RptHomeMortgIntAndPointsAmt>",
  );
  const filled = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(filled)).getPageCount(), 3);
  const withoutExisting = {
    f1098: {
      ...source.f1098,
      f1098s: [source.f1098.f1098s[0], existing],
    },
  };
  await assertRejects(
    () => assertForm1098IssuerCopies(withoutExisting),
    Error,
    "reviewed issuer Copy B bytes for each lender",
  );
  await assertRejects(
    () =>
      buildMefBundle(withoutExisting as unknown as MefFormsPending, {
        attachments: [],
      }),
    Error,
    "reviewed issuer Copy B bytes for each lender",
  );
  await assertRejects(
    () => buildPdfBytes(withoutExisting, undefined),
    Error,
    "reviewed issuer Copy B bytes for each lender",
  );
  const changedBytes = await lenderCopy(existing, 11_999);
  const changed = {
    f1098: {
      ...source.f1098,
      f1098s: [source.f1098.f1098s[0], {
        ...source.f1098.f1098s[1],
        issuer_copy: await issuerCopy(changedBytes, "existing1098.pdf"),
      }],
    },
  };
  await assertRejects(
    () => assertForm1098IssuerCopies(changed),
    Error,
    "box1_mortgage_interest differs",
  );
});

Deno.test("two-loan Pub. 936 limit review also needs both issuer copies", async () => {
  const loans = [
    ["first Form 1098", 20_000, 16_660, 500_000, "01/15/2020"],
    ["second Form 1098", 16_000, 13_328, 400_000, "02/15/2021"],
  ] as const;
  const source = {
    f1098: {
      f1098s: loans.map(([reference, interest, deductible, , date]) => ({
        lender_name: reference,
        recipient_tin: "111-22-3333",
        source_document_reference: reference,
        box3_origination_date: date,
        box1_mortgage_interest: interest,
        box1_current_year_deductible_interest: deductible,
        box1_deduction_workpaper_reference: "Pub. 936 Table 1",
      })),
      mortgage_limit_review: {
        table1_workpaper_reference: "Pub. 936 Table 1",
        all_qualified_home_mortgages_included_verified: true,
        all_post_2017_acquisition_debt_verified: true,
        single_filing_status_verified: true,
        loans: loans.map(([reference, , , balance]) => ({
          source_document_reference: reference,
          monthly_balance_records: Array.from({ length: 12 }, (_, index) => ({
            month: index + 1,
            closing_balance: balance,
            lender_statement_reference: `${reference} month ${index + 1}`,
          })),
        })),
      },
    },
  };
  await assertRejects(
    () => assertForm1098IssuerCopies(source),
    Error,
    "reviewed issuer Copy B bytes for each lender",
  );
});

Deno.test("Form1098 issuer metadata and stale/hidden/missing printable appearances cannot prove the submitted source copy", async () => {
  const valid = await copy();
  const original = await PDFDocument.load(valid);
  const metadata = await PDFDocument.create();
  metadata.addPage([612, 792]);
  for (const field of original.getForm().getFields()) {
    metadata.getForm().createTextField(field.getName()).setText(
      original.getForm().getTextField(field.getName()).getText() ?? "",
    );
  }
  const metadataBytes = await metadata.save();
  await assertRejects(
    async () =>
      verifyForm1098IssuerCopy(
        item,
        await review(metadataBytes),
        metadataBytes,
        "Lender1098.pdf",
      ),
    Error,
    "printable",
  );
  for (const kind of ["stale", "hidden", "offpage", "missing"]) {
    const pdf = await PDFDocument.load(
      kind === "stale" ? await copy("17000") : valid,
    );
    const field = pdf.getForm().getTextField(
      "topmostSubform[0].CopyB[0].RightCol[0].f2_11[0]",
    );
    const widget = field.acroField.getWidgets()[0];
    if (kind === "stale") field.setText("18000");
    if (kind === "hidden") widget.setFlags(widget.getFlags() | 2);
    if (kind === "offpage") {
      widget.setRectangle({ ...widget.getRectangle(), x: 900 });
    }
    if (kind === "missing") widget.dict.delete(PDFName.of("AP"));
    const bytes = await pdf.save({ updateFieldAppearances: false });
    await assertRejects(
      async () =>
        verifyForm1098IssuerCopy(
          item,
          await review(bytes),
          bytes,
          "Lender1098.pdf",
        ),
      Error,
      "printable",
    );
  }
});
