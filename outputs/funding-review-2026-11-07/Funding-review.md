# Funding and supporter acknowledgements

Review date: 8 November 2026. Website changes are local and have not been published.

## Recommendation and implementation

Use the existing `/funding/` address for **Funding & supporters**, with a short acknowledgement and six representative logos on the homepage, a link from the Research page, and no dedicated navigation item. The full page contains a cloud with a fixed base area plus an area proportional to funding value for 19 sources, with further supporters acknowledged separately, followed by seven initially collapsed sections with 55 support records. UoB is included. The displayed organisation and programme names are not a count of independent donors: for example, AHRC and Midlands4Cities represent the same doctoral funding route.

> We thank the organisations and donors who have supported our research, students and facilities, past and present.

The scope begins with Di Luca’s Birmingham appointment in 2011. It includes his earlier Birmingham research groups and students, rather than implying that the current Gisbert Kapp VR Lab existed throughout that period.

## Comparison with other laboratories

| Laboratory | Observed approach | Application here |
|---|---|---|
| [Southampton EHS Lab](https://research.soton.ac.uk/ehs/funding/) | Dedicated funding page; current and previous projects; funder images; studentships and internal university contributions. | Closest model for a comprehensive acknowledgement, including UoB and students. |
| [Loughborough AVRRC](https://www.lboro.ac.uk/research/avrrc/working-with-us/sponsors/) | Dedicated sponsor page grouped into funding bodies, industry and academia; explicit thanks for donated facilities. | Distinguish grants, equipment donations and collaboration. |
| [Virginia ORCL](https://engineering.virginia.edu/labs-groups/omni-reality-cognition-lab/funding) | Dedicated funding page; current and completed awards; dates and links to award/project records. | Keep a durable funding address and supporting details. |
| [Colorado State NUILab](https://courses.nuilab.org/research/) | Funding within the Research page; active and completed grants with amounts and roles. | Link from research content without adding a funding menu item. |

## Logo sizing

The latest user refinement adds a constant size component to improve visibility. Every circle has a fixed base area plus an area proportional to attributed GBP value: diameter = √(64² + (200² − 64²) × value / maximum). Design diameters range from 64 to 200 units and scale uniformly with the SVG viewport. Total areas are not strictly proportional to funding; the caption and methods explain this. Names and exact values remain available in accessible labels and the expandable list. Already named logos have no duplicate caption. Symbol-only marks have names embedded within standalone SVG image assets, and name-only acknowledgements are also image assets. `records/funding/contributions.json` holds 69 records, including 31 non-overlapping costed contributions assigned to 19 funders.

The scope includes Birmingham research and student support and MyJAMS company support. BBSRC’s award is counted once under BBSRC, not again under its industrial partner; AHRC/CreaTech’s £25,000 company award and £15,000 programme-valued in-kind support are counted once under AHRC. Nottingham, Trieste and partner-school awards with no established Birmingham allocation are excluded from sizing. Unknown contributions remain acknowledged without assigned amounts. Circle sizes are partial recorded and estimated totals, not a complete ranking of supporter contributions.

GBP conversion uses [ECB reference rates for 6 November 2026](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.eu.html): £0.83415 and US$1.1165 per euro. A single date provides a visual comparison, not historical accounting or inflation-adjusted values. Approximate source values remain approximate.

## Source coverage

The user explicitly confirmed Oculus, Ultraleap and Unity as supporters. Oculus now has its own acknowledgement linked to the existing £5,000 research-support record; its historical partnership with Facebook/Meta remains one support record. Ultraleap’s existing equipment donation is retained. Unity is added without an assumed cash award, equipment donation or licence arrangement.

MyJAMS has a dedicated, initially collapsed detail section with funder logos. The four existing MyJAMS/JAMS records are moved there without increasing the record count. Related University grants and ROLI equipment are linked rather than counted again as company income.

User confirmation on 7 November 2026 adds Marco Polo funding for Italian students. Specific recipients, dates, amounts and the administering institution remain unspecified; the acknowledgement uses the programme name without an assumed institutional logo.

Primary source: the 6 November 2026 academic CV source archive, identified as current by `cv-test/PROJECT_CONTEXT.md`:

`/Users/m.diluca@bham.ac.uk/GitHub/cv-test/output/promotion-four-papers-2026-11-06/Academic_CV_sources.zip`

SHA-256: `52ecedb4894ab109262b4d7b44742d96e13af73109c24ba17d411055d55ccfd9`

Reviewed the main CV and Appendices A (grants), E (supervision), F (line management) and H (knowledge exchange). The register records exact file and line references inside that archive. The older root-level grant appendix is superseded where the latest archive corrects figures or award statuses.

The separate `funding_populated.xlsx` is an older estimated trajectory, with duplicate ARME and Google rows and values that disagree with the latest CV. It supplied no additional verified funder and was not used for amounts or totals. No source workbook or CV was edited.

Public sources supplement the CV, including the [Marek Sinason Memorial Fund award announcement](https://www.birmingham.ac.uk/news-archive/2021/newly-established-marek-sinason-memorial-fund-advances-psychology-graduates-research-skill-set), [UoB’s NTNU fellowship announcement](https://www.birmingham.ac.uk/news-archive/2014/researcher-to-explore-the-links-between-time-perception-and-language) and [the UoB research record confirming a joint UoB–P&G studentship](https://research.birmingham.ac.uk/en/publications/skin-properties-and-afferent-density-in-the-deterioration-of-tact/). Student identity and supervision periods are reconciled with Appendix E.

Programme attribution is supported by [Innovate UK’s ICURe page](https://iuk-business-connect.org.uk/programme/icure/) and [VentureVersity’s description of Research England support](https://ventureversity.org/). These are programme support acknowledgements, not additional cash awards.

## Complete included register

### Current and recent support

| Period | Contribution and supporter | Description and value | Source |
| --- | --- | --- | --- |
| 2026–2030 | EXPLORA — European Union · Marie Curie / MSCA | MSCA Doctoral Network; Massimiliano Di Luca is Birmingham PI. **€348,738.12 EU contribution to Birmingham** | appendix-grants.tex:107 |
| 2026–2027 | Opportunity Commons — University of Birmingham | QR Enhancing Research Culture Fund; project lead. **£24,970** | appendix-grants.tex:44 |
| 2026–2027 | BhamXR Futures Network+ — University of Birmingham | AI-Mediated Virtual Worlds; lead applicant and Network Lead. **£25,000** | appendix-grants.tex:45 |
| 2024–2028 | Input Vault and Text Entry XR — Google | Three academic gifts: Input Vault (2024–2026 and 2025–2028) and Text Entry XR (2026). **US$55,000 across three gifts** | cv-diluca-2025.tex:486 |

### MyJAMS funding and commercialisation

| Period | Contribution and supporter | Description and value | Source |
| --- | --- | --- | --- |
| 2026–2027 | MyJAMS: Augmented Ensemble — CreaTech Frontiers, AHRC | CreaTech Frontiers Live & Immersive Innovation Fund, funded by AHRC/UKRI. Award recipient: MyJAMS Ltd. **£25,000 to MyJAMS Ltd** | appendix-grants.tex:129 |
| 2026 | CreaTech Frontiers Growth Lab — CreaTech Frontiers, AHRC | MyJAMS completed the ten-week CreaTech Frontiers Growth Lab, delivered with Digital Catapult and funded by AHRC/UKRI. **In-kind support valued by the programme at £15,000** | appendix-kte.tex:9 |
| 2024–2025 | ICURe Explore — Innovate UK · ICURe Explore | JAMS participation in Innovate UK’s ICURe Explore programme, supporting market exploration and commercialisation. | appendix-grants.tex:137 |
| 2026 | VentureVersity Shape — VentureVersity · Research England | MyJAMS selected for the Shape stage of VentureVersity, part of the Research England-supported Forging Ahead programme. Commercialisation support; no cash award recorded. | appendix-kte.tex:7 |

### Previous research funding

| Period | Contribution and supporter | Description and value | Source |
| --- | --- | --- | --- |
| 2021–2025 | Augmented Reality for Music Ensemble (ARME) — EPSRC | EPSRC research award; principal investigator. PartPlay and SemanticAudio contributed partnership support. **£738,438 allocated to Birmingham within a £1,183,465 award** | appendix-grants.tex:47 |
| 2018–2021 | Ageing effects on texture perception — BBSRC, Procter & Gamble | BBSRC research award with Procter & Gamble; co-investigator, with Alan Wing as PI. **£799,581 awarded to Birmingham** | appendix-grants.tex:48 |
| 2012–2016 | Temporal information in crossmodal stimuli (TICS) — European Union · Marie Curie / MSCA | Marie Curie Career Integration Grant; principal investigator. **€100,000** | appendix-grants.tex:49 |
| 2024–2025 | Music Ensemble Exhibition (MUSEX / AMuSEx) — EPSRC | EPSRC IAA Follow-on Fund; principal investigator. **£14,856.60 original award** | appendix-grants.tex:85 |
| 2023–2024 | App-based MUSic Ensemble Rehearsal (AMUSER) — BBSRC | BBSRC Impact Acceleration Account; principal investigator. **£21,672.54** | appendix-grants.tex:86 |
| 2021–2023 | Adaptive tactile test system (ATTS) — BBSRC, Obirobotics | BBSRC Impact Acceleration Account with Obirobotics; co-investigator. Value not established. | appendix-grants.tex:87 |
| 2021–2022 | Seeing How You Feel — ESRC, Irish Research Council | Multisensory enhancement of touch in ageing; Birmingham co-investigator on an ESRC–IRC collaboration. **£9,516 ESRC award to the University of Nottingham** | appendix-grants.tex:119 |
| 2020–2022 | Lazy Susan — Experimental Psychology Society | Technology for multisensory research at a distance; principal investigator. **£3,500** | appendix-grants.tex:120 |
| 2013–2014 | Apprendimento visuotattile — University of Trieste / PRIN | University of Trieste / PRIN collaboration with Paolo Gallina; co-investigator. **€12,000 project value; Birmingham share not established** | appendix-grants.tex:121 |
| 2012–2013 | Haptic perception of softness — The Royal Society | Royal Society seed funding; principal investigator. **£15,000** | appendix-grants.tex:122 |
| 2011–2012 | Grasping uncertainty in robots and humans — EPSRC | EPSRC seed funding with Jeremy Wyatt; co-investigator. **£15,000 project value** | appendix-grants.tex:123 |

### Students and visiting researchers

| Period | Contribution and supporter | Description and value | Source |
| --- | --- | --- | --- |
| 2026 | Music performance capture — EPSRC | Two-month EPSRC Vacation Internship awarded to Christopher Jones under Di Luca’s supervision. | appendix-grants.tex:106 |
| 2024–2026 | Birmingham Summer Undergraduate Research Experience (BSURE) — University of Birmingham | Funded undergraduate research placements; co-investigator and internship supervisor. **Approximately £3,000 (CV estimate)** | appendix-grants.tex:108 |
| 2024 | Brazil Institute fellowship — University of Birmingham | Fellowship for Hugo Tremonte de Carvalho; co-investigator. **Approximately £10,000 (CV estimate)** | appendix-grants.tex:109 |
| 2023–2026 | Composition based on multisensory perception — AHRC, Midlands4Cities | AHRC Midlands4Cities doctoral fellowship for Christiana Palandri; Di Luca is a co-supervisor. **Approximately £40,000 (CV estimate)** | appendix-grants.tex:110 |
| 2017–2018 | Haptic rendering in VR — Chinese government | Chinese government support for a one-year visiting postdoctoral fellowship; host PI. **£40,000** | appendix-grants.tex:111 |
| 2015 | Psychophysical experimentation — Erasmus | Erasmus support for psychophysical experimentation, including Eleni Markouli’s internship. **£2,000** | appendix-grants.tex:112 |
| 2013–2015 | Dynamic modelling of haptic perception — DAAD | DAAD postdoctoral fellowship for dynamic modelling of haptic perception; Markus Rank worked with Di Luca at Birmingham. **€90,000** | appendix-grants.tex:113 |
| 2014 | Darren Rhodes’s visiting fellowship — NTNU | Young Researcher Visiting Fellowship at the Norwegian University of Science and Technology, linking time perception and language research. | https://www.birmingham.ac.uk/news-archive/2014/researcher-to-explore-the-links-between-time-perception-and-language |
| 2019–2022 | Davide Deflorio’s collaborative studentship — University of Birmingham, Procter & Gamble | Joint University of Birmingham and Procter & Gamble studentship supporting research on tactile perception. Dates indicate doctoral supervision. | https://research.birmingham.ac.uk/en/publications/skin-properties-and-afferent-density-in-the-deterioration-of-tact/ |
| Previous support | Italian student research visits — Marco Polo | Marco Polo funding supported Italian students working with Massimiliano Di Luca at Birmingham. | User confirmation in this conversation |
| 2021 | Katrina Galsworthy’s Marek Sinason Memorial Fund award — Marek Sinason Memorial Fund | Award supporting Katrina Galsworthy’s initial research on the ARME project. The fund was established in memory of Marek Sinason, a University of Birmingham PhD alumnus. **£250** | University of Birmingham award announcement (28 June 2021) and VR Lab award post |
| Current support | Maisy Rapata’s PhD studentship — ESRC | The Economic and Social Research Council (ESRC) funds Maisy Rapata’s PhD studentship at the University of Birmingham, supervised by Massimiliano Di Luca. | User confirmation, 8 November 2026; Academic_CV_sources.zip, appendix-supervision.tex:10 |

### University of Birmingham support

| Period | Contribution and supporter | Description and value | Source |
| --- | --- | --- | --- |
| 2025 | Birmingham Virtual Worlds Network+ — University of Birmingham | IDR Accelerator Network+ award; co-applicant, with Martin Wählisch as lead applicant. | appendix-grants.tex:46 |
| 2026 | SHARE bid preparation — University of Birmingham | Interdisciplinary Bid Development Fund; lead applicant. This internal award supported preparation of the later external proposal. **£6,370** | appendix-grants.tex:95 |
| 2025 | Artificial-touch bid preparation — University of Birmingham | Interdisciplinary Bid Development Fund; co-applicant on the project led by Michael Adams. **£3,600 project award** | appendix-grants.tex:96 |
| 2026 | Impact Mentoring Programme workshops — University of Birmingham | IAA Impact Mentoring Programme support towards two workshops. **£1,700** | appendix-grants.tex:101 |
| 2025 | Exploration of gesture-based music performance — University of Birmingham | LES Business Engagement Pump Priming award for ARME work with ROLI; award confirmed 28 May 2025. | appendix-grants.tex:128 |
| 2022–2023 | Shared VR facilities — University of Birmingham | College approval for shared VR equipment in 2022 and establishment of the Gisbert Kapp VR Lab in 2023. | cv-diluca-2025.tex:728 |
| 2026 | Joint interdisciplinary workshop planning — University of Birmingham | Institute of Advanced Studies support for planning a joint workshop with i-MOVE and Creative and Cultural Industries; no cash value recorded. | cv-diluca-2025.tex:725 |

### Industry, donations and equipment

| Period | Contribution and supporter | Description and value | Source |
| --- | --- | --- | --- |
| 2026 | Immersive education headsets — Siemens | Siemens agreed to donate ten Sony XR headsets to the University through The Birmingham Project. Donation agreement; delivery to be confirmed. **Estimated US$47,500** | appendix-grants.tex:131 |
| 2025 | Music technology equipment — ROLI | A waveboard and keyboard donated by ROLI and recorded as received. **Estimated £1,058 (scenario range £518–£1,598)** | appendix-grants.tex:134 |
| 2022 | Equipment support — TikTok / ByteDance | TikTok / ByteDance equipment support. **Approximately £2,000 (CV estimate)** | appendix-kte.tex:33 |
| 2021 | Movement-tracking equipment — NHS | NHS equipment donation for research on movement tracking and evaluation. | appendix-grants.tex:138 |
| 2020 | Haptic devices for student projects — Ultraleap | Ultraleap donated haptic devices, including a Stratos Explore development kit. **Estimated US$2,500 (scenario range US$2,500–US$2,750.95)** | appendix-grants.tex:139 |
| 2019 | SemanticAudio partnership — SemanticAudio | In-kind partner support for music-technology grant development. | appendix-kte.tex:36 |
| 2015–2019 | PartPlay partnership — PartPlay | In-kind partnership support for music-technology grant activity. | appendix-kte.tex:37 |
| 2015–2019 | Oculus / Facebook research partnership — Oculus, Facebook / Meta | Secondment support, internships and research collaborations during Di Luca’s Birmingham appointment; aggregate financial value unavailable. | appendix-kte.tex:38 |
| 2015–2016 | Industrial-glove research — Ansell | Funding for collaborative research on user-based functional assessment of industrial gloves; amount unconfirmed. | appendix-grants.tex:140 |
| 2015 | Softness with pinch grasp — Oculus | Oculus VR research support; principal investigator. **£5,000** | appendix-grants.tex:141 |
| 2014–2015 | Analysis of squeezing movements — Procter & Gamble | Procter & Gamble research collaboration; co-investigator. **£5,000 project value** | appendix-grants.tex:142 |
| 2014 | Roughness perception during simulated self-touch — Gillette | Gillette research support; principal investigator. **£5,000** | appendix-grants.tex:143 |
| Since 2014 | Procter & Gamble partnership — Procter & Gamble | Support for research, colleagues, a PhD scholarship, symposia, research visits and grant activity. | appendix-kte.tex:40 |
| Not specified | Unity support — Unity | We thank Unity for supporting the lab. | User confirmation in this conversation |

### Other partner-held funding

| Period | Contribution and supporter | Description and value | Source |
| --- | --- | --- | --- |
| 2025–2026 | Priors Field Primary School equipment — William Edwards Educational Charity | William Edwards Educational Charity equipment grant awarded to the school for collaborative heritage activity involving Kenilworth Town Council. **Approximately £35,000 to the school** | appendix-kte.tex:19 |
| 2026 | VR stress-assessment collaboration — Givaudan | Givaudan awarded funding to Innogence. Di Luca leads study design and scientific oversight; the Birmingham allocation is not established. | cv-diluca-2025.tex:717 |

## Exclusions, qualifications and remaining gaps

- ICURe Exploit remains unresolved: the local MyJAMS post `2025-03-05-icure-exploit.md` claims funding and participation, while the 6 November CV explicitly leaves an additional Exploit award unconfirmed. No separate cash award is added. The user has been asked to clarify the award and amount.

- Excluded applications and bids that were submitted, in development, rejected or of unknown outcome: Sony Research Award, ATOUCH, EPS workshop proposal, i-MOVE/DMIND+ proposals, Amazon PrendoSim, AHRC Walking Together, BhamXR Nexus, external SHARE, ESRC AI maths, Leverhulme, knife detection and prospective JAMS. Successful internal SHARE bid-development support remains included.
- Excluded the 2007–2008 DAAD RISE internship because it predates Birmingham. DAAD support for Markus Rank is included.
- Siemens is described as an agreement to donate ten Sony XR headsets, not verified receipt. Sony is the equipment manufacturer, not an independently established donor.
- The Chinese government fellowship is acknowledged using the CV’s wording. It is not relabelled as China Scholarship Council without evidence.
- The donating NHS Trust/body is not identified. The generic NHS acknowledgement remains pending that detail.
- The Marek Sinason Memorial Fund is now included from public award announcements. It supported Katrina Galsworthy in 2021; no donor identity is stated. Describe the award as being in memory of the alumnus, not as a personal donation by him. Other personal/private donors are not identified in the reviewed CV sources.
- Hua-Chun Sun’s public professional profile lists a Taiwan Ministry of Education Study Abroad Scholarship (August 2013) and a Birmingham Doctoral Researcher Elite Scholarship. The CV confirms supervision in 2013–2015, but the scholarships are absent from its funding appendix. Keep these as leads for confirmation before adding an explicit student funding claim. [Profile](https://de.linkedin.com/in/hua-chun-sun-856682103).
- Student bursaries, conference/travel awards, all undergraduate internships and internal start-up/equipment allocations may be incomplete in the CV. Missing amounts are estimated only where a documented quantity or explicit scenario can be paired with cited cost evidence; remaining inputs are retained as follow-up items.
- William Edwards Educational Charity funding went to Priors Field Primary School; Givaudan funding went to Innogence; the CreaTech award went to MyJAMS. These are separately identified partner-held awards.
- Museum of Music History, Kenilworth Town Council, Priors Field, Zubr and Innogence retain a collaboration acknowledgement. Collaboration and commercial service invoices are not relabelled as donations.
- Historical record periods are retained. “Current and recent” does not establish remaining balances or continuing expenditure.

## Logos and validation

Logo files are sourced from official organisation websites and stored locally; `logo-sources.json` records their provenance. Original logo proportions are retained; white marks are darkened for visibility on light backgrounds. Text remains available for accessibility and where a verified usable logo was unavailable. No AI-generated logos are used. Circle sizes use the base-plus-proportional-area scale described above.

The Hugo build succeeds. Generated HTML contains all 55 records and seven groups, the homepage acknowledgement, the direct Research menu link, and the compiled funding styles. Local image paths and alternative text are checked. Existing unrelated working-tree changes are preserved.

The earlier native-browser limitation was overcome with a separate headless Chrome renderer. Desktop/mobile previews are checked locally. This does not publish the site.

### Visitor-focused cloud revision

The introductory acknowledgement is now one sentence. UoB appears within the cloud, and the introductory MyJAMS link is removed. The homepage uses a compact six-logo cloud with an “All supporters” link. Desktop (1440px) and mobile (390px) previews were visually inspected; neither has horizontal overflow. Current preview: `funding-weighted-preview.png`; mobile: `funding-weighted-mobile.png`.

### EPS PhD studentship addition — 8 November 2026

Maisy Rapata’s ESRC-funded PhD studentship is included as support-54, following the user’s correction. Its award value and funded duration are unconfirmed, so it is acknowledged without a monetary weight. The Experimental Psychology Society’s £3,500 cloud value covers only Lazy Susan.

### Assisted costing and persistent record — 8 November 2026

The user authorised AI-assisted costing. The durable register is `records/funding/contributions.json`, with readable Markdown and CSV exports, dated cost sources and a change history. It contains 55 support records plus 10 ongoing/unconfirmed applications and four closed unsuccessful applications. Pipeline budgets are excluded from awarded totals and cloud sizes.

Three approximate source values have been restored: BSURE £3,000 (counted once, coverage unspecified), AHRC/Midlands4Cities fellowship £40,000 (CV estimate, not an independently confirmed Birmingham allocation), and TikTok equipment £2,000. New estimates are ten Sony headsets at US$47,500 (assumed SRH-S1; agreed, delivery unconfirmed), one Stratos Explore kit at US$2,500 (supplier range US$2,500–2,750.95), and ROLI equipment at a £1,058 scenario midpoint (£518–1,598, exact models unknown). Price benchmarks and assumptions are exposed with the relevant award records; estimated circles have dotted outlines.

Maisy’s ESRC studentship has a provisional 3–4-year cost scenario of £81,129–£108,172 using 2026/27 UKRI stipend and home fees. ESRC attribution is user-confirmed; duration remains unconfirmed, so these scenarios are not used as cloud weights.

### Names inside image assets

Per the user’s correction, visible HTML captions are removed from both cloud and detail-group logos. Eighteen original named logos are retained; eight symbol-only assets are combined with identifying names, and eleven text-only acknowledgements are stored as SVG images. Original mark bytes remain embedded unchanged in composite assets; `acknowledgement-artwork.json` records the composition provenance. Alt text and link accessible names remain available. Funding values and size mapping are unchanged.

### Anthropic addition — 8 November 2026

Added Anthropic from user confirmation as support-55, with its official header wordmark and no added text caption. The user subsequently supplied an amount of 50,000 and requested verification against Daniele’s email and Teams messages. Currency, support type and dates remain unverified. The amount is retained in the persistent contribution register with currency null. Anthropic remains acknowledged among further supporters until its GBP-equivalent weight can be established. Live access was blocked by the locked Mac and disabled browser access; Minimi had reached its weekly limit. The available CV correspondence search did not establish the currency.
