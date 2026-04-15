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
  readonly force?: boolean | string;
  readonly format?: string;
  readonly output?: string;
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

export type TopLevelDef = {
  readonly usage: string;
  readonly description: string;
};

/**
 * Prints auto-generated help text derived from the command registry.
 *
 * @param commands    - Full list of registered commands
 * @param filter      - If provided, only show commands matching this cmd group (e.g. "node")
 * @param topLevel    - Top-level commands (no subcommand) to show in a separate section
 */
export function printHelp(
  commands: readonly CommandDef[],
  filter?: string,
  topLevel?: readonly TopLevelDef[],
): void {
  const visible = filter ? commands.filter((c) => c.cmd === filter) : commands;

  if (filter && visible.length === 0) {
    console.error(`Unknown command group: ${filter}`);
    return;
  }

  const maxUsageLen = Math.max(...visible.map((c) => c.usage.length));

  const lines: string[] = [
    "Filed OpenTax CLI",
    "",
    "Usage: opentax <command> <subcommand> [options]",
    "",
    "Commands:",
    ...visible.map((c) => {
      const gap = " ".repeat(maxUsageLen - c.usage.length + 4);
      return `  ${c.usage}${gap}${c.description}`;
    }),
  ];

  if (!filter && topLevel && topLevel.length > 0) {
    const maxTopLen = Math.max(...topLevel.map((t) => t.usage.length));
    lines.push("", "Utility commands:");
    for (const t of topLevel) {
      const gap = " ".repeat(maxTopLen - t.usage.length + 4);
      lines.push(`  ${t.usage}${gap}${t.description}`);
    }
  }

  lines.push(
    "",
    "Global flags:",
    "  --help, -h    Show help",
    "  --json        Output as JSON",
    "",
    filter
      ? `Run 'opentax ${filter} <subcommand> --help' for subcommand options.`
      : "Run 'opentax <command> --help' for command-group help.",
    "",
  );

  console.log(lines.join("\n"));
}
