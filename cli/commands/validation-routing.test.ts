import { assert } from "@std/assert";
import { catalog } from "../../catalog.ts";
import { createReturn } from "../store/store.ts";
import { validateReturnCommand } from "./validate.ts";

Deno.test("validation selects the rule set from the return's form definition", async () => {
  const baseDir = await Deno.makeTempDir();
  const original = catalog["f1040:2025"];
  try {
    const { returnId } = await createReturn(2025, baseDir);
    catalog["f1040:2025"] = {
      ...original,
      validation: {
        fieldRegistry: new Map(),
        rules: [{
          ruleNumber: "TEST-YEAR-DISPATCH",
          ruleText: "Selected validation bundle ran",
          severity: "reject",
          category: "incorrect_data",
          check: () => false,
        }],
      },
    };
    const { report } = await validateReturnCommand({ returnId, baseDir });
    assert(
      report.entries.some((entry) => entry.ruleNumber === "TEST-YEAR-DISPATCH"),
    );
  } finally {
    catalog["f1040:2025"] = original;
    await Deno.remove(baseDir, { recursive: true });
  }
});
