import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import { FilingStatus } from "../../../../../mef/header.ts";
import { itemSchema, PficRegime } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import {
  calculateExcessEvents,
  ExcessEventKind,
} from "../../../../../nodes/inputs/income/foreign/f8621/excess_distribution.ts";
import {
  assertForm8621PrintableSource,
  projectForm8621ParentSource,
} from "../../../../domains/income/foreign/form8621/form8621_parent_source.ts";
import { form8621 } from "../../../../mef/forms/income/foreign/f8621.ts";
import {
  projectForm8621Page1,
  projectForm8621Page2,
  projectForm8621ParentPages,
} from "./f8621_parent_source.ts";
import { projectForm8621Section1291Packet } from "./f8621_packet_source.ts";
import { appendForm8621ExcessStatement } from "./f8621_excess_statement.ts";

const parentSource = {
  corporation_address: {
    line1: "1 Fund Quay",
    city: "Dublin",
    country_code: "EI",
    postal_code: "D02 TEST",
  },
  corporation_tax_year_start: "2025-01-01",
  corporation_tax_year_end: "2025-12-31",
  share_classes: [{
    description: "Class A ordinary",
    year_end_shares: 100,
    year_end_value_usd: 20_000,
  }],
  jointly_owned_with_spouse: false,
  shares_acquired_during_2025: true,
  acquisition_date: "2025-03-17",
  election_status: "section1291_no_new_election",
  no_outstanding_section1294_election: true,
  issuer_record: {
    document_id: "issuer-2025-001",
    sha256: "a".repeat(64),
  },
};
const item = itemSchema.parse({
  company_name: "Euro Fund Ltd",
  company_ein_or_ref: "EURO001",
  country_of_incorporation: "Ireland",
  regime: PficRegime.EXCESS_DISTRIBUTION,
  shares_owned: 100,
  fmv_at_year_end: 20_000,
  parent_source: parentSource,
});
const filer = {
  primarySSN: "123456789",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

function copy(document_id: string, contents: string) {
  const bytes = new TextEncoder().encode(contents);
  return {
    document_id,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: btoa(String.fromCharCode(...bytes)),
  };
}

Deno.test("Form 8621 parent facts reconcile across source, native, and staged page 1", () => {
  const source = projectForm8621ParentSource(item);
  assertEquals(source.share_classes[0].year_end_shares, 100);
  const [native] = form8621.build({ items: [{ item, excessEvents: [] }] });
  assertStringIncludes(native, "<PFICOrQEFForeignAddress>");
  assertStringIncludes(
    native,
    "<ClassOfShareTxt>Class A ordinary</ClassOfShareTxt>",
  );
  assertStringIncludes(
    native,
    "<SharesAcquiredDt>2025-03-17</SharesAcquiredDt>",
  );
  const page = projectForm8621Page1({ item, excessEvents: [] }, filer);
  assertEquals(page["topmostSubform[0].Page1[0].f1_23[0]"], "Class A ordinary");
  assertEquals(page["topmostSubform[0].Page1[0].f1_25[0]"], "100");
  assertEquals(page["topmostSubform[0].Page1[0].c1_9[0]"], false);
  assertEquals(page["topmostSubform[0].Page1[0].f1_8[0]"], "123456789");
  assertEquals(page["topmostSubform[0].Page1[0].f1_27[0]"], undefined);
});

Deno.test("Form 8621 QEF and MTM parent pages use calculated Part III/IV amounts", () => {
  const qef = itemSchema.parse({
    ...item,
    regime: PficRegime.QEF,
    parent_source: { ...parentSource, election_status: "qef_new_2025" },
    qef_ordinary_income: 1500,
    qef_ordinary_951_or_1293g_reduction: 100,
    qef_capital_gain: 800,
    qef_capital_951_or_1293g_reduction: 50,
  });
  const qefLine = { item: qef, excessEvents: [] };
  assertEquals(
    projectForm8621Page1(qefLine, filer)["topmostSubform[0].Page1[0].f1_28[0]"],
    "2150",
  );
  assertEquals(projectForm8621Page2(qefLine), {
    "topmostSubform[0].Page2[0].f2_1[0]": "1500",
    "topmostSubform[0].Page2[0].f2_2[0]": "100",
    "topmostSubform[0].Page2[0].f2_3[0]": "1400",
    "topmostSubform[0].Page2[0].f2_4[0]": "800",
    "topmostSubform[0].Page2[0].f2_5[0]": "50",
    "topmostSubform[0].Page2[0].f2_6[0]": "750",
  });
  const mtm = itemSchema.parse({
    ...item,
    regime: PficRegime.MTM,
    parent_source: { ...parentSource, election_status: "mtm_new_2025" },
    mtm_adjusted_basis_at_year_end: 23000,
    mtm_unreversed_inclusions: 2000,
  });
  const mtmLine = { item: mtm, excessEvents: [] };
  assertEquals(
    projectForm8621Page1(mtmLine, filer)["topmostSubform[0].Page1[0].f1_29[0]"],
    "-2000",
  );
  assertEquals(projectForm8621Page2(mtmLine), {
    "topmostSubform[0].Page2[0].f2_15[0]": "20000",
    "topmostSubform[0].Page2[0].f2_16[0]": "23000",
    "topmostSubform[0].Page2[0].f2_17[0]": "-3000",
    "topmostSubform[0].Page2[0].f2_18[0]": "2000",
    "topmostSubform[0].Page2[0].f2_19[0]": "-2000",
  });
  const sold = itemSchema.parse({
    ...mtm,
    mtm_dispositions: [{
      transaction_id: "sale-1",
      disposition_date: "2025-07-15",
      shares_disposed: 20,
      fair_market_value_usd: 2400,
      adjusted_basis_usd: 2000,
      unreversed_inclusions_usd: 0,
      broker_record_id: "broker-2025-1",
      basis_record_id: "basis-lot-1",
    }],
  });
  const salePage = projectForm8621Page2({ item: sold, excessEvents: [] });
  assertEquals(salePage["topmostSubform[0].Page2[0].f2_20[0]"], "2400");
  assertEquals(salePage["topmostSubform[0].Page2[0].f2_21[0]"], "2000");
  assertEquals(salePage["topmostSubform[0].Page2[0].f2_22[0]"], "400");
  assertStringIncludes(
    form8621.build({ items: [{ item: sold, excessEvents: [] }] })[0],
    "<OrdinaryIncomeFromPFICStkAmt>400</OrdinaryIncomeFromPFICStkAmt>",
  );
});

Deno.test("Form 8621 printable source checks retained issuer, QEF, MTM, and prior election copies", () => {
  const issuer = copy("issuer-2025-001", "Fund annual report, 2025");
  const qefStatement = {
    ...copy(
      "qef-ai-2025",
      "PFIC annual information statement, 1500 ordinary, 800 capital",
    ),
    ordinary_earnings_usd: 1500,
    net_capital_gain_usd: 800,
  };
  const qef = itemSchema.parse({
    ...item,
    regime: PficRegime.QEF,
    qef_ordinary_income: 1500,
    qef_capital_gain: 800,
    parent_source: {
      ...parentSource,
      issuer_record: issuer,
      election_status: "qef_new_2025",
      qef_annual_statement: qefStatement,
    },
  });
  assertForm8621PrintableSource(qef);
  assertThrows(
    () =>
      assertForm8621PrintableSource({
        ...qef,
        parent_source: {
          ...qef.parent_source!,
          qef_annual_statement: {
            ...qefStatement,
            ordinary_earnings_usd: 1501,
          },
        },
      }),
    Error,
    "QEF income differs from annual statement",
  );
  assertThrows(
    () =>
      assertForm8621PrintableSource({
        ...qef,
        parent_source: {
          ...qef.parent_source!,
          issuer_record: { ...issuer, bytes_base64: btoa("changed") },
        },
      }),
    Error,
    "retained source bytes differ",
  );
  const mtm = itemSchema.parse({
    ...item,
    regime: PficRegime.MTM,
    mtm_adjusted_basis_at_year_end: 18000,
    mtm_unreversed_inclusions: 0,
    parent_source: {
      ...parentSource,
      issuer_record: issuer,
      election_status: "mtm_new_2025",
      mtm_year_end_value_record: {
        ...copy("market-2025", "Exchange 2025 quote: 20000"),
        quoted_value_usd: 20000,
        market_name: "Recognized Stock Exchange",
      },
      mtm_adjusted_basis_record: {
        ...copy("basis-2025", "Stock basis: 18000"),
        adjusted_basis_usd: 18000,
        unreversed_inclusions_usd: 0,
      },
    },
  });
  assertForm8621PrintableSource(mtm);
  assertThrows(
    () =>
      assertForm8621PrintableSource({
        ...mtm,
        parent_source: {
          ...mtm.parent_source!,
          election_status: "mtm_continuing",
        },
      }),
    Error,
    "continuing election needs prior filed proof",
  );
});

Deno.test("Form 8621 staged parent creates a distinct Part V and statement for each source event", async () => {
  const source = {
    kind: ExcessEventKind.Distribution as const,
    holding_period_start: "2024-01-01",
    first_pfic_tax_year: 2024,
    shares_in_block: 100,
    prior_year_distributions: [{ tax_year: 2024, amount_usd: 0 }],
    current_year_distributions: [
      { date: "2025-06-30", amount_usd: 4_000, year_charges: [] },
      { date: "2025-12-31", amount_usd: 6_000, year_charges: [] },
    ],
    taxable_nonexcess_dividend_usd: 0,
  };
  const eventItem = itemSchema.parse({
    ...item,
    parent_source: {
      ...parentSource,
      shares_acquired_during_2025: false,
      acquisition_date: undefined,
      section1291_prior_distribution_records: [{
        source_event_index: 0,
        tax_year: 2024,
        currency_code: "USD",
        amount: 0,
        document_id: "issuer-2024-zero-distribution",
        sha256: "b".repeat(64),
      }],
    },
    excess_events: [source],
  });
  const results = calculateExcessEvents(source);
  const pages = projectForm8621ParentPages(
    { item: eventItem, excessEvents: results },
    filer,
  );
  const [native] = form8621.build({
    items: [{ item: eventItem, excessEvents: results }],
  });
  assertStringIncludes(
    native,
    '<Section1291Ind section1291Amt="10000">X</Section1291Ind>',
  );
  assertEquals(pages.page1["topmostSubform[0].Page1[0].f1_27[0]"], "10000");
  assertEquals(pages.partV.length, 2);
  assertEquals(pages.partV[0]["topmostSubform[0].Page3[0].f3_7[0]"], "4000");
  assertEquals(pages.partV[1]["topmostSubform[0].Page3[0].f3_7[0]"], "6000");
  assertEquals(pages.partVI, []);
  const statementPdf = await PDFDocument.create();
  assertEquals(
    await appendForm8621ExcessStatement(
      statementPdf,
      [{ item: eventItem, excessEvents: results }],
      filer,
    ),
    2,
  );
  assertEquals(statementPdf.getPageCount(), 2);
  assertStringIncludes(
    pages.holdingPeriodStatements[0],
    "Holding-period allocation",
  );
  assertEquals(pages.holdingPeriodStatements.length, 2);
  const pending = {
    form8621: { items: [{ item: eventItem, excessEvents: results }] },
    schedule1: {
      line8z_form8621_section1291: results.reduce(
        (sum, event) => sum + event.line16b_current_and_pre_pfic_income,
        0,
      ),
    },
    schedule2: {
      line17p_form8621_interest: results.reduce(
        (sum, event) => sum + event.line16f_interest,
        0,
      ),
    },
    f1040: {
      form8621_tax: results.reduce(
        (sum, event) => sum + event.line16e_additional_tax,
        0,
      ),
      line16_income_tax: results.reduce(
        (sum, event) => sum + event.line16e_additional_tax,
        500,
      ),
    },
  };
  const packet = projectForm8621Section1291Packet(pending, filer);
  assertEquals(packet.forms.length, 1);
  assertEquals(packet.forms[0].partV.length, 2);
  const prior = eventItem.parent_source!
    .section1291_prior_distribution_records![0];
  for (
    const records of [
      [],
      [{ ...prior, amount: 1 }],
      [{ ...prior, currency_code: "EUR" }],
      [{ ...prior, source_event_index: 1 }],
      [prior, prior],
    ]
  ) {
    assertThrows(
      () =>
        projectForm8621Section1291Packet({
          ...pending,
          form8621: {
            items: [{
              item: {
                ...eventItem,
                parent_source: {
                  ...eventItem.parent_source!,
                  section1291_prior_distribution_records: records,
                },
              },
              excessEvents: results,
            }],
          },
        }, filer),
      Error,
      "prior distribution records differ",
    );
  }
  assertThrows(
    () =>
      projectForm8621Section1291Packet({
        ...pending,
        form8621: {
          items: [{
            item: {
              ...eventItem,
              parent_source: {
                ...eventItem.parent_source!,
                section1291_prior_distribution_records: [{
                  ...prior,
                  sha256: "bad",
                }],
              },
            },
            excessEvents: results,
          }],
        },
      }, filer),
    Error,
  );
  assertThrows(
    () =>
      projectForm8621Section1291Packet({
        ...pending,
        schedule2: {
          line17p_form8621_interest:
            pending.schedule2.line17p_form8621_interest + 1,
        },
      }, filer),
    Error,
    "interest differs from Schedule 2",
  );
  assertThrows(
    () =>
      projectForm8621Section1291Packet({
        ...pending,
        f1040: {
          ...pending.f1040,
          form8621_tax: pending.f1040.form8621_tax + 1,
        },
      }, filer),
    Error,
    "additional tax differs from Form 1040",
  );
  assertThrows(
    () =>
      projectForm8621ParentPages({
        item: eventItem,
        excessEvents: [{
          ...results[0],
          line16f_interest: results[0].line16f_interest + 1,
        }, results[1]],
      }, filer),
    Error,
    "differs from source events",
  );
});

Deno.test("Form 8621 prints Part V only for excess distributions in a mixed block", () => {
  const mixedSource = {
    kind: ExcessEventKind.Distribution as const,
    holding_period_start: "2024-01-01",
    first_pfic_tax_year: 2024,
    shares_in_block: 100,
    prior_year_distributions: [{ tax_year: 2024, amount_usd: 8_000 }],
    current_year_distributions: [
      { date: "2025-06-30", amount_usd: 0.01, year_charges: [] },
      { date: "2025-12-31", amount_usd: 11_000, year_charges: [] },
    ],
    taxable_nonexcess_dividend_usd: 0,
  };
  const mixedItem = itemSchema.parse({
    ...item,
    parent_source: {
      ...parentSource,
      shares_acquired_during_2025: false,
      acquisition_date: undefined,
      section1291_prior_distribution_records: [{
        source_event_index: 0,
        tax_year: 2024,
        currency_code: "USD",
        amount: 8_000,
        document_id: "issuer-2024-distributions",
        sha256: "b".repeat(64),
      }],
    },
    excess_events: [mixedSource],
  });
  const results = calculateExcessEvents(mixedSource);
  assertEquals(results.length, 2);
  assertEquals(results[0].amount_usd, 0);
  const line = { item: mixedItem, excessEvents: results };
  const pages = projectForm8621ParentPages(line, filer);
  assertEquals(pages.partV.length, 1);
  assertEquals(pages.holdingPeriodStatements.length, 1);
  assertStringIncludes(pages.holdingPeriodStatements[0], "distribution 2,");
  assertEquals(
    pages.partV[0]["topmostSubform[0].Page3[0].f3_7[0]"],
    String(Math.round(results[1].amount_usd)),
  );
  const income = results.reduce(
    (sum, event) => sum + event.line16b_current_and_pre_pfic_income,
    0,
  );
  const tax = results.reduce(
    (sum, event) => sum + event.line16e_additional_tax,
    0,
  );
  const interest = results.reduce(
    (sum, event) => sum + event.line16f_interest,
    0,
  );
  const packet = projectForm8621Section1291Packet({
    form8621: { items: [line] },
    schedule1: { line8z_form8621_section1291: income },
    schedule2: { line17p_form8621_interest: interest },
    f1040: { form8621_tax: tax, line16_income_tax: tax + 500 },
  }, filer);
  assertEquals(packet.forms[0].partV.length, 1);
});

Deno.test("Form 8621 parent source rejects changed shares, election, and acquisition facts", () => {
  assertThrows(
    () => projectForm8621ParentSource({ ...item, shares_owned: 101 }),
    Error,
    "share classes differ",
  );
  assertThrows(
    () =>
      projectForm8621ParentSource(
        {
          ...item,
          parent_source: {
            ...parentSource,
            election_status: "qef_new_2025",
          },
        } as typeof item,
      ),
    Error,
    "election source disagrees",
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      parent_source: { ...parentSource, acquisition_date: undefined },
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      parent_source: {
        ...parentSource,
        issuer_record: { document_id: "issuer-2025-001", sha256: "bad" },
      },
    }).success,
    false,
  );
});
