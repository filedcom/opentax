import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { catalog } from "../../../catalog.ts";
import { inputNodes as inputNodes2025 } from "../2025/inputs.ts";
import {
  assertTy2026Inputs,
  f1040_2026,
  inputNodes,
  TY2025_ONLY_GENERAL_FIELDS,
  TY2026_SUPPORTED_INPUTS,
} from "./index.ts";
import { adjustmentsInputs } from "./supported/adjustments.ts";
import { creditsInputs } from "./supported/credits.ts";
import { deductionsInputs } from "./supported/deductions.ts";
import { generalInputs } from "./supported/general.ts";
import { incomeInputs } from "./supported/income.ts";
import { paymentsInputs } from "./supported/payments.ts";
import { taxesInputs } from "./supported/taxes.ts";

test("the catalog serves f1040:2026 with the 2026v1.0 MeF version", () => {
  assertEquals(catalog["f1040:2026"], f1040_2026);
  assertEquals(f1040_2026.taxYear, 2026);
  assertEquals(f1040_2026.mefSchemaVersion, "2026v1.0");
  assertEquals(
    inputNodes.map((entry) => entry.inputKey ?? entry.node.nodeType).sort(),
    [...TY2026_SUPPORTED_INPUTS].sort(),
  );
  for (const key of ["general", "w2", "f8888"]) {
    assertEquals(TY2026_SUPPORTED_INPUTS.has(key), true);
  }
});

test("a TY2026 return refuses inputs whose path still applies TY2025 law", () => {
  assertThrows(
    () => assertTy2026Inputs({ general: {}, schedule_j: {} }),
    Error,
    "schedule_j",
  );
  assertThrows(
    () =>
      assertTy2026Inputs({
        general: { ptc_residence_states_2025: ["NV"] },
      }),
    Error,
    "ptc_residence_states_2025",
  );
  assertTy2026Inputs({
    general: { dependents: [{ first_name: "A" }], ptc_residence_states_2025: [] },
    w2: [],
  });
});

test("TY2026 PDF output is refused rather than printed on 2025 forms", async () => {
  let message = "";
  try {
    await f1040_2026.buildPdfBytes({}, undefined);
  } catch (error) {
    message = String(error);
  }
  assertEquals(message.includes("TY2026 PDF"), true);
});

test("each supported TY2026 input is a TY2025 input enabled by one section", () => {
  const sections = [
    generalInputs,
    incomeInputs,
    adjustmentsInputs,
    deductionsInputs,
    creditsInputs,
    taxesInputs,
    paymentsInputs,
  ];
  const keys = sections.flatMap((section) => [...section]);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys.length, TY2026_SUPPORTED_INPUTS.size);
  const known = new Set(
    inputNodes2025.map((entry) => entry.inputKey ?? entry.node.nodeType),
  );
  assertEquals(keys.filter((key) => !known.has(key)), []);
  assertEquals(
    new Set(TY2025_ONLY_GENERAL_FIELDS).size,
    TY2025_ONLY_GENERAL_FIELDS.length,
  );
});
