import { assertEquals, assertThrows } from "@std/assert";
import { reconcileFiled2024Form8582Record } from "./prior_year_import.ts";

const filed = {
  tax_year: 2024,
  accepted_return_reference: "reviewed 2024 acceptance ID",
  source_document_reference: "filed 2024 Form 8582 page 3",
  activities: [{
    activity_id: "property-1",
    filed_part_vii_column_c: 6_000,
    reporting_part: "ix",
    rows: [
      { reporting_form: "schedule_e", filed_unallowed_loss: 2_000 },
      { reporting_form: "form4797_part1", filed_unallowed_loss: 4_000 },
    ],
  }],
};

const input = {
  activities: [{
    activity_id: "property-1",
    name: "Property 1",
    activity_type: "B",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: 0,
    prior_unallowed_operating: 2_000,
    prior_unallowed_4797_part1: 4_000,
    prior_unallowed_4797_part2: 0,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "property-1",
      filed_part_vii_column_c: 6_000,
      source_document_reference: "filed 2024 Form 8582 page 3",
      filed_part_ix_rows: [
        { reporting_form: "schedule_e", filed_unallowed_loss: 2_000 },
        { reporting_form: "form4797_part1", filed_unallowed_loss: 4_000 },
      ],
    },
  }],
  prior_unallowed: 6_000,
  has_other_passive: true,
};

Deno.test("Form 8582 2024 Part IX import reconciles ID, filed total, and character", () => {
  assertEquals(reconcileFiled2024Form8582Record(filed, input), filed);
});

Deno.test("Form 8582 2024 import rejects changed ID, source, total, and character", () => {
  for (
    const altered of [
      {
        ...filed,
        activities: [{ ...filed.activities[0], activity_id: "other" }],
      },
      { ...filed, source_document_reference: "different filed page" },
      {
        ...filed,
        activities: [{
          ...filed.activities[0],
          filed_part_vii_column_c: 5_000,
        }],
      },
      {
        ...filed,
        activities: [{
          ...filed.activities[0],
          rows: [
            { reporting_form: "schedule_e", filed_unallowed_loss: 4_000 },
            { reporting_form: "form4797_part1", filed_unallowed_loss: 2_000 },
          ],
        }],
      },
    ]
  ) {
    assertThrows(() => reconcileFiled2024Form8582Record(altered, input));
  }
});

Deno.test("Form 8582 2024 import rejects duplicate, omitted, or extra activities", () => {
  assertThrows(() =>
    reconcileFiled2024Form8582Record({
      ...filed,
      activities: [filed.activities[0], filed.activities[0]],
    }, input)
  );
  assertThrows(() =>
    reconcileFiled2024Form8582Record({
      ...filed,
      activities: [{ ...filed.activities[0], activity_id: "unmatched" }],
    }, input)
  );
  assertThrows(() =>
    reconcileFiled2024Form8582Record(filed, {
      ...input,
      activities: [...input.activities, {
        ...input.activities[0],
        activity_id: "second",
        prior_year_8582_source: {
          ...input.activities[0].prior_year_8582_source,
          activity_id: "second",
        },
      }],
    })
  );
});

Deno.test("Form 8582 2024 Part VIII operating character must match the 2025 form", () => {
  const operatingInput = {
    ...input,
    activities: [{
      ...input.activities[0],
      prior_unallowed_operating: 6_000,
      prior_unallowed_4797_part1: 0,
      prior_year_8582_source: {
        tax_year: 2024,
        activity_id: "property-1",
        filed_part_vii_column_c: 6_000,
        source_document_reference: "filed 2024 Form 8582 page 3",
      },
    }],
  };
  const operatingFiled = {
    ...filed,
    activities: [{
      ...filed.activities[0],
      reporting_part: "viii",
      rows: [{ reporting_form: "schedule_e", filed_unallowed_loss: 6_000 }],
    }],
  };
  assertEquals(
    reconcileFiled2024Form8582Record(operatingFiled, operatingInput),
    operatingFiled,
  );
  assertThrows(() =>
    reconcileFiled2024Form8582Record({
      ...operatingFiled,
      activities: [{
        ...operatingFiled.activities[0],
        rows: [{ reporting_form: "form4835", filed_unallowed_loss: 6_000 }],
      }],
    }, operatingInput)
  );
});

Deno.test("Form 8582 2024 Part VIII Form 4797 character is retained exactly", () => {
  const partVIIIInput = {
    ...input,
    activities: [{
      ...input.activities[0],
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 6_000,
      prior_year_8582_source: {
        tax_year: 2024,
        activity_id: "property-1",
        filed_part_vii_column_c: 6_000,
        source_document_reference: "filed 2024 Form 8582 page 3",
        filed_part_viii_row: {
          reporting_form: "form4797_part1",
          filed_unallowed_loss: 6_000,
        },
      },
    }],
  };
  const partVIIIRecord = {
    ...filed,
    activities: [{
      ...filed.activities[0],
      reporting_part: "viii",
      rows: [{ reporting_form: "form4797_part1", filed_unallowed_loss: 6_000 }],
    }],
  };
  assertEquals(
    reconcileFiled2024Form8582Record(partVIIIRecord, partVIIIInput),
    partVIIIRecord,
  );
  assertThrows(() =>
    reconcileFiled2024Form8582Record({
      ...partVIIIRecord,
      activities: [{
        ...partVIIIRecord.activities[0],
        rows: [{
          reporting_form: "form4797_part2",
          filed_unallowed_loss: 6_000,
        }],
      }],
    }, partVIIIInput)
  );
  assertThrows(() =>
    reconcileFiled2024Form8582Record(partVIIIRecord, {
      ...partVIIIInput,
      activities: [{
        ...partVIIIInput.activities[0],
        prior_year_8582_source: undefined,
      }],
    })
  );
});
