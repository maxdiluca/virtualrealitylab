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

The collection now contains 26 records: the original 20 plus six additions identified in the publication audit (including one editorial). Eight existing records have updated venue, status, DOI or page information. See [the source audit](publication-audit-2026-11-09.md). Each added or refreshed record includes `metadata_checked` and `metadata_sources` for maintenance. These are not presented as scientific findings. Records remain selected publications from 2025 onwards, not an exhaustive lab bibliography.

For newly verified exact dates, `date_precision: day` is recorded; year-only dates use `date_precision: year`. The archive continues to show publication years. Preprint DOIs are stored as `preprint_doi` when the main record is now a conference contribution, and their links are labelled “Preprint”.
