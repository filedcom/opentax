# Ongoing pull request workflow

Keep related MeF-readiness work on one ongoing draft pull request targeting
`main`. Push subsequent commits to that PR's branch rather than creating a PR
for each task. Keep its title and description current with the complete diff.

After an authorized merge, fetch the latest `origin/main` and create one new
ongoing branch and draft PR for subsequent work. Preserve local audit records,
evidence, and uncommitted changes while updating the checkout.

The previous batch is merged in [PR #72](https://github.com/filedcom/opentax/pull/72).
Continue on `codex/mef-readiness-ongoing-2`, based on the latest `origin/main`
after that merge. Leave unrelated draft PRs outside this workflow.
