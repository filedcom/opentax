import { parseArgs } from "@std/cli";
import type { CommandDef, ParsedArgs } from "./commands/help.ts";
import { printHelp } from "./commands/help.ts";
import {
  formAddCommand,
  formDeleteCommand,
  formGetCommand,
  formListCommand,
  formUpdateCommand,
} from "./commands/form.ts";
import { graphViewCommand } from "./commands/graph.ts";
import { nodeInspectCommand, nodeListCommand } from "./commands/node.ts";
import { createReturnCommand, getReturnCommand } from "./commands/return.ts";
import { exportMefCommand, exportPdfCommand } from "./commands/export.ts";
import { validateReturnCommand } from "./commands/validate.ts";
import { checkForUpdate, updateCommand, versionCommand } from "./commands/version.ts";

const RETURNS_DIR = "./.state/returns";

async function run(fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    if (result !== undefined) {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err: unknown) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    Deno.exit(1);
  }
}

function requireArg(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    console.error(`Error: --${name} is required`);
    Deno.exit(1);
  }
  return value;
}

const COMMANDS: readonly CommandDef[] = [
  {
    cmd: "node",
    sub: "list",
    description: "List all registered nodes",
    usage: "opentax node list",
    handler: async (_args) => {
      await run(() => Promise.resolve(nodeListCommand()));
    },
  },
  {
    cmd: "node",
    sub: "inspect",
    description: "Inspect a node's input schema and output nodes",
    usage: "opentax node inspect --node_type <type>",
    options: [
      { flag: "--node_type", description: "Node type identifier (e.g. w2)", required: true },
      { flag: "--json", description: "Output as JSON" },
    ],
    handler: async (args) => {
      const nodeType = requireArg("node_type", args.node_type);
      await run(() => Promise.resolve(nodeInspectCommand({ nodeType, json: args.json === true })));
    },
  },
  {
    cmd: "return",
    sub: "create",
    description: "Create a new tax return",
    usage: "opentax return create --year <year>",
    options: [
      { flag: "--year", description: "Tax year (e.g. 2025)", required: true },
      { flag: "--form", description: "Form type (default: f1040)" },
    ],
    handler: async (args) => {
      const year = Number(args.year);
      if (!args.year || isNaN(year)) {
        console.error("Error: --year is required and must be a number");
        Deno.exit(1);
      }
      const formType = args.form ?? "f1040";
      await run(() => createReturnCommand({ year, formType, baseDir: RETURNS_DIR }));
    },
  },
  {
    cmd: "return",
    sub: "get",
    description: "Get a return's computed line items",
    usage: "opentax return get --returnId <id>",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      await run(() => getReturnCommand({ returnId, baseDir: RETURNS_DIR }));
    },
  },
  {
    cmd: "return",
    sub: "export",
    description: "Export a return as MEF XML or filled IRS PDF",
    usage: "opentax return export --returnId <id> --type mef|pdf [--force] [--output <path>]",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      { flag: "--type", description: "Export format: mef or pdf", required: true },
      { flag: "--force", description: "Bypass reject-severity validation gate", required: false },
      { flag: "--output", description: "Output file path (pdf only; default: returns/<id>/export.pdf)", required: false },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const force = args.force === true || args.force === "true";
      if (args.type === "mef") {
        await run(async () => {
          const xml = await exportMefCommand({ returnId, baseDir: RETURNS_DIR, force });
          console.log(xml);
        });
      } else if (args.type === "pdf") {
        await run(async () => {
          const outputPath = args.output as string | undefined;
          const writtenPath = await exportPdfCommand({ returnId, baseDir: RETURNS_DIR, force, outputPath });
          console.log(`PDF written to ${writtenPath}`);
        });
      } else {
        console.error("Error: --type must be 'mef' or 'pdf'");
        Deno.exit(1);
      }
    },
  },
  {
    cmd: "form",
    sub: "add",
    description: "Add a form entry to a return",
    usage: "opentax form add --returnId <id> --node_type <type> '{...}'",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      { flag: "--node_type", description: "Node type identifier (e.g. w2)", required: true },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const nodeType = requireArg("node_type", args.node_type);
      const dataJson = args._[2] as string | undefined;
      if (!dataJson) {
        console.error("Error: JSON data argument is required");
        Deno.exit(1);
      }
      await run(() => formAddCommand({ returnId, nodeType, dataJson, baseDir: RETURNS_DIR }));
    },
  },
  {
    cmd: "form",
    sub: "list",
    description: "List all form entries in a return",
    usage: "opentax form list --returnId <id> [--node_type <type>]",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      { flag: "--node_type", description: "Filter by node type (optional)" },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const nodeType = args.node_type as string | undefined;
      await run(() => formListCommand({ returnId, baseDir: RETURNS_DIR, nodeType }));
    },
  },
  {
    cmd: "form",
    sub: "get",
    description: "Get a specific form entry by ID",
    usage: "opentax form get --returnId <id> --entryId <id>",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      { flag: "--entryId", description: "Entry identifier (e.g. w2_01)", required: true },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const entryId = requireArg("entryId", args.entryId);
      await run(() => formGetCommand({ returnId, entryId, baseDir: RETURNS_DIR }));
    },
  },
  {
    cmd: "form",
    sub: "update",
    description: "Update a form entry's data",
    usage: "opentax form update --returnId <id> --entryId <id> '{...}'",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      { flag: "--entryId", description: "Entry identifier (e.g. w2_01)", required: true },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const entryId = requireArg("entryId", args.entryId);
      const dataJson = args._[2] as string | undefined;
      if (!dataJson) {
        console.error("Error: JSON data argument is required");
        Deno.exit(1);
      }
      await run(() => formUpdateCommand({ returnId, entryId, dataJson, baseDir: RETURNS_DIR }));
    },
  },
  {
    cmd: "form",
    sub: "delete",
    description: "Delete a form entry",
    usage: "opentax form delete --returnId <id> --entryId <id>",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      { flag: "--entryId", description: "Entry identifier (e.g. w2_01)", required: true },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const entryId = requireArg("entryId", args.entryId);
      await run(() => formDeleteCommand({ returnId, entryId, baseDir: RETURNS_DIR }));
    },
  },
  {
    cmd: "return",
    sub: "validate",
    description: "Validate a return against MeF business rules",
    usage: "opentax return validate --returnId <id> [--format text|json]",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      { flag: "--format", description: "Output format: text or json (default: json)" },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const format = (args.format === "text" ? "text" : "json") as "text" | "json";
      await run(async () => {
        const { report, formatted } = await validateReturnCommand({
          returnId,
          baseDir: RETURNS_DIR,
          format,
        });
        if (format === "text") {
          console.log(formatted);
          return undefined;
        }
        return report;
      });
    },
  },
  {
    cmd: "node",
    sub: "graph",
    description: "View node dependency graph (Mermaid or JSON)",
    usage: "opentax node graph --node_type start [--depth <n>] [--json]",
    options: [
      { flag: "--node_type", description: "Root node type", required: true },
      { flag: "--depth", description: "Max traversal depth (default: unlimited)" },
      { flag: "--json", description: "Output as JSON instead of Mermaid" },
    ],
    handler: async (args) => {
      const nodeType = requireArg("node_type", args.node_type);
      const depth = args.depth !== undefined ? Number(args.depth) : Infinity;
      if (isNaN(depth) || depth < 0) {
        console.error("Error: --depth must be a non-negative number");
        Deno.exit(1);
      }
      await run(() =>
        Promise.resolve(graphViewCommand({ nodeType, depth, json: args.json === true }))
      );
    },
  },
];

/** Top-level commands that don't use the cmd/sub pattern */
const TOP_LEVEL: Record<string, () => Promise<void> | void> = {
  version: versionCommand,
  update: updateCommand,
};

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["year", "returnId", "node_type", "depth", "type", "form", "entryId", "format", "output"],
    boolean: ["json", "help"],
    alias: { h: "help" },
  }) as unknown as ParsedArgs;

  const cmd = args._[0] as string | undefined;
  const sub = args._[1] as string | undefined;

  // Top-level commands: opentax version, opentax update
  if (cmd && cmd in TOP_LEVEL) {
    await TOP_LEVEL[cmd]();
    return;
  }

  if (!cmd || args.help) {
    printHelp(COMMANDS, cmd);
    Deno.exit(args.help ? 0 : 1);
  }

  await checkForUpdate();

  if (!sub) {
    printHelp(COMMANDS, cmd);
    Deno.exit(1);
  }

  const def = COMMANDS.find((c) => c.cmd === cmd && c.sub === sub);
  if (!def) {
    console.error(`Unknown command: opentax ${cmd} ${sub}\n`);
    printHelp(COMMANDS);
    Deno.exit(1);
  }

  await def.handler(args);
}

main();
