import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  assertEquals,
  assertMatch,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../registry.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../builder.ts";
import { form4952Pdf } from "../../../forms/deductions/investments/f4952.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { withSyntheticForm1098Copy } from "../mortgage/review-1098-copy.fixture.ts";
import { PDFDocument } from "pdf-lib";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const royalty = {
  payer_name: "Patent Licensee",
  payer_tin: "123456789",
  recipient_tin: "111223333",
  box2_royalties: 800,
  box2_royalties_routing: "schedule_e" as const,
  box2_nonpassive_portfolio_investment_for_form4952_verified: true as const,
};
const trace = {
  tax_year: 2025 as const,
  owner_tin: "111223333",
  loan_id: "taxable-securities-loan",
  lender_statement_reference: "lender-2025-interest",
  loan_agreement_reference: "signed-securities-loan",
  disbursement_record_reference: "2025-direct-disbursement",
  purchase_record_reference: "2025-taxable-security-purchase",
  loan_date: "2025-01-10",
  direct_purchase_date: "2025-01-10",
  borrowed_principal: 10_000,
  direct_taxable_securities_purchase: 10_000,
  asset_id: "taxable-security-lot-1",
  no_other_loan_proceeds_use: true as const,
  no_tax_exempt_or_passive_activity_asset: true as const,
  investment_use_maintained_through_2025: true as const,
  lender_2025_interest_total: 300,
  interest_payments: [{
    payment_id: "2025-interest-payment",
    payment_date: "2025-12-31",
    payment_record_reference: "bank-payment-2025",
    interest_amount: 300,
  }],
};

async function filingInputs(interestPayers = [{
  payer_name: "Taxable Securities Bank",
  payer_tin: "222334444",
  recipient_tin: "111223333",
  source_document_reference: "issued-2025-interest-copy",
  box1: 500,
  investment_property_for_form4952: true,
}], debtTrace = trace) {
  return {
    ...base.inputs,
    f1098: [
      await withSyntheticForm1098Copy("form4952-royalty-trace", {
        lender_name: "Home Lender",
        recipient_tin: "111223333",
        source_document_reference: "2025-home-mortgage-copy",
        box1_mortgage_interest: 18_000,
        box1_current_year_deductible_interest: 18_000,
        box1_deduction_workpaper_reference: "2025-home-interest-workpaper",
        for_routing: "A",
      }),
    ],
    f1099m: [royalty],
    f1099int: interestPayers,
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    schedule_e: [{
      tsj: "T",
      property_description: "Patent royalty property",
      property_type: 6,
      activity_type: "D",
      fair_rental_days: 0,
      personal_use_days: 0,
      rent_income: 0,
      royalties_income: 800,
      form_1099_payments_made: false,
      f1099m_royalty_source: {
        payer_name: royalty.payer_name,
        payer_tin: royalty.payer_tin,
        recipient_tin: royalty.recipient_tin,
        box2_gross_royalties: 800,
      },
    }],
    form4952: {
      investment_interest_expense: debtTrace.lender_2025_interest_total,
      investment_interest_expense_excludes_royalty_attributable_interest: true,
      direct_debt_trace: debtTrace,
      amt_refigure: {
        prior_year_disallowed_interest: 0,
        interest_on_private_activity_bonds: 0,
        other_gross_income_adjustment: 0,
        qualified_dividends_adjustment: 0,
        net_disposition_gain_adjustment: 0,
        net_capital_gain_adjustment: 0,
        investment_expenses_adjustment: 0,
      },
    },
  };
}

async function filing(interestPayers?: Parameters<typeof filingInputs>[0]) {
  return execute(
    buildExecutionPlan(registry),
    registry,
    await filingInputs(interestPayers),
    { taxYear: 2025, formType: "f1040" },
  );
}

Deno.test("traced loan, royalty, and taxable interest reach the full native and filled PDF return", async () => {
  const result = await filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_e.royalty_income, 800);
  assertEquals(result.pending.schedule1.line5_schedule_e, 800);
  assertEquals(result.pending.form4952.line4a, 1300);
  assertEquals(result.pending.form4952.line8, 300);
  assertEquals(result.pending.schedule_a.line_9_investment_interest, 300);
  assertEquals(result.pending.f1040.line8_additional_income, 800);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 500);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 18_300);
  const pending = buildPending(result.pending);
  assertEquals(
    form4952Pdf.projectFields?.(pending.form4952!, normalizeAllPending(pending))
      ?.line8,
    300,
  );
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<InvestmentPropGrossIncomeAmt>1300</InvestmentPropGrossIncomeAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<TaxableInterestAmt>500</TaxableInterestAmt>",
  );
  const xsd = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = "/tmp/opentax-form4952-royalty-interest-review";
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}/filled-return.pdf`, pdf);
    await Deno.writeTextFile(`${directory}/return.xml`, bundle.xml);
    await Deno.writeTextFile(
      `${directory}/pending.json`,
      JSON.stringify(pending, null, 2),
    );
  }
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 7, true);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const pages = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(pages, "4a               1300");
    assertStringIncludes(pages, "300");
  } finally {
    await Deno.remove(pdfPath);
  }

  for (
    const changedTrace of [
      { ...trace, owner_tin: "999999999" },
      { ...trace, direct_taxable_securities_purchase: 9_999 },
      { ...trace, lender_2025_interest_total: 301 },
      {
        ...trace,
        interest_payments: [{
          ...trace.interest_payments[0],
          interest_amount: 299,
        }],
      },
    ]
  ) {
    const altered = {
      ...pending,
      form4952: { ...pending.form4952, direct_debt_trace: changedTrace },
    };
    await assertRejects(() =>
      buildMefBundle(altered as typeof pending, {
        filer: base.filer,
        attachments: [],
      })
    );
    await assertRejects(() => buildPdfBytes(altered, base.filer, ".pdf-cache"));
  }
  for (
    const altered of [
      {
        ...pending,
        f1099int: {
          f1099ints: [{
            ...pending.f1099int!.f1099ints[0],
            recipient_tin: "999999999",
          }],
        },
      },
      {
        ...pending,
        f1099int: {
          f1099ints: [{
            ...pending.f1099int!.f1099ints[0],
            box1: 501,
          }],
        },
      },
      {
        ...pending,
        form4952: { ...pending.form4952, source_1099_royalties: 801 },
      },
    ]
  ) {
    await assertRejects(() =>
      buildMefBundle(altered as typeof pending, {
        filer: base.filer,
        attachments: [],
      })
    );
    await assertRejects(() => buildPdfBytes(altered, base.filer, ".pdf-cache"));
  }
});

Deno.test("royalty and multiple owned interest payers reconcile individually through Schedule B and full return", async () => {
  const payers = [500, 750, 600].map((box1, i) => ({
    payer_name: `Investment Bank ${i + 1}`,
    payer_tin: `22233444${i}`,
    recipient_tin: "111223333",
    source_document_reference: `2025-INT-${i + 1}`,
    box1,
    investment_property_for_form4952: true,
  }));
  const result = await filing(payers);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952.source_1099_interest, [500, 750, 600]);
  assertEquals(result.pending.form4952.line4a, 2650);
  assertEquals(result.pending.form4952.line8, 300);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 1850);
  assertEquals(result.pending.f1040.line8_additional_income, 800);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 18300);
  const { f1040_2025 } = await import("../../../../index.ts");
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<InvestmentPropGrossIncomeAmt>2650</InvestmentPropGrossIncomeAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TaxableInterestAmt>1850</TaxableInterestAmt>",
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS1040ScheduleB");
  const xsd = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, prepared.bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await prepared.renderPdf();
  if (Deno.args.includes("--write-review-artifacts")) {
    const dir = "/tmp/opentax-form4952-royalty-multi-interest-review";
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeFile(`${dir}/filled-return.pdf`, pdf);
    await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
    await Deno.writeTextFile(
      `${dir}/pending.json`,
      JSON.stringify(result.pending, null, 2),
    );
  }
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const text = new TextDecoder().decode(extracted.stdout);
    for (const payer of payers) assertStringIncludes(text, payer.payer_name);
    const formText = text.split("\f").find((page) =>
      page.includes("Investment Interest Expense Deduction")
    )!;
    assertStringIncludes(formText, "2650");
    assertMatch(formText, /\b7\s+0\b/);
  } finally {
    await Deno.remove(pdfPath);
  }
  const raw = normalizeAllPending(result.pending);
  for (
    const alteredPayers of [
      payers.map((p, i) => ({
        ...p,
        box1: p.box1 + (i === 0 ? 1 : i === 1 ? -1 : 0),
      })),
      payers.map((p, i) => ({
        ...p,
        recipient_tin: i === 2 ? "999999999" : p.recipient_tin,
      })),
      payers.map((p, i) => ({
        ...p,
        source_document_reference: i === 2
          ? payers[0].source_document_reference
          : p.source_document_reference,
      })),
    ]
  ) {
    const altered = { ...raw, f1099int: { f1099ints: alteredPayers } };
    await assertRejects(() => f1040_2025.prepareReturn(altered, base.filer));
  }
});

Deno.test("Form4952 source cents reconcile before native/PDF whole-dollar filing", async () => {
  const debt = {
    ...trace,
    borrowed_principal: 10000.49,
    direct_taxable_securities_purchase: 10000.49,
    lender_2025_interest_total: 300.60,
    interest_payments: [
      {
        ...trace.interest_payments[0],
        payment_id: "paid-1",
        payment_record_reference: "bank-paid-1",
        interest_amount: 100.30,
      },
      {
        ...trace.interest_payments[0],
        payment_id: "paid-2",
        payment_record_reference: "bank-paid-2",
        interest_amount: 200.30,
      },
    ],
  };
  const inputs = await filingInputs(undefined, debt);
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952.line1, 300.60);
  assertEquals(result.pending.form4952.line8, 300.60);
  assertEquals(result.pending.schedule_a.line_9_investment_interest, 300.60);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<InvestmentInterestExpDeductAmt>301</InvestmentInterestExpDeductAmt>",
  );
  const root = Deno.args.includes("--write-review-artifacts")
    ? "/tmp/opentax-form4952-source-cents-proof-v5-oct6"
    : await Deno.makeTempDir({ prefix: "opentax-4952-source-cents-" });
  await Deno.mkdir(root, { recursive: true });
  await Deno.writeTextFile(`${root}/return.xml`, bundle.xml);
  const xsd = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const checked = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, `${root}/return.xml`],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  const origins: import("../../../builder.ts").PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  await Deno.writeFile(`${root}/filled-return.pdf`, pdf);
  for (
    const [name, value] of Object.entries({
      source: { inputs, filer: base.filer },
      pending,
      origins,
    })
  ) {
    await Deno.writeTextFile(
      `${root}/${name}.json`,
      JSON.stringify(value, null, 2),
    );
  }
  for (
    const changed of [
      { ...debt, direct_taxable_securities_purchase: 10000.48 },
      { ...debt, lender_2025_interest_total: 300.61 },
      {
        ...debt,
        interest_payments: debt.interest_payments.map((row, i) => ({
          ...row,
          interest_amount: i === 0 ? 100.31 : row.interest_amount,
        })),
      },
    ]
  ) {
    const altered = {
      ...pending,
      form4952: { ...pending.form4952, direct_debt_trace: changed },
    };
    await assertRejects(() =>
      buildMefBundle(altered, { filer: base.filer, attachments: [] })
    );
    await assertRejects(() => buildPdfBytes(altered, base.filer, ".pdf-cache"));
  }
  if (!Deno.args.includes("--write-review-artifacts")) {
    await Deno.remove(root, { recursive: true });
  }
});
