"""Offline structural and synthetic boundary checks; not a Power Automate validator."""

import base64
import json
import re
import unittest
from pathlib import Path
from urllib.parse import quote, unquote


HERE = Path(__file__).resolve().parent
TEMPLATE = json.loads((HERE / "flow.template.json").read_text())
DEFINITION = TEMPLATE["properties"]["definition"]
ROOT = DEFINITION["actions"]
WORK = ROOT["Profile_sync"]["actions"]


class Expression:
    """Evaluate the small documented WDL subset used by boundary conditions.

    This deliberately does not run actions, emulate connectors or claim platform
    equivalence. It evaluates the expressions stored in the actual template so
    changing a security condition without updating a duplicate Python predicate
    is detectable using hostile synthetic fixtures.
    """

    def __init__(self, expression, outputs=None, trigger=None, parameters=None,
                 bodies=None):
        self.source = expression.removeprefix("@")
        self.pos = 0
        self.outputs = outputs or {}
        self.trigger = trigger or {}
        self.parameters = parameters or {}
        self.bodies = bodies or {}

    def evaluate(self):
        result = self.value()
        self.space()
        if self.pos != len(self.source):
            raise AssertionError("unparsed WDL expression")
        return result

    def space(self):
        while self.pos < len(self.source) and self.source[self.pos].isspace():
            self.pos += 1

    def value(self):
        self.space()
        if self.source[self.pos] == "'":
            self.pos += 1
            chars = []
            while self.pos < len(self.source):
                char = self.source[self.pos]
                self.pos += 1
                if char == "'":
                    if self.pos < len(self.source) and self.source[self.pos] == "'":
                        chars.append("'")
                        self.pos += 1
                    else:
                        break
                else:
                    chars.append(char)
            result = "".join(chars)
        else:
            token = re.match(r"[A-Za-z_][A-Za-z0-9_]*|[0-9]+", self.source[self.pos:])
            if not token:
                raise AssertionError("unsupported WDL token")
            name = token.group(0)
            self.pos += len(name)
            self.space()
            if name.isdigit():
                result = int(name)
            elif name in ("true", "false", "null"):
                result = {"true": True, "false": False, "null": None}[name]
            else:
                assert self.source[self.pos] == "("
                self.pos += 1
                args = []
                self.space()
                while self.source[self.pos] != ")":
                    args.append(self.value())
                    self.space()
                    if self.source[self.pos] != ",":
                        break
                    self.pos += 1
                assert self.source[self.pos] == ")"
                self.pos += 1
                result = self.call(name, args)
        self.space()
        while self.source[self.pos:self.pos + 2] == "?[":
            self.pos += 2
            key = self.value()
            assert self.source[self.pos] == "]"
            self.pos += 1
            result = result.get(key) if isinstance(result, dict) else None
            self.space()
        return result

    def call(self, name, args):
        functions = {
            "and": lambda *a: all(a), "or": lambda *a: any(a),
            "not": lambda a: not a, "equals": lambda a, b: a == b,
            "greater": lambda a, b: a > b,
            "lessOrEquals": lambda a, b: a <= b,
            "contains": lambda a, b: b in a, "length": len,
            "uriComponent": lambda a: quote(a, safe="-_.!~*'()"),
            "substring": lambda a, start, size: a[start:start + size],
            "concat": lambda *a: "".join(a), "split": lambda a, b: a.split(b),
            "first": lambda a: a[0], "toLower": str.lower, "trim": str.strip,
            "startsWith": str.startswith, "endsWith": str.endswith,
            "coalesce": lambda *a: next((v for v in a if v is not None), None),
            "string": lambda a: a if isinstance(a, str) else json.dumps(a, separators=(",", ":"), ensure_ascii=False),
            "base64": lambda a: base64.b64encode(a.encode("utf-8")).decode(),
            "base64ToString": lambda a: base64.b64decode(a).decode("utf-8"),
            "json": json.loads, "decodeUriComponent": unquote,
            "empty": lambda a: a is None or len(a) == 0,
            "if": lambda condition, yes, no: yes if condition else no,
            "outputs": lambda a: self.outputs[a],
            "triggerBody": lambda: self.trigger,
            "parameters": lambda a: self.parameters[a],
            "body": lambda a: self.bodies[a],
        }
        if name not in functions:
            raise AssertionError(f"unsupported WDL function: {name}")
        return functions[name](*args)


def all_actions(actions):
    for name, action in actions.items():
        yield name, action
        yield from all_actions(action.get("actions", {}))
        yield from all_actions(action.get("else", {}).get("actions", {}))


class TemplateTests(unittest.TestCase):
    def boundaries(self, folder="Staff_SyntheticPerson", submission="synthetic_v1",
                   avatar="DEFAULT_AVATAR.png", **attestations):
        outputs = {"Folder_key": folder, "Submission_key": submission,
                   "Avatar_filename": avatar, "Avatar_stem": avatar.split(".")[0]}
        trigger = {"SubjectConsentVerified": True, "ImageConsentVerified": True,
                   "DispatchIntentReserved": True, **attestations}
        return Expression(ROOT["Require_input_boundaries"]["expression"],
                          outputs=outputs, trigger=trigger).evaluate()

    def test_disabled_by_default_and_before_every_cloud_action(self):
        self.assertEqual(TEMPLATE["properties"]["state"], "Stopped")
        for key in ("EnableCloudActions", "EnableExternalDispatch", "EnableFailureNotifications"):
            self.assertIs(DEFINITION["parameters"][key]["defaultValue"], False)
        self.assertEqual(ROOT["Folder_key"]["runAfter"], {"Cloud_actions_enabled": ["Succeeded"]})
        self.assertEqual(ROOT["Profile_sync"]["runAfter"], {"Require_configuration": ["Succeeded"]})
        self.assertEqual(ROOT["Cloud_actions_enabled"]["else"]["actions"]["Stop_disabled"]["inputs"], {"runStatus": "Succeeded"})
        self.assertEqual(DEFINITION["triggers"]["manual"]["kind"], "Button")
        names = [name for name, _ in all_actions(ROOT)]
        self.assertEqual(len(names), len(set(names)), "Power Automate action names must be unambiguous")

    def test_hostile_folder_filename_and_submission_boundaries(self):
        self.assertTrue(self.boundaries())
        self.assertTrue(self.boundaries(folder="A" + "x" * 79, submission="9" + "x" * 99,
                                        avatar="A" + "x" * 79 + ".jpeg"))
        bad_folders = ("", "../secret", "safe/secret", "safe\\secret", "%2fsecret",
                       "x.y", "x!", "x~", "x*", "x'", "x(", "x)", "x y", "x\n",
                       "équipe", "_hidden", "-hidden", "0start", "A" * 81)
        for folder in bad_folders:
            with self.subTest(folder=repr(folder)):
                self.assertFalse(self.boundaries(folder=folder))
        for avatar in ("index.md", "../photo.png", "folder/photo.png", "photo.svg", "photo.PNG",
                       "photo.png.exe", "photo..png", "_photo.png", "A" * 81 + ".png"):
            with self.subTest(avatar=avatar):
                self.assertFalse(self.boundaries(avatar=avatar))
        for submission in ("", "../key", "key%20", "_key", "-key", "k" * 101):
            self.assertFalse(self.boundaries(submission=submission))
        for key in ("SubjectConsentVerified", "ImageConsentVerified", "DispatchIntentReserved"):
            self.assertFalse(self.boundaries(**{key: False}))

    def test_named_gets_only_and_connection_aliases(self):
        connectors = [(n, a) for n, a in all_actions(ROOT) if a["type"].startswith("OpenApiConnection")]
        allowed = {"GetFileContentByPath", "StartAndWaitForAnApproval", "CreateRepositoryDispatchEvent", "SendEmailV2"}
        self.assertEqual({a["inputs"]["host"]["operationId"] for _, a in connectors}, allowed)
        reads = [(n, a) for n, a in connectors if a["inputs"]["host"]["operationId"] == "GetFileContentByPath"]
        self.assertEqual({n for n, _ in reads}, {"Get_markdown", "Get_avatar", "Reread_markdown", "Reread_avatar"})
        for name, action in connectors:
            host = action["inputs"]["host"]
            self.assertIn(host["connectionName"], TEMPLATE["properties"]["connectionReferences"])
            self.assertEqual(action["runtimeConfiguration"]["secureData"]["properties"], ["inputs", "outputs"])
            self.assertNotIn("authentication", action["inputs"])
        for name, action in reads:
            parameters = action["inputs"]["parameters"]
            self.assertEqual(parameters["dataset"], "@parameters('ProfileSiteAddress')")
            self.assertIn("parameters('ProfileRoot')", parameters["path"])
            self.assertIn("outputs('Folder_key')", parameters["path"])
            self.assertNotIn("triggerBody", parameters["path"])
            self.assertEqual(action["inputs"]["retryPolicy"]["count"], 3)

    def test_configuration_rejects_other_github_target_or_recipient(self):
        config = {"ProfileSiteAddress": "https://example.invalid", "ProfileRoot": "/SyntheticProfiles",
                  "ProfileApprover": "operator@example.invalid", "GitHubOwner": "maxdiluca",
                  "GitHubRepository": "virtualrealitylab"}
        gate = ROOT["Require_configuration"]["expression"]
        self.assertTrue(Expression(gate, parameters=config).evaluate())
        for key, value in (("GitHubOwner", "other"), ("GitHubRepository", "other"),
                           ("ProfileApprover", "one@example.invalid;two@example.invalid"),
                           ("ProfileApprover", "one@example.invalid\ntwo@example.invalid"),
                           ("ProfileRoot", "/public/../private"),
                           ("ProfileRoot", "/__PROFILE_ROOT__")):
            self.assertFalse(Expression(gate, parameters={**config, key: value}).evaluate())

    def test_snapshot_size_nonempty_and_lossless_utf8(self):
        markdown = "---\ntitle: Synthetic Person\n---\nA complete synthetic public biography.\n"
        encoded = base64.b64encode(markdown.encode("utf-8")).decode()
        outputs = {"Markdown_snapshot_text": markdown, "Markdown_snapshot_base64": encoded,
                   "Avatar_snapshot_base64": "aW1hZ2U="}
        gate = WORK["Require_snapshot_bounds"]["expression"]
        self.assertTrue(Expression(gate, outputs=outputs).evaluate())
        for key, value in (("Markdown_snapshot_text", "different decoded content"),
                           ("Markdown_snapshot_text", ""), ("Avatar_snapshot_base64", ""),
                           ("Avatar_snapshot_base64", "A" * 43692)):
            self.assertFalse(Expression(gate, outputs={**outputs, key: value}).evaluate())
        unicode_text = "é" * 8000
        utf8 = base64.b64encode(unicode_text.encode("utf-8")).decode()
        self.assertFalse(Expression(gate, outputs={**outputs, "Markdown_snapshot_text": unicode_text,
                                                    "Markdown_snapshot_base64": utf8}).evaluate())

    def test_exact_snapshot_approval_identity_and_reread(self):
        approval = WORK["Approval"]
        p = approval["inputs"]["parameters"]
        self.assertEqual(p["WebhookApprovalCreationInput/assignedTo"], "@parameters('ProfileApprover')")
        self.assertIn("content/authors/FolderKey/_index.md", p["WebhookApprovalCreationInput/details"])
        self.assertIn("content/authors/FolderKey/avatar.png", p["WebhookApprovalCreationInput/details"])
        self.assertIs(p["WebhookApprovalCreationInput/enableReassignment"], False)
        self.assertEqual(p["WebhookApprovalCreationInput/attachments"], [
            {"name": "index.md", "content": "@outputs('Markdown_snapshot_base64')"},
            {"name": "@outputs('Avatar_filename')", "content": "@outputs('Avatar_snapshot_base64')"},
        ])
        self.assertEqual(approval["runAfter"], {"Require_snapshot_bounds": ["Succeeded"]})
        self.assertEqual(approval["inputs"]["retryPolicy"], {"type": "none"})
        self.assertEqual(approval["limit"]["timeout"], "P7D")
        gate = WORK["Require_exact_approval"]["expression"]
        approved = {"outcome": "Approve", "responses": [{"approverResponse": "Approve",
                    "responder": {"email": "Operator@Example.invalid"}}]}
        config = {"ProfileApprover": "operator@example.invalid"}
        self.assertTrue(Expression(gate, parameters=config, bodies={"Approval": approved}).evaluate())
        for bad in ({"outcome": "Reject", "responses": approved["responses"]},
                    {"outcome": "Approve", "responses": [{"approverResponse": "Approve", "responder": {"email": "other@example.invalid"}}]},
                    {"outcome": "Approve", "responses": [{"approverResponse": "Approve", "responder": {}}]}):
            self.assertFalse(Expression(gate, parameters=config, bodies={"Approval": bad}).evaluate())
        stable = {"Markdown_snapshot_base64": "bWFya2Rvd24=", "Avatar_snapshot_base64": "aW1hZ2U="}
        bodies = {"Reread_markdown": {"$content": stable["Markdown_snapshot_base64"]},
                  "Reread_avatar": {"$content": stable["Avatar_snapshot_base64"]}}
        equal_gate = WORK["Require_unchanged_snapshots"]["expression"]
        self.assertTrue(Expression(equal_gate, outputs=stable, bodies=bodies).evaluate())
        bodies["Reread_avatar"]["$content"] = "Y2hhbmdlZA=="
        self.assertFalse(Expression(equal_gate, outputs=stable, bodies=bodies).evaluate())
        self.assertEqual(WORK["Reread_markdown"]["runAfter"], {"Require_exact_approval": ["Succeeded"]})
        self.assertEqual(WORK["Client_payload"]["runAfter"], {"Require_unchanged_snapshots": ["Succeeded"]})

    def test_six_key_receiver_contract_byte_budget_and_no_write_retry(self):
        payload = WORK["Client_payload"]["inputs"]
        self.assertEqual(set(payload), {"schema_version", "request_id", "folder", "profile_markdown", "avatar", "approval"})
        self.assertEqual(payload["schema_version"], 1)
        self.assertEqual(payload["request_id"], "@outputs('Submission_key')")
        self.assertEqual(payload["approval"], {"profile_approved": True, "image_approved": True})
        gate = WORK["Require_payload_bounds"]["expression"]
        for value, expected in (("x" * 60000, True), ("x" * 60001, False), ("é" * 30000, True), ("é" * 30001, False)):
            self.assertEqual(Expression(gate, outputs={"Serialized_payload": value}).evaluate(), expected)
        external = WORK["External_dispatch_enabled"]
        self.assertEqual(external["expression"], "@equals(parameters('EnableExternalDispatch'),true)")
        self.assertEqual(external["runAfter"], {"Require_payload_bounds": ["Succeeded"]})
        dispatch = external["actions"]["Dispatch_approved_profile"]
        self.assertEqual(dispatch["inputs"]["parameters"]["event_type"], "vr-lab-profile-approved-v1")
        self.assertEqual(dispatch["inputs"]["parameters"]["client_payload"], "@outputs('Client_payload')")
        self.assertEqual(dispatch["inputs"]["retryPolicy"], {"type": "none"})
        self.assertEqual(external["actions"]["Queued_unverified"]["inputs"], {"status": "queued-unverified", "publication_verified": False})
        self.assertNotIn("guid(", json.dumps(TEMPLATE))

    def test_failure_timeout_handling_minimal_operator_only_message(self):
        catch = ROOT["Catch_failure"]
        self.assertEqual(catch["runAfter"], {"Profile_sync": ["Failed", "TimedOut"]})
        optional = catch["actions"]["Optional_failure_notification"]
        self.assertIn("EnableFailureNotifications", optional["expression"])
        notification = optional["actions"]["Notify_same_named_operator"]["inputs"]
        params = notification["parameters"]
        self.assertEqual(params["emailMessage/To"], "@parameters('ProfileApprover')")
        self.assertEqual(set(params), {"emailMessage/To", "emailMessage/Subject", "emailMessage/Body", "emailMessage/Importance"})
        self.assertNotIn("@", params["emailMessage/Body"])
        self.assertEqual(notification["retryPolicy"], {"type": "none"})
        self.assertEqual(catch["actions"]["Stop_after_failure"]["inputs"]["runError"]["code"], "PROFILE_SYNC_FAILED_OR_TIMED_OUT")
        self.assertNotIn("result(", json.dumps(catch))


if __name__ == "__main__":
    unittest.main()
