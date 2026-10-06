import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8992Filer, form8992Pending } from "../../form8992.fixture.ts";
import {
  documentId,
  validateDocumentReferences,
} from "../document-identity.ts";
import type { MefDocumentFragment } from "../document-identity.ts";
import { form5471 } from "./f5471.ts";
import {
  form5471ReferenceNames,
  form5471RequiredScheduleKeys,
} from "./f5471-linkage.ts";
import { form5471ScheduleE } from "./f5471_schedule_e.ts";
import { form5471ScheduleH } from "./f5471_schedule_h.ts";
import { form5471ScheduleI1 } from "./f5471_schedule_i1.ts";
import { form5471ScheduleJ } from "./f5471_schedule_j.ts";
import { form5471ScheduleM } from "./f5471_schedule_m.ts";
import { form5471ScheduleP } from "./f5471_schedule_p.ts";
import { form5471ScheduleQ } from "./f5471_schedule_q.ts";
import { form5471ScheduleR } from "./f5471_schedule_r.ts";

const schedules = [
  form5471ScheduleE,
  form5471ScheduleH,
  form5471ScheduleI1,
  form5471ScheduleJ,
  form5471ScheduleM,
  form5471ScheduleP,
  form5471ScheduleQ,
  form5471ScheduleR,
];
const context = { filer: form8992Filer, pending: form8992Pending };
function discovered(sourceContext = context) {
  return [form5471, ...schedules].map((form) => ({
    pendingKey: form.pendingKey,
    xml: form.build({}, { ...sourceContext, phase: "discovery" }),
  })).map((f) => ({ ...f, tag: /^<([^ >]+)/.exec(f.xml)![1] }));
}
function inventories(fragments = discovered()) {
  return {
    documentIdsByPendingKey: Object.fromEntries(
      fragments.map((f, i) => [f.pendingKey, [documentId(f.tag, i)]]),
    ),
    documentIdsByTag: Object.fromEntries(
      fragments.map((f, i) => [f.tag, [documentId(f.tag, i)]]),
    ),
  };
}
function linked(sourceContext = context): MefDocumentFragment[] {
  const fragments = discovered(sourceContext);
  return [{
    ...fragments[0],
    xml: form5471.build({}, {
      ...sourceContext,
      ...inventories(fragments),
      phase: "final",
    }),
  }, ...fragments.slice(1)];
}

Deno.test("Actual Category4/5a source parent links each required owned schedule without zero distribution", () => {
  const fragments = linked();
  validateDocumentReferences(fragments);
  const root = fragments[0].xml;
  const expected = form5471RequiredScheduleKeys.map(([, tag], i) =>
    documentId(tag, i + 1)
  );
  assertStringIncludes(root, `referenceDocumentId="${expected.join(" ")}"`);
  assertStringIncludes(
    root,
    `referenceDocumentName="${form5471ReferenceNames}"`,
  );
  assertEquals(fragments.length, 9);
  const r = fragments.at(-1)!.xml;
  assertEquals(r.includes("DistributionDt"), false);
  assertEquals(r.includes("DistributionsFromFrgnCorpGrp"), false);
  assertEquals(r.includes("referenceDocumentId"), false);
  assertEquals(discovered()[0].xml.includes("referenceDocumentId"), false);
  assertEquals(
    root.replace(/ referenceDocument(?:Id|Name)="[^"]*"/g, ""),
    discovered()[0].xml,
  );
});

Deno.test("Actual EIN-only corporation source preserves identity throughout parent and eight linked schedules", () => {
  const cfc = {
    ...form8992Pending.f5471.f5471s[0],
    foreign_corp_reference_id: undefined,
    foreign_corp_ein: "123456789",
  };
  const sourceContext = {
    ...context,
    pending: { ...form8992Pending, f5471: { f5471s: [cfc] as const } },
  };
  const fragments = linked(sourceContext);
  validateDocumentReferences(fragments);
  assertStringIncludes(
    fragments[0].xml,
    "<EmployerEIN>123456789</EmployerEIN>",
  );
  for (const f of fragments.slice(1)) {
    assertStringIncludes(
      f.xml,
      "<ForeignCorporationEIN>123456789</ForeignCorporationEIN>",
    );
    assertEquals(f.xml.includes("ForeignEntityReferenceIdNum"), false);
  }
});

Deno.test("Form5471 final linkage rejects missing, duplicate, swapped and detached inventory IDs", () => {
  const base = inventories();
  assertThrows(() => form5471.build({}, { ...context, phase: "final" }), Error);
  for (const [key, tag] of form5471RequiredScheduleKeys) {
    for (const ids of [[], ["bad", "second"], ["bad"]]) {
      assertThrows(
        () =>
          form5471.build({}, {
            ...context,
            ...base,
            phase: "final",
            documentIdsByPendingKey: {
              ...base.documentIdsByPendingKey,
              [key]: ids,
            },
          }),
        Error,
      );
      assertThrows(
        () =>
          form5471.build({}, {
            ...context,
            ...base,
            phase: "final",
            documentIdsByTag: { ...base.documentIdsByTag, [tag]: ids },
          }),
        Error,
      );
    }
  }
  const duplicated = Object.fromEntries(
    form5471RequiredScheduleKeys.map(([key]) => [key, ["same"]]),
  );
  const duplicatedTags = Object.fromEntries(
    form5471RequiredScheduleKeys.map(([, tag]) => [tag, ["same"]]),
  );
  assertThrows(
    () =>
      form5471.build({}, {
        ...context,
        phase: "final",
        documentIdsByPendingKey: duplicated,
        documentIdsByTag: duplicatedTags,
      }),
    Error,
  );
});

Deno.test("Final native integrity rejects parent reference and per-schedule source-owner/corporation mutations", () => {
  const base = linked();
  const mutate = (index: number, transform: (xml: string) => string) =>
    base.map((f, i) => i === index ? { ...f, xml: transform(f.xml) } : f);
  for (
    const transform of [
      (s: string) => s.replace(/ referenceDocumentId="[^"]*"/, ""),
      (s: string) =>
        s.replace(
          /referenceDocumentId="[^"]*"/,
          'referenceDocumentId="missing"',
        ),
      (s: string) =>
        s.replace(
          /referenceDocumentName="[^"]*"/,
          'referenceDocumentName="IRS5471ScheduleR"',
        ),
      (s: string) => s.replace("IRS5471ScheduleR8", "IRS5471ScheduleQ7"),
    ]
  ) assertThrows(() => validateDocumentReferences(mutate(0, transform)), Error);
  for (let i = 1; i < base.length; i++) {
    assertThrows(
      () => validateDocumentReferences(base.filter((_, j) => i !== j)),
      Error,
    );
    assertThrows(() => validateDocumentReferences([...base, base[i]]), Error);
    for (
      const transform of [
        (s: string) =>
          s.replace("<SSN>111223333</SSN>", "<SSN>999887777</SSN>"),
        (s: string) =>
          s.includes("<ForeignCorporationEIN>")
            ? s.replace(
              /<ForeignCorporationEIN>[^<]+/,
              "<ForeignCorporationEIN>987654321",
            )
            : s.replace(
              "</ForeignCorporationName>",
              "</ForeignCorporationName><ForeignCorporationEIN>987654321</ForeignCorporationEIN>",
            ),
        (s: string) =>
          s.replace(
            "<ForeignEntityReferenceIdNum>FC001",
            "<ForeignEntityReferenceIdNum>FC002",
          ),
      ]
    ) {
      assertEquals(transform(base[i].xml) !== base[i].xml, true);
      assertThrows(
        () => validateDocumentReferences(mutate(i, transform)),
        Error,
      );
    }
  }
});

Deno.test({
  name:
    "Linked actual Category4/5a parent satisfies canonical v5.4 XSD fixed reference names",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xsd = new URL(
      "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS5471/IRS5471.xsd",
      import.meta.url,
    ).pathname;
    const fragments = linked();
    const xml = fragments[0].xml.replace(
      /^<IRS5471/,
      '<IRS5471 xmlns="http://www.irs.gov/efile" documentId="IRS54710"',
    );
    const child = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const result = await child.output();
    assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
    const dir = Deno.env.get("FORM5471_LINKAGE_EVIDENCE_DIR");
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify(form8992Pending, null, 2) + "\n",
      );
      await Deno.writeTextFile(`${dir}/linked-parent.xml`, xml);
      await Deno.writeTextFile(
        `${dir}/linked-fragments.json`,
        JSON.stringify(fragments, null, 2) + "\n",
      );
      await Deno.writeTextFile(
        `${dir}/document-inventory.json`,
        JSON.stringify(inventories(), null, 2) + "\n",
      );
    }
  },
});
