import { assert, assertEquals, assertThrows } from "@std/assert";
import { basename } from "@std/path";
import { ruleCoreImportPath, ruleRelativePath } from "./rule-paths.ts";

const ruleRegistry = new URL(
  "../../forms/f1040/validation/rules/index.ts",
  import.meta.url,
);

Deno.test("every registered MeF rule group retains its semantic generation destination", async () => {
  const source = await Deno.readTextFile(ruleRegistry);
  const paths = [
    ...source.matchAll(/import \{ \w+_RULES \} from "\.\/([^"]+)"/g),
  ]
    .map((match) => match[1]);
  assertEquals(paths.length, 137);
  for (const path of paths) {
    assertEquals(ruleRelativePath(basename(path, ".ts")), path);
    assert((await Deno.stat(new URL(path, ruleRegistry))).isFile);
  }
});

Deno.test("generated MeF rule imports resolve the engine from each domain folder", async () => {
  const source = await Deno.readTextFile(ruleRegistry);
  const paths = [
    ...source.matchAll(/import \{ \w+_RULES \} from "\.\/([^"]+)"/g),
  ]
    .map((match) => match[1]);
  for (const path of paths) {
    for (const module of ["types.ts", "mod.ts"] as const) {
      const generated = new URL(
        ruleCoreImportPath(basename(path, ".ts"), module),
        new URL(path, ruleRegistry),
      );
      assertEquals(
        generated.href,
        new URL(`../../core/validation/${module}`, import.meta.url).href,
      );
      assert((await Deno.stat(generated)).isFile);
    }
  }
});

Deno.test("unclassified MeF rule prefixes fail before recreating a flat rules folder", () => {
  assertThrows(
    () => ruleRelativePath("unclassified_prefix"),
    Error,
    "Unclassified MeF rule group",
  );
});
