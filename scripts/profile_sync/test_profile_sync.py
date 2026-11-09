"""Synthetic-only correctness and failure tests; no real sources or network."""
import base64
from copy import deepcopy
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, unquote, urlsplit

from PIL import Image, PngImagePlugin
import profile_sync as sync

HERE = Path(__file__).parent
BASE = "a" * 40
HEAD = "b" * 40
TREE = "c" * 40


def image_bytes(format="PNG", size=(16, 16), **kwargs):
    output = io.BytesIO()
    Image.new("RGB", size, color=(30, 80, 120)).save(output, format=format, **kwargs)
    return output.getvalue()


def fixture():
    return json.loads((HERE / "fixtures" / "approved-event.json").read_text())


class ReceiverTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name).resolve()
        self.repo = self.root / "website"
        (self.repo / "content" / "authors").mkdir(parents=True)
        self.event = fixture()
        self.payload = self.event["client_payload"]
        # Tests explicitly use synthetic generated pixels, not a personal photo.
        self.payload["avatar"]["content_base64"] = base64.b64encode(image_bytes()).decode()

    def tearDown(self):
        self.temporary.cleanup()

    def reject(self, code=None):
        with self.assertRaises(sync.Rejected) as caught:
            sync.validate_event(self.event, self.repo)
        if code is not None:
            self.assertEqual(str(caught.exception), code)

    def test_happy_path_preserves_approved_bytes_and_known_path_renames(self):
        result = sync.validate_event(self.event, self.repo)
        prefix = "content/authors/Synthetic_Member/"
        self.assertEqual(result["status"], "staged")
        self.assertEqual(result["files"][prefix + "_index.md"], self.payload["profile_markdown"].encode())
        self.assertEqual(result["files"][prefix + "avatar.png"], base64.b64decode(self.payload["avatar"]["content_base64"]))
        self.assertEqual(result["branch"], "codex/profile-sync/synthetic_member")
        self.assertIn("interests: [null]", result["files"][prefix + "_index.md"].decode())

    def test_committed_synthetic_fixture_is_valid_without_replacement(self):
        self.assertEqual(sync.validate_event(fixture(), self.repo)["status"], "staged")

    def test_prose_scalar_cannot_embed_markdown_or_autolink(self):
        for role in ["[Click](https://example.org)", "www.example.org", "https://example.org", "name@example.org", "`code`"]:
            event = deepcopy(self.event)
            event["client_payload"]["profile_markdown"] = self.payload["profile_markdown"].replace("role: Synthetic Project Student", "role: '" + role + "'")
            with self.assertRaises(sync.Rejected):
                sync.validate_event(event, self.repo)

    def test_immutable_digest_changes_with_one_approved_byte(self):
        first = sync.validate_event(self.event, self.repo)
        self.payload["profile_markdown"] += "\n"
        second = sync.validate_event(self.event, self.repo)
        self.assertNotEqual(first["content_digest"], second["content_digest"])
        self.assertEqual(first["request_digest"], second["request_digest"])

    def test_event_origin_rejected_before_content_decoder(self):
        self.event["sender"]["login"] = "untrusted"
        with patch.object(sync, "validated_image", side_effect=AssertionError("must not decode")):
            self.reject("event-origin-rejected")

    def test_malformed_origin_fails_closed(self):
        self.event["sender"] = "not-a-server-identity"
        self.reject("event-origin-rejected")

    def test_repository_and_action_are_fixed(self):
        for key, value in [("action", "unexpected"), ("repository", {"full_name": "different/repo"})]:
            event = deepcopy(self.event)
            event[key] = value
            with self.assertRaises(sync.Rejected):
                sync.validate_event(event, self.repo)

    def test_approval_missing_false_or_string_is_rejected(self):
        for value in [False, "true", 1, None]:
            self.payload["approval"]["image_approved"] = value
            self.reject("approval-assertion-missing")

    def test_unknown_payload_fields_cannot_broaden_capabilities(self):
        self.payload["repository"] = "other/repo"
        self.reject("schema-unsupported-field")

    def test_schema_boolean_is_not_numeric_version(self):
        self.payload["schema_version"] = True
        self.reject("schema-version-invalid")

    def test_traversal_and_unsafe_folders(self):
        for folder in ["../Member", "Member/Other", ".Member", "Member name", "Member%2FName", "_hidden", "CON"]:
            self.payload["folder"] = folder
            self.reject()

    def test_request_id_not_a_path(self):
        self.payload["request_id"] = "../old-request"
        self.reject("request-id-invalid")

    def test_case_collision(self):
        (self.repo / "content/authors/synthetic_member").mkdir()
        self.reject("author-case-collision")

    def test_author_directory_symlink_rejected(self):
        target = self.repo / "content/authors/Synthetic_Member"
        target.symlink_to(self.root, target_is_directory=True)
        self.reject("author-target-invalid")

    def test_missing_biography_rejects_generated_skeleton(self):
        self.payload["profile_markdown"] = self.payload["profile_markdown"].split("---\n\n")[0] + "---\n\n"
        self.reject("profile-incomplete")

    def test_identity_and_superuser_are_not_inferred(self):
        for old, new in [("authors: [Synthetic_Member]", "authors: [Other_Member]"),
                         ("superuser: false", "superuser: true")]:
            event = deepcopy(self.event)
            event["client_payload"]["profile_markdown"] = self.payload["profile_markdown"].replace(old, new)
            with self.assertRaises(sync.Rejected):
                sync.validate_event(event, self.repo)

    def test_unknown_group_requires_review(self):
        self.payload["profile_markdown"] = self.payload["profile_markdown"].replace("Project Students", "Project Studentses")
        self.reject("profile-group-invalid")

    def test_unsupported_yaml_keys_and_duplicate_keys_rejected(self):
        for addition in ["avatar: supplied.png\n", "title: Different title\n"]:
            event = deepcopy(self.event)
            event["client_payload"]["profile_markdown"] = self.payload["profile_markdown"].replace("---\n\n", addition + "---\n\n")
            with self.assertRaises(sync.Rejected):
                sync.validate_event(event, self.repo)

    def test_yaml_alias_tags_and_objects_rejected(self):
        for value in ["&title Synthetic Member", "!!python/object:subprocess.Popen {}", "*outside"]:
            self.payload["profile_markdown"] = fixture()["client_payload"]["profile_markdown"].replace("title: Synthetic Member", "title: " + value)
            self.reject()

    def test_html_shortcodes_and_markdown_links_rejected(self):
        for addition in ["<script>bad()</script>", '{{< include "private" >}}', "[link](javascript:bad)", "`code`"]:
            self.payload["profile_markdown"] = fixture()["client_payload"]["profile_markdown"] + addition
            self.reject("markdown-unsupported-markup")

    def test_links_require_https_without_credentials(self):
        for url in ["http://example.org", "https://name:secret@example.org", "https://localhost", "file:///tmp/file"]:
            self.payload["profile_markdown"] = fixture()["client_payload"]["profile_markdown"].replace("https://www.birmingham.ac.uk", url)
            self.reject("link-invalid")

    def test_utf8_byte_limit_not_character_limit(self):
        self.payload["profile_markdown"] += "é" * 8000
        self.reject("markdown-too-large")

    def test_jpeg_preserved_with_announced_avatar_jpg_rename(self):
        jpeg = image_bytes("JPEG")
        self.payload["avatar"] = {"filename": "synthetic.jpeg", "content_base64": base64.b64encode(jpeg).decode()}
        result = sync.validate_event(self.event, self.repo)
        self.assertEqual(result["files"]["content/authors/Synthetic_Member/avatar.jpg"], jpeg)

    def test_progressive_jpeg_pixel_data_is_supported(self):
        jpeg = image_bytes("JPEG", progressive=True)
        self.payload["avatar"] = {"filename": "synthetic.jpg", "content_base64": base64.b64encode(jpeg).decode()}
        result = sync.validate_event(self.event, self.repo)
        self.assertEqual(result["files"]["content/authors/Synthetic_Member/avatar.jpg"], jpeg)

    def test_png_personal_metadata_rejected_for_cleanup_and_new_approval(self):
        info = PngImagePlugin.PngInfo()
        info.add_text("Comment", "Synthetic only metadata")
        self.payload["avatar"]["content_base64"] = base64.b64encode(image_bytes(pnginfo=info)).decode()
        self.reject("avatar-metadata-or-animation-rejected")

    def test_jpeg_exif_rejected(self):
        exif = Image.Exif()
        exif[0x010E] = "Synthetic only metadata"
        self.payload["avatar"] = {"filename": "synthetic.jpg", "content_base64": base64.b64encode(image_bytes("JPEG", exif=exif)).decode()}
        self.reject("avatar-metadata-or-marker-rejected")

    def test_trailing_data_rejected(self):
        self.payload["avatar"]["content_base64"] = base64.b64encode(image_bytes() + b"hidden data").decode()
        self.reject("avatar-trailing-data-rejected")

    def test_avatar_bad_base64_extension_and_size(self):
        for avatar in [{"filename": "x.png", "content_base64": "!!!"},
                       {"filename": "../x.png", "content_base64": "a"},
                       {"filename": "x.png", "content_base64": "a" * 43693}]:
            self.payload["avatar"] = avatar
            self.reject()

    def test_image_dimensions_are_bounded_even_if_compressed_file_small(self):
        self.payload["avatar"]["content_base64"] = base64.b64encode(image_bytes(size=(1001, 1000))).decode()
        self.reject()

    def test_exact_existing_files_noop_and_filename_preserved(self):
        result = sync.validate_event(self.event, self.repo)
        for name, data in result["files"].items():
            destination = self.repo / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
        index = self.repo / "content/authors/Synthetic_Member/_index.md"
        index.rename(index.with_name("index.md"))
        repeat = sync.validate_event(self.event, self.repo)
        self.assertEqual(repeat["status"], "no-op")
        self.assertIn("content/authors/Synthetic_Member/index.md", repeat["files"])

    def test_existing_changed_profile_or_extra_file_is_conflict(self):
        result = sync.validate_event(self.event, self.repo)
        for name, data in result["files"].items():
            destination = self.repo / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
        (self.repo / "content/authors/Synthetic_Member/extra.txt").write_text("Synthetic extra")
        self.reject("existing-profile-conflict")

    def test_ambiguous_existing_index_names_is_conflict(self):
        target = self.repo / "content/authors/Synthetic_Member"
        target.mkdir()
        (target / "index.md").write_text("Synthetic")
        (target / "_index.md").write_text("Synthetic")
        self.reject("existing-profile-ambiguous")

    def test_staging_is_private_read_back_and_does_not_change_source(self):
        result = sync.validate_event(self.event, self.repo)
        output = self.root / "new-stage"
        sync.stage(result, output)
        self.assertEqual(output.stat().st_mode & 0o777, 0o700)
        for relative, content in result["files"].items():
            self.assertEqual((output / relative).read_bytes(), content)
            self.assertEqual((output / relative).stat().st_mode & 0o777, 0o600)
        self.assertFalse((self.repo / "content/authors/Synthetic_Member").exists())
        with self.assertRaises(sync.Rejected):
            sync.stage(result, output)


class MemoryGitHub:
    """A synthetic GitHub model with uncertain-response and stale-content paths."""
    def __init__(self, result):
        self.result = result
        self.head = None
        self.pr = None
        self.requests = []
        self.files = deepcopy(result["files"])
        self.ref_unknown = False
        self.pr_unknown = False
        self.closed = False
        self.extra_change = False
        self.parent = BASE
        self.ancestry = "behind"

    def call(self, method, resource, body=None, missing_ok=False):
        self.requests.append((method, resource, body))
        route = unquote(urlsplit(resource).path)
        if method == "GET" and route == "/git/ref/heads/main":
            return {"object": {"sha": BASE}}
        if method == "GET" and route == "/git/ref/heads/" + self.result["branch"]:
            return None if self.head is None else {"object": {"sha": self.head}}
        if method == "GET" and route == "/contents/content/authors":
            return []
        if method == "GET" and route == "/git/commits/" + BASE:
            return {"tree": {"sha": TREE}}
        if method == "GET" and route == "/git/commits/" + HEAD:
            return {"parents": [{"sha": self.parent}], "message": "content-sha256=" + self.result["content_digest"]}
        if method == "POST" and route == "/git/blobs":
            return {"sha": "d" * 40}
        if method == "POST" and route == "/git/trees":
            return {"sha": TREE}
        if method == "POST" and route == "/git/commits":
            return {"sha": HEAD}
        if method == "POST" and route == "/git/refs":
            self.head = HEAD
            if self.ref_unknown:
                sync.reject("github-write-outcome-unknown")
            return {"object": {"sha": HEAD}}
        if method == "GET" and route.startswith("/compare/"):
            if route.endswith("..." + self.parent) and self.parent != BASE:
                return {"total_commits": 0, "status": self.ancestry,
                        "merge_base_commit": {"sha": self.parent}}
            files = [{"filename": path, "status": "added"} for path in self.files]
            if self.extra_change:
                files.append({"filename": "config/_default/params.yaml", "status": "modified"})
            return {"total_commits": 1, "files": files}
        if method == "GET" and route.startswith("/contents/"):
            path = route.removeprefix("/contents/")
            return {"type": "file", "encoding": "base64", "content": base64.b64encode(self.files[path]).decode()}
        if method == "GET" and route == "/pulls":
            return [] if self.pr is None else [self.pr]
        if method == "GET" and route == "/pulls/99/files":
            return [{"filename": path, "status": "added"} for path in self.files]
        if method == "POST" and route == "/pulls":
            self.pr = {"number": 99, "draft": True, "state": "closed" if self.closed else "open", "merged_at": None,
                       "head": {"ref": self.result["branch"], "sha": HEAD,
                                "repo": {"full_name": sync.REPOSITORY}},
                       "base": {"ref": "main"}, "html_url": "https://github.com/maxdiluca/virtualrealitylab/pull/99"}
            if self.pr_unknown:
                sync.reject("github-write-outcome-unknown")
            return self.pr
        raise AssertionError("Unexpected synthetic API operation: " + method + " " + resource)


class PublishingTests(unittest.TestCase):
    def setUp(self):
        ReceiverTests.setUp(self)
        self.result = sync.validate_event(self.event, self.repo)
        self.api = MemoryGitHub(self.result)
        self.environment = {"PROFILE_SYNC_ENABLED": "true", "PROFILE_SYNC_REPOSITORY": sync.REPOSITORY,
                            "PROFILE_SYNC_BASE_BRANCH": "main", "GITHUB_REPOSITORY": sync.REPOSITORY,
                            "GITHUB_EVENT_NAME": "repository_dispatch", "GITHUB_SHA": BASE,
                            "GITHUB_TOKEN": "synthetic-unused-token"}
        self.output = self.root / "stage"
        sync.stage(self.result, self.output)

    tearDown = ReceiverTests.tearDown

    def call_publish(self, route_error=None):
        def command(argv, cwd):
            return (BASE + "\n").encode() if argv[:3] == ["git", "rev-parse", "HEAD"] else b""
        with patch.dict(os.environ, self.environment, clear=True), patch.object(sync, "fixed_command", side_effect=command), patch.object(sync, "check_routes", side_effect=route_error):
            return sync.publish(self.result, self.repo, self.output, self.api)

    def test_disabled_publishing_never_calls_api(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaises(sync.Rejected) as error:
            sync.publish(self.result, self.repo, self.output, self.api)
        self.assertEqual(str(error.exception), "live-publishing-disabled")
        self.assertFalse(self.api.requests)

    def test_new_proposal_only_two_allowed_added_files_and_draft_pr(self):
        response = self.call_publish()
        self.assertEqual(response["status"], "draft-pull-request-verified")
        writes = [item for item in self.api.requests if item[0] != "GET"]
        self.assertTrue(all(item[0] == "POST" for item in writes))
        tree = next(body for method, route, body in writes if route == "/git/trees")
        self.assertEqual({item["path"] for item in tree["tree"]}, set(self.result["files"]))
        reference = next(body for method, route, body in writes if route == "/git/refs")
        self.assertEqual(reference["ref"], "refs/heads/codex/profile-sync/synthetic_member")
        self.assertFalse(any("/merge" in route for method, route, body in writes))

    def test_exact_repeat_reconciles_without_second_write(self):
        self.call_publish()
        self.api.requests = []
        self.call_publish()
        self.assertTrue(all(method == "GET" for method, route, body in self.api.requests))

    def test_lost_ref_and_pr_responses_reconciled_before_retry(self):
        self.api.ref_unknown = True
        self.api.pr_unknown = True
        response = self.call_publish()
        self.assertEqual(response["status"], "draft-pull-request-verified")
        self.assertEqual(sum(method == "POST" and route == "/pulls" for method, route, body in self.api.requests), 1)

    def test_edited_pending_content_fails_without_overwrite(self):
        self.call_publish()
        first = next(iter(self.api.files))
        self.api.files[first] += b"Changed synthetic content"
        self.api.requests = []
        with self.assertRaises(sync.Rejected):
            self.call_publish()
        self.assertTrue(all(method == "GET" for method, route, body in self.api.requests))

    def test_unrelated_pending_branch_change_is_conflict(self):
        self.call_publish()
        self.api.extra_change = True
        self.api.requests = []
        with self.assertRaises(sync.Rejected):
            self.call_publish()
        self.assertTrue(all(method == "GET" for method, route, body in self.api.requests))

    def test_closed_proposal_is_not_recreated(self):
        self.call_publish()
        self.api.pr["state"] = "closed"
        self.api.requests = []
        with self.assertRaises(sync.Rejected) as error:
            self.call_publish()
        self.assertEqual(str(error.exception), "prior-proposal-closed")
        self.assertTrue(all(method == "GET" for method, route, body in self.api.requests))

    def test_pending_branch_unrelated_parent_cannot_broaden_pr(self):
        self.call_publish()
        self.api.parent = "e" * 40
        self.api.ancestry = "diverged"
        self.api.requests = []
        with self.assertRaises(sync.Rejected) as error:
            self.call_publish()
        self.assertEqual(str(error.exception), "pending-proposal-base-conflict")
        self.assertTrue(all(method == "GET" for method, route, body in self.api.requests))

    def test_route_collision_or_missing_build_tool_blocks_every_write(self):
        for code in ["route-check-build-or-collision-failed", "route-check-tool-unavailable"]:
            self.api.requests = []
            with self.assertRaises(sync.Rejected):
                self.call_publish(sync.Rejected(code))
            self.assertTrue(all(method == "GET" for method, route, body in self.api.requests))


class RouteTests(unittest.TestCase):
    def setUp(self):
        ReceiverTests.setUp(self)
        self.result = sync.validate_event(self.event, self.repo)
        existing = self.repo / "content/authors/Existing/_index.md"
        existing.parent.mkdir()
        existing.write_text("Synthetic baseline author")
        self.output = self.root / "stage"
        sync.stage(self.result, self.output)

    tearDown = ReceiverTests.tearDown

    def model(self, version="0.152.2", collision=False, no_new_page=False, tracked=None):
        calls = []
        def command(argv, cwd):
            calls.append(argv)
            if argv == ["hugo", "version"]:
                return ("hugo v" + version + "+extended linux/amd64\n").encode()
            if argv == ["git", "ls-files", "-z"]:
                return tracked if tracked is not None else b"content/authors/Existing/_index.md\0"
            self.assertIn("--printPathWarnings", argv)
            self.assertIn("--panicOnWarning", argv)
            source = Path(argv[argv.index("--source") + 1])
            destination = Path(argv[argv.index("--destination") + 1])
            existing = destination / "author/existing/index.html"
            existing.parent.mkdir(parents=True)
            existing.write_text("Synthetic baseline HTML")
            if (source / "content/authors/Synthetic_Member/_index.md").exists():
                if collision:
                    sync.reject("route-check-build-or-collision-failed")
                if not no_new_page:
                    new = destination / "author/synthetic-member/index.html"
                    new.parent.mkdir(parents=True)
                    new.write_text("Synthetic rendered profile HTML")
            return b"Private synthetic build diagnostics"
        return command, calls

    def test_actual_build_argv_and_two_snapshots_preserve_site_source(self):
        command, calls = self.model()
        with patch.object(sync, "fixed_command", side_effect=command):
            sync.check_routes(self.result, self.repo, self.output)
        self.assertEqual(len(calls), 4)
        self.assertFalse((self.repo / "content/authors/Synthetic_Member").exists())
        self.assertEqual(self.result["route_check"]["content_digest"], self.result["content_digest"])

    def test_only_exact_website_sources_are_copied(self):
        names = ["content/authors/Existing/_index.md", "assets/example.txt", "config/example.yaml",
                 "layouts/example.html", "static/example.txt", "go.mod", "go.sum", "theme.toml"]
        for name in names[1:]:
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"Synthetic website input")
        outside = ["outputs/missing.xlsx", ".claude/settings.local.json", ".github/workflow.yml",
                   "public/index.html", "resources/missing", "root-mail.eml", "README.md", "netlify.toml",
                   "go.mod/extra", "theme.toml.extra", "content-extra/missing"]
        command, calls = self.model(tracked=("\0".join(names + outside) + "\0").encode())
        with patch.object(sync, "fixed_command", side_effect=command):
            sync.check_routes(self.result, self.repo, self.output)
        preview = self.output / "private-preview-source"
        self.assertEqual({path.relative_to(preview).as_posix() for path in preview.rglob("*") if path.is_file()},
                         set(names) | set(self.result["files"]))
        self.assertTrue(all((preview / name).read_bytes() == (self.repo / name).read_bytes() for name in names))

    def test_unrelated_symlink_and_files_are_never_inspected(self):
        unrelated = self.repo / "outputs"
        unrelated.symlink_to(self.root / "missing-private-source", target_is_directory=True)
        names = ["content/authors/Existing/_index.md", "outputs/node_modules", "root-mail.eml"]
        command, calls = self.model(tracked=("\0".join(names) + "\0").encode())
        original_stat = Path.stat
        def guarded_stat(path, *args, **kwargs):
            if path == unrelated or unrelated in path.parents or path.name == "root-mail.eml":
                raise AssertionError("Unrelated source must not be inspected")
            return original_stat(path, *args, **kwargs)
        with patch.object(sync, "fixed_command", side_effect=command), patch.object(Path, "stat", guarded_stat):
            sync.check_routes(self.result, self.repo, self.output)
        self.assertFalse((self.output / "private-preview-source/outputs").exists())

    def test_symlink_inside_selected_source_is_rejected_before_build(self):
        linked = self.repo / "assets/linked.txt"
        linked.parent.mkdir()
        linked.symlink_to(self.root / "missing-source")
        command, calls = self.model(tracked=b"content/authors/Existing/_index.md\0assets/linked.txt\0")
        with patch.object(sync, "fixed_command", side_effect=command), self.assertRaises(sync.Rejected) as error:
            sync.check_routes(self.result, self.repo, self.output)
        self.assertEqual(str(error.exception), "route-check-snapshot-invalid")
        self.assertEqual(len(calls), 2)

    def test_selected_parent_symlink_is_rejected_before_build(self):
        (self.repo / "assets").symlink_to(self.root, target_is_directory=True)
        command, calls = self.model(tracked=b"content/authors/Existing/_index.md\0assets/linked.txt\0")
        with patch.object(sync, "fixed_command", side_effect=command), self.assertRaises(sync.Rejected) as error:
            sync.check_routes(self.result, self.repo, self.output)
        self.assertEqual(str(error.exception), "path-symlink-rejected")
        self.assertEqual(len(calls), 2)

    def test_unsafe_names_are_rejected_even_when_not_selected(self):
        for name in ["../outputs/missing", "/outputs/missing", "outputs/../missing", "outputs/control\nname"]:
            command, calls = self.model(tracked=(name + "\0").encode())
            with self.subTest(name=name), patch.object(sync, "fixed_command", side_effect=command), self.assertRaises(sync.Rejected) as error:
                sync.check_routes(self.result, self.repo, self.output)
            self.assertEqual(str(error.exception), "route-check-snapshot-invalid")
            (self.output / "private-preview-source").rmdir()

    def test_byte_limit_applies_only_to_selected_source(self):
        outside = self.repo / "outputs/large.bin"
        outside.parent.mkdir()
        outside.write_bytes(b"Synthetic excluded bytes" * 100)
        tracked = b"content/authors/Existing/_index.md\0outputs/large.bin\0"
        selected_size = (self.repo / "content/authors/Existing/_index.md").stat().st_size
        command, calls = self.model(tracked=tracked)
        with patch.object(sync, "fixed_command", side_effect=command), patch.object(sync, "MAX_BUILD_BYTES", selected_size):
            sync.check_routes(self.result, self.repo, self.output)
        second_output = self.root / "second-stage"
        sync.stage(self.result, second_output)
        command, calls = self.model(tracked=tracked)
        with patch.object(sync, "fixed_command", side_effect=command), patch.object(sync, "MAX_BUILD_BYTES", selected_size - 1), self.assertRaises(sync.Rejected) as error:
            sync.check_routes(self.result, self.repo, second_output)
        self.assertEqual(str(error.exception), "route-check-snapshot-too-large")
        self.assertEqual(len(calls), 2)

    def test_same_title_route_collision_is_fatal(self):
        command, calls = self.model(collision=True)
        with patch.object(sync, "fixed_command", side_effect=command), self.assertRaises(sync.Rejected):
            sync.check_routes(self.result, self.repo, self.output)

    def test_wrong_hugo_version_is_withheld(self):
        command, calls = self.model(version="0.153.0")
        with patch.object(sync, "fixed_command", side_effect=command), self.assertRaises(sync.Rejected) as error:
            sync.check_routes(self.result, self.repo, self.output)
        self.assertEqual(str(error.exception), "route-check-hugo-version-invalid")

    def test_missing_new_author_output_is_withheld(self):
        command, calls = self.model(no_new_page=True)
        with patch.object(sync, "fixed_command", side_effect=command), self.assertRaises(sync.Rejected) as error:
            sync.check_routes(self.result, self.repo, self.output)
        self.assertEqual(str(error.exception), "route-check-new-author-page-not-unique")

    def test_build_subprocess_never_receives_tokens(self):
        process = subprocess.CompletedProcess(["hugo", "version"], 0, b"hugo v0.152.2", b"")
        with patch.dict(os.environ, {"GITHUB_TOKEN": "synthetic-secret", "GH_TOKEN": "synthetic-secret", "PATH": "/usr/bin"}), patch.object(sync.subprocess, "run", return_value=process) as run:
            sync.fixed_command(["hugo", "version"], self.repo)
        environment = run.call_args.kwargs["env"]
        self.assertNotIn("GITHUB_TOKEN", environment)
        self.assertNotIn("GH_TOKEN", environment)


class WorkflowTests(unittest.TestCase):
    def test_default_off_protected_main_dispatch_and_pinned_actions(self):
        workflow_path = HERE / "profile-sync.yml"
        if not workflow_path.exists():
            workflow_path = HERE.parents[1] / ".github/workflows/profile-sync.yml"
        workflow = workflow_path.read_text()
        self.assertIn("vars.PROFILE_SYNC_ENABLED == 'true'", workflow)
        self.assertIn("environment: website-profile-review", workflow)
        self.assertIn("github.ref == 'refs/heads/main'", workflow)
        self.assertIn("github.event.sender.login == 'maxdiluca'", workflow)
        self.assertIn("cancel-in-progress: false", workflow)
        self.assertIn("--publish", workflow)
        self.assertIn("416bcfbdf5f68469ec9644dbe507da50fc21b94b69a125b059d64ed2cb4d8c27", workflow)
        self.assertNotIn("upload-artifact", workflow)


if __name__ == "__main__":
    unittest.main()
