import { assertRejects, assertThrows } from "@std/assert";
import { buildMefXml } from "../../../../mef/builder.ts";
import { testFiler } from "../../../../mef/execution/test-filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";

Deno.test("one identified 1099-K account cannot replay changed income in native or PDF export", async () => {
  const issued = {
    pse_name: "Payment processor",
    pse_tin: "12-3456789",
    recipient_tin: "123-45-6789",
    account_number: "merchant-1",
    box1a_gross_payments: 100,
    for_routing: "schedule_1_line_8j" as const,
    nonbusiness_activity_review: {
      activity_description: "Occasional craft sales",
      included_in_line8j: 100,
      allocation_reference: "2025 payment ledger",
      no_overlap_with_other_1099s: true as const,
      overlap_review_reference: "2025 overlap review",
    },
  };
  const pending = {
    f1099k: {
      f1099ks: [issued, {
        ...issued,
        box1a_gross_payments: 150,
        nonbusiness_activity_review: {
          ...issued.nonbusiness_activity_review,
          included_in_line8j: 150,
        },
      }],
    },
  };
  assertThrows(
    () => buildMefXml(pending, testFiler()),
    Error,
    "repeats the same identified payer, recipient, and account",
  );
  await assertRejects(
    () => buildPdfBytes(pending, testFiler()),
    Error,
    "repeats the same identified payer, recipient, and account",
  );
});

Deno.test("one issued 1099-K reference cannot replay changed income without an account", async () => {
  const issued = {
    pse_name: "Payment processor",
    recipient_tin: "123-45-6789",
    source_document_reference: "issued-processor-copy",
    box1a_gross_payments: 100,
    for_routing: "schedule_1_line_8j" as const,
    nonbusiness_activity_review: {
      activity_description: "Occasional craft sales",
      included_in_line8j: 100,
      allocation_reference: "2025 payment ledger",
      no_overlap_with_other_1099s: true as const,
      overlap_review_reference: "2025 overlap review",
    },
  };
  const pending = {
    f1099k: {
      f1099ks: [issued, {
        ...issued,
        box1a_gross_payments: 150,
        nonbusiness_activity_review: {
          ...issued.nonbusiness_activity_review,
          included_in_line8j: 150,
        },
      }],
    },
  };
  const message = "repeats the same issued source reference";
  assertThrows(() => buildMefXml(pending, testFiler()), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, testFiler()),
    Error,
    message,
  );
});

Deno.test("one issued 1099-K reference cannot replay under a changed processor and account", async () => {
  const issued = {
    pse_name: "Payment processor",
    pse_tin: "12-3456789",
    recipient_tin: "123-45-6789",
    account_number: "merchant-1",
    source_document_reference: "issued-processor-copy",
    box1a_gross_payments: 100,
    for_routing: "schedule_1_line_8j" as const,
    nonbusiness_activity_review: {
      activity_description: "Occasional craft sales",
      included_in_line8j: 100,
      allocation_reference: "2025 payment ledger",
      no_overlap_with_other_1099s: true as const,
      overlap_review_reference: "2025 overlap review",
    },
  };
  const pending = {
    f1099k: {
      f1099ks: [issued, {
        ...issued,
        pse_name: "Other processor",
        pse_tin: "23-4567890",
        account_number: "merchant-2",
        box1a_gross_payments: 150,
        nonbusiness_activity_review: {
          ...issued.nonbusiness_activity_review,
          included_in_line8j: 150,
        },
      }],
    },
  };
  const message = "repeats the same issued source reference";
  assertThrows(() => buildMefXml(pending, testFiler()), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, testFiler()),
    Error,
    message,
  );
});

Deno.test("ambiguous processor copies reject in native and PDF export", async () => {
  const issued = {
    pse_name: "Payment processor",
    pse_tin: "12-3456789",
    recipient_tin: "123-45-6789",
    box1a_gross_payments: 100,
    for_routing: "schedule_1_line_8j" as const,
    nonbusiness_activity_review: {
      activity_description: "Occasional craft sales",
      included_in_line8j: 100,
      allocation_reference: "2025 payment ledger",
      no_overlap_with_other_1099s: true as const,
      overlap_review_reference: "2025 overlap review",
    },
  };
  const pending = {
    f1099k: {
      f1099ks: [issued, {
        ...issued,
        box1a_gross_payments: 150,
        nonbusiness_activity_review: {
          ...issued.nonbusiness_activity_review,
          included_in_line8j: 150,
        },
      }],
    },
  };
  const message = "need distinct account, issued reference, transaction type";
  assertThrows(() => buildMefXml(pending, testFiler()), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, testFiler()),
    Error,
    message,
  );
});
