import { assertEquals } from "@std/assert";
import { planRolloverBasisGraph2026 } from "../inputs/plan-rollover-basis.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";

Deno.test("2026 draft return prints incoming plan basis through Form 8606 and early tax", async () => {
  const g = planRolloverBasisGraph2026();
  // No issuer attachment is required for this original statement with no withholding.
  g.f1099r!.claim.copies[0].box4_federal_withheld = 0;
  g.f1099r!.claim.ira_basis!.owners[0].distributions[0].cash_paid_to_owner =
    10000;
  const b = await buildDraftReturnPdf2026(g);
  assertEquals(b.filingReady, false);
  const basis = b.attachments.find((a) => a.form === "form8606:taxpayer")!;
  const early = b.attachments.find((a) => a.form === "form5329:taxpayer")!;
  const substitute = b.attachments.find((a) =>
    a.form === "f4852:substitute-2026"
  )!;
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, b.bytes);
    const text = async (page: number, rect: number[]) => {
      const r = await new Deno.Command("pdftotext", {
        args: [
          "-layout",
          "-f",
          String(page),
          "-l",
          String(page),
          "-x",
          String(rect[0]),
          "-y",
          String(rect[1]),
          "-W",
          String(rect[2]),
          "-H",
          String(rect[3]),
          file,
          "-",
        ],
      }).output();
      assertEquals(r.code, 0);
      return new TextDecoder().decode(r.stdout).trim();
    };
    assertEquals(await text(1, [253, 606, 70, 12]), "10000");
    assertEquals(await text(1, [505, 606, 71, 12]), "9000");
    assertEquals(await text(1, [505, 630, 71, 12]), "0");
    assertEquals(await text(basis.formPages[0], [505, 684, 71, 12]), "3000");
    assertEquals(await text(basis.formPages[1], [505, 144, 71, 12]), "9000");
    assertEquals(await text(early.formPages[0], [505, 300, 71, 12]), "900");
    assertEquals(
      await text(substitute.formPages[0], [237, 444, 73, 12]),
      "0.00",
    );
    assertEquals(
      await text(substitute.formPages[0], [504, 492, 73, 12]),
      "2000.00",
    );
  } finally {
    await Deno.remove(file);
  }
});
