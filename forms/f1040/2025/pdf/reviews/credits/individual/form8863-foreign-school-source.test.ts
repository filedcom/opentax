import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { form8863Pdf } from "../../../forms/credits/individual/f8863.ts";
import {
  type F8863Item,
  itemSchema,
} from "../../../../../nodes/inputs/credits/individual/f8863/index.ts";
import { claimantReviewSchema } from "../../../../../nodes/inputs/credits/individual/f8863/claimant-review.ts";
import { filer, fixture } from "./form8863-claimant-source.fixture.ts";
import { ty2025IrsCountryName } from "../../../support/irs_country_name.ts";
import { schools } from "./form8863-school-sources.fixture.ts";

const cases = [
  {
    name: "aoc-checked",
    credit: "aoc",
    count: 1,
    checked: true,
    parent: false,
  },
  {
    name: "aoc-unchecked",
    credit: "aoc",
    count: 1,
    checked: false,
    parent: false,
  },
  {
    name: "llc-checked",
    credit: "llc",
    count: 1,
    checked: true,
    parent: false,
  },
  {
    name: "llc-unchecked",
    credit: "llc",
    count: 1,
    checked: false,
    parent: false,
  },
  { name: "aoc-three", credit: "aoc", count: 3, checked: true, parent: false },
  { name: "llc-three", credit: "llc", count: 3, checked: true, parent: false },
  {
    name: "parent-mixed",
    credit: "aoc",
    count: 3,
    checked: true,
    parent: true,
  },
  { name: "parent-llc", credit: "llc", count: 3, checked: true, parent: true },
] as const;

type Workpaper = NonNullable<F8863Item["education_expense_workpaper"]>;
function currentPayments(workpaper: Workpaper): Workpaper {
  return {
    ...workpaper,
    payment_sources: workpaper.payment_sources!.map((p) => ({
      ...p,
      payment_date: "2025-09-02",
      payment_account_record_reference: `${p.payment_record_id}-bank`,
    })),
  };
}
const foreignAddresses = [
  {
    line1: "40 College Road",
    line2: "Unit 2",
    city: "Toronto",
    province_or_state: "ON",
    country_code: "CA",
    postal_code: "M5S 1A1",
    postal_address_lines: ["40 College Road Unit 2", "Toronto ON M5S 1A1"],
  },
  {
    line1: "10 College Road",
    city: "London",
    country_code: "UK",
    postal_code: "WC1E 6BT",
    postal_address_lines: ["10 College Road", "London WC1E 6BT"],
  },
  {
    line1: "12 rue des Ecoles",
    city: "Paris",
    country_code: "FR",
    postal_code: "75005",
    postal_address_lines: ["12 rue des Ecoles", "75005 Paris"],
  },
  {
    line1: "20 Hochschulstrasse",
    city: "Bonn",
    country_code: "GM",
    postal_code: "53113",
    postal_address_lines: ["20 Hochschulstrasse", "53113 Bonn"],
  },
];

function history(
  item: F8863Item,
  checked: boolean,
  position: number,
  country: number,
): F8863Item {
  return itemSchema.parse({
    ...item,
    filing_details: {
      ...item.filing_details!,
      institutions: item.filing_details!.institutions.map((school, i) => ({
        ...school,
        us_address: i === 1
          ? { ...school.us_address!, line2: "Building 2" }
          : undefined,
        foreign_address: i === 1
          ? undefined
          : foreignAddresses[(country + position + i) % 4],
        prior_year_1098t_received: true,
        prior_year_1098t_source: {
          tax_year: 2024,
          student_ssn: item.student_ssn,
          institution_name: school.name,
          institution_ein: school.ein,
          document_id: `2024-${item.student_ssn}-${i}-1098T`,
          box1_payments: 12500,
          box7_early_2025: i % 2 === 0 && position === 0 ? checked : false,
        },
      })),
    },
    education_expense_workpaper: item.education_expense_workpaper
      ? currentPayments(item.education_expense_workpaper)
      : undefined,
    institution_expense_workpapers: item.institution_expense_workpapers?.map((
      s,
    ) => ({
      ...s,
      workpaper: currentPayments(s.workpaper),
    })),
  });
}
function changeWorkpaper(
  item: F8863Item,
  transform: (w: Workpaper) => Workpaper,
): F8863Item {
  return {
    ...item,
    education_expense_workpaper: item.education_expense_workpaper
      ? transform(item.education_expense_workpaper)
      : undefined,
    institution_expense_workpapers: item.institution_expense_workpapers?.map((
      s,
      i,
    ) => i ? s : { ...s, workpaper: transform(s.workpaper) }),
  };
}
for (const [country, c] of cases.entries()) {
  Deno.test(`Form 8863 foreign school ${c.name}: local postal order, full country, complete native/PDF`, async () => {
    const base = fixture(c.parent ? "parent-two" : "student-refundable");
    const students = base.inputs.f8863.map((s, i) => {
      const credit = i > 0 ? "llc" : c.credit;
      const current = c.count > 1
        ? schools(s, c.count, credit)
        : itemSchema.parse({
          ...s,
          credit_type: credit,
          aoc_adjusted_expenses: credit === "aoc" ? 4000 : undefined,
          llc_adjusted_expenses: credit === "llc" ? 4000 : undefined,
          aoc_claimed_4_prior_years: credit === "llc",
          enrolled_half_time: credit === "aoc" ? true : undefined,
          completed_4_years_postsec: credit === "aoc" ? false : undefined,
          felony_drug_conviction: credit === "aoc" ? false : undefined,
        });
      return history(current, c.checked, i, country);
    });
    const review = claimantReviewSchema.parse(base.review);
    const tuition = c.count === 1 ? 4500 : 9000;
    const education = c.parent
      ? (c.credit === "aoc" ? 3000 : 2000)
      : (c.credit === "llc" && c.count === 1 ? 800 : 928);
    const refundable = c.credit === "aoc" ? 1000 : 0;
    const tax = base.tax - education - (c.parent ? 1000 : 0);
    const refund = (c.parent ? 11000 : 3000) + refundable - tax;
    const inputs = {
      ...base.inputs,
      f8863: students,
      f8863_claimant_review: {
        claimant_review: review.kind === "under_24"
          ? {
            ...review,
            support_sources: review.support_sources.map((s, i) => ({
              ...s,
              amount: i === 0
                ? 50000 - tuition
                : i === 1
                ? tuition
                : c.count * 500,
            })),
          }
          : review,
      },
      f8812: base.inputs.f8812?.map((s) => ({
        ...s,
        credit_limit_worksheet: {
          ...s.credit_limit_worksheet,
          schedule3_line3: education,
        },
      })),
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals([
      pending.schedule3?.line3_education_credit,
      pending.f1040?.line29_refundable_aoc ?? 0,
      pending.f1040?.line24_total_tax,
      pending.f1040?.line35a_refund,
    ], [education, refundable, tax, refund]);
    const instances = form8863Pdf.instances!(
      pending.f8863!,
      filer,
      result.pending,
    );
    const answers = students.flatMap((s) =>
      s.filing_details!.institutions.map((i) =>
        i.prior_year_1098t_source!.box7_early_2025
      )
    );
    const projected = instances.flatMap((p) =>
      [0, 1].flatMap((i) =>
        p[`pdf_institution_${i}_name`]
          ? [p[`pdf_institution_${i}_prior_box7`] === "yes"]
          : []
      )
    );
    assertEquals(projected, answers);
    const addresses = instances.flatMap((p) =>
      [0, 1].flatMap((i) =>
        p[`pdf_institution_${i}_name`]
          ? [p[`pdf_institution_${i}_address`]]
          : []
      )
    );
    assertEquals(
      addresses,
      students.flatMap((s) =>
        s.filing_details!.institutions.map((i) => {
          const f = i.foreign_address;
          return f
            ? [...f.postal_address_lines!, ty2025IrsCountryName(f.country_code)]
              .join("\n")
            : `${i.us_address!.line1}\nBuilding 2\n${i.us_address!.city}, ${
              i.us_address!.state
            } ${i.us_address!.zip}`;
        })
      ),
    );

    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const nativeAnswers = [
      ...bundle.xml.matchAll(
        /<PriorYear1098TReceivedInd>(true|false)<\/PriorYear1098TReceivedInd>/g,
      ),
    ].map((m) => m[1] === "true");
    assertEquals(nativeAnswers, answers);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const retained = Deno.args.includes("--write-review-artifacts");
    const dir = retained
      ? `.state/research/form8863-foreign-school-2026-10-09/${c.name}`
      : await Deno.makeTempDir();
    try {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
          `${dir}/return.xml`,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      for (
        const [name, value] of [
          ["source", inputs],
          ["pending", pending],
          ["origins", origins],
          ["instances", instances],
          ["expected", {
            education,
            refundable,
            tax,
            refund,
            answers,
            counts: students.map(() => c.count),
          }],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
    } finally {
      if (!retained) await Deno.remove(dir, { recursive: true });
    }
    const item = pending.f8863!.f8863s[0];
    const first = item.filing_details!.institutions[0];
    const prior = first.prior_year_1098t_source!;
    const workpaper = item.education_expense_workpaper ??
      item.institution_expense_workpapers![0].workpaper;
    const foreign = first.foreign_address!;
    const badForeign = [
      { ...foreign, postal_address_lines: undefined },
      { ...foreign, postal_address_lines: [foreign.line1] },
      {
        ...foreign,
        postal_address_lines: [...foreign.postal_address_lines!, foreign.line1],
      },
      {
        ...foreign,
        postal_address_lines: [
          "Unrelated Road",
          foreign.postal_address_lines![1],
        ],
      },
      {
        ...foreign,
        postal_address_lines: [
          foreign.line1.replace(" ", "\n"),
          foreign.postal_address_lines![1],
        ],
      },
      { ...foreign, country_code: "ZZ" },
      { ...foreign, postal_address_lines: ["X".repeat(43)] },
    ];
    for (const address of badForeign) {
      const changed = {
        ...pending,
        f8863: {
          ...pending.f8863!,
          f8863s: [
            {
              ...item,
              filing_details: {
                ...item.filing_details!,
                institutions: [
                  { ...first, foreign_address: address },
                  ...item.filing_details!.institutions.slice(1),
                ],
              },
            },
            ...pending.f8863!.f8863s.slice(1),
          ],
        },
      };
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
    const alteredSchools = [
      { ...first, prior_year_1098t_source: undefined },
      { ...first, prior_year_1098t_received: false },
      {
        ...first,
        prior_year_1098t_source: { ...prior, student_ssn: "999887777" },
      },
      {
        ...first,
        prior_year_1098t_source: { ...prior, institution_ein: "99-8877777" },
      },
      {
        ...first,
        prior_year_1098t_source: {
          ...prior,
          institution_name: "Other College",
        },
      },
      {
        ...first,
        prior_year_1098t_source: {
          ...prior,
          document_id: workpaper.form1098t_document_id!,
        },
      },
    ];
    const variants = [
      ...alteredSchools.map((school) => ({
        ...item,
        filing_details: {
          ...item.filing_details!,
          institutions: [school, ...item.filing_details!.institutions.slice(1)],
        },
      })),
      ...[undefined, "2024-12-31", "2026-01-01"].map((payment_date) =>
        changeWorkpaper(
          item,
          (w) => ({
            ...w,
            payment_sources: w.payment_sources!.map((p) => ({
              ...p,
              payment_date,
            })),
          }),
        )
      ),
      changeWorkpaper(
        item,
        (w) => ({
          ...w,
          payment_sources: w.payment_sources!.map((p) => ({
            ...p,
            payment_account_record_reference: undefined,
          })),
        }),
      ),
      changeWorkpaper(item, (w) => ({ ...w, assistance_sources: undefined })),
      {
        ...item,
        ...(c.credit === "aoc"
          ? {
            aoc_adjusted_expenses: item.aoc_adjusted_expenses! +
              prior.box1_payments,
          }
          : {
            llc_adjusted_expenses: item.llc_adjusted_expenses! +
              prior.box1_payments,
          }),
      },
    ];
    assertEquals(variants.length, 12);
    for (const altered of variants) {
      const changed = {
        ...pending,
        f8863: {
          ...pending.f8863!,
          f8863s: [altered, ...pending.f8863!.f8863s.slice(1)],
        },
      };
      await assertRejects(() =>
        buildMefBundle(changed, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
  });
}
