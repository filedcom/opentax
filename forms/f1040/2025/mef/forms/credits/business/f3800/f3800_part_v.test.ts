import { assertEquals, assertThrows } from "@std/assert";
import { buildForm3800PartVXml } from "./f3800_part_v.ts";

Deno.test("Form 3800 Part V wraps mixed source details once in schema line order", () => {
  assertEquals(
    buildForm3800PartVXml([
      { line: "4b", xml: "<Form5884Detail/>" },
      { line: "1h", xml: "<Form8820DetailA/>" },
      { line: "1e", xml: "<Form8826Detail/>" },
      { line: "1h", xml: "<Form8820DetailB/>" },
    ]),
    "<GBCBreakdownCYAggrgtAmtGrp><Form8826Detail/><Form8820DetailA/><Form8820DetailB/><Form5884Detail/></GBCBreakdownCYAggrgtAmtGrp>",
  );
  assertEquals(buildForm3800PartVXml([]), "");
  assertThrows(
    () => buildForm3800PartVXml([{ line: "2a", xml: "<Invalid/>" }]),
    Error,
    "needs a supported line",
  );
});
