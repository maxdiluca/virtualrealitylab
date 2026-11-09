"""Build a funding cloud with a fixed base area plus area proportional to value."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
inputs = json.loads((ROOT / "data/funding_weights.json").read_text())
records = {x["id"]: x for x in json.loads((ROOT / "data/funding.json").read_text())["records"]}
supporters = {x["id"]: x for x in json.loads((ROOT / "data/supporters.json").read_text())}
fx = inputs["exchange_rates"]
rates = {"GBP": 1, "EUR": fx["gbp_per_eur"], "USD": fx["gbp_per_eur"] / fx["usd_per_eur"]}
totals = {}
seen = set()
for contribution in inputs["contributions"]:
    rid, sid = contribution["record"], contribution["supporter"]
    assert rid in records and sid in records[rid]["supporters"] and rid not in seen
    seen.add(rid)
    row = totals.setdefault(sid, {"id": sid, "name": supporters[sid]["name"], "gbp": 0, "records": [], "in_kind_gbp": 0, "estimated_gbp": 0, "pending_delivery_gbp": 0})
    value = contribution["amount"] * rates[contribution["currency"]]
    row["gbp"] += value
    row["records"].append(rid)
    if contribution["kind"] == "in-kind":
        row["in_kind_gbp"] += value
    if contribution.get("classification") == "ai_assisted_estimate":
        row["estimated_gbp"] += value
    if contribution.get("status") == "agreed_delivery_unconfirmed":
        row["pending_delivery_gbp"] += value

for contribution in inputs.get("unvalued_contributions", []):
    rid, sid = contribution["record"], contribution["supporter"]
    assert rid in records and sid in records[rid]["supporters"] and rid not in seen
    if sid in totals:
        totals[sid].setdefault("unvalued_records", []).append(rid)


minimum = min(x["gbp"] for x in totals.values())
maximum = max(x["gbp"] for x in totals.values())
BASE_RADIUS = 32
MAX_RADIUS = 100
AREA_SCALE = (MAX_RADIUS ** 2 - BASE_RADIUS ** 2) / maximum


def layout(rows):
    """Pack circles with a readable base area and a proportional area increment."""
    placed = []
    for row in sorted(rows, key=lambda x: (-x["gbp"], x["id"])):
        radius = math.sqrt(BASE_RADIUS ** 2 + AREA_SCALE * row["gbp"])
        x = y = 0
        if placed:
            for step in range(1, 100000):
                distance = 2 * math.sqrt(step)
                angle = step * 2.399963229728653
                x, y = distance * math.cos(angle), distance * math.sin(angle)
                if all(math.hypot(x - item["x"], y - item["y"]) >= radius + item["r"] + 5 for item in placed):
                    break
            else:
                raise RuntimeError("Circle packing did not converge")
        p = {**row, "r": radius, "x": x, "y": y}
        placed.append(p)
        p["amount_label"] = f"≈£{p['gbp']:,.0f}"
        p["label"] = f"{p['name']}: {p['amount_label']} in recorded and estimated support"
        if p["estimated_gbp"]:
            p["label"] += f"; includes approximately £{p['estimated_gbp']:,.0f} in AI-assisted cost estimates"
        if p["pending_delivery_gbp"]:
            p["label"] += "; includes an agreed donation with delivery unconfirmed"
        if p.get("unvalued_records"):
            pending = "; ".join(records[rid]["title"] for rid in p["unvalued_records"])
            p["label"] += f"; excludes additional support with unconfirmed value: {pending}"
        p["href"] = "#" + p["records"][0]
        org = supporters[p["id"]]
        p["logo"] = org.get("display_logo") or org.get("logo", "")
        p["dark_logo"] = org.get("dark_logo", False)
        words = p["name"].split()
        p["lines"] = [" ".join(words[i:i + 2]) for i in range(0, len(words), 2)]
    left = min(p["x"] - p["r"] for p in placed) - 8
    top = min(p["y"] - p["r"] for p in placed) - 8
    right = max(p["x"] + p["r"] for p in placed) + 8
    bottom = max(p["y"] + p["r"] for p in placed) + 8
    for p in placed:
        p["x"] -= left
        p["y"] -= top
    assert all(math.isclose((p["r"] ** 2 - BASE_RADIUS ** 2) / p["gbp"], AREA_SCALE, rel_tol=1e-10) for p in placed)
    assert all(BASE_RADIUS <= p["r"] <= MAX_RADIUS for p in placed)
    for i, a in enumerate(placed):
        for b in placed[i + 1:]:
            assert math.hypot(a["x"] - b["x"], a["y"] - b["y"]) >= a["r"] + b["r"]
    return {"width": right - left, "height": bottom - top, "items": placed}


result = {"main": layout(list(totals.values())), "home": layout([totals[k] for k in ["uob", "epsrc", "bbsrc", "eu", "google", "daad"]])}
result["unweighted"] = [s for s in supporters.values() if s["id"] not in totals and s["id"] not in ["william-edwards", "givaudan"]]
result["scale"] = {"type": "base_plus_proportional_area", "maximum_gbp": maximum, "formula": "diameter = sqrt(64^2 + (200^2 - 64^2) * value / maximum)", "proportional_area": False, "base_diameter": 64, "maximum_diameter": 200, "units": "SVG viewBox units; uniformly scaled to fit the viewport"}
result["total_gbp"] = sum(x["gbp"] for x in totals.values())
(ROOT / "data/funding_cloud.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
print(f"Built {len(totals)} weighted supporters from {len(seen)} contributions; proportional added area, diameter bounds and non-overlap verified.")
