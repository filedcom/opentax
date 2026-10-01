import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import {
  calculateExcessEvents,
  ExcessEventKind,
} from "../../../nodes/inputs/f8621/excess_distribution.ts";
import { itemSchema, PficRegime } from "../../../nodes/inputs/f8621/index.ts";
import {
  explainForm8621ExcessEvent,
  explainForm8621ExcessStatement,
  form8621ExcessStatement,
} from "../../mef/forms/f8621_excess_statement.ts";
import { appendForm8621ExcessStatement } from "./f8621_excess_statement.ts";

const source = {
  kind: ExcessEventKind.Distribution as const,
  holding_period_start: "2024-01-01",
  first_pfic_tax_year: 2024,
  shares_in_block: 100,
  currency_code: "EUR",
  prior_year_distributions: [{ tax_year: 2024, amount_foreign: 4_000 }],
  current_year_distributions: [{
    date: "2025-12-31",
    amount_foreign: 10_000,
    spot_usd_per_unit: 1.2,
    spot_rate_source: "Issuer spot quote 2025-12-31",
    year_charges: [],
  }],
  taxable_nonexcess_dividend_usd: 6_000,
};
const item = itemSchema.parse({
  company_name: "Euro Fund Ltd",
  company_ein_or_ref: "EURO001",
  country_of_incorporation: "Ireland",
  regime: PficRegime.EXCESS_DISTRIBUTION,
  shares_owned: 100,
  fmv_at_year_end: 20_000,
  excess_events: [source],
});
const line = { item, excessEvents: calculateExcessEvents(source) };
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  fullName: "Alex Taxpayer",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

Deno.test("Form 8621 Part V explanation matches source-derived native and printable statement", async () => {
  const explanation = explainForm8621ExcessStatement(line);
  assertStringIncludes(explanation, "1.2 USD per EUR");
  assertStringIncludes(explanation, "Issuer spot quote 2025-12-31");
  assertStringIncludes(
    explainForm8621ExcessEvent(line, 0),
    "Issuer spot quote 2025-12-31",
  );
  const [native] = form8621ExcessStatement.build({}, {
    pending: { form8621: { items: [line] } },
  });
  assertStringIncludes(native, "Issuer spot quote 2025-12-31");
  const pdf = await PDFDocument.create();
  assertEquals(await appendForm8621ExcessStatement(pdf, [line], filer), 1);
  assertEquals(pdf.getPageCount(), 1);
  assertEquals((await pdf.save()).byteLength > 0, true);
});

Deno.test("Form 8621 Part V PDF refuses changed calculated years or missing filer identity", async () => {
  const changed = {
    ...line,
    excessEvents: [{
      ...line.excessEvents[0],
      line16f_interest: line.excessEvents[0].line16f_interest + 1,
    }],
  };
  await assertRejects(
    async () =>
      appendForm8621ExcessStatement(
        await PDFDocument.create(),
        [changed],
        filer,
      ),
    Error,
    "differs from source events",
  );
  await assertRejects(
    async () =>
      appendForm8621ExcessStatement(
        await PDFDocument.create(),
        [line],
        undefined,
      ),
    Error,
    "needs filer name and SSN",
  );
});
