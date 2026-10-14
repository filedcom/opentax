import { assertEquals, assertThrows } from "@std/assert";
import { currentPropertyLossAllocation } from "./current-property-loss-allocation.ts";
import { passivePropertyInputs } from "../../../../../2025/domains/credits/earned-income/earned-income/eic_passive_property.fixture.ts";
import { qualifiedFarmRentalSource } from "../../../../../2025/domains/credits/earned-income/earned-income/eic_passive_k1.fixture.ts";

Deno.test("current closing, rent and tax source records retain independently allowed operating and ordinary sale losses", () => {
  const property =
    passivePropertyInputs(-3000).schedule_e[0].current_property_source;
  const farm = qualifiedFarmRentalSource();
  farm.current_receipts[0].amount = 9000;
  const r = currentPropertyLossAllocation([property], [farm]);
  assertEquals(
    r.origins[0].forms.map((f) => [f.current_income, f.current_loss]),
    [[0, 1000], [0, 3000]],
  );
  assertEquals(
    r.passive_allocation!.by_activity[0].forms.map((
      f,
    ) => [f.reporting_form, f.allowed_loss, f.suspended_loss]),
    [["Schedule E", 500, 500], ["Form 4797 Part II", 1500, 1500]],
  );
  assertEquals(r.passive_allocation!.suspended_loss, 2000);
  assertEquals(r.origins[0].recipient_tin, "111223333");
});

Deno.test("net-positive land recharacterization keeps a sale loss separate from an unrelated passive farm loss", () => {
  const property =
    passivePropertyInputs(-3000).schedule_e[0].current_property_source;
  property.rent_payments[0].amount = 8000;
  const r = currentPropertyLossAllocation([property], [
    qualifiedFarmRentalSource(),
  ]);
  assertEquals(
    r.nonpassive_forms[0].forms.map((f) => [f.reporting_form, f.filed_net]),
    [["Schedule E", 5000], ["Form 4797 Part II", -3000]],
  );
  assertEquals(r.passive_allocation!.current_income, 0);
  assertEquals(r.passive_allocation!.allowed_loss, 0);
  assertEquals(r.passive_allocation!.suspended_loss, 5000);
});

Deno.test("source-only sale-loss allocation keeps complete-disposition, prior-history and duplicate-activity claims rejected", () => {
  const property =
    passivePropertyInputs(-3000).schedule_e[0].current_property_source;
  assertThrows(() => currentPropertyLossAllocation([property, property], []));
  assertThrows(() =>
    currentPropertyLossAllocation([{ ...property, prior_passive_loss: 1 }], [])
  );
  assertThrows(() =>
    currentPropertyLossAllocation([{
      ...property,
      retained_interest_record: {
        ...property.retained_interest_record,
        remaining_parcel_ids: [],
      },
    }], [])
  );
});
