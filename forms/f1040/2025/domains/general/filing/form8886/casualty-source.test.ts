import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  type FilerIdentity,
  FilingStatus as HeaderStatus,
} from "../../../../../mef/header.ts";
import { disclosureFixture } from "./source.fixture.ts";
import { ReturnSourceKind, TaxBenefit } from "./source.ts";
import {
  reconcileForm8886CurrentReturnSources,
  returnSourceSha256,
} from "./return-sources.ts";
const general = {
  filing_status: FilingStatus.MFJ,
  digital_assets: false,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1980-01-01",
  spouse_first_name: "Bea",
  spouse_last_name: "Example",
  spouse_ssn: "444556666",
  spouse_dob: "1981-01-01",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const filer: FilerIdentity = {
  primarySSN: general.taxpayer_ssn,
  firstName: "Alex",
  firstNameWithInitial: "Alex",
  lastName: "Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  filingStatus: HeaderStatus.MarriedFilingJointly,
  spouse: {
    ssn: general.spouse_ssn,
    firstName: "Bea",
    lastName: "Example",
    nameControl: "EXAM",
  },
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};
const wage = {
  employer_name: "Example Employer",
  employer_ein: "123456789",
  employee_ssn: general.taxpayer_ssn,
  box1_wages: 3000000,
  box2_fed_withheld: 500000,
};
const casualty = {
  business_fmv_before: 4000000,
  business_fmv_after: 1500000,
  business_basis: 3500000,
  business_insurance: 500000,
  business_is_section_1231: true,
  business_property_description: "Workshop equipment",
  business_property_location: "Austin, TX",
  business_acquired_date: "2020-04-01",
  business_casualty_date: "2025-06-15",
  business_casualty_description: "Storm damaged workshop equipment",
  business_recipient_ssn: general.taxpayer_ssn,
  business_source_document_reference:
    "Reviewed casualty and insurance workpaper",
  business_source_transaction_id: "storm-equipment-1",
};
function execute(row = casualty) {
  return f1040_2025.executeReturn({ general, w2: [wage], form4684: row });
}
async function source(row = casualty, taxpayer = row.business_recipient_ssn) {
  return {
    disclosures: [{
      ...disclosureFixture,
      disclosure_id: "casualty-disclosure",
      taxpayer_ssn: taxpayer,
      anticipated_benefit_year_count: 1,
      total_investment_or_basis: row.business_basis,
      loss_basis_description:
        "Reviewed basis, FMV decline and insurance reimbursement.",
      transaction_steps:
        "Acquired workshop equipment in 2020; a storm damaged it in 2025 and insurance reimbursed part of the loss.",
      expected_tax_treatment:
        "Business casualty loss subject to the return's applicable limitations.",
      transactions: [{
        ...disclosureFixture.transactions[0],
        transaction_id: "reportable-storm-transaction",
        name: "Reviewed workshop casualty",
        initial_participation_year: 2020,
      }],
      benefits: [{
        ...disclosureFixture.benefits[0],
        kind: TaxBenefit.OrdinaryLoss,
        description:
          "Loss after reviewed basis, FMV and insurance, before other return limitations.",
        affected_tax_years: [2025],
        current_return_source_references: ["casualty-current-source"],
      }],
      current_return_links: [{
        reference: "casualty-current-source",
        source_kind: ReturnSourceKind.BusinessCasualty,
        source_document_reference: row.business_source_document_reference,
        source_transaction_id: row.business_source_transaction_id,
        reportable_transaction_id: "reportable-storm-transaction",
        source_row_sha256: await returnSourceSha256({
          kind: ReturnSourceKind.BusinessCasualty,
          row,
        }),
        relationship_review_reference:
          "Reviewed association of casualty source with disclosed transaction",
      }],
    }],
  };
}
Deno.test("Form 8886 casualty joins the actual loss after insurance through Form 4797, Schedule 1 and Form 1040", async () => {
  const result = execute();
  assertEquals(result.diagnostics, []);
  const disclosure = await source(),
    before = JSON.stringify({ result, disclosure });
  const rows = await reconcileForm8886CurrentReturnSources(
    disclosure,
    result,
    filer,
  );
  assertEquals(rows.length, 1);
  assertEquals(rows[0].gross_loss_before_limits, 2000000);
  assertEquals(result.pending.form4797.ordinary_gain_form4684, -2000000);
  assertEquals(result.pending.schedule1.line4_other_gains, -2000000);
  assertEquals(result.pending.f1040.line8_additional_income, -2000000);
  assertEquals(JSON.stringify({ result, disclosure }), before);
  assertEquals(Object.isFrozen(rows) && Object.isFrozen(rows[0]), true);
});
Deno.test("Form 8886 casualty source fingerprint ignores computed AGI context but retains insurance and workpaper facts", async () => {
  const contextualRow = { ...casualty, agi: 12345 };
  const hash = await returnSourceSha256({
    kind: ReturnSourceKind.BusinessCasualty,
    row: casualty,
  });
  assertEquals(
    await returnSourceSha256({
      kind: ReturnSourceKind.BusinessCasualty,
      row: contextualRow,
    }),
    hash,
  );
  const changed = { ...casualty, business_insurance: 600000 };
  const result = execute(changed);
  assertEquals(result.diagnostics, []);
  const awaitSource = await source();
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(awaitSource, result, filer),
    Error,
    "changed after disclosure review",
  );
});
Deno.test("Form 8886 casualty source requires its own recipient and reviewed source association", async () => {
  const result = execute(), disclosure = await source();
  await assertRejects(
    () =>
      reconcileForm8886CurrentReturnSources(
        {
          disclosures: [{
            ...disclosure.disclosures[0],
            taxpayer_ssn: general.spouse_ssn,
          }],
        },
        result,
        filer,
      ),
    Error,
    "casualty owner differs",
  );
  const mismatch = structuredClone(result);
  mismatch.pending.form4684.business_source_transaction_id = "another-event";
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(disclosure, mismatch, filer),
    Error,
    "retained source record",
  );
  const unidentified = structuredClone(result);
  delete unidentified.pending.form4684.business_recipient_ssn;
  await assertRejects(
    () =>
      reconcileForm8886CurrentReturnSources(disclosure, unidentified, filer),
    Error,
    "casualty owner differs",
  );
  const spouse = { ...casualty, business_recipient_ssn: general.spouse_ssn };
  const spouseResult = execute(spouse);
  assertEquals(spouseResult.diagnostics, []);
  assertEquals(
    (await reconcileForm8886CurrentReturnSources(
      await source(spouse),
      spouseResult,
      filer,
    ))[0].taxpayer_ssn,
    general.spouse_ssn,
  );
});
Deno.test("Form 8886 casualty proof rejects independently changed Form 4797, Schedule 1 and Form 1040 joins", async () => {
  const result = execute(), disclosure = await source();
  for (
    const [key, field] of [
      ["form4797", "ordinary_gain_form4684"],
      ["schedule1", "line4_other_gains"],
      ["schedule1", "line10_total_additional_income"],
      ["f1040", "line8_additional_income"],
    ]
  ) {
    const changed = structuredClone(result);
    changed.pending[key][field] = -1900000;
    await assertRejects(
      () => reconcileForm8886CurrentReturnSources(disclosure, changed, filer),
      Error,
    );
  }
  const { schedule1: _omitted, ...withoutSchedule1 } = result.pending;
  const missing = { ...result, pending: withoutSchedule1 };
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(disclosure, missing, filer),
    Error,
  );
});
Deno.test("Form 8886 casualty adapter preserves current native property/date/holding-period guards", async () => {
  for (
    const changed of [
      { ...casualty, business_casualty_date: "2024-06-15" },
      { ...casualty, business_casualty_date: "2025-02-30" },
      { ...casualty, business_acquired_date: "2025-01-01" },
      { ...casualty, business_is_section_1231: false },
    ]
  ) {
    const result = execute(changed);
    assertEquals(result.diagnostics, []);
    const awaitSource = await source(changed);
    await assertRejects(
      () => reconcileForm8886CurrentReturnSources(awaitSource, result, filer),
      Error,
    );
  }
});

Deno.test("Form 8886 current-source proof handles simultaneous casualty and broker disclosures without netting their source losses", async () => {
  const broker = {
    recipient_ssn: general.taxpayer_ssn,
    payer_tin: "333445555",
    account_number: "Acct1",
    source_document_reference: "Reviewed broker statement",
    transaction_id: "broker-sale-1",
    part: "D" as const,
    description: "Investment asset",
    date_acquired: "2024-01-01",
    date_sold: "2025-06-01",
    proceeds: 100000,
    cost_basis: 2100000,
  };
  const result = f1040_2025.executeReturn({
    general,
    w2: [wage],
    form4684: casualty,
    f1099b: [broker],
  });
  assertEquals(result.diagnostics, []);
  const casualtySource = await source();
  const capitalDisclosure = {
    ...disclosureFixture,
    current_return_links: [{
      reference:
        disclosureFixture.benefits[0].current_return_source_references[0],
      source_kind: ReturnSourceKind.BrokerSale,
      source_document_reference: broker.source_document_reference,
      source_transaction_id: broker.transaction_id,
      reportable_transaction_id:
        disclosureFixture.transactions[0].transaction_id,
      source_row_sha256: await returnSourceSha256({
        kind: ReturnSourceKind.BrokerSale,
        row: broker,
      }),
      relationship_review_reference: "Reviewed broker association",
    }],
  };
  const rows = await reconcileForm8886CurrentReturnSources(
    { disclosures: [...casualtySource.disclosures, capitalDisclosure] },
    result,
    filer,
  );
  assertEquals(rows.map((row) => row.gross_loss_before_limits), [
    2000000,
    2000000,
  ]);
  assertEquals(result.pending.f1040.line7_capital_gain, -3000);
  assertEquals(result.pending.f1040.line8_additional_income, -2000000);
});

Deno.test("Form 8886 casualty reconciliation snapshots the caller before asynchronous source hashing", async () => {
  const disclosure = await source(),
    result = execute(),
    identity = structuredClone(filer);
  const promise = reconcileForm8886CurrentReturnSources(
    disclosure,
    result,
    identity,
  );
  disclosure.disclosures[0].transaction_steps = "Changed caller";
  result.pending.form4684.business_insurance = 999999;
  result.pending.f1040.line8_additional_income = 99;
  Object.assign(identity, { primarySSN: "999887777" });
  const rows = await promise;
  assertEquals(rows[0].gross_loss_before_limits, 2000000);
  assertEquals(rows[0].taxpayer_ssn, general.taxpayer_ssn);
});

Deno.test("Form 8886 casualty link cannot use a zero-loss property record as a current deduction source", async () => {
  const zero = {
    ...casualty,
    business_fmv_before: 0,
    business_fmv_after: 0,
    business_basis: 0,
    business_insurance: 0,
  };
  const result = execute(zero);
  assertEquals(result.diagnostics, []);
  const disclosure = await source(zero);
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(disclosure, result, filer),
    Error,
    "modeled positive business loss",
  );
});
