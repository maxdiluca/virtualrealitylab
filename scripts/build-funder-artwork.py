"""Compose standalone SVG acknowledgement images; preserve original logo files."""
import base64
import html
import json
import mimetypes
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data_path = ROOT / "data/supporters.json"
supporters = json.loads(data_path.read_text())
destination = ROOT / "static/media/funders/acknowledgements"
destination.mkdir(exist_ok=True)
# Marks without identifying words receive a name inside the image itself.
labels = {
    "eu": ["European Union", "Marie Curie / MSCA"],
    "erasmus": ["Erasmus"],
    "meta": ["Facebook / Meta"],
    "unity": ["Unity"],
    "roli": ["ROLI"],
    "siemens": ["Siemens"],
    "partplay": ["PartPlay"],
    "givaudan": ["Givaudan"],
}
provenance = {}
for org in supporters:
    original = org.get("logo", "")
    # Existing names/wordmarks, including recognised abbreviations, need no duplicate.
    if original and org["id"] not in labels:
        org["display_logo"] = original
        org["artwork_type"] = "original_named_logo"
        continue
    lines = labels.get(org["id"], textwrap.wrap(org["name"], width=12, break_long_words=False))
    font_size = min(42, 490 / max(map(len, lines))) if original else 38
    width = 300 if original else max(map(len, lines)) * font_size * .6 + 18
    line_height = font_size * 1.2
    height = 170 + line_height * len(lines) if original else line_height * len(lines) + 16
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {width} {height:.2f}" style="color-scheme:light">', f'<title>{html.escape(org["name"])}</title>']
    if original:
        path = ROOT / "static" / original.lstrip("/")
        assert path.is_file(), original
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        encoded = base64.b64encode(path.read_bytes()).decode()
        parts.append(f'<image x="20" y="4" width="260" height="150" preserveAspectRatio="xMidYMid meet" xlink:href="data:{mime};base64,{encoded}"/>')
        first_y = 170 + font_size * .75
    else:
        first_y = height / 2 - (len(lines) - 1) * line_height / 2 + font_size * .32
    for i, line in enumerate(lines):
        parts.append(f'<text x="{width / 2:.2f}" y="{first_y + i * line_height:.2f}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="{font_size:.2f}" font-weight="600" fill="#254a53">{html.escape(line)}</text>')
    parts.append('</svg>')
    output = destination / (org["id"] + ".svg")
    output.write_text("\n".join(parts) + "\n")
    org["display_logo"] = "/media/funders/acknowledgements/" + output.name
    org["artwork_type"] = "symbol_with_embedded_name" if original else "name_only_image"
    provenance[org["id"]] = {"asset": org["display_logo"], "original_asset": original or None, "method": org["artwork_type"], "label_lines": lines, "note": "Website acknowledgement artwork; original mark retained. Added name is inside the standalone SVG image, not an HTML caption. Name-only artwork does not invent an organisation logo."}
data_path.write_text(json.dumps(supporters, indent=2, ensure_ascii=False) + "\n")
(ROOT / "outputs/funding-review-2026-11-07/acknowledgement-artwork.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n")
print(f"Created {len(provenance)} named image assets; retained {len(supporters) - len(provenance)} already named logos.")
