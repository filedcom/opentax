import { assertEquals, assertThrows } from "@std/assert";
import { buildForm3800PartVIXml } from "./f3800_part_vi.ts";

Deno.test("Form 3800 Part VI orders carryover detail by schema line and retains years", () => {
  const rows = buildForm3800PartVIXml([
    { line: "4e", xml: "<year-2023/>" },
    { line: "1h", xml: "<year-2024/>" },
    { line: "1h", xml: "<year-2022/>" },
  ]);
  assertEquals(rows, ["<year-2024/>", "<year-2022/>", "<year-2023/>"]);
});

Deno.test("Form 3800 Part VI rejects a missing detail group", () => {
  assertThrows(
    () => buildForm3800PartVIXml([{ line: "1h", xml: "" }]),
    Error,
    "needs a supported line and XML",
  );
});
