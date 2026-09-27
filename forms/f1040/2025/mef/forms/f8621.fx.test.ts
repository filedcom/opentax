import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateExcessEvents,
  ExcessEventKind,
  excessEventSchema,
} from "../../../nodes/inputs/f8621/excess_distribution.ts";
import { itemSchema, PficRegime } from "../../../nodes/inputs/f8621/index.ts";
import { form8621 } from "./f8621.ts";
import { form8621ExcessStatement } from "./f8621_excess_statement.ts";

const foreignBlock = {
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
    spot_rate_source: "Test spot quote, 2025-12-31",
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
  excess_events: [foreignBlock],
});

Deno.test("Form 8621 MeF keeps lines 15a to 15e(1) in EUR and line 15e(2) in USD", () => {
  const calculated = calculateExcessEvents(foreignBlock);
  const [xml] = form8621.build({
    items: [{ item, excessEvents: calculated }],
  });
  assertStringIncludes(xml, "<FunctionalCurrencyCd>EUR</FunctionalCurrencyCd>");
  assertStringIncludes(
    xml,
    "<TotalPFICDistriDurCurrTYAmt>10000</TotalPFICDistriDurCurrTYAmt>",
  );
  assertStringIncludes(
    xml,
    "<DistributionsIn3PrecedingTYAmt>4000</DistributionsIn3PrecedingTYAmt>",
  );
  assertStringIncludes(
    xml,
    "<AverageDistri3PrevTY125PctAmt>5000</AverageDistri3PrevTY125PctAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalExcessDistributionAmt>5000</TotalExcessDistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalExcessDistributionUSAmt>6000</TotalExcessDistributionUSAmt>",
  );
  assertStringIncludes(
    xml,
    `<InterestOnEachNetIncrInTaxAmt>${calculated[0].line16f_interest}</InterestOnEachNetIncrInTaxAmt>`,
  );
});

Deno.test("Form 8621 rejects a mixed line 15 currency on one MeF filing", () => {
  const foreign = calculateExcessEvents(foreignBlock)[0];
  const gbp = calculateExcessEvents({
    ...foreignBlock,
    currency_code: "GBP",
  })[0];
  assertThrows(
    () =>
      form8621.build({
        items: [{ item, excessEvents: [foreign, gbp] }],
      }),
    Error,
    "one line 15 currency",
  );
});

Deno.test("Form 8621 foreign source requires an explicit positive spot rate", () => {
  const invalid = {
    ...foreignBlock,
    current_year_distributions: [{
      ...foreignBlock.current_year_distributions[0],
      spot_usd_per_unit: 0,
    }],
  };
  assertEquals(excessEventSchema.safeParse(invalid).success, false);
  const noSource = {
    ...foreignBlock,
    current_year_distributions: [{
      ...foreignBlock.current_year_distributions[0],
      spot_rate_source: "",
    }],
  };
  assertEquals(excessEventSchema.safeParse(noSource).success, false);
});

Deno.test("Form 8621 holding-period statement retains the FX quote and its source", () => {
  const lines = [{ item, excessEvents: calculateExcessEvents(foreignBlock) }];
  const [statement] = form8621ExcessStatement.build({}, {
    pending: { form8621: { items: lines } },
  });
  assertStringIncludes(statement, "1.2 USD per EUR");
  assertStringIncludes(statement, "Test spot quote, 2025-12-31");
});

Deno.test("Form 8621 MeF reports translated disposition gain on line 15f", () => {
  const foreignDisposition = {
    kind: ExcessEventKind.Disposition as const,
    currency_code: "EUR",
    net_proceeds_foreign: 10_000,
    spot_usd_per_unit: 1.2,
    spot_rate_source: "Test spot quote, 2025-12-31",
    adjusted_basis_usd: 2_000,
    holding_period_start: "2024-01-01",
    event_date: "2025-12-31",
    first_pfic_tax_year: 2024,
    year_charges: [],
  };
  const dispositionItem = itemSchema.parse({
    ...item,
    excess_events: [foreignDisposition],
  });
  const lines = [{
    item: dispositionItem,
    excessEvents: calculateExcessEvents(foreignDisposition),
  }];
  const [xml] = form8621.build({ items: lines });
  assertStringIncludes(
    xml,
    "<GainLossFromDisposOfStkAmt>10000</GainLossFromDisposOfStkAmt>",
  );
  const [statement] = form8621ExcessStatement.build({}, {
    pending: { form8621: { items: lines } },
  });
  assertStringIncludes(
    statement,
    "10000 EUR net proceeds less 2000 USD adjusted basis",
  );
});
