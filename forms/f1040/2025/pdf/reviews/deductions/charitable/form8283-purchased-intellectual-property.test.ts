import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  FMVMethod,
  inputSchema as giftSchema,
} from "../../../../../nodes/inputs/deductions/charitable/f8283/index.ts";
import { PurchasedIntellectualPropertyKind as Kind } from "../../../../../nodes/inputs/deductions/charitable/f8283/intellectual-property-source.ts";

const kinds = Object.values(Kind);
const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-section-a-capital-gain-reduction-gift"
)!;
function gift(kind: Kind, spouse = false) {
  return {
    similar_item_group: "purchased-intellectual-property",
    donor_ownership_review: {
      donor_ssn: spouse ? "444556666" : "111223333",
      donor_name: spouse ? "Sam Example" : "Alex Example",
      ownership_record_reference: `Ownership-${kind}`,
      outright_full_owned_interest_contributed_verified: true as const,
    },
    property_description: `${kind.replaceAll("_", " ")} IP-${
      kinds.indexOf(kind) + 1
    }`,
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
    fmv: 18000,
    deduction_claimed: 12000,
    cost_or_adjusted_basis: 12000,
    fmv_method: FMVMethod.ComparableSales,
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: true,
    intellectual_property_capital_gain_reduction: {
      property_kind: kind,
      property_identifier: `IP-${kinds.indexOf(kind) + 1}`,
      legal_rights_record_reference: `Rights-${kind}`,
      transfer_record_reference: `Transfer-${kind}`,
      statutory_classification_record_reference: `Classification-${kind}`,
      purchase_record_reference: `Purchase-${kind}`,
      unamortized_basis_schedule_reference: `Basis-${kind}`,
      unamortized_adjusted_basis: 12000,
      donee_2025_net_income_statement_reference: `Donee-zero-income-${kind}`,
      donor_owned_full_rights_verified: true as const,
      all_rights_transferred_to_donee_verified: true as const,
      adjusted_basis_excludes_prior_amortization_verified: true as const,
      donee_2025_net_income_zero_verified: true as const,
      hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
      no_other_reduction_reason_verified: true as const,
      ...(kind === Kind.Copyright
        ? {
          copyright_not_excluded_by_sections_1221a3_or_1231b1c_verified:
            true as const,
        }
        : {}),
      ...(kind === Kind.Software
        ? { software_not_excluded_by_section_197e3Ai_verified: true as const }
        : {}),
    },
  };
}
const cases = [
  ...kinds.map((kind) => ({ id: kind, kinds: [kind], joint: false })),
  { id: "mixed-six-single", kinds, joint: false },
  { id: "mixed-six-joint", kinds, joint: true },
];
for (const entry of cases) {
  Deno.test(`Form 8283 purchased intellectual property full return: ${entry.id}`, async () => {
    const items = entry.kinds.map((kind, i) =>
      gift(kind, entry.joint && i % 2 === 1)
    );
    const inputs = {
      ...base.inputs,
      general: {
        ...generalSchema.parse(base.inputs.general),
        ...(entry.joint
          ? {
            filing_status: FilingStatus.MFJ,
            spouse_first_name: "Sam",
            spouse_last_name: "Example",
            spouse_ssn: "444556666",
            spouse_dob: "1985-03-01",
          }
          : {}),
      },
      schedule_a: {
        line_5a_state_income_tax: 24000,
        current_noncash_gift_inventory_complete_confirmed: true,
        other_prior_charitable_carryovers_absent_confirmed: true,
        capital_gain_property_carryovers: [],
      },
      f8283: { section_a_items: items },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const deduction = Math.min(items.length * 12000, 50000);
    const itemized = 24000 + deduction;
    const taxable = 100000 - itemized;
    const midpoint = Math.floor(taxable / 50) * 50 + 25;
    const tax = Math.round(
      entry.joint
        ? midpoint * .12 - 477
        : taxable < 48475
        ? midpoint * .12 - 238.5
        : midpoint * .22 - 5086,
    );
    assertEquals(pending.schedule_a.line_12_noncash_contributions, deduction);
    assertEquals(pending.f1040.line11_agi, 100000);
    assertEquals(pending.f1040.line12e_itemized_deductions, itemized);
    assertEquals(pending.f1040.line15_taxable_income, taxable);
    assertEquals(pending.f1040.line16_income_tax, tax);
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(pending.f1040.line35a_refund, 16000 - tax);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<FairMarketValueStatement\b/g) ?? []).length,
      items.length,
    );
    for (const item of items) {
      assertEquals(
        prepared.bundle.xml.includes(
          item.intellectual_property_capital_gain_reduction.property_identifier,
        ),
        true,
      );
      assertEquals(
        prepared.bundle.xml.includes(
          item.intellectual_property_capital_gain_reduction
            .legal_rights_record_reference,
        ),
        true,
      );
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_FORM8283_IP_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            origins,
            carryforwards: result.carryforwards,
            expected: {
              deduction,
              itemized,
              taxable,
              tax,
              refund: 16000 - tax,
            },
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
    }
    const retained = giftSchema.parse(pending.f8283);
    assertExists(retained.section_a_items);
    const first = items[0],
      source = first.intellectual_property_capital_gain_reduction;
    for (
      const changed of [
        { ...pending, f1040: { ...pending.f1040, line16_income_tax: tax + 1 } },
        {
          ...pending,
          schedule_a: {
            ...pending.schedule_a,
            line_12_noncash_contributions: deduction + 1,
          },
        },
        {
          ...pending,
          f8283: {
            ...retained,
            section_a_items: [{
              ...first,
              donor_ownership_review: {
                ...first.donor_ownership_review,
                donor_ssn: "999887777",
              },
            }, ...items.slice(1)],
          },
        },
        {
          ...pending,
          f8283: {
            ...retained,
            section_a_items: [{
              ...first,
              intellectual_property_capital_gain_reduction: {
                ...source,
                unamortized_adjusted_basis: 12001,
              },
            }, ...items.slice(1)],
          },
        },
        {
          ...pending,
          f8283: {
            ...retained,
            section_a_items: [{
              ...first,
              intellectual_property_capital_gain_reduction: {
                ...source,
                donee_2025_net_income_zero_verified: false,
              },
            }, ...items.slice(1)],
          },
        },
      ]
    ) {
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(changed, filer), Error);
    }
    for (
      const changed of [
        { ...first, deduction_claimed: 18000 },
        { ...first, cost_or_adjusted_basis: 12001 },
        { ...first, date_acquired: "2025-01-01" },
        {
          ...first,
          intellectual_property_capital_gain_reduction: {
            ...source,
            all_rights_transferred_to_donee_verified: false,
          },
        },
        {
          ...first,
          intellectual_property_capital_gain_reduction: {
            ...source,
            donee_2025_net_income_zero_verified: false,
          },
        },
        {
          ...first,
          intellectual_property_capital_gain_reduction: {
            ...source,
            statutory_classification_record_reference: "",
          },
        },
      ]
    ) {
      await assertRejects(async () => {
        const bad = f1040_2025.executeReturn({
          ...inputs,
          f8283: { section_a_items: [changed, ...items.slice(1)] },
        });
        if (bad.diagnostics.length) throw new Error("Rejected source");
        await f1040_2025.prepareReturn(bad.pending, filer);
      }, Error);
    }
  });
}
Deno.test("Form 8283 copyright and software need their specific statutory exclusion reviews", () => {
  for (const kind of [Kind.Copyright, Kind.Software]) {
    const item = gift(kind);
    const source = {
      ...item.intellectual_property_capital_gain_reduction,
      copyright_not_excluded_by_sections_1221a3_or_1231b1c_verified: undefined,
      software_not_excluded_by_section_197e3Ai_verified: undefined,
    };
    assertEquals(
      giftSchema.safeParse({
        section_a_items: [{
          ...item,
          intellectual_property_capital_gain_reduction: source,
        }],
      }).success,
      false,
    );
  }
});
