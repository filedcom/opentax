import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../2025/index.ts";
import { f1099r } from "../../2025/mef/forms/income/retirement/f1099r.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { scenario104003Input } from "./scenario_1040_03_input.ts";
import { scenario104008Input } from "./scenario_1040_08_input.ts";
import {
  ATS_RETIREMENT_TARGETS,
  compareAtsRetirementValues,
} from "./ty2025-retirement-value-coverage.ts";

for (
  const [id, factory, recipient, count] of [
    ["1040-03", scenario104003Input, "400001035", 1],
    ["1040-08", scenario104008Input, "400001039", 2],
  ] as const
) {
  test(`ATS ${id}: issued retirement sources survive graph and native copy projection`, () => {
    const input = factory();
    const copies = input.f1099r as Record<string, unknown>[];
    assertEquals(copies.length, count);
    for (const copy of copies) {
      assertEquals(copy.recipient_ssn, recipient);
      assertEquals(copy.ts, "T");
      assertEquals(copy.box2b_not_determined, false);
      assertEquals(copy.box2b_total_dist, false);
      assertEquals(copy.box7_ira_simple_indicator, false);
    }
    const execution = f1040_2025.executeReturn(input);
    assertEquals(execution.diagnostics, []);
    const pending = execution.pending;
    const filer = extractFilerIdentity(pending.f1040);
    const documents = f1099r.build(pending.f1099r!, { filer, pending });
    assertEquals(documents.length, count);
    // Component projection is intentionally separate from complete-return
    // preparation; other required sources still block those exports.
    for (const ordered of [documents, [...documents].reverse()]) {
      const rows = compareAtsRetirementValues(
        `<Return><ReturnData>${ordered.join("\n")}</ReturnData></Return>`,
        ATS_RETIREMENT_TARGETS[id],
      ).rows;
      assertEquals(rows.length, count * 10);
      assertEquals(rows.map((r) => r.result), Array(count * 10).fill("match"));
    }
  });

  test(`ATS ${id}: every issued retirement copy rejects missing or wrong recipient`, () => {
    for (let index = 0; index < count; index++) {
      for (const wrongRecipient of [undefined, "999001234"]) {
        const input = factory();
        const copies = input.f1099r as Record<string, unknown>[];
        if (wrongRecipient === undefined) delete copies[index].recipient_ssn;
        else copies[index].recipient_ssn = wrongRecipient;
        const { pending, diagnostics } = f1040_2025.executeReturn(input);
        assertEquals(diagnostics, []);
        const filer = extractFilerIdentity(pending.f1040);
        assertThrows(
          () => f1099r.build(pending.f1099r!, { filer, pending }),
          Error,
          wrongRecipient === undefined
            ? "positive issued copy needs recipient SSN"
            : "issued recipient SSN differs from its Form 1040 owner",
        );
      }
    }
  });
}
