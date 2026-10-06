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
import {
  inputSchema as pointsInputSchema,
  refinancePointsDeduction,
} from "../nodes/inputs/mortgage_refinance_points/index.ts";

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
  recipient = "111-22-3333",
) {
  const pdf = await canonicalForm1098CopyDocument();
  const form = pdf.getForm();
  const prefix = "topmostSubform[0].CopyB[0]";
  for (
    const [field, value] of Object.entries({
      [`${prefix}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
      [`${prefix}.LeftCol[0].f2_2[0]`]: lender,
      [`${prefix}.LeftCol[0].f2_4[0]`]: `***-**-${recipient.slice(-4)}`,
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

async function sourceWithPoints(month: 4 | 7) {
  const mortgage = await source(month);
  const review = mortgage.f1098_cashout_refinance_review.cashout_refinance_review;
  const term = month === 7 ? 180 : 240;
  const points = {
    refinances: [{
      mortgage_id: "2025 principal residence refinance note",
      recipient_tin: "111-22-3333",
      lender_name: "New Home Lender",
      form1098_source_document_reference:
        mortgage.f1098[1].source_document_reference,
      closing_disclosure_reference:
        review.refinance_closing_disclosure_reference,
      pub936_workpaper_reference: "2025 Table 1 and points amortization ledger",
      refinance_close_year: 2025 as const,
      refinance_close_month: month,
      prior_qualified_home_debt: 200_000,
      refinanced_principal: 250_000,
      loan_term_months: term,
      total_points_charged: 5_000,
      points_for_nondeductible_services: 1_000,
      monthly_payment_records: review.new_loan_months.map((row) => ({
        month: row.month,
        document_reference: row.lender_statement_reference,
        paid_on: `2025-${String(row.month).padStart(2, "0")}-${
          new Date(Date.UTC(2025, row.month, 0)).getUTCDate()
        }`,
      })),
      qualified_home_secured_verified: true as const,
      points_not_reported_in_box6_verified: true as const,
      points_paid_directly_verified: true as const,
      acquisition_debt_limit_verified: true as const,
      cashout_points_payment: {
        paid_on: `2025-${String(month).padStart(2, "0")}-01`,
        payer_tin: "111-22-3333",
        payer_bank_record_reference: "Owner savings closing debit for points",
        payer_bank_debit_amount: 5_000,
        settlement_points_charged: 5_000,
        settlement_service_fee: 1_000,
        promissory_note_reference: "New lender signed term note",
        promissory_note_term_months: term,
        cash_method_verified: true as const,
        secured_by_principal_residence_verified: true as const,
        loan_terms_comparable_if_over_ten_years_verified: true as const,
        points_not_financed_verified: true as const,
      },
    }],
    cashout_source: {
      f1098s: mortgage.f1098,
      ...mortgage.f1098_cashout_refinance_review,
    },
  };
  return { mortgage, points };
}

Deno.test("cash-out refinance points use annual Table 1 ratio and actual loan-term payments", async () => {
  for (const month of [7, 4] as const) {
    const { mortgage, points } = await sourceWithPoints(month);
    // The July fractional ratable points ($133.333...) must survive until
    // the .973 Table 1 multiplication: $129.733... rounds to $130.
    const expectedPoints = month === 7 ? 130 : 146;
    assertEquals(refinancePointsDeduction(points), expectedPoints);
    const result = f1040_2025.executeReturn({
      ...base.inputs,
      schedule_a: { force_itemized: true },
      f1098: mortgage.f1098,
      f1098_cashout_refinance_review:
        mortgage.f1098_cashout_refinance_review,
      mortgage_refinance_points: points,
    });
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule_a?.line_8c_points_no_1098, expectedPoints);
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(bundle.xml.includes(
      `<Form1098PointsNotReportedAmt>${expectedPoints}</Form1098PointsNotReportedAmt>`,
    ), true);
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
    const filled = await buildPdfBytes(bundle.pending, filer, ".pdf-cache", bundle);
    assertEquals((await PDFDocument.load(filled)).getPageCount(), 3);
    let dir: string | undefined;
    try {
      dir = Deno.env.get("FORM1098_CASHOUT_POINTS_EVIDENCE_DIR");
    } catch (error) {
      if (!(error instanceof Deno.errors.NotCapable)) throw error;
    }
    if (dir) {
      const packetDir = `${dir}/month-${month}`;
      await Deno.mkdir(packetDir, { recursive: true });
      await Deno.writeTextFile(`${packetDir}/source.json`, JSON.stringify({
        f1098: mortgage.f1098,
        f1098_cashout_refinance_review:
          mortgage.f1098_cashout_refinance_review,
        mortgage_refinance_points: points,
      }));
      await Deno.writeTextFile(`${packetDir}/pending.json`, JSON.stringify(bundle.pending));
      await Deno.writeTextFile(`${packetDir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${packetDir}/return.pdf`, filled);
      for (const [index, loan] of mortgage.f1098.entries()) {
        await Deno.writeFile(
          `${packetDir}/source-1098-${index + 1}.pdf`,
          loan.issuer_copy.bytes,
        );
      }
    }
    const bad = structuredClone(bundle.pending);
    (bad.mortgage_refinance_points as typeof points).refinances[0]
      .cashout_points_payment.settlement_points_charged++;
    await assertRejects(() => buildMefBundle(bad, { filer, attachments: [] }));
    await assertRejects(() => buildPdfBytes(bad, filer, ".pdf-cache"));
    const mismatched = structuredClone(bundle.pending);
    (mismatched.mortgage_refinance_points as typeof points).cashout_source
      .cashout_refinance_review.new_loan_months[0].interest_paid++;
    await assertRejects(() => buildMefBundle(mismatched, { filer, attachments: [] }));
    await assertRejects(() => buildPdfBytes(mismatched, filer, ".pdf-cache"));
    const wrongFiledPoints = structuredClone(bundle.pending);
    wrongFiledPoints.schedule_a!.line_8c_points_no_1098 = expectedPoints + 1;
    await assertRejects(() =>
      buildMefBundle(wrongFiledPoints, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(wrongFiledPoints, filer, ".pdf-cache")
    );
  }
});

Deno.test("cash-out points reject missing and conflicting owner, settlement, note and payment records", async () => {
  const { points } = await sourceWithPoints(7);
  const changed = (mutate: (value: typeof points) => void) => {
    const value = structuredClone(points);
    mutate(value);
    assertThrows(() => pointsInputSchema.parse(value));
  };
  changed((value) => { delete (value as { cashout_source?: unknown }).cashout_source; });
  changed((value) => { value.refinances[0].cashout_points_payment.payer_tin = "999-88-7777"; });
  changed((value) => { value.refinances[0].cashout_points_payment.paid_on = "2025-07-02"; });
  changed((value) => { value.refinances[0].cashout_points_payment.settlement_service_fee++; });
  changed((value) => { value.refinances[0].cashout_points_payment.payer_bank_debit_amount++; });
  changed((value) => { value.refinances[0].cashout_points_payment.promissory_note_term_months++; });
  changed((value) => { value.refinances[0].monthly_payment_records[0].paid_on = "2025-07-32"; });
  changed((value) => { value.refinances[0].monthly_payment_records[0].document_reference = "different lender statement"; });
  changed((value) => { value.refinances[0].closing_disclosure_reference = "different property closing"; });
  changed((value) => { value.refinances[0].refinanced_principal++; });
});

async function sourceWithImprovement(month: 4 | 7) {
  const prior = await sourceWithPoints(month);
  const mortgage = structuredClone(prior.mortgage) as typeof prior.mortgage;
  const points = structuredClone(prior.points) as typeof prior.points;
  const review = mortgage.f1098_cashout_refinance_review
    .cashout_refinance_review as Record<string, any>;
  const count = 13 - month;
  const newMonths = Array.from({ length: count }, (_, index) => {
    const opening = 300_000 - 10_000 * index;
    return {
      month: month + index,
      opening_balance: opening,
      principal_paid_before_month_end: 10_000,
      closing_balance: opening - 10_000,
      interest_paid: opening / 200,
      lender_statement_reference: `New lender 2025-${month + index} statement`,
    };
  });
  const interest = newMonths.reduce((sum, row) => sum + row.interest_paid, 0);
  const qualifiedClosings = newMonths.reduce((sum, _row, index) =>
    sum + 250_000 - Math.max(0, 10_000 * (index + 1) - 50_000), 0);
  const fullClosings = newMonths.reduce((sum, row) =>
    sum + row.closing_balance, 0);
  const ratio = Math.round(
    (200_000 + qualifiedClosings / 12) /
      (200_000 + fullClosings / 12) * 1000,
  ) / 1000;
  const oldInterest = mortgage.f1098[0].box1_mortgage_interest;
  const oldAllowed = Math.round(oldInterest * ratio);
  const totalAllowed = Math.round((oldInterest + interest) * ratio);
  mortgage.f1098[0].box1_current_year_deductible_interest = oldAllowed;
  mortgage.f1098[1].box1_mortgage_interest = interest;
  mortgage.f1098[1].box1_current_year_deductible_interest =
    totalAllowed - oldAllowed;
  mortgage.f1098[1].box2_outstanding_principal = 300_000;
  mortgage.f1098[1].issuer_copy = await copy(
    "New Home Lender", interest, 300_000,
    `${String(month).padStart(2, "0")}/01/2025`,
  );
  review.new_loan_months = newMonths;
  review.new_loan_proceeds_to_home_improvement = 50_000;
  review.home_improvement_invoice_ledger_reference =
    "2025 substantial roof replacement contractor ledger";
  review.main_home_substantial_improvement_verified = true;
  const spentOn = `2025-${String(month).padStart(2, "0")}-01`;
  const invoiceRecord = {
    document_type: "contractor_invoice",
    contractor_name: "Roof Specialist LLC",
    billed_to_tin: "111-22-3333",
    property_reference: "2025 principal residence",
    invoice_reference: "2025 structural roof replacement completion invoice",
    invoice_ledger_reference:
      "2025 substantial roof replacement contractor ledger",
    amount: 50_000,
    completed_on: spentOn,
    description: "Structural roof replacement prolongs the home's useful life",
  };
  const paymentRecord = {
    document_type: "bank_payment",
    payer_tin: "111-22-3333",
    payee: "Roof Specialist LLC",
    payment_reference: "2025 escrow wire to roof contractor",
    amount: 50_000,
    paid_on: spentOn,
  };
  async function retainedJson(fileName: string, document: unknown) {
    const bytes = new TextEncoder().encode(JSON.stringify(document));
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return {
      file_name: fileName,
      sha256: Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
      bytes,
    };
  }
  review.closing_disbursements = [review.closing_disbursements[0], {
    purpose: "home_improvement",
    amount: 50_000,
    paid_on: `2025-${String(month).padStart(2, "0")}-01`,
    payment_record_reference: "2025 escrow wire to roof contractor",
  }, review.closing_disbursements[1]];
  review.improvement_use_records = [{
    amount: 50_000,
    spent_on: spentOn,
    property_reference: "2025 principal residence",
    contractor_invoice_reference:
      "2025 structural roof replacement completion invoice",
    contractor_payment_reference: "2025 escrow wire to roof contractor",
    contractor_name: "Roof Specialist LLC",
    invoice_ledger_reference:
      "2025 substantial roof replacement contractor ledger",
    substantial_improvement_description:
      "Structural roof replacement prolongs the home's useful life",
    contractor_invoice_document: await retainedJson(
      `roof-invoice-${month}.json`, invoiceRecord,
    ),
    contractor_payment_document: await retainedJson(
      `roof-payment-${month}.json`, paymentRecord,
    ),
  }];
  const item = points.refinances[0] as Record<string, any>;
  item.refinanced_principal = 300_000;
  item.total_points_charged = 6_000;
  item.points_for_nondeductible_services = 1_000;
  item.cashout_points_payment.settlement_points_charged = 6_000;
  item.cashout_points_payment.payer_bank_debit_amount = 6_000;
  item.improvement = {
    amount_used_to_substantially_improve_main_home: 50_000,
    improvement_expense_records_reference:
      "2025 substantial roof replacement contractor ledger",
    main_home_and_substantial_improvement_verified: true,
    pub936_immediate_points_tests_1_through_6_verified: true,
    points_paid_with_own_funds_verified: true,
    local_points_practice_review: {
      established_practice_evidence_reference:
        "2025 local lender discount-point practice review",
      customary_charge_evidence_reference:
        "2025 local 2-point rate comparison",
      customary_interest_points_percent_ceiling: 2,
      separate_service_charge_settlement_reference:
        "2025 closing disclosure separate $1000 service fee line",
    },
  };
  points.cashout_source = {
    f1098s: mortgage.f1098,
    ...mortgage.f1098_cashout_refinance_review,
  };
  const interestLike = 5_000;
  const immediate = interestLike * 50_000 / 300_000;
  const expectedPoints = Math.round((immediate +
    (interestLike - immediate) * count / item.loan_term_months) * ratio);
  return { mortgage, points, ratio, totalAllowed, expectedPoints };
}

Deno.test("one mixed refinance sources home improvement and personal use before interest and points limits", async () => {
  for (const month of [7, 4] as const) {
    const { mortgage, points, ratio, totalAllowed, expectedPoints } =
      await sourceWithImprovement(month);
    assertEquals(ratio, month === 7 ? .975 : .978);
    assertEquals(totalAllowed, month === 7 ? 13_894 : 14_377);
    assertEquals(expectedPoints, month === 7 ? 948 : 968);
    assertEquals(refinancePointsDeduction(points), expectedPoints);
    const result = f1040_2025.executeReturn({
      ...base.inputs,
      schedule_a: { force_itemized: true },
      f1098: mortgage.f1098,
      f1098_cashout_refinance_review:
        mortgage.f1098_cashout_refinance_review,
      mortgage_refinance_points: points,
    });
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule_a?.line_8c_points_no_1098, expectedPoints);
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(bundle.xml.includes(
      `<RptHomeMortgIntAndPointsAmt>${totalAllowed}</RptHomeMortgIntAndPointsAmt>`,
    ), true);
    assertEquals(bundle.xml.includes(
      `<Form1098PointsNotReportedAmt>${expectedPoints}</Form1098PointsNotReportedAmt>`,
    ), true);
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(xmlPath, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsdPath, xmlPath],
        stdout: "piped", stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally { await Deno.remove(xmlPath); }
    const filled = await buildPdfBytes(bundle.pending, filer, ".pdf-cache", bundle);
    assertEquals((await PDFDocument.load(filled)).getPageCount(), 3);
    let dir: string | undefined;
    try { dir = Deno.env.get("FORM1098_IMPROVEMENT_EVIDENCE_DIR"); }
    catch (error) { if (!(error instanceof Deno.errors.NotCapable)) throw error; }
    if (dir) {
      const path = `${dir}/month-${month}`;
      await Deno.mkdir(path, { recursive: true });
      await Deno.writeTextFile(`${path}/source.json`, JSON.stringify({
        f1098: mortgage.f1098,
        f1098_cashout_refinance_review:
          mortgage.f1098_cashout_refinance_review,
        mortgage_refinance_points: points,
      }));
      await Deno.writeTextFile(`${path}/pending.json`, JSON.stringify(bundle.pending));
      await Deno.writeTextFile(`${path}/return.xml`, bundle.xml);
      await Deno.writeFile(`${path}/return.pdf`, filled);
      for (const [index, loan] of mortgage.f1098.entries()) {
        await Deno.writeFile(`${path}/source-1098-${index + 1}.pdf`,
          loan.issuer_copy.bytes);
      }
      const invoice = (mortgage.f1098_cashout_refinance_review
        .cashout_refinance_review as Record<string, any>)
        .improvement_use_records[0];
      await Deno.writeFile(`${path}/${invoice.contractor_invoice_document.file_name}`,
        invoice.contractor_invoice_document.bytes);
      await Deno.writeFile(`${path}/${invoice.contractor_payment_document.file_name}`,
        invoice.contractor_payment_document.bytes);
    }
    const bad = structuredClone(bundle.pending);
    const review = ((bad as Record<string, unknown>).f1098 as
      Record<string, any>).cashout_refinance_review;
    review.improvement_use_records[0].amount++;
    await assertRejects(() => buildMefBundle(bad, { filer, attachments: [] }));
    await assertRejects(() => buildPdfBytes(bad, filer, ".pdf-cache"));
    const changedInvoiceBytes = structuredClone(bundle.pending);
    const filedReview = ((changedInvoiceBytes as Record<string, unknown>)
      .f1098 as Record<string, any>).cashout_refinance_review;
    filedReview.improvement_use_records[0].contractor_invoice_document
      .bytes[0] ^= 1;
    await assertRejects(() =>
      buildMefBundle(changedInvoiceBytes, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(changedInvoiceBytes, filer, ".pdf-cache")
    );
    const mismatchedValidCopy = structuredClone(bundle.pending);
    const copiedReview = ((mismatchedValidCopy as Record<string, unknown>)
      .mortgage_refinance_points as Record<string, any>).cashout_source
      .cashout_refinance_review;
    const document = copiedReview.improvement_use_records[0]
      .contractor_invoice_document;
    document.bytes = Uint8Array.from([...document.bytes, 32]);
    document.sha256 = Array.from(new Uint8Array(
      await crypto.subtle.digest("SHA-256", document.bytes),
    ), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await assertRejects(() =>
      buildMefBundle(mismatchedValidCopy, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(mismatchedValidCopy, filer, ".pdf-cache")
    );
    const lateDirectPayment = structuredClone(bundle.pending);
    const lateDay = `2025-${String(month).padStart(2, "0")}-02`;
    for (const copy of [
      (lateDirectPayment as Record<string, any>).f1098,
      (lateDirectPayment as Record<string, any>)
        .mortgage_refinance_points.cashout_source,
    ]) {
      const row = copy.cashout_refinance_review.improvement_use_records[0];
      row.spent_on = lateDay;
      for (const [key, dateField] of [
        ["contractor_invoice_document", "completed_on"],
        ["contractor_payment_document", "paid_on"],
      ] as const) {
        const document = row[key];
        const values = JSON.parse(new TextDecoder().decode(document.bytes));
        values[dateField] = lateDay;
        document.bytes = new TextEncoder().encode(JSON.stringify(values));
        document.sha256 = Array.from(new Uint8Array(
          await crypto.subtle.digest("SHA-256", document.bytes),
        ), (byte) => byte.toString(16).padStart(2, "0")).join("");
      }
    }
    assertThrows(() =>
      inputSchema.parse((lateDirectPayment as Record<string, unknown>).f1098)
    );
    await assertRejects(() =>
      buildMefBundle(lateDirectPayment, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(lateDirectPayment, filer, ".pdf-cache")
    );
  }
});

Deno.test("mixed refinance rejects unjoined contractor, property, debt-category and immediate-points evidence", async () => {
  const { mortgage, points } = await sourceWithImprovement(7);
  const mortgageRaw = {
    f1098s: mortgage.f1098,
    ...mortgage.f1098_cashout_refinance_review,
  };
  const changedMortgage = (mutate: (source: typeof mortgageRaw) => void) => {
    const source = structuredClone(mortgageRaw);
    mutate(source);
    assertThrows(() => inputSchema.parse(source));
  };
  changedMortgage((source) => {
    (source.cashout_refinance_review as Record<string, any>)
      .improvement_use_records[0].amount++;
  });
  changedMortgage((source) => {
    (source.cashout_refinance_review as Record<string, any>)
      .improvement_use_records[0].property_reference = "another house";
  });
  changedMortgage((source) => {
    (source.cashout_refinance_review as Record<string, any>)
      .improvement_use_records[0].contractor_invoice_document.bytes[0] ^= 1;
  });
  changedMortgage((source) => {
    (source.cashout_refinance_review as Record<string, any>)
      .improvement_use_records[0].contractor_payment_document.sha256 =
        "0".repeat(64);
  });
  changedMortgage((source) => {
    (source.cashout_refinance_review as Record<string, any>)
      .improvement_use_records[0].spent_on = "2025-06-30";
  });
  changedMortgage((source) => {
    (source.cashout_refinance_review as Record<string, any>)
      .closing_disbursements[1].amount++;
  });
  changedMortgage((source) => {
    (source.cashout_refinance_review as Record<string, any>)
      .new_loan_proceeds_to_home_improvement++;
  });
  changedMortgage((source) => {
    source.f1098s[1].box2_outstanding_principal++;
  });
  const changedPoints = (mutate: (source: typeof points) => void) => {
    const source = structuredClone(points);
    mutate(source);
    assertThrows(() => pointsInputSchema.parse(source));
  };
  changedPoints((source) => {
    ((source.refinances[0] as Record<string, any>).improvement)
      .amount_used_to_substantially_improve_main_home++;
  });
  changedPoints((source) => {
    ((source.refinances[0] as Record<string, any>).improvement)
      .improvement_expense_records_reference = "unrelated contractor";
  });
  changedPoints((source) => {
    ((source.refinances[0] as Record<string, any>).improvement)
      .local_points_practice_review.customary_interest_points_percent_ceiling = 1;
  });
  changedPoints((source) => {
    (source.refinances[0] as Record<string, any>).cashout_points_payment
      .payer_bank_debit_amount--;
  });
  changedPoints((source) => {
    (source.refinances[0] as Record<string, any>).improvement = undefined;
  });
});

async function marriedImprovementSource(status: "mfj" | "mfs") {
  const baseSource = await sourceWithImprovement(7);
  const mortgage = structuredClone(baseSource.mortgage);
  const points = structuredClone(baseSource.points);
  const old = mortgage.f1098[0];
  const fresh = mortgage.f1098[1];
  const review = mortgage.f1098_cashout_refinance_review
    .cashout_refinance_review as Record<string, any>;
  const taxpayer = "111-22-3333";
  const spouse = status === "mfj" ? "444-55-6666" : "222-33-4444";
  const newBorrower = status === "mfj" ? spouse : taxpayer;
  review.filing_status_verified = status;
  review.original_acquisition_principal = 400_000;
  review.new_loan_proceeds_to_old_payoff = 400_000;
  review.closing_disbursements[0].amount = 400_000;
  review.old_loan_months = review.old_loan_months.map((row: any) => ({
    ...row,
    opening_balance: 400_000,
    closing_balance: 400_000,
    interest_paid: 2_000,
  }));
  review.new_loan_months = review.new_loan_months.map((
    row: any,
    index: number,
  ) => ({
    ...row,
    opening_balance: 500_000 - index * 10_000,
    closing_balance: 490_000 - index * 10_000,
    interest_paid: (500_000 - index * 10_000) / 200,
  }));
  old.box2_outstanding_principal = 400_000;
  old.box1_mortgage_interest = 12_000;
  old.issuer_copy = await copy(
    "Old Home Lender",
    12_000,
    400_000,
    "01/15/2020",
  );
  fresh.recipient_tin = newBorrower;
  fresh.box2_outstanding_principal = 500_000;
  fresh.box1_mortgage_interest = review.new_loan_months.reduce(
    (sum: number, row: any) => sum + row.interest_paid,
    0,
  );
  fresh.issuer_copy = await copy(
    "New Home Lender",
    fresh.box1_mortgage_interest,
    500_000,
    "07/01/2025",
    newBorrower,
  );
  const retainedJson = async (fileName: string, value: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const sha256 = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          bytes,
        ),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    return { file_name: fileName, sha256, bytes };
  };
  const invoice = JSON.parse(new TextDecoder().decode(
    review.improvement_use_records[0].contractor_invoice_document.bytes,
  ));
  const payment = JSON.parse(new TextDecoder().decode(
    review.improvement_use_records[0].contractor_payment_document.bytes,
  ));
  invoice.billed_to_tin = newBorrower;
  payment.payer_tin = newBorrower;
  review.improvement_use_records[0].contractor_invoice_document =
    await retainedJson(`${status}-roof-invoice.json`, invoice);
  review.improvement_use_records[0].contractor_payment_document =
    await retainedJson(`${status}-roof-payment.json`, payment);
  review.married_ownership_evidence = {
    taxpayer_tin: taxpayer,
    spouse_tin: spouse,
    property_title_document: await retainedJson(`${status}-title.json`, {
      document_type: "property_title",
      property_reference: review.property_reference,
      owner_tins: status === "mfj" ? [taxpayer, spouse] : [taxpayer],
      ...(status === "mfs" ? { noncommunity_property_verified: true } : {}),
    }),
    old_loan_document: await retainedJson(`${status}-old-note.json`, {
      document_type: "mortgage_note",
      property_reference: review.property_reference,
      closing_reference: review.original_acquisition_closing_reference,
      source_document_reference: old.source_document_reference,
      lender_name: old.lender_name,
      recipient_tin: taxpayer,
      principal: 400_000,
      borrower_tins: [taxpayer],
    }),
    new_loan_document: await retainedJson(`${status}-new-note.json`, {
      document_type: "mortgage_note",
      property_reference: review.property_reference,
      closing_reference: review.refinance_closing_disclosure_reference,
      source_document_reference: fresh.source_document_reference,
      lender_name: fresh.lender_name,
      recipient_tin: newBorrower,
      principal: 500_000,
      borrower_tins: status === "mfj" ? [taxpayer, spouse] : [taxpayer],
    }),
    interest_payment_document: await retainedJson(
      `${status}-interest-payments.json`,
      {
        document_type: "mortgage_payment_ledger",
        property_reference: review.property_reference,
        loans: [old, fresh].map((loan, index) => ({
          source_document_reference: loan.source_document_reference,
          payer_tin: index === 0 ? taxpayer : newBorrower,
          months:
            (index === 0 ? review.old_loan_months : review.new_loan_months)
              .map((row: any) => ({
                month: row.month,
                interest_paid: row.interest_paid,
                lender_statement_reference: row.lender_statement_reference,
              })),
        })),
      },
    ),
  };
  const ratio = Math.round(
    Math.min(status === "mfs" ? 375_000 : 750_000, 400_000 + 2_690_000 / 12) /
      (400_000 + 2_790_000 / 12) * 1_000,
  ) / 1_000;
  const totalInterest = Math.round(
    (old.box1_mortgage_interest +
      fresh.box1_mortgage_interest) * ratio,
  );
  old.box1_current_year_deductible_interest = Math.round(
    old.box1_mortgage_interest * ratio,
  );
  fresh.box1_current_year_deductible_interest = totalInterest -
    old.box1_current_year_deductible_interest;
  const item = points.refinances[0] as Record<string, any>;
  item.recipient_tin = newBorrower;
  item.refinanced_principal = 500_000;
  item.prior_qualified_home_debt = 400_000;
  item.cashout_points_payment.payer_tin = newBorrower;
  points.cashout_source = {
    f1098s: mortgage.f1098,
    ...mortgage.f1098_cashout_refinance_review,
  };
  return { mortgage, points, ratio, totalInterest, taxpayer, spouse };
}

Deno.test("married cash-out refinance uses owner-bound paid interest and separate MFS limit", async () => {
  for (const status of ["mfj", "mfs"] as const) {
    const source = await marriedImprovementSource(status);
    const { mortgage, points, ratio, totalInterest } = source;
    assertEquals(ratio, status === "mfj" ? .987 : .593);
    assertEquals(totalInterest, status === "mfj" ? 25_909 : 15_566);
    assertEquals(
      refinancePointsDeduction(points),
      status === "mfj" ? 642 : 385,
    );
    assertEquals(
      inputSchema.parse({
        f1098s: mortgage.f1098,
        ...mortgage.f1098_cashout_refinance_review,
      }).f1098s.length,
      2,
    );
    const general = {
      ...(base.inputs.general as Record<string, unknown>),
      filing_status: status,
      spouse_first_name: "Sam",
      spouse_last_name: "Example",
      spouse_ssn: source.spouse,
    };
    const result = f1040_2025.executeReturn({
      ...base.inputs,
      general,
      schedule_a: { force_itemized: true },
      f1098: mortgage.f1098,
      f1098_cashout_refinance_review: mortgage.f1098_cashout_refinance_review,
      mortgage_refinance_points: points,
    });
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule_a?.line_8a_mortgage_interest_1098,
      totalInterest,
    );
    assertEquals(
      result.pending.schedule_a?.line_8c_points_no_1098,
      status === "mfj" ? 642 : 385,
    );
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(
      bundle.xml.includes(
        `<RptHomeMortgIntAndPointsAmt>${totalInterest}</RptHomeMortgIntAndPointsAmt>`,
      ),
      true,
    );
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(path, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsdPath, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally {
      await Deno.remove(path);
    }
    const pdf = await buildPdfBytes(
      bundle.pending,
      filer,
      ".pdf-cache",
      bundle,
    );
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), 3);
    let evidenceDir: string | undefined;
    try {
      evidenceDir = Deno.env.get("FORM1098_MARRIED_EVIDENCE_DIR");
    } catch (error) {
      if (!(error instanceof Deno.errors.NotCapable)) throw error;
    }
    if (evidenceDir) {
      const dir = `${evidenceDir}/${status}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/source.json`,
        JSON.stringify({
          ...base.inputs,
          general,
          schedule_a: { force_itemized: true },
          f1098: mortgage.f1098,
          f1098_cashout_refinance_review:
            mortgage.f1098_cashout_refinance_review,
          mortgage_refinance_points: points,
        }),
      );
      await Deno.writeTextFile(
        `${dir}/pending.json`,
        JSON.stringify(bundle.pending),
      );
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      for (const [index, loan] of mortgage.f1098.entries()) {
        await Deno.writeFile(
          `${dir}/source-1098-${index + 1}.pdf`,
          loan.issuer_copy.bytes,
        );
      }
      const review = mortgage.f1098_cashout_refinance_review
        .cashout_refinance_review as Record<string, any>;
      for (
        const document of [
          ...Object.values(review.married_ownership_evidence).filter((
            value: any,
          ) =>
            value && typeof value === "object" &&
            value.bytes instanceof Uint8Array
          ),
          review.improvement_use_records[0].contractor_invoice_document,
          review.improvement_use_records[0].contractor_payment_document,
        ] as Array<{ file_name: string; bytes: Uint8Array }>
      ) {
        await Deno.writeFile(`${dir}/${document.file_name}`, document.bytes);
      }
    }
    const bad = structuredClone(bundle.pending);
    ((bad as Record<string, any>).f1098 as any).cashout_refinance_review
      .married_ownership_evidence
      .interest_payment_document.bytes[0] ^= 1;
    await assertRejects(() => buildMefBundle(bad, { filer, attachments: [] }));
    await assertRejects(() => buildPdfBytes(bad, filer, ".pdf-cache"));
    const conflict = (mutate: (value: typeof mortgage) => void) => {
      const value = structuredClone(mortgage);
      mutate(value);
      assertThrows(() =>
        inputSchema.parse({
          f1098s: value.f1098,
          ...value.f1098_cashout_refinance_review,
        })
      );
    };
    conflict((value) => {
      (value.f1098_cashout_refinance_review
        .cashout_refinance_review as Record<string, any>)
        .married_ownership_evidence.property_title_document.bytes[0] ^= 1;
    });
    conflict((value) => {
      (value.f1098_cashout_refinance_review
        .cashout_refinance_review as Record<string, any>)
        .married_ownership_evidence.interest_payment_document.sha256 = "0"
          .repeat(64);
    });
    conflict((value) => {
      value.f1098[1].recipient_tin = status === "mfj"
        ? "999-88-7777"
        : source.spouse;
    });
    conflict((value) => {
      value.f1098[1].box1_current_year_deductible_interest++;
    });
    const alteredLedger = structuredClone(mortgage);
    const ledgerDocument = (alteredLedger.f1098_cashout_refinance_review
      .cashout_refinance_review as Record<string, any>)
      .married_ownership_evidence.interest_payment_document;
    const ledger = JSON.parse(new TextDecoder().decode(ledgerDocument.bytes));
    ledger.loans[1].payer_tin = status === "mfs"
      ? source.spouse
      : "999-88-7777";
    ledgerDocument.bytes = new TextEncoder().encode(JSON.stringify(ledger));
    ledgerDocument.sha256 = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          ledgerDocument.bytes,
        ),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    assertThrows(() =>
      inputSchema.parse({
        f1098s: alteredLedger.f1098,
        ...alteredLedger.f1098_cashout_refinance_review,
      })
    );
    const alteredPending = structuredClone(bundle.pending);
    for (
      const source of [
        (alteredPending as Record<string, any>).f1098,
        (alteredPending as Record<string, any>).mortgage_refinance_points
          .cashout_source,
      ]
    ) {
      source.cashout_refinance_review.married_ownership_evidence
        .interest_payment_document = structuredClone(ledgerDocument);
    }
    await assertRejects(() =>
      buildMefBundle(alteredPending, { filer, attachments: [] })
    );
    await assertRejects(() =>
      buildPdfBytes(alteredPending, filer, ".pdf-cache")
    );
    if (status === "mfs") {
      const wrongSpouse = structuredClone(bundle.pending);
      ((wrongSpouse as Record<string, any>).f1098.cashout_refinance_review
        .married_ownership_evidence.spouse_tin) = "999-88-7777";
      await assertRejects(() =>
        buildMefBundle(wrongSpouse, { filer, attachments: [] })
      );
      await assertRejects(() =>
        buildPdfBytes(wrongSpouse, filer, ".pdf-cache")
      );
    }
  }
});

async function marriedCrossLoanSource(status: "mfj" | "mfs") {
  const data = await marriedImprovementSource(status);
  const mortgage = structuredClone(data.mortgage);
  const points = structuredClone(data.points);
  const review = mortgage.f1098_cashout_refinance_review
    .cashout_refinance_review as Record<string, any>;
  const owner = status === "mfj" ? data.spouse : data.taxpayer;
  const property = "2025 separate qualifying second home";
  const reference = "Second Home 2025 Form 1098 Copy B";
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    opening_balance: 300_000,
    principal_paid_before_month_end: 0,
    closing_balance: 300_000,
    interest_paid: 1_500,
    lender_statement_reference: `Second Home Lender 2025-${index + 1} statement`,
  }));
  const second = {
    lender_name: "Second Home Lender",
    recipient_tin: owner,
    source_document_reference: reference,
    box1_mortgage_interest: 18_000,
    box1_current_year_deductible_interest: 0,
    box1_deduction_workpaper_reference: "2025 combined homes Pub 936 Table 1",
    box2_outstanding_principal: 300_000,
    box3_origination_date: "05/15/2019",
    issuer_copy: await copy("Second Home Lender", 18_000, 300_000,
      "05/15/2019", owner),
  };
  const retainedJson = async (fileName: string, value: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest(
      "SHA-256", bytes,
    )), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return { file_name: fileName, sha256, bytes };
  };
  review.second_home_loan = {
    source_document_reference: reference,
    property_reference: property,
    purchase_closing_reference: "2019 second-home purchase closing disclosure",
    original_acquisition_principal: 300_000,
    monthly_records: months,
    title_document: await retainedJson(`${status}-second-title.json`, {
      document_type: "property_title", property_reference: property,
      owner_tins: [owner],
      ...(status === "mfs" ? { noncommunity_property_verified: true } : {}),
    }),
    purchase_note_document: await retainedJson(`${status}-second-note.json`, {
      document_type: "purchase_mortgage_note",
      property_reference: property,
      closing_reference: "2019 second-home purchase closing disclosure",
      source_document_reference: reference,
      lender_name: "Second Home Lender",
      recipient_tin: owner,
      borrower_tins: [owner],
      principal: 300_000,
    }),
    occupancy_document: await retainedJson(`${status}-second-occupancy.json`, {
      document_type: "second_home_occupancy_calendar",
      property_reference: property,
      held_out_for_rent_or_resale: false,
      fair_rental_days: 0,
      personal_use_dates: Array.from({ length: 30 }, (_, index) =>
        `2025-06-${String(index + 1).padStart(2, "0")}`),
    }),
    interest_payment_document: await retainedJson(`${status}-second-payments.json`, {
      document_type: "mortgage_payment_ledger",
      property_reference: property,
      source_document_reference: reference,
      payer_tin: owner,
      months: months.map((row) => ({
        month: row.month,
        interest_paid: row.interest_paid,
        lender_statement_reference: row.lender_statement_reference,
      })),
    }),
  };
  review.qualified_home_inventory_document = await retainedJson(
    `${status}-all-home-mortgages.json`, {
      document_type: "qualified_home_mortgage_inventory",
      filing_status: status,
      no_other_qualified_mortgages_verified: true,
      loans: [{ source_document_reference:
        review.old_source_document_reference,
        property_reference: review.property_reference },
      { source_document_reference: review.new_source_document_reference,
        property_reference: review.property_reference },
      { source_document_reference: reference, property_reference: property }],
    });
  mortgage.f1098.push(second);
  const ratio = Math.round((status === "mfs" ? 375_000 : 750_000) /
    (400_000 + 2_790_000 / 12 + 300_000) * 1_000) / 1_000;
  const oldInterest = mortgage.f1098[0].box1_mortgage_interest;
  const newInterest = mortgage.f1098[1].box1_mortgage_interest;
  const firstTwoAllowed = Math.round((oldInterest + newInterest) * ratio);
  const allAllowed = Math.round((oldInterest + newInterest + 18_000) * ratio);
  mortgage.f1098[0].box1_current_year_deductible_interest =
    Math.round(oldInterest * ratio);
  mortgage.f1098[1].box1_current_year_deductible_interest =
    firstTwoAllowed - mortgage.f1098[0].box1_current_year_deductible_interest;
  second.box1_current_year_deductible_interest = allAllowed - firstTwoAllowed;
  points.cashout_source = {
    f1098s: mortgage.f1098,
    ...mortgage.f1098_cashout_refinance_review,
  };
  return { mortgage, points, ratio, allAllowed, owner, spouse: data.spouse };
}

Deno.test("mixed cash-out and separate second-home debt share one sourced Table 1 for MFJ and MFS", async () => {
  for (const status of ["mfj", "mfs"] as const) {
    const { mortgage, points, ratio, allAllowed, spouse } =
      await marriedCrossLoanSource(status);
    assertEquals(ratio, status === "mfj" ? .804 : .402);
    assertEquals(allAllowed, status === "mfj" ? 35_577 : 17_789);
    assertEquals(refinancePointsDeduction(points), status === "mfj" ? 523 : 261);
    const general = {
      ...(base.inputs.general as Record<string, unknown>),
      filing_status: status,
      spouse_first_name: "Sam", spouse_last_name: "Example", spouse_ssn: spouse,
    };
    const inputs = {
      ...base.inputs, general, schedule_a: { force_itemized: true },
      f1098: mortgage.f1098,
      f1098_cashout_refinance_review: mortgage.f1098_cashout_refinance_review,
      mortgage_refinance_points: points,
    };
    assertEquals(inputSchema.parse({ f1098s: mortgage.f1098,
      ...mortgage.f1098_cashout_refinance_review }).f1098s.length, 3);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule_a?.line_8a_mortgage_interest_1098,
      allAllowed);
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(bundle.xml.includes(
      `<RptHomeMortgIntAndPointsAmt>${allAllowed}</RptHomeMortgIntAndPointsAmt>`), true);
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(xmlPath, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsdPath, xmlPath],
        stdout: "piped", stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally { await Deno.remove(xmlPath); }
    const pdf = await buildPdfBytes(bundle.pending, filer, ".pdf-cache", bundle);
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), 3);
    let dir: string | undefined;
    try { dir = Deno.env.get("FORM1098_CROSS_LOAN_EVIDENCE_DIR"); }
    catch (error) { if (!(error instanceof Deno.errors.NotCapable)) throw error; }
    if (dir) {
      const packet = `${dir}/${status}`;
      await Deno.mkdir(packet, { recursive: true });
      await Deno.writeTextFile(`${packet}/source.json`, JSON.stringify(inputs));
      await Deno.writeTextFile(`${packet}/pending.json`, JSON.stringify(bundle.pending));
      await Deno.writeTextFile(`${packet}/return.xml`, bundle.xml);
      await Deno.writeFile(`${packet}/return.pdf`, pdf);
      for (const [index, loan] of mortgage.f1098.entries()) {
        await Deno.writeFile(`${packet}/source-1098-${index + 1}.pdf`, loan.issuer_copy.bytes);
      }
      const review = mortgage.f1098_cashout_refinance_review
        .cashout_refinance_review as Record<string, any>;
      const documents = [review.qualified_home_inventory_document,
        ...Object.values(review.married_ownership_evidence).filter((item: any) =>
          item && item.bytes instanceof Uint8Array),
        ...Object.values(review.second_home_loan).filter((item: any) =>
          item && item.bytes instanceof Uint8Array),
        review.improvement_use_records[0].contractor_invoice_document,
        review.improvement_use_records[0].contractor_payment_document];
      for (const document of documents as Array<{file_name:string;bytes:Uint8Array}>) {
        await Deno.writeFile(`${packet}/${document.file_name}`, document.bytes);
      }
    }
    const wrongInventory = structuredClone(mortgage);
    (wrongInventory.f1098_cashout_refinance_review.cashout_refinance_review as
      Record<string, any>).qualified_home_inventory_document.bytes[0] ^= 1;
    assertThrows(() => inputSchema.parse({ f1098s: wrongInventory.f1098,
      ...wrongInventory.f1098_cashout_refinance_review }));
    const invalid = (mutate: (value: typeof mortgage) => void) => {
      const value = structuredClone(mortgage);
      mutate(value);
      assertThrows(() => inputSchema.parse({ f1098s: value.f1098,
        ...value.f1098_cashout_refinance_review }));
    };
    invalid((value) => { value.f1098.pop(); });
    invalid((value) => { value.f1098.push(structuredClone(value.f1098[2])); });
    invalid((value) => { value.f1098[2].box1_mortgage_interest++; });
    invalid((value) => { value.f1098[2].recipient_tin =
      status === "mfs" ? spouse : "999-88-7777"; });
    invalid((value) => { (value.f1098_cashout_refinance_review
      .cashout_refinance_review as Record<string, any>)
      .second_home_loan.monthly_records[0].closing_balance--; });
    const wrongOccupancy = structuredClone(bundle.pending);
    for (const source of [
      (wrongOccupancy as Record<string, any>).f1098,
      (wrongOccupancy as Record<string, any>).mortgage_refinance_points.cashout_source,
    ]) {
      const document = source.cashout_refinance_review.second_home_loan
        .occupancy_document;
      const record = JSON.parse(new TextDecoder().decode(document.bytes));
      record.fair_rental_days = 1;
      document.bytes = new TextEncoder().encode(JSON.stringify(record));
      document.sha256 = Array.from(new Uint8Array(await crypto.subtle.digest(
        "SHA-256", document.bytes,
      )), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    await assertRejects(() => buildMefBundle(wrongOccupancy, { filer, attachments: [] }));
    await assertRejects(() => buildPdfBytes(wrongOccupancy, filer, ".pdf-cache"));
    const wrongPayer = structuredClone(bundle.pending);
    for (const source of [
      (wrongPayer as Record<string, any>).f1098,
      (wrongPayer as Record<string, any>).mortgage_refinance_points.cashout_source,
    ]) {
      const document = source.cashout_refinance_review.second_home_loan
        .interest_payment_document;
      const record = JSON.parse(new TextDecoder().decode(document.bytes));
      record.payer_tin = status === "mfs" ? spouse : "999-88-7777";
      document.bytes = new TextEncoder().encode(JSON.stringify(record));
      document.sha256 = Array.from(new Uint8Array(await crypto.subtle.digest(
        "SHA-256", document.bytes,
      )), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    await assertRejects(() => buildMefBundle(wrongPayer, { filer, attachments: [] }));
    await assertRejects(() => buildPdfBytes(wrongPayer, filer, ".pdf-cache"));
    const wrongFiled = structuredClone(bundle.pending);
    ((wrongFiled as Record<string, any>).f1098.f1098s[2]
      .box1_current_year_deductible_interest)++;
    await assertRejects(() => buildMefBundle(wrongFiled, { filer, attachments: [] }));
    await assertRejects(() => buildPdfBytes(wrongFiled, filer, ".pdf-cache"));
  }
});
