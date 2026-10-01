# Release artifact smoke check

The release workflow compiles five native assets and runs each asset on a
matching GitHub-hosted architecture before uploading it. The Linux ARM job uses
`ubuntu-24.04-arm`, macOS Intel uses `macos-15-intel`, macOS ARM uses `macos-15`,
and the remaining Linux x64 and Windows x64 jobs use their matching default
runners. A failed smoke step prevents that artifact from being uploaded and
prevents the dependent release job from publishing the set. A manual dispatch
with `dry_run: true` builds and smokes but does not create a release, even when
dispatched from a tag.
The release job writes `SHA256SUMS` from the five downloaded assets and
publishes it beside them. Reviewers can compare each downloaded file with its
recorded digest; the manifest alone does not establish a signature or publisher
identity.

`scripts/smoke-release-binary.ts` invokes the **compiled asset**, not the Deno
source CLI, from an isolated temporary working directory. It checks the injected
version, creates a synthetic TY2025 Single return, adds full filer and W-2
source facts, checks computed wages and withholding, exports finalized MeF XML
with both `IRS1040` and `IRSW2` documents, and loads the exported PDF to require
at least two pages. It never passes `--force` or `--draft`. The temporary return,
XML output, PDF and downloaded IRS template cache are deleted after the run.

For a manually built native asset on a matching machine, run:

```sh
deno run --allow-read --allow-write --allow-run --allow-net=www.irs.gov scripts/smoke-release-binary.ts ./opentax-linux-x64 1.2.3
```

Use the actual asset path and injected version. Cross-compiled assets must be
run on the corresponding architecture. This check proves only that one simple
source-backed return works through the packaged binary on that platform. It is
not the full test suite, TY2025 XSD validation, PDF visual inspection, tax-rule
coverage, malware/signature verification, or IRS ATS acceptance. Those remain
separate release gates. No smoke result is claimed until the workflow runs.
