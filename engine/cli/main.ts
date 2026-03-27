import { parseArgs } from "@std/cli";
import { createReturnCommand } from "./commands/create-return.ts";
import { formAddCommand } from "./commands/form-add.ts";
import { getReturnCommand } from "./commands/get-return.ts";

const RETURNS_DIR = "./returns";

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["year", "return_id", "node_type"],
  });
  const subcommand = args._[0] as string | undefined;

  if (subcommand === "create-return") {
    const year = Number(args.year);
    if (!year || isNaN(year)) {
      console.error("Error: --year is required and must be a number");
      Deno.exit(1);
    }
    const result = await createReturnCommand({ year, baseDir: RETURNS_DIR });
    console.log(JSON.stringify(result, null, 2));
  } else if (subcommand === "form" && args._[1] === "add") {
    const returnId = args.return_id;
    const nodeType = args.node_type;
    const dataJson = args._[2] as string | undefined;
    if (!returnId || !nodeType || !dataJson) {
      console.error(
        "Error: --return_id, --node_type, and JSON data argument are required",
      );
      Deno.exit(1);
    }
    try {
      const result = await formAddCommand({
        returnId,
        nodeType,
        dataJson,
        baseDir: RETURNS_DIR,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      Deno.exit(1);
    }
  } else if (subcommand === "get-return") {
    const returnId = args._[1] as string | undefined;
    if (!returnId) {
      console.error("Error: return ID argument is required");
      Deno.exit(1);
    }
    try {
      const result = await getReturnCommand({ returnId, baseDir: RETURNS_DIR });
      console.log(JSON.stringify(result, null, 2));
    } catch (err: unknown) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      Deno.exit(1);
    }
  } else {
    console.error("Usage: tax <create-return|form add|get-return> [options]");
    Deno.exit(1);
  }
}

main();
