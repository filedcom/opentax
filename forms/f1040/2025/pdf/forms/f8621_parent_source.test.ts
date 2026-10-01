import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import { itemSchema, PficRegime } from "../../../nodes/inputs/f8621/index.ts";
import {
  calculateExcessEvents,
  ExcessEventKind,
} from "../../../nodes/inputs/f8621/excess_distribution.ts";
import { projectForm8621ParentSource } from "../../form8621_parent_source.ts";
import { form8621 } from "../../mef/forms/f8621.ts";
import {
  projectForm8621Page1,
  projectForm8621ParentPages,
} from "./f8621_parent_source.ts";
import { projectForm8621Section1291Packet } from "./f8621_packet_source.ts";
import { appendForm8621ExcessStatement } from "./f8621_excess_statement.ts";

const parentSource = {
  corporation_address: {
    line1: "1 Fund Quay",
    city: "Dublin",
    country_code: "IE",
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
  assertEquals(pages.partVI, {});
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
