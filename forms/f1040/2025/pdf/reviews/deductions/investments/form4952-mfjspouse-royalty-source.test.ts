import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { FilingStatus as SourceFilingStatus } from "../../../../../nodes/types.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { registry } from "../../../../registry.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { withSyntheticForm1098Copy } from "../mortgage/review-1098-copy.fixture.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;
const spouseTin = "444556666";
const primaryTin = "111223333";
const royalty = {
  payer_name: "Spouse Patent Licensee",
  payer_tin: "123456789",
  recipient_tin: spouseTin,
  source_document_reference: "spouse-2025-misc-copy",
  box2_royalties: 800,
  box2_royalties_routing: "schedule_e" as const,
  box2_nonpassive_portfolio_investment_for_form4952_verified: true as const,
};
const trace = {
  tax_year: 2025 as const,
  owner_tin: primaryTin,
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
const filer = {
  ...base.filer,
  filingStatus: FilingStatus.MarriedFilingJointly,
  nameLine1: "ALEX AND SAM EXAMPLE",
  fullName: "Alex Example",
  spouse: {
    ssn: spouseTin,
    firstName: "Sam",
    lastName: "Example",
    nameControl: "EXAM",
  },
};

async function sourceInput() {
  return {
    ...base.inputs,
    general: {
      ...(base.inputs.general as Record<string, unknown>),
      filing_status: SourceFilingStatus.MFJ,
      spouse_first_name: "Sam",
      spouse_last_name: "Example",
      spouse_ssn: "444-55-6666",
      spouse_dob: "1987-03-10",
    },
    f1098: [
      await withSyntheticForm1098Copy("form4952-mfjspouse-source", {
        lender_name: "Home Lender",
        recipient_tin: primaryTin,
        source_document_reference: "2025-home-mortgage-copy",
        box1_mortgage_interest: 40_000,
        box1_current_year_deductible_interest: 40_000,
        box1_deduction_workpaper_reference: "2025-home-interest-workpaper",
        for_routing: "A",
      }),
    ],
    f1099m: [royalty],
    f1099int: [{
      payer_name: "Taxable Securities Bank",
      payer_tin: "222334444",
      recipient_tin: primaryTin,
      source_document_reference: "issued-2025-interest-copy",
      box1: 500,
      investment_property_for_form4952: true,
    }],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    schedule_e: [{
      tsj: "S",
      property_description: "Spouse patent royalty property",
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
        recipient_tin: spouseTin,
        source_document_reference: royalty.source_document_reference,
        box2_gross_royalties: 800,
      },
    }],
    form4952: {
      investment_interest_expense: 300,
      investment_interest_expense_excludes_royalty_attributable_interest: true,
      direct_debt_trace: trace,
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

Deno.test("MFJ spouse portfolio royalty and primary traced loan reconcile through Form 4952 and complete packet", async () => {
  const input = await sourceInput();
  const result = execute(buildExecutionPlan(registry), registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const normalized = normalizeAllPending(result.pending);
  assertEquals(
    (normalized.schedule_e.schedule_es as Array<{ tsj: string }>)[0].tsj,
    "S",
  );
  assertEquals(normalized.schedule_e.royalty_income, 800);
  assertEquals(normalized.schedule1.line5_schedule_e, 800);
  assertEquals(normalized.form4952.line4a, 1300);
  assertEquals(normalized.form4952.line8, 300);
  assertEquals(normalized.schedule_a.line_9_investment_interest, 300);
  assertEquals(normalized.f1040.line2b_taxable_interest, 500);
  assertEquals(normalized.f1040.line8_additional_income, 800);
  assertEquals(normalized.f1040.line12e_itemized_deductions, 40_300);
  assertEquals(normalized.f1040.line24_total_tax, 3846);
  assertEquals(normalized.f1040.line35a_refund, 7154);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    bundle.xml,
    "<InvestmentPropGrossIncomeAmt>1300</InvestmentPropGrossIncomeAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<InvestmentInterestExpDeductAmt>300</InvestmentInterestExpDeductAmt>",
  );
  const out = await Deno.makeTempDir({ prefix: "opentax-4952-mfjspouse-" });
  console.log("Form 4952 MFJ spouse source archive:", out);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    out + "/pdf-cache",
    bundle,
    origins,
  );
  const pages = (await PDFDocument.load(pdf)).getPageCount();
  assertEquals(pages >= 7, true);
  await Deno.writeTextFile(
    out + "/source.json",
    JSON.stringify(input, null, 2),
  );
  await Deno.writeTextFile(out + "/filer.json", JSON.stringify(filer, null, 2));
  await Deno.writeTextFile(
    out + "/pending.json",
    JSON.stringify(normalized, null, 2),
  );
  await Deno.writeTextFile(
    out + "/prepared.json",
    JSON.stringify(bundle.pending, null, 2),
  );
  await Deno.writeTextFile(
    out + "/carry.json",
    JSON.stringify(result.carryforwards, null, 2),
  );
  await Deno.writeTextFile(
    out + "/origins.json",
    JSON.stringify(origins, null, 2),
  );
  await Deno.writeTextFile(out + "/return.xml", bundle.xml);
  await Deno.writeFile(out + "/return.pdf", pdf);
  const xsd = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const checked = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, out + "/return.xml"],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
});

Deno.test("MFJ royalty path rejects mismatched spouse, property, interest, document and debt owners at both exporters", async () => {
  const input = await sourceInput();
  const result = execute(buildExecutionPlan(registry), registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const row = pending.schedule_e!.schedule_es![0];
  const misc = (pending as typeof pending & {
    f1099m: { f1099ms: Array<Record<string, unknown>> };
  }).f1099m.f1099ms[0];
  const interest = pending.f1099int!.f1099ints[0];
  const altered = [
    {
      pending,
      filer: { ...filer, filingStatus: FilingStatus.MarriedFilingSeparately },
    },
    {
      pending,
      filer: { ...filer, spouse: { ...filer.spouse, ssn: "999999999" } },
    },
    {
      pending: {
        ...pending,
        schedule_e: {
          ...pending.schedule_e,
          schedule_es: [{ ...row, tsj: "T" }],
        },
      },
      filer,
    },
    {
      pending: {
        ...pending,
        f1099m: { f1099ms: [{ ...misc, recipient_tin: "999999999" }] },
      },
      filer,
    },
    {
      pending: {
        ...pending,
        schedule_e: {
          ...pending.schedule_e,
          schedule_es: [{
            ...row,
            f1099m_royalty_source: {
              ...row.f1099m_royalty_source,
              source_document_reference: "other-issued-copy",
            },
          }],
        },
      },
      filer,
    },
    {
      pending: {
        ...pending,
        f1099int: { f1099ints: [{ ...interest, recipient_tin: "999999999" }] },
      },
      filer,
    },
    {
      pending: {
        ...pending,
        form4952: {
          ...pending.form4952,
          direct_debt_trace: { ...trace, owner_tin: "999999999" },
        },
      },
      filer,
    },
  ];
  for (const [index, changed] of altered.entries()) {
    await assertRejects(
      () =>
        buildMefBundle(changed.pending as typeof pending, {
          filer: changed.filer,
          attachments: [],
        }),
      Error,
    );
    await assertRejects(() =>
      buildPdfBytes(
        changed.pending as typeof pending,
        changed.filer,
        ".pdf-cache",
      ), Error);
  }
});
