"""Export the contribution register and derive public costing inputs without counting bids."""
import csv
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / "records/funding"
register = json.loads((DIRECTORY / "contributions.json").read_text())
prices = json.loads((DIRECTORY / "cost-sources.json").read_text())
funding_path = ROOT / "data/funding.json"
funding = json.loads(funding_path.read_text())
public = {r["id"]: r for r in funding["records"]}
supporters = {r["id"]: r for r in json.loads((ROOT / "data/supporters.json").read_text())}
weights = {"basis": register["valuation_policy"], "exchange_rates": register["exchange_rates"], "contributions": [], "excluded_valued_records": [], "unvalued_contributions": []}
ids = set()


def money(value, currency):
    if value is None:
        return "Not costed"
    return {"GBP": "£", "USD": "US$", "EUR": "€"}.get(currency, currency or "") + f"{value:,.2f}".removesuffix(".00")


for entry in register["entries"]:
    rid = entry["id"]
    assert rid not in ids
    ids.add(rid)
    value = entry["valuation"]
    cloud = entry["cloud"]
    if cloud["include"]:
        assert entry["public_record"] in public
        assert value["classification"] in {"recorded", "recorded_approximate", "ai_assisted_estimate"}
        assert entry["status"] in {"awarded_or_supported", "awarded_ongoing", "agreed_delivery_unconfirmed", "donated_recorded", "user_confirmed_support"}
        assert cloud["attributed_to"] in public[entry["public_record"]]["supporters"]
        assert value["amount"] > 0
        weights["contributions"].append({"record": rid, "supporter": cloud["attributed_to"], "amount": value["amount"], "currency": value["currency"], "kind": entry["kind"], "note": value["method"], "classification": value["classification"], "low": value.get("low"), "high": value.get("high"), "status": entry["status"], "assumptions": value["assumptions"]})
    elif entry["public_record"]:
        if value["classification"] == "partner_held_recorded":
            weights["excluded_valued_records"].append({"record": rid, "reason": cloud["reason"]})
        else:
            for sid in entry["supporters"]:
                weights["unvalued_contributions"].append({"record": rid, "supporter": sid, "reason": cloud["reason"]})
    if entry["public_record"] and value["classification"] in {"recorded_approximate", "ai_assisted_estimate"}:
        r = public[entry["public_record"]]
        if value["classification"] == "ai_assisted_estimate":
            r["value"] = "Estimated " + money(value["amount"], value["currency"])
            if value.get("low") is not None and value.get("high") is not None and value["low"] != value["high"]:
                r["value"] += f" (scenario range {money(value['low'], value['currency'])}–{money(value['high'], value['currency'])})"
            r["costing"] = {"summary": value["method"], "assumptions": value["assumptions"], "sources": [{"label": key, "url": prices[key]["url"]} for key in value["cost_sources"]]}
        else:
            r["value"] = "Approximately " + money(value["amount"], value["currency"]) + " (CV estimate)"
            r["costing"] = {"summary": value["method"]}

assert set(public) == {e["public_record"] for e in register["entries"] if e["public_record"]}
(ROOT / "data/funding_weights.json").write_text(json.dumps(weights, indent=2, ensure_ascii=False) + "\n")
funding["reviewed"] = date.fromisoformat(register["updated"]).strftime("%-d %B %Y")
funding_path.write_text(json.dumps(funding, indent=2, ensure_ascii=False) + "\n")

fields = ["id", "title", "supporters", "period", "status", "status_as_of", "value_type", "amount", "currency", "low", "high", "cloud_included", "method", "assumptions", "follow_up"]
with (DIRECTORY / "Contribution-register.csv").open("w", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    for e in register["entries"]:
        v = e["valuation"]
        writer.writerow({"id": e["id"], "title": e["title"], "supporters": "; ".join(supporters.get(s, {"name": s})["name"] for s in e["supporters"]), "period": e["period"], "status": e["status"], "status_as_of": e["status_as_of"], "value_type": v["classification"], "amount": v["amount"], "currency": v["currency"], "low": v.get("low"), "high": v.get("high"), "cloud_included": e["cloud"]["include"], "method": v["method"], "assumptions": "; ".join(v["assumptions"]), "follow_up": "; ".join(e["follow_up"])})

lines = ["# Contribution register", "", f"Updated {register['updated']}. {len(register['entries'])} entries. This working register is not an accounting ledger or a public list of awarded income.", "", register["valuation_policy"], "", "Pipeline statuses reflect the dated CV snapshot unless stated otherwise; they have not been refreshed from live award portals. Equipment estimates use cited list-price benchmarks, not actual donor purchase costs or second-hand fair values. Ranges are scenarios, not statistical intervals.", "", "## Overview", "", "| ID | Contribution | Status | Valuation | Cloud |", "| --- | --- | --- | --- | --- |"]
for e in register["entries"]:
    v = e["valuation"]
    label = money(v["amount"], v["currency"])
    if v["amount"] is not None:
        label += " — " + v["classification"].replace("_", " ")
    lines.append(f"| {e['id']} | {e['title']} | {e['status'].replace('_', ' ')} | {label} | {'Included' if e['cloud']['include'] else 'Excluded'} |")
lines += ["", "## Costing assumptions and outstanding work", ""]
for e in register["entries"]:
    v = e["valuation"]
    lines += [f"### {e['id']} — {e['title']}", "", f"Status: **{e['status'].replace('_', ' ')}**, recorded as of {e['status_as_of']}. Recipient: {e['recipient']}.", "", f"Valuation: **{money(v['amount'], v['currency'])}** ({v['classification'].replace('_', ' ')}). {v['method']}", ""]
    if v.get("low") is not None and v.get("high") is not None and v["low"] != v["high"]:
        lines += [f"Scenario range: {money(v['low'], v['currency'])}–{money(v['high'], v['currency'])}.", ""]
    for note in v["assumptions"]:
        lines.append("- Assumption: " + note)
    for note in e["follow_up"]:
        lines.append("- Follow-up: " + note)
    for key in v["cost_sources"]:
        lines.append(f"- Cost source: [{key}]({prices[key]['url']}) — {prices[key]['basis']}")
    source = e.get("evidence", {})
    lines += ["", "Contribution evidence: " + str(source.get("source", "See source-register.json and CV archive.")), "", "Cloud: " + e["cloud"]["reason"], ""]
(DIRECTORY / "Contribution-register.md").write_text("\n".join(lines) + "\n")
print(f"Exported {len(ids)} records and {len(weights['contributions'])} costed contributions.")
