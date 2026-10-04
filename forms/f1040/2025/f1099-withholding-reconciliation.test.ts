import { assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { assert1099WithholdingSource } from "./f1099-withholding-reconciliation.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";
import { FormType } from "../nodes/inputs/f4852/index.ts";
import { inputSchema as brokerSchema } from "../nodes/inputs/f1099b/index.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TEST",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "222334444",
    firstName: "Joint",
    lastName: "Spouse",
    nameControl: "SPOU",
  },
};

Deno.test("changed identified INT, DIV, and OID copies reject direct native and PDF export", async () => {
  const cases = [
    {
      f1099int: {
        f1099ints: [
          {
            payer_name: "Bank",
            payer_tin: "123456789",
            account_number: "SAV-1",
            source_document_reference: "same-issued-copy",
            box1: 200,
            box4: 15,
          },
          {
            payer_name: "Bank",
            payer_tin: "123456789",
            account_number: "SAV-2",
            source_document_reference: "same-issued-copy",
            box1: 250,
            box4: 20,
          },
        ],
      },
      message: "1099-INT repeats the same issued-copy source reference",
    },
    {
      f1099int: {
        f1099ints: [
          {
            payer_name: "Bank",
            payer_tin: "123456789",
            account_number: "SAV-1",
            source_document_reference: "original",
            box1: 200,
            box4: 15,
          },
          {
            payer_name: "Bank",
            payer_tin: "123456789",
            account_number: "SAV-1",
            source_document_reference: "corrected",
            box1: 250,
            box4: 20,
          },
        ],
      },
      message: "1099-INT repeats the same payer and account",
    },
    {
      f1099int: {
        f1099ints: [
          {
            payer_name: "Bank",
            source_document_reference: "issued-copy",
            box1: 200,
            box4: 15,
          },
          {
            payer_name: "Bank",
            source_document_reference: "issued-copy",
            box1: 250,
            box4: 20,
          },
        ],
      },
      message: "1099-INT repeats the same issued-copy source reference",
    },
    {
      f1099oid: {
        f1099oids: [
          {
            payer_name: "Bond Fund A",
            payer_tin: "123456789",
            source_document_reference: "same-issued-oid-copy",
            box1_oid: 200,
            box4_federal_withheld: 15,
          },
          {
            payer_name: "Bond Fund B",
            payer_tin: "987654321",
            source_document_reference: "same-issued-oid-copy",
            box1_oid: 250,
            box4_federal_withheld: 20,
          },
        ],
      },
      message: "1099-OID repeats the same issued-copy source reference",
    },
    {
      f1099div: {
        f1099divs: [
          {
            payerName: "Fund",
            payerTin: "123456789",
            source_document_reference: "issued-copy",
            isNominee: false,
            box11: false,
            box1a: 200,
            box4: 15,
          },
          {
            payerName: "Fund",
            payerTin: "123456789",
            source_document_reference: "issued-copy",
            isNominee: false,
            box11: false,
            box1a: 250,
            box4: 20,
          },
        ],
      },
      message: "1099-DIV repeats the same issued-copy source reference",
    },
    {
      f1099oid: {
        f1099oids: [
          {
            payer_name: "Bond Fund",
            payer_tin: "123456789",
            source_document_reference: "issued-copy",
            box1_oid: 200,
            box4_federal_withheld: 15,
          },
          {
            payer_name: "Bond Fund",
            payer_tin: "123456789",
            source_document_reference: "issued-copy",
            box1_oid: 250,
            box4_federal_withheld: 20,
          },
        ],
      },
      message: "1099-OID repeats the same issued-copy source reference",
    },
    {
      f1099oid: {
        f1099oids: [
          {
            payer_name: "Bond Fund",
            source_document_reference: "issued-copy",
            box1_oid: 200,
            box4_federal_withheld: 15,
          },
          {
            payer_name: "Bond Fund",
            source_document_reference: "issued-copy",
            box1_oid: 250,
            box4_federal_withheld: 20,
          },
        ],
      },
      message: "1099-OID repeats the same issued-copy source reference",
    },
  ];
  for (const { message, ...pending } of cases) {
    assertThrows(
      () => assert1099WithholdingSource(pending, filer),
      Error,
      message,
    );
    assertThrows(
      () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
      Error,
      message,
    );
    await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
  }
});

Deno.test("mixed payer TIN OID copies cannot double interest in native or PDF export", async () => {
  const pending = {
    f1099oid: {
      f1099oids: [
        {
          payer_name: "Bond Fund",
          payer_tin: "123456789",
          recipient_tin: filer.primarySSN,
          account_number: "BROKER-1",
          box7_description: "Bond A",
          box1_oid: 200,
        },
        {
          payer_name: "  bond   FUND ",
          recipient_tin: filer.primarySSN,
          account_number: "BROKER-1",
          box7_description: "Bond A",
          box1_oid: 250,
        },
      ],
    },
  };
  const message =
    "1099-OID repeats the same payer, recipient, account, and obligation";
  assertThrows(
    () => assert1099WithholdingSource(pending, filer),
    Error,
    message,
  );
  assertThrows(() => buildMefXml(pending, filer), Error, message);
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("1099 payer-name variants cannot double an unidentified copy", async () => {
  const cases = [
    {
      pending: {
        f1099int: {
          f1099ints: [
            { payer_name: "Example Bank", box1: 200 },
            { payer_name: "  example   BANK ", box1: 250 },
          ],
        },
      },
      message:
        "1099-INT has multiple positive payer copies without account or issued source reference",
    },
    {
      pending: {
        f1099div: {
          f1099divs: [
            {
              payerName: "Example Broker",
              isNominee: false,
              box11: false,
              box1a: 200,
            },
            {
              payerName: " example   BROKER ",
              isNominee: false,
              box11: false,
              box1a: 250,
            },
          ],
        },
      },
      message:
        "1099-DIV has multiple positive issued copies without account or source_document_reference",
    },
    {
      pending: {
        f1099oid: {
          f1099oids: [
            { payer_name: "Example Bond Fund", box1_oid: 200 },
            { payer_name: " example   BOND   FUND ", box1_oid: 250 },
          ],
        },
      },
      message:
        "1099-OID has multiple positive payer copies without account or issued source reference",
    },
    {
      pending: {
        f1099g: {
          f1099gs: [
            {
              payer_name: "State Agency",
              recipient_tin: filer.primarySSN,
              box_1_unemployment: 200,
            },
            {
              payer_name: " state   AGENCY ",
              recipient_tin: filer.primarySSN,
              box_1_unemployment: 250,
            },
          ],
        },
      },
      message:
        "1099-G has multiple positive payer copies without account or issued source reference",
    },
    {
      pending: {
        f1099r: {
          f1099rs: [
            {
              payer_name: "Example Plan",
              payer_ein: "123456789",
              recipient_ssn: filer.primarySSN,
              box1_gross_distribution: 200,
              box7_distribution_code: "7",
            },
            {
              payer_name: " example   PLAN ",
              payer_ein: "123456789",
              recipient_ssn: filer.primarySSN,
              box1_gross_distribution: 250,
              box7_distribution_code: "7",
            },
          ],
        },
      },
      message:
        "Form 1099-R has multiple positive payer copies without account or issued source reference",
    },
    {
      pending: {
        f1099patr: {
          f1099patrs: [
            {
              payer_name: "Farm Cooperative",
              recipient_tin: filer.primarySSN,
              box4_federal_withheld: 20,
            },
            {
              payer_name: " farm   COOPERATIVE ",
              recipient_tin: filer.primarySSN,
              box4_federal_withheld: 30,
            },
          ],
        },
      },
      message:
        "1099-PATR copies from one payer and recipient need distinct accounts or issued source references",
    },
  ];
  for (const { pending, message } of cases) {
    if (!("f1099r" in pending)) {
      assertThrows(
        () => assert1099WithholdingSource(pending, filer),
        Error,
        message,
      );
    }
    assertThrows(
      () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
      Error,
      message,
    );
    await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
  }
});

Deno.test("final exports reject a 1099-INT duplicate with only one payer TIN", async () => {
  const pending = {
    f1099int: {
      f1099ints: [
        { payer_name: "Example Bank", payer_tin: "123456789", box1: 200 },
        { payer_name: " example   BANK ", box1: 250 },
      ],
    },
  };
  const reason =
    "1099-INT has multiple positive payer copies without account or issued source reference";
  assertThrows(
    () => assert1099WithholdingSource(pending, filer),
    Error,
    reason,
  );
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    reason,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, reason);
});

Deno.test("unidentified repeated 1099-MISC copies reject native and PDF export", async () => {
  const issued = {
    payer_name: "Payer",
    payer_tin: "123456789",
    recipient_tin: filer.primarySSN,
    box3_other_income: 300,
    box3_other_income_routing: "prizes_awards",
  };
  const pending = {
    f1099m: { f1099ms: [issued, { ...issued, box3_other_income: 350 }] },
  };
  const message =
    "1099-MISC has multiple positive payer copies without account or issued source reference";
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("unidentified repeated 1099-INT and OID copies reject native and PDF export", async () => {
  const cases = [
    {
      pending: {
        f1099int: {
          f1099ints: [
            { payer_name: "Bank", box1: 200 },
            { payer_name: "Bank", box1: 250 },
          ],
        },
      },
      message:
        "1099-INT has multiple positive payer copies without account or issued source reference",
    },
    {
      pending: {
        f1099oid: {
          f1099oids: [
            { payer_name: "Bond Fund", box1_oid: 200 },
            { payer_name: "Bond Fund", box1_oid: 250 },
          ],
        },
      },
      message:
        "1099-OID has multiple positive payer copies without account or issued source reference",
    },
  ];
  for (const { pending, message } of cases) {
    assertThrows(
      () => buildMefXml(pending, filer),
      Error,
      message,
    );
    await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
  }
});

Deno.test("1099-DIV repeated issued copy without payer TIN rejects native and PDF export", async () => {
  const pending = {
    f1099div: {
      f1099divs: [
        {
          source_document_reference: "issued-copy-no-tin",
          isNominee: false,
          box11: false,
          box1a: 200,
          box4: 15,
        },
        {
          source_document_reference: "issued-copy-no-tin",
          isNominee: false,
          box11: false,
          box1a: 250,
          box4: 20,
        },
      ],
    },
  };
  const message = "1099-DIV repeats the same issued-copy source reference";
  assertThrows(
    () => assert1099WithholdingSource(pending, filer),
    Error,
    message,
  );
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("multiple positive 1099-DIV copies without references reject native and PDF export", async () => {
  const first = {
    recipient_tin: filer.primarySSN,
    isNominee: false,
    box11: false,
    box1a: 200,
    box4: 15,
  };
  const pending = {
    f1099div: { f1099divs: [first, { ...first, box1a: 250 }] },
  };
  const message =
    "1099-DIV has multiple positive issued copies without account or source_document_reference";
  assertThrows(
    () => assert1099WithholdingSource(pending, filer),
    Error,
    message,
  );
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
  const mixed = {
    f1099div: {
      f1099divs: [first, {
        ...first,
        source_document_reference: "issued-copy-2",
        box1a: 250,
      }],
    },
  };
  assertThrows(
    () => buildMefXml(mixed as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(mixed, filer), Error, message);
});

Deno.test("unidentified repeated 1099-G copies reject native and PDF export", async () => {
  const issued = {
    payer_name: "State Agency",
    payer_tin: "123456789",
    recipient_tin: filer.primarySSN,
    box_1_unemployment: 500,
  };
  const pending = {
    f1099g: {
      f1099gs: [issued, { ...issued, box_1_unemployment: 600 }],
    },
  };
  const message =
    "1099-G has multiple positive payer copies without account or issued source reference";
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("changed identified 1099-G and 1099-MISC copies reject direct native and PDF export", async () => {
  const cases = [
    {
      f1099g: {
        f1099gs: [
          {
            payer_tin: "123456789",
            recipient_tin: "111223333",
            account_number: "BEN-1",
            source_document_reference: "original",
            box_1_unemployment: 500,
          },
          {
            payer_tin: "123456789",
            recipient_tin: "111223333",
            account_number: "BEN-1",
            source_document_reference: "corrected",
            box_1_unemployment: 600,
          },
        ],
      },
    },
    {
      f1099m: {
        f1099ms: [
          {
            payer_name: "Payer",
            payer_tin: "123456789",
            recipient_tin: "111223333",
            account_number: "M-1",
            box3_other_income: 300,
            box3_other_income_routing: "prizes_awards" as const,
          },
          {
            payer_name: "Payer",
            payer_tin: "123456789",
            recipient_tin: "111223333",
            account_number: "M-1",
            box3_other_income: 350,
            box3_other_income_routing: "prizes_awards" as const,
          },
        ],
      },
    },
  ];
  for (const pending of cases) {
    const message = "f1099g" in pending
      ? "1099-G repeats the same identified payer, recipient, and account"
      : "1099-MISC repeats the same payer, recipient, account";
    assertThrows(
      () => assert1099WithholdingSource(pending, filer),
      Error,
      message,
    );
    assertThrows(
      () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
      Error,
      message,
    );
    await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
  }
});

Deno.test("reused 1099-G and MISC issued-copy references reject across changed payers and accounts", async () => {
  const cases = [
    {
      pending: {
        f1099g: {
          f1099gs: [
            {
              payer_name: "State Agency",
              recipient_tin: filer.primarySSN,
              source_document_reference: "issued-unemployment-copy",
              box_1_unemployment: 500,
            },
            {
              payer_name: "Second State Agency",
              recipient_tin: filer.primarySSN,
              source_document_reference: "issued-unemployment-copy",
              box_1_unemployment: 600,
            },
          ],
        },
      },
      message: "1099-G repeats the same issued-copy source reference",
    },
    {
      pending: {
        f1099m: {
          f1099ms: [
            {
              payer_name: "Payer",
              payer_tin: "123456789",
              recipient_tin: filer.primarySSN,
              source_document_reference: "issued-misc-copy",
              box3_other_income: 300,
              box3_other_income_routing: "prizes_awards" as const,
            },
            {
              payer_name: "Payer",
              payer_tin: "987654321",
              recipient_tin: filer.primarySSN,
              account_number: "M-2",
              source_document_reference: "issued-misc-copy",
              box3_other_income: 350,
              box3_other_income_routing: "prizes_awards" as const,
            },
          ],
        },
      },
      message: "1099-MISC repeats the same issued-copy source reference",
    },
  ];
  for (const { pending, message } of cases) {
    assertThrows(
      () => assert1099WithholdingSource(pending, filer),
      Error,
      message,
    );
    assertThrows(
      () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
      Error,
      message,
    );
    await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
  }
});

Deno.test("1099-family box withholding replays once across distinct taxpayer and joint-spouse copies", () => {
  const pending = {
    f1099int: { f1099ints: [{ payer_name: "Bank", box4: 10 }] },
    f1099g: {
      f1099gs: [{
        box_4_federal_withheld: 20,
        recipient_tin: "222334444",
      }],
    },
    f1099m: {
      f1099ms: [{
        payer_name: "Payer",
        payer_tin: "123456789",
        recipient_tin: "111223333",
        box4_federal_withheld: 30,
      }],
    },
    ssa1099: {
      ssas: [{
        box3_gross_benefits: 1_000,
        box6_federal_withheld: 40,
      }],
    },
    rrb1099r: {
      rrb1099rs: [{
        payer_name: "RRB",
        recipient_tin: "111223333",
        box4_contributory_amount_paid: 1_000,
        box7_total_gross_paid: 1_000,
        box9_federal_withheld: 110,
      }],
    },
    f4852: {
      f4852s: [{
        form_type: FormType.R_1099,
        payer_name: "Replacement payer",
        gross_distribution: 1_000,
        federal_withheld: 70,
      }],
    },
    f1040: { line25b_withheld_1099: 280 },
  };
  assert1099WithholdingSource(pending, filer);
  assertThrows(
    () =>
      assert1099WithholdingSource({
        ...pending,
        f1040: { line25b_withheld_1099: 279 },
      }, filer),
    Error,
    "line 25b differs",
  );
  assertThrows(
    () =>
      assert1099WithholdingSource({
        ...pending,
        f1099g: {
          f1099gs: [{
            box_4_federal_withheld: 20,
            recipient_tin: "999887777",
          }],
        },
      }, filer),
    Error,
    "recipient must match",
  );
  assertThrows(
    () =>
      assert1099WithholdingSource({
        ...pending,
        f1099m: {
          f1099ms: [{
            ...pending.f1099m.f1099ms[0],
            recipient_tin: "999887777",
          }],
        },
      }, filer),
    Error,
    "recipient must match",
  );
});

Deno.test("1099-B and Form 8949 cannot claim the same identified broker withholding twice", () => {
  const sale = {
    part: "A" as const,
    description: "Stock",
    date_acquired: "2025-01-01",
    date_sold: "2025-02-01",
    proceeds: 1_000,
    cost_basis: 500,
    federal_withheld: 50,
  };
  assertThrows(
    () =>
      assert1099WithholdingSource({
        f1099b: {
          f1099bs: [{
            ...sale,
            recipient_ssn: "111223333",
            transaction_id: "sale-1",
          }],
        },
        f8949: { f8949s: [{ ...sale, source_transaction_id: "sale-1" }] },
        f1040: { line25b_withheld_1099: 100 },
      }, filer),
    Error,
    "repeat withholding",
  );
});

Deno.test("direct Form 8949 cannot create Form 1040 withholding without an issued broker source", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-short-and-long-form8949-sales"
  );
  if (!fixture) throw new Error("Missing direct Form 8949 sale fixture");
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
  }, { taxYear: 2025, formType: "f1040" });
  if (result.diagnostics.length) throw new Error("Invalid sale fixture");
  const source = result.pending.f8949 as {
    f8949s: Array<Record<string, unknown>>;
  };
  const pending = buildPending({
    ...result.pending,
    f8949: {
      ...source,
      f8949s: [
        { ...source.f8949s[0], federal_withheld: 50 },
        ...source.f8949s.slice(1),
      ],
    },
  });
  assertThrows(
    () => assert1099WithholdingSource(pending, fixture.filer),
    Error,
    "Form 8949 withholding needs an issued Form 1099-B source",
  );
  assertThrows(
    () => buildMefXml(pending, fixture.filer),
    Error,
    "Form 8949 withholding needs an issued Form 1099-B source",
  );
  await assertRejects(
    () => buildPdfBytes(pending, fixture.filer),
    Error,
    "Form 8949 withholding needs an issued Form 1099-B source",
  );
});

Deno.test("corrected 1099-B source references cannot repeat one identified broker transaction at native or PDF export", async () => {
  const sale = {
    recipient_ssn: filer.primarySSN,
    payer_tin: "123456789",
    account_number: "Brokerage 1",
    transaction_id: "sale-42",
    part: "A" as const,
    description: "Stock",
    date_acquired: "2025-01-01",
    date_sold: "2025-02-01",
    proceeds: 1_000,
    cost_basis: 500,
    federal_withheld: 50,
  };
  const duplicate = {
    f1099b: {
      f1099bs: [
        { ...sale, source_document_reference: "original" },
        {
          ...sale,
          source_document_reference: "corrected",
          proceeds: 1_200,
        },
      ],
    },
    f1040: {
      filing_status: "mfj",
      digital_assets: false,
      line25b_withheld_1099: 100,
    },
  };
  const exportFiler: FilerIdentity = {
    ...filer,
    firstNameWithInitial: "Taxpayer",
    lastName: "Test",
  };
  assertThrows(
    () => brokerSchema.parse(duplicate.f1099b),
    Error,
    "repeats the same identified broker transaction",
  );
  assertThrows(
    () => buildMefXml(duplicate, exportFiler),
    Error,
    "1099-B needs valid issued transaction rows",
  );
  await assertRejects(
    () => buildPdfBytes(duplicate, exportFiler),
    Error,
    "1099-B needs valid issued transaction rows",
  );

  const withoutAccount = {
    ...duplicate,
    f1099b: {
      f1099bs: [
        {
          ...sale,
          payer_tin: undefined,
          account_number: undefined,
          source_document_reference: "one-broker-statement",
        },
        {
          ...sale,
          payer_tin: undefined,
          account_number: undefined,
          source_document_reference: "one-broker-statement",
          proceeds: 1_200,
        },
      ],
    },
  };
  assertThrows(
    () => brokerSchema.parse(withoutAccount.f1099b),
    Error,
    "repeats the same identified broker transaction",
  );
  assertThrows(
    () => buildMefXml(withoutAccount, exportFiler),
    Error,
    "1099-B needs valid issued transaction rows",
  );
  await assertRejects(
    () => buildPdfBytes(withoutAccount, exportFiler),
    Error,
    "1099-B needs valid issued transaction rows",
  );
});

Deno.test("positive 1099-R withholding needs an identified recipient on a joint return", () => {
  const pending = {
    f1099r: {
      f1099rs: [{
        payer_name: "Plan",
        payer_ein: "123456789",
        recipient_ssn: "222334444",
        box1_gross_distribution: 1_000,
        box4_federal_withheld: 100,
        box7_distribution_code: "7",
      }],
    },
    f1040: { line25b_withheld_1099: 100 },
  };
  assert1099WithholdingSource(pending, filer);
  assertThrows(
    () =>
      assert1099WithholdingSource({
        ...pending,
        f1099r: {
          f1099rs: [{
            ...pending.f1099r.f1099rs[0],
            recipient_ssn: undefined,
          }],
        },
      }, filer),
    Error,
    "recipient must match",
  );
});

Deno.test("repeated 1099-R issued copy without account rejects native and PDF export", async () => {
  const issued = {
    payer_name: "Plan",
    payer_ein: "123456789",
    recipient_ssn: filer.primarySSN,
    source_document_reference: "issued-1099-r-copy",
    box1_gross_distribution: 1_000,
    box4_federal_withheld: 100,
    box7_distribution_code: "7",
  };
  const pending = {
    f1099r: {
      f1099rs: [issued, {
        ...issued,
        payer_name: "Second Plan",
        payer_ein: "987654321",
        account_number: "SECOND-PLAN",
        box1_gross_distribution: 1_200,
      }],
    },
  };
  const message = "Form 1099-R repeats the same issued-copy source reference";
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("unidentified repeated 1099-R copies reject native and PDF export", async () => {
  const issued = {
    payer_name: "Plan",
    payer_ein: "123456789",
    recipient_ssn: filer.primarySSN,
    box1_gross_distribution: 1_000,
    box7_distribution_code: "7",
  };
  const pending = {
    f1099r: {
      f1099rs: [issued, { ...issued, box1_gross_distribution: 1_200 }],
    },
  };
  const message =
    "Form 1099-R has multiple positive payer copies without account or issued source reference";
  assertThrows(
    () => buildMefXml(pending as Parameters<typeof buildMefXml>[0], filer),
    Error,
    message,
  );
  await assertRejects(() => buildPdfBytes(pending, filer), Error, message);
});

Deno.test("an unsupported bare line 25b amount cannot be filed without retained payer rows", () => {
  assertThrows(
    () =>
      assert1099WithholdingSource({
        f1040: { line25b_withheld_1099: 10 },
      }, filer),
    Error,
    "line 25b differs",
  );
  assertThrows(
    () =>
      assert1099WithholdingSource({
        f1099int: { f1099ints: [{ payer_name: "Bank", box4: 10 }] },
        f1040: { line25b_withheld_1099: 10 },
      }, undefined),
    Error,
    "Form 1040 filer identity",
  );
});
