import { assertEquals, assertThrows } from "@std/assert";
import { allocateCurrentPassiveForms } from "./current-form-allocation.ts";

const mixed = [{
  activity_id: "retained-land",
  special_allowance_eligible: false,
  forms: [{
    reporting_form: "Schedule E",
    current_income: 0,
    current_loss: 1000,
  }, {
    reporting_form: "Form 4797 Part II",
    current_income: 0,
    current_loss: 3000,
  }],
}, {
  activity_id: "other-farm",
  special_allowance_eligible: false,
  forms: [{
    reporting_form: "Form 4835",
    current_income: 2000,
    current_loss: 0,
  }],
}];

Deno.test("current sale and rental losses retain their reporting forms after the passive limit", () => {
  const r = allocateCurrentPassiveForms(mixed, 2000);
  assertEquals(r.allowed_loss, 2000);
  assertEquals(r.suspended_loss, 2000);
  assertEquals(
    r.by_activity[0].forms.map((
      f,
    ) => [f.reporting_form, f.allowed_loss, f.suspended_loss, f.filed_net]),
    [["Schedule E", 500, 500, -500], ["Form 4797 Part II", 1500, 1500, -1500]],
  );
  assertEquals(r.by_activity[1].forms[0].filed_net, 2000);
  assertEquals(
    r.by_activity.flatMap((a) => a.forms).reduce((n, f) => n + f.filed_net, 0),
    0,
  );
});

Deno.test("same-form income offsets precede Part IX allocation and keep loss character", () => {
  const sources = structuredClone(mixed);
  sources[0].forms[0].current_income = 800;
  sources[1].forms[0].current_income = 0;
  const r = allocateCurrentPassiveForms(sources, 800);
  assertEquals(
    r.by_activity[0].forms.map((
      f,
    ) => [f.allowed_loss, f.suspended_loss, f.filed_net]),
    [[800, 200, 0], [0, 3000, 0]],
  );
  assertEquals(r.suspended_loss, 3200);
});

Deno.test("net-positive and special-allowance activities preserve gross loss origins", () => {
  const sources = structuredClone(mixed);
  sources[0].forms[0].current_income = 5000;
  const fullyAllowed = allocateCurrentPassiveForms(sources, 4000);
  assertEquals(fullyAllowed.suspended_loss, 0);
  assertEquals(fullyAllowed.by_activity[0].forms.map((f) => f.filed_net), [
    4000,
    -3000,
  ]);
  const active = structuredClone(mixed);
  active[0].special_allowance_eligible = true;
  const special = allocateCurrentPassiveForms(active, 3000);
  assertEquals(
    special.by_activity[0].forms.map((f) => [f.allowed_loss, f.suspended_loss]),
    [[750, 250], [2250, 750]],
  );
});

Deno.test("multiple loss activities allocate exact whole dollars without mixing Forms 4797 I and II", () => {
  const r = allocateCurrentPassiveForms([
    {
      activity_id: "first",
      special_allowance_eligible: false,
      forms: [
        {
          reporting_form: "Form 4797 Part I",
          current_income: 0,
          current_loss: 1,
        },
        {
          reporting_form: "Form 4797 Part II",
          current_income: 0,
          current_loss: 2,
        },
      ],
    },
    {
      activity_id: "second",
      special_allowance_eligible: false,
      forms: [
        { reporting_form: "Schedule E", current_income: 0, current_loss: 3 },
      ],
    },
    {
      activity_id: "income",
      special_allowance_eligible: false,
      forms: [
        { reporting_form: "Form 4835", current_income: 1, current_loss: 0 },
      ],
    },
  ], 1);
  assertEquals(r.by_activity.map((a) => a.suspended_loss), [3, 2, 0]);
  assertEquals(
    r.by_activity[0].forms.map((f) => [f.allowed_loss, f.suspended_loss]),
    [[0, 1], [0, 2]],
  );
  assertEquals(r.by_activity[1].forms[0].allowed_loss, 1);
});

Deno.test("current loss allocation rejects duplicate origins, invented allowances, unsafe totals and prior balances", () => {
  assertThrows(() => allocateCurrentPassiveForms([...mixed, mixed[0]], 2000));
  const duplicate = structuredClone(mixed);
  duplicate[0].forms.push(duplicate[0].forms[0]);
  assertThrows(() => allocateCurrentPassiveForms(duplicate, 2000));
  assertThrows(() => allocateCurrentPassiveForms(mixed, 1999));
  assertThrows(() => allocateCurrentPassiveForms(mixed, 4001));
  assertThrows(() => allocateCurrentPassiveForms(mixed, 3000));
  assertThrows(() =>
    allocateCurrentPassiveForms([{ ...mixed[0], prior_unallowed: 1 }], 0)
  );
  const unsafe = structuredClone(mixed);
  unsafe[0].forms[0].current_loss = Number.MAX_SAFE_INTEGER;
  assertThrows(() => allocateCurrentPassiveForms(unsafe, 2000));
});
