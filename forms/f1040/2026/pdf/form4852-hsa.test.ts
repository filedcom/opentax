import { assertEquals } from "@std/assert";
import { form4852HsaGraph2026 } from "../inputs/form4852-hsa.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
Deno.test("2026 HSA substitute bundle reconciles Form 4852 with HFD income, Form 8889 and annual IRA basis", async () => {
  const g = form4852HsaGraph2026();
  Object.assign(g.general, {
    address_line1: "100 Synthetic Street",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  });
  const b = await buildDraftReturnPdf2026(g);
  const page = (name: string, index = 0) =>
    b.attachments.find((a) => a.form === name)!.formPages[index];
  assertEquals(b.sourceAttachments, []);
  assertEquals(b.filingReady, false);
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, b.bytes);
    const text = async (p: number, rect: number[]) => {
      const r = await new Deno.Command("pdftotext", {
        args: [
          "-layout",
          "-f",
          String(p),
          "-l",
          String(p),
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
    assertEquals(await text(1, [253, 606, 70, 12]), "1500");
    assertEquals(await text(1, [505, 606, 71, 12]), "450");
    assertEquals(
      await text(page("f4852:ira-copy"), [237, 432, 73, 12]),
      "1500.00",
    );
    assertEquals(await text(page("f4852:ira-copy"), [237, 444, 73, 12]), "");
    assertEquals(
      await text(page("form8889:taxpayer"), [410, 372, 74, 12]),
      "1000",
    );
    assertEquals(
      await text(page("form8606:taxpayer"), [505, 684, 71, 12]),
      "150",
    );
    assertEquals(
      await text(page("form8606:taxpayer", 1), [505, 144, 71, 12]),
      "450",
    );
    assertEquals(
      await text(page("form5329:taxpayer"), [505, 300, 71, 12]),
      "45",
    );
  } finally {
    await Deno.remove(file);
  }
});
