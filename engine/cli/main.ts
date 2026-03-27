import { parseArgs } from "@std/cli";
import { createReturnCommand } from "./commands/create-return.ts";
import { formAddCommand } from "./commands/form-add.ts";
import { getReturnCommand } from "./commands/get-return.ts";

const RETURNS_DIR = "./returns";

async function runCommand(fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    console.log(JSON.stringify(result, null, 2));
  } catch (err: unknown) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    Deno.exit(1);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["year", "returnId", "node_type"],
  });
  const cmd = args._[0] as string | undefined;
  const sub = args._[1] as string | undefined;

  if (cmd === "return" && sub === "create") {
    const year = Number(args.year);
    if (!year || isNaN(year)) {
      console.error("Error: --year is required and must be a number");
      Deno.exit(1);
    }
    await runCommand(() => createReturnCommand({ year, baseDir: RETURNS_DIR }));
  } else if (cmd === "form" && sub === "add") {
    const returnId = args.returnId;
    const nodeType = args.node_type;
    const dataJson = args._[2] as string | undefined;
    if (!returnId || !nodeType || !dataJson) {
      console.error(
        "Error: --returnId, --node_type, and JSON data argument are required",
      );
      Deno.exit(1);
    }
    await runCommand(() =>
      formAddCommand({ returnId, nodeType, dataJson, baseDir: RETURNS_DIR })
    );
  } else if (cmd === "return" && sub === "get") {
    const returnId = args.returnId;
    if (!returnId) {
      console.error("Error: --returnId is required");
      Deno.exit(1);
    }
    await runCommand(() =>
      getReturnCommand({ returnId, baseDir: RETURNS_DIR })
    );
  } else {
    console.error(
      "Usage:\n" +
        "  tax return create --year 2025\n" +
        "  tax form add --returnId <id> --node_type w2 '{...}'\n" +
        "  tax return get --returnId <id>",
    );
    Deno.exit(1);
  }
}

main();
