# Microsoft-only profile approval and manual handoff

Status: separate disabled local draft prepared on 2 October 2026. [flow.manual-handoff.template.json](flow.manual-handoff.template.json) is a WDL template, not an importable ZIP or a cloud-validated flow. It does not replace [flow.template.json](flow.template.json) or the private full-flow candidates. No import, activation, run, approval notification, handoff email or upload has been performed with this variant.

[bindings.manual-handoff.example.json](bindings.manual-handoff.example.json) contains only placeholder values and the three Microsoft connector aliases, with every switch false. Resolve genuine native references and private parameter values during reviewed assembly; keep live bindings outside tracked files.

This variant contains only SharePoint, Standard approvals and Outlook connection aliases. It has no GitHub or HTTP action, no GitHub connection reference, and no `EnableExternalDispatch` parameter. The public destination remains fixed to `maxdiluca/virtualrealitylab` by the unchanged configuration gate. Removing a connector does not certify that the remaining connector combination meets tenant policy; the administrator/designer must confirm it.

The existing manual input, consent attestations, private ledger reservation, selected-file reads, frozen snapshots, sole authenticated approver, seven-day approval timeout, byte/UTF-8 bounds and source re-read equality gates remain unchanged. `DispatchIntentReserved` retains its original schema key for compatibility; for this route it reserves the same immutable submission and proposed manual upload intent. It does not authorize an automatic dispatch. The variant keeps the original fixed, separately controlled failure notice.

The flow state is `Stopped`. `EnableCloudActions`, `EnableHandoffNotifications` and `EnableFailureNotifications` all default to `false`. Enabling cloud actions permits SharePoint reads and creates an approval notification; this requires its own exact runtime authorization. Handoff notification is an additional optional send to the same configured `ProfileApprover`, with no CC/BCC, forwarding or supplied recipient. It has no automatic retry. A timeout does not establish that a message was not delivered; reconcile the same reserved submission before retrying.

After every existing approval, unchanged-file and payload-size gate passes, the flow prepares a local receiver-compatible `event.json`. If handoff notification is separately enabled, the fixed operator task includes three attachments: frozen `index.md`, the frozen selected avatar, and `event.json`. Both file attachments and the event use the original frozen bytes; source files are not fetched again for this handoff. Source-bearing actions retain secure inputs/outputs. The final status is **`approved-awaiting-manual-validation`**, with receiver validation, private preview, GitHub write and publication all explicitly unverified. A successful mail action is not proof of receipt, file integrity or validation.

The event's `sender.login`, repository and approval fields are compatibility labels and assertions. This locally constructed JSON is not an authenticated GitHub event and does not prove consent or publication authority. It is usable only as input to the local receiver's validation/staging path. Do not submit it to an automated publishing path, add credentials, spoof a dispatch environment or pass `--publish`.

## Operator task after an authorized pilot

1. Verify the exact subject/profile/image consent, private final preview and immutable ledger reservation before starting an authorized run. A generated skeleton, folder, default image or approval flag is insufficient. Select one folder only.
2. Wait for `approved-awaiting-manual-validation`. Approval alone is insufficient: the post-approval source re-read can still fail. If the optional handoff email is used, verify actual delivery to the configured operator and download all three attachments to an approved private directory. Keep them at mode `0600`, the directory at `0700`, and out of the repository/cloud sync. If mail is disabled, the owner must establish and verify a private transfer of the exact approval attachments and compatible event; there is no automatic downloadable packet provided by that branch.
3. Independently read the current live `main` commit of `maxdiluca/virtualrealitylab` through the authorized repository UI before building. Verify that the website checkout's HEAD matches that exact SHA and that its tracked files are clean. Then validate the event through the existing local receiver using the pinned CPython 3.12 dependencies. Compare the receiver's staged Markdown and image hashes with the downloaded attachments, including the disclosed filename changes to `_index.md` and `avatar.png`/`avatar.jpg`. Stop on malformed biography, unsafe links/front matter, hidden image metadata, conflicting existing profiles, invalid bytes, changed content or ambiguous identity. An exact existing-profile `no-op` requires reconciliation of the existing files and proposal/ledger record; it must not produce another upload or duplicate PR. A correction requires new exact-preview consent, approval and a new reservation.
4. Run the receiver's actual strict baseline/proposed private Hugo preview before any public upload. Ordinary local staging does **not** perform this build. Use approved extended Hugo `0.152.2`; the check requires `--printPathWarnings --panicOnWarning`, preservation of the existing **author HTML routes**, and exactly one new author HTML route. It does not prove every other site route/output is unchanged. Record the tested base SHA and strict build result. Build success does not establish human review of the rendering: inspect the rendered page and image privately and reconcile the person's consent with that exact final rendering.
5. Immediately before public upload, independently verify the repository's live `main` still equals the recorded `tested_base_sha`. If it changed, stop, rebuild against the new clean base and obtain fresh consent/approval for any changed exact rendering before proceeding. Only with separate exact publication authority, manually upload the receiver-staged two files to a new draft PR targeting `maxdiluca/virtualrealitylab` → `main`. Public upload already discloses content. Read back the exact paths, file bytes/hashes, branch/head, base and draft PR before recording a verified proposal in the private ledger. Verify the tested base remains applicable during that read-back; a moved base requires reconciliation and renewed validation. Stop on unexpected files or uncertain earlier uploads; do not erase the reservation to force a retry.
6. Review and merge separately. Verify the deployed page and image afterwards before recording publication. Neither approval, handoff mail, local validation nor a draft PR proves deployment.

## Local validation and strict preview recipe

Run from a current authorized website checkout, using the receiver's pinned dependencies and the verified extended Hugo executable. Save all three attachments together in the approved private directory. Replace all three private paths and `__VERIFIED_LIVE_MAIN_SHA__` below with the exact current live `main` SHA independently observed through the authorized repository UI. A cached remote-tracking reference or the event's labels do not establish live freshness. The recipe checks clean tracked files and HEAD equality to the supplied SHA; it cannot verify that the supplied SHA was actually read from live GitHub. This runs existing local receiver functions only; it does not call `publish`, use a token or make GitHub API calls. The preview copies only allowlisted tracked website sources. Logs and generated previews must stay private. The self-reported event labels remain untrusted; the operator verifies provenance against the private approval/ledger record independently.

```bash
python -B - /private/path/event.json /private/path/website-checkout /private/path/new-stage-directory __VERIFIED_LIVE_MAIN_SHA__ <<'PY'
import json
import os
from pathlib import Path
import re
import runpy
import sys

code = runpy.run_path("scripts/profile_sync/profile_sync.py")
event_path, repo, output = map(Path, sys.argv[1:4])
verified_live_main_sha = sys.argv[4]
try:
    tested_base_sha = code["fixed_command"](["git", "rev-parse", "--verify", "HEAD"], repo).decode("ascii").strip()
    if (not re.fullmatch(r"[0-9a-f]{40}", verified_live_main_sha)
            or tested_base_sha != verified_live_main_sha):
        code["reject"]("website-base-not-verified-current-main")
    if code["fixed_command"](["git", "status", "--porcelain=v1", "--untracked-files=no"], repo).strip():
        code["reject"]("website-tracked-checkout-not-clean")
    code["safe_directory"](event_path.parent)
    if event_path.is_symlink() or event_path.stat().st_size > 1024 * 1024:
        code["reject"]("event-file-invalid")
    event = json.loads(event_path.read_text(encoding="utf-8"),
                       object_pairs_hook=code["strict_json"])
    result = code["validate_event"](event, repo)
    if result["status"] == "no-op":
        code["reject"]("existing-profile-no-op-reconcile")
    for relative, content in result["files"].items():
        name = ("index.md" if relative.endswith(".md")
                else event["client_payload"]["avatar"]["filename"])
        if code["checked_file"](event_path.parent / name) != content:
            code["reject"]("handoff-attachment-bytes-mismatch")
    code["stage"](result, output)
    code["check_routes"](result, repo, output)
    if (code["fixed_command"](["git", "rev-parse", "--verify", "HEAD"], repo).decode("ascii").strip() != tested_base_sha
            or code["fixed_command"](["git", "status", "--porcelain=v1", "--untracked-files=no"], repo).strip()):
        code["reject"]("website-checkout-changed-during-preview")
    report = {"status": "validated-awaiting-rendered-review-and-publication-authority",
              "content_digest": result["content_digest"],
              "request_digest": result["request_digest"],
              "tested_base_sha": tested_base_sha,
              "strict_hugo_build_verified": True,
              "rendered_preview_review_verified": False,
              "external_write_performed": False}
    fd = os.open(output / "manual-preview-receipt.json", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as receipt:
        receipt.write(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, sort_keys=True))
except code["Rejected"] as error:
    print(json.dumps({"status": "withheld", "reason": str(error)}))
    sys.exit(2)
except Exception:
    print(json.dumps({"status": "withheld", "reason": "input-or-build-invalid"}))
    sys.exit(2)
PY
```

The two staged files, hash receipt and mode-`0600` `manual-preview-receipt.json` are under the selected new staging directory; the rendered proposal is in its `private-preview-proposal/` subdirectory. The receipt binds the build to `tested_base_sha`, records strict build success and leaves human rendered-preview review false. It does not establish live freshness, consent or upload authority. Independently check live `main` again immediately before upload and during draft-PR read-back; stop and repeat validation if the base changed. Preserve a failed stage for private diagnosis and reconciliation; select a genuinely new output directory for an approved retry. A `no-op` stops for reconciliation without staging a duplicate proposal.

## Native schema and stopped import checks

Before packing this variant, inspect only dedicated synthetic actions configured with the existing owner-controlled connections. Capture the native code privately; no helpdesk flow export or real profile records are needed. Read back:

- Manual-trigger field keys, required flags and Boolean attestations.
- SharePoint host/authentication/binding shape and `GetFileContentByPath` parameters; confirm the runtime binary response provides the expected `$content` bytes during a later authorized synthetic run.
- Standard approvals' actual `Basic` enum, assigned-to field, attachment array/content encoding, notifications/reassignment flags and seven-day timeout. Its input/output fields are dynamic. Confirm `responses`, `approverResponse`, authenticated `responder.email` and `outcome` in native schema and later synthetic runtime behavior.
- Outlook's exact native `emailMessage/Attachments` array and `Name`/`ContentBytes` shapes, with all three attachments. Confirm fixed recipient, no CC/BCC and retry `none`. Documentation alone does not prove that the tenant accepts this WDL shape or preserves attachment bytes.
- Three genuine native connection-reference logical names and connector metadata. Do not fabricate native references or substitute run-only-user connections.

Use only the dedicated native solution wrapper, preserve identity/Off metadata, and use official PAC pack/unpack with complete JSON/XML read-back. Use the separate manual-handoff bindings example, rather than the full-flow example that includes GitHub; replace placeholders privately with verified owner-controlled Microsoft bindings. Before an authorized import, verify the existing target flow is Off and clear **Enable Plugin steps and flows included in the solution** where offered. After import, inspect the exact action/reference inventory, private parameter bindings, all false switches, secure settings, native designer/Flow checker, Off state and absence of runs. Privately re-export and compare the saved definition. An Off import/checker success is not runtime validation; a later explicitly authorized synthetic pilot must verify downloaded attachment bytes, private-only delivery, rejection/wrong responder/multiple response/timeout/changed-file handling and manual receiver/preview results.

Microsoft documents [native solution import settings](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/import-update-export-solutions) and [flow state on import](https://learn.microsoft.com/en-us/power-automate/import-flow-solution). Approval attachments need correct binary encoding; verify actual rendering/download behavior. See [approval attachments](https://learn.microsoft.com/en-us/power-automate/approval-attachments). Outlook documents multiple-attachment corruption and possible duplicate sends after timeout/retry; the variant disables automatic write retries and requires byte/delivery read-back. See [Outlook connector](https://learn.microsoft.com/en-us/connectors/office365/).

## Local evidence

Run these checks using the receiver's pinned environment:

```bash
python -B automations/website-profile-sync/powerautomate/test_powerautomate_manual_handoff.py -v
python -B automations/website-profile-sync/powerautomate/test_powerautomate_template.py -v
```

Those commands use the A_LAB preparation layout. In the exported website layout, the receiver and `fixtures/` sit directly under `scripts/profile_sync/`; run:

```bash
python -B scripts/profile_sync/powerautomate/test_powerautomate_manual_handoff.py -v
python -B scripts/profile_sync/powerautomate/test_powerautomate_template.py -v
```

The manual-handoff test selects exactly one of those two explicit receiver/fixture layouts and rejects missing or ambiguous layouts.

Nine new checks pass on 2 October 2026. They exercise disabled controls, capability/recipient/retry/status mutations, preserved original gates, consent and ledger failures, denied/missing/multiple/wrong-responder approvals, changed source bytes, byte budgets, and invalid content/image rejection through the actual receiver. The synthetic packet test materializes the stored expressions, decodes all three attachments, validates the event through the actual receiver and verifies the staged bytes match. The original nine definition checks also pass. These checks do not establish cloud importability, DLP compliance, attachment transport, delivery, authenticated runtime approval or actual Hugo rendering in the tenant pilot. No real profile has been used.

The revised guide recipe also passed Python syntax checking and nine separate synthetic control scenarios: successful bound receipt, malformed/stale base SHA, dirty tracked checkout, attachment mismatch, existing-profile no-op, changed HEAD/dirty checkout during preview, and build failure. The build function was mocked for those recipe control checks; they establish gate and receipt behavior, not an actual Hugo build or human rendering review. Both A_LAB and exported website test layouts were rerun successfully after the guide correction.
