import { assertEquals, assertThrows } from "@std/assert";
import { buildForm8582Ledger, readForm8582Ledger } from "./ledger.ts";
import { FilingStatus } from "../../../types.ts";

const source = {
  activities: [
    {
      activity_id: "rental-part-viii",
      name: "Rental Part VIII",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: 0,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 6_000,
      prior_unallowed_4797_part2: 0,
      prior_year_8582_source: {
        tax_year: 2024,
        activity_id: "rental-part-viii",
        filed_part_vii_column_c: 6_000,
        source_document_reference: "2024 filed Form 8582",
        filed_part_viii_row: {
          reporting_form: "form4797_part1",
          filed_unallowed_loss: 6_000,
        },
      },
    },
    {
      activity_id: "rental-income",
      name: "Rental Income",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: 4_000,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    },
  ],
  current_income: 4_000,
  prior_unallowed: 6_000,
  has_other_passive: true,
};

Deno.test("Form 8582 filed ledger preserves Part VIII character and balances", () => {
  const ledger = buildForm8582Ledger(source, "Accepted 2025 return ID");
  assertEquals(ledger.tax_year, 2025);
  assertEquals(ledger.ending_unallowed_loss, 2_000);
  assertEquals(ledger.activities[0].reporting_part, "viii");
  assertEquals(ledger.activities[0].lines, [{
    reporting_form: "form4797_part1",
    opening_unallowed_loss: 6_000,
    current_year_loss: 0,
    current_same_part_income: 0,
    allowed_loss: 4_000,
    ending_unallowed_loss: 2_000,
  }]);
  assertEquals(
    readForm8582Ledger(
      JSON.parse(JSON.stringify(ledger)),
      source,
      "Accepted 2025 return ID",
    ),
    ledger,
  );
});

const activeRentalSource = {
  activities: [{
    activity_id: "active-rental-2025",
    name: "Active rental",
    activity_type: "A",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: -40_000,
    prior_unallowed_operating: 0,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
  }],
  current_income: 0,
  current_loss: 40_000,
  rental_current_income: 0,
  rental_current_loss: 40_000,
  prior_unallowed: 0,
  has_active_rental: true,
  has_other_passive: false,
  active_participation: true,
  filing_status: FilingStatus.Single,
  modified_agi: 120_000,
};

Deno.test("Form 8582 ledger records sourced single active rental special allowance", () => {
  const ledger = buildForm8582Ledger(
    activeRentalSource,
    "Accepted 2025 active-rental return",
  );
  assertEquals(ledger.ending_unallowed_loss, 25_000);
  assertEquals(ledger.activities[0].reporting_part, "viii");
  assertEquals(ledger.activities[0].lines, [{
    reporting_form: "schedule_e",
    opening_unallowed_loss: 0,
    current_year_loss: 40_000,
    current_same_part_income: 0,
    allowed_loss: 15_000,
    ending_unallowed_loss: 25_000,
  }]);
  assertEquals(
    readForm8582Ledger(
      JSON.parse(JSON.stringify(ledger)),
      activeRentalSource,
      "Accepted 2025 active-rental return",
    ),
    ledger,
  );
});

Deno.test("Form 8582 ledger apportions one special allowance across two active rentals", () => {
  const multiRentalSource = {
    ...activeRentalSource,
    activities: [{
      ...activeRentalSource.activities[0],
      activity_id: "active-rental-a",
      name: "Active rental A",
      current_net: -10_000,
    }, {
      ...activeRentalSource.activities[0],
      activity_id: "active-rental-b",
      name: "Active rental B",
      current_net: -30_000,
    }],
  };
  const filingId = "Accepted 2025 two-rental return";
  const ledger = buildForm8582Ledger(multiRentalSource, filingId);
  assertEquals(
    ledger.activities.map((activity) => ({
      activity_id: activity.activity_id,
      allowed: activity.lines[0].allowed_loss,
      suspended: activity.lines[0].ending_unallowed_loss,
    })),
    [{
      activity_id: "active-rental-a",
      allowed: 3_750,
      suspended: 6_250,
    }, {
      activity_id: "active-rental-b",
      allowed: 11_250,
      suspended: 18_750,
    }],
  );
  assertEquals(ledger.ending_unallowed_loss, 25_000);
  assertEquals(readForm8582Ledger(ledger, multiRentalSource, filingId), ledger);
  assertThrows(
    () =>
      readForm8582Ledger(ledger, {
        ...multiRentalSource,
        activities: [
          multiRentalSource.activities[1],
          multiRentalSource.activities[0],
        ],
      }, filingId),
    Error,
    "does not match the original 2025 activity source",
  );
});

Deno.test("Form 8582 multi-rental ledger requires every property to be eligible", () => {
  const secondRental = {
    ...activeRentalSource.activities[0],
    activity_id: "active-rental-b",
    name: "Active rental B",
    current_net: -10_000,
  };
  const multiRentalSource = {
    ...activeRentalSource,
    activities: [{
      ...activeRentalSource.activities[0],
      current_net: -30_000,
    }, secondRental],
  };
  for (
    const changed of [{
      ...multiRentalSource,
      activities: [multiRentalSource.activities[0], {
        ...secondRental,
        property_type: 6,
      }],
    }, {
      ...multiRentalSource,
      activities: [multiRentalSource.activities[0], {
        ...secondRental,
        prior_unallowed_operating: 1,
      }],
      prior_unallowed: 1,
    }, {
      ...multiRentalSource,
      modified_agi: undefined,
    }, {
      ...multiRentalSource,
      activities: [multiRentalSource.activities[0], {
        ...secondRental,
        activity_id: multiRentalSource.activities[0].activity_id,
      }],
    }]
  ) {
    assertThrows(() =>
      buildForm8582Ledger(
        changed,
        "Accepted 2025 two-rental return",
      )
    );
  }
});

Deno.test("Form 8582 MFS lived-apart rental ledger uses the $12,500 allowance and $50k-$75k phaseout", () => {
  for (
    const [magi, allowed] of [
      [50_000, 12_500],
      [60_000, 7_500],
      [75_000, 0],
    ]
  ) {
    const mfsSource = {
      ...activeRentalSource,
      filing_status: FilingStatus.MFS,
      mfs_lived_apart_all_year: true,
      modified_agi: magi,
    };
    const ledger = buildForm8582Ledger(
      mfsSource,
      "Accepted 2025 MFS lived-apart return",
    );
    assertEquals(ledger.activities[0].lines[0].allowed_loss, allowed);
    assertEquals(
      ledger.activities[0].lines[0].ending_unallowed_loss,
      40_000 - allowed,
    );
    assertEquals(ledger.ending_unallowed_loss, 40_000 - allowed);
    assertEquals(
      readForm8582Ledger(
        JSON.parse(JSON.stringify(ledger)),
        mfsSource,
        "Accepted 2025 MFS lived-apart return",
      ),
      ledger,
    );
  }
});

Deno.test("Form 8582 active-rental ledger rejects missing allowance evidence", () => {
  for (
    const changed of [
      { ...activeRentalSource, active_participation: false },
      { ...activeRentalSource, modified_agi: undefined },
      { ...activeRentalSource, filing_status: FilingStatus.MFS },
      {
        ...activeRentalSource,
        filing_status: FilingStatus.MFS,
        mfs_lived_apart_all_year: false,
      },
      { ...activeRentalSource, has_current_4797_transaction: true },
      {
        ...activeRentalSource,
        activities: [{
          ...activeRentalSource.activities[0],
          property_type: 6,
        }],
      },
      {
        ...activeRentalSource,
        activities: [{
          ...activeRentalSource.activities[0],
          prior_unallowed_operating: 1,
        }],
        prior_unallowed: 1,
      },
    ]
  ) {
    assertThrows(() =>
      buildForm8582Ledger(
        changed,
        "Accepted 2025 active-rental return",
      )
    );
  }
});

Deno.test("Form 8582 ledger rejects altered stored balances and missing filing reference", () => {
  const ledger = buildForm8582Ledger(source, "Accepted 2025 return ID");
  assertThrows(
    () =>
      readForm8582Ledger(
        {
          ...ledger,
          activities: [{
            ...ledger.activities[0],
            lines: [{
              ...ledger.activities[0].lines[0],
              ending_unallowed_loss: 2_001,
            }],
          }],
        },
        source,
        "Accepted 2025 return ID",
      ),
    Error,
    "reconcile",
  );
  assertThrows(
    () => buildForm8582Ledger(source, "  "),
    Error,
  );
});

Deno.test("Form 8582 ledger rejects coherent edits, changed source and filing identity", () => {
  const ledger = buildForm8582Ledger(source, "Accepted 2025 return ID");
  const changedOpening = {
    ...ledger,
    activities: [{
      ...ledger.activities[0],
      lines: [{
        ...ledger.activities[0].lines[0],
        opening_unallowed_loss: 6_001,
        allowed_loss: 4_001,
      }],
    }],
  };
  assertThrows(
    () =>
      readForm8582Ledger(
        changedOpening,
        source,
        "Accepted 2025 return ID",
      ),
    Error,
    "does not match the original 2025 activity source",
  );
  assertThrows(
    () =>
      readForm8582Ledger(
        ledger,
        {
          ...source,
          activities: [{
            ...source.activities[0],
            prior_unallowed_4797_part1: 6_001,
            prior_year_8582_source: {
              ...source.activities[0].prior_year_8582_source,
              filed_part_vii_column_c: 6_001,
              filed_part_viii_row: {
                reporting_form: "form4797_part1",
                filed_unallowed_loss: 6_001,
              },
            },
          }, source.activities[1]],
          prior_unallowed: 6_001,
        },
        "Accepted 2025 return ID",
      ),
    Error,
    "does not match the original 2025 activity source",
  );
  assertThrows(
    () =>
      readForm8582Ledger(
        ledger,
        source,
        "Different accepted return ID",
      ),
    Error,
    "does not match the original 2025 activity source",
  );
});

const operatingSource = {
  activities: [
    {
      activity_id: "operating-rental",
      name: "Operating rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: -6_000,
      prior_unallowed_operating: 2_000,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      prior_year_8582_source: {
        tax_year: 2024,
        activity_id: "operating-rental",
        filed_part_vii_column_c: 2_000,
        source_document_reference: "2024 filed Form 8582, operating rental",
      },
    },
    {
      activity_id: "farm-rental",
      name: "Farm rental",
      activity_type: "B",
      property_type: 5,
      reporting_form: "form4835",
      current_net: -3_000,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    },
    {
      activity_id: "income-rental",
      name: "Income rental",
      activity_type: "B",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: 4_000,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    },
  ],
  current_income: 4_000,
  current_loss: 9_000,
  prior_unallowed: 2_000,
  has_other_passive: true,
};

Deno.test("Form 8582 filed ledger allocates operating PAL across Schedule E and Form 4835 activities", () => {
  const ledger = buildForm8582Ledger(
    operatingSource,
    "Accepted 2025 operating return",
  );
  assertEquals(ledger.ending_unallowed_loss, 7_000);
  assertEquals(ledger.activities.map((activity) => activity.activity_id), [
    "operating-rental",
    "farm-rental",
  ]);
  assertEquals(ledger.activities[0].reporting_part, "viii");
  assertEquals(ledger.activities[0].lines, [{
    reporting_form: "schedule_e",
    opening_unallowed_loss: 2_000,
    current_year_loss: 6_000,
    current_same_part_income: 0,
    allowed_loss: 2_909,
    ending_unallowed_loss: 5_091,
  }]);
  assertEquals(ledger.activities[1].lines, [{
    reporting_form: "form4835",
    opening_unallowed_loss: 0,
    current_year_loss: 3_000,
    current_same_part_income: 0,
    allowed_loss: 1_091,
    ending_unallowed_loss: 1_909,
  }]);
  assertEquals(
    readForm8582Ledger(
      JSON.parse(JSON.stringify(ledger)),
      operatingSource,
      "Accepted 2025 operating return",
    ),
    ledger,
  );
});

Deno.test("Form 8582 operating ledger rejects changed income source, duplicate activity and sale", () => {
  const ledger = buildForm8582Ledger(
    operatingSource,
    "Accepted 2025 operating return",
  );
  assertThrows(
    () =>
      readForm8582Ledger(ledger, {
        ...operatingSource,
        current_income: 5_000,
        activities: [
          ...operatingSource.activities.slice(0, 2),
          { ...operatingSource.activities[2], current_net: 5_000 },
        ],
      }, "Accepted 2025 operating return"),
    Error,
    "does not match the original 2025 activity source",
  );
  assertThrows(
    () =>
      buildForm8582Ledger({
        ...operatingSource,
        activities: [
          operatingSource.activities[0],
          { ...operatingSource.activities[1], activity_id: "operating-rental" },
          operatingSource.activities[2],
        ],
      }, "Accepted 2025 operating return"),
    Error,
    "distinct durable activity IDs",
  );
  assertThrows(
    () =>
      buildForm8582Ledger({
        ...operatingSource,
        has_current_4797_transaction: true,
      }, "Accepted 2025 operating return"),
    Error,
    "without a current sale",
  );
});
