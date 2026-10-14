import { assertEquals, assertRejects } from "@std/assert";
import { z } from "zod";
import {
  royaltyBondCases,
  royaltyBondInputs,
} from "./form8815_royalty.fixture.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { physicalPresenceFilingSchema } from "../../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";

const source = z.object({ filing_details: physicalPresenceFilingSchema }).parse(
  pdfReviewFixtures.find((row) =>
    row.id === "single-form2555-full-year-physical-presence"
  )!.inputs.form2555,
).filing_details;
const cases = [
  {
    id: "foreign-positive-royalty",
    domestic: 30000,
    foreign: 70000,
    paid: 500,
    bank: 0,
    dummy: 500,
    mixed: false,
    housing: false,
    magi: 104500,
    exclusion: 1334,
    actual: 500,
    agi: 33166,
    tax: 3828,
  },
  {
    id: "foreign-limited-royalty",
    domestic: 30000,
    foreign: 70000,
    paid: 6000,
    bank: 0,
    dummy: 5000,
    mixed: false,
    housing: false,
    magi: 100000,
    exclusion: 1934,
    actual: 3066,
    agi: 30000,
    tax: 3135,
  },
  {
    id: "foreign-coverdell-zero-agi",
    domestic: 0,
    foreign: 100000,
    paid: 7000,
    bank: 1000,
    dummy: 6000,
    mixed: true,
    housing: false,
    magi: 100000,
    exclusion: 967,
    actual: 5033,
    agi: 0,
    tax: 0,
  },
  {
    id: "foreign-housing-royalty",
    domestic: 10000,
    foreign: 100000,
    paid: 6000,
    bank: 0,
    dummy: 5000,
    mixed: false,
    housing: true,
    magi: 110000,
    exclusion: 600,
    actual: 4400,
    agi: 10000,
    tax: 0,
  },
];
for (const entry of cases) {
  Deno.test(`Sourced foreign exclusion with bond/royalty refiguring: ${entry.id}`, async () => {
    const base = royaltyBondInputs({
      ...royaltyBondCases[0],
      ...entry,
      wages: entry.domestic + entry.foreign,
    });
    const address = {
      ...source.foreign_address,
      city: "Gothenburg",
      country_code: "SE",
      postal_code: "411 03",
      province_or_state: undefined,
    };
    const filing = physicalPresenceFilingSchema.parse({
      ...source,
      foreign_wages: entry.foreign,
      ...(entry.housing
        ? {
          foreign_address: address,
          employer_foreign_address: { ...address, line1: "10 King Street" },
          tax_home_description: "Gothenburg, Sweden",
          principal_employment_country: "Sweden",
          claiming_housing_exclusion_or_deduction: true,
          employee_housing: {
            city: "Gothenburg",
            country_code: "SE",
            limit_selection: {
              kind: "standard_unlisted",
              verified_not_listed: true,
              notice_review_document_reference:
                "Notice 2025-16 Gothenburg review",
            },
            no_second_household: true,
            no_other_housing_claimant: true,
            no_section119_lodging_excluded: true,
            no_nontaxable_us_government_housing_allowance: true,
            expenses: [{
              kind: "rent",
              amount: 30000,
              incurred_date: "2025-06-01",
              housing_period_begin: "2025-01-01",
              housing_period_end: "2025-12-31",
              source_document_reference: "synthetic-lease-and-rent-ledger",
              paid_by_taxpayer_from_reported_wages: true,
              reasonable_expense_verified: true,
            }],
          },
        }
        : {}),
    });
    const worksheet = base.form8815.line9_worksheet;
    const special = worksheet.royalty_debt_special_computation!;
    const inputs = {
      ...base,
      w2: entry.domestic
        ? base.w2.map((row) => ({
          ...row,
          box1_wages: entry.domestic,
          box3_ss_wages: entry.domestic,
          box4_ss_withheld: entry.domestic * .062,
          box5_medicare_wages: entry.domestic,
          box6_medicare_withheld: entry.domestic * .0145,
        }))
        : [],
      form2555: { filing_details: filing },
      form8815: {
        ...base.form8815,
        line9_worksheet: {
          ...worksheet,
          other_1040_and_schedule1_income: entry.domestic + 3000 - entry.dummy,
          foreign_adoption_and_puerto_rico_addbacks: entry.foreign,
          royalty_debt_special_computation: {
            ...special,
            other_income_before_royalty_interest: entry.domestic + 3000,
          },
        },
      },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.form8815.line9, entry.magi);
    assertEquals(pending.form8815.line14, entry.exclusion);
    assertEquals(
      pending.schedule1.line8d_foreign_earned_income_exclusion,
      entry.foreign,
    );
    assertEquals(pending.form4952.line8, entry.actual);
    assertEquals(pending.form4952.line7, entry.paid - entry.actual);
    assertEquals(
      result.carryforwards.investment_interest_excess_4952 ?? 0,
      entry.paid - entry.actual,
    );
    assertEquals(
      result.carryforwards.amt_investment_interest_excess_4952 ?? 0,
      entry.paid - entry.actual,
    );
    assertEquals(pending.schedule1.line5_schedule_e, 3000 - entry.actual);
    assertEquals(pending.schedule1.line9_total_other_income, -entry.foreign);
    assertEquals(
      pending.f1040.line8_additional_income,
      3000 - entry.actual - entry.foreign,
    );
    assertEquals(pending.f1040.line11_agi, entry.agi);
    assertEquals(pending.f1040.line24_total_tax ?? 0, entry.tax);
    assertEquals(
      pending.f1040.line35a_refund ?? 0,
      (entry.domestic ? 20000 : 0) - entry.tax,
    );
    const filer = extractFilerIdentity(pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(
      prepared.bundle.xml.includes(
        `<TotalIncomeExclusionAmt>${entry.foreign}</TotalIncomeExclusionAmt>`,
      ),
      true,
    );
    assertEquals(
      prepared.bundle.xml.includes(
        "<HousingExclusionAmt>9200</HousingExclusionAmt>",
      ),
      entry.housing,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_FOREIGN_ROYALTY_PROOF_DIR");
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
    const changes = [
      { ...pending, form2555: {} },
      {
        ...pending,
        form2555: { ...pending.form2555, foreign_wages: entry.foreign },
      },
      {
        ...pending,
        form2555: {
          ...pending.form2555,
          filing_details: { ...filing, foreign_wages: entry.foreign + 1 },
        },
      },
      {
        ...pending,
        schedule1: {
          ...pending.schedule1,
          line8d_foreign_earned_income_exclusion: entry.foreign + 1,
        },
      },
      {
        ...pending,
        schedule1: {
          ...pending.schedule1,
          line9_total_other_income: -entry.foreign + 1,
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line1h_other_earned: entry.foreign + 1 },
      },
      {
        ...pending,
        form8815: {
          ...pending.form8815,
          line9_worksheet: {
            ...inputs.form8815.line9_worksheet,
            foreign_adoption_and_puerto_rico_addbacks: entry.foreign - 1,
          },
        },
      },
      { ...pending, form4952: { ...pending.form4952, line8: entry.dummy } },
    ];
    for (
      const altered of changes.filter((_, i) =>
        i !== 7 || entry.dummy !== entry.actual
      )
    ) {
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
      const publicInput of [
        {
          ...inputs,
          form2555: { ...inputs.form2555, foreign_wages: entry.foreign },
        },
        { ...inputs, form2555: undefined },
        {
          ...inputs,
          form8815: {
            ...inputs.form8815,
            line9_worksheet: {
              ...inputs.form8815.line9_worksheet,
              foreign_adoption_and_puerto_rico_addbacks: entry.foreign + 1,
            },
          },
        },
      ]
    ) {
      await assertRejects(async () => {
        const result = f1040_2025.executeReturn(publicInput);
        if (result.diagnostics.length) {
          throw new Error("Rejected contradictory source");
        }
        const pending = normalizeAllPending(result.pending);
        await f1040_2025.prepareReturn(
          result.pending,
          extractFilerIdentity(pending.f1040),
        );
      }, Error);
    }
  });
}
