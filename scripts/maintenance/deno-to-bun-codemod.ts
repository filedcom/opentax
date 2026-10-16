/**
 * One-shot codemod for the Deno-to-Bun migration. Rewrites every `Deno.*`
 * use in the given TypeScript files into `bun:test`, `node:` built-ins, the
 * global `process`, or `scripts/support/sys.ts` (for the few calls whose Deno
 * semantics have no 1:1 `node:` form), and `@std/path` imports into
 * `node:path` and `node:url`. Anything it does not recognise is
 * reported and left untouched, so the run fails loudly instead of guessing.
 *
 * Usage: bun scripts/maintenance/deno-to-bun-codemod.ts [--check] <file.ts...>
 *
 * Kept in the repository so review can check this script rather than the
 * thousands of edits it produced.
 */
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SYS = resolve(ROOT, "scripts/support/sys.ts");

type Edit = { start: number; end: number; text: string };
type Needs = { fs: boolean; fsSync: boolean; sys: boolean; test: boolean };
type Names = { fs: string; fsSync: string; sys: string; test: string };

/** `node:fs/promises` calls with identical arguments and semantics. */
const FS_SAME: Record<string, string> = {
  mkdir: "mkdir",
  rename: "rename",
  copyFile: "copyFile",
  chmod: "chmod",
  symlink: "symlink",
  realPath: "realpath",
  truncate: "truncate",
};
const FS_SYNC_SAME: Record<string, string> = {
  mkdirSync: "mkdirSync",
  renameSync: "renameSync",
  copyFileSync: "copyFileSync",
  chmodSync: "chmodSync",
  realPathSync: "realpathSync",
};
/** Calls whose Deno semantics need `sys.ts`. */
const SYS_CALLS: Record<string, string> = {
  readFile: "readBytes",
  readFileSync: "readBytesSync",
  remove: "remove",
  makeTempDir: "makeTempDir",
  makeTempFile: "makeTempFile",
  stat: "stat",
  lstat: "lstat",
  readDir: "readDir",
};

function declaredNames(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node) => {
    if (
      (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) || ts.isParameter(node) ||
        ts.isImportSpecifier(node) || ts.isNamespaceImport(node) ||
        ts.isImportClause(node) || ts.isBindingElement(node)) &&
      node.name && ts.isIdentifier(node.name)
    ) names.add(node.name.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

function pick(taken: Set<string>, preferred: string, fallback: string) {
  return taken.has(preferred) ? fallback : preferred;
}

function isDeno(node: ts.Node, path: string): boolean {
  return node.getText() === `Deno.${path}`;
}

function args(call: ts.CallExpression): string {
  return call.arguments.map((a) => a.getText()).join(", ");
}

/** `Deno.test(name, fn)` and `Deno.test({ name, ignore, fn, sanitize* }, fn?)`. */
function testCall(call: ts.CallExpression, names: Names): string | undefined {
  const [first, second] = call.arguments;
  if (!ts.isObjectLiteralExpression(first)) {
    if (call.arguments.length !== 2) return undefined;
    return `${names.test}(${args(call)})`;
  }
  let name: string | undefined;
  let ignore: string | undefined;
  let fn = second?.getText();
  for (const property of first.properties) {
    const key = property.name?.getText();
    if (ts.isShorthandPropertyAssignment(property) && key === "fn") {
      fn = property.name.getText();
    } else if (ts.isPropertyAssignment(property) && key === "name") {
      name = property.initializer.getText();
    } else if (ts.isPropertyAssignment(property) && key === "fn") {
      fn = property.initializer.getText();
    } else if (
      ts.isMethodDeclaration(property) && key === "fn" && property.body
    ) {
      if (property.body.getText().includes("this")) return undefined;
      const isAsync = property.modifiers?.some((m) =>
        m.kind === ts.SyntaxKind.AsyncKeyword
      );
      const params = property.parameters.map((p) => p.getText()).join(", ");
      fn = `${
        isAsync ? "async " : ""
      }(${params}) => ${property.body.getText()}`;
    } else if (ts.isPropertyAssignment(property) && key === "ignore") {
      ignore = property.initializer.getText();
    } else if (key === "sanitizeOps" || key === "sanitizeResources") {
      continue; // Bun has no resource sanitizers.
    } else return undefined;
  }
  if (!name || !fn) return undefined;
  return ignore
    ? `${names.test}.skipIf(${ignore})(${name}, ${fn})`
    : `${names.test}(${name}, ${fn})`;
}

/** A rewrite that keeps the original argument text and layout. */
type CallRewrite =
  | { readonly callee: string; readonly append?: string }
  | { readonly whole: string };

function callEdit(
  call: ts.CallExpression,
  needs: Needs,
  names: Names,
): CallRewrite | undefined {
  const callee = call.expression.getText();
  if (!callee.startsWith("Deno.")) return undefined;
  const api = callee.slice("Deno.".length);
  const n = call.arguments.length;
  if (api === "test") {
    needs.test = true;
    if (!ts.isObjectLiteralExpression(call.arguments[0]) && n === 2) {
      return { callee: names.test };
    }
    const whole = testCall(call, names);
    return whole === undefined ? undefined : { whole };
  }
  if (api === "readTextFile" && n === 1) {
    needs.fs = true;
    return { callee: `${names.fs}.readFile`, append: `"utf8"` };
  }
  if (api === "readTextFileSync" && n === 1) {
    needs.fsSync = true;
    return { callee: `${names.fsSync}.readFileSync`, append: `"utf8"` };
  }
  if (api === "writeTextFile" || api === "writeFile") {
    if (n === 2) {
      needs.fs = true;
      return { callee: `${names.fs}.writeFile` };
    }
    needs.sys = true;
    return {
      callee: `${names.sys}.${
        api === "writeTextFile" ? "writeText" : "writeBytes"
      }`,
    };
  }
  if ((api === "writeTextFileSync" || api === "writeFileSync") && n === 2) {
    needs.fsSync = true;
    return { callee: `${names.fsSync}.writeFileSync` };
  }
  if (api in FS_SAME) {
    needs.fs = true;
    return { callee: `${names.fs}.${FS_SAME[api]}` };
  }
  if (api in FS_SYNC_SAME) {
    needs.fsSync = true;
    return { callee: `${names.fsSync}.${FS_SYNC_SAME[api]}` };
  }
  if (api === "statSync" || api === "lstatSync") {
    needs.sys = true;
    return { callee: `${names.sys}.${api}` };
  }
  if (api in SYS_CALLS) {
    needs.sys = true;
    return { callee: `${names.sys}.${SYS_CALLS[api]}` };
  }
  if (api === "env.get" && n === 1) {
    const literal = call.arguments[0];
    return {
      whole:
        ts.isStringLiteral(literal) && /^[A-Za-z_$][\w$]*$/.test(literal.text)
          ? `process.env.${literal.text}`
          : `process.env[${literal.getText()}]`,
    };
  }
  if (api === "exit") return { callee: "process.exit" };
  if (api === "cwd" && n === 0) return { callee: "process.cwd" };
  if (api === "chdir" && n === 1) return { callee: "process.chdir" };
  if (api === "execPath" && n === 0) return { whole: "process.execPath" };
  return undefined;
}

/** `try { …env reads… } catch (e) { if (e instanceof Deno.errors.NotCapable) …; throw e; }` */
function notCapableTry(statement: ts.TryStatement): string | undefined {
  const clause = statement.catchClause;
  if (!clause || statement.finallyBlock) return undefined;
  if (!clause.block.getText().includes("Deno.errors.NotCapable")) {
    return undefined;
  }
  const variable = clause.variableDeclaration?.name.getText();
  for (const inner of clause.block.statements) {
    if (
      ts.isThrowStatement(inner) && inner.expression?.getText() === variable
    ) {
      continue;
    }
    if (
      ts.isIfStatement(inner) && !inner.elseStatement &&
      inner.expression.getText().includes("Deno.errors.NotCapable")
    ) continue;
    return undefined;
  }
  // Every other error was rethrown and environment reads cannot throw, so the
  // try body runs exactly as before without the wrapper.
  const body = statement.tryBlock.statements;
  if (body.length === 0) return "";
  const text = statement.getSourceFile().text;
  return text.slice(body[0].getFullStart(), body.at(-1)!.getEnd()).trimStart();
}

function edits(source: ts.SourceFile, needs: Needs, names: Names) {
  const out: Edit[] = [];
  const unknown: string[] = [];
  const permissionVars = new Map<string, ts.VariableStatement>();

  const add = (node: ts.Node, text: string): void => {
    out.push({ start: node.getStart(), end: node.getEnd(), text });
  };

  // `const p = await Deno.permissions.query({ name: "env", ... })`
  for (
    const statement of source.statements.length ? collectStatements(source) : []
  ) {
    const declaration = statement.declarationList.declarations[0];
    const init = declaration?.initializer;
    if (
      statement.declarationList.declarations.length === 1 && init &&
      ts.isAwaitExpression(init) && ts.isCallExpression(init.expression) &&
      isDeno(init.expression.expression, "permissions.query") &&
      /name:\s*"env"/.test(init.expression.getText()) &&
      ts.isIdentifier(declaration.name)
    ) permissionVars.set(declaration.name.text, statement);
  }

  const visit = (node: ts.Node): void => {
    if (ts.isVariableStatement(node)) {
      const name = node.declarationList.declarations[0]?.name.getText();
      if (name && permissionVars.get(name) === node) {
        out.push({ start: node.getFullStart(), end: node.getEnd(), text: "" });
        return;
      }
    }
    if (
      ts.isConditionalExpression(node) &&
      [...permissionVars.keys()].some((v) =>
        node.condition.getText().replace(/\s+/g, " ") ===
          `${v}.state === "granted"`
      )
    ) {
      add(node, node.whenTrue.getText());
      return;
    }
    if (ts.isTryStatement(node)) {
      const unwrapped = notCapableTry(node);
      if (unwrapped !== undefined) {
        add(node, unwrapped);
        return;
      }
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword
    ) {
      const right = node.right.getText();
      const check = right === "Deno.errors.NotFound"
        ? "isNotFound"
        : right === "Deno.errors.AlreadyExists"
        ? "isAlreadyExists"
        : undefined;
      if (check) {
        needs.sys = true;
        add(node, `${names.sys}.${check}(${node.left.getText()})`);
        return;
      }
    }
    if (ts.isCallExpression(node)) {
      const rewrite = callEdit(node, needs, names);
      if (rewrite && "whole" in rewrite) {
        add(node, rewrite.whole);
        return;
      }
      if (rewrite) {
        add(node.expression, rewrite.callee);
        if (rewrite.append) {
          const last = node.arguments.at(-1)!;
          out.push({
            start: last.getEnd(),
            end: last.getEnd(),
            text: `, ${rewrite.append}`,
          });
        }
        node.arguments.forEach(visit);
        return;
      }
    }
    if (ts.isPropertyAccessExpression(node) || ts.isQualifiedName(node)) {
      const text = node.getText();
      if (text === "Deno.Command" || text === "Deno.CommandOutput") {
        needs.sys = true;
        add(node, `${names.sys}.${text.slice(5)}`);
        return;
      }
      if (text === "Deno.args") return add(node, "process.argv.slice(2)");
      if (text === "Deno.pid") return add(node, "process.pid");
    }
    if (ts.isIdentifier(node) && node.text === "Deno") {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      unknown.push(
        `${source.fileName}:${line + 1}: ${node.parent.getText().slice(0, 80)}`,
      );
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { edits: out, unknown };
}

function collectStatements(source: ts.SourceFile): ts.VariableStatement[] {
  const found: ts.VariableStatement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node)) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** Namespace imports this codemod adds, if a file already has them. */
function existingImports(source: ts.SourceFile): Partial<Names> {
  const found: Partial<Names> = {};
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const from = (statement.moduleSpecifier as ts.StringLiteral).text;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      const name = bindings.name.text;
      if (from === "node:fs/promises") found.fs = name;
      else if (from === "node:fs") found.fsSync = name;
      else if (from.endsWith("scripts/support/sys.ts") || from === "./sys.ts") {
        found.sys = name;
      }
    } else if (from === "bun:test" && bindings && ts.isNamedImports(bindings)) {
      const test = bindings.elements.find((e) =>
        (e.propertyName ?? e.name).text === "test"
      );
      if (test) found.test = test.name.text;
    }
  }
  return found;
}

function importLines(file: string, needs: Needs, names: Names): string {
  const lines: string[] = [];
  if (needs.test) {
    lines.push(
      names.test === "test"
        ? `import { test } from "bun:test";`
        : `import { test as ${names.test} } from "bun:test";`,
    );
  }
  if (needs.fs) lines.push(`import * as ${names.fs} from "node:fs/promises";`);
  if (needs.fsSync) lines.push(`import * as ${names.fsSync} from "node:fs";`);
  if (needs.sys) {
    let path = relative(dirname(resolve(file)), SYS).replaceAll("\\", "/");
    if (!path.startsWith(".")) path = `./${path}`;
    lines.push(`import * as ${names.sys} from "${path}";`);
  }
  return lines.join("\n");
}

/**
 * `@std/path` resolves relative paths with `Deno.cwd()`, so its imports move
 * to `node:path` and `node:url` under the same local names; call sites stay.
 */
const NODE_URL_NAMES: Record<string, string> = {
  fromFileUrl: "fileURLToPath",
  toFileUrl: "pathToFileURL",
};

function stdPathImports(source: ts.SourceFile): Edit[] {
  const out: Edit[] = [];
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      (statement.moduleSpecifier as ts.StringLiteral).text !== "@std/path"
    ) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const typeOnly = statement.importClause!.isTypeOnly ? "type " : "";
    const path: string[] = [];
    const url: string[] = [];
    for (const element of bindings.elements) {
      const imported = (element.propertyName ?? element.name).text;
      const local = element.name.text;
      const node = NODE_URL_NAMES[imported];
      if (node) url.push(node === local ? node : `${node} as ${local}`);
      else path.push(imported === local ? local : `${imported} as ${local}`);
    }
    const lines = [];
    if (path.length) {
      lines.push(`import ${typeOnly}{ ${path.join(", ")} } from "node:path";`);
    }
    if (url.length) {
      lines.push(`import ${typeOnly}{ ${url.join(", ")} } from "node:url";`);
    }
    out.push({
      start: statement.getStart(),
      end: statement.getEnd(),
      text: lines.join("\n"),
    });
  }
  return out;
}

/** One pass: outermost Deno uses only; nested ones are rewritten next pass. */
function pass(file: string, text: string) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const existing = existingImports(source);
  const taken = declaredNames(source);
  const names: Names = {
    fs: existing.fs ?? pick(taken, "fs", "nodeFs"),
    fsSync: existing.fsSync ?? pick(taken, "fsSync", "nodeFsSync"),
    sys: existing.sys ?? pick(taken, "sys", "runtimeSys"),
    test: existing.test ?? pick(taken, "test", "bunTest"),
  };
  const needs: Needs = { fs: false, fsSync: false, sys: false, test: false };
  const found = edits(source, needs, names);
  found.edits.push(...stdPathImports(source));
  // Imports added by an earlier pass are reused, not added twice.
  for (const key of Object.keys(needs) as (keyof Needs)[]) {
    if (existing[key]) needs[key] = false;
  }
  found.edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let result = text;
  let lastStart = Infinity;
  for (const edit of found.edits) {
    if (edit.end > lastStart) continue; // nested: next pass
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    lastStart = edit.start;
  }
  const imports = importLines(file, needs, names);
  if (imports) {
    const shebang = result.startsWith("#!") ? result.indexOf("\n") + 1 : 0;
    result = result.slice(0, shebang) + imports + "\n" + result.slice(shebang);
  }
  return { result, unknown: found.unknown, changed: found.edits.length > 0 };
}

export function migrate(file: string, text: string) {
  let current = text.replace(
    /^#!\/usr\/bin\/env -S deno run[^\n]*\n/,
    "#!/usr/bin/env bun\n",
  );
  let unknown: string[] = [];
  for (let i = 0; i < 10; i++) {
    const step = pass(file, current);
    current = step.result;
    unknown = step.unknown;
    if (!step.changed) break;
  }
  return { text: current, unknown };
}

if (import.meta.main) {
  const check = process.argv.includes("--check");
  const files = process.argv.slice(2).filter((arg) => arg !== "--check");
  const unknown: string[] = [];
  let changed = 0;
  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const after = migrate(file, before);
    unknown.push(...after.unknown);
    if (after.text !== before) {
      changed++;
      if (!check) writeFileSync(file, after.text);
    }
  }
  console.log(
    `${changed} of ${files.length} files ${check ? "would change" : "changed"}`,
  );
  if (unknown.length > 0) {
    console.error(`${unknown.length} Deno uses left for hand migration:`);
    for (const line of unknown) console.error(`  ${line}`);
    process.exit(1);
  }
}
