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
import { f8949, QsbsCode } from "../nodes/inputs/f8949/index.ts";
import { assertCapitalSaleSourceRows } from "./broker-sale-source-reconciliation.ts";
import { assertScheduleDSalesMatchPrepared } from "./mef/forms/schedule_d.ts";
import { f1040_2025 } from "./index.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
import { scheduleDPdf } from "./pdf/forms/schedule_d.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

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

Deno.test("broker sale without payer TIN or issued-copy reference rejects both final exports", async () => {
  const sale = { ...brokerRows[0], payer_tin: undefined };
  const result = f1040_2025.executeReturn({ general, f1099b: [sale] });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const message = "1099-B filing needs broker TIN or issued-copy reference";
  assertThrows(() => buildMefXml(pending, filer), Error, message);
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("identified broker sale needs a property description in both final exports", async () => {
  const sale = { ...brokerRows[0], description: "   " };
  const result = f1040_2025.executeReturn({ general, f1099b: [sale] });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const message = "1099-B sale needs a property description";
  assertThrows(() => buildMefXml(pending, filer), Error, message);
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("TY2025 broker sale needs a real 2025 sale date in both final exports", async () => {
  for (const date_sold of ["2025-02-30", "2024-12-31"]) {
    const sale = { ...brokerRows[0], date_sold };
    const result = f1040_2025.executeReturn({ general, f1099b: [sale] });
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const message = "TY2025 1099-B sale date must be a real 2025 date";
    assertThrows(() => buildMefXml(pending, filer), Error, message);
    await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
  }
});

Deno.test("broker wash-sale box and other adjustment reach Form 1040 and both exports", async () => {
  const sale = {
    ...brokerRows[0],
    proceeds: 500,
    cost_basis: 700,
    box1g_wash_sale_loss_disallowed: 100,
    adjustment_codes: "E",
    adjustment_amount: -20,
  };
  const result = f1040_2025.executeReturn({ general, f1099b: [sale] });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line7_capital_gain, -120);
  const pending = buildPending(result.pending);
  assertStringIncludes(
    buildMefXml(pending, filer),
    "<CapitalGainLossAmt>-120</CapitalGainLossAmt>",
  );
  assert((await buildPdfBytes(pending, filer)).length > 100_000);

  const changed = {
    ...pending,
    f1099b: { f1099bs: [{ ...sale, box1g_wash_sale_loss_disallowed: 90 }] },
  };
  assertThrows(
    () =>
      buildMefXml(
        changed as unknown as Parameters<typeof buildMefXml>[0],
        filer,
      ),
    Error,
    "Schedule D sale differs from retained 1099-B",
  );
  await assertRejects(
    () => buildPdfBytes(changed, filer),
    Error,
    "Schedule D sale differs from retained 1099-B",
  );
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

Deno.test("full-return exports reject a changed direct-sale aggregate with matching totals", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: brokerRows });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const schedule = pending.schedule_d!;
  const changed = {
    ...pending,
    schedule_d: {
      ...schedule,
      line_1a_proceeds: schedule.line_1a_proceeds! + 1,
      print_line1a_proceeds: (schedule.print_line1a_proceeds as number) + 1,
      print_line1a_gain: (schedule.print_line1a_gain as number) + 1,
      print_line7_st_total: (schedule.print_line7_st_total as number) + 1,
      print_line16_combined: (schedule.print_line16_combined as number) + 1,
    },
    f1040: { ...pending.f1040, line7_capital_gain: 1_301 },
  };
  assertThrows(
    () => buildMefXml(changed, filer),
    Error,
    "Schedule D lines 1a and 8a must match retained direct-sale proceeds and basis",
  );
  await assertRejects(
    () => buildPdfBytes(changed, filer),
    Error,
    "Schedule D lines 1a and 8a must match retained direct-sale proceeds and basis",
  );
});

Deno.test("final exports replay retained broker proceeds and basis into Schedule D", async () => {
  const result = f1040_2025.executeReturn({ general, f1099b: brokerRows });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  for (const changedField of ["proceeds", "cost_basis"] as const) {
    const changed = {
      ...pending,
      f1099b: {
        f1099bs: brokerRows.map((row, index) =>
          index === 0 ? { ...row, [changedField]: row[changedField] + 1 } : row
        ),
      },
    };
    assertThrows(
      () =>
        buildMefXml(
          changed as unknown as Parameters<typeof buildMefXml>[0],
          filer,
        ),
      Error,
      "Schedule D sale differs from retained 1099-B",
    );
    await assertRejects(
      () => buildPdfBytes(changed, filer),
      Error,
      "Schedule D sale differs from retained 1099-B",
    );
  }
});

Deno.test("broker transaction IDs survive into Schedule D and both final exporters", async () => {
  const result = f1040_2025.executeReturn({
    general,
    f1099b: [brokerRows[0]],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertCapitalSaleSourceRows(pending);
  const changed = structuredClone(pending);
  const schedule = changed.schedule_d as unknown as {
    transaction:
      | { source_transaction_id?: string }
      | { source_transaction_id?: string }[];
  };
  const sale = Array.isArray(schedule.transaction)
    ? schedule.transaction[0]!
    : schedule.transaction;
  assertEquals(sale.source_transaction_id, "sale1");
  sale.source_transaction_id = "other-sale";
  const message =
    "Schedule D sale differs from retained 1099-B or direct Form 8949 source";
  assertThrows(() => buildMefXml(changed, filer), Error, message);
  await assertRejects(() => buildPdfBytes(changed, filer), Error, message);
});

Deno.test("1099-K personal sales keep zero-gain source rows in Schedule D", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-k-personal-gain-loss"
  )!;
  const result = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertCapitalSaleSourceRows(pending);
  const changed = structuredClone(pending);
  const schedule = changed.schedule_d as unknown as {
    transaction: { source_transaction_id?: string }[];
  };
  const before = schedule.transaction.length;
  schedule.transaction = schedule.transaction.filter((row) =>
    !row.source_transaction_id?.includes("chair-loss-2025")
  );
  assertEquals(schedule.transaction.length, before - 1);
  const message =
    "Schedule D sale differs from retained 1099-B, 1099-K, or direct Form 8949 source";
  assertThrows(() => buildMefXml(changed, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(changed, fixture.filer),
    Error,
    message,
  );
});

Deno.test("1099-K nonbusiness receipts do not require Schedule D", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-k-blank-tin-withholding"
  )!;
  const result = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(result.diagnostics, []);
  assertCapitalSaleSourceRows(buildPending(result.pending));
});

Deno.test("final exports reject a second zero-gain copy of one broker sale", async () => {
  const result = f1040_2025.executeReturn({
    general,
    f1099b: [{
      ...brokerRows[0],
      part: Form8949Part.B,
      cost_basis: 1_000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const changed = structuredClone(pending);
  const schedule = changed.schedule_d as unknown as {
    transaction: Record<string, unknown> | Record<string, unknown>[];
  };
  const transactions = Array.isArray(schedule.transaction)
    ? schedule.transaction
    : [schedule.transaction];
  schedule.transaction = [...transactions, structuredClone(transactions[0])];
  const message =
    "Schedule D repeats a retained 1099-B or direct Form 8949 sale";
  assertThrows(() => buildMefXml(changed, filer), Error, message);
  await assertRejects(() => buildPdfBytes(changed, filer), Error, message);
});

Deno.test("final exports retain the broker collectible character of a sale", async () => {
  const result = f1040_2025.executeReturn({
    general,
    f1099b: [{
      ...brokerRows[1],
      box3_transaction_type: "collectibles" as const,
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const changed = structuredClone(pending);
  const schedule = changed.schedule_d as unknown as {
    transaction: { collectibles?: boolean } | { collectibles?: boolean }[];
  };
  const sale = Array.isArray(schedule.transaction)
    ? schedule.transaction[0]!
    : schedule.transaction;
  assertEquals(sale.collectibles, true);
  sale.collectibles = false;
  const message =
    "Schedule D sale differs from retained 1099-B or direct Form 8949 source";
  assertThrows(() => buildMefXml(changed, filer), Error, message);
  await assertRejects(() => buildPdfBytes(changed, filer), Error, message);
});

Deno.test("prepared Form 8949 cannot discard broker collectible character", async () => {
  const result = f1040_2025.executeReturn({
    general,
    f1099b: [{
      ...brokerRows[1],
      part: Form8949Part.E,
      box3_transaction_type: "collectibles" as const,
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertCapitalSaleSourceRows(pending);
  assertStringIncludes(
    buildMefXml(pending, filer),
    "<CapitalGainLossAmt>1000</CapitalGainLossAmt>",
  );
  assert((await buildPdfBytes(pending, filer)).length > 100_000);
  const changed = structuredClone(pending);
  const prepared = pending.form8949 as unknown as { collectibles?: boolean }[];
  assertEquals(prepared[0]?.collectibles, true);
  (changed as unknown as { form8949: { collectibles?: boolean }[] })
    .form8949 = prepared.map((row) => ({ ...row, collectibles: false }));
  const message =
    "Schedule D prepared Form 8949 rows differ from calculated sales";
  assertThrows(() => buildMefXml(changed, filer), Error, message);
  await assertRejects(() => buildPdfBytes(changed, filer), Error, message);
});

Deno.test("prepared Form 8949 cannot discard a QSBS exclusion identity", () => {
  const calculated = {
    part: Form8949Part.F,
    description: "Qualified shares",
    source_transaction_id: "direct-qsbs-1",
    date_acquired: "2015-01-01",
    date_sold: "2025-06-01",
    proceeds: 10_000,
    cost_basis: 2_000,
    gain_loss: 8_000,
    is_long_term: true,
    qsbs_code: "Q3" as const,
    qsbs_amount: 8_000,
  };
  assertScheduleDSalesMatchPrepared(calculated, [calculated]);
  for (const field of ["qsbs_code", "qsbs_amount"] as const) {
    const prepared = { ...calculated, [field]: undefined };
    assertThrows(
      () => assertScheduleDSalesMatchPrepared(calculated, [prepared]),
      Error,
      "Schedule D prepared Form 8949 rows differ from calculated sales",
    );
  }
});

Deno.test("direct sale replay retains the qualified small business stock fields", () => {
  const sale = {
    part: Form8949Part.F,
    description: "Qualified shares",
    source_transaction_id: "direct-qsbs-1",
    date_acquired: "2015-01-01",
    date_sold: "2025-06-01",
    proceeds: 10_000,
    cost_basis: 2_000,
    qsbs_code: QsbsCode.Q3,
    qsbs_amount: 8_000,
  };
  const source = { f8949s: [sale] };
  const transaction = f8949.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs.find((row) => row.nodeType === "form8949")!.fields.transaction;
  const pending = {
    f8949: source,
    schedule_d: { transaction },
  };
  assertCapitalSaleSourceRows(pending);
  for (const changedField of ["qsbs_code", "qsbs_amount"] as const) {
    const changed = structuredClone(pending);
    (changed.schedule_d.transaction as Record<string, unknown>)[changedField] =
      changedField === "qsbs_code" ? "Q1" : 7_999;
    assertThrows(
      () => assertCapitalSaleSourceRows(changed),
      Error,
      "Schedule D sale differs from retained 1099-B or direct Form 8949 source",
    );
  }
});

Deno.test("final exports replay a direct Form 8949 sale into Schedule D", async () => {
  const sale = {
    part: Form8949Part.C,
    description: "Unreported shares",
    source_transaction_id: "direct-sale-1",
    date_acquired: "2025-01-10",
    date_sold: "2025-06-20",
    proceeds: 1_000,
    cost_basis: 700,
  };
  const result = f1040_2025.executeReturn({ general, f8949: [sale] });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertStringIncludes(
    buildMefXml(pending, filer),
    "<CapitalGainLossAmt>300</CapitalGainLossAmt>",
  );
  const changed = {
    ...pending,
    f8949: { f8949s: [{ ...sale, cost_basis: 701 }] },
  };
  assertThrows(
    () => buildMefXml(changed, filer),
    Error,
    "Schedule D sale differs from retained 1099-B or direct Form 8949 source",
  );
  await assertRejects(
    () => buildPdfBytes(changed, filer),
    Error,
    "Schedule D sale differs from retained 1099-B or direct Form 8949 source",
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
