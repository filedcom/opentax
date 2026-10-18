import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createReturnContext } from "../../../../core/validation/context.ts";
import type {
  ReturnContext,
  RuleDef,
} from "../../../../core/validation/types.ts";
import { ALL_RULES } from "./index.ts";
import { TY2026_RULES } from "./ty2026.ts";

const REGISTERED: ReadonlyArray<readonly [string, readonly RuleDef[]]> = [
  ["TY2025", ALL_RULES],
  ["TY2026", TY2026_RULES],
];

/** A context that answers every read with `answer` and counts the reads. */
function recording(base: ReturnContext, answer: unknown) {
  let reads = 0;
  const ctx = new Proxy(base, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        reads++;
        if (answer === undefined) return value.apply(target, args);
        switch (key) {
          case "field":
          case "headerField":
          case "pendingField":
            return answer;
          case "num":
          case "formCount":
          case "filingStatus":
            return 7;
          case "fieldArray":
            return [answer, answer];
          case "presentForms":
            return ["f1040"];
          case "hasValue":
          case "hasNonZero":
          case "hasForm":
            return true;
          default:
            return value.apply(target, args);
        }
      };
    },
  });
  return { ctx, reads: () => reads };
}

const empty = () =>
  createReturnContext({}, { primarySSN: "", filingStatus: 0 }, new Map());

/** Passes on an empty return and on any values without reading the return. */
function ignoresTheReturn(rule: RuleDef): boolean {
  if (typeof rule.check !== "function") return true;
  const blank = recording(empty(), undefined);
  const filled = recording(empty(), "X");
  try {
    return rule.check(blank.ctx) && rule.check(filled.ctx) &&
      blank.reads() === 0 && filled.reads() === 0;
  } catch {
    // A check that fails on these values read them.
    return false;
  }
}

test("every registered rule is a real check that reads the return", () => {
  for (const [year, rules] of REGISTERED) {
    const placeholders = rules.filter(ignoresTheReturn)
      .map((rule) => rule.ruleNumber);
    assertEquals(placeholders, [], `${year} placeholder rules`);
  }
});

test("the guard catches a check that passes without reading the return", () => {
  const placeholder: RuleDef = {
    ruleNumber: "IND-T",
    ruleText: "",
    severity: "reject",
    category: "database",
    check: () => true,
  };
  assertEquals(ignoresTheReturn(placeholder), true);
  assertEquals(
    ignoresTheReturn({ ...placeholder, check: (ctx) => ctx.hasValue("A") || true }),
    false,
  );
});

const BANNED = new RegExp(`\\b(${["always", "Pass"].join("")}|${["irs", "Side"].join("")})\\b`);

async function sources(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".ts"))
    .map((e) => join(e.parentPath, e.name));
}

test("no rule or validation source names a placeholder check", async () => {
  const root = new URL("../../../../", import.meta.url).pathname;
  const files = [
    ...await sources(join(root, "forms/f1040/validation/rules")),
    ...await sources(join(root, "core/validation")),
  ];
  const named: string[] = [];
  for (const file of files) {
    if (BANNED.test(await readFile(file, "utf8"))) named.push(file);
  }
  assertEquals(named, []);
});
