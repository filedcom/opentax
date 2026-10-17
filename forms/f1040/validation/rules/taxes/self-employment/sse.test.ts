import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { SSE_RULES } from "./sse.ts";

test("SSE-F1040-005-09 skips line 8d only at the year's social security wage base", () => {
  const passes = (wages: number) =>
    emittedRulePasses(SSE_RULES, "SSE-F1040-005-09", {
      documents: `<IRS1040ScheduleSE documentId="s"><SSTWagesRRTCompAmt>${wages}</SSTWagesRRTCompAmt></IRS1040ScheduleSE>`,
    });
  assertEquals(passes(176_100), true);
  assertEquals(passes(176_099), false);
});
