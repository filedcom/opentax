import { assertEquals, assertThrows } from "@std/assert";
import { buildForm8582Ledger, readForm8582Ledger } from "./ledger.ts";
import { reconcileForm8582NextYearOpening } from "./next_year_import.ts";
import { FilingStatus } from "../../../../../types.ts";

const retainedSaleSource = {
  activities: [{
    activity_id: "retained-rental",
    name: "Retained rental",
    activity_type: "B",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: -2_000,
    prior_unallowed_operating: 3_000,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "retained-rental",
      filed_part_vii_column_c: 3_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
  }],
  current_loss: 2_000,
  prior_unallowed: 3_000,
  has_other_passive: true,
  has_current_4797_transaction: true,
  current_4797_sale_gains: [{
    activity_id: "retained-rental",
    activity_name: "Retained rental",
    part: "II",
    gain: 4_000,
    entire_activity_interest_disposed: false,
  }],
};

Deno.test("Form 8582 entire-sale overall-gain ledger retains fully released prior operating balances", () => {
  for (const active of [false, true]) {
    const source = {
      ...retainedSaleSource,
      activities: [{
        ...retainedSaleSource.activities[0],
        activity_type: active ? "A" : "B",
        ...(active ? { prior_active_participation: true } : {}),
      }],
      has_other_passive: !active,
      ...(active
        ? {
          has_active_rental: true,
          active_participation: true,
          rental_current_loss: 2_000,
          rental_prior_eligible_loss: 3_000,
        }
        : {}),
      current_4797_sale_gains: [{
        ...retainedSaleSource.current_4797_sale_gains[0],
        gain: 6_000,
        entire_activity_interest_disposed: true,
      }],
    };
    const accepted = "Accepted entire-sale return";
    const ledger = buildForm8582Ledger(source, accepted);
    assertEquals(ledger.ending_unallowed_loss, 0);
    assertEquals(ledger.activities[0].lines, [{
      reporting_form: "schedule_e",
      opening_unallowed_loss: 3_000,
      current_year_loss: 2_000,
      current_same_part_income: 0,
      allowed_loss: 5_000,
      ending_unallowed_loss: 0,
    }]);
    assertEquals(
      ledger.activities[0].previous_filed_form_8582_reference,
      "2024 filed Form 8582 Part VII",
    );
    assertEquals(
      readForm8582Ledger(JSON.parse(JSON.stringify(ledger)), source, accepted),
      ledger,
    );
    for (const gain of [4_000, 5_000]) {
      assertThrows(
        () =>
          buildForm8582Ledger({
            ...source,
            current_4797_sale_gains: [{
              ...source.current_4797_sale_gains[0],
              gain,
            }],
          }, accepted),
        Error,
        "disposition review",
      );
    }
    assertThrows(
      () =>
        buildForm8582Ledger({
          ...source,
          current_4797_sale_gains: [{
            ...source.current_4797_sale_gains[0],
            part: "I",
          }],
        }, accepted),
      Error,
      "disposition review",
    );
    if (active) {
      assertThrows(
        () =>
          buildForm8582Ledger({
            ...source,
            activities: [{
              ...source.activities[0],
              prior_active_participation: false,
            }],
          }, accepted),
        Error,
        "disposition review",
      );
    }
  }
});

Deno.test("Form 8582 retained-sale ledger keeps operating loss separate from either sale character", () => {
  for (const part of ["I", "II"] as const) {
    const source = {
      ...retainedSaleSource,
      current_4797_sale_gains: [{
        ...retainedSaleSource.current_4797_sale_gains[0],
        part,
      }],
    };
    const ledger = buildForm8582Ledger(source, "Accepted retained-sale return");
    assertEquals(ledger.ending_unallowed_loss, 1_000);
    assertEquals(ledger.activities[0].lines, [{
      reporting_form: "schedule_e",
      opening_unallowed_loss: 3_000,
      current_year_loss: 2_000,
      current_same_part_income: 0,
      allowed_loss: 4_000,
      ending_unallowed_loss: 1_000,
    }]);
    assertEquals(
      readForm8582Ledger(ledger, source, "Accepted retained-sale return"),
      ledger,
    );
    assertEquals(
      reconcileForm8582NextYearOpening(
        {
          tax_year: 2026,
          prior_accepted_return_reference: "Accepted retained-sale return",
          rows: [{
            activity_id: "retained-rental",
            reporting_part: "viii",
            reporting_form: "schedule_e",
            prior_unallowed_loss: 1_000,
          }],
        },
        ledger,
        source,
        "Accepted retained-sale return",
      ).rows[0]
        .prior_unallowed_loss,
      1_000,
    );
    assertThrows(
      () =>
        readForm8582Ledger(ledger, {
          ...source,
          current_4797_sale_gains: [{
            ...source.current_4797_sale_gains[0],
            gain: 4_001,
          }],
        }, "Accepted retained-sale return"),
      Error,
      "stored ledger does not match",
    );
  }
});

Deno.test("Form 8582 retained active-rental ledger includes sale income before special allowance", () => {
  const source = {
    ...retainedSaleSource,
    activities: [{
      ...retainedSaleSource.activities[0],
      activity_type: "A",
      current_net: -5_000,
      prior_unallowed_operating: 8_000,
      prior_active_participation: true,
      prior_year_8582_source: {
        ...retainedSaleSource.activities[0].prior_year_8582_source,
        filed_part_vii_column_c: 8_000,
      },
    }],
    current_loss: 5_000,
    rental_current_loss: 5_000,
    prior_unallowed: 8_000,
    rental_prior_eligible_loss: 8_000,
    has_other_passive: false,
    has_active_rental: true,
    active_participation: true,
    filing_status: FilingStatus.Single,
    modified_agi: 140_000,
    current_4797_sale_gains: [{
      ...retainedSaleSource.current_4797_sale_gains[0],
      gain: 3_000,
    }],
  };
  const ledger = buildForm8582Ledger(source, "Accepted active retained sale");
  assertEquals(ledger.activities[0].lines[0], {
    reporting_form: "schedule_e",
    opening_unallowed_loss: 8_000,
    current_year_loss: 5_000,
    current_same_part_income: 0,
    allowed_loss: 8_000,
    ending_unallowed_loss: 5_000,
  });
  const phasedOut = buildForm8582Ledger({
    ...source,
    modified_agi: 200_000,
  }, "Accepted active retained sale");
  assertEquals(phasedOut.activities[0].lines[0].allowed_loss, 3_000);
  assertEquals(phasedOut.ending_unallowed_loss, 10_000);
  for (
    const changed of [
      { active_participation: false },
      { modified_agi: undefined },
      {
        activities: [{
          ...source.activities[0],
          prior_active_participation: false,
        }],
      },
    ]
  ) {
    assertThrows(() =>
      buildForm8582Ledger(
        { ...source, ...changed },
        "Accepted active retained sale",
      )
    );
  }
});

Deno.test("Form 8582 retained-sale ledger rejects unreviewed disposition and source changes", () => {
  const sale = retainedSaleSource.current_4797_sale_gains[0];
  for (
    const changed of [
      {
        current_4797_sale_gains: [{
          ...sale,
          entire_activity_interest_disposed: undefined,
        }],
      },
      {
        current_4797_sale_gains: [{
          ...sale,
          entire_activity_interest_disposed: true,
        }],
      },
      { current_4797_sale_gains: [{ ...sale, activity_id: "another-rental" }] },
      {
        current_4797_sale_gains: [{ ...sale, activity_name: "Another rental" }],
      },
      { current_4797_sale_gains: [sale, sale] },
      {
        activities: [{
          ...retainedSaleSource.activities[0],
          prior_year_8582_source: undefined,
        }],
      },
      {
        activities: [{
          ...retainedSaleSource.activities[0],
          prior_unallowed_4797_part1: 1,
        }],
      },
    ]
  ) {
    assertThrows(() =>
      buildForm8582Ledger(
        { ...retainedSaleSource, ...changed },
        "Accepted retained sale",
      )
    );
  }
});

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

Deno.test("Form 8582 2026 opening matches the 2025 accepted-reference ledger by activity and form", () => {
  const accepted = "Accepted 2025 active-rental return";
  const ledger = buildForm8582Ledger(activeRentalSource, accepted);
  const opening = {
    tax_year: 2026,
    prior_accepted_return_reference: accepted,
    rows: [{
      activity_id: "active-rental-2025",
      reporting_part: "viii",
      reporting_form: "schedule_e",
      prior_unallowed_loss: 25_000,
    }],
  };
  assertEquals(
    reconcileForm8582NextYearOpening(
      opening,
      ledger,
      activeRentalSource,
      accepted,
    ),
    opening,
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        {
          ...opening,
          rows: [{ ...opening.rows[0], activity_id: "another-rental" }],
        },
        ledger,
        activeRentalSource,
        accepted,
      ),
    Error,
    "activity, character, and loss ledger",
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        {
          ...opening,
          rows: [{ ...opening.rows[0], reporting_form: "form4835" }],
        },
        ledger,
        activeRentalSource,
        accepted,
      ),
    Error,
    "activity, character, and loss ledger",
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        {
          ...opening,
          prior_accepted_return_reference: "different return",
        },
        ledger,
        activeRentalSource,
        accepted,
      ),
    Error,
    "activity, character, and loss ledger",
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        {
          ...opening,
          rows: [{ ...opening.rows[0], prior_unallowed_loss: 24_999 }],
        },
        ledger,
        activeRentalSource,
        accepted,
      ),
    Error,
    "activity, character, and loss ledger",
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        {
          ...opening,
          rows: [opening.rows[0], opening.rows[0]],
        },
        ledger,
        activeRentalSource,
        accepted,
      ),
    Error,
    "activity, character, and loss ledger",
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(opening, ledger, {
        ...activeRentalSource,
        modified_agi: 121_000,
      }, accepted),
    Error,
    "stored ledger does not match",
  );
});

Deno.test("Form 8582 ledger retains filed active-rental opening loss and 2025 suspension", () => {
  const prior = {
    tax_year: 2024 as const,
    activity_id: "active-rental-2025",
    filed_part_vii_column_c: 8_000,
    source_document_reference: "Filed 2024 Form 8582 rental row",
  };
  const source = {
    ...activeRentalSource,
    activities: [{
      ...activeRentalSource.activities[0],
      current_net: -20_000,
      prior_unallowed_operating: 8_000,
      prior_active_participation: true,
      prior_year_8582_source: prior,
    }],
    current_loss: 20_000,
    rental_current_loss: 20_000,
    prior_unallowed: 8_000,
    rental_prior_eligible_loss: 8_000,
  };
  const filingId = "Accepted 2025 active prior rental";
  const ledger = buildForm8582Ledger(source, filingId);
  assertEquals(ledger.ending_unallowed_loss, 13_000);
  assertEquals(
    ledger.activities[0].previous_filed_form_8582_reference,
    prior.source_document_reference,
  );
  assertEquals(ledger.activities[0].lines, [{
    reporting_form: "schedule_e",
    opening_unallowed_loss: 8_000,
    current_year_loss: 20_000,
    current_same_part_income: 0,
    allowed_loss: 15_000,
    ending_unallowed_loss: 13_000,
  }]);
  assertEquals(readForm8582Ledger(ledger, source, filingId), ledger);
  assertThrows(
    () =>
      buildForm8582Ledger({
        ...source,
        activities: [{
          ...source.activities[0],
          prior_active_participation: false,
        }],
        rental_prior_eligible_loss: 0,
        has_other_passive: true,
      }, filingId),
    Error,
    "operating ledger needs",
  );
  assertThrows(
    () =>
      readForm8582Ledger(ledger, {
        ...source,
        activities: [{
          ...source.activities[0],
          prior_year_8582_source: { ...prior, filed_part_vii_column_c: 7_999 },
        }],
      }, filingId),
    Error,
  );
});

Deno.test("Form 8582 ledger allocates two filed active-rental PALs by activity", () => {
  const first = {
    ...activeRentalSource.activities[0],
    current_net: -20_000,
    prior_unallowed_operating: 8_000,
    prior_active_participation: true,
    prior_year_8582_source: {
      tax_year: 2024 as const,
      activity_id: "active-rental-2025",
      filed_part_vii_column_c: 8_000,
      source_document_reference: "Filed 2024 Form 8582",
    },
  };
  const second = {
    ...first,
    activity_id: "active-rental-2",
    name: "Second active rental",
    current_net: -10_000,
    prior_unallowed_operating: 2_000,
    prior_year_8582_source: {
      ...first.prior_year_8582_source,
      activity_id: "active-rental-2",
      filed_part_vii_column_c: 2_000,
    },
  };
  const source = {
    ...activeRentalSource,
    activities: [first, second],
    current_loss: 30_000,
    rental_current_loss: 30_000,
    prior_unallowed: 10_000,
    rental_prior_eligible_loss: 10_000,
  };
  const ledger = buildForm8582Ledger(source, "Accepted 2025 two-rental return");
  assertEquals(ledger.ending_unallowed_loss, 25_000);
  assertEquals(
    ledger.activities.map((activity) => activity.lines[0].allowed_loss),
    [
      10_500,
      4_500,
    ],
  );
  assertEquals(
    ledger.activities.map((activity) => activity.ending_unallowed_loss),
    [
      17_500,
      7_500,
    ],
  );
  assertEquals(
    readForm8582Ledger(ledger, source, "Accepted 2025 two-rental return"),
    ledger,
  );
  const reversedOpening = {
    tax_year: 2026,
    prior_accepted_return_reference: "Accepted 2025 two-rental return",
    rows: [{
      activity_id: "active-rental-2",
      reporting_part: "viii",
      reporting_form: "schedule_e",
      prior_unallowed_loss: 7_500,
    }, {
      activity_id: "active-rental-2025",
      reporting_part: "viii",
      reporting_form: "schedule_e",
      prior_unallowed_loss: 17_500,
    }],
  };
  assertEquals(
    reconcileForm8582NextYearOpening(
      reversedOpening,
      ledger,
      source,
      "Accepted 2025 two-rental return",
    ),
    reversedOpening,
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        {
          ...reversedOpening,
          rows: reversedOpening.rows.slice(0, 1),
        },
        ledger,
        source,
        "Accepted 2025 two-rental return",
      ),
    Error,
    "activity, character, and loss ledger",
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
  const mfsLivedApartSource = {
    months: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      taxpayer_residence: "1 Taxpayer Street",
      spouse_residence: "2 Spouse Avenue",
      taxpayer_residence_record_reference: `Taxpayer month ${index + 1}`,
      spouse_residence_record_reference: `Spouse month ${index + 1}`,
      no_shared_residence_any_day: true as const,
    })),
  };
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
      mfs_lived_apart_source: mfsLivedApartSource,
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
