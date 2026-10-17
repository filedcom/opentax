import { readdirSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where each MeF rule group lives, read from the tree itself: every
 * `forms/f1040/validation/rules/<section>/<group>/.../<stem>.ts` (not
 * `index.ts`, not `*.test.ts`) is the home of the group whose stem is its
 * basename. A prefix with no file on disk is unclassified: a new IRS group is
 * placed by hand first, so the generator never recreates a flat rules folder.
 */
const RULES_DIR = new URL(
  "../../forms/f1040/validation/rules/",
  import.meta.url,
);

function isRuleGroupFile(path: string): boolean {
  return path.endsWith(".ts") && !path.endsWith(".test.ts") &&
    path.includes("/");
}

function collectRuleGroupPaths(): ReadonlyMap<string, string> {
  const files = readdirSync(fileURLToPath(RULES_DIR), { recursive: true })
    .map((entry) => String(entry).replaceAll("\\", "/"))
    .filter(isRuleGroupFile)
    .sort();
  return files.reduce((paths, path) => {
    const stem = basename(path, ".ts");
    const existing = paths.get(stem);
    if (existing !== undefined) {
      throw new Error(
        `MeF rule group ${stem} has two homes: ${existing} and ${path}`,
      );
    }
    return new Map([...paths, [stem, path]]);
  }, new Map<string, string>());
}

const paths = collectRuleGroupPaths();

/** Every rule-group stem with a home in the tree, sorted. */
export function ruleGroupStems(): readonly string[] {
  return [...paths.keys()].sort();
}

/** Path of the group's file relative to `forms/f1040/validation/rules/`. */
export function ruleRelativePath(stem: string): string {
  const path = paths.get(stem);
  if (path === undefined) {
    throw new Error(`Unclassified MeF rule group: ${stem}`);
  }
  return path;
}

/** Calculate generated imports from the destination rule file, not the tool. */
export function ruleCoreImportPath(
  stem: string,
  module: "types.ts" | "mod.ts",
): string {
  return relative(
    dirname(`forms/f1040/validation/rules/${ruleRelativePath(stem)}`),
    `core/validation/${module}`,
  ).replaceAll("\\", "/");
}
