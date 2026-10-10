import { assertEquals, assertRejects } from "@std/assert";
import { z } from "zod";
import { contributionInputs } from "./form8815_contributions.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { physicalPresenceFilingSchema } from "../../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";

const source = z.object({ filing_details: physicalPresenceFilingSchema }).parse(
  pdfReviewFixtures.find((row) =>
    row.id === "single-form2555-full-year-physical-presence"
  )!.inputs.form2555,
).filing_details;

// Independent Form 8815 worksheet: MAGI 102,000/162,000; exclusion 833/575.
// Foreign tax worksheet: single Tax Table 13,708 - 10,320 = 3,388;
// joint Tax Computation Worksheet 18,412 - 11,828 = 6,584.
const cases = [
  {
    id: "single-foreign-coverdell",
    joint: false,
    foreign: 100000,
    domestic: 0,
    addback: 100000,
    agi: 1167,
    tax: 0,
    housing: false,
  },
  {
    id: "single-mixed-coverdell",
    joint: false,
    foreign: 70000,
    domestic: 30000,
    addback: 70000,
    agi: 31167,
    tax: 3388,
    housing: false,
  },
  {
    id: "joint-mixed-coverdell",
    joint: true,
    foreign: 100000,
    domestic: 60000,
    addback: 100000,
    agi: 61425,
    tax: 6584,
    housing: false,
  },
  {
    id: "joint-housing-coverdell",
    joint: true,
    foreign: 140000,
    domestic: 20000,
    addback: 139200,
    agi: 22225,
    tax: 0,
    housing: true,
  },
] as const;

for (const entry of cases) {
  Deno.test(`Form 8815 foreign addback complete return: ${entry.id}`, async () => {
    const base = contributionInputs(
      entry.joint ? "joint-mixed-continuation" : "mixed-single-phaseout",
    );
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
          ...base.form8815.line9_worksheet,
          other_1040_and_schedule1_income: entry.foreign + entry.domestic -
            entry.addback,
          foreign_adoption_and_puerto_rico_addbacks: entry.addback,
        },
      },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.form8815.line9, entry.joint ? 162000 : 102000);
    assertEquals(pending.form8815.line14, entry.joint ? 575 : 833);
    assertEquals(pending.f1040.line11_agi, entry.agi);
    assertEquals(
      pending.f1040.line15_taxable_income,
      Math.max(0, entry.agi - (entry.joint ? 31500 : 15750)),
    );
    assertEquals(pending.f1040.line24_total_tax ?? 0, entry.tax);
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
    const root = Deno.env.get("OPENTAX_FORM8815_FOREIGN_MAGI_PROOF_DIR");
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
            origins,
            expected: entry,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    const alterations = [
      { ...pending, form2555: {} },
      {
        ...pending,
        form2555: { ...pending.form2555, foreign_wages: entry.foreign },
      },
      {
        ...pending,
        form2555: {
          filing_details: { ...filing, foreign_wages: entry.foreign + 1 },
        },
      },
      {
        ...pending,
        schedule1: {
          ...pending.schedule1,
          line8d_foreign_earned_income_exclusion: entry.addback + 1,
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
            foreign_adoption_and_puerto_rico_addbacks: entry.addback - 1,
          },
        },
      },
      ...(!entry.joint
        ? [{
          ...pending,
          form8815: {
            ...pending.form8815,
            education_contributions: {
              ...base.form8815.education_contributions!,
              coverdell_beneficiaries: base.form8815.education_contributions!
                .coverdell_beneficiaries.map((row) => ({
                  ...row,
                  other_2025_contributions_by_filers: 500,
                })),
            },
          },
        }]
        : []),
    ];
    for (const altered of alterations) {
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(altered, filer), Error);
    }
  });
}
