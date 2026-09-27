import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  buildForm8854Annual,
  buildForm8854AnnualNativeStatements,
  buildForm8854PartIII,
} from "../../../2025/mef/forms/f8854_annual.ts";
import { annualInputSchema } from "./annual.ts";
import { f8854Annual } from "./annual_node.ts";
import { reconcileAnnualForm8854Form8949Properties } from "./reconcile-annual-capital.ts";
import { ExpatriateType } from "./index.ts";
import { ReportedFormCode } from "./section-c.ts";

function annualInput(overrides: Record<string, unknown> = {}) {
  return {
    expatriation_date: "2020-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    part_i: {
      mailing_address: {
        kind: "US",
        line1: "1 Main St",
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      },
      telephone: { kind: "US", number: "3025550123" },
      notification: {
        kind: "CITIZEN_STATE_DEPARTMENT",
        date: "2020-06-15",
      },
      citizenships: [{ country_code: "US", acquired_date: "1980-01-01" }],
      us_citizenship_acquisition: "BIRTH",
    },
    tax_status_2025: "FULL_YEAR_US_CITIZEN_OR_RESIDENT",
    prior_form8854_obligations_confirmed_complete: true,
    original_form8854_mailed_confirmed: true,
    attached_form8854_copy_marked_copy_confirmed: true,
    source_1042s: [],
    deferred_properties: [],
    eligible_deferred_compensation_items: [{
      item_id: "plan",
      description: "Deferred plan",
      prior_form8854_document_id: "DOC-PRIOR",
      irrevocable_treaty_reduction_waiver_confirmed: true,
      distributions: [],
    }],
    nongrantor_trust_interests: [],
    ...overrides,
  };
}

function distribution() {
  return {
    distribution_date: "2025-04-15",
    gross_distribution_amount: 1_000,
    amount_includible_if_us_resident: 800,
    tax_withheld_amount: 240,
    source_document_id: "DOC-DISTRIBUTION",
  };
}

function source1042s(
  documentId = "DOC-DISTRIBUTION",
  incomeCode: "38" | "39" = "38",
  grossIncome = 800,
  taxWithheld = 240,
) {
  return {
    document_id: documentId,
    income_code: incomeCode,
    payer_name: "Example payor",
    gross_income_amount: grossIncome,
    federal_tax_withheld_amount: taxWithheld,
  };
}

Deno.test("annual Form 8854 certifies no distributions from a remaining eligible item", () => {
  const parsed = annualInputSchema.parse(annualInput());
  const xml = buildForm8854Annual(parsed);
  const statements = buildForm8854AnnualNativeStatements(parsed);
  assertEquals(statements.length, 1);
  assertStringIncludes(statements[0], "<Desc>Deferred plan</Desc>");
  assertStringIncludes(statements[0], "<IrrevocableWaiverCd>");
  assertStringIncludes(xml, "<IRS8854>");
  assertStringIncludes(
    xml,
    "<AnnualExptrtStmtBfrSpcfdYrInd>X</AnnualExptrtStmtBfrSpcfdYrInd>",
  );
  assertStringIncludes(xml, "<AnnualExptrtStmtBfrSpcfdYrGrp>");
  assertStringIncludes(
    xml,
    "<EligDeferredCompItemsDistriInd>false</EligDeferredCompItemsDistriInd>",
  );
  assertStringIncludes(
    xml,
    "<NongrantorTrustDistriInd>false</NongrantorTrustDistriInd>",
  );
  assertEquals(xml.includes("ExpatriationInformationGrp"), false);
  assertEquals(xml.includes("InitialExptrtStmtSpcfdYrInd"), false);
});

Deno.test("annual Form 8854 emits separate eligible-item and trust waiver statements", () => {
  const parsed = annualInputSchema.parse(annualInput({
    nongrantor_trust_interests: [{
      item_id: "trust",
      description: "Family trust",
      prior_form8854_document_id: "DOC-PRIOR",
      no_prior_full_value_election_confirmed: true,
      treaty_reduction_waiver_confirmed: true,
      distributions: [],
    }],
  }));
  const statements = buildForm8854AnnualNativeStatements(parsed);
  assertEquals(statements.length, 2);
  assertStringIncludes(statements[0], "<EligDeferredCompItemStmt>");
  assertStringIncludes(statements[1], "<NongrantorTrustStatement>");
  assertStringIncludes(statements[1], "<Desc>Family trust</Desc>");
  assertStringIncludes(statements[1], "<NongrantorTrustInterestCd>");
  assertEquals(
    annualInputSchema.safeParse({
      ...parsed,
      eligible_deferred_compensation_items: [{
        ...parsed.eligible_deferred_compensation_items[0],
        irrevocable_treaty_reduction_waiver_confirmed: false,
      }],
    }).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse({
      ...parsed,
      nongrantor_trust_interests: [{
        ...parsed.nongrantor_trust_interests[0],
        treaty_reduction_waiver_confirmed: false,
      }],
    }).success,
    false,
  );
});

Deno.test("annual Form 8854 no-activity certification reaches the filing graph", () => {
  assertEquals(
    f8854Annual.compute(
      { taxYear: 2025, formType: "f1040" },
      annualInputSchema.parse(annualInput()),
    ).outputs,
    [],
  );
  assertThrows(
    () =>
      f8854Annual.compute(
        { taxYear: 2025, formType: "f1040" },
        annualInputSchema.parse(annualInput({
          tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
        })),
      ),
    Error,
    "nonresident or dual-status returns cannot use this Form 1040 MeF path",
  );
  assertThrows(
    () =>
      f8854Annual.compute(
        { taxYear: 2025, formType: "f1040" },
        annualInputSchema.parse(annualInput({
          tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
          source_1042s: [source1042s()],
          eligible_deferred_compensation_items: [{
            item_id: "plan",
            description: "Deferred plan",
            prior_form8854_document_id: "DOC-PRIOR",
            irrevocable_treaty_reduction_waiver_confirmed: true,
            distributions: [distribution()],
          }],
        })),
      ),
    Error,
    "nonresident or dual-status returns cannot use this Form 1040 MeF path",
  );
});

Deno.test("annual Form 8854 lists prior deferred property and 2025 distributions", () => {
  const parsed = annualInputSchema.parse(annualInput({
    tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
    source_1042s: [
      source1042s(),
      source1042s("DOC-TRUST-PAYMENT", "39"),
    ],
    deferred_properties: [{
      item_id: "stock",
      description: "Stock holding",
      prior_form8854_document_id: "DOC-PRIOR",
      prior_mark_to_market_gain_or_loss_amount: 111_000,
      prior_deferred_tax_amount: 50_000,
      disposition: {
        disposed_in_2025: true,
        entire_deferred_property_disposed_confirmed: true,
        disposition_date: "2025-05-20",
        reported_form_code: ReportedFormCode.Form8949,
        reported_transaction_id: "TX-STOCK",
        actual_sale_proceeds: 160_000,
        adjusted_basis_at_disposition: 100_000,
        deferred_tax_paid_amount: 50_000,
        interest_paid_amount: 5_000,
        payment_date: "2025-06-01",
        payment_by_unextended_due_date_confirmed: true,
        payment_confirmation_attachment_file_name: "deferred-tax-payment.pdf",
      },
    }],
    eligible_deferred_compensation_items: [{
      item_id: "plan",
      description: "Deferred plan",
      prior_form8854_document_id: "DOC-PRIOR",
      irrevocable_treaty_reduction_waiver_confirmed: true,
      distributions: [distribution()],
    }],
    nongrantor_trust_interests: [{
      item_id: "trust",
      description: "Family trust",
      prior_form8854_document_id: "DOC-PRIOR",
      no_prior_full_value_election_confirmed: true,
      treaty_reduction_waiver_confirmed: true,
      distributions: [{
        ...distribution(),
        source_document_id: "DOC-TRUST-PAYMENT",
      }],
    }],
  }));
  const xml = buildForm8854PartIII(parsed);
  assertStringIncludes(
    xml,
    "<MarkToMarketGainOrLossAmt>111000</MarkToMarketGainOrLossAmt>",
  );
  assertStringIncludes(xml, "<DeferredTaxAmt>50000</DeferredTaxAmt>");
  assertStringIncludes(xml, "<DispositionDt>2025-05-20</DispositionDt>");
  assertStringIncludes(
    xml,
    "<EligDeferredCompItemsDistriInd>true</EligDeferredCompItemsDistriInd>",
  );
  assertStringIncludes(
    xml,
    "<EligDeferredCompItemsDistriDtl><DistributionAmt>800</DistributionAmt><TotalTaxWithheldAmt>240</TotalTaxWithheldAmt></EligDeferredCompItemsDistriDtl>",
  );
  assertStringIncludes(
    xml,
    "<NongrantorTrustDistriInd>true</NongrantorTrustDistriInd>",
  );
  assertEquals((xml.match(/<NongrantorTrustDistriDtl>/g) ?? []).length, 1);
});

Deno.test("annual Form 8854 disposition matches one filed Form 8949 sale and payment facts", () => {
  const parsed = annualInputSchema.parse(annualInput({
    deferred_properties: [{
      item_id: "stock",
      description: "Stock holding",
      prior_form8854_document_id: "DOC-PRIOR",
      prior_mark_to_market_gain_or_loss_amount: 111_000,
      prior_deferred_tax_amount: 50_000,
      disposition: {
        disposed_in_2025: true,
        entire_deferred_property_disposed_confirmed: true,
        disposition_date: "2025-05-20",
        reported_form_code: ReportedFormCode.Form8949,
        reported_transaction_id: "TX-STOCK",
        actual_sale_proceeds: 160_000,
        adjusted_basis_at_disposition: 100_000,
        deferred_tax_paid_amount: 50_000,
        interest_paid_amount: 5_000,
        payment_date: "2025-06-01",
        payment_by_unextended_due_date_confirmed: true,
        payment_confirmation_attachment_file_name: "deferred-tax-payment.pdf",
      },
    }],
  }));
  const transaction = {
    part: "F",
    description: "Stock holding",
    source_transaction_id: "TX-STOCK",
    date_acquired: "2020-01-01",
    date_sold: "2025-05-20",
    proceeds: 160_000,
    cost_basis: 100_000,
    gain_loss: 60_000,
    is_long_term: true,
  };
  assertEquals(
    reconcileAnnualForm8854Form8949Properties(parsed, [transaction]),
    [{ itemId: "stock", transactionId: "TX-STOCK", gainOrLoss: 60_000 }],
  );
  assertEquals(
    f8854Annual.compute(
      { taxYear: 2025, formType: "f1040" },
      parsed,
    ).outputs,
    [],
  );
  assertThrows(
    () =>
      f8854Annual.compute(
        { taxYear: 2025, formType: "f1040" },
        annualInputSchema.parse({
          ...parsed,
          deferred_properties: [{
            ...parsed.deferred_properties[0],
            disposition: {
              ...parsed.deferred_properties[0].disposition,
              reported_form_code: ReportedFormCode.Form4797,
            },
          }],
        }),
      ),
    Error,
    "non-Form 8949 dispositions",
  );
  for (
    const bad of [
      { ...transaction, date_sold: "2025-05-21" },
      { ...transaction, date_acquired: "2025-05-21" },
      { ...transaction, proceeds: 159_999 },
      { ...transaction, gain_loss: 59_999 },
      { ...transaction, is_long_term: false },
    ]
  ) {
    assertThrows(() =>
      reconcileAnnualForm8854Form8949Properties(parsed, [bad])
    );
  }
  assertThrows(() =>
    reconcileAnnualForm8854Form8949Properties(parsed, [
      transaction,
      transaction,
    ])
  );
  assertThrows(() => reconcileAnnualForm8854Form8949Properties(parsed, []));
  assertEquals(
    annualInputSchema.safeParse({
      ...parsed,
      deferred_properties: [{
        ...parsed.deferred_properties[0],
        disposition: {
          ...parsed.deferred_properties[0].disposition,
          deferred_tax_paid_amount: 49_999,
        },
      }],
    }).success,
    false,
  );
});

Deno.test("annual Form 8854 rejects missing obligations and unsupported years", () => {
  for (
    const missingConfirmation of [
      "tax_status_2025",
      "original_form8854_mailed_confirmed",
      "attached_form8854_copy_marked_copy_confirmed",
    ]
  ) {
    const input: Record<string, unknown> = annualInput();
    delete input[missingConfirmation];
    assertEquals(annualInputSchema.safeParse(input).success, false);
  }
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      deferred_properties: [],
      eligible_deferred_compensation_items: [],
      nongrantor_trust_interests: [],
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      expatriation_date: "2008-06-16",
      part_i: {
        ...annualInput().part_i,
        notification: {
          kind: "CITIZEN_STATE_DEPARTMENT",
          date: "2008-06-16",
        },
      },
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      expatriation_date: "2025-01-01",
      part_i: {
        ...annualInput().part_i,
        notification: {
          kind: "CITIZEN_STATE_DEPARTMENT",
          date: "2025-01-01",
        },
      },
    })).success,
    false,
  );
});

Deno.test("annual Form 8854 enforces source and three-row distribution limits", () => {
  const centsInput = annualInputSchema.parse(annualInput({
    tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
    source_1042s: [source1042s("DOC-DISTRIBUTION", "38", 801, 240)],
    eligible_deferred_compensation_items: [{
      item_id: "plan",
      description: "Deferred plan",
      prior_form8854_document_id: "DOC-PRIOR",
      irrevocable_treaty_reduction_waiver_confirmed: true,
      distributions: [{
        ...distribution(),
        gross_distribution_amount: 1_000.51,
        amount_includible_if_us_resident: 800.51,
        tax_withheld_amount: 240.49,
      }],
    }],
  }));
  assertStringIncludes(
    buildForm8854PartIII(centsInput),
    "<EligDeferredCompItemsDistriDtl><DistributionAmt>801</DistributionAmt><TotalTaxWithheldAmt>240</TotalTaxWithheldAmt></EligDeferredCompItemsDistriDtl>",
  );
  const groupedInput = annualInputSchema.parse(annualInput({
    tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
    source_1042s: [source1042s("DOC-DISTRIBUTION", "38", 3_200, 960)],
    eligible_deferred_compensation_items: [{
      item_id: "plan",
      description: "Deferred plan",
      prior_form8854_document_id: "DOC-PRIOR",
      irrevocable_treaty_reduction_waiver_confirmed: true,
      distributions: [
        distribution(),
        distribution(),
        distribution(),
        distribution(),
      ],
    }],
  }));
  assertEquals(
    (buildForm8854PartIII(groupedInput).match(
      /<EligDeferredCompItemsDistriDtl>/g,
    ) ?? []).length,
    1,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
      source_1042s: ["DOC-1", "DOC-2", "DOC-3", "DOC-4"].map((id) =>
        source1042s(id)
      ),
      eligible_deferred_compensation_items: [{
        item_id: "plan",
        description: "Deferred plan",
        prior_form8854_document_id: "DOC-PRIOR",
        irrevocable_treaty_reduction_waiver_confirmed: true,
        distributions: ["DOC-1", "DOC-2", "DOC-3", "DOC-4"].map((id) => ({
          ...distribution(),
          source_document_id: id,
        })),
      }],
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
      source_1042s: [source1042s("DOC-DISTRIBUTION", "38", 1_001, 240)],
      eligible_deferred_compensation_items: [{
        item_id: "plan",
        description: "Deferred plan",
        prior_form8854_document_id: "DOC-PRIOR",
        irrevocable_treaty_reduction_waiver_confirmed: true,
        distributions: [{
          ...distribution(),
          amount_includible_if_us_resident: 1_001,
        }],
      }],
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      nongrantor_trust_interests: [{
        item_id: "trust",
        description: "Family trust",
        prior_form8854_document_id: "DOC-PRIOR",
        no_prior_full_value_election_confirmed: false,
        treaty_reduction_waiver_confirmed: true,
        distributions: [],
      }],
    })).success,
    false,
  );
  assertEquals(
    annualInputSchema.safeParse(annualInput({
      deferred_properties: [{
        item_id: "stock",
        description: "Stock holding",
        prior_form8854_document_id: "DOC-PRIOR",
        prior_mark_to_market_gain_or_loss_amount: 111_000,
        prior_deferred_tax_amount: 50_000,
        disposition: { disposed_in_2025: true, disposition_date: "2025-05-20" },
      }],
    })).success,
    false,
  );
});

Deno.test("annual Form 8854 reconciles code 38 and 39 Form 1042-S sources", () => {
  const first = {
    ...distribution(),
    gross_distribution_amount: 500,
    amount_includible_if_us_resident: 400.25,
    tax_withheld_amount: 120.25,
  };
  const second = {
    ...distribution(),
    gross_distribution_amount: 500,
    amount_includible_if_us_resident: 399.75,
    tax_withheld_amount: 119.75,
  };
  const input = annualInput({
    tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
    source_1042s: [
      source1042s(),
      source1042s("DOC-TRUST-PAYMENT", "39"),
    ],
    eligible_deferred_compensation_items: [{
      item_id: "plan",
      description: "Deferred plan",
      prior_form8854_document_id: "DOC-PRIOR",
      irrevocable_treaty_reduction_waiver_confirmed: true,
      distributions: [first, second],
    }],
    nongrantor_trust_interests: [{
      item_id: "trust",
      description: "Family trust",
      prior_form8854_document_id: "DOC-PRIOR",
      no_prior_full_value_election_confirmed: true,
      treaty_reduction_waiver_confirmed: true,
      distributions: [{
        ...distribution(),
        source_document_id: "DOC-TRUST-PAYMENT",
      }],
    }],
  });
  assertEquals(annualInputSchema.safeParse(input).success, true);
  assertEquals(
    annualInputSchema.safeParse({
      ...input,
      tax_status_2025: "FULL_YEAR_US_CITIZEN_OR_RESIDENT",
    }).success,
    false,
  );
  const xml = buildForm8854PartIII(annualInputSchema.parse(input));
  assertEquals(
    (xml.match(/<EligDeferredCompItemsDistriDtl>/g) ?? []).length,
    1,
  );
  assertStringIncludes(
    xml,
    "<EligDeferredCompItemsDistriDtl><DistributionAmt>800</DistributionAmt><TotalTaxWithheldAmt>240</TotalTaxWithheldAmt></EligDeferredCompItemsDistriDtl>",
  );
  for (
    const source_1042s of [
      [
        source1042s("DOC-DISTRIBUTION", "39"),
        source1042s("DOC-TRUST-PAYMENT", "39"),
      ],
      [
        source1042s("DOC-DISTRIBUTION", "38", 801),
        source1042s("DOC-TRUST-PAYMENT", "39"),
      ],
      [
        source1042s("DOC-DISTRIBUTION", "38", 800, 239),
        source1042s("DOC-TRUST-PAYMENT", "39"),
      ],
      [source1042s(), source1042s()],
      [source1042s(), source1042s("DOC-UNUSED", "39")],
      [],
    ]
  ) {
    assertEquals(
      annualInputSchema.safeParse({ ...input, source_1042s }).success,
      false,
    );
  }
});
