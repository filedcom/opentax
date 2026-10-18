import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { z } from "zod";
import { zodTemplate } from "./zod-template.ts";

enum Kind {
  Cash = "cash",
  Stock = "stock",
}

const schema = z.object({
  name: z.string().describe("Payer name"),
  ein: z.string().regex(/^\d{9}$/),
  amount: z.number().positive(),
  share: z.number().gt(0).lt(1),
  kind: z.nativeEnum(Kind),
  state: z.enum(["CA"]),
  rows: z.array(z.object({
    code: z.enum(["A", "B"]),
    note: z.string().optional().describe("Row note"),
  })).length(2),
  pick: z.discriminatedUnion("type", [
    z.object({ type: z.literal("us"), zip: z.string() }),
    z.object({ type: z.literal("foreign"), country: z.string() }),
  ]),
  memo: z.string().optional().describe("Memo"),
  forbidden: z.never().optional(),
}).superRefine(() => {});

test("zodTemplate: required fields get typed placeholders", () => {
  const { value, help, optional } = zodTemplate(schema, { full: false });
  assertEquals(value, {
    name: "<string>",
    ein: "<string, matching ^\\d{9}$>",
    amount: 1,
    share: 0.5,
    kind: "<cash | stock>",
    state: "CA",
    rows: [{ code: "<A | B>" }, { code: "<A | B>" }],
    pick: { type: "us", zip: "<string>" },
  });
  assertEquals(help, {
    name: "Payer name",
    pick: "one of type: us | foreign; fields differ by type",
  });
  assertEquals(optional, ["memo", "rows[].note"]);
});

test("zodTemplate: full adds optional fields and their descriptions", () => {
  const { value, help, optional } = zodTemplate(schema, { full: true });
  const row = { code: "<A | B>", note: "<string>" };
  assertEquals(value, {
    name: "<string>",
    ein: "<string, matching ^\\d{9}$>",
    amount: 1,
    share: 0.5,
    kind: "<cash | stock>",
    state: "CA",
    rows: [row, row],
    pick: { type: "us", zip: "<string>" },
    memo: "<string>",
  });
  assertEquals(help.memo, "Memo");
  assertEquals(help["rows[].note"], "Row note");
  assertEquals(optional, []);
});
