import { assertEquals, assertThrows } from "@std/assert";
import { DesignationCategory, otsaDeadline, OtsaTiming } from "./handoff.ts";

const timing = {
  kind: OtsaTiming.InitialReturn,
  return_due_date: "2026-04-15",
  event_source_reference: "Reviewed return deadline record",
};
Deno.test("OTSA late K-1 relief has a strict ten-day boundary and retains the extended return deadline", () => {
  assertEquals(
    otsaDeadline({
      ...timing,
      kind: OtsaTiming.LateK1,
      event_date: "2026-04-06",
      timely_k1_review_reference: "Timely issued K-1 receipt",
    }),
    "2026-06-14",
  );
  assertThrows(() =>
    otsaDeadline({
      ...timing,
      kind: OtsaTiming.LateK1,
      event_date: "2026-04-05",
      timely_k1_review_reference: "Timely K-1 receipt",
    })
  );
  assertThrows(() =>
    otsaDeadline({
      ...timing,
      kind: OtsaTiming.LateK1,
      event_date: "2026-04-16",
      timely_k1_review_reference: "K-1 receipt",
    })
  );
});
Deno.test("OTSA designation timing distinguishes legacy listed transactions from the ninety-day rule", () => {
  const designation = {
    ...timing,
    kind: OtsaTiming.LaterDesignation,
    event_date: "2026-10-08",
    designation_category: DesignationCategory.Listed,
  };
  assertEquals(
    otsaDeadline({ ...designation, transaction_entered_on: "2007-08-03" }),
    "2027-01-06",
  );
  assertEquals(
    otsaDeadline({
      ...designation,
      transaction_entered_on: "2007-08-02",
      first_return_due_after_designation: "2027-04-15",
    }),
    "2027-04-15",
  );
  assertThrows(() =>
    otsaDeadline({ ...designation, transaction_entered_on: "2007-08-02" })
  );
  assertThrows(() =>
    otsaDeadline({
      ...designation,
      designation_category: DesignationCategory.Interest,
      transaction_entered_on: "2006-11-01",
    })
  );
});
Deno.test("OTSA published guidance cannot be replaced with an inferred or impossible calendar deadline", () => {
  assertEquals(
    otsaDeadline({
      ...timing,
      kind: OtsaTiming.PublishedGuidance,
      published_deadline: "2026-12-01",
      published_guidance_reference: "Reviewed identifying guidance",
    }),
    "2026-12-01",
  );
  assertThrows(() =>
    otsaDeadline({
      ...timing,
      kind: OtsaTiming.PublishedGuidance,
      published_deadline: "2026-02-30",
      published_guidance_reference: "Guidance",
    })
  );
  assertThrows(() =>
    otsaDeadline({
      ...timing,
      kind: OtsaTiming.PublishedGuidance,
      published_deadline: "2026-12-01",
    })
  );
});
