import { assertEquals, assertRejects } from "@std/assert";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import {
  reconcileForm8801CarryRecord,
  stageForm8801CarryRecord,
} from "./form8801_carry_record.ts";
import { sha256Hex } from "../../execution/prepared-source.ts";
const priorXml =
  '<Return xmlns="http://www.irs.gov/efile"><ReturnHeader><TaxYr>2024</TaxYr><TaxPeriodBeginDt>2024-01-01</TaxPeriodBeginDt><TaxPeriodEndDt>2024-12-31</TaxPeriodEndDt><ReturnTypeCd>1040</ReturnTypeCd><Filer><PrimarySSN>111223333</PrimarySSN></Filer></ReturnHeader><ReturnData><IRS1040 documentId="Prior1040"><IndividualReturnFilingStatusCd>1</IndividualReturnFilingStatusCd></IRS1040><IRS6251 documentId="Prior6251"><AGIOrAGILessDeductionAmt>100000</AGIOrAGILessDeductionAmt><ScheduleATaxesAmt>20000</ScheduleATaxesAmt><TotalRefundReceivedAmt>0</TotalRefundReceivedAmt><InvestmentInterestAmt>0</InvestmentInterestAmt><DepletionAmt>0</DepletionAmt><NetOperatingLossDeductionAmt>0</NetOperatingLossDeductionAmt><ExemptPrivateActivityBondsAmt>0</ExemptPrivateActivityBondsAmt><Section1202ExclusionAmt>0</Section1202ExclusionAmt><AdjustedRegularTaxAmt>8000</AdjustedRegularTaxAmt><AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt></IRS6251><IRS8801 documentId="Prior8801"><AMTCrCarryforwardToNextYearAmt>1000</AMTCrCarryforwardToNextYearAmt></IRS8801></ReturnData></Return>';
async function prior() {
  const bytes = new TextEncoder().encode(priorXml);
  return {
    binding: {
      reference: "prior-2024.xml",
      sha256: await sha256Hex(bytes),
      form6251_document_id: "Prior6251",
      form8801_document_id: "Prior8801",
    },
    documents: [{ reference: "prior-2024.xml", bytes }],
  };
}
async function staged() {
  const f = await fixture();
  f.inputs.w2[0].box1_wages = 30000;
  const p = await prior();
  const r = await stageForm8801CarryRecord(
    f.inputs,
    f.binding,
    f.documents,
    p.binding,
    p.documents,
    "carry-2025.json",
  );
  return { f, p, r };
}
Deno.test("8801 carry record persists exact partial credit and source bindings across disk round trip", async () => {
  const { f, p, r } = await staged();
  assertEquals([
    r.record.credit_used,
    r.record.credit_carryforward,
    r.record.status,
  ], [1475, 3707, "local_unfiled"]);
  const directory = await Deno.makeTempDir({ prefix: "opentax-8801-carry-" });
  try {
    await Deno.writeFile(`${directory}/carry.json`, r.bytes, { mode: 0o600 });
    const bytes = await Deno.readFile(`${directory}/carry.json`);
    const read = await reconcileForm8801CarryRecord(
      f.inputs,
      f.binding,
      f.documents,
      p.binding,
      p.documents,
      r.binding,
      [{ reference: r.binding.reference, bytes }],
    );
    assertEquals(read.local_opening_preview, {
      tax_year: 2026,
      taxpayer_ssn: "111223333",
      prior_credit_carryforward: 3707,
    });
    assertEquals([
      read.localCarryRecordReconciled,
      read.acceptedFilingCarryRecordVerified,
      read.nextYearFilingImportAllowed,
    ], [true, false, false]);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
Deno.test("8801 carry record rejects rehashed changed carry, identities, years and caller acceptance", async () => {
  const { f, p, r } = await staged();
  for (
    const changed of [
      { ...r.record, credit_carryforward: 3708 },
      { ...r.record, taxpayer_ssn: "999887777" },
      { ...r.record, opening_tax_year: 2027 },
      { ...r.record, status: "accepted" },
      { ...r.record, current_acceptance_verified: true },
      { ...r.record, next_year_filing_import_allowed: true },
    ]
  ) {
    const bytes = new TextEncoder().encode(JSON.stringify(changed));
    const binding = { ...r.binding, sha256: await sha256Hex(bytes) };
    await assertRejects(
      () =>
        reconcileForm8801CarryRecord(
          f.inputs,
          f.binding,
          f.documents,
          p.binding,
          p.documents,
          binding,
          [{ reference: binding.reference, bytes }],
        ),
      Error,
      "differs from recomputed",
    );
  }
});
Deno.test("8801 carry record binds public source changes even when carry amount stays the same", async () => {
  const { f, p, r } = await staged();
  f.inputs.w2[0].box2_fed_withheld++;
  await assertRejects(
    () =>
      reconcileForm8801CarryRecord(
        f.inputs,
        f.binding,
        f.documents,
        p.binding,
        p.documents,
        r.binding,
        [{ reference: r.binding.reference, bytes: r.bytes }],
      ),
    Error,
    "differs from recomputed",
  );
});
Deno.test("8801 carry record preserves zero and nonpositive availability without inventing carry", async () => {
  const facts = packageFacts();
  facts.prior_form6251.line10 = 0;
  const f = await fixture(facts), p = await prior();
  // Update retained source consistently to the reviewed zero regular-tax amount.
  const bytes = new TextEncoder().encode(
    priorXml.replace(
      "<AdjustedRegularTaxAmt>8000</AdjustedRegularTaxAmt>",
      "<AdjustedRegularTaxAmt>0</AdjustedRegularTaxAmt>",
    ),
  );
  p.documents[0].bytes = bytes;
  p.binding.sha256 = await sha256Hex(bytes);
  const r = await stageForm8801CarryRecord(
    f.inputs,
    f.binding,
    f.documents,
    p.binding,
    p.documents,
    "zero-carry.json",
  );
  assertEquals([
    r.record.form8801_lines[21],
    r.record.credit_used,
    r.record.credit_carryforward,
  ], [-2818, 0, 0]);
});
Deno.test("8801 carry record source references stay distinct and changed source bytes reject", async () => {
  const { f, p, r } = await staged();
  await assertRejects(
    () =>
      stageForm8801CarryRecord(
        f.inputs,
        f.binding,
        f.documents,
        p.binding,
        p.documents,
        p.binding.reference,
      ),
    Error,
    "must differ",
  );
  const tampered = new Uint8Array(r.bytes);
  tampered[0]++;
  await assertRejects(
    () =>
      reconcileForm8801CarryRecord(
        f.inputs,
        f.binding,
        f.documents,
        p.binding,
        p.documents,
        r.binding,
        [{ reference: r.binding.reference, bytes: tampered }],
      ),
    Error,
    "differ from SHA-256",
  );
});
Deno.test("8801 carry-record verification owns all public facts and source bytes before await", async () => {
  const { f, p, r } = await staged();
  const computation = reconcileForm8801CarryRecord(
    f.inputs,
    f.binding,
    f.documents,
    p.binding,
    p.documents,
    r.binding,
    [{ reference: r.binding.reference, bytes: r.bytes }],
  );
  f.inputs.w2[0].box1_wages = 999999;
  f.documents[0].bytes.fill(0);
  p.documents[0].bytes.fill(0);
  r.bytes.fill(0);
  f.binding.sha256 = "0".repeat(64);
  const read = await computation;
  assertEquals(read.record.credit_carryforward, 3707);
});

Deno.test("8801 carry record keeps the prior MTFTCE workpaper year distinct from current credit carry", async () => {
  const facts = {
    ...packageFacts(),
    minimum_tax_foreign_credit_exclusion_workpaper: {
      reference: "mtftce",
      amount: 2230,
      method: "refigured_exclusion_items",
      refiguring: {
        tax_year: 2024,
        taxpayer_ssn: "111223333",
        reference: "mtftce-2024",
        simplified_limitation_election: true,
        categories: [{
          category: "general",
          reference: "general-2024",
          line9_regular_foreign_taxes: {
            reference: "regular-1116",
            amount: 3000,
          },
          line10_mtftce_carry: [],
          line12_tax_reduction: { reference: "reduction", amount: 0 },
          line13_high_tax_reclassification: { reference: "kickout", amount: 0 },
          line17_simplified_prior_amt: { reference: "amt-1116", amount: 30000 },
          line22_limitation_increase: { reference: "960", amount: 0 },
        }],
        line34_boycott_credit_reduction: { reference: "boycott", amount: 0 },
      },
    },
  };
  const f = await fixture(facts);
  f.inputs.w2[0].box1_wages = 30000;
  const p = await prior();
  const r = await stageForm8801CarryRecord(
    f.inputs,
    f.binding,
    f.documents,
    p.binding,
    p.documents,
    "foreign-carry-review.json",
  );
  assertEquals(r.record.credit_carryforward, 4625);
  assertEquals(r.record.opening_tax_year, 2026);
  assertEquals(r.record.mtftce_workpaper_records, [{
    category: "general",
    treaty_country: null,
    reference: "general-2024",
    originating_workpaper_year: 2024,
    next_workpaper_year: 2025,
    line14_minus_line21: 770,
  }]);
  assertEquals(r.record.next_year_filing_import_allowed, false);
});
