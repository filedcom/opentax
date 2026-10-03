import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus as HeaderStatus } from "../mef/header.ts";
import { FilingStatus } from "../nodes/types.ts";
import { Form8949Part } from "../nodes/intermediate/forms/form8949/index.ts";
import { f1040_2025 } from "./index.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
import { scheduleDPdf } from "./pdf/forms/schedule_d.ts";

const general = {
  filing_status: FilingStatus.MFJ,
  digital_assets: false,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Test",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1980-01-01",
  spouse_first_name: "Bea",
  spouse_last_name: "Test",
  spouse_ssn: "222334444",
  spouse_dob: "1981-01-01",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const filer = {
  primarySSN: "111223333",
  firstNameWithInitial: "Alex",
  lastName: "Test",
  nameLine1: "ALEX TEST",
  nameControl: "TEST",
  filingStatus: HeaderStatus.MarriedFilingJointly,
  spouse: {
    ssn: "222334444",
    firstName: "Bea",
    lastName: "Test",
    nameControl: "TEST",
  },
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

const brokerRows = [
  {
    recipient_ssn: "111223333",
    payer_tin: "333445555",
    account_number: "Acct1",
    transaction_id: "sale1",
    part: Form8949Part.A,
    description: "Alpha",
    date_acquired: "2025-01-01",
    date_sold: "2025-06-01",
    proceeds: 1_000,
    cost_basis: 700,
    federal_withheld: 30,
  },
  {
    recipient_ssn: "222334444",
    payer_tin: "444556666",
    account_number: "Acct2",
    transaction_id: "sale2",
    part: "D" as const,
    description: "Beta",
    date_acquired: "2020-01-01",
    date_sold: "2025-06-01",
    proceeds: 2_000,
    cost_basis: 1_000,
    federal_withheld: 50,
  },
];

Deno.test("joint return joins two broker copies through gains, withholding, native and PDF", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: brokerRows });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_d.print_line1a_gain, 300);
  assertEquals(result.pending.schedule_d.print_line8a_gain, 1_000);
  assertEquals(result.pending.f1040.line7_capital_gain, 1_300);
  assertEquals(result.pending.f1040.line25b_withheld_1099, 80);

  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, filer);
  assertStringIncludes(xml, "<CapitalGainLossAmt>1300</CapitalGainLossAmt>");
  assertStringIncludes(
    xml,
    "<Form1099WithheldTaxAmt>80</Form1099WithheldTaxAmt>",
  );
  const pdfContext = pending as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const form1040Print = irs1040Pdf.projectFields!(
    pending.f1040 ?? {},
    pdfContext,
  );
  const scheduleDPrint = scheduleDPdf.projectFields!(
    pending.schedule_d ?? {},
    pdfContext,
  );
  assertEquals(form1040Print.line7_capital_gain, 1_300);
  assertEquals(form1040Print.line25b_withheld_1099, 80);
  assertEquals(scheduleDPrint.print_line1a_gain, 300);
  assertEquals(scheduleDPrint.print_line8a_gain, 1_000);
  const pdf = await buildPdfBytes(pending, filer);
  assert(pdf.length > 100_000);
});

Deno.test("final exports reject a changed Form 1040 capital gain after Schedule D", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: brokerRows });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const changed = {
    ...pending,
    f1040: { ...pending.f1040, line7_capital_gain: 1_301 },
  };
  assertThrows(
    () => buildMefXml(changed, filer),
    Error,
    "Form 1040 line 7 must match finalized Schedule D",
  );
  await assertRejects(
    () => buildPdfBytes(changed, filer),
    Error,
    "Form 1040 line 7 must match finalized Schedule D",
  );
});

Deno.test("final exports reject a changed Schedule D total even with a matching Form 1040 gain", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: brokerRows });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const changed = {
    ...pending,
    schedule_d: {
      ...pending.schedule_d,
      print_line15_lt_total: 1_001,
      print_line16_combined: 1_301,
    },
    f1040: { ...pending.f1040, line7_capital_gain: 1_301 },
  };
  assertThrows(
    () => buildMefXml(changed, filer),
    Error,
    "Schedule D print lines 7, 15, and 16 differ",
  );
  await assertRejects(
    () => buildPdfBytes(changed, filer),
    Error,
    "Schedule D print lines 7, 15, and 16 differ",
  );
});

Deno.test("identified sale cannot be counted through both 1099-B and direct 8949", async () => {
  const direct = {
    part: Form8949Part.A,
    description: "Alpha",
    source_transaction_id: "sale1",
    date_acquired: "2025-01-01",
    date_sold: "2025-06-01",
    proceeds: 1_000,
    cost_basis: 700,
  };
  assertThrows(
    () =>
      f1040_2025.executeReturn({
        general,
        f1099b: brokerRows,
        f8949: [direct],
      }),
    Error,
    "repeat the same identified broker sale",
  );
  const result = f1040_2025.executeReturn({ general, f1099b: brokerRows });
  const pending = {
    ...buildPending(result.pending),
    f8949: { f8949s: [direct] },
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "repeat the same identified broker sale",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "repeat the same identified broker sale",
  );
});

Deno.test("the same sale label from separately referenced broker statements remains distinct", async () => {
  const result = f1040_2025.executeReturn({
    general,
    f1099b: [
      { ...brokerRows[0], source_document_reference: "broker-a-2025" },
    ],
    f8949: [{
      part: Form8949Part.A,
      description: "Other broker sale",
      source_transaction_id: "sale1",
      broker_statement_reference: "broker-b-2025",
      date_acquired: "2025-01-01",
      date_sold: "2025-06-01",
      proceeds: 200,
      cost_basis: 100,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line7_capital_gain, 400);
  const pending = buildPending(result.pending);
  assertStringIncludes(
    buildMefXml(pending, filer),
    "<CapitalGainLossAmt>400</CapitalGainLossAmt>",
  );
  assert((await buildPdfBytes(pending, filer)).length > 100_000);
});

Deno.test("broker copies reject no-1099 boxes while direct nonbroker sales keep them", async () => {
  const base = f1040_2025.executeReturn({ general, f1099b: brokerRows });
  assertEquals(base.diagnostics, []);
  for (const part of ["C", "F"] as const) {
    const invalid = f1040_2025.executeReturn({
      general,
      f1099b: [{ ...brokerRows[0], part }],
    });
    assert(
      invalid.diagnostics.some((diagnostic) =>
        diagnostic.nodeType === "start" && diagnostic.severity === "error" &&
        diagnostic.message.includes('"f1099b"') &&
        diagnostic.message.includes('"part"')
      ),
    );
    const changed = {
      ...buildPending(base.pending),
      f1099b: { f1099bs: [{ ...brokerRows[0], part }] },
    };
    assertThrows(
      () =>
        buildMefXml(
          changed as unknown as Parameters<typeof buildMefXml>[0],
          filer,
        ),
      Error,
    );
    await assertRejects(() => buildPdfBytes(changed, filer), Error);
  }

  const direct = f1040_2025.executeReturn({
    general,
    f8949: [{
      part: Form8949Part.C,
      description: "Unreported short sale",
      source_transaction_id: "direct-short",
      date_acquired: "2025-01-10",
      date_sold: "2025-06-20",
      proceeds: 1_000,
      cost_basis: 700,
    }, {
      part: Form8949Part.F,
      description: "Unreported long sale",
      source_transaction_id: "direct-long",
      date_acquired: "2020-01-10",
      date_sold: "2025-06-20",
      proceeds: 2_000,
      cost_basis: 1_000,
    }],
  });
  assertEquals(direct.diagnostics, []);
  assertEquals(direct.pending.f1040.line7_capital_gain, 1_300);
  const pending = buildPending(direct.pending);
  assertStringIncludes(
    buildMefXml(pending, filer),
    "<CapitalGainLossAmt>1300</CapitalGainLossAmt>",
  );
  assert((await buildPdfBytes(pending, filer)).length > 100_000);
});
