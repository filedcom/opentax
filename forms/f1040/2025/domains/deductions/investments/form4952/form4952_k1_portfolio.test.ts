import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { z } from "zod";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { w2ItemSchema as wageSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { withSyntheticForm1098Copy } from "../../../../pdf/reviews/deductions/mortgage/review-1098-copy.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
const base =
  pdfReviewFixtures.find((row) => row.id === "single-w2-refund")!.inputs;
const wage = z.array(wageSchema).parse(base.w2)[0];
const general = generalSchema.parse(base.general);
const amt = {
  prior_year_disallowed_interest: 0,
  interest_on_private_activity_bonds: 0,
  other_gross_income_adjustment: 0,
  qualified_dividends_adjustment: 0,
  net_disposition_gain_adjustment: 0,
  net_capital_gain_adjustment: 0,
  investment_expenses_adjustment: 0,
};
const cases = [
  {
    id: "single-limited",
    joint: false,
    bank: 500,
    treasury: 300,
    oid: 200,
    div: 1200,
    qualified: 400,
    paid: 2000,
    allowed: 1800,
    tax: 21707,
  },
  {
    id: "single-full",
    joint: false,
    bank: 500,
    treasury: 300,
    oid: 200,
    div: 1200,
    qualified: 400,
    paid: 700,
    allowed: 700,
    tax: 21971,
  },
  {
    id: "joint-spouse-sources",
    joint: true,
    bank: 500,
    treasury: 300,
    oid: 200,
    div: 1200,
    qualified: 400,
    paid: 2000,
    allowed: 1800,
    tax: 25088,
  },
  {
    id: "single-qualified-exclusion",
    joint: false,
    bank: 500,
    treasury: 300,
    oid: 200,
    div: 1200,
    qualified: 1200,
    paid: 2000,
    allowed: 1000,
    tax: 21827,
  },
  {
    id: "single-multiple-payers",
    joint: false,
    bank: 900,
    treasury: 600,
    oid: 500,
    div: 1500,
    qualified: 500,
    paid: 4000,
    allowed: 3000,
    tax: 21722,
  },
  {
    id: "joint-multiple-payers",
    joint: true,
    bank: 900,
    treasury: 600,
    oid: 500,
    div: 1500,
    qualified: 500,
    paid: 4000,
    allowed: 3000,
    tax: 25103,
  },
];
for (const entry of cases) {
  Deno.test(`K-1 code H joins the complete interest and dividend portfolio: ${entry.id}`, async () => {
    const other = entry.joint ? "222334444" : "111223333";
    const mortgage = await withSyntheticForm1098Copy(entry.id, {
      lender_name: "Home Lender",
      recipient_tin: "111223333",
      source_document_reference: "mortgage-copy",
      box1_mortgage_interest: 40000,
      box1_current_year_deductible_interest: 40000,
      box1_deduction_workpaper_reference: "mortgage-workpaper",
      for_routing: "A",
    });
    const wages = entry.joint ? 200000 : 160000;
    const inputs = {
      ...base,
      general: {
        ...general,
        filing_status: entry.joint ? FilingStatus.MFJ : FilingStatus.Single,
        ...(entry.joint
          ? {
            spouse_first_name: "Morgan",
            spouse_last_name: "Example",
            spouse_ssn: "222-33-4444",
            spouse_dob: "1981-04-10",
          }
          : {}),
      },
      w2: [{
        ...wage,
        box1_wages: wages,
        box2_fed_withheld: 30000,
        box3_ss_wages: Math.min(wages, 176100),
        box4_ss_withheld: Math.min(wages, 176100) * .062,
        box5_medicare_wages: wages,
        box6_medicare_withheld: wages * .0145,
      }],
      f1098: [mortgage],
      k1_partnership: [
        {
          partnership_name: "Portfolio One",
          partnership_ein: "123456789",
          source_document_reference: "k1-one",
          recipient_tin: "111223333",
          box13_code_h_investment_interest: entry.paid / 2,
        },
        {
          partnership_name: "Portfolio Two",
          partnership_ein: "234567890",
          source_document_reference: "k1-two",
          recipient_tin: other,
          box13_code_h_investment_interest: entry.paid / 2,
        },
      ],
      f1099int: [
        {
          payer_name: "Bank",
          recipient_tin: "111223333",
          source_document_reference: "bank",
          box1: entry.bank,
          investment_property_for_form4952: true,
        },
        {
          payer_name: "Treasury",
          recipient_tin: other,
          source_document_reference: "treasury",
          box3: entry.treasury,
          investment_property_for_form4952: true,
        },
      ],
      f1099oid: [{
        payer_name: "OID Bond",
        recipient_tin: other,
        source_document_reference: "oid",
        box1_oid: entry.oid,
        investment_property_for_form4952: true,
      }],
      f1099div: [
        {
          payerName: "Fund One",
          recipient_tin: "111223333",
          source_document_reference: "div-one",
          box1a: entry.div / 2,
          box1b: entry.qualified / 2,
          isNominee: false,
          box11: false,
          investment_property_for_form4952: true,
        },
        {
          payerName: "Fund Two",
          recipient_tin: other,
          source_document_reference: "div-two",
          box1a: entry.div / 2,
          box1b: entry.qualified / 2,
          isNominee: false,
          box11: false,
          investment_property_for_form4952: true,
        },
      ],
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
      form4952: { amt_refigure: amt },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const interest = entry.bank + entry.treasury + entry.oid;
    assertEquals(pending.form4952.line1, entry.paid);
    assertEquals(pending.form4952.line4a, interest + entry.div);
    assertEquals(pending.form4952.line4b, entry.qualified);
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
    assertEquals(
      pending.f1040.line12e_itemized_deductions,
      40000 + entry.allowed,
    );
    assertEquals(pending.f1040.line11_agi, wages + interest + entry.div);
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line35a_refund, 30000 - entry.tax);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_K1_PORTFOLIO_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeFile(
        `${root}/${entry.id}-source.pdf`,
        mortgage.issuer_copy.bytes,
      );
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            expected: { ...entry, wages, interest },
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
        form4952: { ...pending.form4952, line8: entry.allowed + 1 },
      },
      {
        ...pending,
        form4952: { ...pending.form4952, line4b: entry.qualified + 1 },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line2b_taxable_interest: interest + 1 },
      },
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          line3a_qualified_dividends: entry.qualified + 1,
        },
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
          k1_partnerships: inputs.k1_partnership.map((row, i) =>
            i ? { ...row, recipient_tin: "999887777" } : row
          ),
        },
      },
      {
        ...pending,
        f1099int: {
          f1099ints: inputs.f1099int.map((row, i) =>
            i ? { ...row, recipient_tin: "999887777" } : row
          ),
        },
      },
      {
        ...pending,
        f1099oid: {
          f1099oids: inputs.f1099oid.map((row) => ({
            ...row,
            box1_oid: entry.oid + 1,
          })),
        },
      },
      {
        ...pending,
        f1099div: {
          f1099divs: inputs.f1099div.map((row, i) =>
            i ? { ...row, source_document_reference: "bank" } : row
          ),
        },
      },
      {
        ...pending,
        f1099int: {
          f1099ints: inputs.f1099int.map((row) => ({
            ...row,
            box6: 10,
            box7: "Canada",
          })),
        },
      },
    ];
    for (const changed of changes) {
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(
        () => buildPdfBytes(changed, filer, ".pdf-cache", prepared.bundle),
        Error,
      );
    }
    for (
      const bad of [
        {
          ...inputs,
          f1099int: inputs.f1099int.map((row) => ({
            ...row,
            investment_property_for_form4952: false,
          })),
        },
        {
          ...inputs,
          f1099div: inputs.f1099div.map((row) => ({
            ...row,
            recipient_tin: "999887777",
          })),
        },
        {
          ...inputs,
          k1_partnership: inputs.k1_partnership.map((row) => ({
            ...row,
            source_document_reference: "duplicate",
          })),
        },
      ]
    ) {
      await assertRejects(async () => {
        const changed = f1040_2025.executeReturn(bad);
        if (changed.diagnostics.length) throw new Error("Rejected source");
        await f1040_2025.prepareReturn(changed.pending, filer);
      }, Error);
    }
  });
}
