import { assertEquals, assertThrows } from "@std/assert";
import { calculateOwnedCfcWorksheets } from "./worksheet-source.ts";
import { ownedCfcWorksheetSource } from "./worksheet-source.fixture.ts";

Deno.test("Owned invoices and foreign property ledger derive actual WorksheetA sales and zero WorksheetB US property", () => {
  const r = calculateOwnedCfcWorksheets(ownedCfcWorksheetSource(false));
  assertEquals(r.worksheet_a["3"], 10000);
  assertEquals(r.worksheet_a["8"], 3200);
  assertEquals(r.worksheet_a["57"], 9531);
  assertEquals(r.worksheet_b["3"], 0);
  assertEquals(r.worksheet_b["19"], 0);
  assertEquals(r.books.opening_ep, 10000);
  assertEquals(r.books.current_ep, 59000);
  assertEquals(r.books.cash_begin, 10000);
  assertEquals(r.books.cash_end, 70500);
  assertEquals(r.qbai.raw_average, 99062.5);
  assertEquals(r.qbai.filed, 99063);
  assertEquals(r.form8992.gilti, 42094);
  assertEquals(r.ep_rollforward.section956_ptep_reclassified, 0);
  assertEquals(r.filing_authority, "unverified_no_export");
});
Deno.test("Retained2percent shareholder note preserves raw ledger diagnosis and flags unsettled7872/482 filing status", () => {
  const r = calculateOwnedCfcWorksheets(ownedCfcWorksheetSource(true));
  assertEquals(r.worksheet_a["1a"], 1200);
  assertEquals(r.settlement_status, "unsettled_related_note_7872_482");
  assertEquals(r.unresolved_debt_pricing[0].source_principal, 60000);
  assertThrows(() => ownedCfcWorksheetItem(true), Error, "sections7872/482");
  assertEquals(r.worksheet_a["53"], 1145);
  assertEquals(r.categories.PAS.us_tax, 360);
  assertEquals(r.categories.PAS.ep, 784.78);
  assertEquals(r.worksheet_a["57"], 9540);
  assertEquals(r.form8992.tested_income, 49515);
  assertEquals(r.form8992.tested_interest_income, 0);
  assertEquals(r.form8992.gilti, 42094);
  assertEquals(r.worksheet_b["1a"], 60000);
  assertEquals(r.worksheet_b["3"], 60000);
  assertEquals(r.worksheet_b["7a"], 59840);
  assertEquals(r.worksheet_b["7b"], 69840);
  assertEquals(r.worksheet_b["15"], 52779);
  assertEquals(r.worksheet_b["19"], 7221);
  assertEquals(r.books.capital, 160000);
  assertEquals(r.books.cash_begin, 70000);
  assertEquals(r.books.cash_end, 71340);
  assertEquals(r.books.investments_end, 60000);
  assertEquals(r.ep_rollforward.untaxed_closing, 9840);
});
Deno.test("Worksheet owner/property/quarter/issuer/expense/prior-history conflicts reject", () => {
  const source = ownedCfcWorksheetSource(true);
  const clone = () => structuredClone(source);
  const mutations = [
    (s: typeof source) => {
      s.current_income_records[0].cfc_reference = "DETACHED";
    },
    (s: typeof source) => {
      s.current_income_records[1].document_reference =
        s.current_income_records[0].document_reference;
    },
    (s: typeof source) => {
      s.prior_year_records[0].tax_year = 2021;
    },
    (s: typeof source) => {
      s.prior_year_records[0].asset_depreciation[0].asset_reference = "OTHER";
    },
    (s: typeof source) => {
      s.current_expense_records[0].income_document_reference = "OTHER";
    },
    (s: typeof source) => {
      s.owned_assets[1].quarter_records.reverse();
    },
    (s: typeof source) => {
      if (s.owned_assets[1].kind === "debt_obligation") {
        s.owned_assets[1].quarter_records[0].principal_outstanding = 1000;
      }
    },
    (s: typeof source) => {
      if (s.current_income_records[2].kind === "ordinary_interest") {
        s.current_income_records[2].payor_reference = "OTHER";
      }
    },
  ];
  for (const mutation of mutations) {
    const c = clone();
    mutation(c);
    assertThrows(() => calculateOwnedCfcWorksheets(c));
  }
});

import {
  ownedCfcWorksheetItem,
  ownedCfcWorksheetPending,
} from "./worksheet-source.fixture.ts";
import { inputSchema } from "./index.ts";
import { form5471ScheduleE } from "../../../../../2025/mef/forms/general/foreign/f5471/f5471_schedule_e.ts";
import { form5471ScheduleJ } from "../../../../../2025/mef/forms/general/foreign/f5471/f5471_schedule_j.ts";
import { form5471ScheduleP } from "../../../../../2025/mef/forms/general/foreign/f5471/f5471_schedule_p.ts";
import { form5471ScheduleQ } from "../../../../../2025/mef/forms/general/foreign/f5471/f5471_schedule_q.ts";
import { form8992Filer as diagnosticFiler } from "../../../../../2025/domains/income/foreign/form8992/form8992.fixture.ts";
const form8992Filer = {
  ...diagnosticFiler,
  address: {
    line1: "123 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};

Deno.test("Filed CFC operands derive owned WorksheetsA/B and reject changed scalar/source joins", () => {
  for (const withUS of [false, true]) {
    const item = ownedCfcWorksheetItem(withUS, withUS);
    const pending = ownedCfcWorksheetPending(withUS, withUS);
    assertEquals(
      pending.schedule1.line8n_section951a_inclusion,
      withUS ? 10685 : 9531,
    );
    assertEquals(pending.schedule1.line8o_section951aa_inclusion, 42094);
    for (const key of ["line1e", "line1f", "line2_us_property"] as const) {
      const changed = structuredClone(item);
      changed.schedule_i[key]++;
      assertThrows(() => inputSchema.parse({ f5471s: [changed] }));
    }
    const originalInterest = structuredClone(item);
    originalInterest.schedule_i1.interest_income_functional = 1000;
    assertThrows(() => inputSchema.parse({ f5471s: [originalInterest] }));
  }
});
Deno.test("Owned passive source produces GEN/PAS/TOTAL native category copies, never general-tested interest", () => {
  const pending = ownedCfcWorksheetPending(true, true);
  for (
    const form of [
      form5471ScheduleE,
      form5471ScheduleJ,
      form5471ScheduleP,
      form5471ScheduleQ,
    ]
  ) {
    const context = { pending, filer: form8992Filer };
    if (form === form5471ScheduleQ) {
      assertEquals(
        form.build({}, context).includes(
          "<SeparateCategoryCd>GEN</SeparateCategoryCd>",
        ),
        true,
      );
      assertThrows(
        () => form.buildAdditionalDocuments!({}, context),
        Error,
        "canonical v5.4 CountryCd excludes US",
      );
      continue;
    }
    const documents = [
      form.build({}, context),
      ...form.buildAdditionalDocuments!({}, context),
    ];
    assertEquals(documents.length, 3);
    for (let i = 0; i < 3; i++) {
      assertEquals(
        documents[i].includes(
          `<SeparateCategoryCd>${
            ["GEN", "PAS", "TOTAL"][i]
          }</SeparateCategoryCd>`,
        ),
        true,
      );
    }
  }
});

Deno.test("Supported owned category documents validate canonical XSD; US-source Q unit explicitly remains guarded", async () => {
  const { buildOwned5471Schedule } = await import(
    "../../../../../2025/mef/forms/general/foreign/f5471/f5471-owned-schedules.ts"
  );
  const item = ownedCfcWorksheetItem(true, true);
  const base = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/",
    import.meta.url,
  ).pathname;
  for (
    const tag of [
      "IRS5471ScheduleE",
      "IRS5471ScheduleJ",
      "IRS5471ScheduleP",
      "IRS5471ScheduleQ",
    ] as const
  ) {
    const family = tag === "IRS5471ScheduleJ"
      ? "CorporateIncomeTax/Common"
      : "Shared";
    for (const category of ["GEN", "PAS", "TOTAL"] as const) {
      if (tag === "IRS5471ScheduleQ" && category !== "GEN") {
        assertThrows(
          () => buildOwned5471Schedule(item, "Alex Taxpayer", tag, category),
          Error,
          "canonical v5.4 CountryCd excludes US",
        );
        continue;
      }
      const xml = buildOwned5471Schedule(item, "Alex Taxpayer", tag, category)
        .replace(
          `<${tag}`,
          `<${tag} xmlns="http://www.irs.gov/efile" documentId="${tag}${category}"`,
        );
      const child = new Deno.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          `${base}${family}/${tag}/${tag}.xsd`,
          "-",
        ],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      }).spawn();
      const writer = child.stdin.getWriter();
      await writer.write(new TextEncoder().encode(xml));
      await writer.close();
      const result = await child.output();
      assertEquals(
        result.success,
        true,
        `${tag}/${category}: ${new TextDecoder().decode(result.stderr)}`,
      );
    }
  }
});

Deno.test("Separate unrelated-note diagnostic preserves sixteen category obligations; original shareholder-note native operands remain guarded", async () => {
  const { form5471 } = await import("../../../../../2025/mef/forms/general/foreign/f5471/f5471.ts");
  const { form5471ScheduleH } = await import(
    "../../../../../2025/mef/forms/general/foreign/f5471/f5471_schedule_h.ts"
  );
  const { form5471ScheduleM } = await import(
    "../../../../../2025/mef/forms/general/foreign/f5471/f5471_schedule_m.ts"
  );
  const { requiredScheduleReferences, form5471RequiredScheduleKeys } =
    await import("../../../../../2025/mef/forms/general/foreign/f5471/f5471-linkage.ts");
  const { documentId } = await import("../../../../../2025/mef/identity/document-identity.ts");
  const context = {
    pending: ownedCfcWorksheetPending(true, true),
    filer: form8992Filer,
    phase: "discovery" as const,
  };
  const parent = form5471.build({}, context);
  assertEquals(
    parent.includes(
      "<EndAcctPrdTotalAssetsAmt>230200</EndAcctPrdTotalAssetsAmt>",
    ),
    true,
  );
  assertEquals(
    parent.includes(
      "<LargestBalanceLoanUSCorpAmt>60000</LargestBalanceLoanUSCorpAmt>",
    ),
    false,
  );
  const fragments = [form5471, form5471ScheduleH, form5471ScheduleM].flatMap(
    (form) =>
      [
        form.build({}, context),
        ...(form.buildAdditionalDocuments?.({}, context) ?? []),
      ].map((xml) => ({ xml, tag: /^<([^ >]+)/.exec(xml)![1] })),
  );
  const byTag = Object.fromEntries(
    form5471RequiredScheduleKeys.map((
      [, tag],
    ) => [
      tag,
      Array.from({
        length: [
            "IRS5471ScheduleE",
            "IRS5471ScheduleJ",
            "IRS5471ScheduleP",
            "IRS5471ScheduleQ",
          ].includes(tag)
          ? 3
          : 1,
      }, (_, i) => tag + "REQUIRED" + i),
    ]),
  );
  // This is the source-required inventory only, never a completed document packet.
  assertEquals(Object.values(byTag).flat().length, 16);
  byTag.IRS5471ScheduleQ = byTag.IRS5471ScheduleQ.slice(0, 1);
  assertThrows(() =>
    requiredScheduleReferences({
      ...context,
      phase: "final",
      documentIdsByTag: byTag,
    }, ownedCfcWorksheetItem(true, true))
  );
  const base = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/",
    import.meta.url,
  ).pathname;
  for (
    const f of fragments.filter((f) =>
      [
        "IRS5471",
        "ItemizedOtherInvestmentsSch",
        "IRS5471ScheduleH",
        "IRS5471ScheduleM",
      ].includes(
        f.tag,
      )
    )
  ) {
    const path = f.tag === "ItemizedOtherInvestmentsSch"
      ? "CorporateIncomeTax/Common/Dependencies/ItemizedOtherInvestmentsSchedule.xsd"
      : `${
        f.tag === "IRS5471ScheduleH" ? "Shared" : "CorporateIncomeTax/Common"
      }/${f.tag}/${f.tag}.xsd`;
    const xml = f.xml.replace(
      `<${f.tag}`,
      `<${f.tag} xmlns="http://www.irs.gov/efile" documentId="${
        documentId(f.tag, fragments.indexOf(f))
      }"`,
    );
    const child = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", base + path, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const result = await child.output();
    assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  }
});

Deno.test("Owned worksheet public income reaches actual Schedule1/AGI/1040 while unresolved filing authority still blocks exports", async () => {
  const { ownedCfcWorksheetPublicInputs } = await import(
    "./worksheet-source.fixture.ts"
  );
  const { f1040_2025 } = await import("../../../../../2025/index.ts");
  const { normalizeAllPending } = await import("../../../../../2025/return-processing/pending.ts");
  const { assertAttachmentCoverage } = await import(
    "../../../../../2025/return-processing/attachment-coverage.ts"
  );
  assertThrows(
    () => ownedCfcWorksheetPublicInputs(true),
    Error,
    "sections7872/482",
  );
  for (
    const [withUS, expectedSubpartF, expectedAGI] of [
      [false, 9531, 51625],
      [true, 10685, 52779],
    ] as const
  ) {
    // The second case is separately constructed unrelated-corporate zero956;
    // it does not replace the retained, guarded shareholder note.
    const result = f1040_2025.executeReturn(
      ownedCfcWorksheetPublicInputs(withUS, withUS),
    );
    assertEquals(result.diagnostics, []);
    const p = normalizeAllPending(result.pending);
    assertEquals(
      p.schedule1.line8n_section951a_inclusion,
      expectedSubpartF,
    );
    assertEquals(p.schedule1.line8o_section951aa_inclusion, 42094);
    assertEquals(p.f1040.line8_additional_income, expectedAGI);
    assertEquals(p.f1040.line11_agi, expectedAGI);
    assertEquals(p.f1040.line15_taxable_income, expectedAGI - 15750);
    for (const kind of ["pdf", "mef"] as const) {
      assertThrows(
        () => assertAttachmentCoverage(p, kind),
        Error,
        "constructed worksheet/election/consent",
      );
    }
  }
});

Deno.test("Actual unrelated domestic corporate obligation is excluded under956c2F, while coupon remains passive", () => {
  const r = calculateOwnedCfcWorksheets(ownedCfcWorksheetSource(true, true));
  assertEquals(r.worksheet_a["53"], 1145);
  assertEquals(r.worksheet_b["3"], 0);
  assertEquals(r.worksheet_b["19"], 0);
  assertEquals(r.ep_rollforward.section956_ptep_reclassified, 0);
});

Deno.test("Initial modified-gross-income prerequisite retains paid cents and rejects detached owner/year/method/consent authority", () => {
  for (const withUS of [false, true]) {
    const source = ownedCfcWorksheetSource(withUS);
    const r = calculateOwnedCfcWorksheets(source);
    const allocation = r.interest_apportionment[0];
    assertEquals(allocation.gross_denominator, withUS ? 65200 : 64000);
    assertEquals(allocation.paid_amount, 3000);
    assertEquals(
      allocation.rows.map((row) => row.amount),
      withUS ? [460.12, 55.22, 2484.66] : [468.75, 0, 2531.25],
    );
    assertEquals(
      Math.round(allocation.rows.reduce((n, row) => n + row.amount, 0) * 100),
      300000,
    );
    assertEquals(
      r.foreign_posted_expenses.find((e) => e.kind === "income_tax")!
        .assessed_taxable_income,
      49500,
    );
    assertEquals(r.filing_authority, "unverified_no_export");
    for (
      const change of [
        (s: typeof source) => {
          s.interest_apportionment_election_prerequisite
            .controlling_shareholder_tin = "900000001";
        },
        (s: typeof source) => {
          s.interest_apportionment_election_prerequisite
            .complete_controlled_cfc_inventory[0] = "DETACHED";
        },
        (s: typeof source) => {
          s.interest_apportionment_election_prerequisite.shares_owned++;
        },
        (s: typeof source) => {
          Object.assign(s.interest_apportionment_election_prerequisite, {
            effective_tax_year: 2024,
          });
        },
        (s: typeof source) => {
          Object.assign(s.interest_apportionment_election_prerequisite, {
            method: "asset",
          });
        },
        (s: typeof source) => {
          Object.assign(s.interest_apportionment_election_prerequisite, {
            consent_authority: "authenticated",
          });
        },
      ]
    ) {
      const c = structuredClone(source);
      change(c);
      assertThrows(() => calculateOwnedCfcWorksheets(c));
    }
  }
});

Deno.test("Source bank/property/title/withholding records reject unchanged-total cross-owner and altered ledger evidence", () => {
  const source = ownedCfcWorksheetSource(true);
  for (
    const change of [
      (s: typeof source) => {
        s.current_bank_balance_record.cfc_reference = "OTHER";
      },
      (s: typeof source) => {
        s.current_bank_balance_record.quarter_closing_balances[1]++;
      },
      (s: typeof source) => {
        s.current_bank_balance_record.closing_balance++;
      },
      (s: typeof source) => {
        const r = s.current_income_records[0];
        if (r.kind === "inventory_sale") {
          r.purchase_payment_record
            .supplier_reference = "OTHER";
        }
      },
      (s: typeof source) => {
        const r = s.current_income_records[0];
        if (r.kind === "inventory_sale") {
          r.sale_shipping_record.invoice_document_reference = "OTHER";
        }
      },
      (s: typeof source) => {
        const r = s.current_income_records[2];
        if (r.kind === "ordinary_interest") {
          r.withholding_payment_record!.beneficial_owner_cfc_reference =
            "OTHER";
        }
      },
      (s: typeof source) => {
        const r = s.current_income_records[2];
        if (r.kind === "ordinary_interest") {
          r.withholding_payment_record!
            .treasury_payment_amount++;
        }
      },
      (s: typeof source) => {
        const r = s.current_income_records[2];
        if (r.kind === "ordinary_interest") {
          r.withholding_payment_record = undefined;
        }
      },
    ]
  ) {
    const c = structuredClone(source);
    change(c);
    assertThrows(() => calculateOwnedCfcWorksheets(c));
  }
});

Deno.test("Original2percent debt cannot become public/native/PDF finalized operands through an attached raw source", async () => {
  const { ownedCfcWorksheetPublicInputs } = await import(
    "./worksheet-source.fixture.ts"
  );
  const { f1040_2025 } = await import("../../../../../2025/index.ts");
  const { owned5471PdfValues } = await import(
    "../../../../../2025/pdf/forms/general/foreign/f5471/f5471-owned-values.ts"
  );
  const { buildOwned5471Schedule } = await import(
    "../../../../../2025/mef/forms/general/foreign/f5471/f5471-owned-schedules.ts"
  );
  const { assertAttachmentCoverage } = await import(
    "../../../../../2025/return-processing/attachment-coverage.ts"
  );
  const publicInput = ownedCfcWorksheetPublicInputs(false);
  const raw = ownedCfcWorksheetSource(true);
  publicInput.f5471[0].owned_worksheet_source = raw;
  assertThrows(
    () => inputSchema.parse({ f5471s: publicInput.f5471 }),
    Error,
    "sections7872/482",
  );
  const result = f1040_2025.executeReturn(publicInput);
  assertEquals(result.diagnostics.length > 0, true);
  for (const kind of ["pdf", "mef"] as const) {
    assertThrows(
      () =>
        assertAttachmentCoverage(
          { f5471: { f5471s: publicInput.f5471 } },
          kind,
        ),
      Error,
      "constructed worksheet/election/consent",
    );
  }
  for (
    const tag of [
      "IRS5471ScheduleE",
      "IRS5471ScheduleJ",
      "IRS5471ScheduleP",
      "IRS5471ScheduleQ",
    ] as const
  ) {
    assertThrows(
      () =>
        buildOwned5471Schedule(
          publicInput.f5471[0],
          "Alex Taxpayer",
          tag,
          "GEN",
        ),
      Error,
      "sections7872/482",
    );
  }
  for (const schedule of ["E", "J", "P", "Q"] as const) {
    assertThrows(
      () => owned5471PdfValues(publicInput.f5471[0], "Alex Taxpayer", schedule),
      Error,
      "sections7872/482",
    );
  }
});

Deno.test("US passive paper unit is confined to its actual income group and remains distinct from foreign tested/sales units", async () => {
  const { owned5471PdfValues } = await import(
    "../../../../../2025/pdf/forms/general/foreign/f5471/f5471-owned-values.ts"
  );
  const values = owned5471PdfValues(
    ownedCfcWorksheetItem(true, true),
    "Alex Taxpayer",
    "Q",
  );
  const passive = values.find((v) => v.category === "PAS")! as Record<
    string,
    unknown
  >;
  assertEquals(passive.unit_name, undefined);
  assertEquals(passive.country, undefined);
  assertEquals(passive.passive_unit_name, "Owned Services And Securities Ltd");
  assertEquals(passive.passive_gross, 1200);
  assertEquals(passive.tested_gross, 0);
});

Deno.test("Owned invoice/payment/receipt dates reject normalized impossible calendar days before cash reconciliation", () => {
  for (
    const invalid of [
      "2025-02-29",
      "2025-02-30",
      "2025-04-31",
      "2025-13-01",
      "2025-00-15",
    ]
  ) {
    const source = ownedCfcWorksheetSource(false);
    const invoice = source.current_income_records[0];
    if (invoice.kind !== "inventory_sale") {
      throw Error("inventory source missing");
    }
    invoice.date = invalid;
    invoice.purchase_payment_record.date = invalid;
    source.current_cash_receipts[0].received_on = invalid;
    // All three date joins agree, so rejection must be actual calendar validity.
    assertThrows(
      () => calculateOwnedCfcWorksheets(source),
      Error,
      "Invalid actual calendar date",
    );
  }
});
