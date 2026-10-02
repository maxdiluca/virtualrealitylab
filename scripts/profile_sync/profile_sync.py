#!/usr/bin/env python3
"""Bounded, new-only website profile receiver. Local staging is the default.

Approval booleans are connector assertions, not evidence of real consent. The
configured trusted connection must bind them to review of these exact bytes.
No model, supplied URL, executable Markdown or local shell is invoked.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import unicodedata
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from urllib.error import HTTPError, URLError
import warnings

from PIL import Image, UnidentifiedImageError
import yaml

REPOSITORY = "maxdiluca/virtualrealitylab"
BASE_BRANCH = "main"
TRUSTED_SENDER = "maxdiluca"
EVENT_TYPE = "vr-lab-profile-approved-v1"
MAX_PAYLOAD_BYTES = 60000
MAX_MARKDOWN_BYTES = 16000
MAX_IMAGE_BYTES = 32768
MAX_PIXELS = 1000000
HUGO_VERSION = "0.152.2"
GROUPS = frozenset({
    "Affiliated Faculty", "Researchers", "Collaborators", "PhD Students",
    "Research Assistants", "Volunteer Research Assistants", "Interns",
    "Project Students", "Visitors", "Alumni Researchers",
    "Alumni Research Assistants", "Alumni Interns", "Alumni Project Students",
})
FOLDER_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,79}\Z")
REQUEST_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,99}\Z")
IMAGE_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,79}\.(png|jpg|jpeg)\Z", re.I)


class Rejected(Exception):
    """A fixed, non-content error code safe to print to a workflow log."""


def reject(code: str) -> None:
    raise Rejected(code)


def exact_keys(value: object, required: set[str], optional: set[str] | None = None) -> dict:
    if not isinstance(value, dict) or not required.issubset(value):
        reject("schema-invalid")
    if not set(value).issubset(required | (optional or set())):
        reject("schema-unsupported-field")
    return value


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def prose_links(value: str) -> bool:
    return bool(re.search(r"(?i)\b(?:[a-z][a-z0-9+.-]*://|www\.)|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", value))


def text_field(value: object, limit: int, code: str = "profile-field-invalid", *, allow_url: bool = False) -> str:
    if not isinstance(value, str):
        reject(code)
    if any(unicodedata.category(c) in {"Cc", "Cf", "Cs"} for c in value):
        reject(code)
    value = unicodedata.normalize("NFC", value.strip())
    if not value or len(value) > limit or any(
        unicodedata.category(c) in {"Cc", "Cf", "Cs"} for c in value
    ):
        reject(code)
    if (any(c in value for c in "<>\\[]`") or "{{" in value or "}}" in value
            or (not allow_url and prose_links(value))):
        reject("executable-content-rejected")
    return value


def https_url(value: object) -> str:
    value = text_field(value, 1000, "link-invalid", allow_url=True)
    if any(c.isspace() for c in value):
        reject("link-invalid")
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError:
        reject("link-invalid")
    if (parsed.scheme != "https" or not hostname or "." not in hostname
            or parsed.username is not None or parsed.password is not None
            or port not in {None, 443} or not hostname.isascii()
            or not re.fullmatch(r"[A-Za-z0-9.-]+", hostname)
            or hostname.endswith((".local", ".internal", ".localhost"))):
        reject("link-invalid")
    # Links are displayed only. They are never fetched, resolved or used as tools.
    return value


class StrictLoader(yaml.SafeLoader):
    pass


def strict_mapping(loader: StrictLoader, node: yaml.MappingNode, deep: bool = False) -> dict:
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if not isinstance(key, str) or key in mapping:
            reject("yaml-duplicate-or-nonstring-key")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, strict_mapping)


def validated_markdown(markdown: object, folder: str) -> bytes:
    if not isinstance(markdown, str):
        reject("markdown-invalid")
    try:
        encoded = markdown.encode("utf-8")
    except UnicodeError:
        reject("markdown-invalid")
    if len(encoded) > MAX_MARKDOWN_BYTES:
        reject("markdown-too-large")
    markdown = markdown.replace("\r\n", "\n")
    if "\r" in markdown or not markdown.startswith("---\n"):
        reject("frontmatter-required")
    parts = markdown.split("\n---\n", 1)
    if len(parts) != 2 or len(parts[0]) > 8000:
        reject("frontmatter-invalid")
    header, body = parts[0][4:], parts[1].strip()
    if any(unicodedata.category(c) in {"Cf", "Cs"} or
           (unicodedata.category(c) == "Cc" and c != "\n") for c in markdown):
        reject("markdown-control-character")
    # This first release accepts prose, paragraphs, lists and emphasis. URLs
    # belong in the validated social fields; Markdown links/code need review.
    if (any(c in body for c in "<>[]`\\") or "{{" in body or "}}" in body
            or prose_links(body)):
        reject("markdown-unsupported-markup")
    if len(re.findall(r"[^\W_]", body, re.UNICODE)) < 40:
        reject("profile-incomplete")
    try:
        tokens = list(yaml.scan(header))
        if len(tokens) > 1000 or any(isinstance(token, (
            yaml.tokens.AliasToken, yaml.tokens.AnchorToken, yaml.tokens.TagToken
        )) for token in tokens):
            reject("yaml-alias-anchor-or-tag")
        profile = yaml.load(header, Loader=StrictLoader)
    except yaml.YAMLError:
        reject("yaml-invalid")
    exact_keys(profile, {"title", "authors", "superuser", "role", "organizations", "user_groups"},
               {"interests", "social"})
    title = text_field(profile["title"], 120)
    role = text_field(profile["role"], 160)
    if profile["authors"] != [folder] or profile["superuser"] is not False:
        reject("profile-identity-or-superuser-invalid")
    groups = profile["user_groups"]
    if (not isinstance(groups, list) or not 1 <= len(groups) <= 3
            or any(not isinstance(group, str) or group not in GROUPS for group in groups)
            or len(groups) != len(set(groups))):
        reject("profile-group-invalid")
    organizations = profile["organizations"]
    if not isinstance(organizations, list) or not 1 <= len(organizations) <= 3:
        reject("organization-invalid")
    clean_orgs = []
    for organization in organizations:
        exact_keys(organization, {"name"}, {"url"})
        clean = {"name": text_field(organization["name"], 120)}
        if organization.get("url") is not None and organization.get("url") != "":
            clean["url"] = https_url(organization["url"])
        clean_orgs.append(clean)
    interests = profile.get("interests", [])
    if not isinstance(interests, list) or len(interests) > 12:
        reject("interests-invalid")
    clean_interests = [text_field(interest, 120) for interest in interests if interest is not None]
    socials = profile.get("social", [])
    if not isinstance(socials, list) or len(socials) > 8:
        reject("social-invalid")
    clean_socials = []
    for social in socials:
        exact_keys(social, {"icon", "icon_pack", "link"})
        if social["link"] is None or social["link"] == "":
            if social["icon"] != "link" or social["icon_pack"] != "fas":
                reject("social-placeholder-invalid")
            continue
        icon = social["icon"]
        pack = social["icon_pack"]
        if (not isinstance(icon, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", icon)
                or not isinstance(pack, str) or pack not in {"fas", "fab", "ai"}):
            reject("social-icon-invalid")
        clean_socials.append({"icon": icon, "icon_pack": pack, "link": https_url(social["link"])})
    # Validation never rewrites the bytes that the subject approved. Null
    # placeholders may remain in supported fields; unknown fields fail closed.
    return encoded


def png_structure(raw: bytes) -> None:
    if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        reject("avatar-format-invalid")
    offset, types = 8, []
    while offset < len(raw):
        if offset + 12 > len(raw):
            reject("avatar-decode-invalid")
        length = int.from_bytes(raw[offset:offset + 4], "big")
        kind = raw[offset + 4:offset + 8]
        end = offset + 12 + length
        if end > len(raw):
            reject("avatar-decode-invalid")
        if kind not in {b"IHDR", b"PLTE", b"IDAT", b"IEND", b"tRNS"}:
            # Text, EXIF, ICC/XMP and unknown chunks require private cleaning and
            # a fresh approval of the cleaned bytes; they are never stripped here.
            reject("avatar-metadata-or-animation-rejected")
        types.append(kind)
        if kind == b"IEND":
            if length != 0 or end != len(raw):
                reject("avatar-trailing-data-rejected")
            break
        offset = end
    if (not types or types[0] != b"IHDR" or types.count(b"IHDR") != 1
            or b"IDAT" not in types or types[-1] != b"IEND"):
        reject("avatar-decode-invalid")


def jpeg_structure(raw: bytes) -> None:
    if not raw.startswith(b"\xff\xd8"):
        reject("avatar-format-invalid")
    offset, in_scan = 2, False
    while offset < len(raw):
        if in_scan:
            while offset < len(raw) and raw[offset] != 0xFF:
                offset += 1
        if offset >= len(raw) or raw[offset] != 0xFF:
            reject("avatar-decode-invalid")
        while offset < len(raw) and raw[offset] == 0xFF:
            offset += 1
        if offset >= len(raw):
            reject("avatar-decode-invalid")
        marker = raw[offset]
        offset += 1
        if in_scan and (marker == 0 or 0xD0 <= marker <= 0xD7):
            continue
        if marker == 0xD9:
            if offset != len(raw):
                reject("avatar-trailing-data-rejected")
            return
        if marker not in {0xC0, 0xC2, 0xC4, 0xDB, 0xDD, 0xDA, 0xE0, 0xEE}:
            reject("avatar-metadata-or-marker-rejected")
        in_scan = False
        if offset + 2 > len(raw):
            reject("avatar-decode-invalid")
        length = int.from_bytes(raw[offset:offset + 2], "big")
        if length < 2 or offset + length > len(raw):
            reject("avatar-decode-invalid")
        segment = raw[offset + 2:offset + length]
        if marker == 0xE0 and (len(segment) != 14 or not segment.startswith(b"JFIF\0")
                              or segment[-2:] != b"\0\0"):
            reject("avatar-metadata-or-marker-rejected")
        if marker == 0xEE and (len(segment) != 12 or not segment.startswith(b"Adobe")):
            reject("avatar-metadata-or-marker-rejected")
        offset += length
        in_scan = marker == 0xDA
    reject("avatar-decode-invalid")


def validated_image(avatar: object) -> tuple[str, bytes]:
    exact_keys(avatar, {"filename", "content_base64"})
    filename, content = avatar["filename"], avatar["content_base64"]
    if not isinstance(filename, str) or not IMAGE_PATTERN.fullmatch(filename):
        reject("avatar-filename-invalid")
    if not isinstance(content, str) or len(content) > 43692:
        reject("avatar-too-large-or-invalid")
    try:
        raw = base64.b64decode(content, validate=True)
    except (ValueError, UnicodeError):
        reject("avatar-base64-invalid")
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        reject("avatar-too-large-or-invalid")
    expected_format = "PNG" if filename.lower().endswith(".png") else "JPEG"
    if expected_format == "PNG":
        png_structure(raw)
    else:
        jpeg_structure(raw)
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as source:
                if (source.format != expected_format or source.width > 1600
                        or source.height > 1600 or source.width * source.height > MAX_PIXELS
                        or getattr(source, "n_frames", 1) != 1):
                    reject("avatar-format-or-dimensions-invalid")
                source.verify()
            with Image.open(io.BytesIO(raw)) as source:
                source.load()
                # Decode completely to catch corruption. Preserve the exact
                # approved pixels, orientation and bytes; no post-approval edit.
                if source.getexif():
                    reject("avatar-metadata-or-marker-rejected")
                return ("avatar.png" if expected_format == "PNG" else "avatar.jpg", raw)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError,
            Image.DecompressionBombWarning):
        reject("avatar-decode-invalid")


def safe_directory(path: Path, *, must_exist: bool = True) -> Path:
    absolute = path.absolute()
    for component in [absolute, *absolute.parents]:
        if component.is_symlink():
            reject("path-symlink-rejected")
    if must_exist and not absolute.is_dir():
        reject("directory-missing")
    return absolute


def target_directory(repo: Path, folder: str) -> tuple[Path, bool]:
    root = safe_directory(repo)
    authors = safe_directory(root / "content" / "authors")
    for candidate in authors.iterdir():
        if candidate.name.casefold() == folder.casefold() and candidate.name != folder:
            reject("author-case-collision")
    target = authors / folder
    if target.is_symlink() or (target.exists() and not target.is_dir()):
        reject("author-target-invalid")
    return target, target.is_dir()


def existing_profile_name(target: Path) -> str:
    present = [name for name in ("index.md", "_index.md") if (target / name).exists()]
    if len(present) != 1:
        reject("existing-profile-ambiguous")
    return present[0]


def checked_file(path: Path) -> bytes:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 4 * 1024 * 1024:
        reject("existing-profile-conflict")
    return path.read_bytes()


def validate_event(event: object, repo: Path) -> dict:
    # Reject an untrusted sender before parsing any authored content.
    if (not isinstance(event, dict) or not isinstance(event.get("sender"), dict)
            or not isinstance(event.get("repository"), dict)
            or event["sender"].get("login") != TRUSTED_SENDER
            or event["repository"].get("full_name") != REPOSITORY
            or event.get("action") != EVENT_TYPE):
        reject("event-origin-rejected")
    payload = exact_keys(event.get("client_payload"), {
        "schema_version", "request_id", "folder", "profile_markdown", "avatar", "approval"
    })
    if type(payload["schema_version"]) is not int or payload["schema_version"] != 1:
        reject("schema-version-invalid")
    try:
        payload_bytes = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    except (UnicodeError, TypeError, ValueError):
        reject("payload-invalid")
    if len(payload_bytes) > MAX_PAYLOAD_BYTES:
        reject("payload-too-large")
    approval = exact_keys(payload["approval"], {"profile_approved", "image_approved"})
    if approval["profile_approved"] is not True or approval["image_approved"] is not True:
        reject("approval-assertion-missing")
    folder, request_id = payload["folder"], payload["request_id"]
    if not isinstance(folder, str) or not FOLDER_PATTERN.fullmatch(folder):
        reject("folder-invalid")
    if folder.casefold() in {"index", "con", "prn", "aux", "nul"} or re.fullmatch(
        r"(?:com|lpt)[0-9]", folder, re.I
    ):
        reject("folder-reserved")
    if not isinstance(request_id, str) or not REQUEST_PATTERN.fullmatch(request_id):
        reject("request-id-invalid")
    target, exists = target_directory(repo, folder)
    profile_name = existing_profile_name(target) if exists else "_index.md"
    prefix = f"content/authors/{folder}/"
    avatar_name, avatar_bytes = validated_image(payload["avatar"])
    files = {prefix + profile_name: validated_markdown(payload["profile_markdown"], folder),
             prefix + avatar_name: avatar_bytes}
    if exists:
        if set(entry.name for entry in target.iterdir()) != {Path(path).name for path in files}:
            reject("existing-profile-conflict")
        if any(checked_file(Path(repo) / path) != data for path, data in files.items()):
            reject("existing-profile-conflict")
    file_hashes = {path: sha(data) for path, data in sorted(files.items())}
    digest = sha(json.dumps(file_hashes, sort_keys=True, separators=(",", ":")).encode("utf-8"))
    return {"status": "no-op" if exists else "staged", "folder": folder, "files": files,
            "file_hashes": file_hashes, "content_digest": digest,
            "request_digest": sha(request_id.encode("ascii")),
            "branch": "codex/profile-sync/" + folder.casefold()}


def stage(result: dict, output: Path) -> None:
    safe_directory(output.parent)
    if output.exists() or output.is_symlink():
        reject("stage-output-exists")
    output.mkdir(mode=0o700)
    for relative, data in result["files"].items():
        destination = output / relative
        destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        destination.write_bytes(data)
        destination.chmod(0o600)
        if destination.read_bytes() != data:
            reject("stage-readback-failed")
    report = {key: result[key] for key in ("status", "file_hashes", "content_digest", "request_digest")}
    report["public_content_review_required"] = True
    report["external_write_performed"] = False
    report_path = output / "receipt.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_path.chmod(0o600)


def fixed_command(argv: list[str], cwd: Path) -> bytes:
    environment = {key: os.environ[key] for key in (
        "PATH", "HOME", "TMPDIR", "TEMP", "TMP", "GOPATH", "GOMODCACHE", "GOCACHE"
    ) if key in os.environ}
    try:
        process = subprocess.run(argv, cwd=cwd, stdout=subprocess.PIPE,
                                 stderr=subprocess.PIPE, timeout=60, check=False, env=environment)
    except (OSError, subprocess.TimeoutExpired):
        reject("route-check-tool-unavailable")
    if process.returncode != 0 or len(process.stdout) > 2 * 1024 * 1024:
        # Do not emit Hugo/Git diagnostics: they can contain the approved bio.
        reject("route-check-build-or-collision-failed")
    return process.stdout


def check_routes(result: dict, repo: Path, output: Path) -> None:
    """Build an explicit tracked-public-file snapshot, never the whole checkout.

    A baseline and proposed build use the site's actual Hugo configuration.
    Duplicate output paths are fatal; the proposal must produce one new author
    HTML page. Existing generated/ignored/private state is never copied.
    """
    version = fixed_command(["hugo", "version"], repo)
    if not re.match(rb"hugo v0\.152\.2(?:\+|[-\s])", version):
        reject("route-check-hugo-version-invalid")
    tracked = fixed_command(["git", "ls-files", "-z"], repo)
    names = tracked.decode("utf-8").split("\0")
    if not names or names[-1] != "" or len(names) > 10000:
        reject("route-check-snapshot-invalid")
    preview = output / "private-preview-source"
    if preview.exists() or preview.is_symlink():
        reject("route-check-output-exists")
    preview.mkdir(mode=0o700)
    total_bytes = 0
    for name in names[:-1]:
        relative = Path(name)
        if (relative.is_absolute() or ".." in relative.parts or not relative.parts
                or any(unicodedata.category(c) in {"Cc", "Cf", "Cs"} for c in name)):
            reject("route-check-snapshot-invalid")
        if relative.parts[0] in {".git", "public", "resources"}:
            continue
        source = repo / relative
        safe_directory(source.parent)
        if source.is_symlink() or not source.is_file():
            reject("route-check-snapshot-invalid")
        total_bytes += source.stat().st_size
        if total_bytes > 250 * 1024 * 1024:
            reject("route-check-snapshot-too-large")
        destination = preview / relative
        destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        destination.chmod(0o600)
    if not (preview / "content" / "authors").is_dir():
        reject("route-check-snapshot-invalid")
    baseline = output / "private-preview-baseline"
    proposed = output / "private-preview-proposal"
    for destination in (baseline, proposed):
        destination.mkdir(mode=0o700)
    build_arguments = ["hugo", "--source", str(preview), "--environment", "production",
                       "--printPathWarnings", "--panicOnWarning"]
    fixed_command(build_arguments + ["--destination", str(baseline)], repo)
    baseline_pages = {path.relative_to(baseline).as_posix()
                      for path in (baseline / "author").rglob("index.html")}
    for relative, data in result["files"].items():
        destination = preview / relative
        if destination.exists() or destination.is_symlink():
            reject("route-check-existing-profile-conflict")
        destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        destination.write_bytes(data)
        destination.chmod(0o600)
    fixed_command(build_arguments + ["--destination", str(proposed)], repo)
    proposed_pages = {path.relative_to(proposed).as_posix()
                      for path in (proposed / "author").rglob("index.html")}
    new_pages = proposed_pages - baseline_pages
    if len(new_pages) != 1 or not baseline_pages.issubset(proposed_pages):
        reject("route-check-new-author-page-not-unique")
    new_page = proposed / next(iter(new_pages))
    if new_page.is_symlink() or not new_page.is_file() or new_page.stat().st_size == 0:
        reject("route-check-new-author-page-missing")
    result["route_check"] = {"hugo_version": HUGO_VERSION,
                             "content_digest": result["content_digest"],
                             "base_sha": os.environ.get("GITHUB_SHA")}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


class GitHub:
    """Fixed-host REST client. Never follows supplied URLs or retries a mutation."""

    def __init__(self, token: str):
        self.token = token

    def call(self, method: str, resource: str, body: dict | None = None,
             *, missing_ok: bool = False) -> object:
        request = Request("https://api.github.com/repos/" + REPOSITORY + resource,
                          data=None if body is None else json.dumps(body).encode("utf-8"),
                          method=method, headers={"Authorization": "Bearer " + self.token,
                          "Accept": "application/vnd.github+json", "Content-Type": "application/json",
                          "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "vr-lab-profile-sync"})
        try:
            with build_opener(NoRedirect).open(request, timeout=30) as response:
                data = response.read(8 * 1024 * 1024 + 1)
                if len(data) > 8 * 1024 * 1024:
                    reject("github-response-too-large")
                return json.loads(data)
        except HTTPError as error:
            if missing_ok and error.code == 404:
                return None
            reject("github-request-rejected" if method == "GET" else "github-write-outcome-unknown")
        except (URLError, TimeoutError, OSError, ValueError):
            reject("github-read-unavailable" if method == "GET" else "github-write-outcome-unknown")


def remote_content(api: GitHub, path: str, ref: str) -> bytes:
    resource = "/contents/" + quote(path, safe="/") + "?" + urlencode({"ref": ref})
    value = api.call("GET", resource)
    if not isinstance(value, dict) or value.get("type") != "file" or value.get("encoding") != "base64":
        reject("github-content-readback-invalid")
    try:
        return base64.b64decode(value["content"].replace("\n", ""), validate=True)
    except (KeyError, TypeError, ValueError):
        reject("github-content-readback-invalid")


def branch_sha(api: GitHub, branch: str) -> str | None:
    value = api.call("GET", "/git/ref/heads/" + quote(branch, safe="/"), missing_ok=True)
    if value is None:
        return None
    try:
        result = value["object"]["sha"]
    except (KeyError, TypeError):
        reject("github-ref-invalid")
    if not re.fullmatch(r"[0-9a-f]{40}", result):
        reject("github-ref-invalid")
    return result


def verify_proposal_branch(api: GitHub, head: str, result: dict, base: str) -> None:
    commit = api.call("GET", "/git/commits/" + head)
    if (not isinstance(commit, dict) or len(commit.get("parents", [])) != 1
            or "content-sha256=" + result["content_digest"] not in commit.get("message", "")):
        reject("pending-proposal-conflict")
    parent = commit["parents"][0].get("sha")
    if not isinstance(parent, str) or not re.fullmatch(r"[0-9a-f]{40}", parent):
        reject("pending-proposal-conflict")
    if parent != base:
        ancestry = api.call("GET", "/compare/" + base + "..." + parent)
        if (not isinstance(ancestry, dict) or ancestry.get("status") not in {"behind", "identical"}
                or ancestry.get("total_commits") != 0
                or ancestry.get("merge_base_commit", {}).get("sha") != parent):
            reject("pending-proposal-base-conflict")
    # Compare against the actual PR base, not just an arbitrary branch parent.
    comparison = api.call("GET", "/compare/" + base + "..." + head)
    if (not isinstance(comparison, dict) or comparison.get("total_commits") != 1
            or set(item.get("filename") for item in comparison.get("files", [])) != set(result["files"])
            or any(item.get("status") != "added" for item in comparison.get("files", []))):
        reject("pending-proposal-conflict")
    if any(remote_content(api, path, head) != data for path, data in result["files"].items()):
        reject("pending-proposal-conflict")


def proposal_pr(api: GitHub, result: dict) -> dict | None:
    query = urlencode({"state": "all", "head": REPOSITORY.split("/")[0] + ":" + result["branch"],
                       "base": BASE_BRANCH, "per_page": 100})
    matches = api.call("GET", "/pulls?" + query)
    if not isinstance(matches, list) or len(matches) > 1:
        reject("pull-request-ambiguous")
    if not matches:
        return None
    pr = matches[0]
    if pr.get("state") != "open" or pr.get("merged_at"):
        reject("prior-proposal-closed")
    if (pr.get("draft") is not True or pr.get("base", {}).get("ref") != BASE_BRANCH
            or pr.get("head", {}).get("ref") != result["branch"]
            or pr.get("head", {}).get("repo", {}).get("full_name") != REPOSITORY):
        reject("pull-request-readback-invalid")
    return pr


def publish(result: dict, repo: Path, output: Path, api: GitHub | None = None) -> dict:
    required = {"PROFILE_SYNC_ENABLED": "true", "PROFILE_SYNC_REPOSITORY": REPOSITORY,
                "PROFILE_SYNC_BASE_BRANCH": BASE_BRANCH, "GITHUB_REPOSITORY": REPOSITORY,
                "GITHUB_EVENT_NAME": "repository_dispatch"}
    if any(os.environ.get(key) != value for key, value in required.items()):
        reject("live-publishing-disabled")
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        reject("github-token-missing")
    api = api or GitHub(token)
    if fixed_command(["git", "rev-parse", "HEAD"], repo).strip().decode("ascii") != os.environ.get("GITHUB_SHA"):
        reject("checkout-base-mismatch")
    try:
        fixed_command(["git", "diff", "--quiet", "HEAD", "--"], repo)
    except Rejected:
        reject("checkout-tracked-changes-rejected")
    base = branch_sha(api, BASE_BRANCH)
    if base is None or os.environ.get("GITHUB_SHA") != base:
        reject("base-changed-retry-from-new-checkout")
    root = api.call("GET", "/contents/content/authors?" + urlencode({"ref": base}))
    if not isinstance(root, list):
        reject("github-author-directory-invalid")
    matches = [item for item in root if item.get("name", "").casefold() == result["folder"].casefold()]
    if matches:
        if len(matches) != 1 or matches[0].get("name") != result["folder"]:
            reject("author-case-collision")
        if result["status"] != "no-op" or any(
            remote_content(api, path, base) != data for path, data in result["files"].items()
        ):
            reject("existing-profile-conflict")
        return {"status": "no-op", "external_write_performed": False}
    if result["status"] == "no-op":
        reject("base-changed-retry-from-new-checkout")
    check_routes(result, repo, output)
    if branch_sha(api, BASE_BRANCH) != base:
        reject("base-changed-retry-from-new-checkout")
    head = branch_sha(api, result["branch"])
    if head is None:
        base_commit = api.call("GET", "/git/commits/" + base)
        entries = []
        for path, content in result["files"].items():
            blob = api.call("POST", "/git/blobs", {"encoding": "base64",
                "content": base64.b64encode(content).decode("ascii")})
            entries.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        tree = api.call("POST", "/git/trees", {"base_tree": base_commit["tree"]["sha"], "tree": entries})
        commit = api.call("POST", "/git/commits", {
            "message": "Prepare approved website profile\n\ncontent-sha256=" + result["content_digest"] +
                       "\nrequest-sha256=" + result["request_digest"],
            "tree": tree["sha"], "parents": [base]})
        try:
            api.call("POST", "/git/refs", {"ref": "refs/heads/" + result["branch"], "sha": commit["sha"]})
        except Rejected as error:
            if str(error) != "github-write-outcome-unknown":
                raise
            # A lost response is reconciled by reading the deterministic ref.
        head = branch_sha(api, result["branch"])
        if head is None:
            reject("github-write-outcome-unknown")
    verify_proposal_branch(api, head, result, base)
    # Stop if main changed while preparing the branch; never mutate or merge main.
    if branch_sha(api, BASE_BRANCH) != base:
        reject("base-changed-retry-from-new-checkout")
    pr = proposal_pr(api, result)
    if pr is None:
        try:
            api.call("POST", "/pulls", {
                "title": "Add approved VR Lab website profile", "head": result["branch"],
                "base": BASE_BRANCH, "draft": True,
                "body": "Prepared from the configured Power Automate connection's approval assertions. "
                "The website owner must check exact public content and approval provenance before merging.\n\n"
                "Canonical content SHA-256: " + result["content_digest"] + "\n"
                "Opaque request SHA-256: " + result["request_digest"] + "\n\n"
                "This proposal adds one profile and one validated, metadata-free image, preserving the approved "
                "file bytes. No automatic merge is enabled."})
        except Rejected as error:
            if str(error) != "github-write-outcome-unknown":
                raise
        pr = proposal_pr(api, result)
    if pr is None:
        reject("github-write-outcome-unknown")
    if pr.get("head", {}).get("sha") != head or branch_sha(api, result["branch"]) != head:
        reject("pull-request-readback-invalid")
    number = pr.get("number")
    if type(number) is not int or number < 1:
        reject("pull-request-readback-invalid")
    changed = api.call("GET", "/pulls/" + str(number) + "/files?per_page=100")
    if (not isinstance(changed, list)
            or {item.get("filename") for item in changed} != set(result["files"])
            or len(changed) != len(result["files"])
            or any(item.get("status") != "added" for item in changed)):
        reject("pull-request-file-scope-invalid")
    fresh_pr = proposal_pr(api, result)
    if (fresh_pr is None or fresh_pr.get("head", {}).get("sha") != head
            or branch_sha(api, result["branch"]) != head):
        reject("pull-request-readback-invalid")
    url = pr.get("html_url")
    if not isinstance(url, str) or not re.fullmatch(
        r"https://github\.com/maxdiluca/virtualrealitylab/pull/[0-9]+", url
    ):
        reject("pull-request-readback-invalid")
    return {"status": "draft-pull-request-verified", "pull_request_url": url,
            "external_write_performed": True}


def strict_json(pairs: list[tuple[str, object]]) -> dict:
    mapping = {}
    for key, value in pairs:
        if key in mapping:
            reject("json-duplicate-key")
        mapping[key] = value
    return mapping


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event-json", required=True, type=Path)
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--publish", action="store_true", help="Opt-in, configured draft PR writes only")
    args = parser.parse_args()
    try:
        if args.event_json.is_symlink() or args.event_json.stat().st_size > 1024 * 1024:
            reject("event-file-invalid")
        event = json.loads(args.event_json.read_text(encoding="utf-8"), object_pairs_hook=strict_json)
        result = validate_event(event, args.repo)
        stage(result, args.output)
        public_report = {key: result[key] for key in ("status", "content_digest", "request_digest")}
        public_report["external_write_performed"] = False
        if args.publish:
            public_report.update(publish(result, args.repo, args.output))
        print(json.dumps(public_report, sort_keys=True))
        return 0
    except Rejected as error:
        print(json.dumps({"status": "withheld", "reason": str(error)}))
        return 2
    except Exception:
        # Do not print exception messages: parsers may include source content.
        print(json.dumps({"status": "withheld", "reason": "input-or-service-invalid"}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
