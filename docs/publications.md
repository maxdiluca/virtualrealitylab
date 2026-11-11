# Publications

The `/publication/` archive uses individual Hugo publication bundles, following the structure of the `massimilianodiluca` website. Add or edit `content/publication/<slug>/index.md`; the archive, filters and individual pages are generated automatically. The navigation URL is unchanged.

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

Build a local preview with `hugo --minify --destination /private/tmp/vrlab-publication-preview`. Templates live in `layouts/section/publication.html` and `layouts/publication/single.html`; styles and behaviour are in `assets/scss/publications.scss` and `assets/js/publications.js`.

## Topic cloud

The archive's coloured word cloud is generated from each publication's `tags` list, counting each record once per topic. Initial topic labels are editorial navigation terms grounded in the existing titles; they are not presented as author-supplied keywords. Update these labels when adding or correcting records. Counts use only this publication collection (not blog posts or other tagged content), cover all years, and remain fixed while filtering. Font size uses logarithmic frequency scaling.

Selecting a topic combines an exact topic match with search, type and year filters. The `topic` URL parameter preserves the selection; “All topics” clears only the topic and “Reset” clears every filter. Without JavaScript, cloud links open the site's ordinary tag archives. Colours are decorative, with no category meaning.

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

## Publication metrics

Only individual publication pages embed Altmetric donuts and Dimensions small-circle citation badges. The publication list contains no badges and loads neither provider script. Each badge uses the publication's `doi`, or `preprint_doi` with a visible “Preprint metrics” label when no publication DOI exists. Records without either identifier omit the badges. No counts are stored or estimated locally.

The provider scripts load once per page, only on publication pages containing eligible records. Badges hide when there are no mentions/citations; provider coverage, script blocking or service availability can also leave them absent. Publications and filtering remain usable without the external services. Implementation: `layouts/partials/publication-metrics.html` and `publication-metrics-scripts.html`. Provider documentation: [Altmetric embed guidance](https://help.altmetric.com/en/articles/9808705) and [Dimensions badges](https://badge.dimensions.ai/).
