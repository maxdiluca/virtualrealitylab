# Approved website profile receiver

Status: staged implementation, disabled by default. This package is designed for
`maxdiluca/virtualrealitylab`, base branch `main`, and authentic GitHub
`repository_dispatch` events whose `sender.login` is `maxdiluca`. Installing this
code or passing tests does not approve publication, connect Power Automate, or
establish a live service.

Deploy this directory's Python, requirements, tests, fixtures, README and
`powerautomate/` instructions under `scripts/profile_sync/` in the website
repository. Deploy `profile-sync.yml` as `.github/workflows/profile-sync.yml`.
Do not merge or enable without the website owner's exact-version review.

Use CPython 3.12 and the pinned dependencies:

```bash
python -m pip install -r scripts/profile_sync/requirements.txt
python -B -m unittest discover -s scripts/profile_sync -p 'test_profile_sync.py' -v
python -B scripts/profile_sync/profile_sync.py --event-json /private/path/event.json --repo /private/path/website-checkout --output /private/path/new-staging-directory
```

Local staging writes two approved files and a hash receipt in a new private
directory; it performs no network calls. Payload Markdown/image content and
person fields are never printed. Do not use real source records in this public
package or its fixtures. The sole fixture is synthetic.

The event action is `vr-lab-profile-approved-v1`. `client_payload` has exactly
these six keys:

```json
{
  "schema_version": 1,
  "request_id": "opaque-synthetic-reserved-key",
  "folder": "Synthetic_Member",
  "profile_markdown": "---\n...\n---\n\nApproved biography text...",
  "avatar": {"filename": "selected.png", "content_base64": "..."},
  "approval": {"profile_approved": true, "image_approved": true}
}
```

Folder names start with an ASCII letter and contain at most 80 ASCII letters,
digits, underscores or hyphens. Request IDs contain at most 100 such characters
and start with a letter or digit. The private sender ledger reserves each
request ID for one immutable approved snapshot; the receiver never treats a
payload assertion as proof of real consent. The configured connection and
protected GitHub environment must establish that provenance.

The entire compact UTF-8 payload is limited to 60,000 bytes. Markdown is limited
to 16,000 UTF-8 bytes and the decoded image to 32 KiB. Supported front matter is
`title`, `authors`, `superuser`, `role`, `organizations`, `user_groups`, and
optional `interests`/`social`. The author list must equal the exact folder name;
`superuser` must be false and groups must match the site's explicit group list.
The initial generated skeleton is incomplete: a useful biography is required.
This first release accepts prose, lists and emphasis; raw HTML, Hugo shortcodes,
Markdown links/code, YAML aliases/tags and unknown fields require human review.
Public links must be HTTPS and belong in validated organization/social fields.

Approval covers the exact Markdown and image bytes, including the announced
path changes: `index.md` becomes `_index.md`, and the selected picture becomes
`avatar.png` or `avatar.jpg`. Existing `_index.md` or `index.md` names are
preserved during duplicate comparison. The receiver does not normalize YAML,
remove null placeholders, rotate, crop or reencode images after approval.
Pillow verifies and fully decodes images. PNG accepts only required pixel and
transparency chunks; JPEG accepts basic/progressive image markers, basic JFIF
without embedded thumbnails and fixed Adobe color information. EXIF, XMP,
comments, ICC/unknown metadata, animation, oversized dimensions and trailing
data are withheld. Clean such an image privately and obtain new approval of
the cleaned file before submitting it.

This release adds new profiles only. Existing author directories must contain
exactly the same two files and bytes for a no-op; case collisions, extra files
or changed content require human review. One deterministic branch,
`codex/profile-sync/<lowercase-folder>`, holds a pending proposal. A retry reads
and verifies that branch's one-commit, two-added-file changes and exact bytes
before creating/reconciling its draft pull request. An edited branch or closed
proposal is a stopping condition; no force-push, overwrite, delete or auto-merge
is implemented.

Publishing additionally requires `--publish`, `PROFILE_SYNC_ENABLED=true`, the
fixed repository/base environment bindings, an authentic dispatch context and
`GITHUB_TOKEN`. Checkout HEAD must match the event SHA and current remote main.
Before any mutation, the receiver uses Git's tracked-file list to copy only
the website's `assets/`, `config/`, `content/`, `layouts/` and `static/` source,
plus exactly `go.mod`, `go.sum` and `theme.toml`, to private temporary directories.
It filters unrelated tracked names before inspecting or copying their files;
operational outputs, root mail, local settings and generated artifacts stay
outside the snapshot. Symlinks inside the selected source are rejected and the
selected bytes remain limited to 250 MiB. Unknown build dependencies must fail
the real baseline build rather than silently broadening this allowlist. It uses exact
extended Hugo 0.152.2 for baseline and proposed builds with
`--printPathWarnings --panicOnWarning`. The proposed build must add exactly one
author HTML route. Build tools receive a minimal environment without GitHub
tokens; build output is captured privately. No Python approximation of Hugo's
title/slug rules is used. A missing tool, existing warning, route collision,
missing rendered author page or changed base stops the write.

The workflow installs the official extended Linux Hugo archive only after
checking its fixed SHA-256. It uses immutable GitHub Action commit pins, runs
synthetic tests with read-only permissions, and limits the write job to the
trusted dispatch on main. Setup must create the `website-profile-review`
environment with an independent required reviewer, prevent self-approval,
restrict it to main, retain branch protections, and permit GitHub Actions to
create pull requests. Enable the repository variable only after a private
synthetic full-site build and a controlled draft-PR/read-back exercise. A missing
environment protection cannot be inferred from its name and must be checked.

This is a cloud workflow invoked by Power Automate, not a local poller. It does
not merge, deploy, change existing profiles, prove institutional authority,
clean source folders, alert people, or verify a live deployed page. GitHub may
require explicit follow-up checks/workflows for PRs created by `GITHUB_TOKEN`;
do not assume a draft PR triggered every existing CI or deploy workflow.
Publication remains a separate owner-reviewed merge followed by a check of the
deployed page and selected image. Never broaden the sender or field allowlists
to work around a withheld submission.

Full-site validation on 2 October 2026 reached an existing build blocker at
website base `f7be0695c2061e249deee020167778fed5e55ca0`: the pinned
`blox-seo` module places a sitemap in the render-hook directory. A private
configuration-only remount removed that warning, but the same strict baseline
then stopped on deprecated `_build` front matter and four existing duplicate
author routes. The configuration experiment is not included in this package.
The synthetic proposal build has not passed; resolve the existing site issues
under website-owner review before the pilot. Keep the warning gate enabled.
