export type OptionDef = {
  readonly flag: string;
  readonly description: string;
  readonly required?: boolean;
};

export type ParsedArgs = {
  readonly _: readonly (string | number)[];
  readonly year?: string;
  readonly returnId?: string;
  readonly node_type?: string;
  readonly depth?: string;
  readonly type?: string;
  readonly form?: string;
  readonly entryId?: string;
  readonly json?: boolean;
  readonly help?: boolean;
};

export type CommandDef = {
  readonly cmd: string;
  readonly sub: string;
  readonly description: string;
  readonly usage: string;
  readonly options?: readonly OptionDef[];
  readonly handler: (args: ParsedArgs) => Promise<void>;
};

/**
 * Prints auto-generated help text derived from the command registry.
 *
 * @param commands - Full list of registered commands
 * @param filter   - If provided, only show commands matching this cmd group (e.g. "node")
 */
export function printHelp(
  commands: readonly CommandDef[],
  filter?: string,
): void {
  const visible = filter ? commands.filter((c) => c.cmd === filter) : commands;

  if (filter && visible.length === 0) {
    console.error(`Unknown command group: ${filter}`);
    return;
  }

  const maxUsageLen = Math.max(...visible.map((c) => c.usage.length));

  const lines: string[] = [
    "Tax Engine CLI",
    "",
    "Usage: tax <command> <subcommand> [options]",
    "",
    "Commands:",
    ...visible.map((c) => {
      const gap = " ".repeat(maxUsageLen - c.usage.length + 4);
      return `  ${c.usage}${gap}${c.description}`;
    }),
    "",
    "Global flags:",
    "  --help, -h    Show help",
    "  --json        Output as JSON",
    "",
    filter
      ? `Run 'tax ${filter} <subcommand> --help' for subcommand options.`
      : "Run 'tax <command> --help' for command-group help.",
    "",
  ];

  console.log(lines.join("\n"));
}
