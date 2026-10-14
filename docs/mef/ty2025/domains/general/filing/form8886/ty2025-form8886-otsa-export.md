# TY2025 Form 8886 OTSA export

The integrated Form 8886 workflow supports preparing separate OTSA copies from
an ordinary stored return with a reviewed `f8886` input. This command prepares
files; it does not fax, mail, record delivery, or claim IRS acceptance.
The separate delivery-record command is described below. The October 10
[current integration replay](./ty2025-form8886-reportable-transaction-gap.md#current-integrated-status--october-10-2026)
passes all three OTSA command tests.

```sh
opentax return export-otsa --returnId <id> --requests ./otsa-requests.json --output ./otsa-export
```

Use a new output directory. Existing directories are never overwritten. The
usual return execution and business-rule gates apply. `--force` overrides only
the business-rule gate for review and is recorded in the manifest; it does not
bypass calculation, source, owner, copy-integrity or request checks. Draft
output is rejected because it would change the exact copy.

Supply exactly one request for every prepared disclosure, using the
`disclosure_id` from the public `f8886` input. Each request has its own method,
deadline evidence and sender details. This synthetic example must be replaced
with the actual reviewed facts; its dates are not defaults:

```json
{
  "requests": [
    {
      "disclosure_id": "reviewed-disclosure-1",
      "handoff": {
        "method": "fax",
        "timing": {
          "kind": "initial_return",
          "return_due_date": "2026-04-15",
          "event_source_reference": "Reviewed return due-date record"
        },
        "sender_name": "Example Preparer",
        "sender_title": "Preparer",
        "sender_phone": "5125550100",
        "sender_address": "2 Example Way, Austin TX 78701",
        "prepared_on": "2026-04-01"
      }
    }
  ]
}
```

For special timing, the handoff schema requires the corresponding K-1 receipt,
later designation or published-guidance dates and review references. Ordinary
subsequent disclosures retain a `not_required` decision and no handoff file;
do not infer that status solely from the transaction's first participation year.

The export contains:

- `disclosure-001.pdf`, etc.: unchanged official-form disclosure copies.
- `disclosure-001-fax.pdf`, etc.: one required fax copy with a cover sheet.
  Mail uses the disclosure PDF directly. Each fax file stands alone.
- `prepared-return.xml`: the native return whose disclosure fragments match
  these copies; this is a reference, not an A2A package or acknowledgment.
- `manifest.json`: completion marker written after the artifacts, containing
  file hashes, owner-copy identifiers, destinations, deadlines, past-due flags,
  source/native-copy hashes, preparation state and any requested rule override.

An incomplete directory without `manifest.json` is not a completed export.
After a successful export, follow the per-copy method and destination in the
manifest. Preserve the original export and actual fax log or mailing evidence
separately. This command never marks a copy delivered.

The [IRS Form 8886 instructions](https://www.irs.gov/instructions/i8886), checked
October 9, 2026, specify one disclosure per fax, a 100-page maximum, and a cover
without taxpayer TINs. The candidate enforces these constraints through its
prepared handoff. Current destinations are retained by that handoff module;
recheck IRS instructions before actual delivery.

The parent Form 8886 readiness task remains open. This exporter does not resolve
joint-copy legal policy, unsupported source families, the guarded casualty
route, matched IRS business-rule validation, or proof of actual filing/delivery.

## Retaining reviewed delivery evidence

After a human reviews the completed fax log or mailing evidence against the actual
handoff, retain it with the original export:

```sh
opentax return record-otsa-delivery --returnId <id> \
  --requests <original-handoff-requests.json> --export-dir <original-export-directory> \
  --record <delivery-request.json> --evidence <reviewed-log-or-mailing-record> \
  --output <new-receipt-directory>
```

The delivery request contains `disclosure_id` and a strict `record` object:

```json
{
  "disclosure_id": "copy-1",
  "record": {
    "method": "fax",
    "destination": "844-253-2553",
    "delivered_on": "2026-04-16",
    "source_sha256": "<copy.source_sha256>",
    "xml_sha256": "<copy.native_copy_sha256>",
    "pdf_sha256": "<copy.disclosure_pdf_sha256>",
    "transmission_sha256": "<copy.handoff_sha256>",
    "transmitted_page_count": 3,
    "evidence_sha256": "<SHA-256 of the retained evidence file>",
    "evidence_reference": "Reviewed fax transmission log",
    "reviewed_delivery_result": "completed",
    "reviewer_reference": "Reviewer and review record"
  }
}
```

Replace the angle-bracket placeholders with the exact 64-character lowercase
hexadecimal digests; use the selected copy's method, destination and page count.
For mail, use that copy's disclosure PDF handoff hash and mailing evidence.

The command regenerates the return and handoff using the export's retained
`preparation_timestamp`, then compares the entire original manifest and every
exported file. Changed source data, handoff requests, bytes or review override
state reject recording. If the original export required `--force`, recording
requires the same explicit flag and retains it in the receipt. It does not turn
business-rule failures into passes. Draft output remains rejected.

The new directory contains `evidence.bin`, a byte-for-byte `export-manifest.json`,
and `delivery.json` written last. An existing receipt directory is never
overwritten. A missing final record means an incomplete write. The original
export remains `prepared_not_sent`; the separate receipt records the operator's
review, evidence digest and whether the recorded date is after the prepared due
date. Keep both directories. Receipt status is `reviewed_delivery_recorded`,
with `irs_acceptance: false`.

This command checks internal consistency and retains reviewed evidence. It does
not send a fax, mail a packet, independently authenticate the delivery provider,
or claim IRS acceptance. Exports from before the timestamp field was added
cannot be replayed by this command; retain their original artifacts and evidence
without labeling a newly generated packet as a previously delivered copy.
