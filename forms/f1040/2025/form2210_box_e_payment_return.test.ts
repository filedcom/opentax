import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { stageForm2210RegularNativeDocument } from "./form2210_regular_staged_native.ts";
import {
  stageForm2210BoxEActualWithholdingReturn,
  stageForm2210BoxEPaymentReturn,
} from "./form2210_box_e_payment_return.ts";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { sha256Hex } from "./prepared-source.ts";
import { passiveK1Inputs } from "./eic_passive_k1.fixture.ts";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";

function priorXml(ssn: string, agi: number, tax: number) {
  return new TextEncoder().encode(
    `<Return xmlns="http://www.irs.gov/efile"><ReturnHeader><TaxYr>2024</TaxYr><TaxPeriodBeginDt>2024-01-01</TaxPeriodBeginDt><TaxPeriodEndDt>2024-12-31</TaxPeriodEndDt><ReturnTypeCd>1040</ReturnTypeCd><Filer><PrimarySSN>${ssn}</PrimarySSN></Filer></ReturnHeader><ReturnData><IRS1040><IndividualReturnFilingStatusCd>3</IndividualReturnFilingStatusCd><AdjustedGrossIncomeAmt>${agi}</AdjustedGrossIncomeAmt><TaxLessCreditsAmt>${tax}</TaxLessCreditsAmt><TotalOtherTaxesAmt>0</TotalOtherTaxesAmt><TotalTaxAmt>${tax}</TotalTaxAmt><RefundableCreditsAmt>0</RefundableCreditsAmt></IRS1040></ReturnData></Return>`,
  );
}
async function fixture() {
  const template = passiveK1Inputs();
  const inputs: any = {
    general: {
      ...template.general,
      filing_status: "mfj",
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "444-55-6666",
      spouse_dob: "1984-01-01",
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
      spouse_can_be_claimed_as_dependent: false,
    },
    w2: [{ ...template.w2[0], box1_wages: 120000, box2_fed_withheld: 2000 }],
  };
  const r = f1040_2025.executeReturn(inputs);
  assertEquals(r.diagnostics, []);
  const p = normalizeAllPending(r.pending);
  const rows = [
    { owner: "taxpayer", ssn: "111223333", agi: 55000, tax: 3000 },
    { owner: "spouse", ssn: "444556666", agi: 45000, tax: 2000 },
  ];
  const documents = rows.map((row) => ({
    reference: `${row.owner}-2024.xml`,
    bytes: priorXml(row.ssn, row.agi, row.tax),
  }));
  const source = {
    current_filing_status: "married_filing_jointly",
    current_return_reference: "Reviewed public 2025 joint return",
    current_line22_tax_after_credits: p.f1040.line22_tax_after_credits,
    current_withholding_taxes: 2000,
    current_included_other_taxes: 0,
    current_included_refundable_credits: 0,
    current_schedule3_line11_withholding: 0,
    current_section965_exclusion: 0,
    prior_separate_returns: await Promise.all(rows.map(async (row, i) => ({
      owner: row.owner,
      tax_year: 2024,
      filing_status: "married_filing_separately",
      full_twelve_months: true,
      filed_return_reference: documents[i].reference,
      filed_return_sha256: await sha256Hex(documents[i].bytes),
      adjusted_gross_income: row.agi,
      line22_tax_after_credits: row.tax,
      included_other_taxes: 0,
      included_refundable_credits: 0,
    }))),
  };
  inputs.f2210 = { box_e_source: source, joint_filing_status_change: true };
  const review = {
    source_reference: "Constructed reviewed payment record",
    reviewer: "Payment reviewer",
    reviewed_on: "2026-04-16",
  };
  const ledger: any = {
    equal_installments: true,
    withholding_method: "equal_due_dates",
    withholding_review: review,
    early_filing_payment_exception: false,
    waiver_requested: false,
    disaster_relief: false,
    payments: ["2025-04-15", "2025-06-16", "2025-09-15", "2026-01-15"].map((
      paid_on,
      i,
    ) => ({
      payment_id: `timely-${i}`,
      taxpayer_ssn: "111223333",
      tax_year: 2025,
      kind: "estimated_tax",
      paid_on,
      amount_cents: 75000,
      ...review,
    })),
  };
  return { inputs, ledger, documents };
}

Deno.test("2210 payment staging derives safe harbor and withholding from actual public return and retained prior bytes", async () => {
  const { inputs, ledger, documents } = await fixture();
  const before = structuredClone(inputs);
  const r = await stageForm2210BoxEPaymentReturn(inputs, ledger, documents);
  assertEquals(r.filed_lines.line8, 5000);
  assertEquals(r.filed_lines.line9, 5000);
  assertEquals(r.filed_lines.line6, 2000);
  assertEquals(r.payment_worksheet.columns.map((c) => c.line10), [
    125000,
    125000,
    125000,
    125000,
  ]);
  assertEquals(r.payment_worksheet.columns.map((c) => c.line11), [
    125000,
    125000,
    125000,
    125000,
  ]);
  assertEquals(r.payment_worksheet.computed_penalty_cents, 0);
  assertEquals(r.payment_worksheet.requiredAnnualPaymentReconciled, true);
  assertEquals(r.payment_worksheet.withholdingReconciled, true);
  assertEquals(r.priorAcceptanceVerified, false);
  assertEquals(r.paymentAuthenticityVerified, false);
  assertEquals(r.filingReady, false);
  assertEquals(r.current_form1040.line38_underpayment_penalty, undefined);
  assertEquals(inputs, before);
  // The staging chain never opens the existing mandatory-attachment guard.
  for (const format of ["mef", "pdf"] as const) {
    await assertRejects(async () =>
      assertAttachmentCoverage(
        normalizeAllPending(f1040_2025.executeReturn(inputs).pending),
        format,
      )
    );
  }
});

Deno.test("2210 payment staging rejects detached finalized tax identity prior bytes and amount overrides", async () => {
  const changes: Array<(f: Awaited<ReturnType<typeof fixture>>) => void> = [
    (f) => f.inputs.w2[0].box1_wages += 10000,
    (f) => f.inputs.w2[0].box2_fed_withheld += 1,
    (f) => f.inputs.general.spouse_ssn = "999-88-7777",
    (f) => f.inputs.general.filing_status = "single",
    (f) => f.inputs.f2210.box_e_source.current_line22_tax_after_credits += 1,
    (f) =>
      f.inputs.f2210.box_e_source.prior_separate_returns[0]
        .line22_tax_after_credits += 1,
    (f) => f.documents[0].bytes[0] = 0,
    (f) => f.documents.splice(1, 1),
    (f) => f.ledger.payments[0].taxpayer_ssn = "444556666",
    (f) => f.ledger.required_annual_payment_dollars = 1,
    (f) => f.ledger.withholding = { amount_dollars: 0 },
    (f) => f.ledger.taxpayer_ssn = "444556666",
    (f) => f.inputs.f2210.underpayment_penalty = 1,
    (f) => f.inputs.f2210.annualized_method = true,
  ];
  for (const change of changes) {
    const f = await fixture();
    change(f);
    await assertRejects(() =>
      stageForm2210BoxEPaymentReturn(f.inputs, f.ledger, f.documents)
    );
  }
});

Deno.test("2210 payment staging snapshots caller inputs and prior bytes before asynchronous verification", async () => {
  const f = await fixture();
  const staged = stageForm2210BoxEPaymentReturn(
    f.inputs,
    f.ledger,
    f.documents,
  );
  f.documents[0].bytes.fill(0);
  f.inputs.w2[0].box1_wages = 1;
  f.ledger.payments[0].amount_cents = 1;
  const r = await staged;
  assertEquals(r.payment_worksheet.computed_penalty_cents, 0);
  assertEquals(r.payment_worksheet.payments[0].amount_cents, 75000);
});

Deno.test("2210 computed late-payment worksheet never injects a claimed Form 1040 penalty", async () => {
  const f = await fixture();
  f.ledger.payments = [];
  const r = await stageForm2210BoxEPaymentReturn(
    f.inputs,
    f.ledger,
    f.documents,
  );
  assert(r.payment_worksheet.computed_penalty_cents > 0);
  assertEquals(r.current_form1040.line38_underpayment_penalty, undefined);
  assertEquals(r.filingReady, false);
});

async function actualFixture(paid_on = "2025-01-02") {
  const f = await fixture();
  f.inputs.f2210.actual_withholding_dates_method = true;
  f.ledger.withholding_method = "actual_dates";
  f.ledger.payments = [{
    payment_id: "actual-payroll-credit",
    taxpayer_ssn: "111223333",
    tax_year: 2025,
    kind: "withholding",
    paid_on,
    amount_cents: 200000,
    source_reference: "Constructed issued dated payroll withholding statement",
    reviewer: "Payroll reviewer",
    reviewed_on: "2026-04-16",
  }];
  return f;
}

const regularNativeSchema = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS2210/IRS2210.xsd",
  import.meta.url,
).pathname;
let regularNativeSchemaAvailable = false;
try {
  Deno.statSync(regularNativeSchema);
  regularNativeSchemaAvailable = true;
} catch {
  // IRS schema bundles are private and are not distributed with the repo.
}

Deno.test({
  name:
    "2210 regular D/E native projection maps all represented cells and validates the retained IRS schema",
  ignore: !regularNativeSchemaAvailable,
}, async () => {
  const f = await actualFixture();
  const result = await stageForm2210RegularNativeDocument(
    f.inputs,
    f.ledger,
    f.documents,
  );
  assertEquals(result.line19_penalty_dollars, 102);
  assertEquals(result.current_form1040.line38_underpayment_penalty, undefined);
  assertEquals(result.filingReady, false);
  const xml = result.native_xml;
  for (
    const fragment of [
      "<ActuallyWithheldInd>X</ActuallyWithheldInd>",
      "<JointReturnInd>X</JointReturnInd>",
      "<RequiredAnnualPaymentAmt>5000</RequiredAnnualPaymentAmt>",
      "<EstimatedTaxPdAndWithheldAAmt>2000</EstimatedTaxPdAndWithheldAAmt>",
      "<UnderpaymentAAmt>0</UnderpaymentAAmt>",
      "<OverpaymentAAmt>750</OverpaymentAAmt>",
      "<TaxToBeAppliedBAmt>750</TaxToBeAppliedBAmt>",
      "<UnderpaymentBAmt>500</UnderpaymentBAmt>",
      "<TaxesDueColumnCAmt>500</TaxesDueColumnCAmt>",
      "<AppliedUnderpaymentCAmt>500</AppliedUnderpaymentCAmt>",
      "<UnderpaymentCAmt>1250</UnderpaymentCAmt>",
      "<TaxesDueColumnDAmt>1750</TaxesDueColumnDAmt>",
      "<UnderpaymentDAmt>1250</UnderpaymentDAmt>",
      "<TotalPenaltyAmt>102</TotalPenaltyAmt>",
    ]
  ) assertStringIncludes(xml, fragment);
  const directory = await Deno.makeTempDir({ prefix: "2210-native-review-" });
  try {
    const file = `${directory}/document.xml`;
    await Deno.writeTextFile(
      file,
      xml.replace(
        "<IRS2210>",
        '<IRS2210 xmlns="http://www.irs.gov/efile" documentId="Staged2210">',
      ),
    );
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", regularNativeSchema, file],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
  for (const format of ["mef", "pdf"] as const) {
    await assertRejects(async () =>
      assertAttachmentCoverage(
        normalizeAllPending(f1040_2025.executeReturn(f.inputs).pending),
        format,
      )
    );
  }
});

Deno.test("2210 native penalty rounds the exact rational directly without a cent-rounding bump", async () => {
  const f = await actualFixture();
  f.ledger.payments.push({
    ...f.ledger.payments[0],
    payment_id: "small-estimate",
    kind: "estimated_tax",
    paid_on: "2025-06-16",
    amount_cents: 83,
  });
  const result = await stageForm2210RegularNativeDocument(
    f.inputs,
    f.ledger,
    f.documents,
  );
  // Exact $101.499555... rounds to $101. Its cent worksheet rounds to
  // $101.50; rounding that intermediate a second time would wrongly give $102.
  assertEquals(
    result.actual_payment_worksheet.penalty_cents_numerator,
    "370473376",
  );
  assertEquals(result.actual_payment_worksheet.computed_penalty_cents, 10150);
  assertEquals(result.line19_penalty_dollars, 101);
  assertStringIncludes(
    result.native_xml,
    "<TotalPenaltyAmt>101</TotalPenaltyAmt>",
  );
});

Deno.test("2210 native source chain rejects detached calculated lines and unsupported balance facts", async () => {
  const original = await actualFixture();
  const variants = [
    (f: typeof original) => f.ledger.filed_lines = { line19: 1 },
    (f: typeof original) =>
      f.ledger.payments.push({
        ...f.ledger.payments[0],
        payment_id: "return-balance",
        kind: "return_balance",
        paid_on: "2026-03-01",
        amount_cents: 10000,
      }),
    (f: typeof original) => f.documents[0].bytes[0] ^= 1,
    (f: typeof original) => f.inputs.w2[0].box2_fed_withheld += 1,
    (f: typeof original) => f.ledger.payments[0].paid_on = "2025-12-31",
  ];
  for (const change of variants) {
    const f = await actualFixture();
    change(f);
    await assertRejects(() =>
      stageForm2210RegularNativeDocument(f.inputs, f.ledger, f.documents)
    );
  }
});

Deno.test("2210 simultaneous boxes D/E bind dated withholding to the executed return and compare methods", async () => {
  const f = await actualFixture();
  const r = await stageForm2210BoxEActualWithholdingReturn(
    f.inputs,
    f.ledger,
    f.documents,
  );
  assertEquals(r.actual_payment_worksheet.computed_penalty_cents, 10155);
  assertEquals(r.equal_payment_worksheet.computed_penalty_cents, 13966);
  assertEquals(r.actual_payment_worksheet.withholdingReconciled, true);
  assertEquals(r.actual_payment_worksheet.payments[0].kind, "withholding");
  assertEquals(r.reasons, { box_d: true, box_e: true });
  assertEquals(r.current_form1040.line38_underpayment_penalty, undefined);
  assertEquals((r as any).native_xml, undefined);
  assertEquals((r as any).pdf_fields, undefined);
  assertEquals(r.filingReady, false);
  for (const format of ["mef", "pdf"] as const) {
    await assertRejects(async () =>
      assertAttachmentCoverage(
        normalizeAllPending(f1040_2025.executeReturn(f.inputs).pending),
        format,
      )
    );
  }
});

Deno.test("2210 actual withholding staging rejects nonbeneficial elections and detached date/amount/method evidence", async () => {
  const changes: Array<(f: Awaited<ReturnType<typeof actualFixture>>) => void> =
    [
      (f) => f.ledger.payments[0].paid_on = "2025-12-31",
      (f) => f.ledger.payments[0].amount_cents -= 1,
      (f) => f.ledger.payments[0].paid_on = "2026-01-01",
      (f) => f.ledger.payments[0].taxpayer_ssn = "444556666",
      (f) => f.inputs.f2210.actual_withholding_dates_method = false,
      (f) => f.inputs.w2[0].box2_fed_withheld += 1,
      (f) => f.ledger.withholding_method = "equal_due_dates",
    ];
  for (const change of changes) {
    const f = await actualFixture();
    change(f);
    await assertRejects(() =>
      stageForm2210BoxEActualWithholdingReturn(f.inputs, f.ledger, f.documents)
    );
  }
  const f = await actualFixture();
  await assertRejects(() =>
    stageForm2210BoxEPaymentReturn(f.inputs, f.ledger, f.documents)
  );
});
