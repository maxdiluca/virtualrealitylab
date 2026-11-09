# Funding and contribution register

`contributions.json` is the authoritative costing and status register. It includes grants, gifts, student support, equipment, agreed donations, applications in progress and unsuccessful applications. It is outside Hugo's public content and static directories; it is not published by the website build. It may still be visible to anyone with repository access.

`Contribution-register.md` and `Contribution-register.csv` are generated review copies. `cost-sources.json` contains dated price and rate evidence. Original contribution evidence is retained per entry, with the reviewed CV archive indexed in `outputs/funding-review-2026-11-07/source-register.json`.

Record changes in `history/changes.jsonl`; preserve previous material values or states before replacing them. Do not overwrite an award value with an estimate without retaining the original. Unknown values are null, never zero. A proposal budget is not a contribution, and an agreed donation is not verified delivery.

For new support, create a stable ID, record recipient, funder, status and evidence date, quantity/model or funded duration, currency, valuation basis and outstanding questions. If it belongs on the public acknowledgement page, also create its public record in `data/funding.json`. Set `cloud.include` only when an attributable awarded, supported or committed contribution can be costed; never include unawarded bids. Estimates require cited benchmarks and explicit assumptions. Record ranges when models or quantities vary; never describe scenario ranges as confidence intervals.

Refresh the generated files after editing the register:

```sh
python3 scripts/sync-contribution-register.py
python3 scripts/build-funder-artwork.py
python3 scripts/build-funding-cloud.py
hugo --gc --minify --destination /private/tmp/vrlab-funding-preview --baseURL http://localhost:8765/
```

The sync script refuses duplicate IDs, unawarded weights, missing public records and unsupported funder attribution. The cloud generator verifies that the area added above a fixed base is proportional to attributed GBP value, with diameters bounded between 64 and 200 design units and no overlaps. Names are incorporated into standalone image assets only where the original mark lacks a name. Already named logos are retained without duplicate captions. The formula is diameter = sqrt(64² + (200² − 64²) × value / maximum). Total areas are not proportional to value; the base keeps smaller contributors visible. Review the rendered page whenever values or labels materially change.
