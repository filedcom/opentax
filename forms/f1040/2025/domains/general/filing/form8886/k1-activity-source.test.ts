import { buildForm8886Documents } from "./document.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { form8995 as nativeQbi } from "../../../../mef/forms/deductions/business/f8995/f8995.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { z } from "zod";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  type FilerIdentity,
  FilingStatus as HeaderStatus,
} from "../../../../../mef/header.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import {
  passiveSCorpCombinedLossReturnInputs,
  passiveSCorpLossReturnInputs,
} from "../../../credits/earned-income/earned-income/eic_passive_s_corp_loss.fixture.ts";
import { disclosureFixture } from "./source.fixture.ts";
import {
  EntityType,
  K1ActivityComponent,
  K1CapitalComponent,
  publicSourceSchema,
  ReturnSourceKind,
  TaxBenefit,
} from "./source.ts";
import { k1ActivityReturnSourceSchema } from "./k1-activity-source.ts";
import {
  reconcileForm8886CurrentReturnSources,
  returnSourceSha256,
} from "./return-sources.ts";
const general = {
  filing_status: FilingStatus.MFJ,
  digital_assets: false,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1980-01-01",
  spouse_first_name: "Bea",
  spouse_last_name: "Example",
  spouse_ssn: "444556666",
  spouse_dob: "1981-01-01",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const filer: FilerIdentity = {
  primarySSN: general.taxpayer_ssn,
  firstName: "Alex",
  firstNameWithInitial: "Alex",
  lastName: "Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  filingStatus: HeaderStatus.MarriedFilingJointly,
  spouse: {
    ssn: general.spouse_ssn,
    firstName: "Bea",
    lastName: "Example",
    nameControl: "EXAM",
  },
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};

const wage = {
  box1_wages: 200000,
  box2_fed_withheld: 40000,
  employer_name: "Example Employer",
  employer_ein: "777889999",
  recipient_ssn: general.taxpayer_ssn,
};
const partnership = {
  partnership_name: "Example Partnership",
  partnership_ein: "333445555",
  source_document_reference: "Reviewed partnership K-1",
  source_tax_year: 2025 as const,
  recipient_tin: general.taxpayer_ssn,
  box1_ordinary_business: 12000,
  box2_rental_re: 1000,
  box3_other_rental: 2000,
  eic_passive_activity_review: {
    box1: "nonpassive" as const,
    box2: "passive" as const,
    box3: "passive" as const,
    recipient_tin: general.taxpayer_ssn,
    partnership_not_publicly_traded_verified: true as const,
    activity_statement_reference: "Reviewed partnership activity statement",
    participation_workpaper_reference: "Reviewed partner participation",
  },
};
const corporation = {
  corporation_name: "Example Corporation",
  corporation_ein: "555667777",
  source_document_reference: "Reviewed corporation K-1",
  source_tax_year: 2025 as const,
  recipient_tin: general.spouse_ssn,
  box1_ordinary_business: 6000,
  eic_passive_activity_review: {
    box1: "nonpassive" as const,
    recipient_tin: general.spouse_ssn,
    activity_statement_reference: "Reviewed corporation activity statement",
    participation_workpaper_reference: "Reviewed shareholder participation",
  },
};
const trust = {
  estate_trust_name: "Example Trust",
  estate_trust_ein: "666778888",
  source_document_reference: "Reviewed trust K-1",
  source_tax_year: 2025 as const,
  beneficiary_ssn: general.taxpayer_ssn,
  box6_ordinary_business: 1000,
  box7_rental_real_estate: 2000,
  box8_other_rental: 3000,
  box5_other_portfolio: 4000,
  box6_8_activity_statement: [{
    box: "6" as const,
    activity_name: "Trust trade",
    statement_reference: "Reviewed trust business statement",
    income: 1000,
  }, {
    box: "7" as const,
    activity_name: "Trust real estate",
    statement_reference: "Reviewed trust rental statement",
    income: 2000,
  }, {
    box: "8" as const,
    activity_name: "Trust rental",
    statement_reference: "Reviewed trust other rental statement",
    income: 3000,
  }],
};
const sources = [
  { kind: ReturnSourceKind.PartnershipK1Activity, row: partnership },
  { kind: ReturnSourceKind.SCorporationK1Activity, row: corporation },
  { kind: ReturnSourceKind.TrustK1Activity, row: trust },
].map((row) => k1ActivityReturnSourceSchema.parse(row));
function execute() {
  return f1040_2025.executeReturn({
    general,
    w2: [wage],
    k1_partnership: [partnership],
    k1_s_corp: [corporation],
    k1_trust: [trust],
  });
}
async function disclosure(
  retained: z.infer<typeof k1ActivityReturnSourceSchema>,
  component = K1ActivityComponent.OrdinaryBusiness,
) {
  const identity = retained.kind === ReturnSourceKind.PartnershipK1Activity
    ? {
      owner: retained.row.recipient_tin,
      ein: retained.row.partnership_ein,
      name: retained.row.partnership_name,
      entity: EntityType.Partnership,
    }
    : retained.kind === ReturnSourceKind.SCorporationK1Activity
    ? {
      owner: retained.row.recipient_tin,
      ein: retained.row.corporation_ein,
      name: retained.row.corporation_name,
      entity: EntityType.SCorporation,
    }
    : {
      owner: retained.row.beneficiary_ssn,
      ein: retained.row.estate_trust_ein,
      name: retained.row.estate_trust_name,
      entity: EntityType.Trust,
    };
  const ref = `${retained.kind}-${component}`;
  return publicSourceSchema.parse({
    disclosures: [{
      ...disclosureFixture,
      disclosure_id: retained.kind,
      taxpayer_ssn: identity.owner,
      transactions: [{
        ...disclosureFixture.transactions[0],
        transaction_id: `arrangement-${retained.kind}`,
      }],
      parties: [...disclosureFixture.parties, {
        ...disclosureFixture.parties[0],
        party_id: "entity",
        name: identity.name,
        individual: false,
        identity: { kind: "ein", value: identity.ein },
        involvement_description: "Issued the reviewed activity item.",
      }],
      through_entities: [{
        party_id: "entity",
        entity_type: identity.entity,
        no_k1_received: false,
        k1_received_date: "2026-03-01",
        k1_source_reference: retained.row.source_document_reference,
      }],
      benefits: [{
        ...disclosureFixture.benefits[0],
        kind: TaxBenefit.Other,
        current_return_source_references: [ref],
      }],
      current_return_links: [{
        reference: ref,
        source_kind: retained.kind,
        source_component: component,
        source_document_reference: retained.row.source_document_reference,
        source_transaction_id: identity.ein,
        reportable_transaction_id: `arrangement-${retained.kind}`,
        source_row_sha256: await returnSourceSha256(retained),
        relationship_review_reference:
          "Reviewed association of issued activity item with disclosed arrangement",
      }],
    }],
  });
}
Deno.test("Form 8886 activity links retain all three K-1 families and owners through actual native Schedule E and 1040 joins", async () => {
  const result = execute();
  assertEquals(result.diagnostics, []);
  const source = {
    disclosures: (await Promise.all([
      disclosure(sources[0]),
      disclosure(sources[1]),
      disclosure(sources[2], K1ActivityComponent.OtherPortfolio),
    ])).flatMap((row) => row.disclosures),
  };
  const before = JSON.stringify({ source, result });
  const receipts = await reconcileForm8886CurrentReturnSources(
    source,
    result,
    filer,
  );
  assertEquals(
    receipts.map((row) =>
      "issued_activity_income_loss" in row
        ? row.issued_activity_income_loss
        : undefined
    ),
    [12000, 6000, 4000],
  );
  assertEquals(receipts.map((row) => row.taxpayer_ssn), [
    general.taxpayer_ssn,
    general.spouse_ssn,
    general.taxpayer_ssn,
  ]);
  assertEquals(result.pending.schedule1.line5_schedule_e, 31000);
  assertEquals(result.pending.f1040.line8_additional_income, 31000);
  assertEquals(receipts.map((row) => row.gross_loss_before_limits), [
    undefined,
    undefined,
    undefined,
  ]);
  assertEquals(JSON.stringify({ source, result }), before);
});
Deno.test("Form 8886 activity components preserve rental and trust business character without equating one component with net Schedule E", async () => {
  const result = execute();
  for (
    const [index, component, amount] of [
      [0, K1ActivityComponent.RentalRealEstate, 1000],
      [0, K1ActivityComponent.OtherRental, 2000],
      [2, K1ActivityComponent.OrdinaryBusiness, 1000],
      [2, K1ActivityComponent.RentalRealEstate, 2000],
      [2, K1ActivityComponent.OtherRental, 3000],
    ] as const
  ) {
    const receipt = (await reconcileForm8886CurrentReturnSources(
      await disclosure(sources[index], component),
      result,
      filer,
    ))[0];
    assertEquals(
      "issued_activity_income_loss" in receipt
        ? receipt.issued_activity_income_loss
        : undefined,
      amount,
    );
    assertEquals(
      "native_schedule_e_total" in receipt
        ? receipt.native_schedule_e_total
        : undefined,
      31000,
    );
  }
});
Deno.test("Form 8886 activity fingerprints reject changed source facts after a complete recalculation", async () => {
  const source = await disclosure(sources[0]);
  const result = f1040_2025.executeReturn({
    general,
    w2: [wage],
    k1_partnership: [{ ...partnership, box1_ordinary_business: 12345 }],
  });
  assertEquals(result.diagnostics, []);
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(source, result, filer),
    Error,
    "changed after disclosure review",
  );
});
Deno.test("Form 8886 activity proof rejects independent Schedule E, Schedule 1 and Form 1040 changes", async () => {
  const source = await disclosure(sources[2]), result = execute();
  for (
    const [key, field] of [["schedule1", "line5_schedule_e"], [
      "schedule1",
      "line10_total_additional_income",
    ], ["f1040", "line8_additional_income"]]
  ) {
    const changed = structuredClone(result);
    changed.pending[key][field] = 30000;
    await assertRejects(
      () => reconcileForm8886CurrentReturnSources(source, changed, filer),
      Error,
    );
  }
  const changed = structuredClone(result);
  changed.pending.schedule_e.estate_trust_rows = [];
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(source, changed, filer),
    Error,
  );
});
Deno.test("Form 8886 activity proof requires matching issuer, received copy, recipient and reviewed classification owner", async () => {
  const source = await disclosure(sources[0]), result = execute();
  const owner = structuredClone(source);
  owner.disclosures[0].taxpayer_ssn = general.spouse_ssn;
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(owner, result, filer),
    Error,
    "recipient differs",
  );
  const issuer = structuredClone(source);
  issuer.disclosures[0].parties[1].name = "Wrong issuer";
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(issuer, result, filer),
    Error,
    "matching disclosed entity",
  );
  const changed = structuredClone(result);
  changed.pending.k1_partnership.k1_partnerships = [{
    ...partnership,
    eic_passive_activity_review: {
      ...partnership.eic_passive_activity_review,
      recipient_tin: general.spouse_ssn,
    },
  }];
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(source, changed, filer),
    Error,
    "classification recipient",
  );
});
Deno.test("Form 8886 activity route keeps unsupported negative, zero and wrong-family component claims guarded", async () => {
  for (const amount of [-4000, 0]) {
    const row = {
      ...partnership,
      box1_ordinary_business: amount,
      box2_rental_re: 0,
      box3_other_rental: 0,
    };
    const source = await disclosure(
      k1ActivityReturnSourceSchema.parse({
        kind: ReturnSourceKind.PartnershipK1Activity,
        row,
      }),
    );
    const result = f1040_2025.executeReturn({
      general,
      w2: [wage],
      k1_partnership: [row],
    });
    await assertRejects(
      () => reconcileForm8886CurrentReturnSources(source, result, filer),
      Error,
    );
  }
  await assertRejects(
    async () =>
      publicSourceSchema.parse({
        disclosures: [{
          ...(await disclosure(sources[0])).disclosures[0],
          current_return_links: [{
            ...(await disclosure(sources[0])).disclosures[0]
              .current_return_links![0],
            source_component: K1CapitalComponent.ShortTerm,
          }],
        }],
      }),
    Error,
    "activity component",
  );
  await assertRejects(
    () =>
      reconcileForm8886CurrentReturnSources(
        activityPortfolio,
        execute(),
        filer,
      ),
    Error,
    "other-portfolio",
  );
});
const activityPortfolio = await disclosure(
  sources[0],
  K1ActivityComponent.OtherPortfolio,
);
Deno.test("Form 8886 activity source reconciliation snapshots callers before asynchronous hashes", async () => {
  const source = await disclosure(sources[0]),
    result = execute(),
    identity = structuredClone(filer);
  const promise = reconcileForm8886CurrentReturnSources(
    source,
    result,
    identity,
  );
  source.disclosures[0].parties[1].name = "Changed caller";
  result.pending.k1_partnership.k1_partnerships = [{
    ...partnership,
    box1_ordinary_business: 1,
  }];
  Object.assign(identity, { primarySSN: "999887777" });
  const receipt = (await promise)[0];
  assertEquals(
    "issued_activity_income_loss" in receipt
      ? receipt.issued_activity_income_loss
      : undefined,
    12000,
  );
});
Deno.test("Form 8886 S-corporation loss links preserve basis and passive allocations rather than equating issued loss with the deduction", async () => {
  for (
    const [income, owner] of [
      [0, undefined],
      [500, undefined],
      [3000, undefined],
      [3000, "primary"],
      [3000, "spouse"],
    ] as const
  ) {
    const inputs = income === 0
      ? passiveSCorpLossReturnInputs(1000, 0, 11950)
      : passiveSCorpCombinedLossReturnInputs(1000, income, 11950, owner);
    const original = f1040_2025.executeReturn(inputs);
    assertEquals(original.diagnostics, []);
    const row = k1ActivityReturnSourceSchema.options[1].shape.row.parse(
      original.pending.k1_s_corp.k1_s_corps instanceof Array
        ? original.pending.k1_s_corp.k1_s_corps[0]
        : undefined,
    );
    const reviewed = { ...row, source_tax_year: 2025 as const };
    const result = f1040_2025.executeReturn({
      ...inputs,
      k1_s_corp: [reviewed],
    });
    assertEquals(result.diagnostics, []);
    const retained = k1ActivityReturnSourceSchema.parse({
      kind: ReturnSourceKind.SCorporationK1Activity,
      row: reviewed,
    });
    const identity = extractFilerIdentity(result.pending.f1040);
    if (!identity) {
      throw new Error("Calculated loss return lacks filer identity");
    }
    const receipt = (await reconcileForm8886CurrentReturnSources(
      await disclosure(retained),
      result,
      identity,
    ))[0];
    assertEquals(
      "issued_activity_income_loss" in receipt
        ? receipt.issued_activity_income_loss
        : undefined,
      -4000,
    );
    assertEquals(
      "allowed_passive_activity_loss" in receipt
        ? receipt.allowed_passive_activity_loss
        : undefined,
      Math.min(1000, income),
    );
  }
});

Deno.test("Form 8886 trust link rejects an omitted native activity even when remaining Schedule E and 1040 totals agree", async () => {
  const source = await disclosure(sources[2]);
  const complete = execute();
  const omitted = f1040_2025.executeReturn({
    general,
    w2: [wage],
    k1_partnership: [partnership],
    k1_s_corp: [corporation],
  });
  assertEquals(omitted.diagnostics, []);
  const changed = {
    ...omitted,
    pending: { ...omitted.pending, k1_trust: complete.pending.k1_trust },
  };
  await assertRejects(
    () => reconcileForm8886CurrentReturnSources(source, changed, filer),
    Error,
    "actual Schedule E Part III row",
  );
});

Deno.test("Form 8886 activity links coexist with a sourced positive partnership QBI deduction without inventing an empty passive-source pool", async () => {
  const row = {
    ...partnership,
    box20z_qbi: 12000,
    qualified_business_income_source: {
      tax_year: 2025 as const,
      issuer_ein: partnership.partnership_ein,
      recipient_tin: partnership.recipient_tin,
      issued_k1_reference: partnership.source_document_reference,
      issued_section199a_statement_reference:
        "Reviewed partnership section 199A statement",
      business_name: partnership.partnership_name,
      domestic_non_sstb_trade: true as const,
      qualified_box1_income: 12000,
      statement_qbi: 12000,
      owner_level_adjustments: 0 as const,
      prior_qbi_loss: 0 as const,
    },
  };
  const result = f1040_2025.executeReturn({
    general,
    w2: [wage],
    k1_partnership: [row],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8995.qbi_deduction, 2400);
  assertEquals(result.pending.f1040.line13_qbi_deduction, 2400);
  const retained = k1ActivityReturnSourceSchema.parse({
    kind: ReturnSourceKind.PartnershipK1Activity,
    row,
  });
  const receipt = (await reconcileForm8886CurrentReturnSources(
    await disclosure(retained),
    result,
    filer,
  ))[0];
  assertEquals(
    "issued_activity_income_loss" in receipt
      ? receipt.issued_activity_income_loss
      : undefined,
    12000,
  );
});

Deno.test("Form 8886 mixed-owner activity links preserve combined positive K-1 QBI through export preparation and native Form 8995", async () => {
  const business = {
    ...partnership,
    box20z_qbi: 12000,
    qualified_business_income_source: {
      tax_year: 2025 as const,
      issuer_ein: partnership.partnership_ein,
      recipient_tin: partnership.recipient_tin,
      issued_k1_reference: partnership.source_document_reference,
      issued_section199a_statement_reference:
        "Reviewed partnership section 199A statement",
      business_name: partnership.partnership_name,
      domestic_non_sstb_trade: true as const,
      qualified_box1_income: 12000,
      statement_qbi: 12000,
      owner_level_adjustments: 0 as const,
      prior_qbi_loss: 0 as const,
    },
  };
  const shareholder = {
    ...corporation,
    qbi_amount: 6000,
    qualified_business_income_source: {
      tax_year: 2025 as const,
      issuer_ein: corporation.corporation_ein,
      recipient_tin: corporation.recipient_tin,
      issued_k1_reference: corporation.source_document_reference,
      issued_section199a_statement_reference:
        "Reviewed corporation section 199A statement",
      business_name: corporation.corporation_name,
      domestic_non_sstb_trade: true as const,
      qualified_box1_income: 6000,
      statement_qbi: 6000,
      owner_level_adjustments: 0 as const,
      prior_qbi_loss: 0 as const,
    },
  };
  const result = f1040_2025.executeReturn({
    general,
    w2: [wage],
    k1_partnership: [business],
    k1_s_corp: [shareholder],
  });
  assertEquals(result.diagnostics, []);
  const prepared = buildPending(result.pending);
  if (!prepared.form8995) throw new Error("Actual sourced QBI form missing");
  const xml = nativeQbi.build(prepared.form8995, { pending: prepared, filer });
  assertEquals(
    typeof xml === "string" &&
      xml.includes(
        "<TotQlfyBusinessIncomeOrLossAmt>18000</TotQlfyBusinessIncomeOrLossAmt>",
      ),
    true,
  );
  assertEquals(result.pending.f1040.line13_qbi_deduction, 3600);
  const source = {
    disclosures: (await Promise.all([
      disclosure(
        k1ActivityReturnSourceSchema.parse({
          kind: ReturnSourceKind.PartnershipK1Activity,
          row: business,
        }),
      ),
      disclosure(
        k1ActivityReturnSourceSchema.parse({
          kind: ReturnSourceKind.SCorporationK1Activity,
          row: shareholder,
        }),
      ),
    ])).flatMap((row) => row.disclosures),
  };
  assertEquals(
    (await reconcileForm8886CurrentReturnSources(source, result, filer)).length,
    2,
  );
});

Deno.test("Form 8886 shared arrangement keeps primary and spouse activity receipts and native copies independently owned", async () => {
  const primary = (await disclosure({
    kind: ReturnSourceKind.PartnershipK1Activity,
    row: partnership,
  })).disclosures[0];
  const spouse = (await disclosure({
    kind: ReturnSourceKind.SCorporationK1Activity,
    row: corporation,
  })).disclosures[0];
  const copies = [primary, spouse].map((copy) => ({
    ...copy,
    transactions: copy.transactions.map((transaction) => ({
      ...transaction,
      transaction_id: "shared-arrangement",
      shared_transaction_review_reference:
        "Reviewed each spouse's participation and separately owned tax items",
    })),
    current_return_links: copy.current_return_links?.map((link) => ({
      ...link,
      reportable_transaction_id: "shared-arrangement",
    })),
  }));
  const source = publicSourceSchema.parse({ disclosures: copies });
  const result = execute();
  const before = structuredClone(result);
  const receipts = await reconcileForm8886CurrentReturnSources(
    source,
    result,
    filer,
  );
  assertEquals(receipts.map((receipt) => receipt.taxpayer_ssn), [
    general.taxpayer_ssn,
    general.spouse_ssn,
  ]);
  assertEquals(
    receipts.map((receipt) =>
      "issued_activity_income_loss" in receipt
        ? receipt.issued_activity_income_loss
        : undefined
    ),
    [
      12000,
      6000,
    ],
  );
  assertEquals(receipts.map((receipt) => receipt.reportable_transaction_id), [
    "shared-arrangement",
    "shared-arrangement",
  ]);
  assertEquals(result, before);
  for (const [index, copy] of source.disclosures.entries()) {
    const documents = buildForm8886Documents(
      copy,
      copy.taxpayer_ssn,
      index + 1,
      2,
    );
    assertEquals(
      JSON.stringify(documents).includes(
        `Disclosure taxpayer SSN ${copy.taxpayer_ssn}`,
      ),
      true,
    );
  }
  await assertRejects(
    () =>
      reconcileForm8886CurrentReturnSources(
        {
          disclosures: [source.disclosures[0], {
            ...source.disclosures[1],
            taxpayer_ssn: "555667777",
          }],
        },
        result,
        filer,
      ),
    Error,
    "not an owner",
  );
  await assertRejects(() =>
    reconcileForm8886CurrentReturnSources(
      {
        disclosures: [{
          ...source.disclosures[0],
          taxpayer_ssn: general.spouse_ssn,
        }, { ...source.disclosures[1], taxpayer_ssn: general.taxpayer_ssn }],
      },
      result,
      filer,
    ), Error);
});
