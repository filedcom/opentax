# TY2025 joint-return submission replay — October 12

Five complete public-entry returns now exercise JSON-persisted pending data,
prepared native bundles, individual submission ZIPs and a mixed A2A container.
Four are the reviewed joint QBI loss/WOTC/dividend cases, with distinct synthetic
taxpayer/spouse pairs; the fifth is a single-filer Form5695 door inventory with
one generated Additional QMID Statement. No production packaging logic changes.

The shared dividend fixture preserves all four previously retained input/filer
pairs exactly after JSON serialization. Its extraction avoids maintaining a
second copy of the source construction. The four established total taxes remain
141,959 / 141,910 / 141,862 / 98,002 after the identity changes and JSON replay.
Each native return retains four Schedule C copies (primary/spouse/primary/spouse),
two owned Schedule SE copies, two 1,200 group-credit shares and resolved statement
references. Independent XML extraction also verifies business profits
2,000 / 4,000 / -1,000 / -2,000 and owner half-SE deductions14/142.

Forward and reversed containers retain all five exact inner ZIPs and the matching
submission IDs/electronic postmarks. Each ZIP contains exactly its manifest,
return XML and required binary files. The joint returns use native statements;
only the Form5695 return has a binary attachment.

| Rejected alteration | Count |
| --- | ---: |
| Another return's archived XML or manifest | 10 |
| Another return's filer, prepared bundle or residency review | 15 |
| Missing spouse review or primary TIN substituted for spouse | 8 |
| Dangling statement reference or duplicate document ID, with recomputed XML digest and ZIP | 8 |
| Missing generated attachment or duplicate submission ID | 2 |

All43 alterations reject. The focused integration test passes, and47 related
submission/archive/evidence tests pass with zero failures or ignored tests.
Focused lint and diff checks pass. The existing dividend packet tests use the
same extracted fixture; deep comparison proves their sources are unchanged.

Independent Python ZIP extraction and XML parsing verifies both containers,
all owner copies and references, and the exact retained bytes. All five full
Return1040 documents and five submission manifests validate against retained
TY2025v5.4 IRS schemas; schema paths and digests are recorded. The single generated
attachment was reopened and rendered: its name, exterior-door overflow QMID A0B3
and500 cost agree with the source; the first three QMIDs remain in the native
form. This one-page statement review is separate from full-return PDF review.

Evidence: `.state/research/submission-joint-replay-2026-10-12/` contains source,
filer and persisted-pending records, five ZIP/XML/manifest sets, both containers
and request bodies, XSD logs, independent verification, fixture equivalence and
test logs, and the rendered statement. Synthetic residency, EFIN and software
identifiers are test inputs, not verified filing credentials.

This proves the retained archive/package construction boundary. It does not
validate the request body against an IRS service WSDL/XSD, perform a signed SOAP
exchange, record an actual send, or establish IRS acceptance. The existing A2A
evidence-ledger taxpayer lookup issue and consistently replaced/rehashed generated
statement issue (deferred148) remain unchanged; these tests do not repair or
claim coverage of those paths. Prior native joint-name qualification68 also
remains. No main-board parent closes, and earlier complete-return/PDF totals are
not incremented for these archive replays.

Reproduce the focused gate:

```sh
deno test -A forms/f1040/2025/mef/submissions/submission-joint-replay.test.ts
```
