import { assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";

Deno.test("CLI force cannot override calculation failure; draft is explicit and labeled", async () => {
  const cwd = await Deno.makeTempDir();
  const main = fromFileUrl(new URL("../main.ts", import.meta.url));
  const run = (...args: string[]) =>
    new Deno.Command("deno", {
      args: [
        "run",
        "--frozen",
        "--cached-only",
        "--allow-read",
        "--allow-write",
        main,
        ...args,
      ],
      cwd,
      stdout: "piped",
      stderr: "piped",
    }).output();
  try {
    const created = await run("return", "create", "--year", "2025", "--json");
    assertEquals(created.code, 0);
    const { returnId } = JSON.parse(new TextDecoder().decode(created.stdout));
    const common = [
      "return",
      "export",
      "--returnId",
      returnId,
      "--type",
      "mef",
      "--force",
    ];
    for (const extra of [[], ["--draft=false"]]) {
      const finalized = await run(...common, ...extra);
      assertEquals(finalized.code, 1);
      assertEquals(
        new TextDecoder().decode(finalized.stdout).includes("<Return "),
        false,
      );
      assertStringIncludes(
        new TextDecoder().decode(finalized.stderr),
        "executor diagnostic",
      );
    }
    const draft = await run(...common, "--draft");
    assertEquals(draft.code, 0);
    assertStringIncludes(
      new TextDecoder().decode(draft.stdout),
      "DRAFT/INCOMPLETE",
    );
    assertStringIncludes(new TextDecoder().decode(draft.stdout), "<Return ");
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});
