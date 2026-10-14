import { scheduleE } from "../../../../mef/forms/income/rental-passthrough/schedule_e.ts";
import { inputSchema as scheduleESchema } from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { royaltyDebtInputs } from "./form4952_royalty_debt.fixture.ts";

const cases = [
  {
    id: "positive-royalty",
    paid: 500,
    interest: [1000],
    allowed: 500,
    net: 2500,
    agi: 78500,
    tax: 8725,
    carry: 0,
  },
  {
    id: "royalty-loss",
    paid: 3500,
    interest: [1000],
    allowed: 3500,
    net: -500,
    agi: 75500,
    tax: 8065,
    carry: 0,
  },
  {
    id: "limited-multiple-interest",
    paid: 5000,
    interest: [400, 600],
    allowed: 4000,
    net: -1000,
    agi: 75000,
    tax: 7955,
    carry: 1000,
  },
  {
    id: "limited-royalty-only",
    paid: 5000,
    interest: [],
    allowed: 3000,
    net: 0,
    agi: 75000,
    tax: 7955,
    carry: 2000,
  },
];
for (const entry of cases) {
  Deno.test(`Sourced royalty debt through Schedule E and Form 4952: ${entry.id}`, async () => {
    const inputs = royaltyDebtInputs(entry.paid, entry.interest);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.form4952.line1, entry.paid);
    assertEquals(
      pending.form4952.line4a,
      3000 + entry.interest.reduce((a, b) => a + b, 0),
    );
    assertEquals(pending.form4952.line8, entry.allowed);
    assertEquals(pending.form4952.line7, entry.carry);
    assertEquals(
      result.carryforwards.investment_interest_excess_4952 ?? 0,
      entry.carry,
    );
    assertEquals(
      result.carryforwards.amt_investment_interest_excess_4952 ?? 0,
      entry.carry,
    );
    assertEquals(pending.schedule1.line5_schedule_e, entry.net);
    assertEquals(pending.f1040.line11_agi, entry.agi);
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line35a_refund, 11000 - entry.tax);
    assertEquals(pending.schedule_a?.line_9_investment_interest ?? 0, 0);
    const filer = extractFilerIdentity(pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_ROYALTY_DEBT_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            expected: entry,
            origins,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    const trace = inputs.form4952.royalty_debt_trace;
    const row = scheduleESchema.parse(pending.schedule_e).schedule_es[0];
    assertThrows(
      () =>
        scheduleE.build({
          ...pending.schedule_e,
          schedule_es: [{ ...row, expense_other_interest: entry.allowed + 1 }],
        }, { pending, filer }),
      Error,
      "printed royalty differs",
    );
    const alterations = [
      {
        ...pending,
        f1099div: {
          f1099divs: [{
            payerName: "Dividend Fund",
            recipient_tin: "111223333",
            box1a: 100,
          }],
        },
      },
      { ...pending, k1_partnership: {} },
      {
        ...pending,
        form4952: { ...pending.form4952, royalty_debt_trace: undefined },
      },
      {
        ...pending,
        form4952: { ...pending.form4952, line8: entry.allowed + 1 },
      },
      {
        ...pending,
        form4952: {
          ...pending.form4952,
          royalty_debt_trace: { ...trace, owner_tin: "999887777" },
        },
      },
      {
        ...pending,
        form4952: {
          ...pending.form4952,
          royalty_debt_trace: {
            ...trace,
            direct_royalty_property_purchase: 9999,
          },
        },
      },
      {
        ...pending,
        form4952: {
          ...pending.form4952,
          royalty_debt_trace: {
            ...trace,
            lender_2025_interest_total: entry.paid + 1,
          },
        },
      },
      {
        ...pending,
        schedule_e: {
          ...pending.schedule_e,
          schedule_es: [{ ...row, expense_other_interest: entry.allowed + 1 }],
        },
      },
      {
        ...pending,
        schedule_a: {
          ...pending.schedule_a,
          line_9_investment_interest: entry.allowed,
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line8_additional_income: entry.net + 1 },
      },
      {
        ...pending,
        f1099m: { f1099ms: [{ ...inputs.f1099m[0], box2_royalties: 3001 }] },
      },
    ];
    for (const altered of alterations) {
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(
        () => buildPdfBytes(altered, filer, ".pdf-cache", prepared.bundle),
        Error,
      );
    }
  });
}

Deno.test("Royalty debt public preparation rejects contradictory source records", async () => {
  const base = royaltyDebtInputs(3500);
  const form = base.form4952;
  const trace = form.royalty_debt_trace;
  const alteredTraces = [
    { ...trace, owner_tin: "999887777" },
    { ...trace, direct_purchase_date: "2025-01-09" },
    { ...trace, loan_date: "2025-02-30" },
    { ...trace, direct_royalty_property_purchase: 9999 },
    { ...trace, lender_2025_interest_total: 3501 },
    {
      ...trace,
      interest_payments: [
        trace.interest_payments[0],
        trace.interest_payments[0],
      ],
    },
    {
      ...trace,
      royalty_source: { ...trace.royalty_source, box2_gross_royalties: 3001 },
    },
    {
      ...trace,
      royalty_source: {
        ...trace.royalty_source,
        source_document_reference: "different-copy",
      },
    },
  ];
  const inputs = [
    ...alteredTraces.map((royalty_debt_trace) => ({
      ...base,
      form4952: { ...form, royalty_debt_trace },
    })),
    { ...base, form4952: { ...form, investment_interest_expense: 3500 } },
    {
      ...base,
      form4952: {
        ...form,
        amt_refigure: {
          ...form.amt_refigure,
          other_gross_income_adjustment: 1,
        },
      },
    },
    {
      ...base,
      f1099int: [{ ...base.f1099int![0], recipient_tin: "999887777" }],
    },
    {
      ...base,
      schedule_e: [{ property_description: "Duplicate caller royalty" }],
    },
  ];
  for (const input of inputs) {
    await assertRejects(async () => {
      const result = f1040_2025.executeReturn(input);
      if (result.diagnostics.length > 0) {
        throw new Error("Rejected inconsistent public source");
      }
      const pending = normalizeAllPending(result.pending);
      return await f1040_2025.prepareReturn(
        result.pending,
        extractFilerIdentity(pending.f1040),
      );
    }, Error);
  }
});
