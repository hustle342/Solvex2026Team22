Title: Release prep: Tag v2.0 + changelog + release notes
Labels: release,docs,sprint-3
Assignees: @release-manager

Description:
Prepare the `v2.0` release: finalize `CHANGELOG.md`, tag the release, and publish release notes.

Acceptance criteria:
- `CHANGELOG.md` updated with all merged PR summaries.
- Git tag `v2.0` created on the release commit.
- Drafted GitHub Release with bullets and migration notes.

Steps:
1. Collate merged PRs since last release.
2. Write and commit `CHANGELOG.md` entry.
3. Create tag and push, then create release on GitHub.
4. Announce release to team channel.

Notes:
Prefer `squash` merges for a single clean release commit if possible.