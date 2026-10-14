import { assertNonjointSaverDistributionCopies } from "./form8880_distribution_sources.ts";
import { z } from "zod";
import {
  DistributionCode,
  itemSchema,
} from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  nonjointDistributionReviewSchema,
  SaverDistributionTreatment as Treatment,
} from "../../../../../nodes/intermediate/forms/credits/individual/form8880/nonjoint_distribution_review.ts";
import { calculateForm8880 } from "../../../../../nodes/intermediate/forms/credits/individual/form8880/calculation.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { Box12Code } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

const entry = {
  recipient_ssn: "111223333",
  received_date: "2023-01-01",
  gross_amount: 200,
  source_document_ref: "2023-distribution",
  classification_review_ref: "2023-plan-classification",
  treatment: Treatment.Included,
};
const review = {
  taxpayer_ssn: "111-22-3333",
  reviewed_by: "Retirement Reviewer",
  reviewed_on: "2026-04-10",
  filing_due_date: "2026-04-15" as const,
  reviewed_distribution_sources_ref: "2023-to-due-date-inventory",
  complete_distribution_inventory_confirmed: true as const,
  entries: [entry],
};
const source = {
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1985-06-15",
  taxpayer_student_five_months: false,
  taxpayer_claimed_as_dependent: false,
  ira_contributions_taxpayer: 2_000,
  filing_status: FilingStatus.Single,
  agi: 25_000,
  nonjoint_distribution_review: review,
};
const ctx = { taxYear: 2025, formType: "f1040" };

Deno.test("nonjoint ledger applies every reviewed line-4 exception and all nonjoint rates", () => {
  for (const treatment of Object.values(Treatment)) {
    const calculated = calculateForm8880(ctx, {
      ...source,
      nonjoint_distribution_review: {
        ...review,
        entries: [{ ...entry, treatment }],
      },
    }, 2_000);
    assertEquals(
      calculated.credit,
      treatment === Treatment.Included ? 360 : 400,
    );
  }
  for (
    const [filing_status, credit] of [
      [FilingStatus.Single, 360],
      [FilingStatus.MFS, 360],
      [FilingStatus.HOH, 900],
      [FilingStatus.QSS, 360],
    ] as const
  ) {
    assertEquals(
      calculateForm8880(ctx, { ...source, filing_status }, 2_000).credit,
      credit,
    );
  }
});

Deno.test("nonjoint ledger rejects incomplete, duplicate, wrong-owner and out-of-window records", () => {
  for (
    const changed of [
      { ...review, complete_distribution_inventory_confirmed: false },
      { ...review, entries: [entry, entry] },
      { ...review, entries: [{ ...entry, recipient_ssn: "999887777" }] },
      { ...review, entries: [{ ...entry, received_date: "2022-12-31" }] },
      { ...review, entries: [{ ...entry, received_date: "2026-04-15" }] },
      { ...review, entries: [{ ...entry, received_date: "2025-02-30" }] },
      { ...review, entries: [{ ...entry, classification_review_ref: "" }] },
      { ...review, filing_due_date: "2026-10-15" },
      { ...review, extension_confirmation_ref: "unexpected" },
    ]
  ) assertThrows(() => nonjointDistributionReviewSchema.parse(changed));
  for (
    const changed of [
      { ...source, taxpayer_ssn: "999887777" },
      { ...source, taxpayer_ssn: undefined },
      { ...source, distributions_taxpayer: 200 },
      { ...source, distributions_spouse: 0 },
      { ...source, filing_status: FilingStatus.MFJ },
    ]
  ) assertThrows(() => calculateForm8880(ctx, changed, 2_000));
});

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  taxpayer_form8880_student_five_months: false,
  taxpayer_form8880_claimed_as_dependent: false,
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
};
function retirementCopy(
  reference: string,
  amount: number,
  ira = false,
  taxable = amount,
): z.infer<typeof itemSchema> {
  return {
    payer_name: "Example Retirement Plan",
    payer_ein: "98-7654321",
    payer_address_line1: "3 Main St",
    payer_address_city: "Austin",
    payer_address_state: "TX",
    payer_address_zip: "78701",
    recipient_ssn: general.taxpayer_ssn,
    account_number: reference,
    source_document_reference: reference,
    box1_gross_distribution: amount,
    box2a_taxable_amount: taxable,
    box5_employee_contributions: amount - taxable,
    box7_distribution_code: DistributionCode.Code7,
    box7_ira_simple_indicator: ira,
  };
}
function currentEntry(copy: z.infer<typeof itemSchema>) {
  return {
    ...entry,
    received_date: "2025-06-15",
    gross_amount: copy.box1_gross_distribution,
    source_document_ref: copy.source_document_reference!,
    current_year_1099r: {
      payer_ein: copy.payer_ein,
      account_number: copy.account_number!,
      taxable_amount: copy.box2a_taxable_amount!,
      distribution_code: copy.box7_distribution_code,
      second_distribution_code: copy.box7_code2,
      ira_simple_indicator: copy.box7_ira_simple_indicator ?? false,
      plan_classification_review_ref: `${copy.account_number}-plan-review`,
    },
  };
}
const cases: {
  name: string;
  ledger: z.infer<typeof nonjointDistributionReviewSchema>;
  credit: number;
  copies?: z.infer<typeof itemSchema>[];
}[] = [
  {
    name: "prior-and-rollover",
    ledger: {
      ...review,
      entries: [entry, {
        ...entry,
        received_date: "2024-06-01",
        gross_amount: 5_000,
        source_document_ref: "2024-rollover",
        classification_review_ref: "rollover-review",
        treatment: Treatment.RolloverOrTransfer,
      }],
    },
    credit: 360,
  },
  {
    name: "extended-prefiling",
    ledger: {
      ...review,
      filing_due_date: "2026-10-15" as const,
      extension_confirmation_ref: "filed-extension",
      reviewed_on: "2026-10-14",
      entries: [{ ...entry, received_date: "2026-09-15", gross_amount: 500 }],
    },
    credit: 300,
  },
  {
    name: "fully-offset",
    ledger: {
      ...review,
      entries: [{ ...entry, gross_amount: 2_000 }],
    },
    credit: 0,
  },
];
for (
  const [name, copies, credit, prior] of [
    ["current-year-pension", [retirementCopy("pension-2025", 500)], 300, false],
    ["current-year-ira", [retirementCopy("ira-2025", 500, true)], 300, false],
    [
      "current-year-mixed",
      [
        retirementCopy("pension-2025", 300),
        retirementCopy("ira-2025", 400, true),
      ],
      220,
      true,
    ],
    [
      "current-year-partly-taxable",
      [retirementCopy("pension-2025", 500, false, 400)],
      300,
      false,
    ],
    ["current-year-offset", [retirementCopy("pension-2025", 2000)], 0, false],
  ] as const
) {
  cases.push({
    name,
    copies: [...copies],
    credit,
    ledger: {
      ...review,
      entries: [...copies.map(currentEntry), ...(prior ? [entry] : [])],
    },
  });
}
const nonqualifying = {
  ...retirementCopy("nonqualified-annuity", 500),
  box7_code2: DistributionCode.CodeD,
};
cases.push({
  name: "current-year-nonqualifying-plan",
  copies: [nonqualifying],
  credit: 400,
  ledger: {
    ...review,
    entries: [{
      ...currentEntry(nonqualifying),
      treatment: Treatment.NonqualifyingPlan,
    }],
  },
});
for (const item of cases) {
  Deno.test(`public nonjoint distribution ledger ${item.name} reconciles complete exports`, async () => {
    const pensionIncome = (item.copies ?? []).reduce(
      (sum, copy) => sum + (copy.box2a_taxable_amount ?? 0),
      0,
    );
    const wages = 25_000 - pensionIncome;
    const inputs = {
      ...(item.copies ? { f1099r: item.copies } : {}),
      general: {
        ...general,
        ...(item.copies ? { taxpayer_dob: "1964-06-15" } : {}),
        form8880_nonjoint_distribution_review: item.ledger,
      },
      w2: [{
        employee_ssn: general.taxpayer_ssn,
        employer_ein: "12-3456789",
        employer_name: "Example Employer",
        employer_address_line1: "2 Main St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        box1_wages: wages,
        box2_fed_withheld: 1_000,
        box3_ss_wages: wages + 2_000,
        box4_ss_withheld: Math.round((wages + 2_000) * 0.062),
        box5_medicare_wages: wages + 2_000,
        box6_medicare_withheld: Math.round((wages + 2_000) * 0.0145),
        box12_entries: [{ code: Box12Code.D, amount: 2_000 }],
      }],
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals(pending.f1040?.line18_total_tax_before_credits, 928);
    assertEquals(pending.f1040?.line20_nonrefundable_credits ?? 0, item.credit);
    assertEquals(pending.f1040?.line24_total_tax, 928 - item.credit);
    assertEquals(pending.f1040?.line35a_refund, 72 + item.credit);
    const filer = extractFilerIdentity(inputs.general);
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(bundle.xml.includes("<IRS8880"), item.credit > 0);
    const origins: { pageNumber: number; formKey: string; formCopy: number }[] =
      [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    for (
      const altered of [
        {
          ...pending,
          form8880: {
            ...pending.form8880,
            nonjoint_distribution_review: { ...item.ledger, entries: [] },
          },
        },
        {
          ...pending,
          general: {
            ...inputs.general,
            form8880_nonjoint_distribution_review: {
              ...item.ledger,
              entries: [],
            },
          },
        },
      ]
    ) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() =>
        buildPdfBytes(altered, filer, ".pdf-cache", bundle)
      );
    }
    if (item.copies) {
      assertEquals(pending.f1040?.line11_agi, 25_000);
      assertEquals(
        pending.f1040?.line4b_ira_taxable ?? 0,
        item.copies.filter((copy) => copy.box7_ira_simple_indicator).reduce(
          (sum, copy) => sum + copy.box2a_taxable_amount!,
          0,
        ),
      );
      assertEquals(
        pending.f1040?.line5b_pension_taxable ?? 0,
        item.copies.filter((copy) => !copy.box7_ira_simple_indicator).reduce(
          (sum, copy) => sum + copy.box2a_taxable_amount!,
          0,
        ),
      );
      const first = item.copies[0];
      const variants = [
        [],
        [...item.copies, first],
        [{ ...first, recipient_ssn: "999887777" }, ...item.copies.slice(1)],
        [{ ...first, payer_ein: "99-9999999" }, ...item.copies.slice(1)],
        [
          { ...first, account_number: "other-account" },
          ...item.copies.slice(1),
        ],
        [{
          ...first,
          box1_gross_distribution: first.box1_gross_distribution + 1,
        }, ...item.copies.slice(1)],
        [
          { ...first, box2a_taxable_amount: first.box2a_taxable_amount! + 1 },
          ...item.copies.slice(1),
        ],
        [
          { ...first, box7_distribution_code: DistributionCode.Code2 },
          ...item.copies.slice(1),
        ],
        [{
          ...first,
          box7_ira_simple_indicator: !first.box7_ira_simple_indicator,
        }, ...item.copies.slice(1)],
        [
          { ...first, source_document_reference: "different-copy" },
          ...item.copies.slice(1),
        ],
      ];
      for (const copies of variants) {
        assertThrows(() =>
          f1040_2025.executeReturn({ ...inputs, f1099r: copies })
        );
        const altered = {
          ...pending,
          f1099r: { ...pending.f1099r, f1099rs: copies },
        };
        await assertRejects(() =>
          buildMefBundle(altered, { filer, attachments: [] })
        );
        await assertRejects(() =>
          buildPdfBytes(altered, filer, ".pdf-cache", bundle)
        );
      }
    }
    const dir = item.copies
      ? Deno.env.get("FORM8880_CURRENT_EVIDENCE")
      : undefined;
    if (dir) {
      const output = `${dir}/${item.name}`;
      await Deno.mkdir(output, { recursive: true });
      await Deno.writeTextFile(
        `${output}/source.json`,
        JSON.stringify(inputs, null, 2),
      );
      await Deno.writeTextFile(
        `${output}/pending.json`,
        JSON.stringify(result.pending, null, 2),
      );
      await Deno.writeTextFile(
        `${output}/origins.json`,
        JSON.stringify(origins, null, 2),
      );
      await Deno.writeTextFile(`${output}/return.xml`, bundle.xml);
      await Deno.writeFile(`${output}/return.pdf`, pdf);
    }
  });
}

Deno.test("current-year reviewed copies reject missing metadata and contradictory code D treatment", () => {
  assertThrows(() =>
    nonjointDistributionReviewSchema.parse({
      ...review,
      entries: [{ ...entry, received_date: "2025-06-15" }],
    })
  );
  assertThrows(() =>
    nonjointDistributionReviewSchema.parse({
      ...review,
      entries: [{
        ...currentEntry(nonqualifying),
        received_date: "2024-06-15",
      }],
    })
  );
  assertThrows(
    () =>
      assertNonjointSaverDistributionCopies({
        ...review,
        entries: [{
          ...currentEntry(nonqualifying),
          treatment: Treatment.Included,
        }],
      }, [nonqualifying]),
    Error,
    "code D source",
  );
});
