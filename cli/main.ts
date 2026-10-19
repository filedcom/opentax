import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import {
  exportForm8886OtsaCommand,
  recordForm8886OtsaDeliveryCommand,
} from "./commands/form8886-otsa.ts";
import { parseArgs } from "@std/cli";
import type { CommandDef, ParsedArgs, TopLevelDef } from "./commands/help.ts";
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
import {
  listDocumentsCommand,
  nodeTemplateCommand,
} from "./commands/template.ts";
import {
  exportForm4972PaperCommand,
  exportMefCommand,
  exportMefSubmissionCommand,
  exportPdfCommand,
} from "./commands/export.ts";
import { validateReturnCommand } from "./commands/validate.ts";
import { attachSourceFileCommand } from "./commands/return-source-files.ts";
import {
  mefAcksCommand,
  mefAtsRunCommand,
  type MefCommandDeps,
  mefLoginCheckCommand,
  mefSendCommand,
  mefStatusCommand,
} from "./commands/mef.ts";
import {
  checkForUpdate,
  updateCommand,
  versionCommand,
} from "./commands/version.ts";

import { installNetworkPolicy } from "./network.ts";

installNetworkPolicy();

const RETURNS_DIR = "./.state/returns";

async function run(fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    if (result !== undefined) {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err: unknown) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function requireArg(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    console.error(`Error: --${name} is required`);
    process.exit(1);
  }
  return value;
}

async function promptLine(question: string): Promise<string> {
  const terminal = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    return await terminal.question(question);
  } finally {
    terminal.close();
  }
}

function mefDeps(): MefCommandDeps {
  return {
    baseDir: RETURNS_DIR,
    env: process.env,
    home: homedir(),
    fetch: globalThis.fetch,
    confirm: promptLine,
    progress: (line) => console.error(line),
  };
}

function flag(value: boolean | string | undefined): boolean {
  return value === true || value === "true";
}

/** --production, or ATS (the default; --ats says so explicitly). */
function mefTarget(args: ParsedArgs): { production: boolean } {
  if (flag(args.production) && flag(args.ats)) {
    console.error("Error: pass --ats or --production, not both");
    process.exit(1);
  }
  return { production: flag(args.production) };
}

function positiveInteger(
  name: string,
  value: string | undefined,
  fallback: number,
) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.error(`Error: --${name} must be a non-negative integer`);
    process.exit(1);
  }
  return parsed;
}

const MEF_TARGET_OPTIONS = [
  {
    flag: "--ats",
    description: "Use the IRS ATS test environment (the default)",
  },
  {
    flag: "--production",
    description:
      'Use IRS production; needs "productionEnabled": true in ~/.opentax/mef.json and the ETIN typed to confirm',
  },
] as const;

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
      {
        flag: "--node_type",
        description: "Node type identifier (e.g. w2)",
        required: true,
      },
      { flag: "--json", description: "Output as JSON" },
    ],
    handler: async (args) => {
      const nodeType = requireArg("node_type", args.node_type);
      await run(() =>
        Promise.resolve(
          nodeInspectCommand({ nodeType, json: args.json === true }),
        )
      );
    },
  },
  {
    cmd: "node",
    sub: "template",
    description:
      "Print the JSON form add takes for an input or source document",
    usage:
      "opentax node template <type> | --document <kind> | --list-documents [--year <year>] [--full]",
    options: [
      { flag: "--document", description: "Source document (e.g. w2, 1099-int)" },
      {
        flag: "--list-documents",
        description: "List source documents and their node types",
      },
      { flag: "--year", description: "Tax year (default: 2025)" },
      { flag: "--full", description: "Include optional fields" },
    ],
    handler: async (args) => {
      const year = args.year === undefined ? 2025 : Number(args.year);
      if (flag(args["list-documents"])) {
        await run(() => Promise.resolve(listDocumentsCommand(year)));
        return;
      }
      const positional = args._[2];
      await run(() =>
        Promise.resolve(nodeTemplateCommand({
          nodeType: args.node_type ??
            (positional === undefined ? undefined : String(positional)),
          document: args.document,
          year,
          full: flag(args.full),
        }))
      );
    },
  },
  {
    cmd: "return",
    sub: "create",
    description: "Create a new tax return",
    usage: "opentax return create --year <year> [--form f1040|f4868]",
    options: [
      { flag: "--year", description: "Tax year (e.g. 2025)", required: true },
      {
        flag: "--form",
        description:
          "Form type (default: f1040; f4868 with --year 2026 for an extension)",
      },
    ],
    handler: async (args) => {
      const year = Number(args.year);
      if (!args.year || isNaN(year)) {
        console.error("Error: --year is required and must be a number");
        process.exit(1);
      }
      const formType = args.form ?? "f1040";
      await run(() =>
        createReturnCommand({ year, formType, baseDir: RETURNS_DIR })
      );
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
    sub: "record-otsa-delivery",
    description:
      "Retain reviewed delivery evidence for an unchanged OTSA export; no IRS acceptance claim",
    usage:
      "opentax return record-otsa-delivery --returnId <id> --requests <json-file> --export-dir <directory> --record <json-file> --evidence <file> --output <new-directory> [--force]",
    handler: async (args) => {
      await run(() =>
        recordForm8886OtsaDeliveryCommand({
          returnId: requireArg("returnId", args.returnId),
          baseDir: RETURNS_DIR,
          requestsPath: requireArg("requests", args.requests),
          exportDir: requireArg("export-dir", args["export-dir"]),
          recordPath: requireArg("record", args.record),
          evidencePath: requireArg("evidence", args.evidence),
          outputDir: requireArg("output", args.output),
          force: args.force === true || args.force === "true",
          draft: args.draft === true || args.draft === "true",
        })
      );
    },
  },
  {
    cmd: "return",
    sub: "export-otsa",
    description:
      "Prepare separate Form 8886 OTSA copies and handoff manifest; does not send them",
    usage:
      "opentax return export-otsa --returnId <id> --requests <json-file> [--output <new-directory>] [--force]",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      {
        flag: "--requests",
        description: "JSON handoff request for every disclosure",
        required: true,
      },
      {
        flag: "--output",
        description:
          "New export directory; existing directories are never overwritten",
      },
      {
        flag: "--force",
        description:
          "Override return business-rule rejection for review; recorded in manifest",
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const requestsPath = requireArg("requests", args.requests);
      await run(() =>
        exportForm8886OtsaCommand({
          returnId,
          baseDir: RETURNS_DIR,
          requestsPath,
          outputDir: args.output,
          force: args.force === true || args.force === "true",
          draft: args.draft === true || args.draft === "true",
        })
      );
    },
  },
  {
    cmd: "return",
    sub: "attach",
    description:
      "Add a PDF the return files with MeF, or a retained source copy, to the return's folders",
    usage:
      "opentax return attach --returnId <id> --file <path> [--name <file.pdf>] [--description <text>] | --reference <document reference>",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      { flag: "--file", description: "File to copy", required: true },
      {
        flag: "--name",
        description:
          "Attachment file name the inputs use (default: the file's own name)",
      },
      {
        flag: "--description",
        description:
          "MeF attachment description, when the form needs a specific one",
      },
      {
        flag: "--reference",
        description:
          "Retained document reference the inputs use; stores the file in retained/",
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const file = requireArg("file", args.file);
      await run(() =>
        attachSourceFileCommand({
          returnId,
          baseDir: RETURNS_DIR,
          file,
          name: args.name,
          description: args.description,
          reference: args.reference,
        })
      );
    },
  },
  {
    cmd: "return",
    sub: "export",
    description:
      "Export a return as MeF XML, an MeF submission ZIP, filled IRS PDF, or Form 4972 paper packet",
    usage:
      "opentax return export --returnId <id> --type mef|mef-submission|pdf|form4972-paper [--force] [--draft] [--output <path>] [--efin <efin> --software-id <id> [--sequence <7 chars>] [--residency-review <json-file>]]",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      {
        flag: "--type",
        description:
          "Export format: mef, mef-submission, pdf, or form4972-paper",
        required: true,
      },
      {
        flag: "--force",
        description: "Bypass reject-severity validation gate",
        required: false,
      },
      {
        flag: "--draft",
        description:
          "Always label output as draft; allow incomplete calculations for review",
        required: false,
      },
      {
        flag: "--output",
        description:
          "Output file path (pdf default: returns/<id>/export.pdf; mef default: stdout; mef-submission: directory, default returns/<id>/submissions)",
        required: false,
      },
      {
        flag: "--efin",
        description:
          "mef-submission: originator EFIN when the return has no preparer EFIN",
        required: false,
      },
      {
        flag: "--software-id",
        description: "mef-submission: IRS-assigned eight-digit Software ID",
        required: false,
      },
      {
        flag: "--sequence",
        description:
          "mef-submission: seven-character Submission ID sequence (default: random)",
        required: false,
      },
      {
        flag: "--residency-review",
        description:
          "mef-submission: reviewed filer residency JSON (default: returns/<id>/residency-review.json)",
        required: false,
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const force = args.force === true || args.force === "true";
      const draft = args.draft === true || args.draft === "true";
      if (args.type === "mef") {
        await run(async () => {
          const xml = await exportMefCommand({
            returnId,
            baseDir: RETURNS_DIR,
            force,
            draft,
          });
          const outputPath = args.output as string | undefined;
          if (outputPath) {
            await writeFile(outputPath, xml);
            console.log(`MeF XML written to ${outputPath}`);
          } else {
            console.log(xml);
          }
        });
      } else if (args.type === "mef-submission") {
        await run(() =>
          exportMefSubmissionCommand({
            returnId,
            baseDir: RETURNS_DIR,
            force,
            draft,
            efin: args.efin,
            softwareId: args["software-id"],
            sequence: args.sequence,
            residencyReviewPath: args["residency-review"],
            outputDir: args.output,
          })
        );
      } else if (args.type === "pdf") {
        await run(async () => {
          const outputPath = args.output as string | undefined;
          const writtenPath = await exportPdfCommand({
            returnId,
            baseDir: RETURNS_DIR,
            force,
            draft,
            outputPath,
            notice: (message) => console.log(message),
          });
          console.log(`PDF written to ${writtenPath}`);
        });
      } else if (args.type === "form4972-paper") {
        await run(async () => {
          const writtenPath = await exportForm4972PaperCommand({
            returnId,
            baseDir: RETURNS_DIR,
            force,
            draft,
            outputPath: args.output as string | undefined,
          });
          console.log(
            `PAPER ONLY: ${writtenPath} (source manifest: ${writtenPath}.source-manifest.json). This packet has no MeF XML or electronic-submission authorization.`,
          );
        });
      } else {
        console.error(
          "Error: --type must be 'mef', 'mef-submission', 'pdf', or 'form4972-paper'",
        );
        process.exit(1);
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
      {
        flag: "--node_type",
        description: "Node type identifier (e.g. w2)",
        required: true,
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const nodeType = requireArg("node_type", args.node_type);
      const dataJson = args._[2] as string | undefined;
      if (!dataJson) {
        console.error("Error: JSON data argument is required");
        process.exit(1);
      }
      await run(() =>
        formAddCommand({ returnId, nodeType, dataJson, baseDir: RETURNS_DIR })
      );
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
      await run(() =>
        formListCommand({ returnId, baseDir: RETURNS_DIR, nodeType })
      );
    },
  },
  {
    cmd: "form",
    sub: "get",
    description: "Get a specific form entry by ID",
    usage: "opentax form get --returnId <id> --entryId <id>",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      {
        flag: "--entryId",
        description: "Entry identifier (e.g. w2_01)",
        required: true,
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const entryId = requireArg("entryId", args.entryId);
      await run(() =>
        formGetCommand({ returnId, entryId, baseDir: RETURNS_DIR })
      );
    },
  },
  {
    cmd: "form",
    sub: "update",
    description: "Update a form entry's data",
    usage: "opentax form update --returnId <id> --entryId <id> '{...}'",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      {
        flag: "--entryId",
        description: "Entry identifier (e.g. w2_01)",
        required: true,
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const entryId = requireArg("entryId", args.entryId);
      const dataJson = args._[2] as string | undefined;
      if (!dataJson) {
        console.error("Error: JSON data argument is required");
        process.exit(1);
      }
      await run(() =>
        formUpdateCommand({ returnId, entryId, dataJson, baseDir: RETURNS_DIR })
      );
    },
  },
  {
    cmd: "form",
    sub: "delete",
    description: "Delete a form entry",
    usage: "opentax form delete --returnId <id> --entryId <id>",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      {
        flag: "--entryId",
        description: "Entry identifier (e.g. w2_01)",
        required: true,
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const entryId = requireArg("entryId", args.entryId);
      await run(() =>
        formDeleteCommand({ returnId, entryId, baseDir: RETURNS_DIR })
      );
    },
  },
  {
    cmd: "return",
    sub: "validate",
    description: "Validate a return against MeF business rules",
    usage: "opentax return validate --returnId <id> [--format text|json]",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      {
        flag: "--format",
        description: "Output format: text or json (default: json)",
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      const format = (args.format === "text" ? "text" : "json") as
        | "text"
        | "json";
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
      {
        flag: "--depth",
        description: "Max traversal depth (default: unlimited)",
      },
      { flag: "--json", description: "Output as JSON instead of Mermaid" },
    ],
    handler: async (args) => {
      const nodeType = requireArg("node_type", args.node_type);
      const depth = args.depth !== undefined ? Number(args.depth) : Infinity;
      if (isNaN(depth) || depth < 0) {
        console.error("Error: --depth must be a non-negative number");
        process.exit(1);
      }
      await run(() =>
        Promise.resolve(
          graphViewCommand({ nodeType, depth, json: args.json === true }),
        )
      );
    },
  },
  {
    cmd: "mef",
    sub: "login-check",
    description:
      "Log in to IRS MeF A2A with the strong-authentication certificate, then log out",
    usage: "opentax mef login-check [--ats|--production]",
    options: [...MEF_TARGET_OPTIONS],
    handler: async (args) => {
      await run(() => mefLoginCheckCommand(mefTarget(args), mefDeps()));
    },
  },
  {
    cmd: "mef",
    sub: "send",
    description:
      "Build the return's submission ZIP and transmit it with SendSubmissions",
    usage:
      "opentax mef send --returnId <id> [--ats|--production] [--sequence <7 chars>]",
    options: [
      { flag: "--returnId", description: "Return identifier", required: true },
      ...MEF_TARGET_OPTIONS,
      {
        flag: "--sequence",
        description: "Seven-character Submission ID sequence (default: random)",
      },
    ],
    handler: async (args) => {
      const returnId = requireArg("returnId", args.returnId);
      await run(() =>
        mefSendCommand(
          { ...mefTarget(args), returnId, sequence: args.sequence },
          mefDeps(),
        )
      );
    },
  },
  {
    cmd: "mef",
    sub: "status",
    description: "Get a transmitted submission's IRS status record",
    usage: "opentax mef status --submissionId <id> [--ats|--production]",
    options: [
      {
        flag: "--submissionId",
        description: "20-character Submission ID",
        required: true,
      },
      ...MEF_TARGET_OPTIONS,
    ],
    handler: async (args) => {
      const submissionId = requireArg("submissionId", args.submissionId);
      await run(() =>
        mefStatusCommand({ ...mefTarget(args), submissionId }, mefDeps())
      );
    },
  },
  {
    cmd: "mef",
    sub: "acks",
    description:
      "Retrieve acknowledgements and store each under its return (returns/<id>/mef/acks)",
    usage: "opentax mef acks --submissionId <id> | --new [--ats|--production]",
    options: [
      {
        flag: "--submissionId",
        description: "Get the acknowledgement for one submission",
      },
      {
        flag: "--new",
        description: "Get every acknowledgement not yet retrieved",
      },
      ...MEF_TARGET_OPTIONS,
    ],
    handler: async (args) => {
      await run(() =>
        mefAcksCommand(
          {
            ...mefTarget(args),
            submissionId: args.submissionId,
            new: flag(args.new),
          },
          mefDeps(),
        )
      );
    },
  },
  {
    cmd: "mef",
    sub: "ats-run",
    description:
      "Send every ATS test return in the store in one transmission and poll ATS for their acks",
    usage:
      "opentax mef ats-run [--returnId <id>,<id>...] [--poll-seconds <n>] [--max-polls <n>]",
    options: [
      {
        flag: "--returnId",
        description:
          "Comma-separated returns to send (default: every return with general.ats_test_submission and no accepted ack)",
      },
      {
        flag: "--poll-seconds",
        description: "Seconds between GetAcks polls (default: 60)",
      },
      {
        flag: "--max-polls",
        description: "GetAcks polls before giving up (default: 30)",
      },
    ],
    handler: async (args) => {
      if (flag(args.production)) {
        console.error("Error: ats-run transmits only to ATS");
        process.exit(1);
      }
      await run(() =>
        mefAtsRunCommand(
          {
            returnIds: args.returnId?.split(",").map((id) => id.trim())
              .filter((id) => id !== ""),
            pollSeconds: positiveInteger(
              "poll-seconds",
              args["poll-seconds"],
              60,
            ),
            maxPolls: positiveInteger("max-polls", args["max-polls"], 30),
          },
          mefDeps(),
        )
      );
    },
  },
];

/** Top-level commands that don't use the cmd/sub pattern */
const TOP_LEVEL: Record<string, () => Promise<void> | void> = {
  version: versionCommand,
  update: updateCommand,
};

const TOP_LEVEL_DEFS: readonly TopLevelDef[] = [
  { usage: "opentax version", description: "Show the current version" },
  {
    usage: "opentax update",
    description: "Download and install the latest release",
  },
];

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), {
    string: [
      "year",
      "returnId",
      "node_type",
      "depth",
      "type",
      "form",
      "entryId",
      "format",
      "output",
      "requests",
      "export-dir",
      "record",
      "evidence",
      "efin",
      "software-id",
      "sequence",
      "residency-review",
      "file",
      "name",
      "description",
      "reference",
      "submissionId",
      "poll-seconds",
      "max-polls",
      "document",
    ],
    boolean: [
      "json",
      "help",
      "draft",
      "ats",
      "production",
      "new",
      "full",
      "list-documents",
    ],
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
    printHelp(COMMANDS, cmd, TOP_LEVEL_DEFS);
    process.exit(args.help ? 0 : 1);
  }

  await checkForUpdate();

  if (!sub) {
    printHelp(COMMANDS, cmd);
    process.exit(1);
  }

  const def = COMMANDS.find((c) => c.cmd === cmd && c.sub === sub);
  if (!def) {
    console.error(`Unknown command: opentax ${cmd} ${sub}\n`);
    printHelp(COMMANDS);
    process.exit(1);
  }

  await def.handler(args);
}

main();
