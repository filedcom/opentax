import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateSection1231History,
  type Section1231PriorHistory,
} from "./prior_history.ts";
import { irsSection1231History } from "./prior_history.fixture.ts";

Deno.test("Form 4797 IRS line 8 example consumes 2020 before 2021", () => {
  const before = structuredClone(irsSection1231History);
  const result = calculateSection1231History(irsSection1231History, 2000);
  assertEquals(result.current.opening_nonrecaptured_loss, 7000);
  assertEquals(result.current.ordinary_recapture, 2000);
  assertEquals(result.current.long_term_gain, 0);
  assertEquals(result.current.ending_losses, [{
    loss_year: 2021,
    remaining_loss: 5000,
  }]);
  assertEquals(result.opening_2026_nonrecaptured_loss, 5000);
  assertEquals(irsSection1231History, before);
});

for (
  const [net, ordinary, capital, next, expiry] of [
    [10000, 7000, 3000, 0, 0],
    [7000, 7000, 0, 0, 0],
    [1000, 1000, 0, 6000, 0],
    [0, 0, 0, 6000, 1000],
    [-3000, -3000, 0, 9000, 1000],
  ]
) {
  Deno.test(`Form 4797 prior-loss character and 2026 expiry: net ${net}`, () => {
    const result = calculateSection1231History({
      ...irsSection1231History,
      ...(net < 0
        ? {
          current_year_loss_taken_into_account: -net,
          current_year_loss_source_reference:
            "synthetic current deduction review",
        }
        : {}),
    }, net);
    assertEquals(result.current.ordinary_gain_loss, ordinary);
    assertEquals(result.current.long_term_gain, capital);
    assertEquals(result.opening_2026_nonrecaptured_loss, next);
    assertEquals(result.expires_before_2026, expiry);
    assertEquals(result.current.line8, net > 0 ? 7000 : 0);
  });
}

Deno.test("Form 4797 pre-2020 losses consume old gains before newer losses and then expire", () => {
  const history = structuredClone(irsSection1231History);
  history.opening_2020_losses = [
    { loss_year: 2019, remaining_loss: 5000 },
    { loss_year: 2015, remaining_loss: 2000 },
  ];
  history.filed_years[0].filed_line7_net_gain_loss = 1000;
  history.filed_years[0].section1231_loss_taken_into_account = 0;
  history.filed_years[0].filed_line8_nonrecaptured_loss = 7000;
  history.filed_years[0].filed_line12_recaptured_gain = 1000;
  history.filed_years[4].filed_line8_nonrecaptured_loss = 11000;
  const result = calculateSection1231History(history, 2000);
  assertEquals(result.prior_years[1].expired_loss, 1000);
  assertEquals(result.prior_years[4].ending_losses, [
    { loss_year: 2019, remaining_loss: 2000 },
    { loss_year: 2021, remaining_loss: 6000 },
  ]);
  assertEquals(result.current.expired_loss, 2000);
  assertEquals(result.current.opening_nonrecaptured_loss, 6000);
  assertEquals(result.opening_2026_losses, [{
    loss_year: 2021,
    remaining_loss: 4000,
  }]);
});

Deno.test("Form 4797 loss history uses the prior loss actually taken into account", () => {
  const history = structuredClone(irsSection1231History);
  history.filed_years[0].section1231_loss_taken_into_account = 2000;
  history.filed_years[4].filed_line8_nonrecaptured_loss = 8000;
  const result = calculateSection1231History(history, 2000);
  assertEquals(result.current.opening_nonrecaptured_loss, 5000);
  assertEquals(result.opening_2026_losses, [{
    loss_year: 2021,
    remaining_loss: 3000,
  }]);
});

Deno.test("Form 4797 current loss vintage retains only the amount taken into account", () => {
  const result = calculateSection1231History({
    ...irsSection1231History,
    current_year_loss_taken_into_account: 1000,
    current_year_loss_source_reference: "synthetic current deduction review",
  }, -3000);
  assertEquals(result.current.ordinary_gain_loss, -3000);
  assertEquals(result.opening_2026_losses, [{
    loss_year: 2021,
    remaining_loss: 6000,
  }, { loss_year: 2025, remaining_loss: 1000 }]);
});

Deno.test("Form 4797 loss history requires a reviewed current deduction within the net loss", () => {
  assertThrows(
    () => calculateSection1231History(irsSection1231History, -3000),
    Error,
    "amount taken into account",
  );
  assertThrows(
    () =>
      calculateSection1231History({
        ...irsSection1231History,
        current_year_loss_taken_into_account: 3000,
      }, -3000),
    Error,
    "review reference",
  );
  assertThrows(
    () =>
      calculateSection1231History({
        ...irsSection1231History,
        current_year_loss_taken_into_account: 3001,
        current_year_loss_source_reference:
          "synthetic current deduction review",
      }, -3000),
    Error,
    "must reconcile",
  );
  assertThrows(
    () =>
      calculateSection1231History({
        ...irsSection1231History,
        current_year_loss_taken_into_account: 1,
      }, 2000),
    Error,
    "must reconcile",
  );
});

const invalid: Array<[string, (history: Section1231PriorHistory) => void]> = [
  ["missing year", (h) => {
    h.filed_years.pop();
  }],
  ["reordered year", (h) => {
    h.filed_years.reverse();
  }],
  ["duplicate year", (h) => {
    h.filed_years[0].tax_year = 2021;
  }],
  ["different owner", (h) => {
    h.filed_years[2].owner.taxpayer_ssn = "999887777";
  }],
  ["missing spouse in prior return", (h) => {
    h.owner.spouse_ssn = "987654321";
  }],
  ["reused source", (h) => {
    h.filed_years[1].source_document_reference =
      h.filed_years[0].source_document_reference;
  }],
  ["reused return", (h) => {
    h.filed_years[1].filed_return_reference =
      h.filed_years[0].filed_return_reference;
  }],
  ["wrong balance", (h) => {
    h.filed_years[4].filed_line8_nonrecaptured_loss = 9999;
  }],
  ["wrong recapture", (h) => {
    h.filed_years[4].filed_line12_recaptured_gain = 2999;
  }],
  ["recapture on loss", (h) => {
    h.filed_years[0].filed_line12_recaptured_gain = 1;
  }],
  ["duplicate opening vintage", (h) => {
    h.opening_2020_losses = [{ loss_year: 2019, remaining_loss: 1 }, {
      loss_year: 2019,
      remaining_loss: 2,
    }];
  }],
  ["future opening vintage", (h) => {
    h.opening_2020_losses = [{ loss_year: 2020, remaining_loss: 1 }];
  }],
  ["fractional loss", (h) => {
    h.filed_years[0].filed_line7_net_gain_loss = -4000.5;
  }],
  ["unsafe sum", (h) => {
    h.opening_2020_losses = [{
      loss_year: 2018,
      remaining_loss: Number.MAX_SAFE_INTEGER,
    }, { loss_year: 2019, remaining_loss: 1 }];
  }],
];
for (const [name, change] of invalid) {
  Deno.test(`Form 4797 prior-loss history rejects ${name}`, () => {
    const history = structuredClone(irsSection1231History);
    change(history);
    assertThrows(() => calculateSection1231History(history, 2000));
  });
}
