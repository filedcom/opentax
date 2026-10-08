import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { form8814 } from "../../../mef/forms/investments/f8814.ts";
import { form8814Pdf } from "../../../pdf/forms/investments/f8814.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import {
  calculateForm8814,
  type F8814Item,
} from "../../../../nodes/inputs/f8814/index.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
function child(second = false): F8814Item {
  const income = second
    ? { interest_income: 3700, dividend_income: 500, qualified_dividends: 100 }
    : {
      interest_income: 2000,
      dividend_income: 3000,
      qualified_dividends: 2400,
      capital_gain_distributions: 1000,
    };
  const adjustments = second
    ? {
      nominee_distribution: 120,
      accrued_interest: 30,
      abp_adjustment: 15,
      oid_adjustment: 5,
    }
    : undefined;
  const ssn = second ? "987654322" : "987654321";
  return {
    child_name: second ? "Jamie Child" : "Casey Child",
    child_name_control: "CHIL",
    child_ssn: ssn,
    child_age_eligible: true,
    child_required_to_file: true,
    child_income_only_permitted_types: true,
    child_no_joint_return: true,
    child_no_estimated_payments: true,
    child_no_withholding: true,
    parent_eligible_to_elect: true,
    ...income,
    interest_adjustments: adjustments,
    source_review: {
      source_document_reference:
        `reviewed-2025-child-${ssn}-interest-dividends`,
      tax_year: 2025,
      child_ssn: ssn,
      electing_parent_ssn: "111223333",
      eligibility_reviewed: true,
      income,
      interest_adjustments: adjustments,
    },
  };
}

Deno.test("Form8814 mixed child sources recalculate native/PDF lines and full-return owner copies", async () => {
  const artifactFlag = Deno.args.indexOf("--write-review-artifacts");
  const artifactRoot = artifactFlag >= 0
    ? Deno.args[artifactFlag + 1]
    : undefined;
  for (const multiple of [false, true]) {
    const items = multiple ? [child(), child(true)] : [child()];
    const inputs = {
      ...structuredClone(base.inputs),
      f8814: items,
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const lines = items.map(calculateForm8814);
    assertEquals(lines[0].line9, 1320);
    assertEquals(lines[0].line10, 550);
    assertEquals(lines[0].line12, 1430);
    if (multiple) {
      assertEquals(lines[1].line9, 36);
      assertEquals(lines[1].line12, 1464);
    }
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals((bundle.xml.match(/<IRS8814\b/g) ?? []).length, items.length);
    assertEquals(
      bundle.xml.includes(
        "<ChildQualifiedDividendAdjAmt>1320</ChildQualifiedDividendAdjAmt>",
      ),
      true,
    );
    assertEquals(
      bundle.xml.includes(
        "<ChildCapitalGainDistriAdjAmt>550</ChildCapitalGainDistriAdjAmt>",
      ),
      true,
    );
    assertEquals(
      Number(result.pending.f1040.line3a_qualified_dividends),
      multiple ? 1356 : 1320,
    );
    assertEquals(
      Number(result.pending.f1040.line3b_ordinary_dividends),
      multiple ? 1356 : 1320,
    );
    assertEquals(
      Number(result.pending.schedule1.line8z_form8814),
      multiple ? 2894 : 1430,
    );
    assertEquals(
      Number(result.pending.f1040.form8814_tax),
      multiple ? 270 : 135,
    );
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    assertEquals(
      origins.filter((x) => x.formKey === "form8814").length,
      multiple ? 3 : 1,
    );
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, temp],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally {
      await Deno.remove(temp);
    }
    for (
      const key of [
        "line9",
        "line10",
        "line12",
        "line15",
        "dependentPtcMagi",
        "line12InvestmentIncome",
      ] as const
    ) {
      const altered = { ...lines[0], [key]: lines[0][key] + 1 };
      assertThrows(
        () => form8814.build({ items: [altered] }, { filer }),
        Error,
        `calculated ${key}`,
      );
      assertThrows(
        () => form8814Pdf.instances?.({ items: [altered] }, filer),
        Error,
        `calculated ${key}`,
      );
      const changed = {
        ...pending,
        form8814: { items: [altered, ...(multiple ? [lines[1]] : [])] },
      };
      await assertRejects(() =>
        buildMefBundle(changed, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
    assertThrows(
      () => form8814.build({ items: [lines[0], lines[0]] }, { filer }),
      Error,
      "twice for the same child",
    );
    assertThrows(
      () => form8814Pdf.instances?.({ items: [lines[0], lines[0]] }, filer),
      Error,
      "twice for the same child",
    );
    if (artifactRoot) {
      const path = `${artifactRoot}/${
        multiple ? "mixed_two_children" : "mixed_single_child"
      }`;
      await Deno.mkdir(path, { recursive: true });
      await Deno.writeFile(`${path}/return.pdf`, pdf);
      await Deno.writeTextFile(`${path}/return.xml`, bundle.xml);
      await Deno.writeTextFile(
        `${path}/source-pending.json`,
        JSON.stringify(
          {
            inputs,
            filer,
            pending: normalizeAllPending(result.pending),
            preparedPending: bundle.pending,
            carryforwards: result.carryforwards,
            origins,
          },
          null,
          2,
        ),
      );
    }
  }
});
