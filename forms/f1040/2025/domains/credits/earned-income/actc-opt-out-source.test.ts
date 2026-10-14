import { assertEquals, assertThrows } from "@std/assert";
import { retainedActcOptOut } from "./actc-opt-out-source.ts";

Deno.test("ACTC opt-out reads the retained Schedule 8812 election", () => {
  assertEquals(retainedActcOptOut(undefined, undefined), false);
  assertEquals(retainedActcOptOut({ f8812s: [{}] }, 0), false);
  assertEquals(
    retainedActcOptOut({ f8812s: [{ do_not_claim_actc: true }] }, 0),
    true,
  );
  assertEquals(
    retainedActcOptOut({ f8812s: [{ do_not_claim_actc: false }] }, 0),
    false,
  );
});

Deno.test("ACTC opt-out rejects contradictory sources and a filed credit", () => {
  assertThrows(
    () =>
      retainedActcOptOut({
        f8812s: [
          { do_not_claim_actc: true },
          { do_not_claim_actc: false },
        ],
      }, 0),
    Error,
    "source answers conflict",
  );
  assertThrows(
    () =>
      retainedActcOptOut({
        f8812s: [{ do_not_claim_actc: true }],
      }, 1700),
    Error,
    "requires zero line 28 credit",
  );
});
