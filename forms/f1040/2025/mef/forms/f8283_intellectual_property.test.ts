import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  f8283,
  FMVMethod,
  inputSchema as form8283InputSchema,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA as scheduleANode,
} from "../../../nodes/inputs/schedule_a/index.ts";
import { form8283Pdf } from "../../pdf/forms/f8283.ts";
import { form8283 } from "./f8283.ts";
import { form8283FmvReductionStatement } from "./f8283_fmv_reduction_statement.ts";
import { scheduleA as scheduleAMef } from "./schedule_a.ts";

const gift = {
  property_description: "Purchased patent US 1234567 for water filter",
  donee_organization_name: "Community Science Institute",
  donee_organization_us_address: {
    line1: "1 Science Way",
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
  intellectual_property_capital_gain_reduction: {
    property_kind: "purchased_patent" as const,
    patent_number: "US1234567",
    patent_registration_record_reference: "USPTO registration PAT-17",
    purchase_record_reference: "Patent purchase PAT-17",
    unamortized_basis_schedule_reference: "Patent basis schedule PAT-17",
    unamortized_adjusted_basis: 3_000,
    donee_2025_net_income_statement_reference:
      "Institute income statement PAT-17",
    donor_owned_full_patent_rights_verified: true as const,
    all_patent_rights_transferred_to_donee_verified: true as const,
    adjusted_basis_excludes_prior_amortization_verified: true as const,
    donee_2025_net_income_zero_verified: true as const,
    hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

function pendingReturn(item = gift) {
  const form = form8283InputSchema.parse({ section_a_items: [item] });
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleANode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: { line11_agi: 100_000, line12e_itemized_deductions: 3_000 },
  };
}

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

Deno.test("Form 8283 patent initial basis limit reaches Schedule A, Form 1040, native statement and PDF", () => {
  const pending = pendingReturn();
  assertEquals(pending.schedule_a.line_12_noncash_contributions, 3_000);
  assertEquals(pending.f1040.line12e_itemized_deductions, 3_000);
  const [statement] = form8283FmvReductionStatement.build([], { pending });
  assertStringIncludes(statement, "section 170(e)(1)(B)(iii)");
  assertStringIncludes(statement, "Patent basis schedule PAT-17");
  const [xml] = form8283.build(pending.f8283, {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["patent-reduction"],
    },
  });
  assertStringIncludes(xml, 'referenceDocumentId="patent-reduction"');
  assertStringIncludes(xml, ">3000</FairMarketValueAmt>");
  assertStringIncludes(
    scheduleAMef.build(pending.schedule_a, { pending }),
    "<OtherThanByCashOrCheckAmt>3000</OtherThanByCashOrCheckAmt>",
  );
  const [pdf] = form8283Pdf.instances?.(pending.f8283, filer, pending) ?? [];
  assertEquals(pdf?.row1_claim, 3_000);
  assertEquals(pdf?.row1_basis, 3_000);
  assertStringIncludes(
    (pdf?.reduction_statements as string[])[0],
    "unamortized adjusted basis",
  );
});

Deno.test("Form 8283 patent rejects altered basis, rights, donee income and final return", () => {
  for (
    const item of [
      { ...gift, deduction_claimed: 3_001 },
      { ...gift, date_acquired: "2025-01-01" },
      { ...gift, charitable_limit_category: "capital_gain_30" as const },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          unamortized_adjusted_basis: 2_000,
        },
      },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          patent_registration_record_reference: "",
        },
      },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          all_patent_rights_transferred_to_donee_verified: false,
        },
      },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          donee_2025_net_income_zero_verified: false,
        },
      },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          donee_2025_net_income_statement_reference: "",
        },
      },
    ]
  ) {
    assertEquals(
      form8283InputSchema.safeParse({ section_a_items: [item] }).success,
      false,
    );
  }
  const pending = pendingReturn();
  assertThrows(() =>
    scheduleAMef.build(pending.schedule_a, {
      pending: { ...pending, f8283: undefined },
    })
  );
  assertThrows(() =>
    form8283.build(pending.f8283, {
      pending: {
        ...pending,
        schedule_a: {
          ...pending.schedule_a,
          line_12_noncash_contributions: 4_500,
        },
      },
    })
  );
  assertThrows(() =>
    form8283Pdf.instances?.(pending.f8283, filer, {
      ...pending,
      f1040: { ...pending.f1040, line12e_itemized_deductions: 4_500 },
    })
  );
});
