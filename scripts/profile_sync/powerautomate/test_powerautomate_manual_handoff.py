"""Synthetic manual-handoff checks; no tenant, email, source records or network."""

import base64
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from test_powerautomate_template import Expression, all_actions


HERE = Path(__file__).resolve().parent
ORIGINAL = json.loads((HERE / "flow.template.json").read_text())
TEMPLATE = json.loads((HERE / "flow.manual-handoff.template.json").read_text())
DEFINITION = TEMPLATE["properties"]["definition"]
ROOT = DEFINITION["actions"]
WORK = ROOT["Profile_sync"]["actions"]
SECURE = {"secureData": {"properties": ["inputs", "outputs"]}}
LOCAL_RECEIVER = HERE.parent / "github"
EXPORTED_RECEIVER = HERE.parent
layouts = [directory for directory in (LOCAL_RECEIVER, EXPORTED_RECEIVER)
           if (directory / "profile_sync.py").is_file()
           and (directory / "fixtures/approved-event.json").is_file()]
if len(layouts) != 1:
    raise RuntimeError("manual-handoff receiver layout missing or ambiguous")
RECEIVER = layouts[0]
FIXTURE = json.loads((RECEIVER / "fixtures/approved-event.json").read_text())
spec = importlib.util.spec_from_file_location("manual_handoff_receiver", RECEIVER / "profile_sync.py")
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)


def resolve(value, outputs, parameters=None):
    """Materialize only expression values in the stored synthetic packet."""
    if isinstance(value, str) and value.startswith("@"):
        return Expression(value, outputs=outputs, parameters=parameters).evaluate()
    if isinstance(value, dict):
        return {key: resolve(item, outputs, parameters) for key, item in value.items()}
    if isinstance(value, list):
        return [resolve(item, outputs, parameters) for item in value]
    return value


def assert_contract(template):
    """Fail closed on capability, delivery, dependency or status broadening."""
    p = template["properties"]
    d = p["definition"]
    work = d["actions"]["Profile_sync"]["actions"]
    assert p["state"] == "Stopped"
    assert "EnableExternalDispatch" not in d["parameters"]
    for key in ("EnableCloudActions", "EnableHandoffNotifications", "EnableFailureNotifications"):
        assert d["parameters"][key]["defaultValue"] is False
    assert set(p["connectionReferences"]) == {"shared_sharepointonline", "shared_approvals", "shared_office365"}
    names = [name for name, _ in all_actions(d["actions"])]
    assert len(names) == len(set(names))
    allowed = {
        ("shared_sharepointonline", "GetFileContentByPath"),
        ("shared_approvals", "StartAndWaitForAnApproval"),
        ("shared_office365", "SendEmailV2"),
    }
    for _, action in all_actions(d["actions"]):
        assert action["type"] in {"Compose", "If", "Scope", "Terminate", "OpenApiConnection", "OpenApiConnectionWebhook"}
        if action["type"].startswith("OpenApiConnection"):
            host = action["inputs"]["host"]
            assert (host["connectionName"], host["operationId"]) in allowed
            assert host["apiId"] == "/providers/Microsoft.PowerApps/apis/" + host["connectionName"]
            assert action["runtimeConfiguration"] == SECURE
            if host["operationId"] != "GetFileContentByPath":
                assert action["inputs"]["retryPolicy"] == {"type": "none"}
    assert work["Manual_event"]["runAfter"] == {"Require_payload_bounds": ["Succeeded"]}
    assert work["Manual_event"]["inputs"] == {
        "action": "vr-lab-profile-approved-v1", "sender": {"login": "maxdiluca"},
        "repository": {"full_name": "maxdiluca/virtualrealitylab"},
        "client_payload": "@outputs('Client_payload')",
    }
    assert work["Serialized_manual_event"]["runAfter"] == {"Manual_event": ["Succeeded"]}
    assert work["Serialized_manual_event"]["inputs"] == "@string(outputs('Manual_event'))"
    optional = work["Optional_handoff_notification"]
    assert optional["runAfter"] == {"Serialized_manual_event": ["Succeeded"]}
    assert optional["expression"] == "@equals(parameters('EnableHandoffNotifications'),true)"
    mail = optional["actions"]["Send_manual_handoff_to_same_operator"]
    params = mail["inputs"]["parameters"]
    assert set(params) == {"emailMessage/To", "emailMessage/Subject", "emailMessage/Body", "emailMessage/Importance", "emailMessage/Attachments"}
    assert params["emailMessage/To"] == "@parameters('ProfileApprover')"
    assert "@" not in params["emailMessage/Subject"] + params["emailMessage/Body"]
    assert params["emailMessage/Attachments"] == [
        {"Name": "index.md", "ContentBytes": "@outputs('Markdown_snapshot_base64')"},
        {"Name": "@outputs('Avatar_filename')", "ContentBytes": "@outputs('Avatar_snapshot_base64')"},
        {"Name": "event.json", "ContentBytes": "@base64(outputs('Serialized_manual_event'))"},
    ]
    for name in ("Manual_event", "Serialized_manual_event", "Optional_handoff_notification"):
        assert work[name]["runtimeConfiguration"] == SECURE
    assert work["Manual_checkpoint"]["runAfter"] == {"Optional_handoff_notification": ["Succeeded"]}
    assert work["Manual_checkpoint"]["inputs"] == {
        "status": "approved-awaiting-manual-validation", "receiver_validation_verified": False,
        "private_preview_verified": False, "github_write_performed": False, "publication_verified": False,
    }


class ManualHandoffTests(unittest.TestCase):
    def packet(self):
        payload = FIXTURE["client_payload"]
        outputs = {
            "Folder_key": payload["folder"], "Submission_key": payload["request_id"],
            "Avatar_filename": payload["avatar"]["filename"],
            "Markdown_snapshot_text": payload["profile_markdown"],
            "Markdown_snapshot_base64": base64.b64encode(payload["profile_markdown"].encode()).decode(),
            "Avatar_snapshot_base64": payload["avatar"]["content_base64"],
        }
        outputs["Client_payload"] = resolve(WORK["Client_payload"]["inputs"], outputs)
        outputs["Manual_event"] = resolve(WORK["Manual_event"]["inputs"], outputs)
        outputs["Serialized_manual_event"] = resolve(WORK["Serialized_manual_event"]["inputs"], outputs)
        return outputs

    def test_disabled_microsoft_only_contract(self):
        assert_contract(TEMPLATE)
        self.assertNotIn("shared_github", json.dumps(TEMPLATE))
        self.assertNotIn("CreateRepositoryDispatchEvent", json.dumps(TEMPLATE))
        for key in ("EnableCloudActions", "EnableHandoffNotifications", "EnableFailureNotifications"):
            self.assertFalse(Expression("@equals(parameters('" + key + "'),true)",
                                        parameters={key: DEFINITION["parameters"][key]["defaultValue"]}).evaluate())

    def test_every_existing_source_consent_approval_ledger_and_size_gate_preserved(self):
        original = ORIGINAL["properties"]["definition"]
        self.assertEqual(DEFINITION["triggers"], original["triggers"])
        for name, action in original["actions"].items():
            if name != "Profile_sync":
                self.assertEqual(ROOT[name], action, name)
        for name, action in original["actions"]["Profile_sync"]["actions"].items():
            if name != "External_dispatch_enabled":
                self.assertEqual(WORK[name], action, name)
        for key, value in original["parameters"].items():
            if key != "EnableExternalDispatch":
                self.assertEqual(DEFINITION["parameters"][key], value)

    def test_capability_delivery_and_success_claim_mutations_are_rejected(self):
        variants = []
        v = deepcopy(TEMPLATE)
        v["properties"]["definition"]["parameters"]["EnableHandoffNotifications"]["defaultValue"] = True
        variants.append(v)
        v = deepcopy(TEMPLATE)
        v["properties"]["definition"]["actions"]["Profile_sync"]["actions"]["Manual_event"]["runAfter"] = {"Get_markdown": ["Succeeded"]}
        variants.append(v)
        for mutation in ("recipient", "attachment", "retry", "cc", "status", "http"):
            v = deepcopy(TEMPLATE)
            work = v["properties"]["definition"]["actions"]["Profile_sync"]["actions"]
            mail = work["Optional_handoff_notification"]["actions"]["Send_manual_handoff_to_same_operator"]
            if mutation == "recipient":
                mail["inputs"]["parameters"]["emailMessage/To"] = "@triggerBody()?['Recipient']"
            elif mutation == "attachment":
                mail["inputs"]["parameters"]["emailMessage/Attachments"][0]["ContentBytes"] = "@body('Reread_markdown')?['$content']"
            elif mutation == "retry":
                mail["inputs"]["retryPolicy"] = {"type": "exponential", "count": 3}
            elif mutation == "cc":
                mail["inputs"]["parameters"]["emailMessage/Cc"] = "other@example.invalid"
            elif mutation == "status":
                work["Manual_checkpoint"]["inputs"]["publication_verified"] = True
            else:
                work["Unexpected_http"] = {"type": "Http", "inputs": {"uri": "https://example.invalid"}, "runAfter": {}}
            variants.append(v)
        for index, variant in enumerate(variants):
            with self.subTest(mutation=index), self.assertRaises(AssertionError):
                assert_contract(variant)

    def test_manual_packet_matches_existing_local_receiver_and_exact_attachment_bytes(self):
        outputs = self.packet()
        mail = WORK["Optional_handoff_notification"]["actions"]["Send_manual_handoff_to_same_operator"]
        attachments = resolve(mail["inputs"]["parameters"]["emailMessage/Attachments"], outputs)
        downloaded = {item["Name"]: base64.b64decode(item["ContentBytes"], validate=True) for item in attachments}
        event = json.loads(downloaded["event.json"])
        self.assertEqual(event, FIXTURE)
        with tempfile.TemporaryDirectory() as name:
            root = Path(name).resolve()
            repo = root / "website"
            (repo / "content/authors").mkdir(parents=True)
            result = receiver.validate_event(event, repo)
            self.assertEqual(result["files"], {
                "content/authors/Synthetic_Member/_index.md": downloaded["index.md"],
                "content/authors/Synthetic_Member/avatar.png": downloaded["synthetic.png"],
            })
            stage = root / "stage"
            receiver.stage(result, stage)
            for relative, content in result["files"].items():
                self.assertEqual((stage / relative).read_bytes(), content)
            self.assertFalse(json.loads((stage / "receipt.json").read_text())["external_write_performed"])

    def test_receiver_still_rejects_incomplete_content_and_changed_image_bytes(self):
        with tempfile.TemporaryDirectory() as name:
            repo = Path(name).resolve()
            (repo / "content/authors").mkdir(parents=True)
            event = self.packet()["Manual_event"]
            event["client_payload"]["profile_markdown"] = event["client_payload"]["profile_markdown"].split("---\n\n")[0] + "---\n\n"
            with self.assertRaises(receiver.Rejected):
                receiver.validate_event(event, repo)
            event = self.packet()["Manual_event"]
            original = base64.b64decode(event["client_payload"]["avatar"]["content_base64"])
            event["client_payload"]["avatar"]["content_base64"] = base64.b64encode(original + b"unapproved-trailing-data").decode()
            with self.assertRaises(receiver.Rejected):
                receiver.validate_event(event, repo)
        self.assertFalse(WORK["Manual_checkpoint"]["inputs"]["receiver_validation_verified"])
        self.assertFalse(WORK["Manual_checkpoint"]["inputs"]["private_preview_verified"])

    def test_missing_consent_or_ledger_reservation_stops(self):
        outputs = self.packet()
        outputs["Avatar_stem"] = outputs["Avatar_filename"].split(".")[0]
        attestations = {"SubjectConsentVerified": True, "ImageConsentVerified": True, "DispatchIntentReserved": True}
        gate = ROOT["Require_input_boundaries"]["expression"]
        self.assertTrue(Expression(gate, outputs=outputs, trigger=attestations).evaluate())
        for key in attestations:
            for bad in (False, None, "true"):
                self.assertFalse(Expression(gate, outputs=outputs, trigger={**attestations, key: bad}).evaluate())
        for bad in ("../secret", "folder/other", "0invalid", "A" * 81):
            self.assertFalse(Expression(gate, outputs={**outputs, "Folder_key": bad}, trigger=attestations).evaluate())

    def test_denied_wrong_missing_or_multiple_approval_stops(self):
        approved = {"outcome": "Approve", "responses": [{"approverResponse": "Approve", "responder": {"email": "operator@example.invalid"}}]}
        config = {"ProfileApprover": "operator@example.invalid"}
        gate = WORK["Require_exact_approval"]["expression"]
        self.assertTrue(Expression(gate, parameters=config, bodies={"Approval": approved}).evaluate())
        cases = [{}, {"outcome": "Approve"}, {"outcome": "Approve", "responses": []},
                 {"outcome": "Approve", "responses": None}, {"outcome": "Reject", "responses": approved["responses"]},
                 {"outcome": "Approve", "responses": approved["responses"] * 2},
                 {"outcome": "Approve", "responses": [{"approverResponse": "Approve", "responder": {"email": "other@example.invalid"}}]}]
        for case in cases:
            self.assertFalse(Expression(gate, parameters=config, bodies={"Approval": case}).evaluate())

    def test_changed_or_missing_reread_never_releases_handoff(self):
        outputs = self.packet()
        bodies = {"Reread_markdown": {"$content": outputs["Markdown_snapshot_base64"]},
                  "Reread_avatar": {"$content": outputs["Avatar_snapshot_base64"]}}
        gate = WORK["Require_unchanged_snapshots"]["expression"]
        self.assertTrue(Expression(gate, outputs=outputs, bodies=bodies).evaluate())
        for key in bodies:
            for content in ("Y2hhbmdlZA==", "", None):
                self.assertFalse(Expression(gate, outputs=outputs, bodies={**bodies, key: {"$content": content}}).evaluate())
        self.assertEqual(WORK["Client_payload"]["runAfter"], {"Require_unchanged_snapshots": ["Succeeded"]})

    def test_payload_byte_limit_and_separate_failure_notification(self):
        gate = WORK["Require_payload_bounds"]["expression"]
        for text, expected in (("x" * 60000, True), ("x" * 60001, False), ("é" * 30000, True), ("é" * 30001, False)):
            self.assertEqual(Expression(gate, outputs={"Serialized_payload": text}).evaluate(), expected)
        failure = ROOT["Catch_failure"]["actions"]["Optional_failure_notification"]
        self.assertIn("EnableFailureNotifications", failure["expression"])
        self.assertNotIn("EnableHandoffNotifications", failure["expression"])
        instructions = WORK["Optional_handoff_notification"]["actions"]["Send_manual_handoff_to_same_operator"]["inputs"]["parameters"]["emailMessage/Body"]
        for requirement in ("without --publish", "strict private", "before any public upload", "draft PR", "Read back", "not authenticated GitHub provenance"):
            self.assertIn(requirement, instructions)


if __name__ == "__main__":
    unittest.main()
