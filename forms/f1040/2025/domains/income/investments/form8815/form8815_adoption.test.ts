import { assertEquals, assertRejects } from "@std/assert";
import { z } from "zod";
import { contributionInputs } from "./form8815_contributions.fixture.ts";
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
import { reconcilePublicForm8839Pending } from "../../../../../nodes/intermediate/forms/credits/individual/form8839/pending_reconciliation.ts";

const foreign =
  z.object({ filing_details: physicalPresenceFilingSchema }).parse(
    pdfReviewFixtures.find((row) =>
      row.id === "single-form2555-full-year-physical-presence"
    )!.inputs.form2555,
  ).filing_details;
const cases = [
  {
    id: "domestic-qtp-full-use",
    phase: false,
    domestic: 70000,
    foreign: 0,
    exclusion: 2000,
    agi: 70000,
    adoptionMagi: 70000,
    preTax: 6855,
    used: 6000,
    carry: 0,
    refund: 11145,
    withheld: 7000,
    blocked: false,
  },
  {
    id: "domestic-coverdell-bond-phaseout",
    phase: true,
    domestic: 100000,
    foreign: 0,
    exclusion: 833,
    agi: 101167,
    adoptionMagi: 101167,
    preTax: 13708,
    used: 6000,
    carry: 0,
    refund: 4292,
    withheld: 7000,
    blocked: true,
  },
  {
    id: "domestic-coverdell-funded-phaseout",
    phase: true,
    domestic: 100000,
    foreign: 0,
    exclusion: 833,
    agi: 101167,
    adoptionMagi: 101167,
    preTax: 13708,
    used: 6000,
    carry: 0,
    refund: 12292,
    withheld: 15000,
    blocked: false,
  },
  {
    id: "foreign-coverdell-partial-credit",
    phase: true,
    domestic: 30000,
    foreign: 70000,
    exclusion: 833,
    agi: 31167,
    adoptionMagi: 101167,
    preTax: 3388,
    used: 3388,
    carry: 2612,
    refund: 12000,
    withheld: 7000,
    blocked: false,
  },
  {
    id: "foreign-coverdell-unused-credit",
    phase: true,
    domestic: 0,
    foreign: 100000,
    exclusion: 833,
    agi: 1167,
    adoptionMagi: 101167,
    preTax: 0,
    used: 0,
    carry: 6000,
    refund: 5000,
    withheld: 0,
    blocked: false,
  },
] as const;

for (const entry of cases) {
  Deno.test(`Form 8815 and reviewed adoption credit coexist: ${entry.id}`, async () => {
    const base = contributionInputs(
      entry.phase ? "mixed-single-phaseout" : "qtp-self",
    );
    const source = {
      ...adoptionReviewSource,
      magi_review: {
        ...adoptionReviewSource.magi_review,
        form2555: {
          no_form2555_filing_or_exclusion_confirmed: entry.foreign === 0,
          return_wide_review_reference: "combined-return-foreign-income-review",
        },
      },
    };
    const inputs = {
      ...base,
      w2: entry.domestic
        ? base.w2.map((row) => ({
          ...row,
          box1_wages: entry.domestic,
          box2_fed_withheld: entry.withheld,
          box3_ss_wages: entry.domestic,
          box4_ss_withheld: entry.domestic * .062,
          box5_medicare_wages: entry.domestic,
          box6_medicare_withheld: entry.domestic * .0145,
        }))
        : [],
      ...(entry.foreign
        ? {
          form2555: {
            filing_details: { ...foreign, foreign_wages: entry.foreign },
          },
        }
        : {}),
      form8839: source,
      form8815: {
        ...base.form8815,
        line9_worksheet: {
          ...base.form8815.line9_worksheet,
          other_1040_and_schedule1_income: entry.domestic,
          foreign_adoption_and_puerto_rico_addbacks: entry.foreign,
        },
      },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const adoption = reconcilePublicForm8839Pending(pending).settled.credit;
    // Bond MAGI includes excluded bond interest; adoption and Coverdell MAGI do not.
    assertEquals(pending.form8815.line9, entry.phase ? 102000 : 72000);
    assertEquals(pending.form8815.line14, entry.exclusion);
    assertEquals(adoption.magi, entry.adoptionMagi);
    assertEquals(pending.f1040.line11_agi, entry.agi);
    assertEquals(pending.f1040.line18_total_tax_before_credits, entry.preTax);
    assertEquals(pending.f1040.line24_total_tax, entry.preTax - entry.used);
    assertEquals(pending.f1040.line30_refundable_adoption, 5000);
    assertEquals(pending.schedule3.line6c_adoption_credit, entry.used);
    assertEquals(result.carryforwards.adoption_credit_2025 ?? 0, entry.carry);
    assertEquals(pending.f1040.line35a_refund, entry.refund);
    const filer = extractFilerIdentity(pending.f1040);
    const root = Deno.env.get("OPENTAX_FORM8815_ADOPTION_PROOF_DIR");
    if (entry.blocked) {
      // Existing deferred93: positive refund still retains the pre-credit amount owed.
      assertEquals(pending.f1040.line37_amount_owed, 6708);
      await assertRejects(
        () =>
          f1040_2025.prepareReturn(
            result.pending,
            filer,
            adoptionReviewAttachments,
          ),
        Error,
        "line 37 differs",
      );
      if (root) {
        await Deno.mkdir(root, { recursive: true });
        await Deno.writeTextFile(
          `${root}/${entry.id}-blocked.json`,
          JSON.stringify(
            {
              inputs,
              pending,
              filer,
              expected: entry,
              blocker:
                "deferred93 stale amount owed; no valid native/PDF packet",
              acceptanceVerified: false,
            },
            null,
            2,
          ),
        );
      }
      return;
    }
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
      for (const attachment of adoptionReviewAttachments) {
        await Deno.writeFile(
          `${root}/${attachment.fileName}`,
          attachment.bytes,
        );
      }
    }
    const alterations = [
      { ...pending, form8839_route: undefined },
      { ...pending, form8839: { ...pending.form8839, adoption_benefits: 1 } },
      {
        ...pending,
        form8839_route: {
          ...pending.form8839_route,
          public_source: { ...source, adoption_benefits: 1 },
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line30_refundable_adoption: 5001 },
      },
      {
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line6c_adoption_credit: entry.used + 1,
        },
      },
      {
        ...pending,
        form8815: {
          ...pending.form8815,
          line9_worksheet: {
            ...inputs.form8815.line9_worksheet,
            foreign_adoption_and_puerto_rico_addbacks: entry.foreign + 5000,
          },
        },
      },
    ];
    for (const altered of alterations) {
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
