import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { parseEmittedReturn } from "../../../../../../core/validation/emitted-documents.ts";
import { FIELD_REGISTRY } from "../../../field-registry.ts";
import { F8862_RULES } from "./f8862.ts";

function failing(form8862: string): string[] {
  const ctx = createReturnContext(
    {},
    { primarySSN: "123456789", filingStatus: 1 },
    FIELD_REGISTRY,
    new Map([["form8862", 1]]),
    parseEmittedReturn(
      `<Return><ReturnData><IRS8862 documentId="A"><TaxYr>2025</TaxYr>${form8862}</IRS8862></ReturnData></Return>`,
    ),
  );
  return ["F8862-008", "F8862-009", "F8862-010"].filter((number) => {
    const rule = F8862_RULES.find((entry) => entry.ruleNumber === number)!;
    return !(ctx.forRulePrefix?.("F8862") ?? [ctx]).every((scope) =>
      rule.check!(scope)
    );
  });
}

const ctcChild =
  `<CTCACTCODCClaimedInd>X</CTCACTCODCClaimedInd><CTCACTCChildInformationGrp><LiveWithChildOverHalfYearInd>true</LiveWithChildOverHalfYearInd><QualifyingChildInd>true</QualifyingChildInd><DependentInd>true</DependentInd></CTCACTCChildInformationGrp>`;

test("F8862 Part II rules read line 6, not a Part III CTC child's answer", () => {
  assertEquals(failing(ctcChild), []);
  assertEquals(
    failing(`<QualifyingChildInd>true</QualifyingChildInd>${ctcChild}`),
    ["F8862-010"],
  );
  assertEquals(
    failing(
      `<QualifyingChildInd>false</QualifyingChildInd>${
        ctcChild.replace(">true</QualifyingChildInd>", ">false</QualifyingChildInd>")
      }`,
    ),
    ["F8862-008"],
  );
});
