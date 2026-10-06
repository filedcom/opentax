import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { canonicalForm1098CopyDocument } from "./pdf/review-1098-copy.fixture.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { inputSchema } from "../nodes/inputs/f1098/index.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const xsdPath = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

async function copy(
  lender: string,
  interest: number,
  principal: number,
  date: string,
) {
  const pdf = await canonicalForm1098CopyDocument();
  const form = pdf.getForm();
  const prefix = "topmostSubform[0].CopyB[0]";
  for (
    const [field, value] of Object.entries({
      [`${prefix}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
      [`${prefix}.LeftCol[0].f2_2[0]`]: lender,
      [`${prefix}.LeftCol[0].f2_4[0]`]: "***-**-3333",
      [`${prefix}.RightCol[0].f2_11[0]`]: String(interest),
      [`${prefix}.RightCol[0].f2_12[0]`]: String(principal),
      [`${prefix}.RightCol[0].f2_13[0]`]: date,
      [`${prefix}.RightCol[0].f2_14[0]`]: "",
      [`${prefix}.RightCol[0].f2_15[0]`]: "",
      [`${prefix}.RightCol[0].f2_16[0]`]: "",
    })
  ) form.getTextField(field).setText(value);
  const bytes = await pdf.save();
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    file_name: `${lender.replaceAll(" ", "")}.pdf`,
    pdf_sha256: hash,
    bytes,
  };
}

async function source(refinanceMonth = 7) {
  const oldMonths = Array.from({ length: refinanceMonth - 1 }, (_, index) => ({
    month: index + 1,
    opening_balance: 200_000,
    principal_paid_before_month_end: 0,
    closing_balance: 200_000,
    interest_paid: 1_000,
    lender_statement_reference: `Old lender 2025-${index + 1} statement`,
  }));
  const newMonths = Array.from({ length: 13 - refinanceMonth }, (_, index) => {
    const opening = 250_000 - 10_000 * index;
    return {
      month: refinanceMonth + index,
      opening_balance: opening,
      principal_paid_before_month_end: 10_000,
      closing_balance: opening - 10_000,
      interest_paid: opening / 200,
      lender_statement_reference: `New lender 2025-${
        refinanceMonth + index
      } statement`,
    };
  });
  const oldInterest = oldMonths.reduce(
    (sum, row) => sum + row.interest_paid,
    0,
  );
  const newInterest = newMonths.reduce(
    (sum, row) => sum + row.interest_paid,
    0,
  );
  const qualifiedNew = newMonths.reduce(
    (sum, row, index) =>
      sum + Math.min(200_000, 250_000 - 10_000 * (index + 1)),
    0,
  );
  const newAverage =
    newMonths.reduce((sum, row) => sum + row.closing_balance, 0) /
    12;
  const ratio = Math.round(
    (200_000 + qualifiedNew / 12) /
      (200_000 + newAverage) * 1000,
  ) / 1000;
  const oldDeductible = Math.round(oldInterest * ratio);
  const newDeductible = Math.round((oldInterest + newInterest) * ratio) -
    oldDeductible;
  const old = {
    lender_name: "Old Home Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: "Old 2025 Form 1098 Copy B",
    box1_mortgage_interest: oldInterest,
    box1_current_year_deductible_interest: oldDeductible,
    box1_deduction_workpaper_reference:
      "2025 Pub 936 Table 1 cashout workpaper",
    box2_outstanding_principal: 200_000,
    box3_origination_date: "01/15/2020",
    issuer_copy: await copy(
      "Old Home Lender",
      oldInterest,
      200_000,
      "01/15/2020",
    ),
  };
  const fresh = {
    lender_name: "New Home Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: "New 2025 Form 1098 Copy B",
    box1_mortgage_interest: newInterest,
    box1_current_year_deductible_interest: newDeductible,
    box1_deduction_workpaper_reference:
      "2025 Pub 936 Table 1 cashout workpaper",
    box2_outstanding_principal: 250_000,
    box3_origination_date: `${String(refinanceMonth).padStart(2, "0")}/01/2025`,
    refinance: true,
    issuer_copy: await copy(
      "New Home Lender",
      newInterest,
      250_000,
      `${String(refinanceMonth).padStart(2, "0")}/01/2025`,
    ),
  };
  const review = {
    old_source_document_reference: old.source_document_reference,
    new_source_document_reference: fresh.source_document_reference,
    property_reference: "2025 principal residence",
    original_acquisition_closing_reference:
      "2020 home purchase closing disclosure",
    original_acquisition_property_reference: "2025 principal residence",
    original_acquisition_principal: 200_000,
    refinance_closing_disclosure_reference: "2025 refinance closing disclosure",
    refinance_property_reference: "2025 principal residence",
    old_loan_payoff_reference: "2025 old lender payoff receipt",
    personal_cashout_use_ledger_reference:
      "2025 personal cashout disbursement ledger",
    closing_disbursements: [{
      purpose: "old_acquisition_loan_payoff" as const,
      amount: 200_000,
      paid_on: `2025-${String(refinanceMonth).padStart(2, "0")}-01`,
      payment_record_reference: "2025 closing wire to old lender",
      payoff_receipt_reference: "2025 old lender payoff receipt",
    }, {
      purpose: "personal_cashout" as const,
      amount: 50_000,
      paid_on: `2025-${String(refinanceMonth).padStart(2, "0")}-01`,
      payment_record_reference: "2025 closing personal disbursement",
    }],
    cashout_use_records: [{
      amount: 50_000,
      spent_on: `2025-${String(refinanceMonth).padStart(2, "0")}-15`,
      purpose: "personal_non_home_use" as const,
      bank_record_reference: "2025 personal-use bank disbursement",
      use_ledger_reference: "2025 personal cashout disbursement ledger",
    }],
    new_loan_proceeds_to_old_payoff: 200_000,
    new_loan_proceeds_to_personal_cashout: 50_000,
    refinance_month: refinanceMonth,
    closing_on_first_of_month_verified: true as const,
    all_qualified_home_mortgages_included_verified: true as const,
    no_other_advances_or_debt_categories_verified: true as const,
    filing_status_verified: "single" as const,
    old_loan_months: oldMonths,
    new_loan_months: newMonths,
  };
  return {
    f1098: [old, fresh],
    f1098_cashout_refinance_review: { cashout_refinance_review: review },
    expectedInterest: oldDeductible + newDeductible,
  };
}

Deno.test("cash-out refinance uses lender secured months for old debt and annual mixed-use balances for new debt", async () => {
  for (const month of [7, 4]) {
    const data = await source(month);
    const parsed = inputSchema.parse({
      f1098s: data.f1098,
      ...data.f1098_cashout_refinance_review,
    });
    assertEquals(
      parsed.f1098s.reduce(
        (sum, row) => sum + (row.box1_current_year_deductible_interest ?? 0),
        0,
      ),
      data.expectedInterest,
    );
    if (month === 7) assertEquals(data.expectedInterest, 12_406);
    if (month === 7) {
      assertEquals(data.f1098[0].box1_current_year_deductible_interest, 5_838);
      assertEquals(data.f1098[1].box1_current_year_deductible_interest, 6_568);
    }
    if (month === 4) assertEquals(data.expectedInterest, 12_151);
    const result = f1040_2025.executeReturn({
      ...base.inputs,
      schedule_a: { force_itemized: true },
      f1098: data.f1098,
      f1098_cashout_refinance_review: data.f1098_cashout_refinance_review,
    });
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(
      bundle.xml.includes(
        `<RptHomeMortgIntAndPointsAmt>${data.expectedInterest}</RptHomeMortgIntAndPointsAmt>`,
      ),
      true,
    );
    assertEquals(
      bundle.xml.includes("<HomeMortgNotUsedInd>X</HomeMortgNotUsedInd>"),
      true,
    );
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(xmlPath, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsdPath, xmlPath],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally {
      await Deno.remove(xmlPath);
    }
    const filled = await buildPdfBytes(
      bundle.pending,
      filer,
      ".pdf-cache",
      bundle,
    );
    assertEquals((await PDFDocument.load(filled)).getPageCount(), 3);
    let evidenceDir: string | undefined;
    try {
      evidenceDir = Deno.env.get("FORM1098_CASHOUT_EVIDENCE_DIR");
    } catch (error) {
      if (!(error instanceof Deno.errors.NotCapable)) throw error;
    }
    if (evidenceDir) {
      const packetDir = `${evidenceDir}/month-${month}`;
      await Deno.mkdir(packetDir, { recursive: true });
      await Deno.writeFile(`${packetDir}/return.pdf`, filled);
      await Deno.writeTextFile(`${packetDir}/return.xml`, bundle.xml);
      for (const [index, item] of data.f1098.entries()) {
        await Deno.writeFile(
          `${packetDir}/source-1098-${index + 1}.pdf`,
          item.issuer_copy.bytes,
        );
      }
      await Deno.writeTextFile(
        `${packetDir}/source.json`,
        JSON.stringify(
          {
            ...data,
            f1098: data.f1098.map((item) => ({
              ...item,
              issuer_copy: { ...item.issuer_copy, bytes: undefined },
            })),
          },
          null,
          2,
        ),
      );
    }
    const broken = structuredClone(data);
    broken.f1098_cashout_refinance_review.cashout_refinance_review
      .new_loan_months[0].closing_balance++;
    assertThrows(() =>
      inputSchema.parse({
        f1098s: broken.f1098,
        ...broken.f1098_cashout_refinance_review,
      })
    );
    const pendingBroken = structuredClone(bundle.pending);
    const sourcePending = pendingBroken as Record<string, unknown>;
    const form1098Pending = sourcePending.f1098 as {
      cashout_refinance_review: {
        new_loan_months: Array<{ closing_balance: number }>;
      };
    };
    form1098Pending.cashout_refinance_review.new_loan_months[0]
      .closing_balance++;
    await assertRejects(() =>
      buildMefBundle(pendingBroken, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(pendingBroken, filer, ".pdf-cache")
    );
    const missingMortgageUse = structuredClone(bundle.pending);
    delete missingMortgageUse.schedule_a
      ?.home_mortgage_nonqualifying_use_review;
    await assertRejects(() =>
      buildMefBundle(missingMortgageUse, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(missingMortgageUse, filer, ".pdf-cache")
    );
    for (const sourceIndex of [0, 1]) {
      const changedCopy = structuredClone(bundle.pending);
      const mortgageSource = (changedCopy as Record<string, unknown>).f1098 as {
        f1098s: Array<{ issuer_copy: { pdf_sha256: string } }>;
      };
      mortgageSource.f1098s[sourceIndex].issuer_copy.pdf_sha256 = "0".repeat(
        64,
      );
      await assertRejects(() =>
        buildMefBundle(changedCopy, { filer, attachments: [] })
      );
      await assertRejects(() =>
        buildPdfBytes(changedCopy, filer, ".pdf-cache")
      );
    }
  }
});

Deno.test("cash-out refinance rejects changed closing, use, payoff, months, and filed interest", async () => {
  const data = await source();
  const raw = { f1098s: data.f1098, ...data.f1098_cashout_refinance_review };
  const changed = (mutate: (value: typeof raw) => void) => {
    const value = structuredClone(raw);
    mutate(value);
    assertThrows(() => inputSchema.parse(value));
  };
  changed((value) =>
    value.cashout_refinance_review.closing_disbursements[1].amount++
  );
  changed((value) =>
    value.cashout_refinance_review.cashout_use_records[0].amount++
  );
  changed((value) =>
    value.cashout_refinance_review.original_acquisition_property_reference =
      "different house"
  );
  changed((value) =>
    value.cashout_refinance_review.refinance_property_reference =
      "different house"
  );
  changed((value) =>
    value.cashout_refinance_review.closing_disbursements[0]
      .payoff_receipt_reference = "other payoff"
  );
  changed((value) =>
    value.cashout_refinance_review.cashout_use_records[0]
      .use_ledger_reference = "other use ledger"
  );
  changed((value) =>
    value.cashout_refinance_review.new_loan_proceeds_to_old_payoff++
  );
  changed((value) =>
    value.cashout_refinance_review.old_loan_months[5].closing_balance--
  );
  changed((value) =>
    value.cashout_refinance_review.new_loan_months[1].interest_paid++
  );
  changed((value) => value.f1098s[1].box1_current_year_deductible_interest++);
  changed((value) => value.f1098s[1].box2_outstanding_principal++);
  changed((value) => value.f1098s[1].box3_origination_date = "02/30/2025");
  changed((value) => value.f1098s.push(structuredClone(value.f1098s[1])));
  changed((value) =>
    value.cashout_refinance_review.cashout_use_records[0].spent_on =
      "2025-02-30"
  );
  const noReview = { f1098s: data.f1098 };
  assertThrows(() => inputSchema.parse(noReview));
});
