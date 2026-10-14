import { assertEquals, assertExists, assertRejects } from "@std/assert";
import {
  k1PortfolioCases,
  k1PortfolioInputs,
} from "./form4952_k1_portfolio.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
const cases = [
  {
    id: "joint-k1-dividend-full",
    joint: true,
    k1Interest: 0,
    k1Div: 3000,
    k1Qualified: 1000,
    bank: false,
    div: false,
    paid: 3000,
    allowed: 3000,
    tax: 25028,
    election: 1000,
  },
  {
    id: "joint-k1-bank-partial",
    joint: true,
    k1Interest: 1500,
    k1Div: 2500,
    k1Qualified: 1000,
    bank: true,
    div: false,
    paid: 5500,
    allowed: 4500,
    tax: 25103,
    election: 500,
  },
  {
    "id": "k1-dividend-partial",
    "joint": false,
    "k1Interest": 0,
    "k1Div": 3000,
    "k1Qualified": 1000,
    "bank": false,
    "div": false,
    "paid": 3000,
    "allowed": 2500,
    "tax": 21722,
    "election": 500,
  },
  {
    "id": "k1-dividend-full",
    "joint": false,
    "k1Interest": 0,
    "k1Div": 3000,
    "k1Qualified": 1000,
    "bank": false,
    "div": false,
    "paid": 3000,
    "allowed": 3000,
    "tax": 21647,
    "election": 1000,
  },
  {
    "id": "k1-mixed-partial",
    "joint": false,
    "k1Interest": 1500,
    "k1Div": 2500,
    "k1Qualified": 1000,
    "bank": false,
    "div": false,
    "paid": 3500,
    "allowed": 3500,
    "tax": 21722,
    "election": 500,
  },
  {
    "id": "k1-bank-full",
    "joint": false,
    "k1Interest": 1500,
    "k1Div": 2500,
    "k1Qualified": 1000,
    "bank": true,
    "div": false,
    "paid": 5500,
    "allowed": 5000,
    "tax": 21647,
    "election": 1000,
  },
  {
    "id": "k1-all-partial",
    "joint": false,
    "k1Interest": 1500,
    "k1Div": 2500,
    "k1Qualified": 1000,
    "bank": true,
    "div": true,
    "paid": 5500,
    "allowed": 5500,
    "tax": 21752,
    "election": 700,
  },
  {
    "id": "joint-k1-all-full",
    "joint": true,
    "k1Interest": 1500,
    "k1Div": 2500,
    "k1Qualified": 1000,
    "bank": true,
    "div": true,
    "paid": 5500,
    "allowed": 5500,
    "tax": 25182,
    "election": 1400,
  },
];
for (const entry of cases) {
  Deno.test(`K-1 qualified-dividend election reconciles deduction and final tax: ${entry.id}`, async () => {
    const base = await k1PortfolioInputs({
      ...k1PortfolioCases[0],
      joint: entry.joint,
    });
    const other = entry.joint ? "222334444" : "111223333";
    const k1s = [
      {
        partnership_name: "Expense Partnership",
        partnership_ein: "123456789",
        source_document_reference: "k1-expense",
        recipient_tin: "111223333",
        box13_code_h_investment_interest: entry.paid,
      },
      ...(entry.k1Interest
        ? [{
          partnership_name: "Interest Partnership",
          partnership_ein: "234567890",
          source_document_reference: "k1-interest",
          recipient_tin: other,
          investment_property_for_form4952: true,
          box5_interest: entry.k1Interest,
        }]
        : []),
      ...(entry.k1Div
        ? [{
          partnership_name: "Dividend Partnership",
          partnership_ein: "345678901",
          source_document_reference: "k1-dividend",
          recipient_tin: other,
          investment_property_for_form4952: true,
          box6a_ordinary_dividends: entry.k1Div,
          box6b_qualified_dividends: entry.k1Qualified,
        }]
        : []),
    ];
    const inputs = {
      ...base,
      form4952: {
        ...base.form4952,
        investment_income_election: entry.election,
      },
      k1_partnership: k1s,
      f1099int: entry.bank ? base.f1099int : undefined,
      f1099oid: entry.bank ? base.f1099oid : undefined,
      f1099div: entry.div ? base.f1099div : undefined,
    };
    const interest = entry.k1Interest + (entry.bank ? 1000 : 0);
    const dividends = entry.k1Div + (entry.div ? 1200 : 0);
    const qualified = entry.k1Qualified + (entry.div ? 400 : 0);
    const wages = entry.joint ? 200000 : 160000;
    const agi = wages + interest + dividends;
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.form4952.line4g, entry.election);
    assertEquals(
      pending.income_tax_calculation.form4952_election,
      entry.election,
    );
    assertEquals(pending.form6251.form4952_amt_election, entry.election);
    assertEquals(pending.form4952.line1, entry.paid);
    assertEquals(pending.form4952.line4a, interest + dividends);
    assertEquals(pending.form4952.line4b, qualified);
    assertEquals(pending.form4952.line8, entry.allowed);
    assertEquals(pending.form4952.line7, entry.paid - entry.allowed);
    assertEquals(
      result.carryforwards.investment_interest_excess_4952 ?? 0,
      entry.paid - entry.allowed,
    );
    assertEquals(
      result.carryforwards.amt_investment_interest_excess_4952 ?? 0,
      entry.paid - entry.allowed,
    );
    assertEquals(pending.schedule_a.line_9_investment_interest, entry.allowed);
    assertEquals(pending.f1040.line2b_taxable_interest ?? 0, interest);
    assertEquals(pending.f1040.line3b_ordinary_dividends ?? 0, dividends);
    assertEquals(pending.f1040.line3a_qualified_dividends ?? 0, qualified);
    assertEquals(pending.f1040.line11_agi, agi);
    assertEquals(
      pending.f1040.line12e_itemized_deductions,
      40000 + entry.allowed,
    );
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line35a_refund, 30000 - entry.tax);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    if (entry.div) {
      // Deferred source-aggregation mismatch: retain the public result and deny export.
      assertEquals(pending.income_tax_calculation.qualified_dividends, 1000);
      const root = Deno.env.get("OPENTAX_K1_ELECTION_PROOF_DIR");
      if (root) {
        await Deno.mkdir(`${root}/boundary`, { recursive: true });
        await Deno.writeTextFile(
          `${root}/boundary/${entry.id}.json`,
          JSON.stringify(
            {
              inputs,
              pending,
              filer,
              expected: { ...entry, qualified },
              nativeAccepted: false,
              pdfAccepted: false,
            },
            null,
            2,
          ),
        );
      }
      await assertRejects(
        () => f1040_2025.prepareReturn(result.pending, filer),
        Error,
        "elected qualified dividends need the same source",
      );
      await assertRejects(
        () => buildPdfBytes(pending, filer, ".pdf-cache"),
        Error,
        "elected qualified dividends need the same source",
      );
      return;
    }
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_K1_ELECTION_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeFile(
        `${root}/${entry.id}-source.pdf`,
        base.f1098[0].issuer_copy.bytes,
      );
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            expected: { ...entry, interest, dividends, qualified, wages, agi },
            origins,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    const changes = [
      {
        ...pending,
        income_tax_calculation: {
          ...pending.income_tax_calculation,
          form4952_election: entry.election + 1,
        },
      },
      {
        ...pending,
        income_tax_calculation: {
          ...pending.income_tax_calculation,
          form4952_amt_election: entry.election + 1,
        },
      },
      {
        ...pending,
        form6251: {
          ...pending.form6251,
          form4952_amt_election: entry.election + 1,
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line16_income_tax: entry.tax + 1 },
      },
      {
        ...pending,
        form4952: { ...pending.form4952, line4g: entry.election + 1 },
      },
      {
        ...pending,
        form4952: { ...pending.form4952, line8: entry.allowed + 1 },
      },
      {
        ...pending,
        form4952: {
          ...pending.form4952,
          source_k1_qualified_dividends: entry.k1Qualified + 1,
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line2b_taxable_interest: interest + 1 },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line3a_qualified_dividends: qualified + 1 },
      },
      {
        ...pending,
        schedule_a: {
          ...pending.schedule_a,
          line_9_investment_interest: entry.allowed + 1,
        },
      },
      {
        ...pending,
        k1_partnership: {
          k1_partnerships: k1s.map((row, i) =>
            i ? { ...row, recipient_tin: "999887777" } : row
          ),
        },
      },
      {
        ...pending,
        k1_partnership: {
          k1_partnerships: k1s.map((row) => ({
            ...row,
            source_document_reference: "duplicate",
          })),
        },
      },
      {
        ...pending,
        k1_partnership: {
          k1_partnerships: k1s.map((row, i) =>
            i
              ? row
              : { ...row, box13_code_h_investment_interest: entry.paid + 1 }
          ),
        },
      },
    ];
    for (const altered of changes) {
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(
        () => buildPdfBytes(altered, filer, ".pdf-cache", prepared.bundle),
        Error,
      );
    }
    for (
      const bad of [
        {
          ...inputs,
          form4952: {
            ...inputs.form4952,
            investment_income_election: qualified + 1,
          },
        },
        {
          ...inputs,
          k1_partnership: k1s.map((row) => ({
            ...row,
            investment_property_for_form4952: false,
          })),
        },
        {
          ...inputs,
          k1_partnership: k1s.map((row) => ({
            ...row,
            recipient_tin: "999887777",
          })),
        },
        {
          ...inputs,
          k1_partnership: k1s.map((row) => ({
            ...row,
            source_document_reference: "duplicate",
          })),
        },
      ]
    ) {
      await assertRejects(async () => {
        const result = f1040_2025.executeReturn(bad);
        if (result.diagnostics.length) throw new Error("Rejected source");
        await f1040_2025.prepareReturn(result.pending, filer);
      }, Error);
    }
  });
}
