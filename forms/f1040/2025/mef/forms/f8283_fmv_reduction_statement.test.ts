import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  f8283,
  FMVMethod,
  inputSchema,
  SectionBPropertyType,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA as scheduleANode,
} from "../../../nodes/inputs/schedule_a/index.ts";
import { buildFmvReductionStatement, form8283 } from "./f8283.ts";
import { form8283FmvReductionStatement } from "./f8283_fmv_reduction_statement.ts";
import { scheduleA as scheduleAMef } from "./schedule_a.ts";

const electedCapitalGift = {
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

Deno.test("Form 8283 capital-gain election needs complete return-wide source", () => {
  const pending = { f8283: { section_a_items: [electedCapitalGift] } };
  const statement = buildFmvReductionStatement(electedCapitalGift, 0);
  assertStringIncludes(statement, "unreduced FMV $4500.00");
  assertStringIncludes(
    statement,
    "long-term capital appreciation of $1500.00",
  );
  assertStringIncludes(statement, "adjusted basis $3000.00");
  assertThrows(
    () => form8283FmvReductionStatement.build([], { pending }),
    Error,
    "complete Schedule A source",
  );
  assertThrows(
    () =>
      form8283.build(pending.f8283, {
        pending,
        documentIdsByPendingKey: {
          form8283_fmv_reduction_statement: ["FMVReduction1"],
        },
      }),
    Error,
    "complete Schedule A source",
  );
});

Deno.test("Form 8283 election cannot file with an unsourced prior-year carryover", () => {
  assertThrows(
    () =>
      form8283.build({ section_a_items: [electedCapitalGift] }, {
        pending: {
          schedule_a: { line_13_contribution_carryover: 5_000 },
        },
      }),
    Error,
    "complete Schedule A source",
  );
});

const electedSectionBLand = {
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
  signed_form_attachment_file_name: "CompletedSignedLand8283.pdf",
  signed_form_source_review: {
    reviewed_by: "Test reviewer",
    reviewed_on: "2025-06-11",
    pdf_sha256: "a".repeat(64),
    appraiser_signature_present: true as const,
    donee_signature_present: true as const,
    matches_electronic_form_confirmed: true as const,
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

function electedSectionBReturn() {
  const form = { section_b_items: [electedSectionBLand] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleANode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  const schedule = { ...source, ...finalized };
  const pending = {
    f8283: form,
    schedule_a: schedule,
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 20_000 },
  };
  const context = {
    pending,
    attachmentDescriptionsByFileName: {
      "LandReduction.pdf": "Form 8283 Section B FMV reduction statement",
      "AppraiserSignature.pdf": "Form 8283 appraiser signature document",
      "DoneeSignature.pdf": "Form 8283 Donee signature document",
      "CompletedSignedLand8283.pdf": "Form 8283 completed signed Section B",
    },
    documentIdsByAttachmentFileName: {
      "LandReduction.pdf": "BinaryAttachmentReduction",
      "AppraiserSignature.pdf": "BinaryAttachmentAppraiser",
      "DoneeSignature.pdf": "BinaryAttachmentDonee",
      "CompletedSignedLand8283.pdf": "BinaryAttachmentSignedForm",
    },
    attachmentSha256ByFileName: {
      "LandReduction.pdf": "b".repeat(64),
      "CompletedSignedLand8283.pdf": "a".repeat(64),
    },
    documentIdsByPendingKey: {},
  };
  return { form, schedule, pending, context };
}

Deno.test("Form 8283 Section B election keeps appraised FMV and reduced deduction separate", () => {
  const { form, schedule, context } = electedSectionBReturn();
  const [xml] = form8283.build(form, context);
  assertStringIncludes(
    xml,
    "<AppraisedFairMarketValueAmt>27000</AppraisedFairMarketValueAmt>",
  );
  assertStringIncludes(xml, "<DeductionClaimedAmt>20000</DeductionClaimedAmt>");
  assertStringIncludes(
    xml,
    'referenceDocumentId="BinaryAttachmentReduction BinaryAttachmentSignedForm BinaryAttachmentAppraiser BinaryAttachmentDonee"',
  );
  assertStringIncludes(
    scheduleAMef.build(schedule, context),
    "<OtherThanByCashOrCheckAmt>20000</OtherThanByCashOrCheckAmt>",
  );
});

Deno.test("Form 8283 Section B election rejects missing reduction PDF and divergent source", () => {
  const { form, context } = electedSectionBReturn();
  assertThrows(
    () =>
      form8283.build(form, {
        ...context,
        attachmentDescriptionsByFileName: {
          ...context.attachmentDescriptionsByFileName,
          "LandReduction.pdf": "Unrelated PDF",
        },
      }),
    Error,
    "matching FMV-reduction statement PDF",
  );
  assertThrows(
    () =>
      form8283.build(form, {
        ...context,
        attachmentSha256ByFileName: {
          ...context.attachmentSha256ByFileName,
          "LandReduction.pdf": "c".repeat(64),
        },
      }),
    Error,
    "bytes do not match the reviewed source SHA-256",
  );
  assertThrows(
    () =>
      form8283.build(form, {
        ...context,
        documentIdsByAttachmentFileName: {
          ...context.documentIdsByAttachmentFileName,
          "LandReduction.pdf": "",
        },
      }),
    Error,
    "no linked MeF document",
  );
  assertThrows(
    () =>
      form8283.build(form, {
        ...context,
        pending: {
          ...context.pending,
          schedule_a: {
            ...context.pending.schedule_a,
            line_12_noncash_contributions: 27_000,
          },
        },
      }),
    Error,
    "recomputed Schedule A lines 11–13",
  );
  assertEquals(
    inputSchema.safeParse({
      section_b_items: [{
        ...electedSectionBLand,
        date_acquired: "2025-01-01",
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      section_b_items: [{
        ...electedSectionBLand,
        reduction_statement_source_review: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 8283 Section B election needs an actual 2025 contribution date", () => {
  for (const date_contributed of ["2024-06-01", "2025-02-30"]) {
    assertEquals(
      inputSchema.safeParse({
        section_b_items: [{ ...electedSectionBLand, date_contributed }],
      }).success,
      false,
    );
  }
});

function electedReturn() {
  const form = { section_a_items: [electedCapitalGift] };
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(form),
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleANode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  const schedule = { ...source, ...finalized };
  const pending = {
    f8283: form,
    schedule_a: schedule,
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 3_000 },
  };
  return { form, schedule, pending };
}

Deno.test("elected Section A links native statement and reconciles Schedule A line 12", () => {
  const { form, schedule, pending } = electedReturn();
  const statements = form8283FmvReductionStatement.build([], {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["FMVReduction1"],
    },
  });
  assertEquals(statements.length, 1);
  assertStringIncludes(statements[0], "unreduced FMV $4500.00");
  const firstPass = form8283.build(form, { pending });
  assertStringIncludes(
    firstPass[0],
    "<FairMarketValueAmt>3000</FairMarketValueAmt>",
  );
  const xml = form8283.build(form, {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["FMVReduction1"],
    },
  });
  assertStringIncludes(xml[0], 'referenceDocumentId="FMVReduction1"');
  assertStringIncludes(xml[0], "<FairMarketValueAmt");
  assertStringIncludes(xml[0], ">3000</FairMarketValueAmt>");
  assertStringIncludes(
    xml[0],
    "<AddressLine1Txt>1 Museum Way</AddressLine1Txt>",
  );
  assertStringIncludes(
    xml[0],
    "<FairMarketValueMethodDesc>Comparable sales</FairMarketValueMethodDesc>",
  );
  assertStringIncludes(
    scheduleAMef.build(schedule, {
      pending,
      documentIdsByPendingKey: {
        form8283_fmv_reduction_statement: ["FMVReduction1"],
      },
    }),
    "<OtherThanByCashOrCheckAmt>3000</OtherThanByCashOrCheckAmt>",
  );
});

Deno.test("elected Section A needs its printed donee and valuation facts", () => {
  const { pending } = electedReturn();
  for (
    const incomplete of [
      { ...electedCapitalGift, donee_organization_us_address: undefined },
      { ...electedCapitalGift, donee_organization_name: undefined },
      { ...electedCapitalGift, fmv_method: undefined },
      { ...electedCapitalGift, property_description: "" },
    ]
  ) {
    const source = {
      ...pending,
      f8283: { section_a_items: [incomplete] },
    };
    assertThrows(
      () => form8283FmvReductionStatement.build([], { pending: source }),
      Error,
      "complete donee, property, dates, basis, and valuation-method facts",
    );
    assertThrows(
      () => form8283.build(source.f8283, { pending: source }),
      Error,
      "complete donee, property, dates, basis, and valuation-method facts",
    );
  }
});

Deno.test("Form 8283 non-election reductions require distinct statement IDs", () => {
  const shortTerm = {
    property_description: "Purchased art print",
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
    similar_item_group: "art prints",
    fmv_method: FMVMethod.ComparableSales,
    short_term_ordinary_income_reduction_confirmed: true as const,
  };
  const form = {
    section_a_items: [
      shortTerm,
      { ...shortTerm, property_description: "Second purchased art print" },
    ],
  };
  const pending = { f8283: form };
  assertEquals(
    form8283FmvReductionStatement.build([], { pending }).length,
    2,
  );
  const linked = form8283.build(form, {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["reduction1", "reduction2"],
    },
  });
  assertStringIncludes(linked[0], 'referenceDocumentId="reduction1"');
  assertStringIncludes(linked[0], 'referenceDocumentId="reduction2"');
  assertStringIncludes(linked[0], ">700</FairMarketValueAmt>");
  assertThrows(
    () =>
      form8283FmvReductionStatement.build([], {
        pending,
        documentIdsByPendingKey: {
          form8283_fmv_reduction_statement: ["reduction1"],
        },
      }),
    Error,
    "distinct linked native FMV-reduction statement IDs",
  );
  assertThrows(
    () =>
      form8283FmvReductionStatement.build([], {
        pending,
        documentIdsByPendingKey: {
          form8283_fmv_reduction_statement: ["same", "same"],
        },
      }),
    Error,
    "distinct linked native FMV-reduction statement IDs",
  );
  assertThrows(
    () =>
      form8283.build(form, {
        pending,
        documentIdsByPendingKey: {
          form8283_fmv_reduction_statement: ["same", "same"],
        },
      }),
    Error,
    "distinct native FMV-reduction statement IDs",
  );
});

Deno.test("Form 8283 purchased short-term reduction needs complete Section A source", () => {
  const item = {
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
  const statement = form8283FmvReductionStatement.build([], {
    pending: { f8283: { section_a_items: [item] } },
  });
  assertStringIncludes(statement[0], "short-term appreciation of $300.00");
  assertThrows(
    () =>
      form8283.build({ section_a_items: [item] }, {
        pending: {
          f8283: {
            section_a_items: [{
              ...item,
              property_description: "Different print",
            }],
          },
        },
      }),
    Error,
    "reduction differs from the pending source used by its statement",
  );
  assertEquals(
    inputSchema.safeParse({
      section_a_items: [{
        ...item,
        date_acquired: "2024-01-01",
        date_contributed: "2024-06-01",
      }],
    }).success,
    false,
  );
  for (
    const incomplete of [
      { ...item, donee_organization_name: "" },
      { ...item, donee_organization_us_address: undefined },
      { ...item, fmv_method: undefined },
    ]
  ) {
    const form = { section_a_items: [incomplete] };
    assertThrows(
      () =>
        form8283FmvReductionStatement.build([], {
          pending: { f8283: form },
        }),
      Error,
      "complete donee, property, dates, basis, and valuation-method facts",
    );
    assertThrows(
      () => form8283.build(form),
      Error,
      "complete donee, property, dates, basis, and valuation-method facts",
    );
  }
});

Deno.test("Form 8283 vehicle-sale reduction statement needs complete, matching donee facts", () => {
  const item = {
    property_description: "2020 Honda Civic",
    donee_organization_name: "City Charity",
    donee_organization_us_address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    is_vehicle: true,
    vehicle_vin: "1HGBH41JXMN109186",
    date_acquired: "2020-01-01",
    date_contributed: "2025-06-01",
    donor_acquisition_description: "Purchase",
    fmv: 20_000,
    deduction_claimed: 15_000,
    cost_or_adjusted_basis: 25_000,
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: false,
    fmv_method: FMVMethod.ComparableSales,
    vehicle_sale_acknowledgment: {
      copy_received_from_donee: true as const,
      donee_certified: true as const,
      donee_name: "City Charity",
      donee_ein: "987654321",
      donee_us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      acknowledgment_received_date: "2025-07-15",
      sale_to_unrelated_party: true as const,
      sale_date: "2025-07-01",
      gross_proceeds: 15_000,
      vehicle_year: 2020,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Good condition",
      odometer_miles: 60_000,
      goods_or_services_received: false as const,
    },
  };
  const pending = { f8283: { section_a_items: [item] } };
  assertStringIncludes(
    form8283FmvReductionStatement.build([], { pending })[0],
    "gross proceeds $15000.00",
  );
  for (
    const incomplete of [
      { ...item, donee_organization_us_address: undefined },
      { ...item, date_acquired: undefined },
      { ...item, fmv_method: undefined },
    ]
  ) {
    assertThrows(
      () =>
        form8283FmvReductionStatement.build([], {
          pending: { f8283: { section_a_items: [incomplete] } },
        }),
      Error,
      "complete donee, property, dates, basis, and valuation-method facts",
    );
  }
  assertThrows(
    () =>
      form8283.build({
        section_a_items: [{
          ...item,
          donee_organization_name: "Different Charity",
        }],
      }),
    Error,
    "donee differs from the certified acknowledgment",
  );
});

Deno.test("elected Section A rejects missing statement IDs and mismatched inventory", () => {
  const { form, pending } = electedReturn();
  assertThrows(
    () =>
      form8283FmvReductionStatement.build([], {
        pending: {
          ...pending,
          schedule_a: {
            ...pending.schedule_a,
            noncash_contribution_items: [],
          },
        },
      }),
    Error,
    "current gifts differ",
  );
  assertThrows(
    () => form8283.build(form, { pending, documentIdsByPendingKey: {} }),
    Error,
    "distinct native FMV-reduction statement IDs",
  );
  assertThrows(
    () =>
      form8283.build(form, {
        pending: {
          ...pending,
          schedule_a: {
            ...pending.schedule_a,
            noncash_contribution_items: [],
          },
        },
        documentIdsByPendingKey: {
          form8283_fmv_reduction_statement: ["FMVReduction1"],
        },
      }),
    Error,
    "current gifts differ",
  );
});

Deno.test("Form 8283 capital-gain election rejects short holding, unmatched basis, and other AGI category", () => {
  for (
    const item of [
      { ...electedCapitalGift, date_acquired: "2025-01-01" },
      { ...electedCapitalGift, date_acquired: "2024-06-01" },
      { ...electedCapitalGift, date_contributed: "2026-06-01" },
      { ...electedCapitalGift, cost_or_adjusted_basis: 2_900 },
      { ...electedCapitalGift, charitable_limit_category: "capital_gain_30" },
      { ...electedCapitalGift, is_vehicle: true },
    ]
  ) {
    assertThrows(
      () => inputSchema.parse({ section_a_items: [item] }),
      Error,
      "capital-gain election reduction needs nonvehicle purchased capital property held more than one year",
    );
  }
});

Deno.test("Form 8283 capital-gain election cannot claim an unchanged or missing reduction", () => {
  for (
    const item of [
      { ...electedCapitalGift, deduction_claimed: 4_500 },
      { ...electedCapitalGift, deduction_claimed: undefined },
      { ...electedCapitalGift, fmv: undefined },
    ]
  ) {
    assertThrows(
      () => inputSchema.parse({ section_a_items: [item] }),
      Error,
      "capital-gain election statement needs FMV and a claimed contribution reduced below FMV",
    );
  }
});

Deno.test("Form 8283 capital-gain election does not mix a 30% capital-gain gift in the same form", () => {
  assertThrows(
    () =>
      inputSchema.parse({
        section_a_items: [
          { ...electedCapitalGift, similar_item_group: "coins" },
          {
            ...electedCapitalGift,
            property_description: "Other coin",
            similar_item_group: "coins",
            deduction_claimed: 600,
            fmv: 600,
            cost_or_adjusted_basis: 600,
            charitable_limit_category: "capital_gain_30",
            capital_gain_reduction_election_confirmed: undefined,
          },
        ],
      }),
    Error,
    "capital-gain election applies to all current-year capital-gain property gifts",
  );
});

Deno.test("Form 8283 statement builder rejects a reduced gift without a validated reduction route", () => {
  assertThrows(
    () =>
      buildFmvReductionStatement({
        ...electedCapitalGift,
        capital_gain_reduction_election_confirmed: undefined,
      }, 0),
    Error,
    "reduced claim needs certified sale proceeds",
  );
});
