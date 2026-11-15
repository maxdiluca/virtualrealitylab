# Publications

The `/publication/` archive uses individual Hugo publication bundles, following the structure of the `massimilianodiluca` website. Add or edit `content/publication/<slug>/index.md`; the archive, filters and individual pages are generated automatically. The navigation URL is unchanged.

## Student authors and discovery resources — 15 November 2026

Verified lab student authors are highlighted within the original citation order on the archive and detail pages. The labels describe lab profiles, not historical study affiliations or author contributions. Current PhD students and former project students have distinct text labels; colour is supplementary. Names link to their profiles and expose full names to assistive technology. The archive supports `students=all`, `students=current` and `students=former`, combined with search, topic, year and publication type. Labels and links remain available without JavaScript.

`data/publication_students.yaml` stores verified roles by exact author-profile ID, with source and check date. Subsequent papers using those IDs inherit the labels automatically. To add another student, verify identity and profile role, then add the evidence to this registry. Do not infer student status from initials, author order, a folder prefix or a paper's year. Research assistants are not automatically students. Former-project-student membership does not establish degree completion. Review the registry when roles change: the build rejects a mismatch with the profile's recorded role/group, a missing profile, or a missing/ambiguous citation link. Keep `authors` and `citation_authors` consistent.

The [discovery audit](publication-discovery-2026-11-15.md) covers all 31 records and records 20 new links across 16 papers, alongside three clearer resource labels. The [structured audit](publication-discovery-2026-11-15.json) records sources, added resources and rejected candidates. For each new publication, search its title, inspect the publisher and authors' project pages, and follow explicit code/data/video links. Check the exact title and authors, resolve the destination, avoid duplicates, and record unresolved candidates outside public content. A search with no verified new resource is not evidence that none exists. Do not attach a similarly named project's code or infer a dataset from the research topic.

Adding links changes a publication's source hash. Recheck any semantic overrides, refresh their hashes only when the recorded decisions still apply, then regenerate the topic index. Resource additions must not silently change topic assignments or scientific summaries.

Each record contains:

- `title`, `publication_year`, `publication` (the original venue and bibliographic details).
- `authors`: existing author profile folder identifiers where available, otherwise author names. This also makes full profile names searchable.
- `citation_authors`: the formatted citation author list, retaining initials and links. Keep this consistent with `authors` when editing a record.
- `publication_types`: one of `article-journal`, `paper-conference`, `preprint`, `editorial`, or `other`.
- `publication_status`: explicit status such as `forthcoming` or `accepted/in press`, if supplied.
- `links`: source links and related research blog links; `doi` where supplied.
- `date`: Hugo's ordering date. Migrated entries use January 1 as a year-only placeholder because the original page supplied publication years, not exact publication dates. Public templates display only `publication_year`.
- `weight`: ordering within a year (lower numbers first). Years are shown newest first.

The migration preserved all 20 citations and links from the former `content/publication/index.md` without updating publication claims or importing the personal website's wider bibliography. A subsequent source check on 9 November 2026 identified this work as a DAUS 2025 conference paper and updated its category and page range.

Search and filters are progressive enhancements: all records remain readable without JavaScript. Filter URLs use `publication_query`, `type` and `year`; `q` is reserved for the site's global search. The original publication type fragment URLs also work.

After generating topics, build a local preview with `hugo --minify --destination /private/tmp/vrlab-publication-preview`. Templates live in `layouts/section/publication.html` and `layouts/publication/single.html`; styles and behaviour are in `assets/scss/publications.scss` and `assets/js/publications.js`.

## Topic cloud

The cloud uses a controlled semantic vocabulary and generated assignments shared with the publication filters. See [the topic workflow](publication-topics.md) for definitions, evidence rules, reviewed exceptions and adding papers, and [the generated evidence audit](publication-topic-audit.md) for the current decisions. Source titles, abstracts, author keywords and existing tags are not rewritten.

Word size uses logarithmic full-collection paper counts. Numeric counts reflect search, type and year before topic selection. Colours identify labelled navigation groups. Cloud/List switching supports alphabetical display-label sorting and descending counts. Selecting the same topic again clears it; “Clear topic” preserves other filters and “Reset” clears everything. Legacy topic IDs and recognised synonyms remain usable in URLs. Without JavaScript, topics link to their paper lists on the same page.

Netlify generates topics automatically before each build. For a local build or preview, run `python3 scripts/build-publication-topics.py` before Hugo. Stale generated assignments fail the Hugo build with a regeneration instruction.

## Source refresh — 9 November 2026

The collection now contains 26 records: the original 20 plus six additions identified in the publication audit (including one editorial). Eight existing records have updated venue, status, DOI or page information. See [the source audit](publication-audit-2026-11-09.md). Maintenance fields `metadata_checked` and `metadata_sources` are retained in [the source records](publication-source-records.json), outside website content. Records remain selected publications from 2025 onwards, not an exhaustive lab bibliography.

For newly verified exact dates, `date_precision: day` is recorded; year-only dates use `date_precision: year`. The archive continues to show publication years. Preprint DOIs are stored as `preprint_doi` when the main record is now a conference contribution, and their links are labelled “Preprint”.

## Abstracts, keywords and funding — 11 November 2026

All 26 records now include source-backed descriptive content. See the [enrichment audit](publication-enrichment-2026-11-11.md) for coverage and unresolved access limitations.

- `abstract`, `abstract_kind`, `abstract_source`, and optional `abstract_license` distinguish published/accepted abstracts from paraphrased summaries and editorial/workshop overviews. Preserve qualifications and limitations when updating a summary.
- `keywords` and `keywords_kind` distinguish published index terms, author-page keywords, and editorial topics. Their `keywords_source` is retained in the source records. These do not replace the existing `tags` used by the topic cloud.
- `funding_statement` is concise public text; include it only for confirmed research, author, infrastructure or publication support. Omit the section when funding is unresolved. An omitted statement is not an assertion of no funding.
- `funding_projects` records `name`, `url`, `funder`, `grant`, and `role`. Connect a paper to a grant only from its own acknowledgement or explicit funding statement; do not infer the connection from an author, topic, institutional affiliation, or related paper. Keep publisher-metadata-only candidates in the source records, not public content or search data.
- The source records retain `funding_status`, `funding_note`, `funding_sources`, and `enrichment_checked` for maintenance. Do not display access failures, verification notes or audit dates on publication pages.

The publication archive searches abstracts, keywords, confirmed project names and grant identifiers as well as citations. The detail page displays visitor-facing information and source attribution without requiring JavaScript. Licensed abstracts include a license link; summaries and workshop/editorial overviews are labelled separately. Funding projects can link to an existing local project, a grant record, or the paper acknowledgement where no independent project page is established. The `docs/` directory is not included in the generated website; it is maintainer documentation, not confidential storage.

## Publication illustrations

Individual entries may include an `illustration` object with `file`, `alt`, `caption`, `credit`, `source`, `source_label`, `license`, and `license_url`. The image is a page-bundle resource named `illustration.*`, rather than a theme `featured` image, so it is not added to publication lists. Figures retain their original aspect ratio and link to the full-size resource. A missing declared image fails the build.

Check the licence for the specific image and any third-party credits. Article open access does not automatically cover separately credited figures or promotional website artwork. Unresolved candidates are tracked in [the illustration review](publication-illustrations-2026-11-11.md); do not add generated substitutes, pending notices, or unlicensed images to public entries. The user requested that images remain pending until permission is confirmed.

## Publication metrics

Only individual publication pages embed Altmetric donuts and Dimensions small-circle citation badges. The publication list contains no badges and loads neither provider script. Each badge uses the publication's `doi`, or `preprint_doi` with a visible “Preprint metrics” label when no publication DOI exists. Records without either identifier omit the badges. No counts are stored or estimated locally.

The provider scripts load once per page, only on publication pages containing eligible records. Badges hide when there are no mentions/citations; provider coverage, script blocking or service availability can also leave them absent. Publications and filtering remain usable without the external services. Implementation: `layouts/partials/publication-metrics.html` and `publication-metrics-scripts.html`. Provider documentation: [Altmetric embed guidance](https://help.altmetric.com/en/articles/9808705) and [Dimensions badges](https://badge.dimensions.ai/).

## Archive expansion — 15 November 2026

The collection now contains 31 selected records from 2023 onwards: five additions from 2023–2024, with the existing CHI 2025 TEXT entry retained. The inauguration year defines the start of coverage, not a claim that every study began after the opening. Citation years remain authoritative for archive grouping; the Quest 2 paper notes its 2023 online date alongside its 2024 journal citation. See [the expansion and pending Loop reconciliation](publication-expansion-2026-11-15.md).
