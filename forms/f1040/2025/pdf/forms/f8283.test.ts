import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  f8283,
  FMVMethod,
  inputSchema as form8283InputSchema,
  SectionBPropertyType,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../../../nodes/inputs/schedule_a/index.ts";
import { form8283Pdf } from "./f8283.ts";
import { form8283 } from "../../mef/forms/f8283.ts";
import { form8283FmvReductionStatement } from "../../mef/forms/f8283_fmv_reduction_statement.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "ALEX DONOR",
  nameControl: "DONO",
  address: {
    line1: "1 Main St",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  filingStatus: FilingStatus.Single,
};

const gift = {
  property_description: "Purchased collectible coin",
  donee_organization_name: "Community Museum",
  donee_organization_us_address: {
    line1: "1 Museum Way",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  date_acquired: "2022-02-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 4_500,
  deduction_claimed: 3_000,
  cost_or_adjusted_basis: 3_000,
  fmv_method: FMVMethod.ComparableSales,
  charitable_limit_category: "noncash_50" as const,
  is_capital_gain_property: true,
  capital_gain_reduction_election_confirmed: true as const,
};

const shortTermGift = {
  property_description: "Purchased print",
  donee_organization_name: "Community Arts Center",
  donee_organization_us_address: {
    line1: "12 Arts Road",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  date_acquired: "2025-01-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 1_000,
  deduction_claimed: 700,
  cost_or_adjusted_basis: 700,
  is_capital_gain_property: false,
  charitable_limit_category: "noncash_50" as const,
  fmv_method: FMVMethod.ComparableSales,
  short_term_ordinary_income_reduction_confirmed: true as const,
};

function electedPending() {
  const form = { section_a_items: [gift] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 3_000 },
  };
}

function ordinaryPending() {
  const item = {
    ...shortTermGift,
    property_description: "Purchased used books",
    fmv: 700,
    deduction_claimed: 700,
    cost_or_adjusted_basis: 900,
    short_term_ordinary_income_reduction_confirmed: undefined,
  };
  const form = { section_a_items: [item] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 700 },
  };
}

const electedLand = {
  property_description: "Unimproved investment land",
  property_type: SectionBPropertyType.OtherRealEstate,
  physical_condition: "Unimproved parcel, no structures",
  investment_land_unimproved_confirmed: true as const,
  date_acquired: "2022-02-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 27_000,
  deduction_claimed: 20_000,
  cost_or_adjusted_basis: 20_000,
  charitable_limit_category: "noncash_50" as const,
  is_capital_gain_property: true,
  capital_gain_reduction_election_confirmed: true as const,
  reduction_statement_attachment_file_name: "LandReduction.pdf",
  reduction_statement_source_review: {
    reviewed_by: "Test reviewer",
    reviewed_on: "2025-06-11",
    pdf_sha256: "b".repeat(64),
    original_fmv_matches_pdf_confirmed: true as const,
    adjusted_basis_matches_pdf_confirmed: true as const,
    appreciation_reduction_matches_pdf_confirmed: true as const,
    election_reason_matches_pdf_confirmed: true as const,
  },
  qualified_appraisal: {
    appraiser_first_name: "Sam",
    appraiser_last_name: "Expert",
    signed_date: "2025-06-10",
    appraiser_ein: "123456789",
    us_address: {
      line1: "1 Appraisal Ave",
      city: "Albany",
      state: "NY",
      zip: "12201",
    },
    signed_by_appraiser: true as const,
    signature_attachment_file_name: "AppraiserSignature.pdf",
  },
  donee_acknowledgment: {
    organization_name: "Community Land Trust",
    ein: "987654321",
    received_date: "2025-06-01",
    us_address: {
      line1: "2 Trust Road",
      city: "Albany",
      state: "NY",
      zip: "12201",
    },
    signed_by_donee: true as const,
    unrelated_use: false,
    signature_attachment_file_name: "DoneeSignature.pdf",
  },
};

function electedLandPending() {
  const form = { section_b_items: [electedLand] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form8283InputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 20_000 },
  };
}

Deno.test("Form 8283 PDF maps December 2025 Section A identity and four rows", () => {
  assertEquals(form8283Pdf.pageIndices?.({}), [0]);
  const byKey = new Map(
    form8283Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(byKey.get("filer_name"), "Form8283[0].Page1[0].f1_1[0]");
  assertEquals(byKey.get("filer_ssn"), "Form8283[0].Page1[0].f1_2[0]");
  assertEquals(
    byKey.get("row1_donee"),
    "Form8283[0].Page1[0].Table_Line1_ColsA-C[0].Row1A[0].f1_5[0]",
  );
  assertEquals(
    byKey.get("row4_claim"),
    "Form8283[0].Page1[0].Table_Line1_ColsD-I[0].Row1D[0].f1_39[0]",
  );
  assertEquals(form8283Pdf.fields.length, 65);
});

Deno.test("Form 8283 PDF prints reconciled Section A and carries the FMV explanation", () => {
  const pending = electedPending();
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(instance?.filer_name, "ALEX DONOR");
  assertEquals(
    instance?.row1_donee,
    "Community Museum\n1 Museum Way, Albany, NY 12201",
  );
  assertEquals(instance?.row1_contribution_date, "06/01/2025");
  assertEquals(instance?.row1_acquired_date, "02/2022");
  assertEquals(instance?.row1_basis, 3_000);
  assertEquals(instance?.row1_claim, 3_000);
  assertEquals(instance?.row1_fmv_method, "Comparable sales");
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "unreduced FMV $4500.00 minus $1500.00",
  );
});

Deno.test("Form 8283 PDF prints one reconciled ordinary Section A gift", () => {
  const pending = ordinaryPending();
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(instance?.row1_description, "Purchased used books");
  assertEquals(instance?.row1_claim, 700);
  assertEquals(instance?.row1_basis, 900);
  assertEquals(instance?.row1_fmv_method, "Comparable sales");
  assertEquals(instance?.reduction_statements, []);
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, {
        ...pending,
        f1040: { ...pending.f1040, line12e_itemized_deductions: 701 },
      }),
    Error,
    "differs from recomputed Schedule A",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, {
        ...pending,
        schedule_a: {
          ...pending.schedule_a,
          current_noncash_gift_inventory_complete_confirmed: undefined,
        },
      }),
    Error,
    "complete current-gift inventory",
  );
});

Deno.test("Form 8283 PDF prints every sourced short-term Section A reduction", () => {
  const form = {
    section_a_items: [
      { ...shortTermGift, similar_item_group: "prints" },
      {
        ...shortTermGift,
        property_description: "Second purchased print",
        similar_item_group: "prints",
      },
    ],
  };
  const [instance] = form8283Pdf.instances?.(form, filer, { f8283: form }) ??
    [];
  assertEquals(instance?.row1_claim, 700);
  assertEquals(instance?.row2_claim, 700);
  assertEquals(instance?.row2_description, "Second purchased print");
  assertEquals((instance?.reduction_statements as string[]).length, 2);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "short-term appreciation of $300.00",
  );
});

Deno.test("Form 8283 mixed Section A preview keeps its sole reduction on item B", () => {
  const companion = {
    ...shortTermGift,
    property_description: "Purchased used books",
    similar_item_group: "books",
    date_acquired: "2025-02-01",
    fmv: 600,
    deduction_claimed: 600,
    cost_or_adjusted_basis: 800,
    short_term_ordinary_income_reduction_confirmed: undefined,
  };
  const form = {
    section_a_items: [companion, {
      ...shortTermGift,
      similar_item_group: "prints",
    }],
  };
  const pending = { f8283: form };
  const [instance] = form8283Pdf.instances?.(form, filer, pending) ?? [];
  assertEquals(instance?.row1_claim, 600);
  assertEquals(instance?.row2_claim, 700);
  assertEquals((instance?.reduction_statements as string[]).length, 1);
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "Section A item B: unreduced FMV $1000.00 minus $300.00",
  );
  const statements = form8283FmvReductionStatement.build([], {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["ReductionForB"],
    },
  });
  assertEquals(statements.length, 1);
  assertStringIncludes(statements[0], "Section A item B:");
  const [xml] = form8283.build(form, {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["ReductionForB"],
    },
  });
  assertStringIncludes(xml, 'referenceDocumentId="ReductionForB"');
  assertStringIncludes(xml, "<FairMarketValueAmt>600</FairMarketValueAmt>");
  assertStringIncludes(xml, "<FairMarketValueAmt");
});

Deno.test("Form 8283 mixed Section A preview rejects an unsourced unreduced companion", () => {
  const companion = {
    ...shortTermGift,
    property_description: "Purchased used books",
    similar_item_group: "books",
    fmv: 600,
    deduction_claimed: 600,
    cost_or_adjusted_basis: 800,
    short_term_ordinary_income_reduction_confirmed: undefined,
  };
  for (
    const incomplete of [
      { ...companion, cost_or_adjusted_basis: 500 },
      { ...companion, donee_organization_us_address: undefined },
      { ...companion, date_contributed: "2024-06-01" },
    ]
  ) {
    const form = {
      section_a_items: [incomplete, {
        ...shortTermGift,
        similar_item_group: "prints",
      }],
    };
    assertThrows(
      () => form8283Pdf.instances?.(form, filer, { f8283: form }),
      Error,
      "unreduced companion needs a complete purchased noncapital Section A gift claimed at FMV",
    );
  }
});

Deno.test("Form 8283 PDF rejects incomplete or divergent short-term reductions", () => {
  const form = { section_a_items: [shortTermGift] };
  assertThrows(
    () =>
      form8283Pdf.instances?.(form, filer, {
        f8283: { section_a_items: [{ ...shortTermGift, fmv: 1_100 }] },
      }),
    Error,
    "source differs from the pending return",
  );
  const incomplete = {
    section_a_items: [{ ...shortTermGift, donee_organization_name: "" }],
  };
  assertThrows(
    () => form8283Pdf.instances?.(incomplete, filer, { f8283: incomplete }),
    Error,
    "complete donee, property, dates, basis, and valuation-method facts",
  );
  const mixed = {
    section_a_items: [
      shortTermGift,
      {
        ...shortTermGift,
        short_term_ordinary_income_reduction_confirmed: undefined,
      },
    ],
  };
  assertThrows(
    () => form8283Pdf.instances?.(mixed, filer, { f8283: mixed }),
    Error,
  );
});

Deno.test("Form 8283 PDF prints reconciled Section B land without inventing signatures", () => {
  const pending = electedLandPending();
  const [instance] = form8283Pdf.instances?.(pending.f8283, filer, pending) ??
    [];
  assertEquals(form8283Pdf.pageIndices?.(instance), [0, 1]);
  assertEquals(instance?.section_b_other_real_estate, true);
  assertEquals(instance?.section_b_appraised_fmv, 27_000);
  assertEquals(instance?.section_b_claim, 20_000);
  assertEquals(instance?.section_b_acquired_date, "02/2022");
  assertEquals(instance?.section_b_appraiser_name, "Sam Expert");
  assertEquals(instance?.section_b_appraiser_id, "123456789");
  assertEquals(
    instance?.section_b_appraiser_address,
    "1 Appraisal Ave; Albany, NY 12201",
  );
  assertEquals(instance?.section_b_unrelated_use_no, true);
  assertEquals(instance?.section_b_donee_name, "Community Land Trust");
  assertStringIncludes(
    (instance?.reduction_statements as string[])[0],
    "does not reproduce signatures",
  );
  const byKey = new Map(
    form8283Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(
    byKey.get("section_b_claim"),
    "Form8283[0].Page1[0].Table_Line3_ColsD-I[0].Row3A[0].f1_56[0]",
  );
  assertEquals(
    byKey.get("section_b_donee_name"),
    "Form8283[0].Page2[0].f2_19[0]",
  );
  assertEquals(
    byKey.get("section_b_appraiser_id"),
    "Form8283[0].Page2[0].f2_16[0]",
  );
  assertEquals(
    byKey.get("section_b_appraiser_address"),
    "Form8283[0].Page2[0].f2_17[0]",
  );
  assertEquals(byKey.has("section_b_appraiser_signature"), false);
});

Deno.test("Form 8283 PDF blocks mixed, overflow and unreconciled sources", () => {
  const pending = electedPending();
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        {
          section_a_items: [{ ...gift, similar_item_group: "coins" }],
          section_b_items: [{
            ...electedLand,
            similar_item_group: "investment_land",
          }],
        },
        filer,
        pending,
      ),
    Error,
    "one standalone item without Section A",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        {
          section_a_items: Array(5).fill({
            ...gift,
            similar_item_group: "coins",
          }),
        },
        filer,
        pending,
      ),
    Error,
    "continuation pages remain unsupported",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(pending.f8283, filer, { f8283: pending.f8283 }),
    Error,
    "complete Schedule A source",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        { section_a_items: [{ ...gift, fmv: 5_000 }] },
        filer,
        {
          ...pending,
          f8283: { section_a_items: [{ ...gift, fmv: 5_000 }] },
        },
      ),
    Error,
    "current gifts differ",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        pending.f8283,
        filer,
        {
          ...pending,
          f1040: { ...pending.f1040, line12e_itemized_deductions: 2_999 },
        },
      ),
    Error,
    "recomputed Schedule A lines 11",
  );
  const landPending = electedLandPending();
  assertThrows(
    () =>
      form8283Pdf.instances?.(landPending.f8283, filer, {
        f8283: landPending.f8283,
      }),
    Error,
    "complete Schedule A source",
  );
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        landPending.f8283,
        filer,
        {
          ...landPending,
          f1040: {
            ...landPending.f1040,
            line12e_itemized_deductions: 19_999,
          },
        },
      ),
    Error,
    "recomputed Schedule A lines 11",
  );
  const unsigned = {
    section_b_items: [{
      ...electedLand,
      qualified_appraisal: {
        ...electedLand.qualified_appraisal,
        signature_attachment_file_name: undefined,
      },
    }],
  };
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        unsigned,
        filer,
        { ...landPending, f8283: unsigned },
      ),
    Error,
    "complete investment-land election source with named signature PDFs",
  );
  const impossibleSignatureDate = {
    section_b_items: [{
      ...electedLand,
      qualified_appraisal: {
        ...electedLand.qualified_appraisal,
        signed_date: "2025-02-30",
      },
    }],
  };
  assertThrows(
    () =>
      form8283Pdf.instances?.(
        impossibleSignatureDate,
        filer,
        { ...landPending, f8283: impossibleSignatureDate },
      ),
    Error,
    "valid ISO calendar date",
  );
});
