# Publication topic vocabulary and build workflow

Publication labels are editorial navigation aids. They describe subject matter, not study findings, research quality or author endorsement. Author keywords and the publication records remain unchanged.

## One vocabulary, one assignment engine

- `data/publication_topics.yaml`: stable topic IDs, display labels, definitions, groups, equivalent labels, explicit title phrases/acronyms and broader concepts. IDs preserve old `?topic=` links even when display labels improve.
- `scripts/build-publication-topics.py`: derives assignments deterministically from local publication metadata. No model, external API, embeddings or network request is used.
- `data/publication_topic_overrides.yaml`: reviewed additions and exclusions, tied to the reviewed source file's SHA-256 hash.
- `data/publication_topic_index.json`: generated input shared by the cloud, list, filters and search. Do not edit it by hand.
- `docs/publication-topic-audit.md`: generated evidence and review queue. This file is not published by Hugo.

Definitions distinguish concepts that should not be merged: gaze interaction versus eye tracking, multimodal interaction versus multisensory perception, force sensing versus haptic feedback, and motion analysis versus biological motion. Motion analysis belongs to computational methods, not necessarily perception. Related concepts are not automatically synonyms.

## Assignment rules

1. Existing editorial `tags` are mapped to canonical topics through exact, normalised equivalence. Duplicates and equivalent spellings count once per paper.
2. Bounded title phrases and case-sensitive acronyms identify explicitly named subjects. Titles containing `without`, `not`, `no` or `non` are routed to review instead; this conservative heuristic is not a general language-understanding or negation system.
3. Exact keyword matches are assigned only when `keywords_kind` is `published` or `author-page`. Do not set that field unless the provenance supports it. Editorial or unverified keywords generate candidates only.
4. Abstract matches generate candidates only. An incidental mention, prior-work discussion, comparator or future application is insufficient for automatic assignment.
5. Reviewed additions require a source field and a quotation that still occurs in it. Exclusions require a reason and override automatic assignment. If a reviewed paper's file changes, the build stops until those decisions are re-reviewed.
6. Explicit broader relationships apply after assignment (for example, wearable haptics also contributes to haptics and wearable devices). No universal VR/AR-to-XR expansion is applied. Definitions determine the intended scope.

Evidence records distinguish title matches, keyword matches, existing tags, reviewed additions and broader-topic relationships. Every topic counts distinct papers, including papers assigned through an explicit narrower concept. Counts across topics should not be summed as a publication total. There are no numerical confidence scores.

## Adding or revising a paper

1. Add the usual `content/publication/<slug>/index.md` metadata. Supply an accurate title and source-backed keywords where available; tags are optional when the title/keywords provide recognised topics.
2. Run:

   ```sh
   python3 -m pip install -r requirements.txt
   python3 scripts/build-publication-topics.py
   ```

3. Inspect that paper in `docs/publication-topic-audit.md`. Review abstract candidates and unmapped keywords. Unmapped terms may be overly specific details rather than useful new topics; they are never promoted automatically. Correct an assignment through a reviewed addition/exclusion or a carefully scoped vocabulary rule.
4. Run `python3 -m unittest discover -s scripts/tests`, then `python3 scripts/build-publication-topics.py --check` and the usual Hugo build. Commit the regenerated index and audit alongside the source/rule changes.

Production, deploy-preview and branch-deploy commands in `netlify.toml` run the generator before Hugo. Python dependencies are declared in the root `requirements.txt`, following [Netlify's dependency installation convention](https://docs.netlify.com/build/configure-builds/manage-dependencies/). No topic changes have been deployed merely by editing these files.

For local preview, run the generator before `hugo server`. Hugo rejects missing records and stale source/vocabulary/override/engine hashes rather than silently serving outdated assignments. Unknown editorial tags, unmatched papers, ambiguous aliases, invalid references, cycles and stale reviewed overrides cause an actionable build error. Fix the source or vocabulary before rebuilding.

## Reviewing an exception

```yaml
paper-slug:
  source_hash: SHA256_OF_THE_REVIEWED_INDEX_MD
  include:
    - topic: wearable haptics
      field: abstract
      quote: back-mounted device that moves a weight
  exclude:
    - topic: virtual reality
      reason: VR is background; the reported study concerns smartphone AR.
```

Use only exceptions justified by that paper. Obtain the source hash with `shasum -a 256 content/publication/<slug>/index.md` after reviewing the current text. Never refresh a hash without reviewing the decision. Quotes are checked after case, accent, punctuation and whitespace normalisation. The hash also detects changes to the surrounding context.

## Extending the vocabulary

Prefer an existing concept when its definition fits. Add an alias only for an equivalent label, not an associated technology or a possible application. Keep ambiguous abbreviations out of free-text rules. Add a new concept when it improves navigation and can be distinguished from existing concepts; singleton concepts are allowed and there is no frequency threshold that would hide new research.

Each concept needs a stable ID, readable display label, definition and one navigation group. `title_terms` are bounded phrases; `title_acronyms` are case-sensitive. New concepts may have empty matching rules and be assigned solely by reviewed tags/additions. `broader` is optional and must remain acyclic. A concept has one colour/group for navigation, although a paper may have topics from several groups.

Rules deliberately favour traceability over automatic coverage. They cannot reliably interpret arbitrary new terminology, negation, scientific centrality or novel relationships. The unmapped-keyword audit makes vocabulary gaps visible for editorial review.

## Interface behaviour

The cloud retains stable full-collection word sizes; badges respond to search, year and publication type. Each definition appears in the topic's native tooltip. The sortable list uses display labels, not internal IDs. Legacy IDs and recognised synonyms resolve to the same filter; search includes those aliases. Without JavaScript, the cloud links to generated topic-specific paper lists on the same page.
