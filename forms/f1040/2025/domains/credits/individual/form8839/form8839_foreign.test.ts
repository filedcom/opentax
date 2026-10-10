import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { z } from "zod";
import { f1040 } from "../../../../../nodes/outputs/general/return-assembly/f1040/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import {
  adoptionReviewAttachments,
  adoptionReviewSource,
} from "../../../../pdf/reviews/general/composed-returns/review-8839.fixture.ts";
import { physicalPresenceFilingSchema } from "../../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";

const base = pdfReviewFixtures.find((row) =>
  row.id === "single-reviewed-adoption-credit"
)!;
const [wage] = z.array(w2ItemSchema).parse(base.inputs.w2);
const foreign =
  z.object({ filing_details: physicalPresenceFilingSchema }).parse(
    pdfReviewFixtures.find((row) =>
      row.id === "single-form2555-full-year-physical-presence"
    )!.inputs.form2555,
  ).filing_details;

// IRS 2025 tax worksheet: mixed income 13,455 - 10,320 = 3,135;
// phaseout 61,751 - 24,047 = 37,704; housing 61,751 - 26,255 = 35,496.
// 279,190 MAGI is halfway through the 259,190–299,190 adoption phaseout.
const cases = [
  {
    id: "foreign-zero-tax-carry",
    foreign: 100000,
    domestic: 0,
    addback: 100000,
    magi: 100000,
    preTax: 0,
    credit: 0,
    carry: 6000,
    housing: false,
  },
  {
    id: "mixed-partial-use-carry",
    foreign: 70000,
    domestic: 30000,
    addback: 70000,
    magi: 100000,
    preTax: 3135,
    credit: 3135,
    carry: 2865,
    housing: false,
  },
  {
    id: "foreign-phaseout",
    foreign: 130000,
    domestic: 149190,
    addback: 130000,
    magi: 279190,
    preTax: 37704,
    credit: 500,
    carry: 0,
    housing: false,
  },
  {
    id: "housing-phaseout",
    foreign: 140000,
    domestic: 139190,
    addback: 139200,
    magi: 279190,
    preTax: 35496,
    credit: 500,
    carry: 0,
    housing: true,
  },
] as const;

for (const entry of cases) {
  Deno.test(`Form 8839 foreign MAGI and finalized packet: ${entry.id}`, async () => {
    const address = {
      ...foreign.foreign_address,
      city: "Gothenburg",
      province_or_state: undefined,
      country_code: "SE",
      postal_code: "411 03",
    };
    const filing = physicalPresenceFilingSchema.parse({
      ...foreign,
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
    const source = {
      ...adoptionReviewSource,
      magi_review: {
        ...adoptionReviewSource.magi_review,
        form2555: {
          no_form2555_filing_or_exclusion_confirmed: false,
          return_wide_review_reference: "2025-filed-physical-presence-review",
        },
      },
    };
    const inputs = {
      ...base.inputs,
      form8839: source,
      form2555: { filing_details: filing },
      w2: entry.domestic
        ? [{
          ...wage,
          box1_wages: entry.domestic,
          box3_ss_wages: entry.domestic,
          box4_ss_withheld: entry.domestic * .062,
          box5_medicare_wages: entry.domestic,
          box6_medicare_withheld: entry.domestic * .0145,
        }]
        : [],
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.f1040.line11_agi, entry.magi - entry.addback);
    assertEquals(pending.f1040.line18_total_tax_before_credits, entry.preTax);
    assertEquals(pending.f1040.line24_total_tax, entry.preTax - entry.credit);
    assertEquals(pending.f1040.line30_refundable_adoption, 5000);
    assertEquals(pending.schedule3.line6c_adoption_credit, entry.credit);
    assertEquals(result.carryforwards.adoption_credit_2025 ?? 0, entry.carry);
    const filer = extractFilerIdentity(pending.f1040);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      filer,
      adoptionReviewAttachments,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_FORM8839_FOREIGN_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
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
      for (const attachment of adoptionReviewAttachments) {
        await Deno.writeFile(
          `${root}/${attachment.fileName}`,
          attachment.bytes,
        );
      }
    }
    assertThrows(
      () =>
        f1040_2025.executeReturn({ ...inputs, form8839: adoptionReviewSource }),
      Error,
    );
    assertThrows(
      () => f1040_2025.executeReturn({ ...inputs, form2555: undefined }),
      Error,
    );
    const changed = [
      { ...pending, form2555: undefined },
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
        form8839_route: {
          ...pending.form8839_route,
          public_source: adoptionReviewSource,
        },
      },
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          form8839_form2555_line45: entry.addback + 1,
        },
      },
      {
        ...pending,
        form8839_route: {
          ...pending.form8839_route,
          pre_adoption_sink_input: {
            ...f1040.inputSchema.parse(
              pending.form8839_route.pre_adoption_sink_input,
            ),
            form8839_form2555_line50: 1,
          },
        },
      },
    ];
    for (const altered of changed) {
      await assertRejects(
        () =>
          f1040_2025.prepareReturn(altered, filer, adoptionReviewAttachments),
        Error,
      );
      await assertRejects(
        () => buildPdfBytes(altered, filer, ".pdf-cache", prepared.bundle),
        Error,
      );
    }
  });
}
