import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateLandDispositions2026,
  landDispositionSource2026Schema,
} from "./land-disposition-source.ts";
import {
  calculateSection1231History2026,
  section1231History2026Schema,
} from "./section1231-history.ts";
import {
  landDispositionFixture2026,
  section1231HistoryFixture2026,
} from "./land-disposition.fixture.ts";
import { calculateSection1231History } from "../../nodes/intermediate/forms/income/business/form4797/prior_history.ts";
import { irsSection1231History } from "../../nodes/intermediate/forms/income/business/form4797/prior_history.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
const owner = { taxpayer_ssn: "123456789", filing_status: FilingStatus.Single };
Deno.test("2026 section 1231 rolls the existing 2025 result into the correct five-year window", () => {
  const previous = calculateSection1231History(irsSection1231History, 2000);
  const history = section1231HistoryFixture2026();
  const before = structuredClone(history);
  const current = calculateSection1231History2026(history, 6000, owner);
  assertEquals(
    current.current.opening_nonrecaptured_loss,
    previous.opening_2026_nonrecaptured_loss,
  );
  assertEquals(current.current.ordinary_recapture, 5000);
  assertEquals(current.current.long_term_gain, 1000);
  assertEquals(current.opening_next_year_losses, []);
  assertEquals(current.next_tax_year, 2027);
  assertEquals(history, before);
});
Deno.test("2026 section 1231 uses 2020 losses in 2025 but expires the remainder before 2026", () => {
  const h = section1231HistoryFixture2026();
  h.filed_years[4].filed_line7_net_gain_loss = 500;
  h.filed_years[4].filed_line12_recaptured_gain = 500;
  const r = calculateSection1231History2026(h, 1000, owner);
  assertEquals(r.prior_years[4].ending_losses, [{
    loss_year: 2020,
    remaining_loss: 500,
  }, { loss_year: 2021, remaining_loss: 6000 }]);
  assertEquals(r.current.expired_loss, 500);
  assertEquals(r.current.opening_nonrecaptured_loss, 6000);
  assertEquals(r.current.ordinary_recapture, 1000);
  assertEquals(r.expires_before_next_year, 5000);
  assertEquals(r.opening_next_year_losses, []);
});
Deno.test("2026 history records only the finalized current loss and expires 2021 for 2027", () => {
  const r = calculateSection1231History2026(
    {
      ...section1231HistoryFixture2026(),
      current_year_loss_taken_into_account: 2000,
      current_year_loss_source_reference: "limited-loss",
    },
    -3000,
    owner,
  );
  assertEquals(r.current.ordinary_gain_loss, -3000);
  assertEquals(r.opening_next_year_losses, [{
    loss_year: 2026,
    remaining_loss: 2000,
  }]);
  assertEquals(r.expires_before_next_year, 5000);
  assertThrows(
    () =>
      calculateSection1231History2026(
        section1231HistoryFixture2026(),
        -3000,
        owner,
      ),
    Error,
    "amount taken into account",
  );
});
Deno.test("2026 history rejects wrong windows, mismatched sources and owner allocations", () => {
  const raw = section1231HistoryFixture2026();
  assertEquals(
    section1231History2026Schema.safeParse({ ...raw, tax_year: 2025 }).success,
    false,
  );
  for (
    const mutate of [
      (h: typeof raw) => h.filed_years.reverse(),
      (h: typeof raw) => {
        h.opening_period_losses[0].loss_year = 2021;
      },
      (h: typeof raw) => {
        h.filed_years[4].filed_line8_nonrecaptured_loss = 7001;
      },
      (h: typeof raw) => {
        h.filed_years[3].filed_line12_recaptured_gain = 2999;
      },
      (h: typeof raw) => {
        h.filed_years[1].source_document_reference =
          h.filed_years[0].source_document_reference;
      },
      (h: typeof raw) => {
        h.filed_years[0].section1231_loss_taken_into_account = 6001;
      },
    ]
  ) {
    const h = structuredClone(raw);
    mutate(h);
    assertThrows(() => calculateSection1231History2026(h, 1000, owner));
  }
  assertThrows(
    () =>
      calculateSection1231History2026(raw, 1000, {
        ...owner,
        taxpayer_ssn: "987654321",
      }),
    Error,
    "filing owners",
  );
  assertThrows(
    () =>
      calculateSection1231History2026(raw, 1000, {
        ...owner,
        filing_status: FilingStatus.MFJ,
        spouse_ssn: "987654321",
      }),
    Error,
    "filing owners",
  );
});
Deno.test("2026 business land ledger derives gain and uses shared 4797 character with new printed line numbers", () => {
  const raw = landDispositionFixture2026(), before = structuredClone(raw);
  const r = calculateLandDispositions2026(raw);
  assertEquals(r.rows[0].printed, {
    gross_sales_price: 100000,
    depreciation: 0,
    basis_plus_selling_expenses: 55000,
    gain: 45000,
  });
  assertEquals([
    r.line8_net_section1231,
    r.line9_nonrecaptured_loss,
    r.line10_long_term_gain,
    r.line13_prior_loss_recapture,
    r.line19_ordinary_gain_loss,
    r.line20b_schedule1_gain_loss,
  ], [45000, 5000, 40000, 5000, 5000, 5000]);
  assertEquals(r.opening_2027_losses, []);
  assertEquals(r.filing_ready, false);
  assertEquals(raw, before);
});
Deno.test("2026 land rows retain cents and derive printed gain from rounded printed columns", () => {
  const raw = landDispositionFixture2026(), s = raw.claim.sales[0];
  s.purchase_price = 50000.24;
  s.closing.gross_sales_price = 100000.49;
  s.capitalized_acquisition_costs = [{
    record_reference: "legal",
    date: s.acquired_on,
    description: "Capitalized legal fee",
    amount: 1000.25,
  }];
  s.basis_adjustments = [{
    record_reference: "basis-up",
    date: "2020-01-01",
    description: "Capital addition",
    direction: "increase",
    amount: 3000.25,
  }, {
    record_reference: "basis-down",
    date: "2022-01-01",
    description: "Basis adjustment",
    direction: "decrease",
    amount: 500.24,
  }];
  const r = calculateLandDispositions2026(raw);
  assertEquals(r.rows[0].cents.adjusted_basis, 5350050);
  assertEquals(r.rows[0].cents.gain, 4149999);
  assertEquals(r.rows[0].printed.gain, 41499);
  assertEquals(r.line10_long_term_gain, 36499);
});
Deno.test("2026 land holding period uses more than a year and nets long sales before recapture", () => {
  const raw = landDispositionFixture2026();
  const second = structuredClone(raw.claim.sales[0]);
  second.sale_reference = "sale-2";
  second.property_reference = "parcel-2";
  second.acquisition_record_reference = "purchase-2";
  second.acquired_on = "2025-06-02";
  second.purchase_price = 10000;
  second.closing.gross_sales_price = 10200;
  second.closing.selling_expenses = [];
  raw.claim.sales.push(second);
  const short = calculateLandDispositions2026(raw);
  assertEquals(short.rows[1].part, "II");
  assertEquals(short.short_term_ordinary_gain_loss, 200);
  assertEquals(short.line20b_schedule1_gain_loss, 5200);
  second.closing.settled_on = "2026-06-03";
  const long = calculateLandDispositions2026(raw);
  assertEquals(long.rows[1].part, "I");
  assertEquals(long.line8_net_section1231, 45200);
  assertEquals(long.line20b_schedule1_gain_loss, 5000);
  second.closing.gross_sales_price = 7000;
  assertEquals(calculateLandDispositions2026(raw).line10_long_term_gain, 37000);
});
Deno.test("2026 net land loss waits for its limitation owner before retaining a new loss vintage", () => {
  const raw = landDispositionFixture2026();
  raw.claim.sales[0].closing.gross_sales_price = 52000;
  assertThrows(
    () => calculateLandDispositions2026(raw),
    Error,
    "amount taken into account",
  );
  const r = calculateLandDispositions2026(raw, {
    amount_taken_into_account: 1000,
    finalized_limitation_workpaper_reference: "limits-final",
  });
  assertEquals(r.line12_section1231_loss, -3000);
  assertEquals(r.line20b_schedule1_gain_loss, -3000);
  assertEquals(r.opening_2027_losses, [{
    loss_year: 2026,
    remaining_loss: 1000,
  }]);
  assertThrows(
    () =>
      calculateLandDispositions2026(raw, {
        amount_taken_into_account: 3001,
        finalized_limitation_workpaper_reference: "limits-final",
      }),
    Error,
    "must reconcile",
  );
  raw.claim.prior_history.current_year_loss_taken_into_account = 1000;
  assertThrows(
    () => calculateLandDispositions2026(raw),
    Error,
    "finalized limitation owner",
  );
});
Deno.test("2026 land source rejects duplicate, foreign-owner, stale, negative-basis and unsupported records", () => {
  for (
    const mutate of [
      (r: ReturnType<typeof landDispositionFixture2026>) => {
        r.claim.sales.push(r.claim.sales[0]);
      },
      (r: ReturnType<typeof landDispositionFixture2026>) => {
        r.claim.sales[0].owner_tin = "987654321";
      },
      (r: ReturnType<typeof landDispositionFixture2026>) => {
        r.claim.sales[0].closing.settled_on = "2025-12-31";
      },
      (r: ReturnType<typeof landDispositionFixture2026>) => {
        r.claim.sales[0].closing.selling_expenses[0].date = "2027-01-01";
      },
      (r: ReturnType<typeof landDispositionFixture2026>) => {
        r.claim.sales[0].basis_adjustments.push({
          record_reference: "bad",
          date: "2020-01-01",
          description: "Overdrawn basis",
          direction: "decrease",
          amount: 50001,
        });
      },
      (r: ReturnType<typeof landDispositionFixture2026>) => {
        r.claim.sales[0].closing.selling_expenses.push(
          r.claim.sales[0].closing.selling_expenses[0],
        );
      },
    ]
  ) {
    const r = landDispositionFixture2026();
    mutate(r);
    assertThrows(() => calculateLandDispositions2026(r));
  }
  const r = landDispositionFixture2026();
  assertEquals(
    landDispositionSource2026Schema.safeParse({
      ...r,
      claim: { ...r.claim, calculated_gain: 999 },
    }).success,
    false,
  );
  assertEquals(
    landDispositionSource2026Schema.safeParse({
      ...r,
      claim: {
        ...r.claim,
        sales: [{ ...r.claim.sales[0], depreciation: 500 }],
      },
    }).success,
    false,
  );
  // No incomplete source calculator can leak into public filing intake.
  assertEquals(
    sourceRegistry2026.start.inputSchema.safeParse({
      ...childCreditGraphFixture2026(),
      land_dispositions: r.claim,
    }).success,
    false,
  );
});

Deno.test("2026 land source reconciles issued 1099-S proceeds and rejects stale corrected copies", () => {
  const raw = landDispositionFixture2026(), sale = raw.claim.sales[0];
  sale.information_return = {
    kind: "1099-S",
    tax_year: 2026,
    source_document_reference: "1099s-1",
    filer_tin: "120000001",
    transferor_tin: sale.owner_tin,
    box1_date_closing: sale.closing.settled_on,
    box2_gross_proceeds: sale.closing.gross_sales_price,
    corrected: true,
    superseded_document_references: ["old-1099s-1"],
    no_non_cash_consideration_foreign_transferor_or_special_adjustments: true,
  };
  assertEquals(
    calculateLandDispositions2026(raw).line1a_information_return_proceeds,
    100000,
  );
  assertEquals(
    calculateLandDispositions2026(landDispositionFixture2026())
      .line1a_information_return_proceeds,
    0,
  );
  const copy = sale.information_return;
  for (
    const changed of [
      { box2_gross_proceeds: 99999 },
      { box1_date_closing: "2026-06-03" },
      { transferor_tin: "987654321" },
      { corrected: false },
      { superseded_document_references: ["old", "old"] },
    ]
  ) {
    sale.information_return = { ...copy, ...changed };
    assertThrows(
      () => calculateLandDispositions2026(raw),
      Error,
      "1099-S must reconcile",
    );
  }
  sale.information_return = {
    ...copy,
    superseded_document_references: [copy.source_document_reference],
  };
  assertThrows(() => calculateLandDispositions2026(raw), Error, "superseded");
});

Deno.test("2026 section 1231 preserves joint histories and forbids unsupported year and gain overrides", () => {
  const raw = landDispositionFixture2026();
  raw.filing_status = FilingStatus.MFJ;
  raw.spouse_ssn = "987654321";
  raw.claim.sales[0].owner_tin = raw.spouse_ssn;
  raw.claim.prior_history.owner.spouse_ssn = raw.spouse_ssn;
  for (const year of raw.claim.prior_history.filed_years) {
    year.owner.spouse_ssn = raw.spouse_ssn;
  }
  assertEquals(calculateLandDispositions2026(raw).line10_long_term_gain, 40000);
  assertThrows(
    () =>
      calculateLandDispositions2026(raw, {
        amount_taken_into_account: 1,
        finalized_limitation_workpaper_reference: "bad",
      }),
    Error,
    "nonloss year",
  );
  raw.claim.prior_history.filed_years[0].owner.spouse_ssn = undefined;
  assertThrows(
    () => calculateLandDispositions2026(raw),
    Error,
    "consistent owners",
  );
});
